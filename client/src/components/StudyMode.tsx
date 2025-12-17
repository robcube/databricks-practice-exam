import React, { useState, useEffect } from 'react';
import { CodeHighlighter } from './CodeHighlighter';
import { FeedbackSubmission } from './FeedbackSubmission';
import './StudyMode.css';

interface Question {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  codeExample?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  documentationLinks: string[];
  tags: string[];
}

interface StudyModeProps {
  userId: string;
  selectedTopic?: string;
  onBack?: () => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({
  userId,
  selectedTopic,
  onBack
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [topicFilter, setTopicFilter] = useState<string>(selectedTopic || 'all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const topics = [
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ];

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/questions/study-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: selectedTopic || null,
            includeAnswers: true
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }

        const data = await response.json();
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedTopic]);

  useEffect(() => {
    let filtered = questions;

    // Filter by topic
    if (topicFilter !== 'all') {
      filtered = filtered.filter(q => q.topic === topicFilter);
    }

    // Filter by difficulty
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.questionText.toLowerCase().includes(query) ||
        q.subtopic.toLowerCase().includes(query) ||
        q.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredQuestions(filtered);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
  }, [questions, topicFilter, difficultyFilter, searchQuery]);

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    }
  };

  const handleQuestionJump = (index: number) => {
    setCurrentQuestionIndex(index);
    setSelectedAnswer(null);
    setShowAnswer(false);
  };

  const handleFeedbackSubmit = (success: boolean) => {
    if (success) {
      setShowFeedbackModal(false);
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'difficulty-easy';
      case 'medium': return 'difficulty-medium';
      case 'hard': return 'difficulty-hard';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="study-mode loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading study materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="study-mode error">
        <div className="error-message">
          <h3>Error Loading Questions</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (filteredQuestions.length === 0) {
    return (
      <div className="study-mode empty">
        <div className="empty-state">
          <h3>No Questions Found</h3>
          <p>Try adjusting your filters or search criteria.</p>
          {onBack && (
            <button onClick={onBack} className="back-button">
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="study-mode">
      <div className="study-header">
        <div className="header-left">
          {onBack && (
            <button onClick={onBack} className="back-button">
              ← Back
            </button>
          )}
          <h2>Study Mode</h2>
        </div>
        <div className="question-counter">
          Question {currentQuestionIndex + 1} of {filteredQuestions.length}
        </div>
      </div>

      <div className="study-content">
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <label htmlFor="topic-filter">Topic:</label>
              <select
                id="topic-filter"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
              >
                <option value="all">All Topics</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="difficulty-filter">Difficulty:</label>
              <select
                id="difficulty-filter"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="filter-group search-group">
              <label htmlFor="search-input">Search:</label>
              <input
                id="search-input"
                type="text"
                placeholder="Search questions, topics, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="question-section">
          <div className="question-header">
            <div className="question-meta">
              <span className="topic-badge">{currentQuestion.topic}</span>
              <span className={`difficulty-badge ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty}
              </span>
              <span className="subtopic">{currentQuestion.subtopic}</span>
            </div>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="feedback-button"
              title="Report an issue with this question"
            >
              📝 Feedback
            </button>
          </div>

          <div className="question-content">
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

            <div className="options-section">
              <h4>Answer Options:</h4>
              <div className="options">
                {currentQuestion.options.map((option, index) => (
                  <label 
                    key={index} 
                    className={`option ${
                      showAnswer 
                        ? index === currentQuestion.correctAnswer 
                          ? 'correct' 
                          : selectedAnswer === index 
                            ? 'incorrect' 
                            : ''
                        : selectedAnswer === index 
                          ? 'selected' 
                          : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={index}
                      checked={selectedAnswer === index}
                      onChange={() => handleAnswerSelect(index)}
                      disabled={showAnswer}
                    />
                    <span className="option-text">{option}</span>
                    {showAnswer && index === currentQuestion.correctAnswer && (
                      <span className="correct-indicator">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {!showAnswer && (
              <div className="answer-actions">
                <button
                  onClick={handleShowAnswer}
                  disabled={selectedAnswer === null}
                  className="show-answer-button"
                >
                  Show Answer & Explanation
                </button>
              </div>
            )}

            {showAnswer && (
              <div className="answer-explanation">
                <div className="explanation-section">
                  <h4>Explanation:</h4>
                  <p>{currentQuestion.explanation}</p>
                </div>

                {currentQuestion.documentationLinks.length > 0 && (
                  <div className="documentation-section">
                    <h4>Learn More:</h4>
                    <ul className="documentation-links">
                      {currentQuestion.documentationLinks.map((link, index) => (
                        <li key={index}>
                          <a href={link} target="_blank" rel="noopener noreferrer">
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentQuestion.tags.length > 0 && (
                  <div className="tags-section">
                    <h4>Tags:</h4>
                    <div className="tags">
                      {currentQuestion.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="navigation-section">
          <div className="navigation-controls">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="nav-button prev"
            >
              ← Previous
            </button>
            
            <div className="question-jumper">
              <select
                value={currentQuestionIndex}
                onChange={(e) => handleQuestionJump(parseInt(e.target.value))}
                className="question-select"
              >
                {filteredQuestions.map((_, index) => (
                  <option key={index} value={index}>
                    Question {index + 1}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === filteredQuestions.length - 1}
              className="nav-button next"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {showFeedbackModal && (
        <FeedbackSubmission
          questionId={currentQuestion.id}
          userId={userId}
          onSubmit={handleFeedbackSubmit}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
};