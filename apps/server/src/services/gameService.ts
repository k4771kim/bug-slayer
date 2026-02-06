import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface GameSaveData {
  chapter: number;
  stage: number;
  techDebt: number;
  partyData: object;
  inventory: object;
  gold: number;
}

/**
 * Save or update game progress for a user
 */
export async function saveGame(
  userId: string,
  saveData: GameSaveData
): Promise<{ success: boolean; sessionId: string }> {
  // Find existing session for this user
  const existingSession = await prisma.gameSession.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  let session;

  if (existingSession) {
    // Update existing session
    session = await prisma.gameSession.update({
      where: { id: existingSession.id },
      data: {
        chapter: saveData.chapter,
        stage: saveData.stage,
        techDebt: saveData.techDebt,
        partyData: JSON.stringify(saveData.partyData),
        inventory: JSON.stringify(saveData.inventory),
        gold: saveData.gold,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new session
    session = await prisma.gameSession.create({
      data: {
        userId,
        chapter: saveData.chapter,
        stage: saveData.stage,
        techDebt: saveData.techDebt,
        partyData: JSON.stringify(saveData.partyData),
        inventory: JSON.stringify(saveData.inventory),
        gold: saveData.gold,
      },
    });
  }

  return {
    success: true,
    sessionId: session.id,
  };
}

/**
 * Load game progress for a user
 */
export async function loadGame(userId: string): Promise<GameSaveData | null> {
  // Get the most recent session for this user
  const session = await prisma.gameSession.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  if (!session) {
    return null;
  }

  return {
    chapter: session.chapter,
    stage: session.stage,
    techDebt: session.techDebt,
    partyData: JSON.parse(session.partyData),
    inventory: JSON.parse(session.inventory),
    gold: session.gold,
  };
}

/**
 * Delete all game saves for a user
 */
export async function deleteSave(userId: string): Promise<{ success: boolean; deletedCount: number }> {
  const result = await prisma.gameSession.deleteMany({
    where: { userId },
  });

  return {
    success: true,
    deletedCount: result.count,
  };
}
