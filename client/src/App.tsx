import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';
import { ExamEngine } from './components/ExamEngine';
import { ExamFeedback } from './components/ExamFeedback';
import { ProgressDashboard } from './components/ProgressDashboard';
import { StudyMode } from './components/StudyMode';

// Import shared types
import type { ExamResult, ExamType } from '../../shared/types';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <div className="header-title">
              <h1>Databricks Practice Exam</h1>
              <p>Certified Data Engineer Associate Preparation</p>
            </div>
            <nav className="header-nav">
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/study" className="nav-link">Study</Link>
              <Link to="/exam" className="nav-link">Practice Exam</Link>
            </nav>
          </div>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/study/:topic" element={<StudyTopicPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const userId = "demo-user-123"; // In a real app, this would come from authentication

  const handleStartExam = (examType: ExamType) => {
    navigate(`/exam?type=${examType}`);
  };

  const handleStudyTopic = (topic: string) => {
    navigate(`/study/${encodeURIComponent(topic)}`);
  };

  return (
    <div className="home-page">
      <ProgressDashboard
        userId={userId}
        onStartExam={handleStartExam}
        onStudyTopic={handleStudyTopic}
      />
    </div>
  );
};

const ExamPage: React.FC = () => {
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const navigate = useNavigate();
  
  // Get exam type from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const examType = (urlParams.get('type') as ExamType) || 'practice';

  const handleExamComplete = (result: ExamResult) => {
    setExamResult(result);
    setShowFeedback(true);
  };

  const handleCloseFeedback = () => {
    setShowFeedback(false);
    navigate('/');
  };

  const handleStartNewExam = () => {
    setExamResult(null);
    setShowFeedback(false);
    // Refresh the page to start a new exam
    window.location.reload();
  };

  if (showFeedback && examResult) {
    return (
      <ExamFeedback
        examResult={examResult}
        onClose={handleCloseFeedback}
        onStartNewExam={handleStartNewExam}
      />
    );
  }

  return (
    <div className="exam-page">
      <ExamEngine 
        userId="demo-user-123" 
        examType={examType}
        onExamComplete={handleExamComplete}
      />
    </div>
  );
};

const StudyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="study-page">
      <StudyMode
        userId="demo-user-123"
        onBack={handleBack}
      />
    </div>
  );
};

const StudyTopicPage: React.FC = () => {
  const navigate = useNavigate();
  const topic = decodeURIComponent(window.location.pathname.split('/').pop() || '');

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="study-topic-page">
      <StudyMode
        userId="demo-user-123"
        selectedTopic={topic}
        onBack={handleBack}
      />
    </div>
  );
};

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="results-page">
      <div className="results-content">
        <h2>Exam Results</h2>
        <p>This page would show historical exam results and detailed analytics.</p>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default App;