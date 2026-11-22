import mongoose, { FilterQuery } from 'mongoose';
import { Course, ICourseDocument } from './course.model';
import { CourseReview, ICourseReviewDocument } from './review.model';
import { Enrollment, IEnrollmentDocument } from '../enrollments/enrollment.model';
import { Section, ISectionDocument } from '../sections/section.model';
import { Lesson, ILessonDocument } from '../lessons/lesson.model';
import { Category } from '../categories/category.model';
import { notificationService } from '../notifications/notification.service';
import { AppError } from '../../utils/AppError';
import { slugify } from '../../utils/slugify';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { AuthenticatedUser } from '../../types/express';
import {
  CreateCourseInput,
  UpdateCourseInput,
  CreateSectionInput,
  UpdateSectionInput,
  CreateLessonInput,
  UpdateLessonInput,
  ModerateCourseInput,
  CreateCourseReviewInput,
} from './course.validator';

export interface SectionWithLessons {
  _id: string;
  course: string;
  title: string;
  description: string;
  order: number;
  lessons: Array<Record<string, unknown>>;
}

export interface CatalogQueryInput {
  q?: string;
  category?: string;
  level?: string;
  minRating?: string;
  priceType?: 'all' | 'free' | 'paid';
  sort?: 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc';
  page?: string;
  limit?: string;
}

export class CourseService {
  async assertCourseOwnership(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<ICourseDocument> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const isOwner = course.instructor.toString() === actor.id;
    const isAdmin = actor.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw AppError.forbidden('You do not have permission to modify this course');
    }

