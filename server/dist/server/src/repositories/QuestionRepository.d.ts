import { Question, ExamTopic, QuestionDifficulty } from '../../../shared/types';
export interface QuestionSearchFilters {
    topic?: ExamTopic;
    subtopic?: string;
    difficulty?: QuestionDifficulty;
    tags?: string[];
    hasCodeExample?: boolean;
    searchText?: string;
}
export interface QuestionSearchOptions {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'difficulty' | 'topic';
    sortOrder?: 'ASC' | 'DESC';
}
export declare class QuestionRepository {
    create(questionData: Partial<Question>): Promise<Question>;
    findById(id: string): Promise<Question | null>;
    findByIds(ids: string[]): Promise<Question[]>;
    findAll(filters?: QuestionSearchFilters, options?: QuestionSearchOptions): Promise<Question[]>;
    update(id: string, updateData: Partial<Question>): Promise<Question | null>;
    delete(id: string): Promise<boolean>;
    count(filters?: QuestionSearchFilters): Promise<number>;
    findByTopic(topic: ExamTopic, limit?: number): Promise<Question[]>;
    findByDifficulty(difficulty: QuestionDifficulty, limit?: number): Promise<Question[]>;
    findByTags(tags: string[], limit?: number): Promise<Question[]>;
    findWithCodeExamples(limit?: number): Promise<Question[]>;
    private mapRowToQuestion;
    private mapSortColumn;
}
//# sourceMappingURL=QuestionRepository.d.ts.map