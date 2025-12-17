import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders main header in h1 tag', () => {
    render(<App />);
    const headerElement = screen.getByRole('heading', { level: 1, name: /Databricks Practice Exam/i });
    expect(headerElement).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(<App />);
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const studyLink = screen.getByRole('link', { name: /Study/i });
    const examLink = screen.getByRole('link', { name: /Practice Exam/i });
    
    expect(dashboardLink).toBeInTheDocument();
    expect(studyLink).toBeInTheDocument();
    expect(examLink).toBeInTheDocument();
  });

  test('renders certification preparation subtitle', () => {
    render(<App />);
    const subtitleElement = screen.getByText(/Certified Data Engineer Associate Preparation/i);
    expect(subtitleElement).toBeInTheDocument();
  });
});