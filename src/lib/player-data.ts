import { NBTCompound, NBTValue, getVal, getCompound } from "./nbt-parser";
import { DIMENSION_NAMES, GAME_MODES } from "./minecraft-data";

export interface InventoryItem {
  slot: number;
  id: string;
  count: number;
  tag?: Record<string, unknown>;
  customName?: string;
  enchantments?: { id: string; level: number }[];
  damage?: number;
  rawNBT?: NBTCompound;
}

export interface PlayerAttributes {
  name: string;
  base: number;
}

export interface PlayerData {
  // Identity
  uuid?: string;
  customName?: string;

  // Vitals
  health: number;
  maxHealth: number;
  foodLevel: number;
  foodSaturation: number;
  air: number;
  maxAir: number;
  score: number;

  // XP
  xpLevel: number;
  xpTotal: number;
  xpProgress: number;

  // Position
  posX: number;
  posY: number;
  posZ: number;
  yaw: number;
  pitch: number;
  dimension: string;

  // Game state
  gameMode: number;
  spawnX?: number;
  spawnY?: number;
  spawnZ?: number;
  spawnDimension?: string;
  playerGameType?: number;

  // Inventory
  inventory: InventoryItem[];
  armorSlots: (InventoryItem | null)[];
  offhand?: InventoryItem;
  selectedItemSlot: number;

  // Effects
  activeEffects: {
    id: string;
    amplifier: number;
    duration: number;
    ambient: boolean;
    showParticles: boolean;
  }[];

  // Abilities
  flying: boolean;
  mayFly: boolean;
  invulnerable: boolean;
  mayBuild: boolean;
  instaBuild: boolean;
  flySpeed: number;
  walkSpeed: number;

  // Death / misc
  deathTime: number;
  hurtTime: number;
  fallDistance: number;
  fire: number;
  onGround: boolean;
  age?: bigint;
  seenCredits?: boolean;
  recipeBook?: {
    isFilteringCraftable: boolean;
    isGuiOpen: boolean;
  };

  // Attributes
  attributes: PlayerAttributes[];
}

function parseItem(compound: NBTCompound): InventoryItem {
  const slot = getVal<number>(compound, "Slot") ?? 0;
  // NBT item structure differs by version
  // Modern (1.20.5+): uses "id", "count", "components"
  // Legacy: uses "id", "Count", "Damage", "tag"
  const id = getVal<string>(compound, "id") ?? "minecraft:air";
  const count =
    getVal<number>(compound, "Count") ??
    getVal<number>(compound, "count") ??
    1;
  let damage =
    getVal<number>(compound, "Damage") ??
    getVal<number>(compound, "damage") ??
    0;

  // Try to extract enchantments from tag
  const nbtTag = getCompound(compound, "tag");
  let enchantments: { id: string; level: number }[] = [];
  let customName: string | undefined;

  if (nbtTag) {
    // Enchantments
    const enchList =
      (getVal(nbtTag, "Enchantments") as NBTCompound[] | undefined) ??
      (getVal(nbtTag, "ench") as NBTCompound[] | undefined);
    if (Array.isArray(enchList)) {
      enchantments = enchList.map((e) => {
        const enchCompound = e as NBTCompound;
        return {
          id:
            (getVal<string>(enchCompound, "id") ?? String(getVal(enchCompound, "id") ?? "")) ||
            "unknown",
          level: getVal<number>(enchCompound, "lvl") ?? getVal<number>(enchCompound, "level") ?? 1,
        };
      });
    }

    // Custom name
    const display = getCompound(nbtTag, "display");
    if (display) {
      const name = getVal<string>(display, "Name");
      if (name) {
        try {
          const parsed = JSON.parse(name);
          customName = typeof parsed === "string" ? parsed : parsed.text ?? name;
        } catch {
          customName = name;
        }
      }
    }
  }

  // Also check components for modern format (1.20.5+)
  const components = getCompound(compound, "components");
  if (components) {
    // Custom name
    const customNameComp = getVal<string>(components, "minecraft:custom_name");
    if (customNameComp && !customName) {
      try {
        const parsed = JSON.parse(customNameComp);
        customName = typeof parsed === "string" ? parsed : parsed.text ?? customNameComp;
      } catch {
        customName = customNameComp;
      }
    }

    // Damage stored in components (1.20.5+ — no top-level Damage tag)
    const dmgComp = getVal<number>(components, "minecraft:damage");
    if (dmgComp !== undefined && damage === 0) damage = dmgComp;

    // Enchantments: try minecraft:enchantments first, then minecraft:stored_enchantments (books)
    // Format changed in 1.21.2: old = { levels: { id: level } }, new = { id: level } directly
    const enchComp =
      getCompound(components, "minecraft:enchantments") ??
      getCompound(components, "minecraft:stored_enchantments");
    if (enchComp && enchantments.length === 0) {
      // 1.20.5–1.21.1: wrapped in a "levels" sub-compound
      const levels = getCompound(enchComp, "levels");
      if (levels) {
        enchantments = Object.entries(levels).map(([id, entry]) => ({
          id,
          level: (entry as { type: number; value: NBTValue }).value as number,
        }));
      } else {
        // 1.21.2+: enchantment IDs are direct keys; skip non-enchantment fields
        enchantments = Object.entries(enchComp)
          .filter(([k]) => k.includes(":") && k !== "show_in_tooltip")
          .map(([id, entry]) => ({
            id,
            level: (entry as { type: number; value: NBTValue }).value as number,
          }));
      }
    }
  }

  return { slot, id, count, damage, enchantments, customName, rawNBT: compound };
}