    return course;
  }

  async recalculateCourseMetrics(courseId: string): Promise<void> {
    const lessons = await Lesson.find({ course: courseId }).select(
      'videoDurationSeconds type'
    );
    const totalLessonsCount = lessons.length;
    const totalVideoSeconds = lessons.reduce(
      (acc, l) => acc + (l.videoDurationSeconds || 0),
      0
    );
    const calculatedMinutes = Math.ceil(totalVideoSeconds / 60);

    const update: Record<string, unknown> = { totalLessonsCount };
    if (calculatedMinutes > 0) {
      update.estimatedDurationMinutes = calculatedMinutes;
    }

    await Course.findByIdAndUpdate(courseId, { $set: update });
  }

  async createCourse(
    actor: AuthenticatedUser,
    input: CreateCourseInput
  ): Promise<ICourseDocument> {
    if (!mongoose.Types.ObjectId.isValid(input.category)) {
      throw AppError.badRequest('Invalid category ID');
    }

    const category = await Category.findById(input.category);
    if (!category || !category.isActive) {
      throw AppError.badRequest('Selected category does not exist or is inactive');
    }

    const slug = slugify(input.title, true);

    const course = await Course.create({
      title: input.title,
      slug,
      shortDescription: input.shortDescription,
      fullDescription: input.fullDescription ?? '',
      category: category._id,
      instructor: actor.id,
      level: input.level ?? 'beginner',
      price: input.price ?? 0,
      thumbnailUrl: input.thumbnailUrl ?? '',
      previewVideoUrl: input.previewVideoUrl ?? '',
      tags: input.tags ?? [],
      prerequisites: input.prerequisites ?? [],
      learningObjectives: input.learningObjectives ?? [],
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? 0,
      status: 'draft',
    });

    return course.populate([
      { path: 'category', select: 'name slug icon' },
      { path: 'instructor', select: 'name email headline avatarUrl' },
    ]);
  }

  async updateCourse(
    courseId: string,
    actor: AuthenticatedUser,
    input: UpdateCourseInput
  ): Promise<ICourseDocument> {
    const course = await this.assertCourseOwnership(courseId, actor);

    if (input.category !== undefined && input.category !== course.category.toString()) {
      if (!mongoose.Types.ObjectId.isValid(input.category)) {
        throw AppError.badRequest('Invalid category ID');
      }
      const newCategory = await Category.findById(input.category);
      if (!newCategory || !newCategory.isActive) {
        throw AppError.badRequest('Selected category does not exist or is inactive');
      }

      if (course.status === 'published') {
        await Category.findByIdAndUpdate(course.category, {
          $inc: { courseCount: -1 },
        });
        await Category.findByIdAndUpdate(newCategory._id, {
          $inc: { courseCount: 1 },
        });
      }
      course.category = newCategory._id;
    }

    if (input.title !== undefined) course.title = input.title;
    if (input.shortDescription !== undefined)
      course.shortDescription = input.shortDescription;
    if (input.fullDescription !== undefined)
      course.fullDescription = input.fullDescription;
    if (input.level !== undefined) course.level = input.level;
    if (input.price !== undefined) course.price = input.price;
    if (input.thumbnailUrl !== undefined) course.thumbnailUrl = input.thumbnailUrl;
    if (input.previewVideoUrl !== undefined)
      course.previewVideoUrl = input.previewVideoUrl;
    if (input.tags !== undefined) course.tags = input.tags;
    if (input.prerequisites !== undefined)
      course.prerequisites = input.prerequisites;
    if (input.learningObjectives !== undefined)
      course.learningObjectives = input.learningObjectives;
    if (input.estimatedDurationMinutes !== undefined)
      course.estimatedDurationMinutes = input.estimatedDurationMinutes;

    await course.save();

    return course.populate([
      { path: 'category', select: 'name slug icon' },
      { path: 'instructor', select: 'name email headline avatarUrl' },
    ]);
  }

  async deleteOrArchiveCourse(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<{ archived: boolean }> {
    const course = await this.assertCourseOwnership(courseId, actor);

    if (course.enrollmentCount > 0) {
      if (course.status === 'published') {
        await Category.findByIdAndUpdate(course.category, {
          $inc: { courseCount: -1 },
        });
      }
      course.status = 'archived';
      await course.save();
      return { archived: true };
    }

    if (course.status === 'published') {
      await Category.findByIdAndUpdate(course.category, {
        $inc: { courseCount: -1 },
      });
    }

    await Lesson.deleteMany({ course: course._id });
    await Section.deleteMany({ course: course._id });
    await course.deleteOne();
    return { archived: false };
  }

  async createSection(
    courseId: string,
    actor: AuthenticatedUser,
    input: CreateSectionInput
  ): Promise<ISectionDocument> {
    const course = await this.assertCourseOwnership(courseId, actor);
    const existingCount = await Section.countDocuments({ course: course._id });

    const section = await Section.create({
      course: course._id,
      title: input.title,
      description: input.description ?? '',
      order: input.order !== undefined ? input.order : existingCount,
    });

    return section;
  }

  async updateSection(
    courseId: string,
    sectionId: string,
    actor: AuthenticatedUser,
    input: UpdateSectionInput
  ): Promise<ISectionDocument> {
    const course = await this.assertCourseOwnership(courseId, actor);
    const section = await Section.findOne({
      _id: sectionId,
      course: course._id,
    });

    if (!section) {
      throw AppError.notFound('Section not found in this course');
    }

    if (input.title !== undefined) section.title = input.title;
    if (input.description !== undefined) section.description = input.description;
    if (input.order !== undefined) section.order = input.order;

    await section.save();
    return section;
  }

  async deleteSection(
    courseId: string,
    sectionId: string,
    actor: AuthenticatedUser
  ): Promise<void> {
    const course = await this.assertCourseOwnership(courseId, actor);
    const section = await Section.findOne({
      _id: sectionId,
      course: course._id,
    });

    if (!section) {
      throw AppError.notFound('Section not found in this course');
    }

    await Lesson.deleteMany({ section: section._id });
    await section.deleteOne();

    const remainingSections = await Section.find({ course: course._id }).sort({
      order: 1,
    });
    for (let i = 0; i < remainingSections.length; i++) {
      remainingSections[i].order = i;
      await remainingSections[i].save();
    }

    await this.recalculateCourseMetrics(course._id.toString());
  }

  async reorderSections(
    courseId: string,
    actor: AuthenticatedUser,
    orderedSectionIds: string[]
  ): Promise<ISectionDocument[]> {
    const course = await this.assertCourseOwnership(courseId, actor);
    const sections = await Section.find({ course: course._id });

    const sectionMap = new Map(sections.map((s) => [s._id.toString(), s]));
    for (let idx = 0; idx < orderedSectionIds.length; idx++) {
      const sec = sectionMap.get(orderedSectionIds[idx]);
      if (sec) {
        sec.order = idx;
        await sec.save();
      }
    }

    return Section.find({ course: course._id }).sort({ order: 1 });
  }

  async createLesson(
    courseId: string,
    sectionId: string,
    actor: AuthenticatedUser,
    input: CreateLessonInput
  ): Promise<ILessonDocument> {
    const course = await this.assertCourseOwnership(courseId, actor);
    const section = await Section.findOne({
      _id: sectionId,
      course: course._id,
    });

    if (!section) {
      throw AppError.notFound('Section not found in this course');
    }

    const existingCount = await Lesson.countDocuments({ section: section._id });
    const slug = slugify(input.title, true);

    const lesson = await Lesson.create({
      course: course._id,
      section: section._id,
      title: input.title,
      slug,
      type: input.type ?? 'video',
      content: input.content ?? '',
      videoUrl: input.videoUrl ?? '',
      videoDurationSeconds: input.videoDurationSeconds ?? 0,
      videoProvider: input.videoProvider ?? 'external',
      resources: input.resources ?? [],
      isPreview: input.isPreview ?? false,
      order: input.order !== undefined ? input.order : existingCount,
    });

    await this.recalculateCourseMetrics(course._id.toString());
    return lesson;
  }

  async updateLesson(
    courseId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    input: UpdateLessonInput
  ): Promise<ILessonDocument> {
    const course = await this.assertCourseOwnership(courseId, actor);
    const lesson = await Lesson.findOne({
      _id: lessonId,
      course: course._id,
    });

    if (!lesson) {
      throw AppError.notFound('Lesson not found in this course');
    }

    if (input.title !== undefined) lesson.title = input.title;
    if (input.type !== undefined) lesson.type = input.type;
    if (input.content !== undefined) lesson.content = input.content;
    if (input.videoUrl !== undefined) lesson.videoUrl = input.videoUrl;
    if (input.videoDurationSeconds !== undefined)
      lesson.videoDurationSeconds = input.videoDurationSeconds;
    if (input.videoProvider !== undefined)
      lesson.videoProvider = input.videoProvider;
    if (input.resources !== undefined) lesson.resources = input.resources;
    if (input.isPreview !== undefined) lesson.isPreview = input.isPreview;
    if (input.order !== undefined) lesson.order = input.order;

    await lesson.save();
    await this.recalculateCourseMetrics(course._id.toString());
    return lesson;
  }

  async deleteLesson(
    courseId: string,
    lessonId: string,
    actor: AuthenticatedUser
  ): Promise<void> {
    const course = await this.assertCourseOwnership(courseId, actor);
    const lesson = await Lesson.findOne({
      _id: lessonId,
      course: course._id,
    });

    if (!lesson) {
      throw AppError.notFound('Lesson not found in this course');
    }

    const sectionId = lesson.section;
    await lesson.deleteOne();

    const remainingLessons = await Lesson.find({ section: sectionId }).sort({
      order: 1,
    });
    for (let i = 0; i < remainingLessons.length; i++) {
      remainingLessons[i].order = i;
      await remainingLessons[i].save();
    }

    await this.recalculateCourseMetrics(course._id.toString());
  }

  async reorderLessons(
    courseId: string,
    sectionId: string,
    actor: AuthenticatedUser,
    orderedLessonIds: string[]
  ): Promise<ILessonDocument[]> {
    const course = await this.assertCourseOwnership(courseId, actor);
    const section = await Section.findOne({
      _id: sectionId,
      course: course._id,
    });

    if (!section) {
      throw AppError.notFound('Section not found in this course');
    }

    const lessons = await Lesson.find({ section: section._id });
    const lessonMap = new Map(lessons.map((l) => [l._id.toString(), l]));

    for (let idx = 0; idx < orderedLessonIds.length; idx++) {
      const les = lessonMap.get(orderedLessonIds[idx]);
      if (les) {
        les.order = idx;
        await les.save();
      }
    }

    return Lesson.find({ section: section._id }).sort({ order: 1 });
  }

  async submitCourseForReview(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<ICourseDocument> {
    const course = await this.assertCourseOwnership(courseId, actor);

    if (course.status !== 'draft' && course.status !== 'rejected') {
      throw AppError.badRequest(
        `Only draft or rejected courses can be submitted for review (current status: ${course.status})`
      );
    }

    const sectionCount = await Section.countDocuments({ course: course._id });
    const lessonCount = await Lesson.countDocuments({ course: course._id });

    if (sectionCount === 0 || lessonCount === 0) {
      throw AppError.badRequest(
        'Course must contain at least one section and one lesson before submitting for review'
      );
    }

    course.status = 'pending_review';
    course.rejectionReason = '';
    await course.save();

    return course.populate([
      { path: 'category', select: 'name slug icon' },
      { path: 'instructor', select: 'name email headline avatarUrl' },
    ]);
  }

  async moderateCourse(
    courseId: string,
    input: ModerateCourseInput
  ): Promise<ICourseDocument> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const wasPublished = course.status === 'published';

    if (input.action === 'approve') {
      course.status = 'published';
      course.rejectionReason = '';
      if (!course.publishedAt) {
        course.publishedAt = new Date();
      }
      await course.save();

      if (!wasPublished) {
        await Category.findByIdAndUpdate(course.category, {
          $inc: { courseCount: 1 },
        });
      }
    } else {
      if (!input.rejectionReason || input.rejectionReason.trim().length < 5) {
        throw AppError.badRequest(
          'Please provide a rejection reason (at least 5 characters) for the instructor'
        );
      }
      course.status = 'rejected';
      course.rejectionReason = input.rejectionReason.trim();
      await course.save();

      if (wasPublished) {
        await Category.findByIdAndUpdate(course.category, {
          $inc: { courseCount: -1 },
        });
      }
    }

    await notificationService.createAndDispatch({
      recipientId: course.instructor.toString(),
      type: 'course_status',
      title:
        input.action === 'approve'
          ? 'Course Approved & Published'
          : 'Course Review Feedback',
      message:
        input.action === 'approve'
          ? `Your course "${course.title}" has been approved and is now live in the catalog.`
          : `Your course "${course.title}" requires changes: ${course.rejectionReason}`,
      linkUrl: `/instructor/courses/${course._id.toString()}/edit`,
    });

    return course.populate([
      { path: 'category', select: 'name slug icon' },
      { path: 'instructor', select: 'name email headline avatarUrl' },
    ]);
  }

  async getInstructorCourses(
    actor: AuthenticatedUser
  ): Promise<ICourseDocument[]> {
    const filter =
      actor.role === 'admin' ? {} : { instructor: new mongoose.Types.ObjectId(actor.id) };

    return Course.find(filter)
      .populate('category', 'name slug icon')
      .populate('instructor', 'name email headline avatarUrl')
      .sort({ updatedAt: -1 });
  }

  async getCourseEditorPayload(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<{
    course: ICourseDocument;
    sections: SectionWithLessons[];
  }> {
    const course = await this.assertCourseOwnership(courseId, actor);
    await course.populate([
      { path: 'category', select: 'name slug icon' },
      { path: 'instructor', select: 'name email headline avatarUrl' },
    ]);

    const sections = await Section.find({ course: course._id }).sort({ order: 1 });
    const lessons = await Lesson.find({ course: course._id }).sort({ order: 1 });

    const lessonsBySection = new Map<string, Array<Record<string, unknown>>>();
    for (const lesson of lessons) {
      const secId = lesson.section.toString();
      if (!lessonsBySection.has(secId)) {
        lessonsBySection.set(secId, []);
      }
      lessonsBySection.get(secId)!.push(lesson.toObject() as unknown as Record<string, unknown>);
    }

    const structuredSections: SectionWithLessons[] = sections.map((sec) => ({
      _id: sec._id.toString(),
      course: sec.course.toString(),
      title: sec.title,
      description: sec.description,
      order: sec.order,
      lessons: lessonsBySection.get(sec._id.toString()) || [],
    }));

    return {
      course,
      sections: structuredSections,
    };
  }

  async listPublishedCourses(query: CatalogQueryInput): Promise<{
    courses: ICourseDocument[];
    meta: PaginationMeta;
  }> {
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '12', 10) || 12));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ICourseDocument> = {
      status: 'published',
    };

    if (query.q && query.q.trim()) {
      const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { title: regex },
        { shortDescription: regex },
        { tags: regex },
      ];
    }

    if (query.category && query.category.trim()) {
      if (mongoose.Types.ObjectId.isValid(query.category)) {
        filter.category = new mongoose.Types.ObjectId(query.category);
      } else {
        const cat = await Category.findOne({ slug: query.category.toLowerCase() });
        if (cat) {
          filter.category = cat._id;
        }
      }
    }

    if (
      query.level &&
      ['beginner', 'intermediate', 'advanced'].includes(query.level)
    ) {
      filter.level = query.level;
    }

    if (query.priceType === 'free') {
      filter.price = 0;
    } else if (query.priceType === 'paid') {
      filter.price = { $gt: 0 };
    }

    if (query.minRating) {
      const ratingNum = parseFloat(query.minRating);
      if (!Number.isNaN(ratingNum) && ratingNum > 0) {
        filter.averageRating = { $gte: ratingNum };
      }
    }

    let sortOption: Record<string, 1 | -1> = { publishedAt: -1, createdAt: -1 };
    if (query.sort === 'popular') {
      sortOption = { enrollmentCount: -1, averageRating: -1 };
    } else if (query.sort === 'rating') {
      sortOption = { averageRating: -1, reviewCount: -1 };
    } else if (query.sort === 'price_asc') {
      sortOption = { price: 1 };
    } else if (query.sort === 'price_desc') {
      sortOption = { price: -1 };
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('category', 'name slug icon')
        .populate('instructor', 'name headline avatarUrl')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Course.countDocuments(filter),
    ]);

    return {
      courses,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getCourseDetailBySlugOrId(
    slugOrId: string,
    viewer?: AuthenticatedUser
  ): Promise<{
    course: ICourseDocument;
    sections: SectionWithLessons[];
    reviews: ICourseReviewDocument[];
    viewerEnrollment: IEnrollmentDocument | null;
  }> {
    const query: FilterQuery<ICourseDocument> = mongoose.Types.ObjectId.isValid(
      slugOrId
    )
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId.toLowerCase() }] }
      : { slug: slugOrId.toLowerCase() };

    const course = await Course.findOne(query)
      .populate('category', 'name slug icon')
      .populate('instructor', 'name email headline bio avatarUrl');

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const instructorObj = course.instructor as unknown as {
      _id?: mongoose.Types.ObjectId;
    };
    const instructorId = instructorObj._id
      ? instructorObj._id.toString()
      : String(course.instructor);

    const isPrivilegedViewer =
      viewer?.role === 'admin' || viewer?.id === instructorId;

    if (course.status !== 'published' && !isPrivilegedViewer) {
      throw AppError.notFound('Course is not currently published');
    }

    const [sections, lessons, reviews, viewerEnrollment] = await Promise.all([
      Section.find({ course: course._id }).sort({ order: 1 }),
      Lesson.find({ course: course._id }).sort({ order: 1 }),
      CourseReview.find({ course: course._id })
        .populate('student', 'name avatarUrl headline')
        .sort({ createdAt: -1 })
        .limit(25),
      viewer
        ? Enrollment.findOne({
            student: viewer.id,
            course: course._id,
            status: { $in: ['active', 'completed'] },
          })
        : Promise.resolve(null),
    ]);

    const lessonsBySection = new Map<string, Array<Record<string, unknown>>>();
    for (const lesson of lessons) {
      const secId = lesson.section.toString();
      if (!lessonsBySection.has(secId)) {
        lessonsBySection.set(secId, []);
      }

      const canViewLessonPayload =
        isPrivilegedViewer || lesson.isPreview || Boolean(viewerEnrollment);
      lessonsBySection.get(secId)!.push({
        _id: lesson._id.toString(),
        section: secId,
        title: lesson.title,
        slug: lesson.slug,
        type: lesson.type,
        videoDurationSeconds: lesson.videoDurationSeconds,
        isPreview: lesson.isPreview,
        order: lesson.order,
        ...(canViewLessonPayload
          ? {
              content: lesson.content,
              videoUrl: lesson.videoUrl,
              resources: lesson.resources,
            }
          : {}),
      });
    }

    const structuredSections: SectionWithLessons[] = sections.map((sec) => ({
      _id: sec._id.toString(),
      course: sec.course.toString(),
      title: sec.title,
      description: sec.description,
      order: sec.order,
      lessons: lessonsBySection.get(sec._id.toString()) || [],
    }));

    return {
      course,
      sections: structuredSections,
      reviews,
      viewerEnrollment,
    };
  }

  async listCourseReviews(courseId: string): Promise<ICourseReviewDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    return CourseReview.find({ course: courseId })
      .populate('student', 'name avatarUrl headline')
      .sort({ createdAt: -1 });
  }

  async upsertCourseReview(
    courseId: string,
    actor: AuthenticatedUser,
    input: CreateCourseReviewInput
  ): Promise<{ review: ICourseReviewDocument; course: ICourseDocument }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const enrollment = await Enrollment.findOne({
      student: actor.id,
      course: course._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      throw AppError.forbidden('Only enrolled students can review this course');
    }

    const review = await CourseReview.findOneAndUpdate(
      { course: course._id, student: actor.id },
      {
        $set: {
          rating: input.rating,
          comment: input.comment.trim(),
        },
      },
      { upsert: true, new: true }
    ).populate('student', 'name avatarUrl headline');

    const allReviews = await CourseReview.find({ course: course._id }).select(
      'rating'
    );
    const reviewCount = allReviews.length;
    const sumRatings = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating =
      reviewCount > 0 ? Math.round((sumRatings / reviewCount) * 10) / 10 : 0;

    course.reviewCount = reviewCount;
    course.averageRating = averageRating;
    await course.save();

    return { review, course };
  }
}

export const courseService = new CourseService();
