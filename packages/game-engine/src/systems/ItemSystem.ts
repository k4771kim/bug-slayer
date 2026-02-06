/**
 * ItemSystem - Item and Inventory Management
 *
 * Handles:
 * - Inventory management (add, remove, use items)
 * - Drop system (loot table rolls)
 * - Equipment management
 * - Consumable usage (potions, buffs)
 *
 * Item types:
 * - weapon: Weapons with ATK bonuses
 * - armor: Armor with DEF bonuses
 * - accessory: Accessories with various stat bonuses
 * - consumable: Potions, buffs (one-time use)
 */

import type { Item, Character, LootTable, LootDrop } from '@bug-slayer/shared';

export interface UseItemResult {
  success: boolean;
  message: string;
  hpRestored?: number;
  mpRestored?: number;
  itemConsumed?: boolean;
}

export interface DropResult {
  items: Item[];
  exp: number;
  gold: number;
}

/**
 * ItemSystem class manages inventory and item operations
 */
export class ItemSystem {
  private character: Character;
  private itemDatabase: Map<string, Item> = new Map();

  constructor(character: Character) {
    this.character = character;
  }

  /**
   * Register items to the database (for drop system)
   */
  registerItem(item: Item): void {
    this.itemDatabase.set(item.id, item);
  }

  /**
   * Register multiple items
   */
  registerItems(items: Item[]): void {
    items.forEach(item => this.registerItem(item));
  }

  /**
   * Get item from database by ID
   */
  getItemById(itemId: string): Item | null {
    return this.itemDatabase.get(itemId) || null;
  }

  /**
   * Add item to inventory
   */
  addItem(item: Item): boolean {
    // Check if inventory has space (max 99 items)
    if (this.character.inventory.length >= 99) {
      return false;
    }

    this.character.inventory.push(item);
    return true;
  }

  /**
   * Remove item from inventory by ID
   */
  removeItem(itemId: string): boolean {
    const index = this.character.inventory.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    this.character.inventory.splice(index, 1);
    return true;
  }

  /**
   * Remove item from inventory by index
   */
  removeItemAt(index: number): Item | null {
    if (index < 0 || index >= this.character.inventory.length) {
      return null;
    }

    const item = this.character.inventory[index]!;
    this.character.inventory.splice(index, 1);
    return item;
  }

  /**
   * Count items of specific type in inventory
   */
  countItem(itemId: string): number {
    return this.character.inventory.filter(item => item.id === itemId).length;
  }

  /**
   * Check if inventory has item
   */
  hasItem(itemId: string): boolean {
    return this.character.inventory.some(item => item.id === itemId);
  }

  /**
   * Get inventory slots used/total
   */
  getInventoryInfo(): { used: number; max: number } {
    return {
      used: this.character.inventory.length,
      max: 99,
    };
  }

  /**
   * Equip weapon
   */
  equipWeapon(item: Item): boolean {
    if (item.type !== 'weapon') return false;

    // Unequip current weapon (return to inventory)
    if (this.character.equipment.weapon) {
      this.addItem(this.character.equipment.weapon);
    }

    // Remove from inventory
    this.removeItem(item.id);

    // Equip new weapon
    this.character.equipment.weapon = item;

    // Apply stat bonuses
    this.applyEquipmentBonus(item);

    return true;
  }

  /**
   * Equip armor
   */
  equipArmor(item: Item): boolean {
    if (item.type !== 'armor') return false;

    if (this.character.equipment.armor) {
      this.addItem(this.character.equipment.armor);
    }

    this.removeItem(item.id);
    this.character.equipment.armor = item;
    this.applyEquipmentBonus(item);

    return true;
  }

  /**
   * Equip accessory
   */
  equipAccessory(item: Item): boolean {
    if (item.type !== 'accessory') return false;

    if (this.character.equipment.accessory) {
      this.addItem(this.character.equipment.accessory);
    }

    this.removeItem(item.id);
    this.character.equipment.accessory = item;
    this.applyEquipmentBonus(item);

    return true;
  }

  /**
   * Unequip item by slot
   */
  unequipSlot(slot: 'weapon' | 'armor' | 'accessory'): boolean {
    const item = this.character.equipment[slot];
    if (!item) return false;

    // Return to inventory
    if (!this.addItem(item)) {
      return false; // Inventory full
    }

    // Remove stat bonuses
    this.removeEquipmentBonus(item);

    // Unequip
    this.character.equipment[slot] = undefined;

    return true;
  }

