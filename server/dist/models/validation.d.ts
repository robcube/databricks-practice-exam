export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare class ValidationUtils {
    static validateEmail(email: string): ValidationResult;
    static validateName(name: string): ValidationResult;
    static validateExamTopic(topic: string): ValidationResult;
    static validateQuestionDifficulty(difficulty: string): ValidationResult;
    static validateExamType(examType: string): ValidationResult;
    static validateDate(date: any, fieldName: string): ValidationResult;
    static validatePositiveNumber(value: any, fieldName: string): ValidationResult;
    static validateNonEmptyString(value: any, fieldName: string, minLength?: number): ValidationResult;
    static validateArray(value: any, fieldName: string, minLength?: number): ValidationResult;
    static validateUrl(url: string): ValidationResult;
    static validatePercentage(value: any, fieldName: string): ValidationResult;
    static combineValidationResults(...results: ValidationResult[]): ValidationResult;
}
export default ValidationUtils;
//# sourceMappingURL=validation.d.ts.map