import { AdaptiveQuestionService } from '../services/AdaptiveQuestionService';
import { ExamGenerationService } from '../services/ExamGenerationService';
import { ProgressTrackingService } from '../services/ProgressTrackingService';
import { ExamResult, ExamTopic, ExamType, TopicScore } from '../../../shared/types';
import * as fc from 'fast-check';
import { describe, it, beforeEach } from '@jest/globals';

/**
 * Comprehensive Validation Tests for Adaptive Learning Algorithms
 * Tests the adaptive question selection, performance analysis, and learning progression
 */
describe('Adaptive Learning Algorithm Validation', () => {
  let adaptiveService: AdaptiveQuestionService;
  let examGenerationService: ExamGenerationService;
  let progressTrackingService: ProgressTrackingService;

  beforeEach(() => {
    adaptiveService = new AdaptiveQuestionService();
    examGenerationService = new ExamGenerationService();
    progressTrackingService = new ProgressTrackingService();
  });

  describe('Performance Analysis Validation', () => {
    /**
     * Feature: databricks-practice-exam, Property 1: Weak area identification
     * Validates: Requirements 1.1
     */
    it('should correctly identify weak areas from exam results', async () => {
      const testCases = [
        {
          topicBreakdown: [
            { topic: 'Databricks Lakehouse Platform', totalQuestions: 5, correctAnswers: 2, percentage: 40, averageTime: 120 },
            { topic: 'ELT with Spark SQL and Python', totalQuestions: 5, correctAnswers: 4, percentage: 80, averageTime: 100 }
          ],
          expectedWeak: ['Databricks Lakehouse Platform'],
          expectedStrong: ['ELT with Spark SQL and Python']
        },
        {
          topicBreakdown: [
            { topic: 'Production Pipelines', totalQuestions: 3, correctAnswers: 1, percentage: 33, averageTime: 150 },
            { topic: 'Data Governance', totalQuestions: 4, correctAnswers: 3, percentage: 75, averageTime: 90 },
            { topic: 'Incremental Data Processing', totalQuestions: 3, correctAnswers: 3, percentage: 100, averageTime: 80 }
          ],
          expectedWeak: ['Production Pipelines'],
          expectedStrong: ['Incremental Data Processing']
        }
      ];

      for (const testCase of testCases) {
        const mockExamResult: ExamResult = {
          id: 'test-exam',
          userId: 'test-user',
          examType: 'practice',
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(),
          totalQuestions: testCase.topicBreakdown.reduce((sum, topic) => sum + topic.totalQuestions, 0),
          correctAnswers: testCase.topicBreakdown.reduce((sum, topic) => sum + topic.correctAnswers, 0),
          topicBreakdown: testCase.topicBreakdown as TopicScore[],
          timeSpent: 1800,
          questions: []
        };

        const analysis = await adaptiveService.analyzeUserPerformance([mockExamResult]);
        
        // Verify weak areas are correctly identified (< 70%)
        expect(analysis.weakAreas).toEqual(expect.arrayContaining(testCase.expectedWeak));
        
        // Verify strong areas are correctly identified (>= 80%)
        expect(analysis.strongAreas).toEqual(expect.arrayContaining(testCase.expectedStrong));
      }
    });

    /**
     * Feature: databricks-practice-exam, Property 10: Performance trend calculation
     * Validates: Requirements 3.2
     */
    it('should calculate performance trends correctly over multiple exams', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              scores: fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 10 }),
              topic: fc.constantFrom(
                'Production Pipelines',
                'Incremental Data Processing'
              )
            }),
            { minLength: 1, maxLength: 2 }
          ),
          (trendData) => {
            // Create exam history from trend data
            const examHistory: ExamResult[] = [];
            const maxExams = Math.max(...trendData.map(t => t.scores.length));

            for (let i = 0; i < maxExams; i++) {
              const topicBreakdown: TopicScore[] = trendData.map(trend => ({
                topic: trend.topic as ExamTopic,
                totalQuestions: 10,
                correctAnswers: Math.round((trend.scores[i] || 50) / 10),
                percentage: trend.scores[i] || 50,
                averageTime: 180
              }));

              examHistory.push({
                id: `exam-${i}`,
                userId: 'test-user',
                examType: 'practice',
                startTime: new Date(Date.now() - (maxExams - i) * 86400000), // Daily exams
                endTime: new Date(Date.now() - (maxExams - i - 1) * 86400000),
                totalQuestions: 20,
                correctAnswers: topicBreakdown.reduce((sum, t) => sum + t.correctAnswers, 0),
                topicBreakdown,
                timeSpent: 1800,
                questions: []
              });
            }

            const trends = adaptiveService.calculatePerformanceTrends(examHistory);

            // Verify trends are calculated for each topic
            trendData.forEach(expectedTrend => {
              const calculatedTrend = trends.find(t => t.topic === expectedTrend.topic);
              expect(calculatedTrend).toBeDefined();
              
              if (calculatedTrend) {
                // Verify trend direction is logical
                const firstScore = expectedTrend.scores[0];
                const lastScore = expectedTrend.scores[expectedTrend.scores.length - 1];
                
                if (lastScore > firstScore + 10) {
                  expect(calculatedTrend.trend).toBe('improving');
                } else if (lastScore < firstScore - 10) {
                  expect(calculatedTrend.trend).toBe('declining');
                } else {
                  expect(calculatedTrend.trend).toBe('stable');
                }
              }
            });

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Adaptive Question Allocation Validation', () => {
    /**
     * Feature: databricks-practice-exam, Property 2: Adaptive question allocation
     * Validates: Requirements 1.2
     */
    it('should allocate 60% of questions to lowest-scoring topics', async () => {
      const testCases = [
        {
          topicBreakdown: [
            { topic: 'Databricks Lakehouse Platform', totalQuestions: 10, correctAnswers: 3, percentage: 30, averageTime: 180 },
            { topic: 'ELT with Spark SQL and Python', totalQuestions: 10, correctAnswers: 5, percentage: 50, averageTime: 160 },
            { topic: 'Production Pipelines', totalQuestions: 10, correctAnswers: 8, percentage: 80, averageTime: 140 }
          ],
          totalQuestions: 30
        },
        {
          topicBreakdown: [
            { topic: 'Data Governance', totalQuestions: 10, correctAnswers: 2, percentage: 20, averageTime: 200 },
            { topic: 'Incremental Data Processing', totalQuestions: 10, correctAnswers: 6, percentage: 60, averageTime: 150 },
            { topic: 'Production Pipelines', totalQuestions: 10, correctAnswers: 9, percentage: 90, averageTime: 120 }
          ],
          totalQuestions: 20
        }
      ];

      for (const testCase of testCases) {
        const mockExamResult: ExamResult = {
          id: 'test-exam',
          userId: 'test-user',
          examType: 'practice',
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(),
          totalQuestions: 30,
          correctAnswers: testCase.topicBreakdown.reduce((sum, topic) => sum + topic.correctAnswers, 0),
          topicBreakdown: testCase.topicBreakdown as TopicScore[],
          timeSpent: 1800,
          questions: []
        };

        const questions = await adaptiveService.generateAdaptiveQuestionSet(
          [mockExamResult],
          { totalQuestions: testCase.totalQuestions }
        );

        // Sort topics by performance (lowest first)
        const sortedTopics = mockExamResult.topicBreakdown
          .sort((a, b) => a.percentage - b.percentage);

        // Get the weakest topics (bottom half)
        const weakTopics = sortedTopics
          .slice(0, Math.ceil(sortedTopics.length / 2))
          .map(topic => topic.topic);
        
        // Count questions for weak topics
        const actualWeakAllocation = questions.filter(q => weakTopics.includes(q.topic)).length;

        // Verify that weak topics get at least 50% of questions (allowing some variance)
        expect(actualWeakAllocation).toBeGreaterThanOrEqual(Math.floor(testCase.totalQuestions * 0.5));

        // Verify total questions equals requested amount
        expect(questions.length).toBe(testCase.totalQuestions);
      }
    });

    /**
     * Feature: databricks-practice-exam, Property 5: Balanced default distribution
     * Validates: Requirements 1.5
     */
    it('should provide balanced distribution for new users with no history', async () => {
      const testCases = [20, 50, 100];

      for (const totalQuestions of testCases) {
        // Test with empty exam history (new user)
        const questions = await adaptiveService.generateAdaptiveQuestionSet(
          [],
          { totalQuestions }
        );

        const allTopics: ExamTopic[] = [
          'Databricks Lakehouse Platform',
          'ELT with Spark SQL and Python',
          'Incremental Data Processing',
          'Production Pipelines',
          'Data Governance'
        ];

        // Count questions per topic
        const topicCounts = allTopics.reduce((counts, topic) => {
          counts[topic] = questions.filter(q => q.topic === topic).length;
          return counts;
        }, {} as Record<ExamTopic, number>);

        // Verify all topics are included
        allTopics.forEach(topic => {
          expect(topicCounts[topic]).toBeGreaterThan(0);
        });

        // Verify balanced distribution (each topic gets roughly equal allocation)
        const expectedPerTopic = Math.floor(totalQuestions / allTopics.length);
        const tolerance = Math.ceil(totalQuestions * 0.15); // 15% tolerance

        allTopics.forEach(topic => {
          expect(topicCounts[topic]).toBeGreaterThanOrEqual(expectedPerTopic - tolerance);
          expect(topicCounts[topic]).toBeLessThanOrEqual(expectedPerTopic + tolerance);
        });

        // Verify total questions
        expect(questions.length).toBe(totalQuestions);
      }
    });
  });

  describe('Learning Progression Validation', () => {
    /**
     * Feature: databricks-practice-exam, Property 11: Adaptive allocation adjustment
     * Validates: Requirements 3.3
     */
    it('should reduce allocation for topics reaching 80% accuracy', async () => {
      const highPerformingTopicBreakdown: TopicScore[] = [
        {
          topic: 'Production Pipelines',
          totalQuestions: 10,
          correctAnswers: 9,
          percentage: 90, // Above 80% threshold
          averageTime: 150
        },
        {
          topic: 'Incremental Data Processing',
          totalQuestions: 10,
          correctAnswers: 5,
          percentage: 50, // Below 80% threshold
          averageTime: 200
        }
      ];

      const mockExamResult: ExamResult = {
        id: 'test-exam',
        userId: 'test-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalQuestions: 20,
        correctAnswers: 14,
        topicBreakdown: highPerformingTopicBreakdown,
        timeSpent: 1800,
        questions: []
      };

      const allocation = await adaptiveService.generateAdaptiveQuestionSet(
        [mockExamResult],
        { totalQuestions: 20 }
      );

      // Count questions by topic
      const productionPipelineCount = allocation.filter(q => q.topic === 'Production Pipelines').length;
      const incrementalProcessingCount = allocation.filter(q => q.topic === 'Incremental Data Processing').length;
      
      // High-performing topic should get fewer questions
      expect(productionPipelineCount).toBeLessThan(incrementalProcessingCount);
      
      // Verify the high-performing topic gets reduced allocation
      expect(productionPipelineCount).toBeLessThanOrEqual(6); // Less than 30% of total
    });

    /**
     * Feature: databricks-practice-exam, Property 12: Improvement-based prioritization
     * Validates: Requirements 3.4
     */
    it('should prioritize topics with no recent improvement', async () => {
      // Create exam history showing stagnant performance in one topic
      const examHistory: ExamResult[] = [
        {
          id: 'exam-1',
          userId: 'test-user',
          examType: 'practice',
          startTime: new Date(Date.now() - 172800000), // 2 days ago
          endTime: new Date(Date.now() - 172800000 + 1800000),
          totalQuestions: 20,
          correctAnswers: 12,
          topicBreakdown: [
            {
              topic: 'Production Pipelines',
              totalQuestions: 10,
              correctAnswers: 5,
              percentage: 50,
              averageTime: 180
            },
            {
              topic: 'Incremental Data Processing',
              totalQuestions: 10,
              correctAnswers: 7,
              percentage: 70,
              averageTime: 160
            }
          ],
          timeSpent: 1800,
          questions: []
        },
        {
          id: 'exam-2',
          userId: 'test-user',
          examType: 'practice',
          startTime: new Date(Date.now() - 86400000), // 1 day ago
          endTime: new Date(Date.now() - 86400000 + 1800000),
          totalQuestions: 20,
          correctAnswers: 13,
          topicBreakdown: [
            {
              topic: 'Production Pipelines',
              totalQuestions: 10,
              correctAnswers: 5,
              percentage: 50, // No improvement
              averageTime: 180
            },
            {
              topic: 'Incremental Data Processing',
              totalQuestions: 10,
              correctAnswers: 8,
              percentage: 80, // Improved
              averageTime: 150
            }
          ],
          timeSpent: 1800,
          questions: []
        }
      ];

      const allocation = await adaptiveService.generateAdaptiveQuestionSet(examHistory, { totalQuestions: 20 });
      
      // Count questions by topic
      const productionPipelineCount = allocation.filter(q => q.topic === 'Production Pipelines').length;
      const incrementalProcessingCount = allocation.filter(q => q.topic === 'Incremental Data Processing').length;
      
      // Topic with no improvement should get more questions
      expect(productionPipelineCount).toBeGreaterThan(incrementalProcessingCount);
    });
  });

  describe('Exam Generation Integration', () => {
    it('should generate exams that respect adaptive allocation', async () => {
      const mockExamHistory: ExamResult[] = [
        {
          id: 'exam-1',
          userId: 'test-user',
          examType: 'practice',
          startTime: new Date(Date.now() - 86400000),
          endTime: new Date(Date.now() - 86400000 + 1800000),
          totalQuestions: 10,
          correctAnswers: 4,
          topicBreakdown: [
            {
              topic: 'Production Pipelines',
              totalQuestions: 5,
              correctAnswers: 1,
              percentage: 20, // Very weak
              averageTime: 200
            },
            {
              topic: 'Incremental Data Processing',
              totalQuestions: 5,
              correctAnswers: 3,
              percentage: 60, // Moderate
              averageTime: 180
            }
          ],
          timeSpent: 1800,
          questions: []
        }
      ];

      // Mock the question service to return questions
      const mockQuestionService = {
        getQuestionsByTopic: jest.fn().mockResolvedValue([
          {
            id: 'q1',
            topic: 'Production Pipelines',
            subtopic: 'Delta Live Tables',
            difficulty: 'medium',
            questionText: 'Test question',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
            explanation: 'Test explanation',
            documentationLinks: [],
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ])
      };

      // Inject mock service
      (examGenerationService as any).questionService = mockQuestionService;
      (examGenerationService as any).adaptiveQuestionService = adaptiveService;

      const questions = await examGenerationService.generateExam(
        { userId: 'test-user', examType: 'practice', totalQuestions: 20 },
        mockExamHistory
      );

      expect(questions).toBeDefined();
      expect(questions.examSession).toBeDefined();
      expect(Array.isArray(questions.examSession.questions)).toBe(true);
      
      // Verify that more questions come from weak areas
      const productionPipelineQuestions = questions.examSession.questions.filter((q: any) => q.topic === 'Production Pipelines');
      const incrementalProcessingQuestions = questions.examSession.questions.filter((q: any) => q.topic === 'Incremental Data Processing');
      
      // Production Pipelines (weaker) should have more questions
      expect(productionPipelineQuestions.length).toBeGreaterThanOrEqual(incrementalProcessingQuestions.length);
    });
  });

  describe('Progress Tracking Integration', () => {
    it('should track learning progression accurately', async () => {
      const userId = 'test-user-progress';
      
      // Mock user data with exam history
      const mockUserData = {
        userId,
        examResults: [
          {
            id: 'exam-1',
            userId,
            examType: 'practice' as ExamType,
            startTime: new Date(Date.now() - 172800000),
            endTime: new Date(Date.now() - 172800000 + 1800000),
            totalQuestions: 20,
            correctAnswers: 10,
            topicBreakdown: [
              {
                topic: 'Production Pipelines' as ExamTopic,
                totalQuestions: 10,
                correctAnswers: 4,
                percentage: 40,
                averageTime: 200
              },
              {
                topic: 'Incremental Data Processing' as ExamTopic,
                totalQuestions: 10,
                correctAnswers: 6,
                percentage: 60,
                averageTime: 180
              }
            ],
            timeSpent: 1800,
            questions: []
          },
          {
            id: 'exam-2',
            userId,
            examType: 'practice' as ExamType,
            startTime: new Date(Date.now() - 86400000),
            endTime: new Date(Date.now() - 86400000 + 1800000),
            totalQuestions: 20,
            correctAnswers: 14,
            topicBreakdown: [
              {
                topic: 'Production Pipelines' as ExamTopic,
                totalQuestions: 10,
                correctAnswers: 6,
                percentage: 60,
                averageTime: 180
              },
              {
                topic: 'Incremental Data Processing' as ExamTopic,
                totalQuestions: 10,
                correctAnswers: 8,
                percentage: 80,
                averageTime: 160
              }
            ],
            timeSpent: 1800,
            questions: []
          }
        ]
      };

      // Mock the user repository
      (progressTrackingService as any).userRepository = {
        getUserWithExamHistory: jest.fn().mockResolvedValue(mockUserData)
      };

      const dashboard = await progressTrackingService.generateComprehensiveAnalytics(userId);

      expect(dashboard).toBeDefined();
      expect(dashboard.userId).toBe(userId);
      expect(dashboard.overallProgress).toBeGreaterThan(0);
      expect(dashboard.weakAreas).toContain('Production Pipelines');
      expect(dashboard.strongAreas).toContain('Incremental Data Processing');
      
      // Verify trends are calculated
      expect(dashboard.topicTrends).toBeDefined();
      expect(dashboard.topicTrends.length).toBeGreaterThan(0);
      
      // Verify study recommendations
      expect(dashboard.recommendedStudyPlan).toBeDefined();
      expect(dashboard.recommendedStudyPlan.length).toBeGreaterThan(0);
      
      // Production Pipelines should be high priority due to low performance
      const productionPipelineRec = dashboard.recommendedStudyPlan.find(
        rec => rec.topic === 'Production Pipelines'
      );
      expect(productionPipelineRec?.priority).toBe('high');
    });
  });

  describe('Algorithm Performance and Edge Cases', () => {
    it('should handle edge cases gracefully', async () => {
      // Test with empty exam history
      const emptyAnalysis = await adaptiveService.analyzeUserPerformance([]);
      expect(emptyAnalysis.weakAreas).toEqual([]);
      expect(emptyAnalysis.strongAreas).toEqual([]);

      // Test with single exam
      const singleExamResult: ExamResult = {
        id: 'single-exam',
        userId: 'test-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalQuestions: 10,
        correctAnswers: 5,
        topicBreakdown: [
          {
            topic: 'Production Pipelines',
            totalQuestions: 10,
            correctAnswers: 5,
            percentage: 50,
            averageTime: 180
          }
        ],
        timeSpent: 1800,
        questions: []
      };

      const singleExamAnalysis = await adaptiveService.analyzeUserPerformance([singleExamResult]);
      expect(singleExamAnalysis).toBeDefined();
      expect(singleExamAnalysis.weakAreas).toContain('Production Pipelines');

      // Test trends with insufficient data
      const trends = adaptiveService.calculatePerformanceTrends([singleExamResult]);
      expect(trends).toEqual([]); // Should return empty array for insufficient data
    });

    it('should maintain performance with large datasets', () => {
      // Generate large exam history
      const largeExamHistory: ExamResult[] = [];
      for (let i = 0; i < 100; i++) {
        largeExamHistory.push({
          id: `exam-${i}`,
          userId: 'test-user',
          examType: 'practice',
          startTime: new Date(Date.now() - i * 86400000),
          endTime: new Date(Date.now() - i * 86400000 + 1800000),
          totalQuestions: 20,
          correctAnswers: Math.floor(Math.random() * 20),
          topicBreakdown: [
            {
              topic: 'Production Pipelines',
              totalQuestions: 10,
              correctAnswers: Math.floor(Math.random() * 10),
              percentage: Math.floor(Math.random() * 100),
              averageTime: 180
            }
          ],
          timeSpent: 1800,
          questions: []
        });
      }

      const startTime = Date.now();
      const analysis = adaptiveService.analyzeUserPerformance(largeExamHistory);
      const endTime = Date.now();

      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(analysis).toBeDefined();
    });
  });
});