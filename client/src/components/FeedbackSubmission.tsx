import React, { useState } from 'react';
import './FeedbackSubmission.css';

interface FeedbackSubmissionProps {
  questionId: string;
  userId: string;
  onSubmit?: (success: boolean) => void;
  onClose?: () => void;
}

type FeedbackType = 'incorrect' | 'unclear' | 'outdated' | 'suggestion';

export const FeedbackSubmission: React.FC<FeedbackSubmissionProps> = ({
  questionId,
  userId,
  onSubmit,
  onClose
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('unclear');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim().length < 10) {
      setError('Please provide at least 10 characters of feedback.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          userId,
          feedbackType,
          message: message.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit feedback');
      }

      // Success
      if (onSubmit) {
        onSubmit(true);
      }
      
      // Reset form
      setMessage('');
      setFeedbackType('unclear');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
      if (onSubmit) {
        onSubmit(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const feedbackTypeOptions = [
    { value: 'incorrect', label: 'Incorrect Answer', description: 'The provided answer or explanation is wrong' },
    { value: 'unclear', label: 'Unclear Question', description: 'The question is confusing or poorly worded' },
    { value: 'outdated', label: 'Outdated Information', description: 'The content references outdated features or practices' },
    { value: 'suggestion', label: 'Suggestion', description: 'General improvement suggestions' }
  ];

  return (
    <div className="feedback-submission">
      <div className="feedback-modal">
        <div className="modal-header">
          <h3>Submit Question Feedback</h3>
          {onClose && (
            <button onClick={onClose} className="close-button" aria-label="Close">
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label htmlFor="feedbackType">Feedback Type</label>
            <div className="feedback-type-options">
              {feedbackTypeOptions.map((option) => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="feedbackType"
                    value={option.value}
                    checked={feedbackType === option.value}
                    onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                  />
                  <div className="radio-content">
                    <span className="radio-label">{option.label}</span>
                    <span className="radio-description">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="message">
              Your Feedback
              <span className="required">*</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please provide detailed feedback about this question..."
              rows={5}
              maxLength={1000}
              required
            />
            <div className="character-count">
              {message.length}/1000 characters
              {message.length < 10 && (
                <span className="min-length-warning"> (minimum 10 characters)</span>
              )}
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            {onClose && (
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || message.trim().length < 10}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};