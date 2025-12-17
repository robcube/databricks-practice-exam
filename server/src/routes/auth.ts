import express, { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { User as UserModel } from '../models/User';

const router = express.Router();

// JWT secret - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// In-memory user storage (in production, this would be a database)
const users: Map<string, UserModel> = new Map();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 1 }).withMessage('Name is required')
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
];

// Error handling middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET as string, { expiresIn: '24h' });
};

// Verify JWT token middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET as string, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Add user ID to request object
    (req as any).userId = decoded.userId;
    next();
  });
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', validateRegistration, handleValidationErrors, async (req: Request, res: Response) => {
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
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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

    const user = new UserModel(userData);
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
    (user as any).passwordHash = hashedPassword;

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
  } catch (error) {
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
router.post('/login', validateLogin, handleValidationErrors, async (req: Request, res: Response) => {
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
    const passwordHash = (user as any).passwordHash;
    if (!passwordHash) {
      return res.status(500).json({
        error: 'User authentication data not found'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, passwordHash);
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
  } catch (error) {
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
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
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
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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
  } catch (error) {
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
router.put('/profile', authenticateToken, [
  body('name').optional().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required')
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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
  } catch (error) {
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
router.post('/change-password', authenticateToken, [
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = users.get(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const passwordHash = (user as any).passwordHash;
    if (!passwordHash) {
      return res.status(500).json({
        error: 'User authentication data not found'
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    (user as any).passwordHash = newPasswordHash;

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      error: 'Failed to change password'
    });
  }
});

// Export the users map for testing purposes
export { users };

export default router;