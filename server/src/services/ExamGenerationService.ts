import { 
  Question, 
  ExamResult, 
  ExamSession, 
  ExamType, 
  ExamTopic,
  PerformanceAnalytics,
  StudyRecommendation
} from '../../../shared/types';
import { AdaptiveQuestionService, AdaptiveExamConfig } from './AdaptiveQuestionService';
import { QuestionService } from './QuestionService';

export interface ExamGenerationRequest {
  userId: string;
  examType: ExamType;
  totalQuestions?: number;
  focusTopics?: ExamTopic[];
  difficulty?: 'mixed' | 'easy' | 'medium' | 'hard';
  useAdaptiveSelection?: boolean;
}

export interface ExamGenerationResult {
  examSession: ExamSession;
  performanceAnalysis?: PerformanceAnalytics;
  studyRecommendations?: StudyRecommendation[];
}

export class ExamGenerationService {
  private adaptiveQuestionService: AdaptiveQuestionService;
  private questionService: QuestionService;

  constructor() {
    this.adaptiveQuestionService = new AdaptiveQuestionService();
    this.questionService = new QuestionService();
  }

  /**
   * Generates a new exam session based on user performance and preferences
   * Implements Requirements 1.1, 1.2, 1.5
   */
  async generateExam(
    request: ExamGenerationRequest,
    userExamHistory: ExamResult[]
  ): Promise<ExamGenerationResult> {
    const config: Partial<AdaptiveExamConfig> = {
      totalQuestions: request.totalQuestions || 60
    };

    let selectedQuestions: Question[];
    let performanceAnalysis: PerformanceAnalytics | undefined;
    let studyRecommendations: StudyRecommendation[] | undefined;

    if (request.useAdaptiveSelection !== false && request.examType === 'practice') {
      // Use adaptive question selection for practice exams
      const analysisResult = await this.adaptiveQuestionService.analyzeUserPerformance(
        userExamHistory, 
        config
      );

      selectedQuestions = await this.adaptiveQuestionService.generateAdaptiveQuestionSet(
        userExamHistory,
        config
      );

      // Generate performance analytics and recommendations
      const trends = this.adaptiveQuestionService.calculatePerformanceTrends(userExamHistory);
      studyRecommendations = this.adaptiveQuestionService.generateStudyRecommendations(
        analysisResult,
        trends
      );

      performanceAnalysis = {
        userId: request.userId,
        weakAreas: analysisResult.weakAreas,
        strongAreas: analysisResult.strongAreas,
        overallProgress: this.calculateOverallProgress(userExamHistory),
        topicTrends: trends,
        recommendedStudyPlan: studyRecommendations
      };
    } else {
      // Use standard question selection for assessment exams or when adaptive is disabled
      selectedQuestions = await this.generateStandardQuestionSet(request, config);
    }

    // Apply additional filters if specified
    if (request.focusTopics && request.focusTopics.length > 0) {
      selectedQuestions = await this.filterQuestionsByTopics(
        selectedQuestions, 
        request.focusTopics, 
        config.totalQuestions || 60
      );
    }

    if (request.difficulty && request.difficulty !== 'mixed') {
      selectedQuestions = await this.filterQuestionsByDifficulty(
        selectedQuestions, 
        request.difficulty, 
        config.totalQuestions || 60
      );
    }

    // Create exam session
    const examSession: ExamSession = {
      id: this.generateSessionId(),
      userId: request.userId,
      examType: request.examType,
      questions: selectedQuestions,
      currentQuestionIndex: 0,
      responses: [],
      startTime: new Date(),
      timeRemaining: request.examType === 'practice' ? 5400 : 5400, // 90 minutes in seconds
      isCompleted: false,
      isPaused: false
    };

    return {
      examSession,
      performanceAnalysis,
      studyRecommendations
    };
  }

  /**
   * Analyzes user performance and provides recommendations
   * Implements Requirements 3.1, 3.2, 3.4
   */
  async analyzePerformance(
    userId: string,
    examHistory: ExamResult[]
  ): Promise<PerformanceAnalytics> {
    const analysisResult = await this.adaptiveQuestionService.analyzeUserPerformance(examHistory);
    const trends = this.adaptiveQuestionService.calculatePerformanceTrends(examHistory);
    const recommendations = this.adaptiveQuestionService.generateStudyRecommendations(
      analysisResult,
      trends
    );

    return {
      userId,
      weakAreas: analysisResult.weakAreas,
      strongAreas: analysisResult.strongAreas,
      overallProgress: this.calculateOverallProgress(examHistory),
      topicTrends: trends,
      recommendedStudyPlan: recommendations
    };
  }

  /**
   * Checks if a topic should have reduced allocation in future exams
   * Implements Requirement 3.3
   */
  async shouldReduceTopicAllocation(
    topic: ExamTopic,
    examHistory: ExamResult[]
  ): Promise<boolean> {
    return this.adaptiveQuestionService.shouldReduceTopicAllocation(topic, examHistory);
  }

  /**
   * Generates study recommendations for improvement
   * Implements Requirement 3.4
   */
  async generateStudyPlan(
    userId: string,
    examHistory: ExamResult[]
  ): Promise<StudyRecommendation[]> {
    const analysisResult = await this.adaptiveQuestionService.analyzeUserPerformance(examHistory);
    const trends = this.adaptiveQuestionService.calculatePerformanceTrends(examHistory);
    
    return this.adaptiveQuestionService.generateStudyRecommendations(analysisResult, trends);
  }

