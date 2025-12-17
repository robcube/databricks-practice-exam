import { Question, ExamTopic, QuestionDifficulty } from '../../../shared/types';

export class QuestionModel implements Question {
  id: string;
  topic: ExamTopic;
  subtopic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  codeExample?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  documentationLinks: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Question>) {
    this.id = data.id || this.generateId();
    this.topic = data.topic || 'Databricks Lakehouse Platform';
    this.subtopic = data.subtopic || '';
    this.difficulty = data.difficulty || 'medium';
    this.questionText = data.questionText || '';
    this.codeExample = data.codeExample;
    this.options = data.options || [];
    this.correctAnswer = data.correctAnswer || 0;
    this.explanation = data.explanation || '';
    this.documentationLinks = data.documentationLinks || [];
    this.tags = data.tags || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();

    this.validate();
  }

  private generateId(): string {
    return `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validate(): void {
    const errors: string[] = [];

    if (!this.questionText || this.questionText.trim().length < 10) {
      errors.push('Question text must be at least 10 characters long');
    }

    if (!this.options || this.options.length < 2) {
      errors.push('Question must have at least 2 options');
    }

    if (this.options.length > 6) {
      errors.push('Question cannot have more than 6 options');
    }

    if (this.correctAnswer < 0 || this.correctAnswer >= this.options.length) {
      errors.push('Correct answer index must be valid for the given options');
    }

    if (!this.explanation || this.explanation.trim().length < 10) {
      errors.push('Explanation must be at least 10 characters long');
    }

    if (!this.subtopic || this.subtopic.trim().length === 0) {
      errors.push('Subtopic is required');
    }

    // Validate topic is one of the allowed values
    const validTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];
    if (!validTopics.includes(this.topic)) {
      errors.push('Topic must be one of the valid exam topics');
    }

    // Validate difficulty
    const validDifficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(this.difficulty)) {
      errors.push('Difficulty must be easy, medium, or hard');
    }

    // Validate options are not empty
    if (this.options.some(option => !option || option.trim().length === 0)) {
      errors.push('All options must be non-empty strings');
    }

    // Validate code syntax if code example is provided
    if (this.codeExample && !this.isValidCodeSyntax(this.codeExample)) {
      errors.push('Code example contains syntax errors');
    }

    if (errors.length > 0) {
      throw new Error(`Question validation failed: ${errors.join(', ')}`);
    }
  }

  private isValidCodeSyntax(code: string): boolean {
    // Basic syntax validation for common patterns
    const trimmedCode = code.trim();
    
    // Check for basic Python/SQL syntax patterns
    if (trimmedCode.length === 0) return false;
    
    // Check for unmatched brackets/parentheses
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    
    for (const char of trimmedCode) {
      if (char in brackets) {
        stack.push(brackets[char as keyof typeof brackets]);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.length === 0 || stack.pop() !== char) {
          return false;
        }
      }
    }
    
    return stack.length === 0;
  }

  public updateExplanation(explanation: string): void {
    if (!explanation || explanation.trim().length < 10) {
      throw new Error('Explanation must be at least 10 characters long');
    }
    this.explanation = explanation;
    this.updatedAt = new Date();
  }

  public addDocumentationLink(link: string): void {
    if (!link || !this.isValidUrl(link)) {
      throw new Error('Documentation link must be a valid URL');
    }
    this.documentationLinks.push(link);
    this.updatedAt = new Date();
  }

  public addTag(tag: string): void {
    if (!tag || tag.trim().length === 0) {
      throw new Error('Tag cannot be empty');
    }
    if (!this.tags.includes(tag.trim())) {
      this.tags.push(tag.trim());
      this.updatedAt = new Date();
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  public toJSON(): Question {
    return {
      id: this.id,
      topic: this.topic,
      subtopic: this.subtopic,
      difficulty: this.difficulty,
      questionText: this.questionText,
      codeExample: this.codeExample,
      options: this.options,
      correctAnswer: this.correctAnswer,
      explanation: this.explanation,
      documentationLinks: this.documentationLinks,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export const validateQuestion = (questionData: Partial<Question>): string[] => {
  const errors: string[] = [];

  if (!questionData.questionText || typeof questionData.questionText !== 'string') {
    errors.push('Question text is required and must be a string');
  } else if (questionData.questionText.trim().length < 10) {
    errors.push('Question text must be at least 10 characters long');
  }

  if (!questionData.options || !Array.isArray(questionData.options)) {
    errors.push('Options are required and must be an array');
  } else {
    if (questionData.options.length < 2) {
      errors.push('Question must have at least 2 options');
    }
    if (questionData.options.length > 6) {
      errors.push('Question cannot have more than 6 options');
    }
    if (questionData.options.some(option => !option || typeof option !== 'string' || option.trim().length === 0)) {
      errors.push('All options must be non-empty strings');
    }
  }

  if (typeof questionData.correctAnswer !== 'number') {
    errors.push('Correct answer must be a number');
  } else if (questionData.options && (questionData.correctAnswer < 0 || questionData.correctAnswer >= questionData.options.length)) {
    errors.push('Correct answer index must be valid for the given options');
  }

  if (!questionData.explanation || typeof questionData.explanation !== 'string') {
    errors.push('Explanation is required and must be a string');
  } else if (questionData.explanation.trim().length < 10) {
    errors.push('Explanation must be at least 10 characters long');
  }

  if (!questionData.subtopic || typeof questionData.subtopic !== 'string' || questionData.subtopic.trim().length === 0) {
    errors.push('Subtopic is required and must be a non-empty string');
  }

  const validTopics: ExamTopic[] = [
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ];
  if (questionData.topic && !validTopics.includes(questionData.topic)) {
    errors.push('Topic must be one of the valid exam topics');
  }

  const validDifficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
  if (questionData.difficulty && !validDifficulties.includes(questionData.difficulty)) {
    errors.push('Difficulty must be easy, medium, or hard');
  }

  return errors;
};