export interface Question {
  id: string;
  type: 'mcq' | 'checkbox' | 'descriptive';
  text: string;
  options?: string[];
  correctAnswer?: string | string[]; // For MCQ (string) or Checkbox (array)
  keywords?: string[]; // For descriptive questions
  marks: number;
  co?: string; // Course Outcome
  po?: string; // Program Outcome
}

export interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  duration: number; // in minutes
  totalMarks: number;
  questions: Question[];
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  createdBy: string;
  createdAt: Date;
  instructions: string[];
}

export interface TestSubmission {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  answers: Record<string, string | string[]>;
  score: number;
  totalMarks: number;
  timeSpent: number; // in seconds
  submittedAt: Date;
  evaluatedAnswers: {
    [questionId: string]: {
      isCorrect: boolean;
      marksAwarded: number;
      feedback?: string;
    };
  };
  antiCheatEvents: AntiCheatEvent[];
}

export interface AntiCheatEvent {
  id: string;
  type: 'tab_switch' | 'copy_paste' | 'right_click' | 'fullscreen_exit';
  timestamp: Date;
  details?: string;
}

export interface COPOMapping {
  courseOutcomes: string[];
  programOutcomes: string[];
}

export interface LeaderboardEntry {
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  rank: number;
  timeSpent: number;
  submittedAt: Date;
}