# Databricks Practice Exam System

A targeted Databricks Certified Data Engineer Associate practice exam system that generates personalized questions based on previous exam performance, focusing on weak areas to improve certification success rates.

## Project Structure

```
databricks-practice-exam/
├── client/                 # React frontend (TypeScript)
├── server/                 # Node.js backend (Express + TypeScript)
├── shared/                 # Shared TypeScript interfaces
└── .kiro/specs/           # Feature specifications and design documents
```

## Technology Stack

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Axios for API communication
- Jest + React Testing Library for unit tests
- fast-check for property-based testing

### Backend
- Node.js with Express and TypeScript
- PostgreSQL database with pg driver
- JWT authentication
- Jest for unit tests
- fast-check for property-based testing

### Database
- PostgreSQL for data persistence
- Connection pooling with pg
- Environment-based configuration

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install all dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your database credentials
   ```

4. Start the development servers:
   ```bash
   npm run dev
   ```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:3001

### Testing

Run all tests:
```bash
npm test
```

Run tests for specific components:
```bash
npm run test:server    # Backend tests only
npm run test:client    # Frontend tests only
```

### Building for Production

```bash
npm run server:build   # Build backend
npm run client:build   # Build frontend
```

## Features

- **Adaptive Learning**: Questions are selected based on user performance data
- **Realistic Content**: Production Pipelines and Incremental Data Processing scenarios
- **Progress Tracking**: Historical performance analysis and trend tracking
- **Timed Exams**: 90-minute practice exams with realistic conditions
- **Comprehensive Question Bank**: Organized by official exam topics
- **Detailed Feedback**: Explanations and documentation links for each question

## Development

The project uses a spec-driven development approach with detailed requirements, design documents, and implementation tasks located in `.kiro/specs/databricks-practice-exam/`.

### Documentation
- **[Development Process](DEVELOPMENT_PROCESS.md)** - How this project was built using AI assistance with Kiro CLI
- **[Future Roadmap](ROADMAP.md)** - Planned enhancements including containerization, cloud deployment, and enterprise features

### Core Data Models

- **User**: Authentication and profile management
- **Question**: Categorized exam questions with metadata
- **ExamResult**: Performance tracking with topic breakdown
- **TopicScore**: Detailed scoring by exam topic areas

### Testing Strategy

The project uses both unit tests and property-based tests:
- Unit tests verify specific functionality and edge cases
- Property-based tests verify universal properties across all inputs
- Tests are configured to skip database operations when PostgreSQL is unavailable

## License

MIT License