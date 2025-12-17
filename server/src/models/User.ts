import { User as IUser, StudyGoal, ExamResult } from '../../../shared/types';

export class User implements IUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  lastLoginAt: Date;
  studyGoals: StudyGoal[];
  examHistory: ExamResult[];

  constructor(data: Partial<IUser>) {
    this.id = data.id || this.generateId();
    this.email = data.email || '';
    this.name = data.name || '';
    this.createdAt = data.createdAt || new Date();
    this.lastLoginAt = data.lastLoginAt || new Date();
    this.studyGoals = data.studyGoals || [];
    this.examHistory = data.examHistory || [];
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }



  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  public addStudyGoal(goal: StudyGoal): void {
    this.studyGoals.push(goal);
  }

  public addExamResult(result: ExamResult): void {
    this.examHistory.push(result);
  }

  public getWeakAreas(threshold: number = 70): string[] {
    if (this.examHistory.length === 0) {
      return [];
    }

    const latestResult = this.examHistory[this.examHistory.length - 1];
    return latestResult.topicBreakdown
      .filter(topic => topic.percentage < threshold)
      .map(topic => topic.topic);
  }

  public calculatePerformanceSummary(): any {
    if (this.examHistory.length === 0) {
      return {
        totalExams: 0,
        averageScore: 0,
        topicPerformance: {},
        improvementTrend: 'no_data'
      };
    }

    const totalExams = this.examHistory.length;
    const averageScore = this.examHistory.reduce((sum, exam) => 
      sum + (exam.correctAnswers / exam.totalQuestions * 100), 0) / totalExams;

    // Calculate topic performance
    const topicPerformance: { [key: string]: { averageScore: number, examCount: number } } = {};
    
    this.examHistory.forEach(exam => {
      exam.topicBreakdown.forEach(topic => {
        if (!topicPerformance[topic.topic]) {
          topicPerformance[topic.topic] = { averageScore: 0, examCount: 0 };
        }
        topicPerformance[topic.topic].averageScore += topic.percentage;
        topicPerformance[topic.topic].examCount++;
      });
    });

    // Calculate averages
    Object.keys(topicPerformance).forEach(topic => {
      topicPerformance[topic].averageScore /= topicPerformance[topic].examCount;
    });

    // Calculate improvement trend
    let improvementTrend = 'stable';
    if (this.examHistory.length >= 2) {
      const recentScores = this.examHistory.slice(-3).map(exam => 
        exam.correctAnswers / exam.totalQuestions * 100);
      const firstScore = recentScores[0];
      const lastScore = recentScores[recentScores.length - 1];
      
      if (lastScore > firstScore + 5) {
        improvementTrend = 'improving';
      } else if (lastScore < firstScore - 5) {
        improvementTrend = 'declining';
      }
    }

    return {
      totalExams,
      averageScore,
      topicPerformance,
      improvementTrend
    };
  }

  public calculateTopicMastery(masteryThreshold: number = 80): any {
    const topicMastery: { [key: string]: { isMastered: boolean, averageScore: number, recentScore: number } } = {};

    if (this.examHistory.length === 0) {
      return topicMastery;
    }

    // Get all unique topics
    const allTopics = new Set<string>();
    this.examHistory.forEach(exam => {
      exam.topicBreakdown.forEach(topic => allTopics.add(topic.topic));
    });

    allTopics.forEach(topicName => {
      const topicScores = this.examHistory
        .map(exam => exam.topicBreakdown.find(t => t.topic === topicName))
        .filter(topic => topic !== undefined)
        .map(topic => topic!.percentage);

      if (topicScores.length > 0) {
        const averageScore = topicScores.reduce((sum, score) => sum + score, 0) / topicScores.length;
        const recentScore = topicScores[topicScores.length - 1];
        
        topicMastery[topicName] = {
          isMastered: averageScore >= masteryThreshold && recentScore >= masteryThreshold,
          averageScore,
          recentScore
        };
      }
    });

    return topicMastery;
  }

  public calculateStudyEfficiency(): any {
    if (this.examHistory.length === 0) {
      return {
        averageTimePerQuestion: 0,
        timeManagementScore: 0,
        efficiencyTrend: 'no_data',
        recommendations: []
      };
    }

    const timeData = this.examHistory.map(exam => ({
      timeSpent: exam.timeSpent,
      totalQuestions: exam.totalQuestions,
      score: exam.correctAnswers / exam.totalQuestions * 100
    }));

    const averageTimePerQuestion = timeData.reduce((sum, data) => 
      sum + (data.timeSpent / data.totalQuestions), 0) / timeData.length;

    // Calculate time management score (lower time with higher accuracy is better)
    const timeManagementScore = timeData.reduce((sum, data) => {
      const timePerQuestion = data.timeSpent / data.totalQuestions;
      const efficiency = data.score / (timePerQuestion / 60); // Score per minute
      return sum + efficiency;
    }, 0) / timeData.length;

    // Calculate efficiency trend
    let efficiencyTrend = 'stable';
    if (timeData.length >= 2) {
      const recentEfficiency = timeData.slice(-2).map(data => 
        data.score / (data.timeSpent / data.totalQuestions / 60));
      if (recentEfficiency[1] > recentEfficiency[0] * 1.1) {
        efficiencyTrend = 'improving';
      } else if (recentEfficiency[1] < recentEfficiency[0] * 0.9) {
        efficiencyTrend = 'declining';
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (averageTimePerQuestion > 120) { // More than 2 minutes per question
      recommendations.push('Consider practicing time management - aim for 1.5-2 minutes per question');
    }
    if (timeManagementScore < 50) {
      recommendations.push('Focus on accuracy first, then work on speed');
    }

    return {
      averageTimePerQuestion,
      timeManagementScore,
      efficiencyTrend,
      recommendations
    };
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }

    if (!this.name || this.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!this.id || this.id.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
      errors.push('Valid creation date is required');
    }

    if (!(this.lastLoginAt instanceof Date) || isNaN(this.lastLoginAt.getTime())) {
      errors.push('Valid last login date is required');
    }

    if (this.createdAt > new Date()) {
      errors.push('Creation date cannot be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public toJSON(): IUser {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt,
      studyGoals: this.studyGoals,
      examHistory: this.examHistory
    };
  }
}

export const validateUser = (userData: Partial<IUser>): string[] => {
  const errors: string[] = [];

  if (!userData.email || typeof userData.email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Email must be in valid format');
  }

  if (!userData.name || typeof userData.name !== 'string') {
    errors.push('Name is required and must be a string');
  } else if (userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (userData.createdAt && !(userData.createdAt instanceof Date)) {
    errors.push('Created date must be a valid Date object');
  }

  if (userData.lastLoginAt && !(userData.lastLoginAt instanceof Date)) {
    errors.push('Last login date must be a valid Date object');
  }

  return errors;
};