  /**
   * Apply equipment stat bonuses
   */
  private applyEquipmentBonus(item: Item): void {
    if (!item.statBonus) return;

    if (item.statBonus.HP) this.character.stats.HP += item.statBonus.HP;
    if (item.statBonus.ATK) this.character.stats.ATK += item.statBonus.ATK;
    if (item.statBonus.DEF) this.character.stats.DEF += item.statBonus.DEF;
    if (item.statBonus.SPD) this.character.stats.SPD += item.statBonus.SPD;
    if (item.statBonus.MP) this.character.stats.MP += item.statBonus.MP;
  }

  /**
   * Remove equipment stat bonuses
   */
  private removeEquipmentBonus(item: Item): void {
    if (!item.statBonus) return;

    if (item.statBonus.HP) this.character.stats.HP -= item.statBonus.HP;
    if (item.statBonus.ATK) this.character.stats.ATK -= item.statBonus.ATK;
    if (item.statBonus.DEF) this.character.stats.DEF -= item.statBonus.DEF;
    if (item.statBonus.SPD) this.character.stats.SPD -= item.statBonus.SPD;
    if (item.statBonus.MP) this.character.stats.MP -= item.statBonus.MP;
  }

  /**
   * Use consumable item
   */
  useItem(item: Item): UseItemResult {
    if (item.type !== 'consumable') {
      return {
        success: false,
        message: 'This item cannot be used',
      };
    }

    let hpRestored = 0;
    let mpRestored = 0;

    // Apply effects
    if (item.effects) {
      for (const effect of item.effects) {
        switch (effect.type) {
          case 'heal':
            // Check if it's MP restoration via stat property
            if (effect.stat === 'MP') {
              mpRestored = effect.value;
              this.character.currentMP = Math.min(
                this.character.stats.MP,
                this.character.currentMP + effect.value
              );
            } else {
              // Default to HP restoration
              hpRestored = effect.value;
              this.character.currentHP = Math.min(
                this.character.stats.HP,
                this.character.currentHP + effect.value
              );
            }
            break;

          case 'buff':
            // TODO: Implement buff system
            break;

          case 'debuff':
            // TODO: Implement debuff system
            break;

          case 'dot':
            // TODO: Implement damage over time
            break;

          case 'damage':
          case 'special':
            // Not applicable for consumables
            break;
        }
      }
    }

    // Remove item from inventory (consumable)
    this.removeItem(item.id);

    return {
      success: true,
      message: `Used ${item.name}`,
      hpRestored,
      mpRestored,
      itemConsumed: true,
    };
  }

  /**
   * Roll for loot drops based on loot table
   */
  rollLoot(lootTable: LootTable): DropResult {
    const droppedItems: Item[] = [];

    // Roll for each item in loot table
    for (const drop of lootTable.items) {
      const roll = Math.random() * 100;
      if (roll <= drop.dropRate) {
        const item = this.getItemById(drop.itemId);
        if (item) {
          droppedItems.push(item);
        }
      }
    }

    return {
      items: droppedItems,
      exp: lootTable.exp,
      gold: lootTable.gold,
    };
  }

  /**
   * Add drops to inventory and return overflow
   */
  collectDrops(drops: DropResult): { collected: Item[]; overflow: Item[] } {
    const collected: Item[] = [];
    const overflow: Item[] = [];

    for (const item of drops.items) {
      if (this.addItem(item)) {
        collected.push(item);
      } else {
        overflow.push(item);
      }
    }

    return { collected, overflow };
  }

  /**
   * Sort inventory by type and rarity
   */
  sortInventory(): void {
    const typeOrder = { weapon: 1, armor: 2, accessory: 3, consumable: 4 };
    const rarityOrder = { epic: 1, rare: 2, common: 3 };

    this.character.inventory.sort((a, b) => {
      // First by type
      const typeCompare = typeOrder[a.type] - typeOrder[b.type];
      if (typeCompare !== 0) return typeCompare;

      // Then by rarity
      const rarityCompare = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityCompare !== 0) return rarityCompare;

      // Finally by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get items by type
   */
  getItemsByType(type: 'weapon' | 'armor' | 'accessory' | 'consumable'): Item[] {
    return this.character.inventory.filter(item => item.type === type);
  }

  /**
   * Get total value of inventory
   */
  getInventoryValue(): number {
    return this.character.inventory.reduce((total, item) => total + item.price, 0);
  }
}