  /**
   * Validates that the question bank supports adaptive learning requirements
   */
  async validateAdaptiveCapabilities(): Promise<{ isValid: boolean; issues: string[] }> {
    const questionBankValidation = await this.questionService.validateQuestionBank();
    const issues: string[] = [...questionBankValidation.issues];

    // Check if we have sufficient questions per topic for adaptive selection
    const allTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    for (const topic of allTopics) {
      const topicQuestions = await this.questionService.getQuestionsByTopic(topic);
      
      if (topicQuestions.length < 20) {
        issues.push(`Insufficient questions for adaptive selection in topic: ${topic} (${topicQuestions.length} found, minimum 20 recommended for adaptive learning)`);
      }

      // Check difficulty distribution
      const easyQuestions = topicQuestions.filter(q => q.difficulty === 'easy').length;
      const mediumQuestions = topicQuestions.filter(q => q.difficulty === 'medium').length;
      const hardQuestions = topicQuestions.filter(q => q.difficulty === 'hard').length;

      if (mediumQuestions + hardQuestions < 10) {
        issues.push(`Insufficient challenging questions for topic: ${topic} (need at least 10 medium/hard questions for adaptive learning)`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Private helper methods

  private async generateStandardQuestionSet(
    request: ExamGenerationRequest,
    config: Partial<AdaptiveExamConfig>
  ): Promise<Question[]> {
    const totalQuestions = config.totalQuestions || 60;
    
    if (request.examType === 'assessment') {
      // For assessment exams, use proportional distribution across all topics
      return await this.generateProportionalQuestionSet(totalQuestions);
    } else {
      // For practice exams without adaptive selection, use balanced distribution
      return await this.generateBalancedQuestionSet(totalQuestions);
    }
  }

  private async generateProportionalQuestionSet(totalQuestions: number): Promise<Question[]> {
    // Proportional distribution for comprehensive assessment (Requirement 3.5)
    const allTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    const questionsPerTopic = Math.floor(totalQuestions / allTopics.length);
    const remainingQuestions = totalQuestions - (questionsPerTopic * allTopics.length);

    const selectedQuestions: Question[] = [];

    for (let i = 0; i < allTopics.length; i++) {
      const topic = allTopics[i];
      const extraQuestion = i < remainingQuestions ? 1 : 0;
      const topicQuestionCount = questionsPerTopic + extraQuestion;

      const topicQuestions = await this.questionService.getQuestionsByTopic(topic, topicQuestionCount * 2);
      const randomQuestions = this.selectRandomQuestions(topicQuestions, topicQuestionCount);
      selectedQuestions.push(...randomQuestions);
    }

    return this.shuffleArray(selectedQuestions);
  }

  private async generateBalancedQuestionSet(totalQuestions: number): Promise<Question[]> {
    const allTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    const questionsPerTopic = Math.floor(totalQuestions / allTopics.length);
    const remainingQuestions = totalQuestions - (questionsPerTopic * allTopics.length);

    const selectedQuestions: Question[] = [];

    for (let i = 0; i < allTopics.length; i++) {
      const topic = allTopics[i];
      const extraQuestion = i < remainingQuestions ? 1 : 0;
      const topicQuestionCount = questionsPerTopic + extraQuestion;

      const topicQuestions = await this.questionService.getQuestionsByTopic(topic, topicQuestionCount * 2);
      const randomQuestions = this.selectRandomQuestions(topicQuestions, topicQuestionCount);
      selectedQuestions.push(...randomQuestions);
    }

    return this.shuffleArray(selectedQuestions);
  }

  private async filterQuestionsByTopics(
    questions: Question[],
    focusTopics: ExamTopic[],
    totalQuestions: number
  ): Promise<Question[]> {
    const filteredQuestions = questions.filter(q => focusTopics.includes(q.topic));
    
    if (filteredQuestions.length >= totalQuestions) {
      return this.selectRandomQuestions(filteredQuestions, totalQuestions);
    }

    // If not enough questions in focus topics, supplement with additional questions
    const additionalNeeded = totalQuestions - filteredQuestions.length;
    const additionalQuestions: Question[] = [];

    for (const topic of focusTopics) {
      const topicQuestions = await this.questionService.getQuestionsByTopic(topic, additionalNeeded * 2);
      const newQuestions = topicQuestions.filter(q => 
        !filteredQuestions.some(fq => fq.id === q.id)
      );
      additionalQuestions.push(...newQuestions);
      
      if (additionalQuestions.length >= additionalNeeded) break;
    }

    const finalQuestions = [
      ...filteredQuestions,
      ...this.selectRandomQuestions(additionalQuestions, additionalNeeded)
    ];

    return this.shuffleArray(finalQuestions);
  }

  private async filterQuestionsByDifficulty(
    questions: Question[],
    difficulty: 'easy' | 'medium' | 'hard',
    totalQuestions: number
  ): Promise<Question[]> {
    const filteredQuestions = questions.filter(q => q.difficulty === difficulty);
    
    if (filteredQuestions.length >= totalQuestions) {
      return this.selectRandomQuestions(filteredQuestions, totalQuestions);
    }

    // If not enough questions of specified difficulty, return what we have
    return filteredQuestions;
  }

  private calculateOverallProgress(examHistory: ExamResult[]): number {
    if (examHistory.length === 0) return 0;

    const recentExams = examHistory
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
      .slice(0, 5); // Last 5 exams

    const totalScore = recentExams.reduce((sum, exam) => {
      return sum + (exam.correctAnswers / exam.totalQuestions) * 100;
    }, 0);

    return Math.round(totalScore / recentExams.length);
  }

  private selectRandomQuestions(questions: Question[], count: number): Question[] {
    if (questions.length <= count) {
      return [...questions];
    }

    const shuffled = this.shuffleArray([...questions]);
    return shuffled.slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}