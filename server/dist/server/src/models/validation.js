"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
class ValidationUtils {
    static validateEmail(email) {
        const errors = [];
        if (!email || typeof email !== 'string') {
            errors.push('Email is required and must be a string');
        }
        else {
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
    static validateName(name) {
        const errors = [];
        if (!name || typeof name !== 'string') {
            errors.push('Name is required and must be a string');
        }
        else if (name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        else if (name.trim().length > 100) {
            errors.push('Name must be less than 100 characters');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validateExamTopic(topic) {
        const errors = [];
        const validTopics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        if (!topic || typeof topic !== 'string') {
            errors.push('Topic is required and must be a string');
        }
        else if (!validTopics.includes(topic)) {
            errors.push(`Topic must be one of: ${validTopics.join(', ')}`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validateQuestionDifficulty(difficulty) {
        const errors = [];
        const validDifficulties = ['easy', 'medium', 'hard'];
        if (!difficulty || typeof difficulty !== 'string') {
            errors.push('Difficulty is required and must be a string');
        }
        else if (!validDifficulties.includes(difficulty)) {
            errors.push(`Difficulty must be one of: ${validDifficulties.join(', ')}`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validateExamType(examType) {
        const errors = [];
        const validExamTypes = ['practice', 'assessment'];
        if (!examType || typeof examType !== 'string') {
            errors.push('Exam type is required and must be a string');
        }
        else if (!validExamTypes.includes(examType)) {
            errors.push(`Exam type must be one of: ${validExamTypes.join(', ')}`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validateDate(date, fieldName) {
        const errors = [];
        if (!date) {
            errors.push(`${fieldName} is required`);
        }
        else if (!(date instanceof Date)) {
            errors.push(`${fieldName} must be a valid Date object`);
        }
        else if (isNaN(date.getTime())) {
            errors.push(`${fieldName} must be a valid date`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validatePositiveNumber(value, fieldName) {
        const errors = [];
        if (typeof value !== 'number') {
            errors.push(`${fieldName} must be a number`);
        }
        else if (value < 0) {
            errors.push(`${fieldName} must be non-negative`);
        }
        else if (!Number.isInteger(value)) {
            errors.push(`${fieldName} must be an integer`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validateNonEmptyString(value, fieldName, minLength = 1) {
        const errors = [];
        if (!value || typeof value !== 'string') {
            errors.push(`${fieldName} is required and must be a string`);
        }
        else if (value.trim().length < minLength) {
            errors.push(`${fieldName} must be at least ${minLength} characters long`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validateArray(value, fieldName, minLength = 0) {
        const errors = [];
        if (!Array.isArray(value)) {
            errors.push(`${fieldName} must be an array`);
        }
        else if (value.length < minLength) {
            errors.push(`${fieldName} must have at least ${minLength} items`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validateUrl(url) {
        const errors = [];
        if (!url || typeof url !== 'string') {
            errors.push('URL is required and must be a string');
        }
        else {
            try {
                new URL(url);
            }
            catch {
                errors.push('URL must be in valid format');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static validatePercentage(value, fieldName) {
        const errors = [];
        if (typeof value !== 'number') {
            errors.push(`${fieldName} must be a number`);
        }
        else if (value < 0 || value > 100) {
            errors.push(`${fieldName} must be between 0 and 100`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    static combineValidationResults(...results) {
        const allErrors = results.flatMap(result => result.errors);
        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }
}
exports.ValidationUtils = ValidationUtils;
exports.default = ValidationUtils;
//# sourceMappingURL=validation.js.map