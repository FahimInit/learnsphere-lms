import mongoose from 'mongoose';
import path from 'path';
import { Assignment, IAssignmentDocument } from './assignment.model';
import { Submission, ISubmissionDocument } from './submission.model';
import { Course } from '../courses/course.model';
import { Enrollment } from '../enrollments/enrollment.model';
import { courseService } from '../courses/course.service';
import { storageService, StoredFileResult } from '../../infrastructure/storage/storage.service';
import { AppError } from '../../utils/AppError';
import { AuthenticatedUser } from '../../types/express';
import {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  SubmitAssignmentInput,
  GradeSubmissionInput,
} from './assignment.validator';

export class AssignmentService {
  private async assertAssignmentCourseAccess(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<{ isPrivileged: boolean }> {
    const course = await Course.findById(courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const isPrivileged =
      actor.role === 'admin' || course.instructor.toString() === actor.id;
    if (isPrivileged) {
      return { isPrivileged: true };
    }

    const enrollment = await Enrollment.findOne({
      student: actor.id,
      course: course._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      throw AppError.forbidden(
        'You must be enrolled in this course to access its assignments'
      );
    }

    return { isPrivileged: false };
  }

  async listCourseAssignments(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<IAssignmentDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const { isPrivileged } = await this.assertAssignmentCourseAccess(
      courseId,
      actor
    );
    const filter: Record<string, unknown> = { course: courseId };
    if (!isPrivileged) {
      filter.isPublished = true;
    }

    return Assignment.find(filter).sort({ createdAt: 1 });
  }

  async createAssignment(
    actor: AuthenticatedUser,
    input: CreateAssignmentInput
  ): Promise<IAssignmentDocument> {
    await courseService.assertCourseOwnership(input.courseId, actor);

    const assignment = await Assignment.create({
      course: input.courseId,
      section:
        input.sectionId && mongoose.Types.ObjectId.isValid(input.sectionId)
          ? input.sectionId
          : undefined,
      title: input.title,
      instructions: input.instructions,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      maxScore: input.maxScore ?? 100,
      allowResubmission: input.allowResubmission ?? true,
      maxResubmissions: input.maxResubmissions ?? 3,
      requiresAttachment: input.requiresAttachment ?? false,
      allowedFileTypes: input.allowedFileTypes ?? [
        '.pdf',
        '.zip',
        '.docx',
        '.txt',
        '.md',
        '.png',
        '.jpg',
      ],
      maxFileSizeMb: input.maxFileSizeMb ?? 25,
      isPublished: input.isPublished ?? true,
    });

    return assignment;
  }

  async updateAssignment(
    assignmentId: string,
    actor: AuthenticatedUser,
    input: UpdateAssignmentInput
  ): Promise<IAssignmentDocument> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw AppError.badRequest('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw AppError.notFound('Assignment not found');
    }

    await courseService.assertCourseOwnership(
      assignment.course.toString(),
      actor
    );

    if (input.title !== undefined) assignment.title = input.title;
    if (input.instructions !== undefined)
      assignment.instructions = input.instructions;
    if (input.dueDate !== undefined) {
      assignment.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.maxScore !== undefined) assignment.maxScore = input.maxScore;
    if (input.allowResubmission !== undefined)
      assignment.allowResubmission = input.allowResubmission;
    if (input.maxResubmissions !== undefined)
      assignment.maxResubmissions = input.maxResubmissions;
    if (input.requiresAttachment !== undefined)
      assignment.requiresAttachment = input.requiresAttachment;
    if (input.allowedFileTypes !== undefined)
      assignment.allowedFileTypes = input.allowedFileTypes;
    if (input.maxFileSizeMb !== undefined)
      assignment.maxFileSizeMb = input.maxFileSizeMb;
    if (input.isPublished !== undefined)
      assignment.isPublished = input.isPublished;

    await assignment.save();
    return assignment;
  }

  async deleteAssignment(
    assignmentId: string,
    actor: AuthenticatedUser
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw AppError.badRequest('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw AppError.notFound('Assignment not found');
    }

    await courseService.assertCourseOwnership(
      assignment.course.toString(),
      actor
    );

    await Submission.deleteMany({ assignment: assignment._id });
    await assignment.deleteOne();
  }

  async uploadSubmissionFile(
    assignmentId: string,
    actor: AuthenticatedUser,
    file: Express.Multer.File
  ): Promise<StoredFileResult> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw AppError.badRequest('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw AppError.notFound('Assignment not found');
    }

    await this.assertAssignmentCourseAccess(
      assignment.course.toString(),
      actor
    );

    const ext = path.extname(file.originalname).toLowerCase();
    if (
      assignment.allowedFileTypes.length > 0 &&
      !assignment.allowedFileTypes.includes(ext)
    ) {
      throw AppError.badRequest(
        `File type '${ext}' is not allowed for this assignment. Allowed: ${assignment.allowedFileTypes.join(
          ', '
        )}`
      );
    }

    const maxBytes = assignment.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw AppError.badRequest(
        `File exceeds assignment limit of ${assignment.maxFileSizeMb}MB`
      );
    }

    return storageService.saveBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      'submissions'
    );
  }

  async submitAssignment(
    assignmentId: string,
    actor: AuthenticatedUser,
    input: SubmitAssignmentInput
  ): Promise<ISubmissionDocument> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw AppError.badRequest('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw AppError.notFound('Assignment not found');
    }

    const { isPrivileged } = await this.assertAssignmentCourseAccess(
      assignment.course.toString(),
      actor
    );

    if (!assignment.isPublished && !isPrivileged) {
      throw AppError.badRequest('Cannot submit to an unpublished assignment');
    }

    if (assignment.dueDate && new Date() > assignment.dueDate) {
      throw AppError.badRequest('Assignment submission deadline has passed');
    }

    const hasText = Boolean(input.textResponse && input.textResponse.trim());
    const hasAttachments = Boolean(
      input.attachments && input.attachments.length > 0
    );

    if (assignment.requiresAttachment && !hasAttachments) {
      throw AppError.badRequest(
        'This assignment requires at least one file attachment'
      );
    }

    if (!hasText && !hasAttachments) {
      throw AppError.badRequest(
        'Please provide a text response or at least one attachment'
      );
    }

    const existing = await Submission.findOne({
      assignment: assignment._id,
      student: actor.id,
    });

    if (existing) {
      if (!assignment.allowResubmission) {
        throw AppError.badRequest(
          'Resubmissions are not permitted for this assignment'
        );
      }

      if (existing.submissionCount >= assignment.maxResubmissions) {
        throw AppError.badRequest(
          `Maximum resubmission limit (${assignment.maxResubmissions}) reached`
        );
      }

      existing.textResponse = input.textResponse ?? '';
      existing.attachments = input.attachments ?? [];
      existing.status = 'submitted';
      existing.submissionCount += 1;
      existing.submittedAt = new Date();
      await existing.save();
      return existing;
    }

    const submission = await Submission.create({
      assignment: assignment._id,
      course: assignment.course,
      student: actor.id,
      textResponse: input.textResponse ?? '',
      attachments: input.attachments ?? [],
      status: 'submitted',
      submissionCount: 1,
      submittedAt: new Date(),
    });

    return submission;
  }

  async getMySubmission(
    assignmentId: string,
    actor: AuthenticatedUser
  ): Promise<ISubmissionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw AppError.badRequest('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw AppError.notFound('Assignment not found');
    }

    await this.assertAssignmentCourseAccess(
      assignment.course.toString(),
      actor
    );

    return Submission.findOne({
      assignment: assignment._id,
      student: actor.id,
    }).populate('gradedBy', 'name email');
  }

  async listAssignmentSubmissions(
    assignmentId: string,
    actor: AuthenticatedUser
  ): Promise<ISubmissionDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw AppError.badRequest('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw AppError.notFound('Assignment not found');
    }

    await courseService.assertCourseOwnership(
      assignment.course.toString(),
      actor
    );

    return Submission.find({ assignment: assignment._id })
      .populate('student', 'name email avatarUrl')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 });
  }

  async gradeSubmission(
    submissionId: string,
    actor: AuthenticatedUser,
    input: GradeSubmissionInput
  ): Promise<ISubmissionDocument> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw AppError.badRequest('Invalid submission ID');
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw AppError.notFound('Submission not found');
    }

    await courseService.assertCourseOwnership(
      submission.course.toString(),
      actor
    );

    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment) {
      throw AppError.notFound('Parent assignment not found');
    }

    if (input.grade > assignment.maxScore) {
      throw AppError.badRequest(
        `Grade (${input.grade}) cannot exceed maximum score (${assignment.maxScore})`
      );
    }

    const now = new Date();
    submission.grade = input.grade;
    submission.feedback = input.feedback ?? '';
    submission.status = input.status ?? 'graded';
    submission.gradedBy = new mongoose.Types.ObjectId(actor.id);
    submission.gradedAt = now;
    submission.gradeHistory.push({
      grade: input.grade,
      feedback: input.feedback ?? '',
      gradedBy: new mongoose.Types.ObjectId(actor.id),
      gradedAt: now,
      submissionNumber: submission.submissionCount,
    });

    await submission.save();

    return submission.populate([
      { path: 'student', select: 'name email avatarUrl' },
      { path: 'gradedBy', select: 'name email' },
    ]);
  }
}

export const assignmentService = new AssignmentService();
