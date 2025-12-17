"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUser = exports.UserModel = void 0;
class UserModel {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.email = data.email || '';
        this.name = data.name || '';
        this.createdAt = data.createdAt || new Date();
        this.lastLoginAt = data.lastLoginAt || new Date();
        this.studyGoals = data.studyGoals || [];
        this.examHistory = data.examHistory || [];
        this.validate();
    }
    generateId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    validate() {
        const errors = [];
        if (!this.email || !this.isValidEmail(this.email)) {
            errors.push('Valid email is required');
        }
        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        if (!this.id || this.id.trim().length === 0) {
            errors.push('User ID is required');
        }
        if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
            errors.push('Valid creation date is required');
        }
        if (!(this.lastLoginAt instanceof Date) || isNaN(this.lastLoginAt.getTime())) {
            errors.push('Valid last login date is required');
        }
        if (this.createdAt > new Date()) {
            errors.push('Creation date cannot be in the future');
        }
        if (errors.length > 0) {
            throw new Error(`User validation failed: ${errors.join(', ')}`);
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    updateLastLogin() {
        this.lastLoginAt = new Date();
    }
    addStudyGoal(goal) {
        this.studyGoals.push(goal);
    }
    addExamResult(result) {
        this.examHistory.push(result);
    }
    getWeakAreas(threshold = 70) {
        if (this.examHistory.length === 0) {
            return [];
        }
        const latestResult = this.examHistory[this.examHistory.length - 1];
        return latestResult.topicBreakdown
            .filter(topic => topic.percentage < threshold)
            .map(topic => topic.topic);
    }
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            createdAt: this.createdAt,
            lastLoginAt: this.lastLoginAt,
            studyGoals: this.studyGoals,
            examHistory: this.examHistory
        };
    }
}
exports.UserModel = UserModel;
const validateUser = (userData) => {
    const errors = [];
    if (!userData.email || typeof userData.email !== 'string') {
        errors.push('Email is required and must be a string');
    }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        errors.push('Email must be in valid format');
    }
    if (!userData.name || typeof userData.name !== 'string') {
        errors.push('Name is required and must be a string');
    }
    else if (userData.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
    }
    if (userData.createdAt && !(userData.createdAt instanceof Date)) {
        errors.push('Created date must be a valid Date object');
    }
    if (userData.lastLoginAt && !(userData.lastLoginAt instanceof Date)) {
        errors.push('Last login date must be a valid Date object');
    }
    return errors;
};
exports.validateUser = validateUser;
//# sourceMappingURL=User.js.map