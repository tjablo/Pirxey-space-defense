import * as THREE from "three";
import type { EnemyRuntime, ExplosionRuntime, ProjectileRuntime, WaveConfig } from "./types";
import type { WeaponId } from "./weapons";
import { createRadialTexture } from "./textures";

let projectileId = 1;
let enemyId = 1;
let explosionId = 1;

const SHARED_RESOURCE = "__pirxeySharedResource";

const markShared = <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(resource: T) => {
  resource.userData[SHARED_RESOURCE] = true;
  return resource;
};

const isShared = (resource: THREE.BufferGeometry | THREE.Material | null | undefined) =>
  Boolean(resource?.userData[SHARED_RESOURCE]);

type PlayerBoltAssets = {
  beamGeometry: THREE.CapsuleGeometry;
  beamMaterial: THREE.MeshBasicMaterial;
  coreGeometry: THREE.CapsuleGeometry;
  coreMaterial: THREE.MeshBasicMaterial;
  tailGeometry: THREE.CylinderGeometry;
  tailMaterial: THREE.MeshBasicMaterial;
};

type EnemyShotAssets = {
  beamGeometry: THREE.CapsuleGeometry;
  beamMaterial: THREE.MeshBasicMaterial;
  coreGeometry: THREE.CapsuleGeometry;
  coreMaterial: THREE.MeshBasicMaterial;
  tailGeometry: THREE.CylinderGeometry;
  tailMaterial: THREE.MeshBasicMaterial;
};

type LaserAssets = {
  beamGeometry: THREE.CapsuleGeometry;
  beamMaterial: THREE.MeshBasicMaterial;
  coreGeometry: THREE.CapsuleGeometry;
  coreMaterial: THREE.MeshBasicMaterial;
};

type MissileAssets = {
  bodyGeometry: THREE.CylinderGeometry;
  bodyMaterial: THREE.MeshStandardMaterial;
  noseGeometry: THREE.ConeGeometry;
  noseMaterial: THREE.MeshBasicMaterial;
  flareMaterial: THREE.SpriteMaterial;
};

type PlasmaAssets = {
  coreGeometry: THREE.SphereGeometry;
  coreMaterial: THREE.MeshBasicMaterial;
  shellGeometry: THREE.SphereGeometry;
  shellMaterial: THREE.MeshBasicMaterial;
  haloMaterial: THREE.SpriteMaterial;
  ringGeometry: THREE.TorusGeometry;
  ringMaterial: THREE.MeshBasicMaterial;
};

type EnemyBugAssets = {
  bodyGeometry: THREE.SphereGeometry;
  bodyMaterial: THREE.MeshStandardMaterial;
  eyeGeometry: THREE.SphereGeometry;
  eyeMaterial: THREE.MeshBasicMaterial;
  legGeometry: THREE.CylinderGeometry;
  shellGeometry: THREE.SphereGeometry;
  shellMaterial: THREE.MeshStandardMaterial;
  threatGlowMaterial: THREE.SpriteMaterial;
};

let playerBoltAssets: PlayerBoltAssets | null = null;
let enemyShotAssets: EnemyShotAssets | null = null;
let laserAssets: LaserAssets | null = null;
let missileAssets: MissileAssets | null = null;
let plasmaAssets: PlasmaAssets | null = null;
let enemyBugAssets: EnemyBugAssets | null = null;

const getPlayerBoltAssets = () => {
  if (!playerBoltAssets) {
    playerBoltAssets = {
      beamGeometry: markShared(new THREE.CapsuleGeometry(0.075, 1.18, 6, 14)),
      beamMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0x54ff3d,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      ),
      coreGeometry: markShared(new THREE.CapsuleGeometry(0.045, 1.08, 6, 14)),
      coreMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0x9cff7a,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        })
      ),
      tailGeometry: markShared(new THREE.CylinderGeometry(0.022, 0.072, 0.48, 10)),
      tailMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0x2fdc45,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
    };
  }

  return playerBoltAssets;
};

const getLaserAssets = () => {
  if (!laserAssets) {
    laserAssets = {
      beamGeometry: markShared(new THREE.CapsuleGeometry(0.045, 1.72, 6, 14)),
      beamMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0x40ff74,
          transparent: true,
          opacity: 0.54,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      ),
      coreGeometry: markShared(new THREE.CapsuleGeometry(0.024, 1.62, 6, 14)),
      coreMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0xcaffb8,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        })
      )
    };
  }

  return laserAssets;
};

const getMissileAssets = () => {
  if (!missileAssets) {
    const flareTexture = createRadialTexture("rgba(255,207,101,1)", "rgba(215,71,33,0)", 0.75);
    missileAssets = {
      bodyGeometry: markShared(new THREE.CylinderGeometry(0.09, 0.12, 0.82, 14)),
      bodyMaterial: markShared(
        new THREE.MeshStandardMaterial({
          color: 0xdedede,
          emissive: 0x5aa6bd,
          emissiveIntensity: 0.18,
          metalness: 0.72,
          roughness: 0.28
        })
      ),
      noseGeometry: markShared(new THREE.ConeGeometry(0.12, 0.28, 14)),
      noseMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0xffcf65
        })
      ),
      flareMaterial: markShared(
        new THREE.SpriteMaterial({
          map: flareTexture,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
    };
  }

  return missileAssets;
};

