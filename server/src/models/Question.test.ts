import { QuestionModel, validateQuestion } from './Question';
import { Question } from '../../../shared/types';

describe('QuestionModel', () => {
  const validQuestionData: Partial<Question> = {
    topic: 'Databricks Lakehouse Platform',
    subtopic: 'Architecture',
    difficulty: 'medium',
    questionText: 'What is the primary benefit of the Databricks Lakehouse architecture?',
    options: [
      'Unified analytics platform',
      'Separate data warehouses',
      'Multiple data silos',
      'Complex ETL processes'
    ],
    correctAnswer: 0,
    explanation: 'The Databricks Lakehouse provides a unified analytics platform that combines the best of data lakes and data warehouses.',
    documentationLinks: ['https://docs.databricks.com/lakehouse/'],
    tags: ['architecture', 'lakehouse']
  };

  describe('constructor', () => {
    it('should create a valid question with required fields', () => {
      const question = new QuestionModel(validQuestionData);
      
      expect(question.topic).toBe('Databricks Lakehouse Platform');
      expect(question.subtopic).toBe('Architecture');
      expect(question.difficulty).toBe('medium');
      expect(question.questionText).toBe(validQuestionData.questionText);
      expect(question.options).toEqual(validQuestionData.options);
      expect(question.correctAnswer).toBe(0);
      expect(question.id).toBeDefined();
      expect(question.createdAt).toBeInstanceOf(Date);
      expect(question.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate an ID if not provided', () => {
      const question = new QuestionModel(validQuestionData);
      expect(question.id).toMatch(/^question_\d+_[a-z0-9]+$/);
    });

    it('should throw error for short question text', () => {
      expect(() => {
        new QuestionModel({ ...validQuestionData, questionText: 'Short?' });
      }).toThrow('Question validation failed: Question text must be at least 10 characters long');
    });

    it('should throw error for insufficient options', () => {
      expect(() => {
        new QuestionModel({ ...validQuestionData, options: ['Only one'] });
      }).toThrow('Question validation failed: Question must have at least 2 options');
    });

    it('should throw error for invalid correct answer index', () => {
      expect(() => {
        new QuestionModel({ ...validQuestionData, correctAnswer: 5 });
      }).toThrow('Question validation failed: Correct answer index must be valid for the given options');
    });

    it('should throw error for short explanation', () => {
      expect(() => {
        new QuestionModel({ ...validQuestionData, explanation: 'Short' });
      }).toThrow('Question validation failed: Explanation must be at least 10 characters long');
    });

    it('should throw error for invalid topic', () => {
      expect(() => {
        new QuestionModel({ ...validQuestionData, topic: 'Invalid Topic' as any });
      }).toThrow('Question validation failed: Topic must be one of the valid exam topics');
    });

    it('should throw error for empty options', () => {
      expect(() => {
        new QuestionModel({ 
          ...validQuestionData, 
          options: ['Valid option', '', 'Another valid', 'Last one'] 
        });
      }).toThrow('Question validation failed: All options must be non-empty strings');
    });
  });

  describe('code syntax validation', () => {
    it('should accept valid Python code', () => {
      const questionWithCode = new QuestionModel({
        ...validQuestionData,
        codeExample: 'def hello_world():\n    print("Hello, World!")\n    return True'
      });
      
      expect(questionWithCode.codeExample).toBeDefined();
    });

    it('should accept valid SQL code', () => {
      const questionWithCode = new QuestionModel({
        ...validQuestionData,
        codeExample: 'SELECT * FROM table WHERE id = 1;'
      });
      
      expect(questionWithCode.codeExample).toBeDefined();
    });

    it('should reject code with unmatched brackets', () => {
      expect(() => {
        new QuestionModel({
          ...validQuestionData,
          codeExample: 'def broken_function():\n    print("Missing closing bracket"'
        });
      }).toThrow('Question validation failed: Code example contains syntax errors');
    });
  });

  describe('updateExplanation', () => {
    it('should update explanation and updatedAt timestamp', () => {
      const question = new QuestionModel(validQuestionData);
      const originalUpdatedAt = question.updatedAt;
      
      setTimeout(() => {
        question.updateExplanation('This is a new, longer explanation that meets the minimum requirements.');
        expect(question.explanation).toBe('This is a new, longer explanation that meets the minimum requirements.');
        expect(question.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });

    it('should throw error for short explanation', () => {
      const question = new QuestionModel(validQuestionData);
      
      expect(() => {
        question.updateExplanation('Short');
      }).toThrow('Explanation must be at least 10 characters long');
    });
  });

  describe('addDocumentationLink', () => {
    it('should add valid URL and update timestamp', () => {
      const question = new QuestionModel(validQuestionData);
      const originalLinks = question.documentationLinks.length;
      
      question.addDocumentationLink('https://docs.databricks.com/new-feature/');
      expect(question.documentationLinks).toHaveLength(originalLinks + 1);
      expect(question.documentationLinks).toContain('https://docs.databricks.com/new-feature/');
    });

    it('should throw error for invalid URL', () => {
      const question = new QuestionModel(validQuestionData);
      
      expect(() => {
        question.addDocumentationLink('not-a-valid-url');
      }).toThrow('Documentation link must be a valid URL');
    });
  });

  describe('addTag', () => {
    it('should add new tag and update timestamp', () => {
      const question = new QuestionModel(validQuestionData);
      const originalTags = question.tags.length;
      
      question.addTag('new-tag');
      expect(question.tags).toHaveLength(originalTags + 1);
      expect(question.tags).toContain('new-tag');
    });

    it('should not add duplicate tags', () => {
      const question = new QuestionModel(validQuestionData);
      const originalTags = question.tags.length;
      
      question.addTag('architecture'); // Already exists
      expect(question.tags).toHaveLength(originalTags);
    });

    it('should throw error for empty tag', () => {
      const question = new QuestionModel(validQuestionData);
      
      expect(() => {
        question.addTag('');
      }).toThrow('Tag cannot be empty');
    });
  });

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      const question = new QuestionModel(validQuestionData);
      const json = question.toJSON();
      
      expect(json).toEqual({
        id: question.id,
        topic: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        questionText: question.questionText,
        codeExample: question.codeExample,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        documentationLinks: question.documentationLinks,
        tags: question.tags,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt
      });
    });
  });
});

