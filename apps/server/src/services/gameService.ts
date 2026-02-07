import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CharacterData {
  name: string;
  class: string;
  level: number;
  exp: number;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  currentHP: number;
  currentMP: number;
}

export interface InventoryItemData {
  itemId: string;
  quantity: number;
}

export interface GameSaveData {
  chapter: number;
  stage: number;
  techDebt: number;
  gold: number;
  playTime: number;
  characters: CharacterData[];
  inventory: InventoryItemData[];
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
    // Update existing session: clear old characters/inventory, write new
    session = await prisma.gameSession.update({
      where: { id: existingSession.id },
      data: {
        chapter: saveData.chapter,
        stage: saveData.stage,
        techDebt: saveData.techDebt,
        gold: saveData.gold,
        playTime: saveData.playTime,
        characters: {
          deleteMany: {},
          create: saveData.characters,
        },
        inventory: {
          deleteMany: {},
          create: saveData.inventory,
        },
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
        gold: saveData.gold,
        playTime: saveData.playTime,
        characters: {
          create: saveData.characters,
        },
        inventory: {
          create: saveData.inventory,
        },
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
    include: {
      characters: true,
      inventory: true,
    },
  });

  if (!session) {
    return null;
  }

  return {
    chapter: session.chapter,
    stage: session.stage,
    techDebt: session.techDebt,
    gold: session.gold,
    playTime: session.playTime,
    characters: session.characters.map((c) => ({
      name: c.name,
      class: c.class,
      level: c.level,
      exp: c.exp,
      hp: c.hp,
      mp: c.mp,
      atk: c.atk,
      def: c.def,
      spd: c.spd,
      currentHP: c.currentHP,
      currentMP: c.currentMP,
    })),
    inventory: session.inventory.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
    })),
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