const getPlasmaAssets = () => {
  if (!plasmaAssets) {
    plasmaAssets = {
      coreGeometry: markShared(new THREE.SphereGeometry(0.48, 32, 20)),
      coreMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0xe8fff9,
          transparent: true,
          opacity: 0.96,
          blending: THREE.AdditiveBlending
        })
      ),
      shellGeometry: markShared(new THREE.SphereGeometry(0.72, 32, 20)),
      shellMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0x35f7dc,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      ),
      haloMaterial: markShared(
        new THREE.SpriteMaterial({
          map: createRadialTexture("rgba(125,255,234,1)", "rgba(90,166,189,0)", 0.85),
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      ),
      ringGeometry: markShared(new THREE.TorusGeometry(0.82, 0.028, 10, 72)),
      ringMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0x7dffea,
          transparent: true,
          opacity: 0.58,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
    };
  }

  return plasmaAssets;
};

const getEnemyShotAssets = () => {
  if (!enemyShotAssets) {
    enemyShotAssets = {
      beamGeometry: markShared(new THREE.CapsuleGeometry(0.09, 0.92, 6, 14)),
      beamMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0xff1010,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      ),
      coreGeometry: markShared(new THREE.CapsuleGeometry(0.055, 0.82, 6, 14)),
      coreMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0xff2f2f,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        })
      ),
      tailGeometry: markShared(new THREE.CylinderGeometry(0.026, 0.088, 0.36, 10)),
      tailMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0xd74721,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
    };
  }

  return enemyShotAssets;
};

const getEnemyBugAssets = () => {
  if (!enemyBugAssets) {
    enemyBugAssets = {
      bodyGeometry: markShared(new THREE.SphereGeometry(0.55, 24, 14)),
      bodyMaterial: markShared(
        new THREE.MeshStandardMaterial({
          color: 0x19080f,
          emissive: 0x7a1823,
          emissiveIntensity: 0.48,
          metalness: 0.22,
          roughness: 0.42
        })
      ),
      eyeGeometry: markShared(new THREE.SphereGeometry(0.075, 10, 8)),
      eyeMaterial: markShared(
        new THREE.MeshBasicMaterial({
          color: 0xffcf65,
          transparent: true,
          opacity: 0.92
        })
      ),
      legGeometry: markShared(new THREE.CylinderGeometry(0.025, 0.035, 0.86, 8)),
      shellGeometry: markShared(new THREE.SphereGeometry(0.48, 20, 12)),
      shellMaterial: markShared(
        new THREE.MeshStandardMaterial({
          color: 0xff5c2e,
          emissive: 0xd74721,
          emissiveIntensity: 0.62,
          metalness: 0.08,
          roughness: 0.38
        })
      ),
      threatGlowMaterial: markShared(
        new THREE.SpriteMaterial({
          map: createRadialTexture("rgba(255,107,58,1)", "rgba(215,71,33,0)", 0.8),
          transparent: true,
          opacity: 0.48,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
    };
  }

  return enemyBugAssets;
};

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
  const assets = getPlayerBoltAssets();
  const core = new THREE.Mesh(assets.coreGeometry, assets.coreMaterial);
  const beam = new THREE.Mesh(assets.beamGeometry, assets.beamMaterial);
  const tail = new THREE.Mesh(assets.tailGeometry, assets.tailMaterial);
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
    velocity: normalizedDirection.multiplyScalar(48),
    weaponId: "scout-bolts"
  };
};

export const createPlayerLaser = (
  position: THREE.Vector3,
  direction: THREE.Vector3,
  weaponId: WeaponId = "pulse-laser"
): ProjectileRuntime => {
  const group = new THREE.Group();
  const normalizedDirection = direction.clone().normalize();
  const assets = getLaserAssets();
  const core = new THREE.Mesh(assets.coreGeometry, assets.coreMaterial);
  const beam = new THREE.Mesh(assets.beamGeometry, assets.beamMaterial);
  group.add(beam, core);
  group.position.copy(position);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDirection);

  return {
    id: projectileId++,
    damage: weaponId === "rail-splitter" ? 2.6 : weaponId === "rapid-repeater" ? 0.72 : 0.86,
    life: weaponId === "rail-splitter" ? 1.1 : 0.82,
    mesh: group,
    owner: "player",
    radius: weaponId === "rail-splitter" ? 0.42 : 0.26,
    velocity: normalizedDirection.multiplyScalar(weaponId === "rail-splitter" ? 68 : 74),
    weaponId
  };
};

