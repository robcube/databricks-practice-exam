import React, { useState, useEffect } from 'react';
import './ProgressDashboard.css';

interface TopicProgress {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  averageTime: number;
  trend: 'improving' | 'declining' | 'stable';
  lastAttempt: Date;
}

interface OverallProgress {
  totalExams: number;
  averageScore: number;
  totalTimeSpent: number;
  strongestTopic: string;
  weakestTopic: string;
  improvementRate: number;
}

interface StudyRecommendation {
  topic: string;
  priority: 'high' | 'medium' | 'low';
  recommendedQuestions: number;
  focusAreas: string[];
  estimatedStudyTime: number;
}

interface ProgressDashboardProps {
  userId: string;
  onStartExam?: (examType: 'practice' | 'assessment') => void;
  onStudyTopic?: (topic: string) => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  userId,
  onStartExam,
  onStudyTopic
}) => {
  const [overallProgress, setOverallProgress] = useState<OverallProgress | null>(null);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'topics' | 'recommendations'>('overview');

  useEffect(() => {
    const fetchProgressData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch overall progress
        const overallResponse = await fetch(`/api/progress-tracking/overall/${userId}`);
        if (!overallResponse.ok) {
          throw new Error('Failed to fetch overall progress');
        }
        const overallData = await overallResponse.json();
        setOverallProgress(overallData.data);

        // Fetch topic progress
        const topicResponse = await fetch(`/api/progress-tracking/topics/${userId}`);
        if (!topicResponse.ok) {
          throw new Error('Failed to fetch topic progress');
        }
        const topicData = await topicResponse.json();
        setTopicProgress(topicData.data);

        // Fetch recommendations
        const recommendationsResponse = await fetch(`/api/progress-tracking/recommendations/${userId}`);
        if (!recommendationsResponse.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        const recommendationsData = await recommendationsResponse.json();
        setRecommendations(recommendationsData.data);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch progress data');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProgressData();
    }
  }, [userId]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 70) return 'score-good';
    if (percentage >= 60) return 'score-fair';
    return 'score-poor';
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      default: return 'priority-low';
    }
  };

  if (loading) {
    return (
      <div className="progress-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-dashboard error">
        <div className="error-message">
          <h3>Error Loading Progress</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!overallProgress) {
    return (
      <div className="progress-dashboard empty">
        <div className="empty-state">
          <h3>Start Your Learning Journey</h3>
          <p>Take your first practice exam to begin tracking your progress.</p>
          {onStartExam && (
            <div className="start-actions">
              <button 
                onClick={() => onStartExam('practice')} 
                className="start-button practice"
              >
                Start Practice Exam
              </button>
              <button 
                onClick={() => onStartExam('assessment')} 
                className="start-button assessment"
              >
                Take Full Assessment
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="progress-dashboard">
      <div className="dashboard-header">
        <h2>Your Progress Dashboard</h2>
        <div className="header-actions">
          {onStartExam && (
            <>
              <button 
                onClick={() => onStartExam('practice')} 
                className="action-button practice"
              >
                New Practice Exam
              </button>
              <button 
                onClick={() => onStartExam('assessment')} 
                className="action-button assessment"
              >
                Full Assessment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overall Progress Summary */}
      <div className="progress-summary">
        <div className="summary-card">
          <div className="summary-stat">
            <span className="stat-value">{overallProgress.totalExams}</span>
            <span className="stat-label">Exams Taken</span>
          </div>
          <div className={`summary-stat ${getScoreColor(overallProgress.averageScore)}`}>
            <span className="stat-value">{overallProgress.averageScore}%</span>
            <span className="stat-label">Average Score</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{formatTime(overallProgress.totalTimeSpent)}</span>
            <span className="stat-label">Study Time</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{overallProgress.improvementRate > 0 ? '+' : ''}{overallProgress.improvementRate}%</span>
            <span className="stat-label">Improvement</span>
          </div>
        </div>

        <div className="strengths-weaknesses">
          <div className="strength">
            <span className="label">Strongest Topic:</span>
            <span className="value">{overallProgress.strongestTopic}</span>
          </div>
          <div className="weakness">
            <span className="label">Focus Area:</span>
            <span className="value">{overallProgress.weakestTopic}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeView === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveView('topics')}
        >
          Topic Progress
        </button>
        <button
          className={`tab ${activeView === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveView('recommendations')}
        >
          Study Plan
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeView === 'overview' && (
          <div className="overview-content">
            <div className="topic-overview-grid">
              {topicProgress.slice(0, 5).map((topic, index) => (
                <div key={index} className="topic-overview-card">
                  <div className="topic-header">
                    <h4>{topic.topic}</h4>
                    <span className="trend-indicator">
                      {getTrendIcon(topic.trend)}
                    </span>
                  </div>
                  <div className={`topic-score ${getScoreColor(topic.percentage)}`}>
                    {topic.percentage}%
                  </div>
                  <div className="topic-stats">
                    <span>{topic.correctAnswers}/{topic.totalQuestions} correct</span>
                    <span>Avg: {formatTime(topic.averageTime)}</span>
                  </div>
                  {onStudyTopic && (
                    <button 
                      onClick={() => onStudyTopic(topic.topic)}
                      className="study-button"
                    >
                      Study
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'topics' && (
          <div className="topics-content">
            <div className="topics-list">
              {topicProgress.map((topic, index) => (
                <div key={index} className="topic-detail-card">
                  <div className="topic-info">
                    <div className="topic-name">
                      <h4>{topic.topic}</h4>
                      <span className="trend-badge">
                        {getTrendIcon(topic.trend)} {topic.trend}
                      </span>
                    </div>
                    <div className="topic-metrics">
                      <div className={`score-display ${getScoreColor(topic.percentage)}`}>
                        {topic.percentage}%
                      </div>
                      <div className="metric-details">
                        <span>Questions: {topic.correctAnswers}/{topic.totalQuestions}</span>
                        <span>Avg Time: {formatTime(topic.averageTime)}</span>
                        <span>Last Attempt: {new Date(topic.lastAttempt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="topic-actions">
                    {onStudyTopic && (
                      <button 
                        onClick={() => onStudyTopic(topic.topic)}
                        className="study-topic-button"
                      >
                        Study This Topic
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'recommendations' && (
          <div className="recommendations-content">
            <div className="recommendations-header">
              <h3>Personalized Study Plan</h3>
              <p>Based on your performance, here's what we recommend focusing on:</p>
            </div>
            
            <div className="recommendations-list">
              {recommendations.map((rec, index) => (
                <div key={index} className={`recommendation-card ${getPriorityColor(rec.priority)}`}>
                  <div className="recommendation-header">
                    <h4>{rec.topic}</h4>
                    <div className="priority-badge">
                      {rec.priority.toUpperCase()} PRIORITY
                    </div>
                  </div>
                  
                  <div className="recommendation-details">
                    <div className="recommendation-stats">
                      <span>📚 {rec.recommendedQuestions} questions</span>
                      <span>⏱️ ~{formatTime(rec.estimatedStudyTime)} study time</span>
                    </div>
                    
                    <div className="focus-areas">
                      <h5>Focus Areas:</h5>
                      <ul>
                        {rec.focusAreas.map((area, areaIndex) => (
                          <li key={areaIndex}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="recommendation-actions">
                    {onStudyTopic && (
                      <button 
                        onClick={() => onStudyTopic(rec.topic)}
                        className="start-study-button"
                      >
                        Start Studying
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};