export function extractPlayerData(nbt: NBTCompound): PlayerData {
  // The root compound from Minecraft playerdata contains a nested compound
  // with the actual player data

  // Try to get max health from attributes
  let maxHealth = 20;
  const attributes = getVal<NBTCompound[]>(nbt, "Attributes") ?? [];
  const attrParsed: PlayerAttributes[] = [];
  if (Array.isArray(attributes)) {
    for (const attr of attributes) {
      const name = getVal<string>(attr as NBTCompound, "Name") ?? "";
      const base = getVal<number>(attr as NBTCompound, "Base") ?? 0;
      attrParsed.push({ name, base });
      if (name === "minecraft:generic.max_health" || name === "generic.maxHealth") {
        maxHealth = base;
      }
    }
  }

  // Parse inventory
  const rawInventory = getVal<NBTCompound[]>(nbt, "Inventory") ?? [];
  const inventory: InventoryItem[] = [];
  const armorSlots: (InventoryItem | null)[] = [null, null, null, null]; // boots, leggings, chest, helmet
  let offhand: InventoryItem | undefined;

  if (Array.isArray(rawInventory)) {
    for (const rawItem of rawInventory) {
      const item = parseItem(rawItem as NBTCompound);
      if (item.id === "minecraft:air") continue;

      if (item.slot === -106) {
        // Offhand
        offhand = item;
      } else if (item.slot >= 100 && item.slot <= 103) {
        // Armor: 100=boots, 101=leggings, 102=chest, 103=helmet
        armorSlots[item.slot - 100] = item;
      } else {
        inventory.push(item);
      }
    }
  }

  // Active effects
  const rawEffects = getVal<NBTCompound[]>(nbt, "active_effects") ??
    getVal<NBTCompound[]>(nbt, "ActiveEffects") ?? [];
  const activeEffects = Array.isArray(rawEffects)
    ? rawEffects.map((e) => {
        const ec = e as NBTCompound;
        return {
          id: getVal<string>(ec, "id") ?? getVal<string>(ec, "Id") ?? "unknown",
          amplifier: getVal<number>(ec, "amplifier") ?? getVal<number>(ec, "Amplifier") ?? 0,
          duration: getVal<number>(ec, "duration") ?? getVal<number>(ec, "Duration") ?? 0,
          ambient: !!(getVal<number>(ec, "ambient") ?? getVal<number>(ec, "Ambient") ?? 0),
          showParticles: !!(getVal<number>(ec, "show_particles") ?? getVal<number>(ec, "ShowParticles") ?? 1),
        };
      })
    : [];

  // Position
  const posList = getVal<number[]>(nbt, "Pos") ?? [0, 64, 0];
  const rotList = getVal<number[]>(nbt, "Rotation") ?? [0, 0];
  const yaw = Array.isArray(rotList) ? Number(rotList[0]) : 0;
  const pitch = Array.isArray(rotList) ? Number(rotList[1]) : 0;
  const abilities = getCompound(nbt, "abilities");

  // Spawn
  const spawnX = getVal<number>(nbt, "SpawnX");
  const spawnY = getVal<number>(nbt, "SpawnY");
  const spawnZ = getVal<number>(nbt, "SpawnZ");
  const spawnDimension = getVal<string>(nbt, "SpawnDimension");

  // Dimension
  const dimensionRaw = getVal<string>(nbt, "Dimension") ?? getVal<number>(nbt, "Dimension") ?? 0;
  const dimension = DIMENSION_NAMES[String(dimensionRaw)] ?? String(dimensionRaw);

  // Game mode
  const gameMode = getVal<number>(nbt, "playerGameType") ?? 0;

  // Recipe book
  const recipeBookRaw = getCompound(nbt, "recipeBook");
  const recipeBook = recipeBookRaw
    ? {
        isFilteringCraftable: !!(getVal<number>(recipeBookRaw, "isFilteringCraftable") ?? 0),
        isGuiOpen: !!(getVal<number>(recipeBookRaw, "isGuiOpen") ?? 0),
      }
    : undefined;

  // UUID
  const uuidArray = getVal<number[]>(nbt, "UUID");
  let uuid: string | undefined;
  if (Array.isArray(uuidArray) && uuidArray.length === 4) {
    const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
    uuid = `${toHex(uuidArray[0])}-${toHex(uuidArray[1]).slice(0, 4)}-${toHex(uuidArray[1]).slice(4)}-${toHex(uuidArray[2]).slice(0, 4)}-${toHex(uuidArray[2]).slice(4)}${toHex(uuidArray[3])}`;
  }

  return {
    uuid,
    health: getVal<number>(nbt, "Health") ?? 0,
    maxHealth,
    foodLevel: getVal<number>(nbt, "foodLevel") ?? 0,
    foodSaturation: getVal<number>(nbt, "foodSaturationLevel") ?? 0,
    air: getVal<number>(nbt, "Air") ?? 300,
    maxAir: 300,
    score: getVal<number>(nbt, "Score") ?? 0,
    xpLevel: getVal<number>(nbt, "XpLevel") ?? 0,
    xpTotal: getVal<number>(nbt, "XpTotal") ?? 0,
    xpProgress: getVal<number>(nbt, "XpP") ?? 0,
    posX: Array.isArray(posList) ? Number(posList[0]) : 0,
    posY: Array.isArray(posList) ? Number(posList[1]) : 0,
    posZ: Array.isArray(posList) ? Number(posList[2]) : 0,
    yaw,
    pitch,
    dimension,
    gameMode,
    spawnX,
    spawnY,
    spawnZ,
    spawnDimension: spawnDimension
      ? (DIMENSION_NAMES[spawnDimension] ?? spawnDimension)
      : undefined,
    inventory,
    armorSlots,
    offhand,
    selectedItemSlot: getVal<number>(nbt, "SelectedItemSlot") ?? 0,
    activeEffects,
    flying: !!(abilities ? getVal<number>(abilities, "flying") : 0),
    mayFly: !!(abilities ? getVal<number>(abilities, "mayfly") : 0),
    invulnerable: !!(abilities ? getVal<number>(abilities, "invulnerable") : 0),
    mayBuild: !!(abilities ? getVal<number>(abilities, "mayBuild") ?? 1 : 1),
    instaBuild: !!(abilities ? getVal<number>(abilities, "instabuild") : 0),
    flySpeed: abilities ? getVal<number>(abilities, "flySpeed") ?? 0.05 : 0.05,
    walkSpeed: abilities ? getVal<number>(abilities, "walkSpeed") ?? 0.1 : 0.1,
    deathTime: getVal<number>(nbt, "DeathTime") ?? 0,
    hurtTime: getVal<number>(nbt, "HurtTime") ?? 0,
    fallDistance: getVal<number>(nbt, "FallDistance") ?? 0,
    fire: getVal<number>(nbt, "Fire") ?? 0,
    onGround: !!(getVal<number>(nbt, "OnGround") ?? 1),
    age: getVal<bigint>(nbt, "playerGameType") !== undefined
      ? undefined
      : undefined,
    seenCredits: !!(getVal<number>(nbt, "seenCredits") ?? 0),
    recipeBook,
    attributes: attrParsed,
    GAME_MODES,
  } as unknown as PlayerData;
}