describe('validateQuestion', () => {
  const validData = {
    questionText: 'What is the primary benefit of the Databricks Lakehouse architecture?',
    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
    correctAnswer: 0,
    explanation: 'This is a detailed explanation of the correct answer.',
    subtopic: 'Architecture',
    topic: 'Databricks Lakehouse Platform' as const,
    difficulty: 'medium' as const
  };

  it('should return empty errors for valid question data', () => {
    const errors = validateQuestion(validData);
    expect(errors).toEqual([]);
  });

  it('should return errors for missing required fields', () => {
    const errors = validateQuestion({});
    
    expect(errors).toContain('Question text is required and must be a string');
    expect(errors).toContain('Options are required and must be an array');
    expect(errors).toContain('Correct answer must be a number');
    expect(errors).toContain('Explanation is required and must be a string');
    expect(errors).toContain('Subtopic is required and must be a non-empty string');
  });

  it('should return errors for invalid option count', () => {
    const errorsMin = validateQuestion({ ...validData, options: ['Only one'] });
    expect(errorsMin).toContain('Question must have at least 2 options');
    
    const errorsMax = validateQuestion({ 
      ...validData, 
      options: ['1', '2', '3', '4', '5', '6', '7'] 
    });
    expect(errorsMax).toContain('Question cannot have more than 6 options');
  });

  it('should return errors for invalid correct answer index', () => {
    const errors = validateQuestion({ ...validData, correctAnswer: 10 });
    expect(errors).toContain('Correct answer index must be valid for the given options');
  });

  it('should return errors for invalid topic and difficulty', () => {
    const errors = validateQuestion({ 
      ...validData, 
      topic: 'Invalid Topic' as any,
      difficulty: 'invalid' as any
    });
    
    expect(errors).toContain('Topic must be one of the valid exam topics');
    expect(errors).toContain('Difficulty must be easy, medium, or hard');
  });
});