import crypto from 'crypto';
import mongoose from 'mongoose';
import { Certificate, ICertificateDocument } from './certificate.model';
import { Enrollment } from '../enrollments/enrollment.model';
import { Course } from '../courses/course.model';
import { User } from '../users/user.model';
import { notificationService } from '../notifications/notification.service';
import { AppError } from '../../utils/AppError';

function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `LS-${year}-${suffix}`;
}

export class CertificateService {
  async issueCertificateIfEligible(
    courseId: string,
    studentId: string
  ): Promise<ICertificateDocument | null> {
    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(studentId)
    ) {
      return null;
    }

    const existing = await Certificate.findOne({
      course: courseId,
      student: studentId,
    });
    if (existing) {
      return existing;
    }

    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: studentId,
    });

    if (
      !enrollment ||
      enrollment.progressPercentage < 100 ||
      enrollment.status !== 'completed'
    ) {
      return null;
    }

    const [course, student] = await Promise.all([
      Course.findById(courseId).populate('instructor', 'name'),
      User.findById(studentId).select('name'),
    ]);

    if (!course || !student) {
      return null;
    }

    const instructorObj = course.instructor as unknown as { name?: string };
    const instructorName = instructorObj?.name || 'LearnSphere Instructor';

    const certificate = await Certificate.create({
      certificateCode: generateCertificateCode(),
      student: student._id,
      course: course._id,
      enrollment: enrollment._id,
      studentNameSnapshot: student.name,
      courseTitleSnapshot: course.title,
      instructorNameSnapshot: instructorName,
      issuedAt: new Date(),
    });

    await notificationService.createAndDispatch({
      recipientId: student._id.toString(),
      type: 'certificate_issued',
      title: 'Certificate Earned!',
      message: `Congratulations on completing "${course.title}"! Your verified certificate (${certificate.certificateCode}) is ready.`,
      linkUrl: `/certificates/${certificate.certificateCode}`,
    });

    return certificate;
  }

  async claimCourseCertificate(
    courseId: string,
    studentId: string
  ): Promise<ICertificateDocument> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: studentId,
    });

    if (!enrollment) {
      throw AppError.forbidden('You are not enrolled in this course');
    }

    if (enrollment.progressPercentage < 100 || enrollment.status !== 'completed') {
      throw AppError.badRequest(
        `Course must be 100% completed to earn a certificate (current progress: ${enrollment.progressPercentage}%)`
      );
    }

    const cert = await this.issueCertificateIfEligible(courseId, studentId);
    if (!cert) {
      throw AppError.badRequest('Unable to generate certificate for this course');
    }
    return cert;
  }

  async listMyCertificates(studentId: string): Promise<ICertificateDocument[]> {
    return Certificate.find({ student: studentId })
      .populate('course', 'title slug thumbnailUrl level')
      .sort({ issuedAt: -1 });
  }

  async verifyCertificateByCode(code: string): Promise<{
    valid: boolean;
    certificate: ICertificateDocument;
  }> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      throw AppError.badRequest('Certificate verification code is required');
    }

    const certificate = await Certificate.findOne({
      certificateCode: normalized,
    }).populate('course', 'title slug level estimatedDurationMinutes');

    if (!certificate) {
      throw AppError.notFound(
        `No certificate found matching verification code '${normalized}'`
      );
    }

    return {
      valid: true,
      certificate,
    };
  }
}

export const certificateService = new CertificateService();
