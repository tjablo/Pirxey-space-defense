export type WeaponSlot = "primary" | "secondary";

export type WeaponId =
  | "scout-bolts"
  | "pulse-laser"
  | "twin-cannons"
  | "rail-splitter"
  | "rapid-repeater"
  | "homing-missiles"
  | "plasma-orb"
  | "arc-pulse";

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  slot: WeaponSlot;
  price: number;
  ammoCapacity: number | null;
  cooldown: number;
  description: string;
};

export const DEFAULT_PRIMARY_WEAPON: WeaponId = "scout-bolts";
export const DEFAULT_OWNED_WEAPONS: WeaponId[] = [DEFAULT_PRIMARY_WEAPON];

export const WEAPON_CATALOG: Record<WeaponId, WeaponDefinition> = {
  "scout-bolts": {
    id: "scout-bolts",
    name: "Scout Bolts",
    slot: "primary",
    price: 0,
    ammoCapacity: null,
    cooldown: 0.32,
    description: "Infinite fallback bolts with steady damage."
  },
  "pulse-laser": {
    id: "pulse-laser",
    name: "Pulse Laser",
    slot: "primary",
    price: 180,
    ammoCapacity: 420,
    cooldown: 0.1,
    description: "Fast focused laser with clean long-range aim."
  },
  "twin-cannons": {
    id: "twin-cannons",
    name: "Twin Cannons",
    slot: "primary",
    price: 220,
    ammoCapacity: 240,
    cooldown: 0.18,
    description: "Dual side guns for wider forward fire."
  },
  "rail-splitter": {
    id: "rail-splitter",
    name: "Star Spiral Laser",
    slot: "primary",
    price: 260,
    ammoCapacity: 160,
    cooldown: 0.2,
    description: "Rotating spiral laser for dense targets."
  },
  "rapid-repeater": {
    id: "rapid-repeater",
    name: "Rapid Repeater",
    slot: "primary",
    price: 240,
    ammoCapacity: 420,
    cooldown: 0.07,
    description: "Rapid primary fire for close defense."
  },
  "homing-missiles": {
    id: "homing-missiles",
    name: "Homing Missiles",
    slot: "secondary",
    price: 280,
    ammoCapacity: 22,
    cooldown: 0.92,
    description: "Tracking missiles for priority targets."
  },
  "plasma-orb": {
    id: "plasma-orb",
    name: "Plasma Orb",
    slot: "secondary",
    price: 320,
    ammoCapacity: 20,
    cooldown: 1.1,
    description: "Slow orb that bursts into cluster damage."
  },
  "arc-pulse": {
    id: "arc-pulse",
    name: "Arc Pulse",
    slot: "secondary",
    price: 350,
    ammoCapacity: 8,
    cooldown: 2.4,
    description: "Close-range pulse against nearby hostiles."
  }
};

export const PLANET_WEAPON_OFFERS: Record<string, WeaponId> = {
  frontend: "pulse-laser",
  backend: "twin-cannons",
  "ai-native": "homing-missiles",
  crypto: "plasma-orb",
  cloud: "arc-pulse",
  "custom-ai": "rail-splitter",
  "rapid-ai": "rapid-repeater"
};

export const getPlanetWeaponOffer = (planetId: string) => WEAPON_CATALOG[PLANET_WEAPON_OFFERS[planetId]];

export const getOwnedWeaponsBySlot = (ownedWeaponIds: WeaponId[], slot: WeaponSlot) =>
  ownedWeaponIds.map((id) => WEAPON_CATALOG[id]).filter((weapon) => weapon.slot === slot);
