import { ValidationUtils } from './validation';

describe('ValidationUtils', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const result = ValidationUtils.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid email formats', () => {
      const result = ValidationUtils.validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must be in valid format');
    });

    it('should reject empty email', () => {
      const result = ValidationUtils.validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required and must be a string');
    });
  });

  describe('validateName', () => {
    it('should validate correct names', () => {
      const result = ValidationUtils.validateName('John Doe');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject short names', () => {
      const result = ValidationUtils.validateName('A');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be at least 2 characters long');
    });

    it('should reject very long names', () => {
      const longName = 'A'.repeat(101);
      const result = ValidationUtils.validateName(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be less than 100 characters');
    });
  });

  describe('validateExamTopic', () => {
    it('should validate correct exam topics', () => {
      const result = ValidationUtils.validateExamTopic('Databricks Lakehouse Platform');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid topics', () => {
      const result = ValidationUtils.validateExamTopic('Invalid Topic');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Topic must be one of:');
    });
  });

  describe('validateQuestionDifficulty', () => {
    it('should validate correct difficulties', () => {
      const result = ValidationUtils.validateQuestionDifficulty('medium');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid difficulties', () => {
      const result = ValidationUtils.validateQuestionDifficulty('impossible');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Difficulty must be one of:');
    });
  });

  describe('validateExamType', () => {
    it('should validate correct exam types', () => {
      const result = ValidationUtils.validateExamType('practice');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid exam types', () => {
      const result = ValidationUtils.validateExamType('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Exam type must be one of:');
    });
  });

  describe('validateDate', () => {
    it('should validate correct dates', () => {
      const result = ValidationUtils.validateDate(new Date(), 'Test Date');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid dates', () => {
      const result = ValidationUtils.validateDate('not-a-date', 'Test Date');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test Date must be a valid Date object');
    });

    it('should reject null dates', () => {
      const result = ValidationUtils.validateDate(null, 'Test Date');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test Date is required');
    });
  });

  describe('validatePositiveNumber', () => {
    it('should validate positive integers', () => {
      const result = ValidationUtils.validatePositiveNumber(5, 'Test Number');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate zero', () => {
      const result = ValidationUtils.validatePositiveNumber(0, 'Test Number');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject negative numbers', () => {
      const result = ValidationUtils.validatePositiveNumber(-1, 'Test Number');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test Number must be non-negative');
    });

    it('should reject non-integers', () => {
      const result = ValidationUtils.validatePositiveNumber(3.14, 'Test Number');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test Number must be an integer');
    });

    it('should reject non-numbers', () => {
      const result = ValidationUtils.validatePositiveNumber('not-a-number', 'Test Number');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test Number must be a number');
    });
  });

  describe('validateNonEmptyString', () => {
    it('should validate non-empty strings', () => {
      const result = ValidationUtils.validateNonEmptyString('Hello', 'Test String');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty strings', () => {
      const result = ValidationUtils.validateNonEmptyString('', 'Test String');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test String is required and must be a string');
    });

    it('should respect minimum length', () => {
      const result = ValidationUtils.validateNonEmptyString('Hi', 'Test String', 5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test String must be at least 5 characters long');
    });
  });

  describe('validateArray', () => {
    it('should validate arrays', () => {
      const result = ValidationUtils.validateArray([1, 2, 3], 'Test Array');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-arrays', () => {
      const result = ValidationUtils.validateArray('not-an-array', 'Test Array');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test Array must be an array');
    });

    it('should respect minimum length', () => {
      const result = ValidationUtils.validateArray([1], 'Test Array', 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test Array must have at least 3 items');
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const result = ValidationUtils.validateUrl('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid URLs', () => {
      const result = ValidationUtils.validateUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL must be in valid format');
    });
  });

  describe('validatePercentage', () => {
    it('should validate percentages within range', () => {
      const result = ValidationUtils.validatePercentage(75, 'Test Percentage');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject percentages outside range', () => {
      const result1 = ValidationUtils.validatePercentage(-10, 'Test Percentage');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Test Percentage must be between 0 and 100');

      const result2 = ValidationUtils.validatePercentage(150, 'Test Percentage');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Test Percentage must be between 0 and 100');
    });
  });

  describe('combineValidationResults', () => {
    it('should combine multiple validation results', () => {
      const result1 = { isValid: true, errors: [] };
      const result2 = { isValid: false, errors: ['Error 1'] };
      const result3 = { isValid: false, errors: ['Error 2', 'Error 3'] };

      const combined = ValidationUtils.combineValidationResults(result1, result2, result3);
      
      expect(combined.isValid).toBe(false);
      expect(combined.errors).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });

    it('should return valid when all results are valid', () => {
      const result1 = { isValid: true, errors: [] };
      const result2 = { isValid: true, errors: [] };

      const combined = ValidationUtils.combineValidationResults(result1, result2);
      
      expect(combined.isValid).toBe(true);
      expect(combined.errors).toEqual([]);
    });
  });
});