export const createHomingMissile = (
  position: THREE.Vector3,
  direction: THREE.Vector3,
  targetEnemyId: number | null
): ProjectileRuntime => {
  const group = new THREE.Group();
  const normalizedDirection = direction.clone().normalize();
  const assets = getMissileAssets();
  const body = new THREE.Mesh(assets.bodyGeometry, assets.bodyMaterial);
  const nose = new THREE.Mesh(assets.noseGeometry, assets.noseMaterial);
  const flare = new THREE.Sprite(assets.flareMaterial);
  const finMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcf65,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  body.rotation.x = Math.PI / 2;
  body.scale.set(1.18, 1.18, 1.28);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.52;
  flare.position.z = 0.58;
  flare.scale.set(1.15, 1.15, 1);
  for (const x of [-0.16, 0.16]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.18), finMaterial.clone());
    fin.position.set(x, 0, 0.24);
    group.add(fin);
  }
  const light = new THREE.PointLight(0xffcf65, 1.5, 8);
  light.position.z = 0.35;
  group.add(body, nose, flare, light);
  group.position.copy(position);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), normalizedDirection);

  return {
    id: projectileId++,
    blastRadius: 5.4,
    damage: 12,
    homing: true,
    impactColor: 0xffcf65,
    life: 4.5,
    mesh: group,
    owner: "player",
    radius: 0.8,
    targetEnemyId: targetEnemyId ?? undefined,
    turnRate: 8.2,
    velocity: normalizedDirection.multiplyScalar(34),
    weaponId: "homing-missiles"
  };
};

export const createPlasmaOrb = (position: THREE.Vector3, direction: THREE.Vector3): ProjectileRuntime => {
  const group = new THREE.Group();
  const normalizedDirection = direction.clone().normalize();
  const assets = getPlasmaAssets();
  const core = new THREE.Mesh(assets.coreGeometry, assets.coreMaterial);
  const shell = new THREE.Mesh(assets.shellGeometry, assets.shellMaterial);
  const halo = new THREE.Sprite(assets.haloMaterial);
  const ringA = new THREE.Mesh(assets.ringGeometry, assets.ringMaterial);
  const ringB = new THREE.Mesh(assets.ringGeometry, assets.ringMaterial.clone());
  const light = new THREE.PointLight(0x7dffea, 3.4, 12);
  ringA.rotation.x = Math.PI / 2;
  ringB.rotation.y = Math.PI / 2.35;
  halo.scale.set(3.1, 3.1, 1);
  group.add(shell, core, ringA, ringB, halo, light);
  group.position.copy(position);

  return {
    id: projectileId++,
    blastRadius: 8.6,
    damage: 10.5,
    detonateOnExpire: true,
    impactColor: 0x7dffea,
    life: 1.05,
    mesh: group,
    owner: "player",
    radius: 1.05,
    velocity: normalizedDirection.multiplyScalar(25),
    weaponId: "plasma-orb"
  };
};

export const createEnemyShot = (position: THREE.Vector3, direction: THREE.Vector3, wave: number): ProjectileRuntime => {
  const group = new THREE.Group();
  const normalizedDirection = direction.clone().normalize();
  const assets = getEnemyShotAssets();
  const core = new THREE.Mesh(assets.coreGeometry, assets.coreMaterial);
  const beam = new THREE.Mesh(assets.beamGeometry, assets.beamMaterial);
  const tail = new THREE.Mesh(assets.tailGeometry, assets.tailMaterial);
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
  const assets = getEnemyBugAssets();
  group.position.copy(position);
  group.name = "void-bug";

  const body = new THREE.Mesh(assets.bodyGeometry, assets.bodyMaterial);
  body.scale.set(1.0, 0.62, 1.55);
  group.add(body);

  const shell = new THREE.Mesh(assets.shellGeometry, assets.shellMaterial);
  shell.position.z = -0.16;
  shell.scale.set(1.12, 0.38, 1.0);
  group.add(shell);

  for (const x of [-0.28, 0.28]) {
    const eye = new THREE.Mesh(assets.eyeGeometry, assets.eyeMaterial);
    eye.position.set(x, 0.16, -0.58);
    group.add(eye);
  }

  const threatGlow = new THREE.Sprite(assets.threatGlowMaterial);
  threatGlow.position.set(0, 0, 0.1);
  threatGlow.scale.set(2.2, 2.2, 1);
  group.add(threatGlow);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const leg = new THREE.Mesh(assets.legGeometry, assets.bodyMaterial);
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

  const shockwave = new THREE.Mesh(
    new THREE.RingGeometry(0.55 * scale, 1.0 * scale, 96),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  shockwave.rotation.x = Math.PI / 2;
  group.add(shockwave);
  velocity.push(new THREE.Vector3());

  const coreFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.36 * scale, 24, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  group.add(coreFlash);
  velocity.push(new THREE.Vector3());

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
      if (!isShared(entry.geometry)) {
        entry.geometry?.dispose();
      }
      const material = entry.material;
      if (Array.isArray(material)) {
        material.forEach((item) => {
          if (!isShared(item)) {
            item.dispose();
          }
        });
      } else if (!isShared(material)) {
        material?.dispose();
      }
    }
  });
};
