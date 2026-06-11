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
    cooldown: 0.18,
    description: "Standard green defense bolts. Reliable, but built for early waves."
  },
  "pulse-laser": {
    id: "pulse-laser",
    name: "Pulse Laser",
    slot: "primary",
    price: 90,
    cooldown: 0.1,
    description: "Fast focused laser fire with high projectile speed and clean aim feedback."
  },
  "twin-cannons": {
    id: "twin-cannons",
    name: "Twin Cannons",
    slot: "primary",
    price: 135,
    cooldown: 0.18,
    description: "Two synchronized side guns mounted on the left and right side of the scout."
  },
  "rail-splitter": {
    id: "rail-splitter",
    name: "Rail Splitter",
    slot: "primary",
    price: 170,
    cooldown: 0.28,
    description: "Heavy precise primary shot with stronger impact damage."
  },
  "rapid-repeater": {
    id: "rapid-repeater",
    name: "Rapid Repeater",
    slot: "primary",
    price: 155,
    cooldown: 0.07,
    description: "Light rapid-fire primary weapon for close defensive sweeps."
  },
  "homing-missiles": {
    id: "homing-missiles",
    name: "Homing Missiles",
    slot: "secondary",
    price: 165,
    cooldown: 0.92,
    description: "Right-click missile that tracks a hostile and can clip one target packed tightly nearby."
  },
  "plasma-orb": {
    id: "plasma-orb",
    name: "Plasma Orb",
    slot: "secondary",
    price: 185,
    cooldown: 1.1,
    description: "Slow unstable orb that bursts after a short flight and damages a nearby cluster."
  },
  "arc-pulse": {
    id: "arc-pulse",
    name: "Arc Pulse",
    slot: "secondary",
    price: 225,
    cooldown: 2.4,
    description: "Close-range electric impulse around the ship that destroys nearby hostiles."
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
