import React, { useState, useEffect, useCallback } from 'react';
import { CodeHighlighter } from './CodeHighlighter';
import './ExamEngine.css';

interface Question {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  questionText: string;
  codeExample?: string;
  options: string[];
  tags: string[];
}

interface ExamSession {
  sessionId: string;
  examType: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  isCompleted: boolean;
  isPaused: boolean;
  isInReviewMode: boolean;
  currentQuestion: Question | null;
  responses: number;
}

interface ExamEngineProps {
  userId: string;
  examType: 'practice' | 'assessment';
  onExamComplete?: (result: any) => void;
}

export const ExamEngine: React.FC<ExamEngineProps> = ({ 
  userId, 
  examType, 
  onExamComplete 
}) => {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format time remaining as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Start a new exam session
  const startExam = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/exam-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          examType,
          questionCount: 10 // Smaller number for demo
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start exam session');
      }

      const data = await response.json();
      
      // Get the session details
      await fetchSessionState(data.sessionId, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start exam');
    } finally {
      setLoading(false);
    }
  }, [userId, examType]);

  // Fetch current session state
  const fetchSessionState = async (sessionId: string, clearSelection: boolean = false) => {
    try {
      const response = await fetch(`/api/exam-sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session state');
      }
      
      const sessionData = await response.json();
      setSession(sessionData);
      
      // Only clear selection when explicitly requested (e.g., after submitting an answer)
      if (clearSelection) {
        setSelectedAnswer(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session');
    }
  };

  // Submit an answer
  const submitAnswer = async () => {
    if (!session || selectedAnswer === null) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/exam-sessions/${session.sessionId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: session.currentQuestion?.id,
          selectedAnswer,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      // Refresh session state and clear selection for next question
      await fetchSessionState(session.sessionId, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  // Pause exam
  const pauseExam = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/exam-sessions/${session.sessionId}/pause`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to pause exam');
      }

      await fetchSessionState(session.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause exam');
    }
  };

  // Resume exam
  const resumeExam = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/exam-sessions/${session.sessionId}/resume`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to resume exam');
      }

      await fetchSessionState(session.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume exam');
    }
  };

  // Complete exam early
  const completeExamEarly = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/exam-sessions/${session.sessionId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to complete exam');
      }

      const result = await response.json();
      if (onExamComplete) {
        onExamComplete(result.examResult);
      }
      
      await fetchSessionState(session.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete exam');
    }
  };

  // Update timer every second
  useEffect(() => {
    if (!session || session.isPaused || session.isCompleted) return;

    const timer = setInterval(async () => {
      await fetchSessionState(session.sessionId);
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  // Auto-complete when time expires
  useEffect(() => {
    if (session && session.timeRemaining <= 0 && !session.isCompleted) {
      // Force complete the exam
      fetch(`/api/exam-sessions/${session.sessionId}/force-complete`, {
        method: 'POST',
      }).then(async (response) => {
        if (response.ok) {
          const result = await response.json();
          if (onExamComplete) {
            onExamComplete(result.examResult);
          }
          await fetchSessionState(session.sessionId);
        }
      });
    }
  }, [session, onExamComplete]);

  if (loading) {
    return <div className="exam-engine loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="exam-engine error">
        <p>Error: {error}</p>
        <button onClick={() => setError(null)}>Try Again</button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="exam-engine start">
        <h2>Databricks Practice Exam</h2>
        <p>Type: {examType}</p>
        <button onClick={startExam} className="start-button">
          Start Exam
        </button>
      </div>
    );
  }

  if (session.isCompleted) {
    return (
      <div className="exam-engine completed">
        <h2>Exam Completed!</h2>
        <p>You have completed the exam.</p>
        {session.isInReviewMode && (
          <p>You can review your answers with the remaining time: {formatTime(session.timeRemaining)}</p>
        )}
        <button onClick={() => setSession(null)} className="new-exam-button">
          Start New Exam
        </button>
      </div>
    );
  }

  const currentQuestion = session.currentQuestion;

  return (
    <div className="exam-engine active">
      <div className="exam-header">
        <div className="exam-info">
          <span>Question {session.currentQuestionIndex + 1} of {session.totalQuestions}</span>
          <span className="exam-type">{session.examType.toUpperCase()}</span>
        </div>
        <div className="timer">
          <span className={session.timeRemaining < 300 ? 'timer-warning' : ''}>
            {formatTime(session.timeRemaining)}
          </span>
        </div>
      </div>

      <div className="exam-controls">
        {session.isPaused ? (
          <button onClick={resumeExam} className="resume-button">
            Resume Exam
          </button>
        ) : (
          <button onClick={pauseExam} className="pause-button">
            Pause Exam
          </button>
        )}
        <button onClick={completeExamEarly} className="complete-button">
          Complete Early
        </button>
      </div>

      {session.isPaused ? (
        <div className="paused-message">
          <h3>Exam Paused</h3>
          <p>Click "Resume Exam" to continue. Timer continues running during pause.</p>
        </div>
      ) : currentQuestion ? (
        <div className="question-container">
          <div className="question-header">
            <span className="topic">{currentQuestion.topic}</span>
            <span className="difficulty">{currentQuestion.difficulty}</span>
          </div>

          <div className="question-text">
            <h3>{currentQuestion.questionText}</h3>
          </div>

          {currentQuestion.codeExample && (
            <div className="code-example">
              <CodeHighlighter
                code={currentQuestion.codeExample}
                language="python"
                showLineNumbers={true}
              />
            </div>
          )}

          <div className="options">
            {currentQuestion.options.map((option, index) => (
              <label key={index} className="option">
                <input
                  type="radio"
                  name="answer"
                  value={index}
                  checked={selectedAnswer === index}
                  onChange={() => setSelectedAnswer(index)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>

          <div className="question-actions">
            <button
              onClick={submitAnswer}
              disabled={selectedAnswer === null || loading}
              className="submit-button"
            >
              {session.currentQuestionIndex === session.totalQuestions - 1 ? 'Finish Exam' : 'Next Question'}
            </button>
          </div>
        </div>
      ) : (
        <div className="no-question">
          <p>No question available</p>
        </div>
      )}
    </div>
  );
};