// Shared TypeScript interfaces for Databricks Practice Exam System

export type ExamTopic = 
  | 'Databricks Lakehouse Platform'
  | 'ELT with Spark SQL and Python'
  | 'Incremental Data Processing'
  | 'Production Pipelines'
  | 'Data Governance';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type ExamType = 'practice' | 'assessment';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  lastLoginAt: Date;
  studyGoals: StudyGoal[];
  examHistory: ExamResult[];
}

export interface StudyGoal {
  id: string;
  userId: string;
  topic: ExamTopic;
  targetScore: number;
  deadline?: Date;
  createdAt: Date;
}

export interface Question {
  id: string;
  topic: ExamTopic;
  subtopic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  codeExample?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  documentationLinks: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionResponse {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number; // in seconds
  answeredAt: Date;
}

export interface ExamResult {
  id: string;
  userId: string;
  examType: ExamType;
  startTime: Date;
  endTime: Date;
  totalQuestions: number;
  correctAnswers: number;
  topicBreakdown: TopicScore[];
  timeSpent: number; // in seconds
  questions: QuestionResponse[];
}

export interface TopicScore {
  topic: ExamTopic;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  averageTime: number; // in seconds
}

export interface ExamSession {
  id: string;
  userId: string;
  examType: ExamType;
  questions: Question[];
  currentQuestionIndex: number;
  responses: QuestionResponse[];
  startTime: Date;
  timeRemaining: number; // in seconds
  isCompleted: boolean;
  isPaused: boolean;
}

export interface PerformanceAnalytics {
  userId: string;
  weakAreas: ExamTopic[];
  strongAreas: ExamTopic[];
  overallProgress: number;
  topicTrends: TopicTrend[];
  recommendedStudyPlan: StudyRecommendation[];
}

export interface TopicTrend {
  topic: ExamTopic;
  scores: number[];
  dates: Date[];
  trend: 'improving' | 'declining' | 'stable';
}

export interface StudyRecommendation {
  topic: ExamTopic;
  priority: 'high' | 'medium' | 'low';
  recommendedQuestions: number;
  focusAreas: string[];
}

export interface QuestionFeedback {
  id: string;
  questionId: string;
  userId: string;
  feedbackType: 'incorrect' | 'unclear' | 'outdated' | 'suggestion';
  message: string;
  createdAt: Date;
}