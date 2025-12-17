import { User as UserModel, validateUser } from './User';
import { StudyGoal, ExamResult, User } from '../../../shared/types';

describe('UserModel', () => {
  const validUserData: Partial<User> = {
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date('2023-01-01'),
    lastLoginAt: new Date('2023-01-02')
  };

  describe('constructor', () => {
    it('should create a valid user with required fields', () => {
      const user = new UserModel(validUserData);
      
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.id).toBeDefined();
      expect(user.studyGoals).toEqual([]);
      expect(user.examHistory).toEqual([]);
    });

    it('should generate an ID if not provided', () => {
      const user = new UserModel(validUserData);
      expect(user.id).toMatch(/^user_\d+_[a-z0-9]+$/);
    });

    it('should validate invalid email', () => {
      const user = new UserModel({ ...validUserData, email: 'invalid-email' });
      const validation = user.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid email is required');
    });

    it('should validate short name', () => {
      const user = new UserModel({ ...validUserData, name: 'A' });
      const validation = user.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Name must be at least 2 characters long');
    });

    it('should validate future creation date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const user = new UserModel({ ...validUserData, createdAt: futureDate });
      const validation = user.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Creation date cannot be in the future');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time', () => {
      const user = new UserModel(validUserData);
      const originalTime = user.lastLoginAt;
      
      // Wait a bit to ensure time difference
      setTimeout(() => {
        user.updateLastLogin();
        expect(user.lastLoginAt.getTime()).toBeGreaterThan(originalTime.getTime());
      }, 10);
    });
  });

  describe('getWeakAreas', () => {
    it('should return empty array for user with no exam history', () => {
      const user = new UserModel(validUserData);
      expect(user.getWeakAreas()).toEqual([]);
    });

    it('should identify topics below threshold', () => {
      const user = new UserModel(validUserData);
      const examResult: ExamResult = {
        id: 'exam1',
        userId: user.id,
        examType: 'practice',
        startTime: new Date(),
        endTime: new Date(),
        totalQuestions: 10,
        correctAnswers: 6,
        timeSpent: 1800,
        questions: [],
        topicBreakdown: [
          {
            topic: 'Databricks Lakehouse Platform',
            totalQuestions: 5,
            correctAnswers: 4,
            percentage: 80,
            averageTime: 180
          },
          {
            topic: 'Production Pipelines',
            totalQuestions: 5,
            correctAnswers: 2,
            percentage: 40,
            averageTime: 180
          }
        ]
      };
      
      user.addExamResult(examResult);
      const weakAreas = user.getWeakAreas(70);
      expect(weakAreas).toContain('Production Pipelines');
      expect(weakAreas).not.toContain('Databricks Lakehouse Platform');
    });
  });

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      const user = new UserModel(validUserData);
      const json = user.toJSON();
      
      expect(json).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        studyGoals: user.studyGoals,
        examHistory: user.examHistory
      });
    });
  });
});

describe('validateUser', () => {
  it('should return empty errors for valid user data', () => {
    const errors = validateUser({
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
    
    expect(errors).toEqual([]);
  });

  it('should return errors for invalid email', () => {
    const errors = validateUser({
      email: 'invalid-email',
      name: 'Test User'
    });
    
    expect(errors).toContain('Email must be in valid format');
  });

  it('should return errors for missing required fields', () => {
    const errors = validateUser({});
    
    expect(errors).toContain('Email is required and must be a string');
    expect(errors).toContain('Name is required and must be a string');
  });

  it('should return errors for invalid date types', () => {
    const errors = validateUser({
      email: 'test@example.com',
      name: 'Test User',
      createdAt: 'invalid-date' as any,
      lastLoginAt: 'invalid-date' as any
    });
    
    expect(errors).toContain('Created date must be a valid Date object');
    expect(errors).toContain('Last login date must be a valid Date object');
  });
});