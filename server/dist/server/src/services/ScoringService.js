"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
class ScoringService {
    /**
     * Generate comprehensive feedback for a completed exam
     */
    generateComprehensiveFeedback(examResult, questions) {
        // Validate inputs
        if (!examResult || !questions || questions.length === 0) {
            throw new Error('Invalid exam result or questions data');
        }
        if (examResult.questions.length !== questions.length) {
            throw new Error('Mismatch between exam result questions and provided questions');
        }
        // Generate detailed feedback for each question
        const questionFeedback = this.generateQuestionFeedback(examResult.questions, questions);
        // Calculate timing analysis
        const timingAnalysis = this.calculateTimingAnalysis(examResult.questions, questions);
        // Generate performance insights
        const performanceInsights = this.generatePerformanceInsights(examResult, timingAnalysis);
        // Calculate overall score
        const overallScore = this.calculateOverallScore(examResult);
        return {
            examResult,
            overallScore,
            topicBreakdown: examResult.topicBreakdown,
            questionFeedback,
            timingAnalysis,
            performanceInsights
        };
    }
    /**
     * Generate detailed feedback for each question
     */
    generateQuestionFeedback(responses, questions) {
        return responses.map((response, index) => {
            const question = questions[index];
            if (!question) {
                throw new Error(`Question not found for response at index ${index}`);
            }
            return {
                questionId: response.questionId,
                questionText: question.questionText,
                selectedAnswer: response.selectedAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: response.isCorrect,
                explanation: question.explanation,
                documentationLinks: question.documentationLinks,
                timeSpent: response.timeSpent,
                topic: question.topic
            };
        });
    }
    /**
     * Calculate comprehensive timing analysis
     */
    calculateTimingAnalysis(responses, questions) {
        if (responses.length === 0) {
            throw new Error('No responses provided for timing analysis');
        }
        const totalTimeSpent = responses.reduce((sum, response) => sum + response.timeSpent, 0);
        const averageTimePerQuestion = Math.round(totalTimeSpent / responses.length);
        // Find fastest and slowest questions
        let fastestQuestion = { questionId: responses[0].questionId, timeSpent: responses[0].timeSpent };
        let slowestQuestion = { questionId: responses[0].questionId, timeSpent: responses[0].timeSpent };
        responses.forEach(response => {
            if (response.timeSpent < fastestQuestion.timeSpent) {
                fastestQuestion = { questionId: response.questionId, timeSpent: response.timeSpent };
            }
            if (response.timeSpent > slowestQuestion.timeSpent) {
                slowestQuestion = { questionId: response.questionId, timeSpent: response.timeSpent };
            }
        });
        // Calculate time by topic
        const topicTimeMap = new Map();
        responses.forEach((response, index) => {
            const question = questions[index];
            if (!question)
                return;
            const topic = question.topic;
            if (!topicTimeMap.has(topic)) {
                topicTimeMap.set(topic, { totalTime: 0, questionCount: 0 });
            }
            const topicData = topicTimeMap.get(topic);
            topicData.totalTime += response.timeSpent;
            topicData.questionCount++;
        });
        const timeByTopic = Array.from(topicTimeMap.entries()).map(([topic, data]) => ({
            topic,
            totalTime: data.totalTime,
            averageTime: Math.round(data.totalTime / data.questionCount),
            questionCount: data.questionCount
        }));
        // Analyze pacing
        const pacingAnalysis = this.analyzePacing(responses, averageTimePerQuestion);
        return {
            totalTimeSpent,
            averageTimePerQuestion,
            fastestQuestion,
            slowestQuestion,
            timeByTopic,
            pacingAnalysis
        };
    }
    /**
     * Analyze pacing patterns and provide recommendations
     */
    analyzePacing(responses, averageTime) {
        const rushingThreshold = 30; // seconds
        const slowThreshold = 300; // 5 minutes
        const rushingQuestions = responses
            .filter(response => response.timeSpent < rushingThreshold)
            .map(response => response.questionId);
        const slowQuestions = responses
            .filter(response => response.timeSpent > slowThreshold)
            .map(response => response.questionId);
        // Determine if pacing is well-balanced
        const timeVariance = this.calculateTimeVariance(responses, averageTime);
        const isWellPaced = timeVariance < (averageTime * 0.5) && rushingQuestions.length < 3 && slowQuestions.length < 3;
        const recommendations = [];
        if (rushingQuestions.length > 2) {
            recommendations.push('Consider spending more time reading questions carefully to avoid careless mistakes.');
        }
        if (slowQuestions.length > 2) {
            recommendations.push('Practice time management - aim to spend no more than 4-5 minutes per question.');
        }
        if (timeVariance > averageTime) {
            recommendations.push('Work on consistent pacing throughout the exam.');
        }
        if (isWellPaced) {
            recommendations.push('Excellent time management! Your pacing was consistent throughout the exam.');
        }
        return {
            isWellPaced,
            rushingQuestions,
            slowQuestions,
            recommendations
        };
    }
    /**
     * Calculate time variance for pacing analysis
     */
    calculateTimeVariance(responses, averageTime) {
        const squaredDifferences = responses.map(response => Math.pow(response.timeSpent - averageTime, 2));
        const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / responses.length;
        return Math.sqrt(variance);
    }
    /**
     * Generate performance insights and recommendations
     */
    generatePerformanceInsights(examResult, timingAnalysis) {
        const strengths = [];
        const weaknesses = [];
        const recommendations = [];
        const overallScore = this.calculateOverallScore(examResult);
        // Analyze overall performance
        if (overallScore >= 80) {
            strengths.push('Excellent overall performance - you\'re well-prepared for the certification exam.');
        }
        else if (overallScore >= 70) {
            strengths.push('Good overall performance with room for targeted improvement.');
        }
        else {
            weaknesses.push('Overall score needs improvement to meet certification standards.');
            recommendations.push('Focus on comprehensive review of all topics before attempting the certification exam.');
        }
        // Analyze topic performance
        const strongTopics = examResult.topicBreakdown.filter(topic => topic.percentage >= 80);
        const weakTopics = examResult.topicBreakdown.filter(topic => topic.percentage < 70);
        if (strongTopics.length > 0) {
            strengths.push(`Strong performance in: ${strongTopics.map(t => t.topic).join(', ')}`);
        }
        if (weakTopics.length > 0) {
            weaknesses.push(`Needs improvement in: ${weakTopics.map(t => t.topic).join(', ')}`);
            recommendations.push(`Focus additional study time on: ${weakTopics.map(t => t.topic).join(', ')}`);
        }
        // Analyze timing performance
        if (timingAnalysis.pacingAnalysis.isWellPaced) {
            strengths.push('Excellent time management and consistent pacing.');
        }
        else {
            if (timingAnalysis.pacingAnalysis.rushingQuestions.length > 2) {
                weaknesses.push('Tendency to rush through questions too quickly.');
            }
            if (timingAnalysis.pacingAnalysis.slowQuestions.length > 2) {
                weaknesses.push('Spending too much time on difficult questions.');
            }
        }
        // Add timing recommendations
        recommendations.push(...timingAnalysis.pacingAnalysis.recommendations);
        // Topic-specific recommendations
        weakTopics.forEach(topic => {
            switch (topic.topic) {
                case 'Production Pipelines':
                    recommendations.push('Review Delta Live Tables, job scheduling, and error handling scenarios.');
                    break;
                case 'Incremental Data Processing':
                    recommendations.push('Practice merge operations, change data capture, and streaming scenarios.');
                    break;
                case 'Databricks Lakehouse Platform':
                    recommendations.push('Study core platform concepts, architecture, and data management features.');
                    break;
                case 'ELT with Spark SQL and Python':
                    recommendations.push('Practice SQL queries, DataFrame operations, and Python transformations.');
                    break;
                case 'Data Governance':
                    recommendations.push('Review Unity Catalog, access controls, and data lineage concepts.');
                    break;
            }
        });
        return { strengths, weaknesses, recommendations };
    }
    /**
     * Calculate overall score percentage
     */
    calculateOverallScore(examResult) {
        if (examResult.totalQuestions === 0)
            return 0;
        return Math.round((examResult.correctAnswers / examResult.totalQuestions) * 100);
    }
    /**
     * Generate immediate feedback summary for quick review
     */
    generateImmediateFeedback(examResult) {
        const score = this.calculateOverallScore(examResult);
        const passed = score >= 70; // Assuming 70% is passing threshold
        // Find best and worst performing topics
        const sortedTopics = [...examResult.topicBreakdown].sort((a, b) => b.percentage - a.percentage);
        const topPerformingTopic = sortedTopics[0]?.topic || 'N/A';
        const weakestTopic = sortedTopics[sortedTopics.length - 1]?.topic || 'N/A';
        // Format time spent
        const hours = Math.floor(examResult.timeSpent / 3600);
        const minutes = Math.floor((examResult.timeSpent % 3600) / 60);
        const timeSpent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        return {
            score,
            passed,
            correctAnswers: examResult.correctAnswers,
            totalQuestions: examResult.totalQuestions,
            timeSpent,
            topPerformingTopic,
            weakestTopic
        };
    }
    /**
     * Validate exam result data before processing
     */
    validateExamResultForScoring(examResult) {
        const errors = [];
        if (!examResult.id) {
            errors.push('Exam result ID is required');
        }
        if (!examResult.userId) {
            errors.push('User ID is required');
        }
        if (examResult.totalQuestions <= 0) {
            errors.push('Total questions must be greater than 0');
        }
        if (examResult.correctAnswers < 0 || examResult.correctAnswers > examResult.totalQuestions) {
            errors.push('Correct answers must be between 0 and total questions');
        }
        if (!examResult.questions || examResult.questions.length !== examResult.totalQuestions) {
            errors.push('Questions array must match total questions count');
        }
        if (!examResult.topicBreakdown || examResult.topicBreakdown.length === 0) {
            errors.push('Topic breakdown is required for scoring');
        }
        if (examResult.timeSpent < 0) {
            errors.push('Time spent must be non-negative');
        }
        return errors;
    }
}
exports.ScoringService = ScoringService;
//# sourceMappingURL=ScoringService.js.map