export type QuestionType = 'mcq' | 'multi_select' | 'true_false';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuizItem {
  _id: string;
  course: string;
  section?: string;
  lesson?: string;
  title: string;
  description: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  passingScorePercentage: number;
  isPublished: boolean;
  totalPoints: number;
  questionCount: number;
  createdAt: string;
}

export interface QuestionItem {
  _id: string;
  quiz: string;
  type: QuestionType;
  prompt: string;
  options: QuestionOption[];
  correctOptionIds?: string[];
  points: number;
  explanation?: string;
  order: number;
}

export interface QuizAttemptAnswer {
  question: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface QuizAttemptItem {
  _id: string;
  quiz: string;
  course: string;
  student:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        avatarUrl?: string;
      };
  attemptNumber: number;
  answers: QuizAttemptAnswer[];
  scorePercentage: number;
  earnedPoints: number;
  totalPoints: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
  durationSeconds: number;
}

export interface QuizReviewEntry {
  questionId: string;
  prompt: string;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  explanation: string;
}

export type SubmissionStatus =
  | 'submitted'
  | 'graded'
  | 'returned_for_revision';

export interface AssignmentItem {
  _id: string;
  course: string;
  section?: string;
  title: string;
  instructions: string;
  dueDate?: string | null;
  maxScore: number;
  allowResubmission: boolean;
  maxResubmissions: number;
  requiresAttachment: boolean;
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  isPublished: boolean;
  createdAt: string;
}

export interface SubmissionAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface GradeHistoryItem {
  grade: number;
  feedback: string;
  gradedBy: string;
  gradedAt: string;
  submissionNumber: number;
}

export interface SubmissionItem {
  _id: string;
  assignment: string;
  course: string;
  student:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        avatarUrl?: string;
      };
  textResponse: string;
  attachments: SubmissionAttachment[];
  status: SubmissionStatus;
  grade: number | null;
  feedback: string;
  gradedAt?: string;
  submissionCount: number;
  submittedAt: string;
  gradeHistory: GradeHistoryItem[];
}
