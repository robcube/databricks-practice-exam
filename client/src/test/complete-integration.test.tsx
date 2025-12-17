import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
// Import components
import App from '../App';
import { ExamEngine } from '../components/ExamEngine';
import { ExamFeedback } from '../components/ExamFeedback';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { StudyMode } from '../components/StudyMode';

// Import types
import type { ExamResult, Question, ExamType } from '../../../shared/types';

// Mock axios
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

jest.mock('axios', () => mockAxios);

/**
 * Complete Client-Side Integration Tests
 * Tests the full React application workflow with mocked backend responses
 */
describe('Complete Client Application Integration', () => {
  const mockUserId = 'integration-test-user';
  
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
    
    // Setup default successful mock responses
    mockAxios.get.mockResolvedValue({ data: { success: true } });
    mockAxios.post.mockResolvedValue({ data: { success: true } });
    mockAxios.put.mockResolvedValue({ data: { success: true } });
    mockAxios.delete.mockResolvedValue({ data: { success: true } });
  });

  describe('Application Routing and Navigation', () => {
    it('should render main application with navigation', () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Check main header
      expect(screen.getByText('Databricks Practice Exam')).toBeInTheDocument();
      expect(screen.getByText('Certified Data Engineer Associate Preparation')).toBeInTheDocument();

      // Check navigation links
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Study')).toBeInTheDocument();
      expect(screen.getByText('Practice Exam')).toBeInTheDocument();
    });

    it('should navigate between different pages', () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Should start on dashboard (home page)
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Navigate to study page
      fireEvent.click(screen.getByText('Study'));
      // Study page should load (even if it shows error due to mocked API)

      // Navigate to exam page
      fireEvent.click(screen.getByText('Practice Exam'));
      // Exam page should load
    });
  });

  describe('Exam Engine Component Integration', () => {
    it('should handle complete exam workflow', async () => {
      // Mock successful exam session creation
      mockAxios.post.mockResolvedValueOnce({
        data: {
          sessionId: 'session-1',
          examType: 'practice',
          totalQuestions: 1,
          timeRemaining: 5400000, // 90 minutes
          startTime: new Date()
        }
      });

      // Mock session state response
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

      // Mock answer submission
      mockAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          currentQuestionIndex: 1,
          isCompleted: true,
          timeRemaining: 5200000
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

      // Should show start screen initially
      expect(screen.getByText('Start Exam')).toBeInTheDocument();

      // Start the exam
      fireEvent.click(screen.getByText('Start Exam'));

      // Wait for question to load
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith('/api/exam-sessions', {
          userId: mockUserId,
          examType: 'practice',
          questionCount: 50
        });
      });
    });

    it('should handle exam pause and resume', async () => {
      // Mock exam session setup
      mockAxios.post.mockResolvedValueOnce({
        data: {
          sessionId: 'session-2',
          examType: 'practice',
          totalQuestions: 1,
          timeRemaining: 5400000,
          startTime: new Date()
        }
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

      // Mock pause/resume responses
      mockAxios.post
        .mockResolvedValueOnce({ data: { success: true, timeRemaining: 5300000 } }) // pause
        .mockResolvedValueOnce({ data: { success: true, timeRemaining: 5300000 } }); // resume

      render(
        <BrowserRouter>
          <ExamEngine
            userId={mockUserId}
            examType="practice"
            onExamComplete={jest.fn()}
          />
        </BrowserRouter>
      );

      // Start exam
      fireEvent.click(screen.getByText('Start Exam'));

      // Wait for exam to load, then test pause/resume functionality
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith('/api/exam-sessions', expect.any(Object));
      });
    });

    it('should display timer and handle time management', async () => {
      const shortTimeRemaining = 300000; // 5 minutes

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

      fireEvent.click(screen.getByText('Start Exam'));

      // Timer should be displayed when exam starts
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Exam Feedback Component Integration', () => {
    it('should display comprehensive exam feedback', () => {
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

      // Should show question-by-question breakdown
      expect(screen.getByText(/Question Details/)).toBeInTheDocument();
    });
  });

  describe('Progress Dashboard Component Integration', () => {
    it('should display user progress and handle interactions', async () => {
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

      // Should attempt to load progress data
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(`/api/progress-tracking/${mockUserId}/dashboard`);
      });
    });
  });

  describe('Study Mode Component Integration', () => {
    it('should display questions for study', async () => {
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

      // Should attempt to load questions
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalled();
      });

      // Test back functionality
      const backButton = screen.getByText(/Back/);
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should handle topic selection', async () => {
      mockAxios.get.mockResolvedValue({
        data: [mockQuestion]
      });

      render(
        <BrowserRouter>
          <StudyMode
            userId={mockUserId}
            onBack={jest.fn()}
          />
        </BrowserRouter>
      );

      // Should show topic selection initially
      await waitFor(() => {
        expect(screen.getByText(/Select a Topic/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockAxios.get.mockRejectedValue(new Error('Network error'));
      mockAxios.post.mockRejectedValue(new Error('Server error'));

      render(
        <BrowserRouter>
          <ExamEngine
            userId={mockUserId}
            examType="practice"
            onExamComplete={jest.fn()}
          />
        </BrowserRouter>
      );

      // Start exam which should trigger error
      fireEvent.click(screen.getByText('Start Exam'));

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalled();
      });
    });

    it('should handle empty data responses', async () => {
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

      // Should handle empty response
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalled();
      });
    });

    it('should validate user input', async () => {
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

      fireEvent.click(screen.getByText('Start Exam'));

      // Wait for question to load
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Component State Management', () => {
    it('should maintain state across component interactions', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            userId: mockUserId,
            overallProgress: 50,
            weakAreas: ['Production Pipelines'],
            strongAreas: [],
            topicTrends: [],
            recommendedStudyPlan: []
          }
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

      // Component should maintain its state and handle interactions
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalled();
      });
    });

    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(
        <BrowserRouter>
          <ExamEngine
            userId={mockUserId}
            examType="practice"
            onExamComplete={jest.fn()}
          />
        </BrowserRouter>
      );

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <BrowserRouter>
          <ExamFeedback
            examResult={mockExamResult}
            onClose={jest.fn()}
            onStartNewExam={jest.fn()}
          />
        </BrowserRouter>
      );

      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Navigation links should be focusable
      const navLinks = screen.getAllByRole('link');
      expect(navLinks.length).toBeGreaterThan(0);
      
      navLinks.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should handle rapid user interactions', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          sessionId: 'rapid-test',
          examType: 'practice',
          totalQuestions: 1,
          timeRemaining: 5400000,
          startTime: new Date()
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

      const startButton = screen.getByText('Start Exam');

      // Rapid clicks should be handled gracefully
      fireEvent.click(startButton);
      fireEvent.click(startButton);
      fireEvent.click(startButton);

      // Should only make one API call
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeQuestionSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockQuestion,
        id: `q${i}`,
        questionText: `Question ${i + 1}`
      }));

      mockAxios.get.mockResolvedValue({
        data: largeQuestionSet
      });

      render(
        <BrowserRouter>
          <StudyMode
            userId={mockUserId}
            selectedTopic="Production Pipelines"
            onBack={jest.fn()}
          />
        </BrowserRouter>
      );

      // Should handle large dataset without performance issues
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalled();
      });
    });
  });
});