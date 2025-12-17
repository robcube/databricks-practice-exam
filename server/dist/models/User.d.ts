import { User, StudyGoal, ExamResult } from '../../../shared/types';
export declare class UserModel implements User {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    lastLoginAt: Date;
    studyGoals: StudyGoal[];
    examHistory: ExamResult[];
    constructor(data: Partial<User>);
    private generateId;
    private validate;
    private isValidEmail;
    updateLastLogin(): void;
    addStudyGoal(goal: StudyGoal): void;
    addExamResult(result: ExamResult): void;
    getWeakAreas(threshold?: number): string[];
    toJSON(): User;
}
export declare const validateUser: (userData: Partial<User>) => string[];
//# sourceMappingURL=User.d.ts.map