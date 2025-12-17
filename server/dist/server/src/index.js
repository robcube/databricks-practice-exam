"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const migrationRunner_1 = require("./utils/migrationRunner");
const questions_1 = __importDefault(require("./routes/questions"));
const exam_sessions_1 = __importDefault(require("./routes/exam-sessions"));
const scoring_1 = __importDefault(require("./routes/scoring"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const progress_tracking_1 = __importDefault(require("./routes/progress-tracking"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const analytics_1 = __importDefault(require("./routes/analytics"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// API routes
app.get('/api', (req, res) => {
    res.json({ message: 'Databricks Practice Exam API' });
});
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/questions', questions_1.default);
app.use('/api/exam-sessions', exam_sessions_1.default);
app.use('/api/scoring', scoring_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/progress-tracking', progress_tracking_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Start server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await (0, database_1.testConnection)();
        if (!dbConnected) {
            console.warn('Failed to connect to database. Server will start without database functionality.');
        }
        // Run database migrations
        if (dbConnected) {
            const migrationRunner = new migrationRunner_1.MigrationRunner();
            await migrationRunner.runAllMigrations();
            console.log('Database migrations completed');
        }
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map