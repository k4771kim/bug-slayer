import express, { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    // Validate request body
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      displayName: z.string().min(2, 'Display name must be at least 2 characters'),
    });

    const data = schema.parse(req.body);

    // Register user
    const result = await authService.register(
      data.email,
      data.password,
      data.displayName
    );

    // Set httpOnly cookie with JWT token
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data with token (for cross-origin clients that can't use cookies)
    res.status(201).json({ user: result.user, token: result.token });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login an existing user
 */
router.post('/login', async (req, res, next) => {
  try {
    // Validate request body
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    });

    const data = schema.parse(req.body);

    // Login user
    const result = await authService.login(data.email, data.password);

    // Set httpOnly cookie with JWT token
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data with token (for cross-origin clients that can't use cookies)
    res.json({ user: result.user, token: result.token });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error('UNAUTHORIZED');
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user by clearing httpOnly cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  res.json({ success: true });
});

export default router;
