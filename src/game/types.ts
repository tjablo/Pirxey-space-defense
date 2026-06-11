import type * as THREE from "three";
import type { ServicePlanet } from "../data/services";
import type { WeaponId } from "./weapons";

export type FlightMode = "Manual" | "Autopilot" | "Docked";

export type Telemetry = {
  speed: number;
  distance: number | null;
  targetName: string;
  mode: FlightMode;
};

export type NearbyService = {
  id: string;
  name: string;
  distance: number;
  canDock: boolean;
};

export type PlanetRuntime = {
  service: ServicePlanet;
  orbit: THREE.Object3D;
  body: THREE.Mesh;
  group: THREE.Group;
  ring: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  worldPosition: THREE.Vector3;
  health: number;
  destroyed: boolean;
  maxHealth: number;
};

export type CombatHud = {
  enemies: number;
  planetHealth: number;
  phase: "Awaiting" | "Exploring" | "Countdown" | "Running" | "Paused" | "Game over";
  roundCountdown: number | null;
  score: number;
  threat: string;
  wave: number;
};

export type SceneBridge = {
  flyTo: (id: string) => void;
  dockCurrent: () => void;
  releaseDock: () => void;
};

export type AttackPatternKind = "single" | "burst" | "wave";

export type EnemyRuntime = {
  id: number;
  group: THREE.Group;
  body: THREE.Object3D;
  targetPlanetId: string;
  state: "raiding" | "aggro";
  hp: number;
  maxHp: number;
  speed: number;
  attackCooldown: number;
  pattern: AttackPatternKind;
};

export type ProjectileOwner = "player" | "enemy";

export type ProjectileRuntime = {
  id: number;
  mesh: THREE.Object3D;
  owner: ProjectileOwner;
  velocity: THREE.Vector3;
  life: number;
  damage: number;
  radius: number;
  age?: number;
  blastRadius?: number;
  detonateOnExpire?: boolean;
  homing?: boolean;
  impactColor?: number;
  targetEnemyId?: number;
  turnRate?: number;
  weaponId?: WeaponId;
};

export type ExplosionRuntime = {
  id: number;
  group: THREE.Group;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3[];
};

export type WaveConfig = {
  attackCooldown: number;
  count: number;
  enemyHp: number;
  enemySpeed: number;
  groups: number;
  pattern: AttackPatternKind;
};
