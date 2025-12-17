"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamGenerationService = void 0;
const AdaptiveQuestionService_1 = require("./AdaptiveQuestionService");
const QuestionService_1 = require("./QuestionService");
class ExamGenerationService {
    constructor() {
        this.adaptiveQuestionService = new AdaptiveQuestionService_1.AdaptiveQuestionService();
        this.questionService = new QuestionService_1.QuestionService();
    }
    /**
     * Generates a new exam session based on user performance and preferences
     * Implements Requirements 1.1, 1.2, 1.5
     */
    async generateExam(request, userExamHistory) {
        const config = {
            totalQuestions: request.totalQuestions || 60
        };
        let selectedQuestions;
        let performanceAnalysis;
        let studyRecommendations;
        if (request.useAdaptiveSelection !== false && request.examType === 'practice') {
            // Use adaptive question selection for practice exams
            const analysisResult = await this.adaptiveQuestionService.analyzeUserPerformance(userExamHistory, config);
            selectedQuestions = await this.adaptiveQuestionService.generateAdaptiveQuestionSet(userExamHistory, config);
            // Generate performance analytics and recommendations
            const trends = this.adaptiveQuestionService.calculatePerformanceTrends(userExamHistory);
            studyRecommendations = this.adaptiveQuestionService.generateStudyRecommendations(analysisResult, trends);
            performanceAnalysis = {
                userId: request.userId,
                weakAreas: analysisResult.weakAreas,
                strongAreas: analysisResult.strongAreas,
                overallProgress: this.calculateOverallProgress(userExamHistory),
                topicTrends: trends,
                recommendedStudyPlan: studyRecommendations
            };
        }
        else {
            // Use standard question selection for assessment exams or when adaptive is disabled
            selectedQuestions = await this.generateStandardQuestionSet(request, config);
        }
        // Apply additional filters if specified
        if (request.focusTopics && request.focusTopics.length > 0) {
            selectedQuestions = await this.filterQuestionsByTopics(selectedQuestions, request.focusTopics, config.totalQuestions || 60);
        }
        if (request.difficulty && request.difficulty !== 'mixed') {
            selectedQuestions = await this.filterQuestionsByDifficulty(selectedQuestions, request.difficulty, config.totalQuestions || 60);
        }
        // Create exam session
        const examSession = {
            id: this.generateSessionId(),
            userId: request.userId,
            examType: request.examType,
            questions: selectedQuestions,
            currentQuestionIndex: 0,
            responses: [],
            startTime: new Date(),
            timeRemaining: request.examType === 'practice' ? 5400 : 5400, // 90 minutes in seconds
            isCompleted: false,
            isPaused: false
        };
        return {
            examSession,
            performanceAnalysis,
            studyRecommendations
        };
    }
    /**
     * Analyzes user performance and provides recommendations
     * Implements Requirements 3.1, 3.2, 3.4
     */
    async analyzePerformance(userId, examHistory) {
        const analysisResult = await this.adaptiveQuestionService.analyzeUserPerformance(examHistory);
        const trends = this.adaptiveQuestionService.calculatePerformanceTrends(examHistory);
        const recommendations = this.adaptiveQuestionService.generateStudyRecommendations(analysisResult, trends);
        return {
            userId,
            weakAreas: analysisResult.weakAreas,
            strongAreas: analysisResult.strongAreas,
            overallProgress: this.calculateOverallProgress(examHistory),
            topicTrends: trends,
            recommendedStudyPlan: recommendations
        };
    }
    /**
     * Checks if a topic should have reduced allocation in future exams
     * Implements Requirement 3.3
     */
    async shouldReduceTopicAllocation(topic, examHistory) {
        return this.adaptiveQuestionService.shouldReduceTopicAllocation(topic, examHistory);
    }
    /**
     * Generates study recommendations for improvement
     * Implements Requirement 3.4
     */
    async generateStudyPlan(userId, examHistory) {
        const analysisResult = await this.adaptiveQuestionService.analyzeUserPerformance(examHistory);
        const trends = this.adaptiveQuestionService.calculatePerformanceTrends(examHistory);
        return this.adaptiveQuestionService.generateStudyRecommendations(analysisResult, trends);
    }
    /**
     * Validates that the question bank supports adaptive learning requirements
     */
    async validateAdaptiveCapabilities() {
        const questionBankValidation = await this.questionService.validateQuestionBank();
        const issues = [...questionBankValidation.issues];
        // Check if we have sufficient questions per topic for adaptive selection
        const allTopics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        for (const topic of allTopics) {
            const topicQuestions = await this.questionService.getQuestionsByTopic(topic);
            if (topicQuestions.length < 20) {
                issues.push(`Insufficient questions for adaptive selection in topic: ${topic} (${topicQuestions.length} found, minimum 20 recommended for adaptive learning)`);
            }
            // Check difficulty distribution
            const easyQuestions = topicQuestions.filter(q => q.difficulty === 'easy').length;
            const mediumQuestions = topicQuestions.filter(q => q.difficulty === 'medium').length;
            const hardQuestions = topicQuestions.filter(q => q.difficulty === 'hard').length;
            if (mediumQuestions + hardQuestions < 10) {
                issues.push(`Insufficient challenging questions for topic: ${topic} (need at least 10 medium/hard questions for adaptive learning)`);
            }
        }
        return {
            isValid: issues.length === 0,
            issues
        };
    }
    // Private helper methods
    async generateStandardQuestionSet(request, config) {
        const totalQuestions = config.totalQuestions || 60;
        if (request.examType === 'assessment') {
            // For assessment exams, use proportional distribution across all topics
            return await this.generateProportionalQuestionSet(totalQuestions);
        }
        else {
            // For practice exams without adaptive selection, use balanced distribution
            return await this.generateBalancedQuestionSet(totalQuestions);
        }
    }
    async generateProportionalQuestionSet(totalQuestions) {
        // Proportional distribution for comprehensive assessment (Requirement 3.5)
        const allTopics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        const questionsPerTopic = Math.floor(totalQuestions / allTopics.length);
        const remainingQuestions = totalQuestions - (questionsPerTopic * allTopics.length);
        const selectedQuestions = [];
        for (let i = 0; i < allTopics.length; i++) {
            const topic = allTopics[i];
            const extraQuestion = i < remainingQuestions ? 1 : 0;
            const topicQuestionCount = questionsPerTopic + extraQuestion;
            const topicQuestions = await this.questionService.getQuestionsByTopic(topic, topicQuestionCount * 2);
            const randomQuestions = this.selectRandomQuestions(topicQuestions, topicQuestionCount);
            selectedQuestions.push(...randomQuestions);
        }
        return this.shuffleArray(selectedQuestions);
    }
    async generateBalancedQuestionSet(totalQuestions) {
        const allTopics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        const questionsPerTopic = Math.floor(totalQuestions / allTopics.length);
        const remainingQuestions = totalQuestions - (questionsPerTopic * allTopics.length);
        const selectedQuestions = [];
        for (let i = 0; i < allTopics.length; i++) {
            const topic = allTopics[i];
            const extraQuestion = i < remainingQuestions ? 1 : 0;
            const topicQuestionCount = questionsPerTopic + extraQuestion;
            const topicQuestions = await this.questionService.getQuestionsByTopic(topic, topicQuestionCount * 2);
            const randomQuestions = this.selectRandomQuestions(topicQuestions, topicQuestionCount);
            selectedQuestions.push(...randomQuestions);
        }
        return this.shuffleArray(selectedQuestions);
    }
    async filterQuestionsByTopics(questions, focusTopics, totalQuestions) {
        const filteredQuestions = questions.filter(q => focusTopics.includes(q.topic));
        if (filteredQuestions.length >= totalQuestions) {
            return this.selectRandomQuestions(filteredQuestions, totalQuestions);
        }
        // If not enough questions in focus topics, supplement with additional questions
        const additionalNeeded = totalQuestions - filteredQuestions.length;
        const additionalQuestions = [];
        for (const topic of focusTopics) {
            const topicQuestions = await this.questionService.getQuestionsByTopic(topic, additionalNeeded * 2);
            const newQuestions = topicQuestions.filter(q => !filteredQuestions.some(fq => fq.id === q.id));
            additionalQuestions.push(...newQuestions);
            if (additionalQuestions.length >= additionalNeeded)
                break;
        }
        const finalQuestions = [
            ...filteredQuestions,
            ...this.selectRandomQuestions(additionalQuestions, additionalNeeded)
        ];
        return this.shuffleArray(finalQuestions);
    }
    async filterQuestionsByDifficulty(questions, difficulty, totalQuestions) {
        const filteredQuestions = questions.filter(q => q.difficulty === difficulty);
        if (filteredQuestions.length >= totalQuestions) {
            return this.selectRandomQuestions(filteredQuestions, totalQuestions);
        }
        // If not enough questions of specified difficulty, return what we have
        return filteredQuestions;
    }
    calculateOverallProgress(examHistory) {
        if (examHistory.length === 0)
            return 0;
        const recentExams = examHistory
            .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
            .slice(0, 5); // Last 5 exams
        const totalScore = recentExams.reduce((sum, exam) => {
            return sum + (exam.correctAnswers / exam.totalQuestions) * 100;
        }, 0);
        return Math.round(totalScore / recentExams.length);
    }
    selectRandomQuestions(questions, count) {
        if (questions.length <= count) {
            return [...questions];
        }
        const shuffled = this.shuffleArray([...questions]);
        return shuffled.slice(0, count);
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ExamGenerationService = ExamGenerationService;
//# sourceMappingURL=ExamGenerationService.js.map