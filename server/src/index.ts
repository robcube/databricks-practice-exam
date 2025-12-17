import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { MigrationRunner } from './utils/migrationRunner';
import questionRoutes from './routes/questions';
import examSessionRoutes from './routes/exam-sessions';
import scoringRoutes from './routes/scoring';
import feedbackRoutes from './routes/feedback';
import progressTrackingRoutes from './routes/progress-tracking';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'Databricks Practice Exam API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exam-sessions', examSessionRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/progress-tracking', progressTrackingRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('Failed to connect to database. Server will start without database functionality.');
    }

    // Run database migrations
    if (dbConnected) {
      const migrationRunner = new MigrationRunner();
      await migrationRunner.runAllMigrations();
      console.log('Database migrations completed');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;