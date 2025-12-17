import { User as IUser, StudyGoal, ExamResult } from '../../../shared/types';
export declare class User implements IUser {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    lastLoginAt: Date;
    studyGoals: StudyGoal[];
    examHistory: ExamResult[];
    constructor(data: Partial<IUser>);
    private generateId;
    private isValidEmail;
    updateLastLogin(): void;
    addStudyGoal(goal: StudyGoal): void;
    addExamResult(result: ExamResult): void;
    getWeakAreas(threshold?: number): string[];
    calculatePerformanceSummary(): any;
    calculateTopicMastery(masteryThreshold?: number): any;
    calculateStudyEfficiency(): any;
    validate(): {
        isValid: boolean;
        errors: string[];
    };
    toJSON(): IUser;
}
export declare const validateUser: (userData: Partial<IUser>) => string[];
//# sourceMappingURL=User.d.ts.map