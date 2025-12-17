"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.authenticateToken = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_validator_1 = require("express-validator");
const User_1 = require("../models/User");
const router = express_1.default.Router();
// JWT secret - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
// In-memory user storage (in production, this would be a database)
const users = new Map();
exports.users = users;
// Validation middleware
const validateRegistration = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('name').isLength({ min: 1 }).withMessage('Name is required')
];
const validateLogin = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 1 }).withMessage('Password is required')
];
// Error handling middleware
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
// Generate JWT token
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};
// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        // Add user ID to request object
        req.userId = decoded.userId;
        next();
    });
};
exports.authenticateToken = authenticateToken;
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', validateRegistration, handleValidationErrors, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Check if user already exists
        const existingUser = Array.from(users.values()).find(user => user.email === email);
        if (existingUser) {
            return res.status(409).json({
                error: 'User with this email already exists'
            });
        }
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        // Create new user
        const userData = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email,
            name,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            studyGoals: [],
            examHistory: []
        };
        const user = new User_1.User(userData);
        const validation = user.validate();
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'User validation failed',
                details: validation.errors
            });
        }
        // Store user and password hash
        users.set(user.id, user);
        // In production, store password hash in database
        user.passwordHash = hashedPassword;
        // Generate token
        const token = generateToken(user.id);
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt
            },
            token
        });
    }
    catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({
            error: 'Failed to register user'
        });
    }
});
/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = Array.from(users.values()).find(user => user.email === email);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }
        // Check password
        const passwordHash = user.passwordHash;
        if (!passwordHash) {
            return res.status(500).json({
                error: 'User authentication data not found'
            });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }
        // Update last login
        user.updateLastLogin();
        // Generate token
        const token = generateToken(user.id);
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                lastLoginAt: user.lastLoginAt
            },
            token
        });
    }
    catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({
            error: 'Failed to login user'
        });
    }
});
/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', exports.authenticateToken, (req, res) => {
    // In a more sophisticated system, you might maintain a blacklist of tokens
    // For now, we rely on client-side token removal
    res.json({
        message: 'Logout successful'
    });
});
/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', exports.authenticateToken, (req, res) => {
    try {
        const userId = req.userId;
        const user = users.get(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
                studyGoals: user.studyGoals,
                examHistory: user.examHistory
            }
        });
    }
    catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({
            error: 'Failed to get user profile'
        });
    }
});
/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', exports.authenticateToken, [
    (0, express_validator_1.body)('name').optional().isLength({ min: 1 }).withMessage('Name cannot be empty'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email is required')
], handleValidationErrors, async (req, res) => {
    try {
        const userId = req.userId;
        const user = users.get(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        const { name, email } = req.body;
        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const existingUser = Array.from(users.values()).find(u => u.email === email && u.id !== userId);
            if (existingUser) {
                return res.status(409).json({
                    error: 'Email already in use by another user'
                });
            }
            user.email = email;
        }
        if (name) {
            user.name = name;
        }
        // Validate updated user
        const validation = user.validate();
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'User validation failed',
                details: validation.errors
            });
        }
        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt
            }
        });
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({
            error: 'Failed to update user profile'
        });
    }
});
/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', exports.authenticateToken, [
    (0, express_validator_1.body)('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], handleValidationErrors, async (req, res) => {
    try {
        const userId = req.userId;
        const user = users.get(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        const { currentPassword, newPassword } = req.body;
        // Verify current password
        const passwordHash = user.passwordHash;
        if (!passwordHash) {
            return res.status(500).json({
                error: 'User authentication data not found'
            });
        }
        const isCurrentPasswordValid = await bcrypt_1.default.compare(currentPassword, passwordHash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                error: 'Current password is incorrect'
            });
        }
        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, saltRounds);
        user.passwordHash = newPasswordHash;
        res.json({
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            error: 'Failed to change password'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map