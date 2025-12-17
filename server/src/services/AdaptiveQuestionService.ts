import { 
  Question, 
  ExamResult, 
  ExamTopic, 
  TopicScore, 
  PerformanceAnalytics, 
  TopicTrend, 
  StudyRecommendation,
  QuestionDifficulty 
} from '../../../shared/types';
import { QuestionRepository } from '../repositories/QuestionRepository';

export interface QuestionAllocation {
  topic: ExamTopic;
  questionCount: number;
  priority: 'high' | 'medium' | 'low';
  averageScore: number;
}

export interface AdaptiveExamConfig {
  totalQuestions: number;
  weakAreaThreshold: number; // percentage below which a topic is considered weak
  strongAreaThreshold: number; // percentage above which a topic is considered strong
  weakAreaAllocationPercentage: number; // percentage of questions to allocate to weak areas
  balancedDistribution: boolean; // whether to use balanced distribution for new users
}

export interface PerformanceAnalysisResult {
  weakAreas: ExamTopic[];
  strongAreas: ExamTopic[];
  topicScores: Map<ExamTopic, number>;
  hasExamHistory: boolean;
  recommendedAllocation: QuestionAllocation[];
}

export class AdaptiveQuestionService {
  private questionRepository: QuestionRepository;
  private defaultConfig: AdaptiveExamConfig;

  constructor() {
    this.questionRepository = new QuestionRepository();
    this.defaultConfig = {
      totalQuestions: 60,
      weakAreaThreshold: 70,
      strongAreaThreshold: 80,
      weakAreaAllocationPercentage: 60,
      balancedDistribution: true
    };
  }

  /**
   * Analyzes user performance to identify weak and strong areas
   * Implements Requirements 1.1, 3.3, 3.4
   */
  async analyzeUserPerformance(
    examHistory: ExamResult[], 
    config: Partial<AdaptiveExamConfig> = {}
  ): Promise<PerformanceAnalysisResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (!examHistory || examHistory.length === 0) {
      return this.getBalancedDistributionForNewUser(finalConfig);
    }

    // Get the most recent exam results for analysis
    const recentResults = this.getRecentResults(examHistory, 3); // Last 3 exams
    const topicScores = this.calculateAverageTopicScores(recentResults);
    
    const weakAreas: ExamTopic[] = [];
    const strongAreas: ExamTopic[] = [];
    
    // Identify weak and strong areas based on thresholds
    for (const [topic, score] of topicScores.entries()) {
      if (score < finalConfig.weakAreaThreshold) {
        weakAreas.push(topic);
      } else if (score >= finalConfig.strongAreaThreshold) {
        strongAreas.push(topic);
      }
    }

    // Generate recommended allocation based on performance
    const recommendedAllocation = this.calculateQuestionAllocation(
      topicScores, 
      weakAreas, 
      strongAreas, 
      finalConfig
    );

