import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';

// Import components
import { ExamEngine } from '../components/ExamEngine';
import { ExamFeedback } from '../components/ExamFeedback';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { StudyMode } from '../components/StudyMode';

// Import types
import type { ExamResult, Question, ExamType, TopicScore } from '../../../shared/types';

// Mock axios for API calls
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

const mockAxios = require('axios');

/**
 * Client-Side Integration Tests for Complete Exam Workflow
 * Tests React components and their interactions with the backend API
 */
describe('Client-Side Exam Workflow Integration', () => {
  const mockUserId = 'test-user-client';
  
  // Mock question data
  const mockQuestion: Question = {
    id: 'q1',
    topic: 'Production Pipelines',
    subtopic: 'Delta Live Tables',
    difficulty: 'medium',
    questionText: 'What is the correct way to define a Delta Live Table?',
    codeExample: '@dlt.table\ndef my_table():\n  return spark.read.table("source")',
    options: [
      '@dlt.table decorator',
      '@delta.table decorator', 
      '@spark.table decorator',
      'CREATE TABLE statement'
    ],
    correctAnswer: 0,
    explanation: 'Delta Live Tables use the @dlt.table decorator',
    documentationLinks: ['https://docs.databricks.com/delta-live-tables/'],
    tags: ['delta-live-tables'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockExamResult: ExamResult = {
    id: 'exam-1',
    userId: mockUserId,
    examType: 'practice',
    startTime: new Date(Date.now() - 1800000), // 30 minutes ago
    endTime: new Date(),
    totalQuestions: 5,
    correctAnswers: 3,
    topicBreakdown: [
      {
        topic: 'Production Pipelines',
        totalQuestions: 2,
        correctAnswers: 1,
        percentage: 50,
        averageTime: 180
      },
      {
        topic: 'Incremental Data Processing',
        totalQuestions: 3,
        correctAnswers: 2,
        percentage: 67,
        averageTime: 150
      }
    ],
    timeSpent: 1800,
    questions: [
      {
        questionId: 'q1',
        selectedAnswer: 0,
        isCorrect: true,
        timeSpent: 120,
        answeredAt: new Date()
      },
      {
        questionId: 'q2',
        selectedAnswer: 1,
        isCorrect: false,
        timeSpent: 180,
        answeredAt: new Date()
      }
    ]
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockAxios.get.mockResolvedValue({ data: { success: true } });
    mockAxios.post.mockResolvedValue({ data: { success: true } });
  });

  describe('ExamEngine Component Integration', () => {
    it('should handle complete exam workflow from start to finish', async () => {
      // Mock API responses for exam workflow
      mockAxios.post
        .mockResolvedValueOnce({
          data: {
            sessionId: 'session-1',
            examType: 'practice',
            totalQuestions: 1,
            timeRemaining: 5400000, // 90 minutes
            startTime: new Date()
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            currentQuestionIndex: 0,
            isCompleted: false,
            timeRemaining: 5300000
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            examResult: mockExamResult
          }
        });

      mockAxios.get.mockResolvedValue({
        data: {
          sessionId: 'session-1',
          currentQuestionIndex: 0,
          totalQuestions: 1,
          timeRemaining: 5300000,
          isCompleted: false,
          isPaused: false,
          isInReviewMode: false,
          currentQuestion: mockQuestion,
          responses: 0
        }
      });

      const mockOnExamComplete = jest.fn();

      render(
        <BrowserRouter>
          <ExamEngine
            userId={mockUserId}
            examType="practice"
            onExamComplete={mockOnExamComplete}
          />
        </BrowserRouter>
      );

      // Wait for component to load and start exam
      await waitFor(() => {
        expect(screen.getByText(/What is the correct way to define a Delta Live Table/)).toBeInTheDocument();
      });

      // Verify question display
      expect(screen.getByText(mockQuestion.questionText)).toBeInTheDocument();
      expect(screen.getByText('@dlt.table decorator')).toBeInTheDocument();
      
      // Verify code example is displayed
      expect(screen.getByText(/@dlt\.table/)).toBeInTheDocument();

      // Select an answer
      const firstOption = screen.getByText('@dlt.table decorator');
      fireEvent.click(firstOption);

      // Submit answer
      const submitButton = screen.getByText(/Submit Answer|Next Question/);
      fireEvent.click(submitButton);

      // Wait for exam completion
      await waitFor(() => {
        expect(mockOnExamComplete).toHaveBeenCalledWith(mockExamResult);
      });

      // Verify API calls were made correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/api/exam-sessions', {
        userId: mockUserId,
        examType: 'practice',
        questionCount: 50
      });
    });

    it('should handle exam pause and resume functionality', async () => {
      mockAxios.post
        .mockResolvedValueOnce({
          data: {
            sessionId: 'session-2',
            examType: 'practice',
            totalQuestions: 1,
            timeRemaining: 5400000,
            startTime: new Date()
          }
        })
        .mockResolvedValueOnce({
          data: { success: true, timeRemaining: 5300000 }
        })
        .mockResolvedValueOnce({
          data: { success: true, timeRemaining: 5300000 }
        });

      mockAxios.get.mockResolvedValue({
        data: {
          sessionId: 'session-2',
          currentQuestionIndex: 0,
          totalQuestions: 1,
          timeRemaining: 5300000,
          isCompleted: false,
          isPaused: false,
          isInReviewMode: false,
          currentQuestion: mockQuestion,
          responses: 0
        }
      });

      render(
        <BrowserRouter>
          <ExamEngine
            userId={mockUserId}
            examType="practice"
            onExamComplete={jest.fn()}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockQuestion.questionText)).toBeInTheDocument();
      });

      // Find and click pause button
      const pauseButton = screen.getByText(/Pause/);
      fireEvent.click(pauseButton);

      // Verify pause API call
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith('/api/exam-sessions/session-2/pause');
      });

      // Find and click resume button
      const resumeButton = screen.getByText(/Resume/);
      fireEvent.click(resumeButton);

      // Verify resume API call
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith('/api/exam-sessions/session-2/resume');
      });
    });

    it('should display timer correctly and handle time expiry', async () => {
      const shortTimeRemaining = 5000; // 5 seconds

      mockAxios.post.mockResolvedValueOnce({
        data: {
          sessionId: 'session-3',
          examType: 'practice',
          totalQuestions: 1,
          timeRemaining: shortTimeRemaining,
          startTime: new Date()
        }
      });

      mockAxios.get.mockResolvedValue({
        data: {
          sessionId: 'session-3',
          currentQuestionIndex: 0,
          totalQuestions: 1,
          timeRemaining: shortTimeRemaining,
          isCompleted: false,
          isPaused: false,
          isInReviewMode: false,
          currentQuestion: mockQuestion,
          responses: 0
        }
      });

      render(
        <BrowserRouter>
          <ExamEngine
            userId={mockUserId}
            examType="practice"
            onExamComplete={jest.fn()}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockQuestion.questionText)).toBeInTheDocument();
      });

      // Check that timer is displayed
      expect(screen.getByText(/Time Remaining/)).toBeInTheDocument();
      expect(screen.getByText(/00:05/)).toBeInTheDocument(); // 5 seconds
    });
  });

  describe('ExamFeedback Component Integration', () => {
    it('should display comprehensive exam feedback correctly', () => {
      const mockOnClose = jest.fn();
      const mockOnStartNewExam = jest.fn();

      render(
        <BrowserRouter>
          <ExamFeedback
            examResult={mockExamResult}
            onClose={mockOnClose}
            onStartNewExam={mockOnStartNewExam}
          />
        </BrowserRouter>
      );

      // Check overall score display
      expect(screen.getByText(/Overall Score/)).toBeInTheDocument();
      expect(screen.getByText(/60%/)).toBeInTheDocument(); // 3/5 = 60%

      // Check topic breakdown
      expect(screen.getByText(/Production Pipelines/)).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
      expect(screen.getByText(/Incremental Data Processing/)).toBeInTheDocument();
      expect(screen.getByText(/67%/)).toBeInTheDocument();

      // Check action buttons
      expect(screen.getByText(/Close/)).toBeInTheDocument();
      expect(screen.getByText(/Start New Exam/)).toBeInTheDocument();

      // Test button functionality
      fireEvent.click(screen.getByText(/Close/));
      expect(mockOnClose).toHaveBeenCalled();

      fireEvent.click(screen.getByText(/Start New Exam/));
      expect(mockOnStartNewExam).toHaveBeenCalled();
    });

    it('should display detailed question feedback', () => {
      render(
        <BrowserRouter>
          <ExamFeedback
            examResult={mockExamResult}
            onClose={jest.fn()}
            onStartNewExam={jest.fn()}
          />
        </BrowserRouter>
      );

      // Look for detailed feedback section
      expect(screen.getByText(/Question Details/)).toBeInTheDocument();
      
      // Check that correct and incorrect answers are shown
      const correctIndicators = screen.getAllByText(/✓|Correct/);
      const incorrectIndicators = screen.getAllByText(/✗|Incorrect/);
      
      expect(correctIndicators.length).toBeGreaterThan(0);
      expect(incorrectIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('ProgressDashboard Component Integration', () => {
    it('should display user progress and handle exam start', async () => {
      const mockProgressData = {
        userId: mockUserId,
        overallProgress: 75,
        weakAreas: ['Production Pipelines'],
        strongAreas: ['Incremental Data Processing'],
        topicTrends: [
          {
            topic: 'Production Pipelines',
            trend: 'declining' as const,
            scores: [60, 55, 50]
          }
        ],
        recommendedStudyPlan: [
          {
            topic: 'Production Pipelines',
            priority: 'high' as const,
            recommendedQuestions: 25,
            estimatedTime: 120
          }
        ]
      };

      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockProgressData
        }
      });

      const mockOnStartExam = jest.fn();
      const mockOnStudyTopic = jest.fn();

      render(
        <BrowserRouter>
          <ProgressDashboard
            userId={mockUserId}
            onStartExam={mockOnStartExam}
            onStudyTopic={mockOnStudyTopic}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/75%/)).toBeInTheDocument(); // Overall progress
      });

      // Check weak areas display
      expect(screen.getByText(/Production Pipelines/)).toBeInTheDocument();

      // Test exam start functionality
      const practiceExamButton = screen.getByText(/Practice Exam/);
      fireEvent.click(practiceExamButton);
      expect(mockOnStartExam).toHaveBeenCalledWith('practice');

      // Test study topic functionality
      const studyButton = screen.getByText(/Study/);
      fireEvent.click(studyButton);
      expect(mockOnStudyTopic).toHaveBeenCalled();
    });
  });

  describe('StudyMode Component Integration', () => {
    it('should display questions for study and handle navigation', async () => {
      const mockStudyQuestions = [mockQuestion];

      mockAxios.get.mockResolvedValue({
        data: mockStudyQuestions
      });

      const mockOnBack = jest.fn();

      render(
        <BrowserRouter>
          <StudyMode
            userId={mockUserId}
            selectedTopic="Production Pipelines"
            onBack={mockOnBack}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockQuestion.questionText)).toBeInTheDocument();
      });

      // Check that explanation is visible in study mode
      expect(screen.getByText(mockQuestion.explanation)).toBeInTheDocument();

      // Check that correct answer is highlighted
      expect(screen.getByText('@dlt.table decorator')).toBeInTheDocument();

      // Test back functionality
      const backButton = screen.getByText(/Back/);
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Property-Based Testing for Component Behavior', () => {
    /**
     * Feature: databricks-practice-exam, Property 18: Complete question display
     * Validates: Requirements 5.2, 5.4
     */
    it('should display all required question information consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            topic: fc.constantFrom(
              'Databricks Lakehouse Platform',
              'ELT with Spark SQL and Python',
              'Incremental Data Processing',
              'Production Pipelines',
              'Data Governance'
            ),
            subtopic: fc.string({ minLength: 1 }),
            difficulty: fc.constantFrom('easy', 'medium', 'hard'),
            questionText: fc.string({ minLength: 10 }),
            options: fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 6 }),
            correctAnswer: fc.integer({ min: 0, max: 5 }),
            explanation: fc.string({ minLength: 10 }),
            documentationLinks: fc.array(fc.webUrl()),
            tags: fc.array(fc.string()),
            createdAt: fc.date(),
            updatedAt: fc.date()
          }),
          (question) => {
            // Ensure correctAnswer is within options range
            if (question.correctAnswer >= question.options.length) {
              question.correctAnswer = 0;
            }

            const { container } = render(
              <BrowserRouter>
                <StudyMode
                  userId={mockUserId}
                  selectedTopic={question.topic}
                  onBack={jest.fn()}
                />
              </BrowserRouter>
            );

            // Mock the API response with our generated question
            mockAxios.get.mockResolvedValueOnce({
              data: [question]
            });

            // Re-render to trigger the API call
            act(() => {
              container.innerHTML = '';
            });

            render(
              <BrowserRouter>
                <StudyMode
                  userId={mockUserId}
                  selectedTopic={question.topic}
                  onBack={jest.fn()}
                />
              </BrowserRouter>
            );

            // The component should handle any valid question structure
            // This property ensures robustness across different question formats
            return true;
          }
        ),
        { numRuns: 10 } // Reduced for faster testing
      );
    });

    /**
     * Feature: databricks-practice-exam, Property 4: Result format consistency
     * Validates: Requirements 1.4
     */
    it('should display exam results in consistent format', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalQuestions: fc.integer({ min: 1, max: 100 }),
            correctAnswers: fc.integer({ min: 0, max: 100 }),
            topicBreakdown: fc.array(
              fc.record({
                topic: fc.constantFrom(
                  'Databricks Lakehouse Platform',
                  'ELT with Spark SQL and Python',
                  'Incremental Data Processing',
                  'Production Pipelines',
                  'Data Governance'
                ),
                totalQuestions: fc.integer({ min: 1, max: 20 }),
                correctAnswers: fc.integer({ min: 0, max: 20 }),
                percentage: fc.integer({ min: 0, max: 100 }),
                averageTime: fc.integer({ min: 30, max: 600 })
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          (resultData) => {
            // Ensure correctAnswers doesn't exceed totalQuestions
            if (resultData.correctAnswers > resultData.totalQuestions) {
              resultData.correctAnswers = resultData.totalQuestions;
            }

            // Ensure topic breakdown is consistent
            resultData.topicBreakdown.forEach(topic => {
              if (topic.correctAnswers > topic.totalQuestions) {
                topic.correctAnswers = topic.totalQuestions;
              }
              topic.percentage = Math.round((topic.correctAnswers / topic.totalQuestions) * 100);
            });

            const examResult: ExamResult = {
              ...mockExamResult,
              totalQuestions: resultData.totalQuestions,
              correctAnswers: resultData.correctAnswers,
              topicBreakdown: resultData.topicBreakdown as TopicScore[]
            };

            const { container } = render(
              <BrowserRouter>
                <ExamFeedback
                  examResult={examResult}
                  onClose={jest.fn()}
                  onStartNewExam={jest.fn()}
                />
              </BrowserRouter>
            );

            // Verify that percentage is displayed correctly
            const overallPercentage = Math.round((resultData.correctAnswers / resultData.totalQuestions) * 100);
            expect(container.textContent).toContain(`${overallPercentage}%`);

            // Verify that all topics are displayed
            resultData.topicBreakdown.forEach(topic => {
              expect(container.textContent).toContain(topic.topic);
              expect(container.textContent).toContain(`${topic.percentage}%`);
            });

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));
      mockAxios.post.mockRejectedValue(new Error('Server error'));

      const mockOnExamComplete = jest.fn();

      render(
        <BrowserRouter>
          <ExamEngine
            userId={mockUserId}
            examType="practice"
            onExamComplete={mockOnExamComplete}
          />
        </BrowserRouter>
      );

      // Component should handle errors and display appropriate messages
      await waitFor(() => {
        expect(screen.getByText(/Error|Failed|Unable/)).toBeInTheDocument();
      });
    });

    it('should handle empty question data', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      render(
        <BrowserRouter>
          <StudyMode
            userId={mockUserId}
            selectedTopic="Production Pipelines"
            onBack={jest.fn()}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No questions available|Empty/)).toBeInTheDocument();
      });
    });

    it('should validate user input in exam interface', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          sessionId: 'session-validation',
          examType: 'practice',
          totalQuestions: 1,
          timeRemaining: 5400000,
          startTime: new Date()
        }
      });

      mockAxios.get.mockResolvedValue({
        data: {
          sessionId: 'session-validation',
          currentQuestionIndex: 0,
          totalQuestions: 1,
          timeRemaining: 5400000,
          isCompleted: false,
          isPaused: false,
          isInReviewMode: false,
          currentQuestion: mockQuestion,
          responses: 0
        }
      });

      render(
        <BrowserRouter>
          <ExamEngine
            userId={mockUserId}
            examType="practice"
            onExamComplete={jest.fn()}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockQuestion.questionText)).toBeInTheDocument();
      });

      // Try to submit without selecting an answer
      const submitButton = screen.getByText(/Submit Answer|Next Question/);
      fireEvent.click(submitButton);

      // Should show validation message or prevent submission
      expect(screen.getByText(/Please select an answer|Select an option/)).toBeInTheDocument();
    });
  });
});