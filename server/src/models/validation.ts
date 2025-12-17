import { ExamTopic, QuestionDifficulty, ExamType } from '../../../shared/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationUtils {
  
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email || typeof email !== 'string') {
      errors.push('Email is required and must be a string');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Email must be in valid format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('Name is required and must be a string');
    } else if (name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    } else if (name.trim().length > 100) {
      errors.push('Name must be less than 100 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateExamTopic(topic: string): ValidationResult {
    const errors: string[] = [];
    const validTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];
    
    if (!topic || typeof topic !== 'string') {
      errors.push('Topic is required and must be a string');
    } else if (!validTopics.includes(topic as ExamTopic)) {
      errors.push(`Topic must be one of: ${validTopics.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateQuestionDifficulty(difficulty: string): ValidationResult {
    const errors: string[] = [];
    const validDifficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
    
    if (!difficulty || typeof difficulty !== 'string') {
      errors.push('Difficulty is required and must be a string');
    } else if (!validDifficulties.includes(difficulty as QuestionDifficulty)) {
      errors.push(`Difficulty must be one of: ${validDifficulties.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateExamType(examType: string): ValidationResult {
    const errors: string[] = [];
    const validExamTypes: ExamType[] = ['practice', 'assessment'];
    
    if (!examType || typeof examType !== 'string') {
      errors.push('Exam type is required and must be a string');
    } else if (!validExamTypes.includes(examType as ExamType)) {
      errors.push(`Exam type must be one of: ${validExamTypes.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateDate(date: any, fieldName: string): ValidationResult {
    const errors: string[] = [];
    
    if (!date) {
      errors.push(`${fieldName} is required`);
    } else if (!(date instanceof Date)) {
      errors.push(`${fieldName} must be a valid Date object`);
    } else if (isNaN(date.getTime())) {
      errors.push(`${fieldName} must be a valid date`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePositiveNumber(value: any, fieldName: string): ValidationResult {
    const errors: string[] = [];
    
    if (typeof value !== 'number') {
      errors.push(`${fieldName} must be a number`);
    } else if (value < 0) {
      errors.push(`${fieldName} must be non-negative`);
    } else if (!Number.isInteger(value)) {
      errors.push(`${fieldName} must be an integer`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateNonEmptyString(value: any, fieldName: string, minLength: number = 1): ValidationResult {
    const errors: string[] = [];
    
    if (!value || typeof value !== 'string') {
      errors.push(`${fieldName} is required and must be a string`);
    } else if (value.trim().length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters long`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateArray(value: any, fieldName: string, minLength: number = 0): ValidationResult {
    const errors: string[] = [];
    
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`);
    } else if (value.length < minLength) {
      errors.push(`${fieldName} must have at least ${minLength} items`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateUrl(url: string): ValidationResult {
    const errors: string[] = [];
    
    if (!url || typeof url !== 'string') {
      errors.push('URL is required and must be a string');
    } else {
      try {
        new URL(url);
      } catch {
        errors.push('URL must be in valid format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePercentage(value: any, fieldName: string): ValidationResult {
    const errors: string[] = [];
    
    if (typeof value !== 'number') {
      errors.push(`${fieldName} must be a number`);
    } else if (value < 0 || value > 100) {
      errors.push(`${fieldName} must be between 0 and 100`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static combineValidationResults(...results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(result => result.errors);
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
}

export default ValidationUtils;