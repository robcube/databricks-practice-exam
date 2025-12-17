import React, { useState, useEffect } from 'react';
import './ExamFeedback.css';

interface FeedbackItem {
  questionId: string;
  questionText: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
  documentationLinks: string[];
  timeSpent: number;
  topic: string;
}

interface TimingAnalysis {
  totalTimeSpent: number;
  averageTimePerQuestion: number;
  fastestQuestion: {
    questionId: string;
    timeSpent: number;
  };
  slowestQuestion: {
    questionId: string;
    timeSpent: number;
  };
  timeByTopic: Array<{
    topic: string;
    totalTime: number;
    averageTime: number;
    questionCount: number;
  }>;
  pacingAnalysis: {
    isWellPaced: boolean;
    rushingQuestions: string[];
    slowQuestions: string[];
    recommendations: string[];
  };
}

interface TopicScore {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  averageTime: number;
}

interface PerformanceInsights {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface ComprehensiveFeedback {
  examResult: {
    id: string;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent: number;
    topicBreakdown: TopicScore[];
  };
  overallScore: number;
  topicBreakdown: TopicScore[];
  questionFeedback: FeedbackItem[];
  timingAnalysis: TimingAnalysis;
  performanceInsights: PerformanceInsights;
}

interface ImmediateFeedback {
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: string;
  topPerformingTopic: string;
  weakestTopic: string;
}

interface ExamFeedbackProps {
  examResult: any;
  onClose?: () => void;
  onStartNewExam?: () => void;
}

export const ExamFeedback: React.FC<ExamFeedbackProps> = ({
  examResult,
  onClose,
  onStartNewExam
}) => {
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState<ComprehensiveFeedback | null>(null);
  const [immediateFeedback, setImmediateFeedback] = useState<ImmediateFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'timing' | 'insights'>('overview');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch comprehensive feedback
        const comprehensiveResponse = await fetch('/api/scoring/comprehensive-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ examResult }),
        });

        if (!comprehensiveResponse.ok) {
          throw new Error('Failed to fetch comprehensive feedback');
        }

        const comprehensiveData = await comprehensiveResponse.json();
        setComprehensiveFeedback(comprehensiveData.data);

