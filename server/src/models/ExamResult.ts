import { ExamResult, ExamType, TopicScore, QuestionResponse, ExamTopic } from '../../../shared/types';

export class ExamResultModel implements ExamResult {
  id: string;
  userId: string;
  examType: ExamType;
  startTime: Date;
  endTime: Date;
  totalQuestions: number;
  correctAnswers: number;
  topicBreakdown: TopicScore[];
  timeSpent: number;
  questions: QuestionResponse[];

  constructor(data: Partial<ExamResult>) {
    this.id = data.id || this.generateId();
    this.userId = data.userId || '';
    this.examType = data.examType || 'practice';
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || new Date();
    this.totalQuestions = data.totalQuestions || 0;
    this.correctAnswers = data.correctAnswers || 0;
    this.topicBreakdown = data.topicBreakdown || [];
    this.timeSpent = data.timeSpent || 0;
    this.questions = data.questions || [];

    this.validate();
  }

  private generateId(): string {
    return `exam_result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validate(): void {
    const errors: string[] = [];

    if (!this.userId || this.userId.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!this.id || this.id.trim().length === 0) {
      errors.push('Exam result ID is required');
    }

    if (!(this.startTime instanceof Date) || isNaN(this.startTime.getTime())) {
      errors.push('Valid start time is required');
    }

    if (!(this.endTime instanceof Date) || isNaN(this.endTime.getTime())) {
      errors.push('Valid end time is required');
    }

    if (this.startTime >= this.endTime) {
      errors.push('End time must be after start time');
    }

    if (this.totalQuestions < 0) {
      errors.push('Total questions must be non-negative');
    }

    if (this.correctAnswers < 0 || this.correctAnswers > this.totalQuestions) {
      errors.push('Correct answers must be between 0 and total questions');
    }

    if (this.timeSpent < 0) {
      errors.push('Time spent must be non-negative');
    }

    // Validate exam type
    const validExamTypes: ExamType[] = ['practice', 'assessment'];
    if (!validExamTypes.includes(this.examType)) {
      errors.push('Exam type must be practice or assessment');
    }

    // Validate topic breakdown
    if (this.topicBreakdown.length > 0) {
      const totalBreakdownQuestions = this.topicBreakdown.reduce((sum, topic) => sum + topic.totalQuestions, 0);
      if (totalBreakdownQuestions !== this.totalQuestions) {
        errors.push('Topic breakdown total questions must match exam total questions');
      }

      const totalBreakdownCorrect = this.topicBreakdown.reduce((sum, topic) => sum + topic.correctAnswers, 0);
      if (totalBreakdownCorrect !== this.correctAnswers) {
        errors.push('Topic breakdown correct answers must match exam correct answers');
      }
    }

    // Validate questions array matches totals
    if (this.questions.length !== this.totalQuestions) {
      errors.push('Questions array length must match total questions');
    }

    const actualCorrectAnswers = this.questions.filter(q => q.isCorrect).length;
    if (actualCorrectAnswers !== this.correctAnswers) {
      errors.push('Actual correct answers in questions array must match correctAnswers field');
    }

    if (errors.length > 0) {
      throw new Error(`ExamResult validation failed: ${errors.join(', ')}`);
    }
  }

  public calculateTopicBreakdown(): TopicScore[] {
    const topicMap = new Map<ExamTopic, { total: number; correct: number; totalTime: number }>();

    // Initialize all topics
    const allTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    allTopics.forEach(topic => {
      topicMap.set(topic, { total: 0, correct: 0, totalTime: 0 });
    });

    // This would need question topic information to properly calculate
    // For now, we'll return the existing breakdown or empty array
    return this.topicBreakdown;
  }

  public getOverallScore(): number {
    if (this.totalQuestions === 0) return 0;
    return Math.round((this.correctAnswers / this.totalQuestions) * 100);
  }

  public getAverageTimePerQuestion(): number {
    if (this.totalQuestions === 0) return 0;
    return Math.round(this.timeSpent / this.totalQuestions);
  }

  public getWeakTopics(threshold: number = 70): ExamTopic[] {
    return this.topicBreakdown
      .filter(topic => topic.percentage < threshold)
      .map(topic => topic.topic);
  }

  public getStrongTopics(threshold: number = 80): ExamTopic[] {
    return this.topicBreakdown
      .filter(topic => topic.percentage >= threshold)
      .map(topic => topic.topic);
  }

  public updateEndTime(): void {
    this.endTime = new Date();
    this.timeSpent = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }

  public toJSON(): ExamResult {
    return {
      id: this.id,
      userId: this.userId,
      examType: this.examType,
      startTime: this.startTime,
      endTime: this.endTime,
      totalQuestions: this.totalQuestions,
      correctAnswers: this.correctAnswers,
      topicBreakdown: this.topicBreakdown,
      timeSpent: this.timeSpent,
      questions: this.questions
    };
  }
}

export const validateExamResult = (examData: Partial<ExamResult>): string[] => {
  const errors: string[] = [];

  if (!examData.userId || typeof examData.userId !== 'string' || examData.userId.trim().length === 0) {
    errors.push('User ID is required and must be a non-empty string');
  }

  if (examData.startTime && !(examData.startTime instanceof Date)) {
    errors.push('Start time must be a valid Date object');
  }

  if (examData.endTime && !(examData.endTime instanceof Date)) {
    errors.push('End time must be a valid Date object');
  }

  if (examData.startTime && examData.endTime && examData.startTime >= examData.endTime) {
    errors.push('End time must be after start time');
  }

  if (typeof examData.totalQuestions === 'number' && examData.totalQuestions < 0) {
    errors.push('Total questions must be non-negative');
  }

  if (typeof examData.correctAnswers === 'number' && examData.totalQuestions && 
      (examData.correctAnswers < 0 || examData.correctAnswers > examData.totalQuestions)) {
    errors.push('Correct answers must be between 0 and total questions');
  }

  if (typeof examData.timeSpent === 'number' && examData.timeSpent < 0) {
    errors.push('Time spent must be non-negative');
  }

  const validExamTypes: ExamType[] = ['practice', 'assessment'];
  if (examData.examType && !validExamTypes.includes(examData.examType)) {
    errors.push('Exam type must be practice or assessment');
  }

  if (examData.questions && Array.isArray(examData.questions) && examData.totalQuestions &&
      examData.questions.length !== examData.totalQuestions) {
    errors.push('Questions array length must match total questions');
  }

  return errors;
};

export const validateTopicScore = (topicScore: Partial<TopicScore>): string[] => {
  const errors: string[] = [];

  const validTopics: ExamTopic[] = [
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ];

  if (!topicScore.topic || !validTopics.includes(topicScore.topic)) {
    errors.push('Topic must be one of the valid exam topics');
  }

  if (typeof topicScore.totalQuestions !== 'number' || topicScore.totalQuestions < 0) {
    errors.push('Total questions must be a non-negative number');
  }

  if (typeof topicScore.correctAnswers !== 'number' || topicScore.correctAnswers < 0) {
    errors.push('Correct answers must be a non-negative number');
  }

  if (topicScore.totalQuestions && topicScore.correctAnswers && 
      topicScore.correctAnswers > topicScore.totalQuestions) {
    errors.push('Correct answers cannot exceed total questions');
  }

  if (typeof topicScore.percentage !== 'number' || topicScore.percentage < 0 || topicScore.percentage > 100) {
    errors.push('Percentage must be a number between 0 and 100');
  }

  if (typeof topicScore.averageTime !== 'number' || topicScore.averageTime < 0) {
    errors.push('Average time must be a non-negative number');
  }

  return errors;
};