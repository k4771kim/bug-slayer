import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';

const app = express();

// Middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Temporary debug endpoint - diagnose auth 500
app.get('/debug/auth-test', async (req, res) => {
  const results: Record<string, unknown> = {};
  try {
    // Test 1: Prisma import
    const { PrismaClient } = await import('@prisma/client');
    results.prismaImport = 'OK';

    // Test 2: Prisma connection
    const prisma = new PrismaClient();
    await prisma.$connect();
    results.prismaConnect = 'OK';

    // Test 3: Query
    const userCount = await prisma.user.count();
    results.userCount = userCount;

    // Test 4: bcrypt
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('test', 10);
    results.bcryptHash = hash ? 'OK' : 'FAIL';

    // Test 5: jwt
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign({ test: true }, env.JWT_SECRET, { expiresIn: '1m' });
    results.jwtSign = token ? 'OK' : 'FAIL';

    await prisma.$disconnect();
    results.overall = 'ALL_PASS';
    res.json(results);
  } catch (err: unknown) {
    const error = err as Error;
    results.error = error.message;
    results.stack = error.stack?.split('\n').slice(0, 5);
    res.status(500).json(results);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = parseInt(env.PORT);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bug Slayer Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 API Endpoints:`);
  console.log(`   - POST /api/auth/register`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - POST /api/auth/logout`);
  console.log(`   - GET  /api/auth/me`);
  console.log(`   - POST /api/game/save`);
  console.log(`   - GET  /api/game/load`);
  console.log(`   - DELETE /api/game/save`);
  console.log(`   - GET  /health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