        // Fetch immediate feedback
        const immediateResponse = await fetch('/api/scoring/immediate-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ examResult }),
        });

        if (!immediateResponse.ok) {
          throw new Error('Failed to fetch immediate feedback');
        }

        const immediateData = await immediateResponse.json();
        setImmediateFeedback(immediateData.data);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch feedback');
      } finally {
        setLoading(false);
      }
    };

    if (examResult) {
      fetchFeedback();
    }
  }, [examResult]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 70) return 'score-good';
    if (percentage >= 60) return 'score-fair';
    return 'score-poor';
  };

  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
  };

  if (loading) {
    return (
      <div className="exam-feedback loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Generating your personalized feedback...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-feedback error">
        <div className="error-message">
          <h3>Error Loading Feedback</h3>
          <p>{error}</p>
          <button onClick={onClose} className="close-button">Close</button>
        </div>
      </div>
    );
  }

  if (!comprehensiveFeedback || !immediateFeedback) {
    return (
      <div className="exam-feedback error">
        <div className="error-message">
          <h3>No Feedback Available</h3>
          <p>Unable to generate feedback for this exam.</p>
          <button onClick={onClose} className="close-button">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-feedback">
      <div className="feedback-header">
        <h2>Exam Results & Feedback</h2>
        <div className="header-actions">
          {onStartNewExam && (
            <button onClick={onStartNewExam} className="new-exam-button">
              Start New Exam
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="close-button">
              Close
            </button>
          )}
        </div>
      </div>

      {/* Immediate Results Summary */}
      <div className="immediate-results">
        <div className="score-card">
          <div className={`overall-score ${getScoreColor(immediateFeedback.score)}`}>
            <span className="score-value">{immediateFeedback.score}%</span>
            <span className="score-label">Overall Score</span>
          </div>
          <div className="pass-status">
            <span className={`status ${immediateFeedback.passed ? 'passed' : 'failed'}`}>
              {immediateFeedback.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
            </span>
          </div>
        </div>

        <div className="quick-stats">
          <div className="stat">
            <span className="stat-value">{immediateFeedback.correctAnswers}/{immediateFeedback.totalQuestions}</span>
            <span className="stat-label">Correct Answers</span>
          </div>
          <div className="stat">
            <span className="stat-value">{immediateFeedback.timeSpent}</span>
            <span className="stat-label">Time Spent</span>
          </div>
          <div className="stat">
            <span className="stat-value">{immediateFeedback.topPerformingTopic}</span>
            <span className="stat-label">Strongest Topic</span>
          </div>
          <div className="stat">
            <span className="stat-value">{immediateFeedback.weakestTopic}</span>
            <span className="stat-label">Focus Area</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="feedback-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Question Review
        </button>
        <button
          className={`tab ${activeTab === 'timing' ? 'active' : ''}`}
          onClick={() => setActiveTab('timing')}
        >
          Timing Analysis
        </button>
        <button
          className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Insights & Recommendations
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="topic-breakdown">
              <h3>Performance by Topic</h3>
              <div className="topic-grid">
                {comprehensiveFeedback.topicBreakdown.map((topic, index) => (
                  <div key={index} className="topic-card">
                    <h4>{topic.topic}</h4>
                    <div className={`topic-score ${getScoreColor(topic.percentage)}`}>
                      {topic.percentage}%
                    </div>
                    <div className="topic-details">
                      <span>{topic.correctAnswers}/{topic.totalQuestions} correct</span>
                      <span>Avg: {formatTime(topic.averageTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="questions-tab">
            <h3>Question-by-Question Review</h3>
            <div className="questions-list">
              {comprehensiveFeedback.questionFeedback.map((question, index) => (
                <div key={question.questionId} className={`question-review ${question.isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header" onClick={() => toggleQuestionExpansion(question.questionId)}>
                    <div className="question-info">
                      <span className="question-number">Question {index + 1}</span>
                      <span className="question-topic">{question.topic}</span>
                      <span className={`question-result ${question.isCorrect ? 'correct' : 'incorrect'}`}>
                        {question.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    </div>
                    <div className="question-time">
                      {formatTime(question.timeSpent)}
                    </div>
                  </div>

                  {expandedQuestion === question.questionId && (
                    <div className="question-details">
                      <div className="question-text">
                        <p>{question.questionText}</p>
                      </div>
                      
                      <div className="answer-info">
                        <div className="selected-answer">
                          <strong>Your Answer:</strong> Option {question.selectedAnswer + 1}
                        </div>
                        <div className="correct-answer">
                          <strong>Correct Answer:</strong> Option {question.correctAnswer + 1}
                        </div>
                      </div>

                      <div className="explanation">
                        <h5>Explanation:</h5>
                        <p>{question.explanation}</p>
                      </div>

                      {question.documentationLinks.length > 0 && (
                        <div className="documentation-links">
                          <h5>Learn More:</h5>
                          <ul>
                            {question.documentationLinks.map((link, linkIndex) => (
                              <li key={linkIndex}>
                                <a href={link} target="_blank" rel="noopener noreferrer">
                                  {link}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timing' && (
          <div className="timing-tab">
            <h3>Timing Analysis</h3>
            
            <div className="timing-overview">
              <div className="timing-stats">
                <div className="timing-stat">
                  <span className="stat-value">{formatTime(comprehensiveFeedback.timingAnalysis.totalTimeSpent)}</span>
                  <span className="stat-label">Total Time</span>
                </div>
                <div className="timing-stat">
                  <span className="stat-value">{formatTime(comprehensiveFeedback.timingAnalysis.averageTimePerQuestion)}</span>
                  <span className="stat-label">Average per Question</span>
                </div>
                <div className="timing-stat">
                  <span className="stat-value">{formatTime(comprehensiveFeedback.timingAnalysis.fastestQuestion.timeSpent)}</span>
                  <span className="stat-label">Fastest Question</span>
                </div>
                <div className="timing-stat">
                  <span className="stat-value">{formatTime(comprehensiveFeedback.timingAnalysis.slowestQuestion.timeSpent)}</span>
                  <span className="stat-label">Slowest Question</span>
                </div>
              </div>
            </div>

            <div className="timing-by-topic">
              <h4>Time by Topic</h4>
              <div className="topic-timing-grid">
                {comprehensiveFeedback.timingAnalysis.timeByTopic.map((topic, index) => (
                  <div key={index} className="topic-timing-card">
                    <h5>{topic.topic}</h5>
                    <div className="timing-details">
                      <span>Total: {formatTime(topic.totalTime)}</span>
                      <span>Average: {formatTime(topic.averageTime)}</span>
                      <span>{topic.questionCount} questions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pacing-analysis">
              <h4>Pacing Analysis</h4>
              <div className={`pacing-status ${comprehensiveFeedback.timingAnalysis.pacingAnalysis.isWellPaced ? 'good' : 'needs-improvement'}`}>
                {comprehensiveFeedback.timingAnalysis.pacingAnalysis.isWellPaced ? 
                  '✓ Well-paced exam' : 
                  '⚠ Pacing needs improvement'
                }
              </div>
              
              {comprehensiveFeedback.timingAnalysis.pacingAnalysis.recommendations.length > 0 && (
                <div className="pacing-recommendations">
                  <h5>Recommendations:</h5>
                  <ul>
                    {comprehensiveFeedback.timingAnalysis.pacingAnalysis.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="insights-tab">
            <h3>Performance Insights & Recommendations</h3>
            
            {comprehensiveFeedback.performanceInsights.strengths.length > 0 && (
              <div className="insights-section strengths">
                <h4>🎯 Your Strengths</h4>
                <ul>
                  {comprehensiveFeedback.performanceInsights.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {comprehensiveFeedback.performanceInsights.weaknesses.length > 0 && (
              <div className="insights-section weaknesses">
                <h4>📈 Areas for Improvement</h4>
                <ul>
                  {comprehensiveFeedback.performanceInsights.weaknesses.map((weakness, index) => (
                    <li key={index}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}

            {comprehensiveFeedback.performanceInsights.recommendations.length > 0 && (
              <div className="insights-section recommendations">
                <h4>💡 Study Recommendations</h4>
                <ul>
                  {comprehensiveFeedback.performanceInsights.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};