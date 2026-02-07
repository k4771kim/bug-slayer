import express, { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as gameService from '../services/gameService';

const router: Router = express.Router();

// Validation schema for game save data
const gameSaveSchema = z.object({
  saveData: z.object({
    chapter: z.number().int().min(1),
    stage: z.number().int().min(1),
    techDebt: z.number().int().min(0),
    gold: z.number().int().min(0),
    playTime: z.number().int().min(0),
    characters: z.array(z.object({
      name: z.string(),
      class: z.string(),
      level: z.number().int().min(1),
      exp: z.number().int().min(0),
      hp: z.number().int(),
      mp: z.number().int(),
      atk: z.number().int(),
      def: z.number().int(),
      spd: z.number().int(),
      currentHP: z.number().int(),
      currentMP: z.number().int(),
    })),
    inventory: z.array(z.object({
      itemId: z.string(),
      quantity: z.number().int().min(1),
    })),
  }),
});

/**
 * POST /api/game/save
 * Save game progress (requires authentication)
 */
router.post('/save', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validation = gameSaveSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid save data format',
          details: validation.error.issues,
        },
      });
      return;
    }

    const { saveData } = validation.data;
    const userId = req.user!.userId;

    // Save game progress
    const result = await gameService.saveGame(userId, saveData);

    res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      message: 'Game progress saved successfully',
    });
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({
      error: {
        code: 'SAVE_FAILED',
        message: 'Failed to save game progress',
      },
    });
  }
});

/**
 * GET /api/game/load
 * Load game progress (requires authentication)
 */
router.get('/load', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Load game progress
    const saveData = await gameService.loadGame(userId);

    if (!saveData) {
      res.status(404).json({
        error: {
          code: 'NO_SAVE_FOUND',
          message: 'No saved game found for this user',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      saveData,
    });
  } catch (error) {
    console.error('Error loading game:', error);
    res.status(500).json({
      error: {
        code: 'LOAD_FAILED',
        message: 'Failed to load game progress',
      },
    });
  }
});

/**
 * DELETE /api/game/save
 * Delete game save (requires authentication)
 */
router.delete('/save', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Delete save data
    const result = await gameService.deleteSave(userId);

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: 'Game save deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting save:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete game save',
      },
    });
  }
});

export default router;
