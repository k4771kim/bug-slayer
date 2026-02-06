import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import type { User } from '@bug-slayer/shared';

const prisma = new PrismaClient();

/**
 * Register a new user
 */
export async function register(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: Omit<User, 'password'>; token: string }> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  // Hash password with bcrypt (salt rounds: 10)
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user in database
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      displayName,
    },
  });

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions
  );

  // Return user (without password) and token
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
}

/**
 * Login an existing user
 */
export async function login(
  email: string,
  password: string
): Promise<{ user: Omit<User, 'password'>; token: string }> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions
  );

  // Return user (without password) and token
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
