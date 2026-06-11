import * as THREE from "three";
import type { EnemyRuntime, ExplosionRuntime, ProjectileRuntime, WaveConfig } from "./types";
import { createRadialTexture } from "./textures";

let projectileId = 1;
let enemyId = 1;
let explosionId = 1;

export const attachShipCannons = (ship: THREE.Group) => {
  const cannonMaterial = new THREE.MeshStandardMaterial({
    color: 0x11101a,
    emissive: 0x5aa6bd,
    emissiveIntensity: 0.2,
    metalness: 0.7,
    roughness: 0.24
  });
  const tipMaterial = new THREE.MeshStandardMaterial({
    color: 0x5aa6bd,
    emissive: 0x5aa6bd,
    emissiveIntensity: 0.7,
    roughness: 0.18,
    metalness: 0.1
  });

  for (const x of [-0.54, 0.54]) {
    const cannon = new THREE.Group();
    const barrelGeometry = new THREE.CylinderGeometry(0.055, 0.07, 1.1, 16);
    barrelGeometry.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeometry, cannonMaterial);
    barrel.position.set(x, -0.05, -1.32);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8), tipMaterial);
    tip.position.set(x, -0.05, -1.92);
    cannon.add(barrel, tip);
    cannon.name = "ship-cannon";
    ship.add(cannon);
  }
};

export const createPlayerBolt = (position: THREE.Vector3, direction: THREE.Vector3): ProjectileRuntime => {
  const group = new THREE.Group();
  const normalizedDirection = direction.clone().normalize();
  const core = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.045, 1.08, 6, 14),
    new THREE.MeshBasicMaterial({
      color: 0x9cff7a,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    })
  );
  const beam = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 1.18, 6, 14),
    new THREE.MeshBasicMaterial({
      color: 0x54ff3d,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.072, 0.48, 10),
    new THREE.MeshBasicMaterial({
      color: 0x2fdc45,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  tail.position.y = -0.62;
  group.add(beam, core, tail);
  group.position.copy(position);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDirection);

  return {
    id: projectileId++,
    damage: 1,
    life: 1.45,
    mesh: group,
    owner: "player",
    radius: 0.35,
    velocity: normalizedDirection.multiplyScalar(48)
  };
};

export const createEnemyShot = (position: THREE.Vector3, direction: THREE.Vector3, wave: number): ProjectileRuntime => {
  const group = new THREE.Group();
  const normalizedDirection = direction.clone().normalize();
  const core = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.82, 6, 14),
    new THREE.MeshBasicMaterial({
      color: 0xff2f2f,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    })
  );
  const beam = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.09, 0.92, 6, 14),
    new THREE.MeshBasicMaterial({
      color: 0xff1010,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.088, 0.36, 10),
    new THREE.MeshBasicMaterial({
      color: 0xd74721,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  tail.position.y = -0.5;
  group.add(beam, core, tail);
  group.position.copy(position);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDirection);

  return {
    id: projectileId++,
    damage: 1,
    life: 4.2,
    mesh: group,
    owner: "enemy",
    radius: 0.4,
    velocity: normalizedDirection.multiplyScalar(7.2 + Math.min(wave, 12) * 0.28)
  };
};

export const createEnemyBug = (
  position: THREE.Vector3,
  targetPlanetId: string,
  config: WaveConfig
): EnemyRuntime => {
  const group = new THREE.Group();
  group.position.copy(position);
  group.name = "void-bug";

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x19080f,
    emissive: 0x7a1823,
    emissiveIntensity: 0.48,
    metalness: 0.22,
    roughness: 0.42
  });
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0xff5c2e,
    emissive: 0xd74721,
    emissiveIntensity: 0.62,
    metalness: 0.08,
    roughness: 0.38
  });
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcf65,
    transparent: true,
    opacity: 0.92
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 14), bodyMaterial);
  body.scale.set(1.0, 0.62, 1.55);
  group.add(body);

  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 12), shellMaterial);
  shell.position.z = -0.16;
  shell.scale.set(1.12, 0.38, 1.0);
  group.add(shell);

  for (const x of [-0.28, 0.28]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeMaterial);
    eye.position.set(x, 0.16, -0.58);
    group.add(eye);
  }

  const threatGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createRadialTexture("rgba(255,107,58,1)", "rgba(215,71,33,0)", 0.8),
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  threatGlow.position.set(0, 0, 0.1);
  threatGlow.scale.set(2.2, 2.2, 1);
  group.add(threatGlow);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.86, 8), bodyMaterial);
      leg.position.set(side * (0.34 + i * 0.12), -0.08, -0.18 + i * 0.28);
      leg.rotation.z = side * (Math.PI / 3.5);
      leg.rotation.x = Math.PI / 2.4;
      group.add(leg);
    }
  }

  const light = new THREE.PointLight(0xd74721, 1.05, 7.5);
  light.position.set(0, 0.1, -0.3);
  group.add(light);
  group.scale.setScalar(1.08);

  return {
    id: enemyId++,
    attackCooldown: config.attackCooldown,
    body,
    group,
    hp: config.enemyHp,
    maxHp: config.enemyHp,
    pattern: config.pattern,
    speed: config.enemySpeed,
    state: "raiding",
    targetPlanetId
  };
};

export const createExplosion = (
  position: THREE.Vector3,
  color = 0xd74721,
  particleCount = 18,
  scale = 1
): ExplosionRuntime => {
  const group = new THREE.Group();
  group.position.copy(position);
  const velocity: THREE.Vector3[] = [];
  const material = new THREE.SpriteMaterial({
    map: createRadialTexture("rgba(255,207,101,1)", "rgba(215,71,33,0)", 0.8),
    color,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < particleCount; i += 1) {
    const sprite = new THREE.Sprite(material.clone());
    const angle = (i / particleCount) * Math.PI * 2;
    const height = ((i % 5) - 2) * 0.18;
    const speed = (2.5 + (i % 7) * 0.55) * scale;
    const direction = new THREE.Vector3(Math.cos(angle), height, Math.sin(angle)).normalize();
    sprite.scale.setScalar((0.45 + (i % 4) * 0.14) * scale);
    group.add(sprite);
    velocity.push(direction.multiplyScalar(speed));
  }

  const flash = new THREE.PointLight(color, 2.2 * scale, 12 * scale);
  group.add(flash);
  velocity.push(new THREE.Vector3());

  return {
    id: explosionId++,
    group,
    life: 0.72,
    maxLife: 0.72,
    velocity
  };
};

export const disposeObject = (object: THREE.Object3D) => {
  object.traverse((entry) => {
    if (entry instanceof THREE.Mesh || entry instanceof THREE.Points || entry instanceof THREE.Line || entry instanceof THREE.Sprite) {
      entry.geometry?.dispose();
      const material = entry.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material?.dispose();
      }
    }
  });
};
