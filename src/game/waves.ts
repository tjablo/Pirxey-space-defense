import * as THREE from "three";
import type { AttackPatternKind, PlanetRuntime, WaveConfig } from "./types";

export const getWaveConfig = (wave: number): WaveConfig => {
  const pattern: AttackPatternKind = wave >= 9 ? "wave" : wave >= 5 ? "burst" : "single";
  return {
    attackCooldown: Math.max(1.9, 4.8 - Math.floor(wave / 3) * 0.35),
    count: Math.min(6 + Math.floor(wave * 1.45), 34),
    deathStarCount: wave >= 5 ? Math.min(1 + Math.floor((wave - 5) / 5), 3) : 0,
    enemyHp: 1 + Math.floor(wave / 4),
    enemySpeed: 2.7 + Math.min(wave, 16) * 0.12,
    groups: wave >= 7 ? 3 : wave >= 3 ? 2 : 1,
    pattern
  };
};

export const chooseWaveTarget = (planets: PlanetRuntime[], wave: number) => {
  return planets[(wave - 1) % planets.length];
};

export const createSpawnPosition = (target: THREE.Vector3, wave: number, index: number, count: number) => {
  const angle = (index / Math.max(1, count)) * Math.PI * 2 + wave * 0.73;
  const radius = 22 + (index % 5) * 2.4 + Math.min(wave, 12) * 0.7;
  const height = ((index % 3) - 1) * 2.7;
  return target
    .clone()
    .add(new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius));
};