    return {
      weakAreas,
      strongAreas,
      topicScores,
      hasExamHistory: true,
      recommendedAllocation
    };
  }

  /**
   * Generates adaptive question selection based on user performance
   * Implements Requirements 1.2, 1.5
   */
  async generateAdaptiveQuestionSet(
    examHistory: ExamResult[],
    config: Partial<AdaptiveExamConfig> = {}
  ): Promise<Question[]> {
    const performanceAnalysis = await this.analyzeUserPerformance(examHistory, config);
    const finalConfig = { ...this.defaultConfig, ...config };

    if (!performanceAnalysis.hasExamHistory) {
      // New user - use balanced distribution (Requirement 1.5)
      return await this.generateBalancedQuestionSet(finalConfig.totalQuestions);
    }

    // Experienced user - use adaptive allocation (Requirement 1.2)
    return await this.generateWeightedQuestionSet(
      performanceAnalysis.recommendedAllocation,
      finalConfig.totalQuestions
    );
  }

  /**
   * Calculates performance trends over time
   * Implements Requirement 3.2
   */
  calculatePerformanceTrends(examHistory: ExamResult[]): TopicTrend[] {
    if (examHistory.length < 2) {
      return [];
    }

    const allTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    const trends: TopicTrend[] = [];

    for (const topic of allTopics) {
      const topicData = examHistory
        .map(exam => ({
          score: this.getTopicScoreFromExam(exam, topic),
          date: exam.endTime
        }))
        .filter(data => data.score !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (topicData.length >= 2) {
        const scores = topicData.map(d => d.score!);
        const dates = topicData.map(d => d.date);
        const trend = this.calculateTrendDirection(scores);

        trends.push({
          topic,
          scores,
          dates,
          trend
        });
      }
    }

    return trends;
  }

  /**
   * Generates study recommendations based on performance analysis
   * Implements Requirement 3.4
   */
  generateStudyRecommendations(
    performanceAnalysis: PerformanceAnalysisResult,
    trends: TopicTrend[]
  ): StudyRecommendation[] {
    const recommendations: StudyRecommendation[] = [];
    const allTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    for (const topic of allTopics) {
      const currentScore = performanceAnalysis.topicScores.get(topic) || 0;
      const topicTrend = trends.find(t => t.topic === topic);
      
      let priority: 'high' | 'medium' | 'low' = 'medium';
      let recommendedQuestions = 10;
      const focusAreas: string[] = [];

      // High priority for weak areas that are not improving
      if (performanceAnalysis.weakAreas.includes(topic)) {
        priority = 'high';
        recommendedQuestions = 20;
        
        if (topicTrend && (topicTrend.trend === 'declining' || topicTrend.trend === 'stable')) {
          priority = 'high';
          recommendedQuestions = 25;
          focusAreas.push('Requires immediate attention - no recent improvement');
        }
      }

      // Medium priority for topics with declining trends
      if (topicTrend && topicTrend.trend === 'declining' && !performanceAnalysis.weakAreas.includes(topic)) {
        priority = 'medium';
        recommendedQuestions = 15;
        focusAreas.push('Performance declining - needs review');
      }

      // Low priority for strong areas with improving trends
      if (performanceAnalysis.strongAreas.includes(topic) && 
          topicTrend && topicTrend.trend === 'improving') {
        priority = 'low';
        recommendedQuestions = 5;
        focusAreas.push('Maintain current performance level');
      }

      // Add topic-specific focus areas
      focusAreas.push(...this.getTopicSpecificFocusAreas(topic, currentScore));

      recommendations.push({
        topic,
        priority,
        recommendedQuestions,
        focusAreas
      });
    }

    // Sort by priority (high first)
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Checks if topic allocation should be reduced based on performance
   * Implements Requirement 3.3
   */
  shouldReduceTopicAllocation(topic: ExamTopic, examHistory: ExamResult[]): boolean {
    if (examHistory.length === 0) return false;

    const recentResults = this.getRecentResults(examHistory, 3);
    const topicScores = recentResults
      .map(exam => this.getTopicScoreFromExam(exam, topic))
      .filter(score => score !== null) as number[];

    if (topicScores.length === 0) return false;

    const averageScore = topicScores.reduce((sum, score) => sum + score, 0) / topicScores.length;
    return averageScore >= this.defaultConfig.strongAreaThreshold;
  }

  // Private helper methods

  private getRecentResults(examHistory: ExamResult[], count: number): ExamResult[] {
    return examHistory
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
      .slice(0, count);
  }

  private calculateAverageTopicScores(examResults: ExamResult[]): Map<ExamTopic, number> {
    const topicScores = new Map<ExamTopic, number[]>();
    
    // Collect all scores for each topic
    examResults.forEach(exam => {
      exam.topicBreakdown.forEach(topicScore => {
        if (!topicScores.has(topicScore.topic)) {
          topicScores.set(topicScore.topic, []);
        }
        topicScores.get(topicScore.topic)!.push(topicScore.percentage);
      });
    });

    // Calculate averages
    const averageScores = new Map<ExamTopic, number>();
    for (const [topic, scores] of topicScores.entries()) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      averageScores.set(topic, Math.round(average * 100) / 100);
    }

    return averageScores;
  }

  private calculateQuestionAllocation(
    topicScores: Map<ExamTopic, number>,
    weakAreas: ExamTopic[],
    strongAreas: ExamTopic[],
    config: AdaptiveExamConfig
  ): QuestionAllocation[] {
    const allocations: QuestionAllocation[] = [];
    const allTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    // Calculate total questions for weak areas (60% allocation)
    const weakAreaQuestions = Math.floor(config.totalQuestions * (config.weakAreaAllocationPercentage / 100));
    const remainingQuestions = config.totalQuestions - weakAreaQuestions;

    // Allocate questions to weak areas
    if (weakAreas.length > 0) {
      const questionsPerWeakArea = Math.floor(weakAreaQuestions / weakAreas.length);
      let remainingWeakQuestions = weakAreaQuestions - (questionsPerWeakArea * weakAreas.length);

      weakAreas.forEach(topic => {
        const extraQuestion = remainingWeakQuestions > 0 ? 1 : 0;
        if (extraQuestion > 0) remainingWeakQuestions--;

        allocations.push({
          topic,
          questionCount: questionsPerWeakArea + extraQuestion,
          priority: 'high',
          averageScore: topicScores.get(topic) || 0
        });
      });
    }

    // Allocate remaining questions to other topics
    const otherTopics = allTopics.filter(topic => !weakAreas.includes(topic));
    if (otherTopics.length > 0) {
      const questionsPerOtherTopic = Math.floor(remainingQuestions / otherTopics.length);
      let remainingOtherQuestions = remainingQuestions - (questionsPerOtherTopic * otherTopics.length);

      otherTopics.forEach(topic => {
        const extraQuestion = remainingOtherQuestions > 0 ? 1 : 0;
        if (extraQuestion > 0) remainingOtherQuestions--;

        const priority = strongAreas.includes(topic) ? 'low' : 'medium';
        
        allocations.push({
          topic,
          questionCount: questionsPerOtherTopic + extraQuestion,
          priority,
          averageScore: topicScores.get(topic) || 0
        });
      });
    }

    return allocations.sort((a, b) => a.averageScore - b.averageScore);
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

      const topicQuestions = await this.questionRepository.findByTopic(topic, topicQuestionCount * 2);
      const randomQuestions = this.selectRandomQuestions(topicQuestions, topicQuestionCount);
      selectedQuestions.push(...randomQuestions);
    }

    return this.shuffleArray(selectedQuestions);
  }

  private async generateWeightedQuestionSet(
    allocations: QuestionAllocation[],
    totalQuestions: number
  ): Promise<Question[]> {
    const selectedQuestions: Question[] = [];

    for (const allocation of allocations) {
      if (allocation.questionCount > 0) {
        // Get more questions than needed to allow for random selection
        const candidateQuestions = await this.questionRepository.findByTopic(
          allocation.topic, 
          allocation.questionCount * 2
        );

        // For weak areas, prefer medium and hard questions
        let filteredQuestions = candidateQuestions;
        if (allocation.priority === 'high') {
          const challengingQuestions = candidateQuestions.filter(q => 
            q.difficulty === 'medium' || q.difficulty === 'hard'
          );
          if (challengingQuestions.length >= allocation.questionCount) {
            filteredQuestions = challengingQuestions;
          }
        }

        const randomQuestions = this.selectRandomQuestions(filteredQuestions, allocation.questionCount);
        selectedQuestions.push(...randomQuestions);
      }
    }

    return this.shuffleArray(selectedQuestions);
  }

  private getBalancedDistributionForNewUser(config: AdaptiveExamConfig): PerformanceAnalysisResult {
    const allTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    const questionsPerTopic = Math.floor(config.totalQuestions / allTopics.length);
    const remainingQuestions = config.totalQuestions - (questionsPerTopic * allTopics.length);

    const recommendedAllocation: QuestionAllocation[] = allTopics.map((topic, index) => ({
      topic,
      questionCount: questionsPerTopic + (index < remainingQuestions ? 1 : 0),
      priority: 'medium' as const,
      averageScore: 0
    }));

    return {
      weakAreas: [],
      strongAreas: [],
      topicScores: new Map(),
      hasExamHistory: false,
      recommendedAllocation
    };
  }

  private getTopicScoreFromExam(exam: ExamResult, topic: ExamTopic): number | null {
    const topicScore = exam.topicBreakdown.find(ts => ts.topic === topic);
    return topicScore ? topicScore.percentage : null;
  }

  private calculateTrendDirection(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable';

    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    
    if (Math.abs(difference) < 5) return 'stable'; // Less than 5% change is considered stable
    return difference > 0 ? 'improving' : 'declining';
  }

  private getTopicSpecificFocusAreas(topic: ExamTopic, currentScore: number): string[] {
    const focusAreas: string[] = [];

    switch (topic) {
      case 'Production Pipelines':
        if (currentScore < 70) {
          focusAreas.push('Delta Live Tables configuration and management');
          focusAreas.push('Job scheduling and orchestration');
          focusAreas.push('Error handling and monitoring');
        }
        break;
      case 'Incremental Data Processing':
        if (currentScore < 70) {
          focusAreas.push('Merge operations and UPSERT patterns');
          focusAreas.push('Change Data Capture (CDC) implementation');
          focusAreas.push('Streaming data processing');
        }
        break;
      case 'ELT with Spark SQL and Python':
        if (currentScore < 70) {
          focusAreas.push('Advanced SQL operations and optimization');
          focusAreas.push('PySpark DataFrame operations');
        }
        break;
      case 'Databricks Lakehouse Platform':
        if (currentScore < 70) {
          focusAreas.push('Platform architecture and components');
          focusAreas.push('Workspace and cluster management');
        }
        break;
      case 'Data Governance':
        if (currentScore < 70) {
          focusAreas.push('Unity Catalog and data governance');
          focusAreas.push('Security and access control');
        }
        break;
    }

    return focusAreas;
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
}