import {
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  Coins,
  Compass,
  Crosshair,
  Gauge,
  ListChecks,
  Pause,
  Play,
  MousePointer2,
  Navigation,
  Radio,
  RotateCcw,
  Rocket,
  ShoppingBag,
  Telescope,
  Target,
  Volume2,
  VolumeX,
  X,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { ServicePlanet } from "../data/services";
import { createGameAudio } from "../game/audio";
import {
  attachShipCannons,
  createDeathStarBoss,
  createEnemyBug,
  createEnemyShot,
  createExplosion,
  createHomingMissile,
  createPlasmaOrb,
  createPlayerBolt,
  createPlayerLaser,
  createRuntimeWarmupGroup,
  disposeObject
} from "../game/factories";
import { SOUNDTRACK_URLS } from "../game/soundtrack";
import type { CombatHud, EnemyRuntime, ExplosionRuntime, ProjectileRuntime } from "../game/types";
import { createSpawnPosition, getWaveConfig } from "../game/waves";
import {
  DEFAULT_OWNED_WEAPONS,
  DEFAULT_PRIMARY_WEAPON,
  getOwnedWeaponsBySlot,
  getPlanetWeaponOffer,
  WEAPON_CATALOG
} from "../game/weapons";
import type { WeaponId } from "../game/weapons";

type FlightMode = "Manual" | "Autopilot" | "Docked";

type SpaceExperienceProps = {
  services: ServicePlanet[];
};

type Telemetry = {
  speed: number;
  distance: number | null;
  targetName: string;
  mode: FlightMode;
};

type NearbyService = {
  id: string;
  name: string;
  distance: number;
  canDock: boolean;
};

type CameraMode = "Drag aim" | "Mouse aim";

type TouchFlightInput = {
  ascend: boolean;
  boost: boolean;
  brake: boolean;
  descend: boolean;
  pitchDown: boolean;
  pitchUp: boolean;
  primaryFire: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  secondaryFire: boolean;
  thrust: boolean;
  yawLeft: boolean;
  yawRight: boolean;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type PlanetHudItem = {
  id: string;
  name: string;
  health: number;
  destroyed: boolean;
};

type WeaponAmmoState = Partial<Record<WeaponId, number>>;

type PlanetRuntime = {
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

type SceneBridge = {
  flyTo: (id: string) => void;
  dockCurrent: () => void;
  releaseDock: () => void;
  toggleCameraMode: () => void;
  warmupRuntimeAssets: () => void;
};

declare global {
  interface Window {
    __pirxeySpaceDebug?: {
      sampleCanvas: () => {
        avgRgbSum: number;
        height: number;
        litRatio: number;
        maxRgbSum: number;
        sampleH: number;
        sampleW: number;
        width: number;
      };
    };
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const createTouchFlightInput = (): TouchFlightInput => ({
  ascend: false,
  boost: false,
  brake: false,
  descend: false,
  pitchDown: false,
  pitchUp: false,
  primaryFire: false,
  rollLeft: false,
  rollRight: false,
  secondaryFire: false,
  thrust: false,
  yawLeft: false,
  yawRight: false
});

const randomFromSeed = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const mixColor = (a: string, b: string, amount: number) => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * amount);
  const g = Math.round(ca.g + (cb.g - ca.g) * amount);
  const blue = Math.round(ca.b + (cb.b - ca.b) * amount);
  return `rgb(${r}, ${g}, ${blue})`;
};

const createPlanetTexture = (service: ServicePlanet, index: number, width = 1024) => {
  const textureHeight = Math.round(width / 2);
  const detailRatio = width / 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = textureHeight;
  const ctx = canvas.getContext("2d")!;
  const random = randomFromSeed(1100 + index * 71);
  const [primary, secondary, shadow] = service.colors;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, primary);
  gradient.addColorStop(0.48, mixColor(primary, secondary, 0.45));
  gradient.addColorStop(1, shadow);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < Math.round(28 * detailRatio); i += 1) {
    const y = random() * canvas.height;
    const height = 10 + random() * 42;
    const alpha = 0.08 + random() * 0.2;
    ctx.fillStyle = random() > 0.5 ? `rgba(255, 249, 228, ${alpha})` : `rgba(7, 4, 17, ${alpha})`;
    ctx.fillRect(0, y, canvas.width, height);
  }

  for (let i = 0; i < Math.round(900 * detailRatio); i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = random() * 2.5;
    const alpha = 0.04 + random() * 0.12;
    ctx.beginPath();
    ctx.fillStyle = random() > 0.5 ? `rgba(255, 255, 235, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < Math.round(24 * detailRatio); i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 5 + random() * 20;
    const crater = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
    crater.addColorStop(0, "rgba(255,255,230,0.12)");
    crater.addColorStop(0.48, "rgba(10,6,22,0.1)");
    crater.addColorStop(1, "rgba(10,6,22,0)");
    ctx.fillStyle = crater;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
};

const createSunTexture = (width = 1024) => {
  const textureHeight = Math.round(width / 2);
  const detailRatio = width / 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = textureHeight;
  const ctx = canvas.getContext("2d")!;
  const random = randomFromSeed(7744);

  const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0, "#fff1a6");
  base.addColorStop(0.42, "#ffcf65");
  base.addColorStop(0.72, "#f47a2d");
  base.addColorStop(1, "#aa230f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < Math.round(120 * detailRatio); i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 30 + random() * 130;
    const plasma = ctx.createRadialGradient(x, y, radius * 0.06, x, y, radius);
    plasma.addColorStop(0, "rgba(255,255,218,0.45)");
    plasma.addColorStop(0.38, "rgba(255,207,101,0.2)");
    plasma.addColorStop(1, "rgba(255,90,28,0)");
    ctx.fillStyle = plasma;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * (0.65 + random() * 1.2), radius * (0.2 + random() * 0.55), random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < Math.round(34 * detailRatio); i += 1) {
    const y = random() * canvas.height;
    const height = 4 + random() * 18;
    ctx.fillStyle = `rgba(103, 25, 15, ${0.04 + random() * 0.08})`;
    ctx.fillRect(0, y, canvas.width, height);
  }

  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < Math.round(1800 * detailRatio); i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    ctx.fillStyle = random() > 0.68 ? "rgba(255,255,230,0.24)" : "rgba(92,18,10,0.14)";
    ctx.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
};

const createRadialTexture = (inner: string, outer: string, alpha = 1) => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(256, 256, 8, 256, 256, 256);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.34, inner.replace("1)", `${alpha * 0.62})`));
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createOrbitLine = (radius: number, inclination: number) => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 256; i += 1) {
    const angle = (i / 256) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xe6e6c9,
    transparent: true,
    opacity: 0.18
  });
  const line = new THREE.LineLoop(geometry, material);
  line.rotation.x = inclination;
  return line;
};

const createStarField = (count: number, radius: number, size: number, color: number) => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorObj = new THREE.Color(color);
  const random = randomFromSeed(count + Math.round(radius * 9));

  for (let i = 0; i < count; i += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const distance = radius * (0.35 + random() * 0.65);
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * distance;
    positions[i * 3 + 1] = Math.cos(phi) * distance * 0.72;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * distance;

    const intensity = 0.55 + random() * 0.45;
    colors[i * 3] = colorObj.r * intensity;
    colors[i * 3 + 1] = colorObj.g * intensity;
    colors[i * 3 + 2] = colorObj.b * intensity;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: createRadialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)", 0.9),
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
};

const createShip = () => {
  const ship = new THREE.Group();
  ship.name = "Pirxey scout ship";
  ship.rotation.order = "YXZ";

  const cream = new THREE.MeshStandardMaterial({
    color: 0xf9f9ea,
    roughness: 0.48,
    metalness: 0.28
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x090711,
    roughness: 0.45,
    metalness: 0.65
  });
  const ember = new THREE.MeshStandardMaterial({
    color: 0xd74721,
    emissive: 0xd74721,
    emissiveIntensity: 0.55,
    roughness: 0.32,
    metalness: 0.2
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x6fb5c8,
    roughness: 0.06,
    metalness: 0.1,
    transmission: 0.4,
    transparent: true,
    opacity: 0.78
  });

  const bodyGeometry = new THREE.CylinderGeometry(0.46, 0.62, 3.1, 28, 1);
  bodyGeometry.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeometry, cream);
  body.castShadow = true;
  ship.add(body);

  const noseGeometry = new THREE.ConeGeometry(0.48, 1.15, 32);
  noseGeometry.rotateX(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeometry, cream);
  nose.position.z = -2.1;
  nose.castShadow = true;
  ship.add(nose);

  const cockpitGeometry = new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const cockpit = new THREE.Mesh(cockpitGeometry, glass);
  cockpit.position.set(0, 0.36, -0.92);
  cockpit.scale.set(1.15, 0.52, 1.2);
  ship.add(cockpit);

  const engineGeometry = new THREE.CylinderGeometry(0.66, 0.58, 0.55, 32);
  engineGeometry.rotateX(Math.PI / 2);
  const engine = new THREE.Mesh(engineGeometry, dark);
  engine.position.z = 1.82;
  ship.add(engine);

  const coreGeometry = new THREE.CylinderGeometry(0.28, 0.2, 0.62, 24);
  coreGeometry.rotateX(Math.PI / 2);
  const core = new THREE.Mesh(coreGeometry, ember);
  core.position.z = 2.12;
  ship.add(core);

  const wingShape = new THREE.BufferGeometry();
  wingShape.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0.42, -0.03, -0.12,
        2.0, -0.1, 1.2,
        0.58, -0.03, 1.46,
        0.42, -0.03, -0.12,
        0.58, -0.03, 1.46,
        0.54, -0.16, 0.58
      ],
      3
    )
  );
  wingShape.computeVertexNormals();

  const leftWing = new THREE.Mesh(wingShape, dark);
  const rightWing = leftWing.clone();
  rightWing.scale.x = -1;
  ship.add(leftWing, rightWing);

  const stripeGeometry = new THREE.BoxGeometry(0.08, 0.06, 2.2);
  const stripeA = new THREE.Mesh(stripeGeometry, ember);
  stripeA.position.set(0.26, 0.44, 0.05);
  const stripeB = stripeA.clone();
  stripeB.position.x = -0.26;
  ship.add(stripeA, stripeB);

  const glowTexture = createRadialTexture("rgba(255,207,101,1)", "rgba(215,71,33,0)", 0.85);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffcf65,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  glow.name = "engine-flame-halo";
  glow.position.z = 2.55;
  glow.scale.set(2.4, 2.4, 1);
  ship.add(glow);

  const outerFlameMaterial = new THREE.MeshBasicMaterial({
    color: 0xd74721,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const outerFlameGeometry = new THREE.ConeGeometry(0.46, 1, 32, 1, true);
  outerFlameGeometry.rotateX(Math.PI / 2);
  const outerFlame = new THREE.Mesh(outerFlameGeometry, outerFlameMaterial);
  outerFlame.name = "engine-flame-outer";
  outerFlame.position.z = 2.7;
  outerFlame.visible = false;
  ship.add(outerFlame);

  const innerFlameMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff1a6,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const innerFlameGeometry = new THREE.ConeGeometry(0.2, 1, 24, 1, true);
  innerFlameGeometry.rotateX(Math.PI / 2);
  const innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial);
  innerFlame.name = "engine-flame-inner";
  innerFlame.position.z = 2.66;
  innerFlame.visible = false;
  ship.add(innerFlame);

  const engineLight = new THREE.PointLight(0xd74721, 0, 18);
  engineLight.name = "engine-flame-light";
  engineLight.position.z = 2.4;
  ship.add(engineLight);

  ship.scale.setScalar(0.78);
  ship.position.set(0, 4, 18);
  return ship;
};

const formatDistance = (value: number | null) => {
  if (value === null) {
    return "--";
  }
  return `${Math.max(0, value).toFixed(1)} au`;
};

const PLANET_CODES: Record<string, string> = {
  "ai-native": "AI",
  backend: "BE",
  cloud: "CD",
  crypto: "BC",
  "custom-ai": "CA",
  frontend: "FE",
  "rapid-ai": "RA"
};

const getPlanetCode = (planet: PlanetHudItem) =>
  PLANET_CODES[planet.id] ??
  planet.name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const PLAYER_MAX_HEALTH = 100;
const WEAPON_SHOP_DISTANCE = 7.4;

const getWeaponAmmo = (weaponId: WeaponId | null, ammo: WeaponAmmoState) => {
  if (!weaponId) {
    return 0;
  }
  const weapon = WEAPON_CATALOG[weaponId];
  if (!weapon) {
    return 0;
  }
  return weapon.ammoCapacity === null ? Number.POSITIVE_INFINITY : ammo[weaponId] ?? 0;
};

const formatWeaponAmmo = (weaponId: WeaponId | null, ammo: WeaponAmmoState) => {
  if (!weaponId) {
    return "0";
  }
  const value = getWeaponAmmo(weaponId, ammo);
  return Number.isFinite(value) ? `${Math.max(0, Math.floor(value))}` : "INF";
};

const createCombatHudState = (phase: CombatHud["phase"]): CombatHud => ({
  enemies: 0,
  phase,
  planetHealth: 100,
  roundCountdown: null,
  score: 0,
  threat: phase === "Exploring" ? "Exploration mode" : "Scanning",
  wave: 0
});

export function SpaceExperience({ services }: SpaceExperienceProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const bridgeRef = useRef<SceneBridge | null>(null);
  const selectedIdRef = useRef(services[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(services[0]?.id ?? "");
  const [telemetry, setTelemetry] = useState<Telemetry>({
    speed: 0,
    distance: null,
    targetName: services[0]?.name ?? "No target",
    mode: "Manual"
  });
  const [nearby, setNearby] = useState<NearbyService | null>(null);
  const [dockedService, setDockedService] = useState<ServicePlanet | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("Drag aim");
  const [showControls, setShowControls] = useState(false);
  const [showDestinations, setShowDestinations] = useState(false);
  const [destroyedPlanetIds, setDestroyedPlanetIds] = useState<string[]>([]);
  const [matchId, setMatchId] = useState(0);
  const [initialMatchPhase, setInitialMatchPhase] = useState<CombatHud["phase"]>("Awaiting");
  const [credits, setCredits] = useState(0);
  const creditsRef = useRef(0);
  const [ownedWeaponIds, setOwnedWeaponIds] = useState<WeaponId[]>(DEFAULT_OWNED_WEAPONS);
  const ownedWeaponIdsRef = useRef<Set<WeaponId>>(new Set(DEFAULT_OWNED_WEAPONS));
  const [primaryWeaponId, setPrimaryWeaponId] = useState<WeaponId>(DEFAULT_PRIMARY_WEAPON);
  const primaryWeaponIdRef = useRef<WeaponId>(DEFAULT_PRIMARY_WEAPON);
  const [secondaryWeaponId, setSecondaryWeaponId] = useState<WeaponId | null>(null);
  const secondaryWeaponIdRef = useRef<WeaponId | null>(null);
  const [weaponAmmo, setWeaponAmmo] = useState<WeaponAmmoState>({});
  const weaponAmmoRef = useRef<WeaponAmmoState>({});
  const buyOrEquipWeaponRef = useRef<(weaponId: WeaponId) => void>(() => undefined);
  const [shipHealth, setShipHealth] = useState(PLAYER_MAX_HEALTH);
  const [planetHud, setPlanetHud] = useState<PlanetHudItem[]>(() =>
    services.map((service) => ({
      destroyed: false,
      health: 100,
      id: service.id,
      name: service.name
    }))
  );
  const [combatHud, setCombatHud] = useState<CombatHud>(() => createCombatHudState("Awaiting"));
  const [gamePhase, setGamePhase] = useState<CombatHud["phase"]>("Awaiting");
  const gamePhaseRef = useRef<CombatHud["phase"]>("Awaiting");
  const phaseBeforePauseRef = useRef<CombatHud["phase"]>("Running");
  const audioRef = useRef(createGameAudio());
  const [audioMuted, setAudioMuted] = useState(() => audioRef.current.isMuted());
  const touchInputRef = useRef<TouchFlightInput>(createTouchFlightInput());

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    setDestroyedPlanetIds([]);
    setPlanetHud(
      services.map((service) => ({
        destroyed: false,
        health: 100,
        id: service.id,
        name: service.name
      }))
    );
    setDockedService(null);
    setNearby(null);
    setCameraMode("Drag aim");
    setShowDestinations(false);
    touchInputRef.current = createTouchFlightInput();
    setShipHealth(PLAYER_MAX_HEALTH);
    creditsRef.current = 0;
    setCredits(0);
    ownedWeaponIdsRef.current = new Set(DEFAULT_OWNED_WEAPONS);
    setOwnedWeaponIds(DEFAULT_OWNED_WEAPONS);
    primaryWeaponIdRef.current = DEFAULT_PRIMARY_WEAPON;
    setPrimaryWeaponId(DEFAULT_PRIMARY_WEAPON);
    secondaryWeaponIdRef.current = null;
    setSecondaryWeaponId(null);
    weaponAmmoRef.current = {};
    setWeaponAmmo({});
    setCombatHud(createCombatHudState(initialMatchPhase));
    gamePhaseRef.current = initialMatchPhase;
    setGamePhase(initialMatchPhase);
  }, [initialMatchPhase, matchId, services]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedId) ?? services[0],
    [selectedId, services]
  );
  const ownedPrimaryWeapons = useMemo(() => getOwnedWeaponsBySlot(ownedWeaponIds, "primary"), [ownedWeaponIds]);
  const ownedSecondaryWeapons = useMemo(() => getOwnedWeaponsBySlot(ownedWeaponIds, "secondary"), [ownedWeaponIds]);
  const activeSecondaryWeapon = secondaryWeaponId ? WEAPON_CATALOG[secondaryWeaponId] : null;
  const activePrimaryWeapon = WEAPON_CATALOG[primaryWeaponId] ?? WEAPON_CATALOG[DEFAULT_PRIMARY_WEAPON];
  const primaryAmmoLabel = formatWeaponAmmo(primaryWeaponId, weaponAmmo);
  const secondaryAmmoLabel = activeSecondaryWeapon ? formatWeaponAmmo(activeSecondaryWeapon.id, weaponAmmo) : "0";
  const showCombatHud =
    gamePhase === "Countdown" ||
    gamePhase === "Running" ||
    gamePhase === "Game over" ||
    (gamePhase === "Paused" && combatHud.enemies > 0);
  const showPlanetRoster =
    gamePhase === "Countdown" ||
    gamePhase === "Running" ||
    gamePhase === "Game over" ||
    (gamePhase === "Paused" && combatHud.enemies > 0);
  const isBattleStarted = gamePhase === "Countdown" || gamePhase === "Running" || gamePhase === "Paused";
  const canUseNavigation = gamePhase === "Awaiting" || gamePhase === "Exploring";
  const nearbyWeaponOffer = useMemo(() => {
    if (!isBattleStarted || gamePhase === "Paused" || !nearby || nearby.distance > WEAPON_SHOP_DISTANCE) {
      return null;
    }
    const weapon = getPlanetWeaponOffer(nearby.id);
    if (!weapon) {
      return null;
    }
    return {
      planetId: nearby.id,
      planetName: nearby.name,
      weapon
    };
  }, [gamePhase, isBattleStarted, nearby]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    creditsRef.current = credits;
  }, [credits]);

  useEffect(() => {
    ownedWeaponIdsRef.current = new Set(ownedWeaponIds);
  }, [ownedWeaponIds]);

  useEffect(() => {
    primaryWeaponIdRef.current = primaryWeaponId;
  }, [primaryWeaponId]);

  useEffect(() => {
    secondaryWeaponIdRef.current = secondaryWeaponId;
  }, [secondaryWeaponId]);

  useEffect(() => {
    weaponAmmoRef.current = weaponAmmo;
  }, [weaponAmmo]);

  useEffect(() => {
    audioRef.current.setMuted(audioMuted);
  }, [audioMuted]);

  useEffect(() => {
    const preloadAudio = () => {
      audioRef.current.preload();
      audioRef.current.primeSoundtrack(SOUNDTRACK_URLS);
    };
    const idleWindow = window as Window & {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preloadAudio, { timeout: 2200 });
      return () => {
        idleWindow.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(preloadAudio, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isBattleStarted) {
      audioRef.current.stopSoundtrack();
    }
  }, [isBattleStarted]);

  useEffect(() => {
    if (!canUseNavigation) {
      setShowDestinations(false);
    }
  }, [canUseNavigation]);

  useEffect(() => {
    const preventGameBrowserEvent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node) || !shellRef.current?.contains(target)) {
        return;
      }
      event.preventDefault();
    };
    const listenerOptions: AddEventListenerOptions = { passive: false };
    const documentEvents = ["contextmenu", "selectstart", "dragstart", "copy", "cut", "dblclick"] as const;
    const windowEvents = ["gesturestart", "gesturechange", "gestureend"] as const;

    documentEvents.forEach((eventName) => {
      document.addEventListener(eventName, preventGameBrowserEvent, listenerOptions);
    });
    windowEvents.forEach((eventName) => {
      window.addEventListener(eventName, preventGameBrowserEvent, listenerOptions);
    });

    return () => {
      documentEvents.forEach((eventName) => {
        document.removeEventListener(eventName, preventGameBrowserEvent, listenerOptions);
      });
      windowEvents.forEach((eventName) => {
        window.removeEventListener(eventName, preventGameBrowserEvent, listenerOptions);
      });
    };
  }, []);

  const setTouchInput = useCallback((patch: Partial<TouchFlightInput>) => {
    Object.assign(touchInputRef.current, patch);
  }, []);

  const selectTarget = useCallback(
    (id: string) => {
      if (destroyedPlanetIds.includes(id) || !canUseNavigation) {
        return;
      }
      setSelectedId(id);
      selectedIdRef.current = id;
      setShowDestinations(false);
      bridgeRef.current?.flyTo(id);
    },
    [canUseNavigation, destroyedPlanetIds]
  );

  const selectAdjacentTarget = useCallback(
    (direction: -1 | 1) => {
      if (!canUseNavigation) {
        return;
      }
      const availableServices = services.filter((service) => !destroyedPlanetIds.includes(service.id));
      if (availableServices.length === 0) {
        return;
      }
      const currentIndex = availableServices.findIndex((service) => service.id === selectedIdRef.current);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (safeIndex + direction + availableServices.length) % availableServices.length;
      const nextService = availableServices[nextIndex];
      if (nextService) {
        selectTarget(nextService.id);
      }
    },
    [canUseNavigation, destroyedPlanetIds, selectTarget, services]
  );

  const closeDock = useCallback(() => {
    setDockedService(null);
    bridgeRef.current?.releaseDock();
  }, []);

  const equipWeapon = useCallback((weaponId: WeaponId) => {
    const weapon = WEAPON_CATALOG[weaponId];
    if (!weapon || !ownedWeaponIdsRef.current.has(weaponId)) {
      return;
    }
    if (weapon.ammoCapacity !== null && getWeaponAmmo(weaponId, weaponAmmoRef.current) <= 0) {
      return;
    }
    if (weapon.slot === "primary") {
      primaryWeaponIdRef.current = weaponId;
      setPrimaryWeaponId(weaponId);
      return;
    }
    secondaryWeaponIdRef.current = weaponId;
    setSecondaryWeaponId(weaponId);
  }, []);

  const buyOrEquipWeapon = useCallback(
    (weaponId: WeaponId) => {
      const weapon = WEAPON_CATALOG[weaponId];
      if (!weapon) {
        return;
      }
      const owned = ownedWeaponIdsRef.current.has(weaponId);
      const currentAmmo = getWeaponAmmo(weaponId, weaponAmmoRef.current);
      const needsAmmo = weapon.ammoCapacity !== null && currentAmmo < weapon.ammoCapacity;
      if (!owned || needsAmmo) {
        if (creditsRef.current < weapon.price) {
          return;
        }
        creditsRef.current -= weapon.price;
        setCredits(creditsRef.current);
        if (!owned) {
          ownedWeaponIdsRef.current = new Set([...ownedWeaponIdsRef.current, weaponId]);
          setOwnedWeaponIds((previous) => (previous.includes(weaponId) ? previous : [...previous, weaponId]));
        }
        if (weapon.ammoCapacity !== null) {
          weaponAmmoRef.current = {
            ...weaponAmmoRef.current,
            [weaponId]: weapon.ammoCapacity
          };
          setWeaponAmmo(weaponAmmoRef.current);
        }
      }
      equipWeapon(weaponId);
    },
    [equipWeapon]
  );

  useEffect(() => {
    buyOrEquipWeaponRef.current = buyOrEquipWeapon;
  }, [buyOrEquipWeapon]);

  const startBattleAudio = useCallback(() => {
    bridgeRef.current?.warmupRuntimeAssets();
    audioRef.current.preload();
    audioRef.current.primeSoundtrack(SOUNDTRACK_URLS);
    audioRef.current.resume();
    audioRef.current.setMuted(audioMuted);
    audioRef.current.startSoundtrack(SOUNDTRACK_URLS);
  }, [audioMuted]);

  const requestMobileFullscreen = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isMobileGameSurface = window.matchMedia("(max-width: 920px), (hover: none) and (pointer: coarse)").matches;
    if (!isMobileGameSurface) {
      return;
    }

    const fullscreenDocument = document as FullscreenDocument;
    if (document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
      return;
    }

    const target = (shellRef.current ?? document.documentElement) as FullscreenElement;
    const requestFullscreen = target.requestFullscreen ?? target.webkitRequestFullscreen;
    if (!requestFullscreen) {
      return;
    }

    void Promise.resolve(requestFullscreen.call(target)).catch(() => undefined);
  }, []);

  const startGame = useCallback(() => {
    requestMobileFullscreen();
    startBattleAudio();
    gamePhaseRef.current = "Countdown";
    setGamePhase("Countdown");
  }, [requestMobileFullscreen, startBattleAudio]);

  const restartMatch = useCallback(() => {
    requestMobileFullscreen();
    startBattleAudio();
    setInitialMatchPhase("Countdown");
    setMatchId((value) => value + 1);
  }, [requestMobileFullscreen, startBattleAudio]);

  const enterExploreMode = useCallback(() => {
    requestMobileFullscreen();
    audioRef.current.stopSoundtrack();
    setInitialMatchPhase("Exploring");
    setMatchId((value) => value + 1);
  }, [requestMobileFullscreen]);

  const startDefenseFromExplore = useCallback(() => {
    requestMobileFullscreen();
    startBattleAudio();
    gamePhaseRef.current = "Countdown";
    setShowDestinations(false);
    setCombatHud((previous) => ({
      ...previous,
      phase: "Countdown",
      roundCountdown: 4,
      threat: "Next round"
    }));
    setGamePhase("Countdown");
  }, [requestMobileFullscreen, startBattleAudio]);

  const toggleAudioMuted = useCallback(() => {
    setAudioMuted((current) => {
      const next = !current;
      audioRef.current.setMuted(next);
      return next;
    });
  }, []);

  const togglePause = useCallback(() => {
    setGamePhase((phase) => {
      if (phase === "Paused") {
        const next = phaseBeforePauseRef.current === "Countdown" ? "Countdown" : "Running";
        gamePhaseRef.current = next;
        setCombatHud((previous) => ({
          ...previous,
          phase: next,
          roundCountdown: next === "Countdown" ? previous.roundCountdown : null
        }));
        return next;
      }
      if (phase === "Running" || phase === "Countdown") {
        phaseBeforePauseRef.current = phase;
        gamePhaseRef.current = "Paused";
        setCombatHud((previous) => ({
          ...previous,
          phase: "Paused",
          roundCountdown: null
        }));
        return "Paused";
      }
      return phase;
    });
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || services.length === 0) {
      return;
    }

    let frameId = 0;
    let runtimeWarmupDone = false;
    let runtimeWarmupIdleId: number | null = null;
    let runtimeWarmupTimeoutId: number | null = null;
    let lastTelemetry = 0;
    let lastCombatHud = 0;
    let lastPixelSample = 0;
    let lastNearbyKey = "";
    let fireCooldown = 0;
    let secondaryFireCooldown = 0;
    let waveCooldown = 4;
    let currentWave = 0;
    let currentWaveTargetId = "";
    let score = 0;
    let runtimeShipHealth = PLAYER_MAX_HEALTH;
    let shipDestroyed = false;
    let shipHitFlash = 0;
    let thrustHold = 0;
    let flamePower = 0;
    const keys = new Set<string>();
    const enemies: EnemyRuntime[] = [];
    const projectiles: ProjectileRuntime[] = [];
    const explosions: ExplosionRuntime[] = [];
    const clock = new THREE.Clock();
    const velocity = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const desired = new THREE.Vector3();
    const targetWorld = new THREE.Vector3();
    const cameraLookAt = new THREE.Vector3();
    const shipWorld = new THREE.Vector3();
    const shipAim = new THREE.Vector3();
    const shipRight = new THREE.Vector3();
    const avoidanceNormal = new THREE.Vector3();
    const dockOffset = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();
    const cameraDockTarget = new THREE.Vector3();
    const dockTangent = new THREE.Vector3();
    const spawnTarget = new THREE.Vector3();
    const enemyDirection = new THREE.Vector3();
    const projectileDirection = new THREE.Vector3();
    const projectilePosition = new THREE.Vector3();
    const muzzleOffset = new THREE.Vector3();
    const enemyMuzzleOffset = new THREE.Vector3();
    const enemyShotTarget = new THREE.Vector3();
    const enemyShotSpread = new THREE.Vector3();
    const missileForward = new THREE.Vector3();
    const missileTargetOffset = new THREE.Vector3();
    const blastOrigin = new THREE.Vector3();
    const targetEnemyPosition = new THREE.Vector3();
    const explosionPosition = new THREE.Vector3();
    const enemySeparation = new THREE.Vector3();
    const enemyLateral = new THREE.Vector3();
    const enemyPlanetOffset = new THREE.Vector3();
    const enemyPlanetTangent = new THREE.Vector3();
    const lookRig = new THREE.Object3D();
    const autopilotTarget = { id: selectedIdRef.current, active: false };
    const dockedTarget = {
      active: false,
      angle: 0,
      id: "",
      radius: 0
    };
    const mobilePerformanceMode = window.matchMedia("(max-width: 920px), (hover: none) and (pointer: coarse)").matches;
    const surfaceTextureWidth = mobilePerformanceMode ? 768 : 1024;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060411);
    scene.fog = new THREE.FogExp2(0x060411, 0.006);

    const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 0.1, 1800);
    camera.position.set(0, 9, 30);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobilePerformanceMode ? 1.5 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("aria-label", "Pirxey space flight viewport");
    mount.appendChild(renderer.domElement);

    const sampleCanvas = () => {
      const gl = renderer.getContext();
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      const sampleW = Math.min(128, width);
      const sampleH = Math.min(72, height);
      const pixels = new Uint8Array(sampleW * sampleH * 4);
      gl.readPixels(
        Math.floor((width - sampleW) / 2),
        Math.floor((height - sampleH) / 2),
        sampleW,
        sampleH,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );
      let lit = 0;
      let total = 0;
      let max = 0;
      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const value = pixels[i] + pixels[i + 1] + pixels[i + 2];
        if (value > 30) {
          lit += 1;
        }
        max = Math.max(max, value);
        sum += value;
        total += 1;
      }
      return {
        avgRgbSum: Number((sum / total).toFixed(2)),
        height,
        litRatio: Number((lit / total).toFixed(4)),
        maxRgbSum: max,
        sampleH,
        sampleW,
        width
      };
    };

    const debugApi = {
      sampleCanvas
    };
    window.__pirxeySpaceDebug = debugApi;

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(mount.clientWidth, mount.clientHeight);
    labelRenderer.domElement.className = "label-layer";
    mount.appendChild(labelRenderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe6e6c9, 0x060411, 0.48));
    const keyLight = new THREE.DirectionalLight(0xf9f9ea, 2.5);
    keyLight.position.set(-14, 18, 18);
    scene.add(keyLight);

    const starFieldA = createStarField(3600, 620, 0.68, 0xf9f9ea);
    const starFieldB = createStarField(900, 420, 1.65, 0x6fb5c8);
    scene.add(starFieldA, starFieldB);

    const dust = createStarField(1400, 260, 1.15, 0xd74721);
    dust.material.opacity = 0.18;
    dust.scale.set(1.2, 0.34, 1.2);
    dust.rotation.z = -0.26;
    scene.add(dust);

    const sunGroup = new THREE.Group();
    const sunTexture = createSunTexture(surfaceTextureWidth);
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(6.2, 72, 36),
      new THREE.MeshBasicMaterial({ map: sunTexture, color: 0xffcf65 })
    );
    sunGroup.add(sun);
    const corona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createRadialTexture("rgba(255,207,101,1)", "rgba(215,71,33,0)", 0.8),
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    corona.scale.set(27, 27, 1);
    sunGroup.add(corona);
    const sunLight = new THREE.PointLight(0xffcf65, 5, 220, 1.45);
    sunGroup.add(sunLight);
    scene.add(sunGroup);

    const planetRuntimes: PlanetRuntime[] = services.map((service, index) => {
      const orbit = new THREE.Group();
      orbit.rotation.x = service.inclination;
      orbit.rotation.y = service.phase;
      scene.add(orbit);
      scene.add(createOrbitLine(service.orbitRadius, service.inclination));

      const group = new THREE.Group();
      group.position.x = service.orbitRadius;
      orbit.add(group);

      const texture = createPlanetTexture(service, index, surfaceTextureWidth);
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(service.size, 64, 32),
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.74,
          metalness: 0.02
        })
      );
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(service.size * 1.065, 48, 24),
        new THREE.MeshBasicMaterial({
          color: service.colors[1],
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      group.add(atmosphere);

      if (service.id === "cloud") {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(service.size * 1.55, service.size * 1.75, 96),
          new THREE.MeshBasicMaterial({
            color: 0xf9f9ea,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            depthWrite: false
          })
        );
        ring.rotation.x = Math.PI / 2.8;
        group.add(ring);
      }

      const dockRing = new THREE.Mesh(
        new THREE.TorusGeometry(service.size + 0.48, 0.035, 12, 96),
        new THREE.MeshBasicMaterial({
          color: 0x6fb5c8,
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending
        })
      );
      dockRing.rotation.x = Math.PI / 2;
      group.add(dockRing);

      const label = document.createElement("div");
      label.className = "service-label";
      label.innerHTML = `<span>${service.name}</span>`;
      const labelObject = new CSS2DObject(label);
      labelObject.position.set(0, service.size + 1.15, 0);
      group.add(labelObject);

      return {
        service,
        orbit,
        body,
        group,
        destroyed: false,
        health: 100,
        maxHealth: 100,
        ring: dockRing,
        worldPosition: new THREE.Vector3()
      };
    });

    const ship = createShip();
    attachShipCannons(ship);
    const shipShieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x6fb5c8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const shipShield = new THREE.Mesh(new THREE.SphereGeometry(1.62, 32, 16), shipShieldMaterial);
    shipShield.name = "ship-hit-shield";
    ship.add(shipShield);
    const shipHitLight = new THREE.PointLight(0x6fb5c8, 0, 15);
    ship.add(shipHitLight);
    scene.add(ship);

    const flameOuter = ship.getObjectByName("engine-flame-outer");
    const flameInner = ship.getObjectByName("engine-flame-inner");
    const flameHalo = ship.getObjectByName("engine-flame-halo");
    const flameLight = ship.getObjectByName("engine-flame-light");
    const flameOuterMaterial =
      flameOuter instanceof THREE.Mesh && flameOuter.material instanceof THREE.MeshBasicMaterial
        ? flameOuter.material
        : null;
    const flameInnerMaterial =
      flameInner instanceof THREE.Mesh && flameInner.material instanceof THREE.MeshBasicMaterial
        ? flameInner.material
        : null;
    const flameHaloMaterial =
      flameHalo instanceof THREE.Sprite && flameHalo.material instanceof THREE.SpriteMaterial
        ? flameHalo.material
        : null;

    const updateShipFlames = (power: number, elapsedTime: number, boosting: boolean) => {
      const visible = power > 0.015 && !shipDestroyed;
      const flicker =
        visible ? 0.88 + Math.sin(elapsedTime * 42) * 0.08 + Math.sin(elapsedTime * 71 + 1.7) * 0.04 : 0;
      const boostScale = boosting ? 1.2 : 1;
      const outerLength = (0.72 + power * 2.55) * flicker * boostScale;
      const innerLength = (0.48 + power * 1.85) * flicker * boostScale;
      const outerRadius = 0.36 + power * 0.24 + (boosting ? 0.08 : 0);
      const innerRadius = 0.14 + power * 0.12;

      if (flameOuter instanceof THREE.Mesh) {
        flameOuter.visible = visible;
        flameOuter.scale.set(outerRadius, outerRadius, Math.max(0.001, outerLength));
        flameOuter.position.z = 2.5 + outerLength * 0.5;
      }
      if (flameInner instanceof THREE.Mesh) {
        flameInner.visible = visible;
        flameInner.scale.set(innerRadius, innerRadius, Math.max(0.001, innerLength));
        flameInner.position.z = 2.48 + innerLength * 0.5;
      }
      if (flameHalo instanceof THREE.Sprite) {
        flameHalo.visible = visible;
        flameHalo.scale.setScalar((1.15 + power * 2.35) * Math.max(0.001, flicker));
      }
      if (flameOuterMaterial) {
        flameOuterMaterial.opacity = visible ? clamp(0.2 + power * 0.42, 0, 0.72) : 0;
      }
      if (flameInnerMaterial) {
        flameInnerMaterial.opacity = visible ? clamp(0.18 + power * 0.38, 0, 0.62) : 0;
      }
      if (flameHaloMaterial) {
        flameHaloMaterial.opacity = visible ? clamp(0.18 + power * 0.45, 0, 0.74) : 0;
      }
      if (flameLight instanceof THREE.PointLight) {
        flameLight.intensity = visible ? power * (boosting ? 5.2 : 3.8) : 0;
        flameLight.distance = 10 + power * 16;
      }
    };

    const runRuntimeWarmup = () => {
      if (runtimeWarmupDone) {
        return;
      }
      runtimeWarmupDone = true;
      const warmupGroup = createRuntimeWarmupGroup();

      try {
        scene.add(warmupGroup);
        renderer.compile(scene, camera);
      } finally {
        scene.remove(warmupGroup);
        disposeObject(warmupGroup);
      }
    };

    const scheduleRuntimeWarmup = () => {
      const idleWindow = window as Window & {
        cancelIdleCallback?: (handle: number) => void;
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      };

      if (idleWindow.requestIdleCallback) {
        runtimeWarmupIdleId = idleWindow.requestIdleCallback(runRuntimeWarmup, { timeout: 1200 });
        return;
      }

      runtimeWarmupTimeoutId = window.setTimeout(runRuntimeWarmup, 450);
    };

    const setMode = (mode: FlightMode) => {
      setTelemetry((previous) => (previous.mode === mode ? previous : { ...previous, mode }));
    };

    const canUsePlanetNavigation = () => gamePhaseRef.current === "Awaiting" || gamePhaseRef.current === "Exploring";
    const isNavigationLocked = () => !canUsePlanetNavigation();

    const transitionGamePhase = (phase: CombatHud["phase"]) => {
      gamePhaseRef.current = phase;
      setGamePhase(phase);
    };

    const activePlanets = () => planetRuntimes.filter((planet) => !planet.destroyed);

    const syncPlanetHud = () => {
      const nextHud = planetRuntimes.map((planet) => ({
        destroyed: planet.destroyed,
        health: Math.round((planet.health / planet.maxHealth) * 100),
        id: planet.service.id,
        name: planet.service.name
      }));
      setPlanetHud((previous) => {
        const unchanged =
          previous.length === nextHud.length &&
          previous.every(
            (item, index) =>
              item.id === nextHud[index].id &&
              item.health === nextHud[index].health &&
              item.destroyed === nextHud[index].destroyed
          );
        return unchanged ? previous : nextHud;
      });
    };

    const addExplosion = (position: THREE.Vector3, color = 0xd74721, particleCount = 18, scale = 1) => {
      const explosion = createExplosion(position, color, particleCount, scale);
      explosions.push(explosion);
      scene.add(explosion.group);
    };

    const syncShipHealth = () => {
      setShipHealth(Math.round(runtimeShipHealth));
    };

    const restoreShip = () => {
      if (shipDestroyed) {
        return;
      }
      runtimeShipHealth = PLAYER_MAX_HEALTH;
      syncShipHealth();
    };

    const destroyShip = () => {
      if (shipDestroyed) {
        return;
      }
      shipDestroyed = true;
      runtimeShipHealth = 0;
      syncShipHealth();
      ship.getWorldPosition(explosionPosition);
      addExplosion(explosionPosition, 0x6fb5c8, 34, 1.15);
      audioRef.current.planetExplosion();
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }
      ship.visible = false;
      dockedTarget.active = false;
      autopilotTarget.active = false;
      velocity.multiplyScalar(0);
      setDockedService(null);
      setMode("Manual");
      transitionGamePhase("Game over");
    };

    const damageShip = (amount: number) => {
      if (shipDestroyed || gamePhaseRef.current !== "Running") {
        return;
      }
      runtimeShipHealth = clamp(runtimeShipHealth - amount, 0, PLAYER_MAX_HEALTH);
      shipHitFlash = 0.34;
      syncShipHealth();
      if (runtimeShipHealth <= 0) {
        destroyShip();
      }
    };

    const findClosestActivePlanet = (position: THREE.Vector3) => {
      let closest: PlanetRuntime | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const planet of planetRuntimes) {
        if (planet.destroyed) {
          continue;
        }
        planet.group.getWorldPosition(planet.worldPosition);
        const distance = position.distanceTo(planet.worldPosition);
        if (distance < closestDistance) {
          closest = planet;
          closestDistance = distance;
        }
      }
      return closest;
    };

    const destroyPlanet = (planet: PlanetRuntime) => {
      if (planet.destroyed) {
        return;
      }
      planet.destroyed = true;
      planet.health = 0;
      planet.ring.material.opacity = 0;
      planet.group.getWorldPosition(explosionPosition);
      addExplosion(explosionPosition, 0xffcf65, 42, planet.service.size * 1.05);
      audioRef.current.planetExplosion();
      planet.group.visible = false;
      setDestroyedPlanetIds((previous) => (previous.includes(planet.service.id) ? previous : [...previous, planet.service.id]));

      if (dockedTarget.active && dockedTarget.id === planet.service.id) {
        dockedTarget.active = false;
        setDockedService(null);
        setMode("Manual");
      }

      const replacement = activePlanets()[0];
      if (selectedIdRef.current === planet.service.id && replacement) {
        selectedIdRef.current = replacement.service.id;
        setSelectedId(replacement.service.id);
      }

      for (const enemy of enemies) {
        if (enemy.targetMode !== "planet" || enemy.targetPlanetId !== planet.service.id) {
          continue;
        }
        if (replacement) {
          enemy.targetPlanetId = replacement.service.id;
        } else {
          enemy.state = "aggro";
        }
      }

      syncPlanetHud();
      if (!replacement) {
        if (document.pointerLockElement === renderer.domElement) {
          document.exitPointerLock();
        }
        transitionGamePhase("Game over");
      }
    };

    const damagePlanet = (planet: PlanetRuntime, amount: number) => {
      if (planet.destroyed) {
        return;
      }
      planet.health = clamp(planet.health - amount, 0, planet.maxHealth);
      if (planet.health <= 0) {
        destroyPlanet(planet);
      }
    };

    const restoreActivePlanets = () => {
      for (const planet of planetRuntimes) {
        if (planet.destroyed) {
          planet.group.visible = false;
          planet.health = 0;
          continue;
        }
        planet.health = planet.maxHealth;
        planet.group.visible = true;
      }
      syncPlanetHud();
    };

    const aimShipAt = (point: THREE.Vector3, amount: number) => {
      lookRig.position.copy(ship.position);
      lookRig.up.set(0, 1, 0);
      lookRig.lookAt(point);
      lookRig.rotateY(Math.PI);
      ship.quaternion.slerp(lookRig.quaternion, amount);
    };

    const removeProjectile = (projectile: ProjectileRuntime) => {
      scene.remove(projectile.mesh);
      disposeObject(projectile.mesh);
      const index = projectiles.indexOf(projectile);
      if (index >= 0) {
        projectiles.splice(index, 1);
      }
    };

    const removeEnemy = (enemy: EnemyRuntime) => {
      enemy.group.getWorldPosition(explosionPosition);
      addExplosion(
        explosionPosition,
        enemy.kind === "death-star" ? 0xff2f2f : 0xd74721,
        enemy.kind === "death-star" ? 54 : 18,
        enemy.kind === "death-star" ? 2.5 : 0.82
      );
      audioRef.current.explosion();
      scene.remove(enemy.group);
      disposeObject(enemy.group);
      const index = enemies.indexOf(enemy);
      if (index >= 0) {
        enemies.splice(index, 1);
      }
    };

    const grantKillReward = (enemy: EnemyRuntime) => {
      const reward =
        enemy.kind === "death-star" ? enemy.reward + currentWave * 2 : 6 + Math.floor(currentWave * 1.4);
      score += (enemy.kind === "death-star" ? 40 : 10) + currentWave;
      creditsRef.current += reward;
      setCredits(creditsRef.current);
    };

    const destroyEnemy = (enemy: EnemyRuntime) => {
      grantKillReward(enemy);
      removeEnemy(enemy);
    };

    const aggroPlanetGroup = (planetId: string, origin: THREE.Vector3, sourceEnemyId: number) => {
      const candidates = enemies
        .filter(
          (enemy) =>
            enemy.targetMode === "planet" &&
            enemy.targetPlanetId === planetId &&
            enemy.id !== sourceEnemyId &&
            enemy.state === "raiding"
        )
        .map((enemy) => ({
          distance: enemy.group.position.distanceTo(origin),
          enemy
        }))
        .sort((a, b) => a.distance - b.distance);
      const nearbyPool = candidates.slice(0, Math.min(candidates.length, 4 + Math.floor(Math.random() * 5)));
      const maxAggro = Math.min(nearbyPool.length, 2 + Math.floor(currentWave / 4), 6);
      const aggroCount = maxAggro > 0 ? 1 + Math.floor(Math.random() * maxAggro) : 0;
      const selectable = [...nearbyPool];
      const selected: EnemyRuntime[] = [];

      while (selected.length < aggroCount && selectable.length > 0) {
        const index = Math.floor(Math.random() * selectable.length);
        const [candidate] = selectable.splice(index, 1);
        if (candidate) {
          selected.push(candidate.enemy);
        }
      }

      for (const enemy of selected) {
        enemy.state = "aggro";
        enemy.attackCooldown = Math.min(enemy.attackCooldown, 0.55 + Math.random() * 0.75);
      }
    };

    const damageEnemy = (enemy: EnemyRuntime, damage: number, origin: THREE.Vector3) => {
      enemy.hp -= damage;
      if (enemy.targetMode === "planet") {
        enemy.state = "aggro";
        enemy.attackDelay = 0;
        aggroPlanetGroup(enemy.targetPlanetId, origin, enemy.id);
      }
      if (enemy.hp <= 0) {
        destroyEnemy(enemy);
      }
    };

    const detonatePlayerProjectile = (projectile: ProjectileRuntime) => {
      blastOrigin.copy(projectile.mesh.position);
      const radius = projectile.blastRadius ?? 0;
      const isPlasma = projectile.weaponId === "plasma-orb";
      const isHomingMissile = projectile.weaponId === "homing-missiles";
      addExplosion(
        blastOrigin,
        projectile.impactColor ?? 0x7dffea,
        isPlasma ? 64 : 22,
        isPlasma ? 3.25 : radius ? radius * 0.34 : 0.9
      );
      if (isHomingMissile) {
        let nearestEnemy: EnemyRuntime | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        let secondEnemy: EnemyRuntime | null = null;
        let secondDistance = Number.POSITIVE_INFINITY;

        for (const enemy of enemies) {
          const distance = enemy.group.position.distanceTo(blastOrigin);
          if (distance > radius + enemy.hitRadius) {
            continue;
          }
          if (distance < nearestDistance) {
            secondEnemy = nearestEnemy;
            secondDistance = nearestDistance;
            nearestEnemy = enemy;
            nearestDistance = distance;
          } else if (distance < secondDistance) {
            secondEnemy = enemy;
            secondDistance = distance;
          }
        }

        if (nearestEnemy) {
          damageEnemy(nearestEnemy, projectile.damage, blastOrigin);
        }
        if (secondEnemy && secondDistance <= 1.55 + secondEnemy.hitRadius * 0.35) {
          damageEnemy(secondEnemy, projectile.damage, blastOrigin);
        }
        removeProjectile(projectile);
        return;
      }

      for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = enemies[enemyIndex];
        const distance = enemy.group.position.distanceTo(blastOrigin);
        if (distance <= radius + 0.75) {
          const coreRadius = radius * (isPlasma ? 0.68 : 0.48);
          const falloff =
            distance <= coreRadius ? 1 : clamp(1 - (distance - coreRadius) / Math.max(radius - coreRadius, 0.1), 0.58, 1);
          damageEnemy(enemy, projectile.damage * falloff, blastOrigin);
        }
      }
      removeProjectile(projectile);
    };

    const findEnemyInDirection = (
      origin: THREE.Vector3,
      direction: THREE.Vector3,
      maxDistance = 150,
      minAlignment = 0.16
    ) => {
      let target: EnemyRuntime | null = null;
      let nearestDistance = maxDistance;
      missileForward.copy(direction).normalize();

      for (const enemy of enemies) {
        missileTargetOffset.copy(enemy.group.position).sub(origin);
        const distance = missileTargetOffset.length();
        if (distance <= 0.001 || distance > maxDistance) {
          continue;
        }
        const alignment = missileTargetOffset.divideScalar(distance).dot(missileForward);
        if (alignment < minAlignment) {
          continue;
        }
        if (distance < nearestDistance) {
          nearestDistance = distance;
          target = enemy;
        }
      }

      return target;
    };

    const fallbackToDefaultPrimary = () => {
      if (primaryWeaponIdRef.current !== DEFAULT_PRIMARY_WEAPON) {
        primaryWeaponIdRef.current = DEFAULT_PRIMARY_WEAPON;
        setPrimaryWeaponId(DEFAULT_PRIMARY_WEAPON);
      }
    };

    const consumeWeaponAmmo = (weaponId: WeaponId) => {
      const weapon = WEAPON_CATALOG[weaponId];
      if (!weapon || weapon.ammoCapacity === null) {
        return true;
      }
      const currentAmmo = getWeaponAmmo(weaponId, weaponAmmoRef.current);
      if (currentAmmo <= 0) {
        if (weapon.slot === "primary") {
          fallbackToDefaultPrimary();
        } else if (secondaryWeaponIdRef.current === weaponId) {
          secondaryWeaponIdRef.current = null;
          setSecondaryWeaponId(null);
        }
        return false;
      }

      const nextAmmo = Math.max(0, currentAmmo - 1);
      weaponAmmoRef.current = {
        ...weaponAmmoRef.current,
        [weaponId]: nextAmmo
      };
      setWeaponAmmo(weaponAmmoRef.current);

      if (nextAmmo <= 0) {
        if (weapon.slot === "primary") {
          fallbackToDefaultPrimary();
        } else if (secondaryWeaponIdRef.current === weaponId) {
          secondaryWeaponIdRef.current = null;
          setSecondaryWeaponId(null);
        }
      }
      return true;
    };

    const firePrimaryWeapon = () => {
      if (
        fireCooldown > 0 ||
        dockedTarget.active ||
        gamePhaseRef.current === "Paused" ||
        gamePhaseRef.current === "Awaiting" ||
        gamePhaseRef.current === "Game over"
      ) {
        return;
      }
      let weaponId = primaryWeaponIdRef.current;
      let weapon = WEAPON_CATALOG[weaponId] ?? WEAPON_CATALOG[DEFAULT_PRIMARY_WEAPON];
      if (weaponId !== DEFAULT_PRIMARY_WEAPON && !consumeWeaponAmmo(weaponId)) {
        weaponId = DEFAULT_PRIMARY_WEAPON;
        weapon = WEAPON_CATALOG[DEFAULT_PRIMARY_WEAPON];
      }
      forward.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
      const addProjectile = (projectile: ProjectileRuntime) => {
        projectiles.push(projectile);
        scene.add(projectile.mesh);
      };

      if (weaponId === "twin-cannons") {
        for (const x of [-0.68, 0.68]) {
          muzzleOffset.set(x, -0.05, -2.08).applyQuaternion(ship.quaternion);
          projectilePosition.copy(ship.position).add(muzzleOffset);
          addProjectile(createPlayerBolt(projectilePosition, forward));
        }
      } else if (weaponId === "pulse-laser" || weaponId === "rail-splitter" || weaponId === "rapid-repeater") {
        muzzleOffset.set(0, -0.02, -2.34).applyQuaternion(ship.quaternion);
        projectilePosition.copy(ship.position).add(muzzleOffset);
        addProjectile(createPlayerLaser(projectilePosition, forward, weaponId));
      } else {
        muzzleOffset.set(0, -0.02, -2.25).applyQuaternion(ship.quaternion);
        projectilePosition.copy(ship.position).add(muzzleOffset);
        addProjectile(createPlayerBolt(projectilePosition, forward));
      }

      fireCooldown = weapon.cooldown;
      audioRef.current.shoot();
    };

    const firePlayerShot = () => firePrimaryWeapon();

    const fireSecondaryWeapon = () => {
      if (
        secondaryFireCooldown > 0 ||
        dockedTarget.active ||
        gamePhaseRef.current === "Paused" ||
        gamePhaseRef.current === "Awaiting" ||
        gamePhaseRef.current === "Game over"
      ) {
        return;
      }
      const weaponId = secondaryWeaponIdRef.current;
      if (!weaponId) {
        return;
      }
      const weapon = WEAPON_CATALOG[weaponId];
      if (!weapon || weapon.slot !== "secondary") {
        return;
      }
      if (!consumeWeaponAmmo(weaponId)) {
        return;
      }

      forward.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
      muzzleOffset.set(0, -0.02, -2.36).applyQuaternion(ship.quaternion);
      projectilePosition.copy(ship.position).add(muzzleOffset);

      if (weaponId === "homing-missiles") {
        const target = findEnemyInDirection(projectilePosition, forward, 170, 0.12);
        const missile = createHomingMissile(projectilePosition, forward, target?.id ?? null);
        projectiles.push(missile);
        scene.add(missile.mesh);
      } else if (weaponId === "plasma-orb") {
        const orb = createPlasmaOrb(projectilePosition, forward);
        projectiles.push(orb);
        scene.add(orb.mesh);
      } else if (weaponId === "arc-pulse") {
        addExplosion(ship.position, 0x7dffea, 72, 3.4);
        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
          const enemy = enemies[enemyIndex];
          if (enemy.group.position.distanceTo(ship.position) <= 12.5) {
            destroyEnemy(enemy);
          }
        }
      }

      secondaryFireCooldown = weapon.cooldown;
      if (weaponId === "homing-missiles") {
        audioRef.current.missile();
      } else if (weaponId === "plasma-orb" || weaponId === "arc-pulse") {
        audioRef.current.plasma();
      } else {
        audioRef.current.shoot();
      }
    };

    const spawnEnemyShot = (enemy: EnemyRuntime, target: THREE.Vector3, canDamagePlanets = true) => {
      projectileDirection.copy(target).sub(enemy.group.position).normalize();
      projectilePosition.copy(enemy.group.position).addScaledVector(projectileDirection, 0.9);
      const shot = createEnemyShot(projectilePosition, projectileDirection, currentWave, { canDamagePlanets });
      projectiles.push(shot);
      scene.add(shot.mesh);
    };

    const spawnDeathStarVolley = (enemy: EnemyRuntime, target: THREE.Vector3, elapsedTime: number) => {
      const ports = enemy.weaponPorts ?? [new THREE.Vector3(0, 0, -enemy.hitRadius)];
      for (let portIndex = 0; portIndex < ports.length; portIndex += 1) {
        const port = ports[portIndex];
        enemyMuzzleOffset.copy(port).applyQuaternion(enemy.group.quaternion);
        projectilePosition.copy(enemy.group.position).add(enemyMuzzleOffset);
        enemyShotSpread
          .set(
            Math.sin(elapsedTime * 1.7 + enemy.id + portIndex) * 0.46,
            Math.cos(elapsedTime * 1.25 + portIndex * 2.1) * 0.3,
            Math.cos(elapsedTime * 1.45 + enemy.id * 0.7 + portIndex) * 0.46
          )
          .multiplyScalar(0.62);
        enemyShotTarget.copy(target).add(enemyShotSpread);
        projectileDirection.copy(enemyShotTarget).sub(projectilePosition).normalize();
        const shot = createEnemyShot(projectilePosition, projectileDirection, currentWave, {
          canDamagePlanets: false,
          damage: 1.15,
          radius: 0.46,
          speedMultiplier: 1.36
        });
        projectiles.push(shot);
        scene.add(shot.mesh);
      }
    };

    const resolveEnemyPlanetAvoidance = (enemy: EnemyRuntime, primaryTarget: PlanetRuntime | null, frameDelta: number) => {
      for (const planet of planetRuntimes) {
        if (planet.destroyed) {
          continue;
        }

        planet.group.getWorldPosition(planet.worldPosition);
        enemyPlanetOffset.copy(enemy.group.position).sub(planet.worldPosition);
        let distance = enemyPlanetOffset.length();
        const bodyClearance = planet.service.size + enemy.hitRadius + (enemy.kind === "death-star" ? 0.85 : 0.43);
        const steeringRadius =
          planet.service.size + (planet.service.id === primaryTarget?.service.id ? 3.35 : 4.25) + enemy.hitRadius * 0.65;

        if (distance < 0.001) {
          enemyPlanetOffset.set(1, 0.15, 0).normalize();
          distance = 0.001;
        } else {
          enemyPlanetOffset.divideScalar(distance);
        }

        if (distance < bodyClearance) {
          enemy.group.position.copy(planet.worldPosition).addScaledVector(enemyPlanetOffset, bodyClearance);
          distance = bodyClearance;
        }

        if (distance >= steeringRadius || enemyDirection.dot(enemyPlanetOffset) >= 0) {
          continue;
        }

        const influence = clamp((steeringRadius - distance) / Math.max(0.001, steeringRadius - bodyClearance), 0, 1);
        enemyPlanetTangent.set(-enemyPlanetOffset.z, 0, enemyPlanetOffset.x);
        if (enemyPlanetTangent.lengthSq() < 0.001) {
          enemyPlanetTangent.set(1, 0, 0);
        } else {
          enemyPlanetTangent.normalize();
        }
        const orbitSide = Math.sin(enemy.id * 7.31 + planet.service.phase * 11.7) >= 0 ? 1 : -1;
        enemy.group.position.addScaledVector(enemyPlanetTangent, orbitSide * influence * enemy.speed * frameDelta * 1.05);
        enemy.group.position.addScaledVector(enemyPlanetOffset, influence * enemy.speed * frameDelta * 0.36);
      }

      enemyPlanetOffset.copy(enemy.group.position);
      let sunDistance = enemyPlanetOffset.length();
      const sunBodyClearance = 6.2 + enemy.hitRadius + 0.95;
      const sunSteeringRadius = sunBodyClearance + 5.4 + enemy.hitRadius * 0.6;

      if (sunDistance < 0.001) {
        enemyPlanetOffset.set(1, 0.18, 0).normalize();
        sunDistance = 0.001;
      } else {
        enemyPlanetOffset.divideScalar(sunDistance);
      }

      if (sunDistance < sunBodyClearance) {
        enemy.group.position.copy(enemyPlanetOffset).multiplyScalar(sunBodyClearance);
        sunDistance = sunBodyClearance;
      }

      if (sunDistance < sunSteeringRadius && enemyDirection.dot(enemyPlanetOffset) < 0) {
        const influence = clamp((sunSteeringRadius - sunDistance) / Math.max(0.001, sunSteeringRadius - sunBodyClearance), 0, 1);
        enemyPlanetTangent.set(-enemyPlanetOffset.z, 0, enemyPlanetOffset.x);
        if (enemyPlanetTangent.lengthSq() < 0.001) {
          enemyPlanetTangent.set(1, 0, 0);
        } else {
          enemyPlanetTangent.normalize();
        }
        const orbitSide = Math.sin(enemy.id * 4.71 + currentWave * 0.37) >= 0 ? 1 : -1;
        enemy.group.position.addScaledVector(enemyPlanetTangent, orbitSide * influence * enemy.speed * frameDelta * 1.25);
        enemy.group.position.addScaledVector(enemyPlanetOffset, influence * enemy.speed * frameDelta * 0.7);
      }
    };

    const spawnNextWave = () => {
      currentWave += 1;
      const config = getWaveConfig(currentWave);
      const availablePlanets = activePlanets();
      if (availablePlanets.length === 0) {
        transitionGamePhase("Game over");
        return;
      }

      restoreActivePlanets();
      restoreShip();
      const groupCount = Math.min(config.groups, availablePlanets.length);
      const targetPlanets = Array.from(
        { length: groupCount },
        (_, groupIndex) => availablePlanets[(currentWave + groupIndex - 1) % availablePlanets.length]
      );
      currentWaveTargetId = targetPlanets[0]?.service.id ?? "";
      const baseCount = Math.floor(config.count / groupCount);
      let remainder = config.count % groupCount;

      for (let groupIndex = 0; groupIndex < targetPlanets.length; groupIndex += 1) {
        const targetRuntime = targetPlanets[groupIndex];
        targetRuntime.group.getWorldPosition(spawnTarget);
        const enemiesInGroup = baseCount + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        for (let i = 0; i < enemiesInGroup; i += 1) {
          const enemy = createEnemyBug(
            createSpawnPosition(spawnTarget, currentWave + groupIndex * 3, i, enemiesInGroup),
            targetRuntime.service.id,
            config
          );
          enemies.push(enemy);
          scene.add(enemy.group);
        }
      }

      for (let bossIndex = 0; bossIndex < config.deathStarCount; bossIndex += 1) {
        const anchorRuntime = targetPlanets[bossIndex % targetPlanets.length] ?? availablePlanets[0];
        anchorRuntime.group.getWorldPosition(spawnTarget);
        const bossPosition = createSpawnPosition(
          spawnTarget,
          currentWave * 3 + 41,
          bossIndex + config.count,
          Math.max(1, config.deathStarCount + 1)
        ).add(new THREE.Vector3(0, 4 + bossIndex * 1.7, 0));
        const boss = createDeathStarBoss(bossPosition, anchorRuntime.service.id, config, currentWave);
        enemies.push(boss);
        scene.add(boss.group);
      }
    };

    const dockCurrent = () => {
      if (isNavigationLocked()) {
        return;
      }
      ship.getWorldPosition(shipWorld);
      const candidate = planetRuntimes
        .filter((planet) => !planet.destroyed)
        .map((planet) => {
          planet.group.getWorldPosition(planet.worldPosition);
          return {
            planet,
            distance: shipWorld.distanceTo(planet.worldPosition) - planet.service.size
          };
        })
        .sort((a, b) => a.distance - b.distance)[0];

      if (candidate && candidate.distance < 4.8) {
        if (document.pointerLockElement === renderer.domElement) {
          document.exitPointerLock();
        }
        autopilotTarget.active = false;
        candidate.planet.group.getWorldPosition(candidate.planet.worldPosition);
        const relative = ship.position.clone().sub(candidate.planet.worldPosition);
        dockedTarget.active = true;
        dockedTarget.id = candidate.planet.service.id;
        dockedTarget.angle = Math.atan2(relative.z, relative.x);
        dockedTarget.radius = candidate.planet.service.size + 5.2;
        velocity.multiplyScalar(0);
        selectedIdRef.current = candidate.planet.service.id;
        setSelectedId(candidate.planet.service.id);
        setMode("Docked");
        setDockedService(candidate.planet.service);
      }
    };

    const findNearbyArmoryWeapon = () => {
      const phase = gamePhaseRef.current;
      if (phase !== "Countdown" && phase !== "Running") {
        return null;
      }
      ship.getWorldPosition(shipWorld);
      const candidate = planetRuntimes
        .filter((planet) => !planet.destroyed)
        .map((planet) => {
          planet.group.getWorldPosition(planet.worldPosition);
          return {
            planet,
            distance: shipWorld.distanceTo(planet.worldPosition) - planet.service.size
          };
        })
        .sort((a, b) => a.distance - b.distance)[0];

      if (!candidate || candidate.distance > WEAPON_SHOP_DISTANCE) {
        return null;
      }

      return getPlanetWeaponOffer(candidate.planet.service.id) ?? null;
    };

    const useNearbyArmory = () => {
      const weapon = findNearbyArmoryWeapon();
      if (!weapon) {
        return false;
      }
      buyOrEquipWeaponRef.current(weapon.id);
      return true;
    };

    bridgeRef.current = {
      flyTo: (id: string) => {
        if (isNavigationLocked()) {
          return;
        }
        if (!planetRuntimes.some((planet) => planet.service.id === id && !planet.destroyed)) {
          return;
        }
        dockedTarget.active = false;
        autopilotTarget.id = id;
        autopilotTarget.active = true;
        setMode("Autopilot");
      },
      dockCurrent,
      releaseDock: () => {
        dockedTarget.active = false;
        autopilotTarget.active = false;
        setMode("Manual");
      },
      toggleCameraMode: () => togglePointerLock(),
      warmupRuntimeAssets: runRuntimeWarmup
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
      keys.add(event.code);
      if (event.code === "KeyE") {
        if (useNearbyArmory()) {
          event.preventDefault();
        } else {
          dockCurrent();
        }
      }
      if (event.code === "KeyF" && !event.repeat) {
        firePlayerShot();
      }
      if (event.code === "KeyG" && !event.repeat) {
        fireSecondaryWeapon();
      }
      if (event.code === "KeyV") {
        event.preventDefault();
        togglePointerLock();
      }
      if (event.code === "Escape") {
        if (document.pointerLockElement === renderer.domElement) {
          document.exitPointerLock();
        }
        dockedTarget.active = false;
        autopilotTarget.active = false;
        setMode("Manual");
        setDockedService(null);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };

    let dragging = false;
    let pointerFireHeld = false;
    let secondaryFireHeld = false;
    let lastX = 0;
    let lastY = 0;
    let touchHoldFireTimeout: number | null = null;
    let touchHoldStartAt = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDragArmed = false;
    let touchFirePointerId: number | null = null;
    let pointerLocked = false;

    const applyLookInput = (dx: number, dy: number, multiplier = 1) => {
      ship.rotation.y -= dx * 0.004 * multiplier;
      ship.rotation.x = clamp(ship.rotation.x - dy * 0.0032 * multiplier, -0.92, 0.92);
      autopilotTarget.active = false;
      setMode("Manual");
    };

    const syncPointerLockMode = () => {
      pointerLocked = document.pointerLockElement === renderer.domElement;
      setCameraMode(pointerLocked ? "Mouse aim" : "Drag aim");
      renderer.domElement.classList.toggle("is-pointer-locked", pointerLocked);
    };

    const togglePointerLock = () => {
      if (gamePhaseRef.current === "Game over" || shipDestroyed || dockedTarget.active) {
        return;
      }
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
        return;
      }
      renderer.domElement.focus({ preventScroll: true });
      void renderer.domElement.requestPointerLock();
    };

    const clearTouchHoldFire = () => {
      if (touchHoldFireTimeout !== null) {
        window.clearTimeout(touchHoldFireTimeout);
        touchHoldFireTimeout = null;
      }
      touchDragArmed = false;
      touchFirePointerId = null;
    };

    const startTouchHoldFire = (pointerId: number) => {
      if (gamePhaseRef.current === "Game over" || shipDestroyed || dockedTarget.active) {
        return;
      }
      pointerFireHeld = true;
      touchFirePointerId = pointerId;
      touchHoldFireTimeout = null;
      firePlayerShot();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 2) {
        event.preventDefault();
        secondaryFireHeld = true;
        fireSecondaryWeapon();
        return;
      }
      if (event.button !== 0) {
        return;
      }
      const isTouchPointer = event.pointerType === "touch";
      if (!isTouchPointer) {
        pointerFireHeld = true;
        firePlayerShot();
      } else {
        clearTouchHoldFire();
        touchHoldStartAt = performance.now();
        touchStartX = event.clientX;
        touchStartY = event.clientY;
      }
      if (pointerLocked || gamePhaseRef.current === "Game over" || shipDestroyed || dockedTarget.active) {
        return;
      }
      event.preventDefault();
      renderer.domElement.focus({ preventScroll: true });
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerLocked) {
        if (gamePhaseRef.current === "Game over" || shipDestroyed || dockedTarget.active) {
          return;
        }
        applyLookInput(event.movementX, event.movementY, 0.82);
        return;
      }
      if (!dragging) {
        return;
      }
      if (gamePhaseRef.current === "Game over" || shipDestroyed || dockedTarget.active) {
        dragging = false;
        return;
      }
      if (event.pointerType === "touch" && event.pointerId !== touchFirePointerId) {
        const dragDistance = Math.hypot(event.clientX - touchStartX, event.clientY - touchStartY);
        if (dragDistance > 10 && !touchDragArmed) {
          touchDragArmed = true;
          const pointerId = event.pointerId;
          const remainingHold = Math.max(0, 280 - (performance.now() - touchHoldStartAt));
          touchHoldFireTimeout = window.setTimeout(() => {
            touchHoldFireTimeout = null;
            if (dragging && touchDragArmed) {
              startTouchHoldFire(pointerId);
            }
          }, remainingHold);
        }
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      applyLookInput(dx, dy);
    };

    const onPointerUp = (event: PointerEvent) => {
      const releaseAll = event.type === "pointerleave" || event.type === "pointercancel";
      if (releaseAll || event.button === 0 || event.pointerId === touchFirePointerId) {
        pointerFireHeld = false;
        clearTouchHoldFire();
      }
      if (releaseAll || event.button === 2) {
        secondaryFireHeld = false;
      }
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onWindowBlur = () => {
      keys.clear();
      pointerFireHeld = false;
      secondaryFireHeld = false;
      clearTouchHoldFire();
      touchInputRef.current = createTouchFlightInput();
      dragging = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("blur", onWindowBlur);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("pointerlockchange", syncPointerLockMode);

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.04);
      const elapsed = clock.elapsedTime;
      frameId = window.requestAnimationFrame(animate);
      const phase = gamePhaseRef.current;

      if (phase === "Paused") {
        const previousStats = renderer.domElement.dataset.gameStats
          ? JSON.parse(renderer.domElement.dataset.gameStats)
          : {};
        renderer.domElement.dataset.gameStats = JSON.stringify({
          ...previousStats,
          phase: "Paused",
          roundCountdown: null,
          shipHealth: Math.round(runtimeShipHealth)
        });
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        return;
      }

      sun.rotation.y += delta * 0.045;
      corona.material.rotation = elapsed * 0.03;
      starFieldA.rotation.y += delta * 0.0025;
      starFieldB.rotation.y -= delta * 0.003;
      dust.rotation.y += delta * 0.004;
      fireCooldown = Math.max(0, fireCooldown - delta);
      secondaryFireCooldown = Math.max(0, secondaryFireCooldown - delta);
      const touchInput = touchInputRef.current;
      if (keys.has("KeyF") || pointerFireHeld || touchInput.primaryFire) {
        firePlayerShot();
      }
      if (keys.has("KeyG") || secondaryFireHeld || touchInput.secondaryFire) {
        fireSecondaryWeapon();
      }
      shipHitFlash = Math.max(0, shipHitFlash - delta);
      const shipFlashRatio = clamp(shipHitFlash / 0.34, 0, 1);
      shipShieldMaterial.opacity = shipFlashRatio * 0.36;
      shipHitLight.intensity = shipFlashRatio * 3.2;
      shipShield.scale.setScalar(1 + shipFlashRatio * 0.18);

      for (const runtime of planetRuntimes) {
        runtime.orbit.rotation.y += runtime.service.orbitSpeed * delta;
        runtime.body.rotation.y += delta * (0.13 + runtime.service.orbitSpeed * 2);
        runtime.ring.rotation.z += delta * 1.4;
      }

      ship.getWorldPosition(shipWorld);
      const selectedRuntime =
        planetRuntimes.find((planet) => planet.service.id === selectedIdRef.current && !planet.destroyed) ??
        activePlanets()[0] ??
        planetRuntimes[0];
      selectedRuntime.group.getWorldPosition(targetWorld);
      const distanceToSelected = shipWorld.distanceTo(targetWorld) - selectedRuntime.service.size;

      if (phase === "Countdown") {
        waveCooldown -= delta;
        if (waveCooldown <= 0) {
          spawnNextWave();
          if (activePlanets().length > 0) {
            transitionGamePhase("Running");
          }
        }
      } else if (phase === "Running" && enemies.length === 0) {
        waveCooldown = 5;
        transitionGamePhase("Countdown");
      }

      for (let i = explosions.length - 1; i >= 0; i -= 1) {
        const explosion = explosions[i];
        explosion.life -= delta;
        const fade = clamp(explosion.life / explosion.maxLife, 0, 1);
        for (let childIndex = 0; childIndex < explosion.group.children.length; childIndex += 1) {
          const child = explosion.group.children[childIndex];
          if (child instanceof THREE.Sprite) {
            child.position.addScaledVector(explosion.velocity[childIndex], delta);
            child.material.opacity = fade * 0.9;
            const pulse = 1 + delta * (2.2 - fade);
            child.scale.multiplyScalar(pulse);
          } else if (child instanceof THREE.Mesh) {
            const material = child.material;
            if (material instanceof THREE.MeshBasicMaterial) {
              material.opacity = fade * (child.geometry instanceof THREE.RingGeometry ? 0.72 : 0.48);
            }
            const growth = child.geometry instanceof THREE.RingGeometry ? 1 + delta * (6.4 - fade * 1.8) : 1 + delta * 2.4;
            child.scale.multiplyScalar(growth);
          } else if (child instanceof THREE.PointLight) {
            child.intensity = 3.4 * fade;
          }
        }
        if (explosion.life <= 0) {
          scene.remove(explosion.group);
          disposeObject(explosion.group);
          explosions.splice(i, 1);
        }
      }

      if (phase === "Running") {
        for (const enemy of enemies) {
          const huntsShip = enemy.targetMode === "ship";
          let targetRuntime: PlanetRuntime | null = null;

          if (!huntsShip) {
            targetRuntime =
              planetRuntimes.find((planet) => planet.service.id === enemy.targetPlanetId && !planet.destroyed) ??
              findClosestActivePlanet(enemy.group.position);
            if (targetRuntime) {
              enemy.targetPlanetId = targetRuntime.service.id;
              targetRuntime.group.getWorldPosition(targetRuntime.worldPosition);
            } else {
              enemy.state = "aggro";
            }
          }

          const combatTarget =
            huntsShip || enemy.state === "aggro" || !targetRuntime ? ship.position : targetRuntime.worldPosition;
          enemyDirection.copy(combatTarget).sub(enemy.group.position);
          const targetDistance = enemyDirection.length();
          if (targetDistance > 0.001) {
            enemyDirection.divideScalar(targetDistance);
          }

          const isArmed = enemy.attackDelay <= 0 || huntsShip || enemy.state === "aggro";
          if (enemy.attackDelay > 0) {
            enemy.attackDelay = Math.max(0, enemy.attackDelay - delta);
          }

          const desiredDistance =
            huntsShip || enemy.state === "aggro" || !targetRuntime ? enemy.preferredDistance : targetRuntime.service.size + 2.8;
          if (targetDistance > desiredDistance) {
            enemy.group.position.addScaledVector(enemyDirection, enemy.speed * delta);
          } else if (!huntsShip && enemy.state === "raiding" && targetRuntime) {
            if (isArmed) {
              const raidDamage = 0.26 + Math.min(currentWave, 16) * 0.025;
              damagePlanet(targetRuntime, delta * raidDamage);
            }
            enemy.group.position.addScaledVector(enemyDirection, Math.sin(elapsed * 2 + enemy.id) * delta * 0.35);
          } else {
            enemyLateral.set(-enemyDirection.z, 0, enemyDirection.x).normalize();
            enemy.group.position.addScaledVector(
              enemyLateral,
              Math.sin(elapsed * (enemy.kind === "death-star" ? 0.72 : 1) + enemy.id) *
                delta *
                (enemy.kind === "death-star" ? 1.55 : 1.1)
            );
          }

          for (const other of enemies) {
            if (other.id === enemy.id) {
              continue;
            }
            enemySeparation.copy(enemy.group.position).sub(other.group.position);
            const separationDistance = enemySeparation.length();
            const minimumSeparation = Math.max(1.65, (enemy.separationRadius + other.separationRadius) * 0.5);
            if (separationDistance > 0.001 && separationDistance < minimumSeparation) {
              enemy.group.position.addScaledVector(
                enemySeparation.divideScalar(separationDistance),
                (minimumSeparation - separationDistance) * delta * 2.8
              );
            }
          }

          enemy.group.position.y +=
            Math.sin(elapsed * (enemy.kind === "death-star" ? 1.2 : 2.2) + enemy.id) * delta * 0.18;
          resolveEnemyPlanetAvoidance(enemy, targetRuntime, delta);
          enemy.group.lookAt(combatTarget);
          enemy.group.rotateY(Math.PI);
          if (isArmed) {
            enemy.attackCooldown -= delta;
          }
          if (isArmed && enemy.attackCooldown <= 0) {
            const shotTarget = huntsShip || enemy.state === "aggro" || !targetRuntime ? ship.position : targetRuntime.worldPosition;
            if (enemy.kind === "death-star") {
              spawnDeathStarVolley(enemy, shotTarget, elapsed);
            } else {
              spawnEnemyShot(enemy, shotTarget);
            }
            const waveConfig = getWaveConfig(currentWave);
            enemy.attackCooldown =
              enemy.kind === "death-star"
                ? Math.max(0.72, waveConfig.attackCooldown * 0.28) + (enemy.id % 3) * 0.1
                : waveConfig.attackCooldown + (enemy.id % 5) * 0.22;
          }
        }
      }

      const boostPressed = keys.has("ShiftLeft") || keys.has("ShiftRight") || touchInput.boost;
      const manualThrusting =
        !dockedTarget.active &&
        !autopilotTarget.active &&
        !shipDestroyed &&
        (keys.has("KeyW") || touchInput.thrust || touchInput.boost);
      let dodgeInput = 0;

      if (dockedTarget.active) {
        const dockRuntime =
          planetRuntimes.find((planet) => planet.service.id === dockedTarget.id) ?? selectedRuntime;
        dockRuntime.group.getWorldPosition(targetWorld);
        dockedTarget.angle += delta * 0.36;
        dockedTarget.radius = dockRuntime.service.size + 5.2;
        dockOffset.set(
          Math.cos(dockedTarget.angle) * dockedTarget.radius,
          dockRuntime.service.size * 0.45 + 1.1 + Math.sin(dockedTarget.angle * 1.7) * 0.35,
          Math.sin(dockedTarget.angle) * dockedTarget.radius
        );
        desired.copy(targetWorld).add(dockOffset);
        ship.position.lerp(desired, 1 - Math.pow(0.004, delta));
        velocity.multiplyScalar(0);
        dockTangent.set(-Math.sin(dockedTarget.angle), 0.08, Math.cos(dockedTarget.angle)).normalize();
        shipAim.copy(ship.position).add(dockTangent);
        aimShipAt(shipAim, 1 - Math.pow(0.002, delta));
      } else if (autopilotTarget.active) {
        const targetRuntime =
          planetRuntimes.find((planet) => planet.service.id === autopilotTarget.id && !planet.destroyed) ??
          activePlanets()[0];
        if (!targetRuntime) {
          autopilotTarget.active = false;
          setMode("Manual");
        } else {
          targetRuntime.group.getWorldPosition(targetWorld);
          const awayFromSun = targetWorld.clone().normalize();
          desired.copy(targetWorld).addScaledVector(awayFromSun, targetRuntime.service.size + 3.4);
          desired.y += 1.4;

          const distance = ship.position.distanceTo(desired);
          const direction = desired.clone().sub(ship.position).normalize();
          const targetSpeed = clamp(distance * 0.5, 3.5, 16);
          shipAim.copy(ship.position).add(direction);
          aimShipAt(shipAim, 1 - Math.pow(0.006, delta));
          forward.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
          velocity.lerp(forward.multiplyScalar(targetSpeed), 1 - Math.pow(0.035, delta));

          if (distance < 2.4) {
            autopilotTarget.active = false;
            velocity.multiplyScalar(0.25);
            setMode("Manual");
          }
        }
      } else {
        const yaw = clamp(
          (keys.has("KeyA") ? 1 : 0) -
            (keys.has("KeyD") ? 1 : 0) +
            (touchInput.yawLeft ? 1 : 0) -
            (touchInput.yawRight ? 1 : 0),
          -1,
          1
        );
        const pitch = clamp(
          (keys.has("ArrowDown") ? 1 : 0) -
            (keys.has("ArrowUp") ? 1 : 0) +
            (touchInput.pitchDown ? 1 : 0) -
            (touchInput.pitchUp ? 1 : 0),
          -1,
          1
        );
        const roll = clamp(
          (keys.has("KeyQ") ? 1 : 0) -
            (keys.has("KeyE") ? 1 : 0) +
            (touchInput.rollLeft ? 1 : 0) -
            (touchInput.rollRight ? 1 : 0),
          -1,
          1
        );
        dodgeInput = roll;
        ship.rotation.y += yaw * delta * 1.42;
        ship.rotation.x = clamp(ship.rotation.x + pitch * delta * 1.05, -0.98, 0.98);
        ship.rotation.z += roll * delta * 2.15;
        ship.rotation.z *= 1 - delta * 0.62;

        forward.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
        if (roll !== 0) {
          shipRight.set(1, 0, 0).applyQuaternion(ship.quaternion).normalize();
          velocity.addScaledVector(shipRight, -roll * (boostPressed ? 28 : 20) * delta);
        }
        const thrust = manualThrusting ? (boostPressed ? 32 : 17) : 0;
        if (thrust > 0) {
          velocity.addScaledVector(forward, thrust * delta);
        }
        if (keys.has("KeyS") || touchInput.brake) {
          velocity.multiplyScalar(1 - delta * 2.7);
        }
        if (keys.has("Space") || touchInput.ascend) {
          velocity.y += 9.5 * delta;
        }
        if (keys.has("KeyC") || touchInput.descend) {
          velocity.y -= 9.5 * delta;
        }
      }

      velocity.multiplyScalar(1 - delta * 0.12);
      velocity.clampLength(0, dodgeInput !== 0 ? (boostPressed ? 42 : 38) : 34);
      thrustHold = manualThrusting ? clamp(thrustHold + delta * (boostPressed ? 0.92 : 0.72), 0, 1) : Math.max(0, thrustHold - delta * 2.8);
      const speedRatio = clamp(velocity.length() / 34, 0, 1);
      const targetFlamePower = manualThrusting
        ? clamp(0.18 + thrustHold * 0.5 + speedRatio * 0.3 + (boostPressed ? 0.42 : 0), 0, 1.35)
        : 0;
      const flameResponse = targetFlamePower > flamePower ? 1 - Math.pow(0.018, delta) : 1 - Math.pow(0.001, delta);
      flamePower += (targetFlamePower - flamePower) * flameResponse;
      if (!manualThrusting && flamePower < 0.006) {
        flamePower = 0;
      }
      updateShipFlames(flamePower, elapsed, boostPressed && manualThrusting);
      ship.position.addScaledVector(velocity, delta);
      ship.position.y = clamp(ship.position.y, -16, 28);

      if (!dockedTarget.active) {
        for (const runtime of planetRuntimes) {
          if (runtime.destroyed) {
            continue;
          }
          runtime.group.getWorldPosition(runtime.worldPosition);
          avoidanceNormal.copy(ship.position).sub(runtime.worldPosition);
          const distance = avoidanceNormal.length();
          const safeDistance = runtime.service.size + 1.55;
          if (distance < safeDistance) {
            if (distance < 0.001) {
              avoidanceNormal.copy(runtime.worldPosition).normalize();
            } else {
              avoidanceNormal.divideScalar(distance);
            }
            ship.position.copy(runtime.worldPosition).addScaledVector(avoidanceNormal, safeDistance);
            const inwardSpeed = velocity.dot(avoidanceNormal);
            if (inwardSpeed < 0) {
              velocity.addScaledVector(avoidanceNormal, -inwardSpeed * 1.35);
            }
            velocity.multiplyScalar(0.42);
          }
        }

        const sunSafeDistance = 7.8;
        const sunDistance = ship.position.length();
        if (sunDistance < sunSafeDistance) {
          if (sunDistance < 0.001) {
            avoidanceNormal.set(1, 0, 0);
          } else {
            avoidanceNormal.copy(ship.position).normalize();
          }
          ship.position.copy(avoidanceNormal).multiplyScalar(sunSafeDistance);
          const inwardSpeed = velocity.dot(avoidanceNormal);
          if (inwardSpeed < 0) {
            velocity.addScaledVector(avoidanceNormal, -inwardSpeed * 1.2);
          }
          velocity.multiplyScalar(0.36);
        }
      }

      if (phase !== "Game over") {
        for (let i = projectiles.length - 1; i >= 0; i -= 1) {
          const projectile = projectiles[i];
          projectile.age = (projectile.age ?? 0) + delta;
          if (projectile.owner === "player" && projectile.homing) {
            let target = projectile.targetEnemyId
              ? enemies.find((enemy) => enemy.id === projectile.targetEnemyId)
              : null;
            if (target && target.group.position.distanceTo(projectile.mesh.position) > 180) {
              target = null;
              projectile.targetEnemyId = undefined;
            }
            if (!target) {
              target = findEnemyInDirection(projectile.mesh.position, projectile.velocity, 160, 0.02);
              projectile.targetEnemyId = target?.id;
            }
            if (target) {
              target.group.getWorldPosition(targetEnemyPosition);
              const speed = projectile.velocity.length();
              projectileDirection.copy(targetEnemyPosition).sub(projectile.mesh.position).normalize().multiplyScalar(speed);
              projectile.velocity.lerp(projectileDirection, clamp((projectile.turnRate ?? 2.8) * delta, 0, 1));
              projectile.velocity.setLength(speed);
              projectile.mesh.lookAt(projectile.mesh.position.clone().add(projectile.velocity));
            }
          }
          if (projectile.weaponId === "plasma-orb") {
            const pulse = 1.08 + Math.sin(elapsed * 18) * 0.12;
            projectile.mesh.scale.setScalar(pulse);
            projectile.mesh.rotation.x += delta * 1.6;
            projectile.mesh.rotation.y += delta * 2.2;
            projectile.mesh.rotation.z -= delta * 1.1;
          }
          projectile.mesh.position.addScaledVector(projectile.velocity, delta);
          projectile.life -= delta;

          if (projectile.owner === "player") {
            for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
              const enemy = enemies[enemyIndex];
              const hitDistance = projectile.mesh.position.distanceTo(enemy.group.position);
              if (hitDistance < projectile.radius + enemy.hitRadius) {
                if (projectile.blastRadius) {
                  detonatePlayerProjectile(projectile);
                } else {
                  damageEnemy(enemy, projectile.damage, enemy.group.position);
                  removeProjectile(projectile);
                }
                break;
              }
            }
          } else {
            if (!dockedTarget.active && projectile.mesh.position.distanceTo(ship.position) < projectile.radius + 1.0) {
              damageShip(12 + Math.min(currentWave, 10) * 1.4);
              if (!shipDestroyed) {
                velocity.addScaledVector(projectile.velocity.clone().normalize(), 3.4);
              }
              removeProjectile(projectile);
              continue;
            }

            if (projectile.canDamagePlanets !== false) {
              for (const runtime of planetRuntimes) {
                if (runtime.destroyed) {
                  continue;
                }
                runtime.group.getWorldPosition(runtime.worldPosition);
                if (projectile.mesh.position.distanceTo(runtime.worldPosition) < runtime.service.size + projectile.radius) {
                  damagePlanet(runtime, projectile.damage * (2 + Math.min(currentWave, 10) * 0.14));
                  removeProjectile(projectile);
                  break;
                }
              }
            }
          }

          if (projectiles.includes(projectile) && projectile.life <= 0) {
            if (projectile.owner === "player" && projectile.detonateOnExpire) {
              detonatePlayerProjectile(projectile);
            } else {
              removeProjectile(projectile);
            }
          }
        }
      }

      let nearestRuntime: PlanetRuntime | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const runtime of planetRuntimes) {
        if (runtime.destroyed) {
          runtime.ring.material.opacity = 0;
          continue;
        }
        runtime.group.getWorldPosition(runtime.worldPosition);
        const distance = ship.position.distanceTo(runtime.worldPosition) - runtime.service.size;
        const isSelected = runtime.service.id === selectedIdRef.current;
        runtime.ring.material.opacity = isSelected ? 0.18 : 0.0;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestRuntime = runtime;
        }
      }

      if (nearestRuntime) {
        const canDock = nearestDistance < 4.8;
        nearestRuntime.ring.material.opacity = canDock ? 0.86 : Math.max(nearestRuntime.ring.material.opacity, 0.24);
        const nearbyKey = `${nearestRuntime.service.id}:${canDock}:${Math.round(nearestDistance * 10)}`;
        if (nearbyKey !== lastNearbyKey) {
          lastNearbyKey = nearbyKey;
          setNearby({
            id: nearestRuntime.service.id,
            name: nearestRuntime.service.name,
            distance: nearestDistance,
            canDock
          });
        }
      } else if (lastNearbyKey !== "none") {
        lastNearbyKey = "none";
        setNearby(null);
      }

      if (dockedTarget.active) {
        const dockRuntime =
          planetRuntimes.find((planet) => planet.service.id === dockedTarget.id && !planet.destroyed) ?? selectedRuntime;
        dockRuntime.group.getWorldPosition(targetWorld);
        const cameraAngle = dockedTarget.angle - 0.68;
        const cameraRadius = dockedTarget.radius + dockRuntime.service.size + 7.5;
        cameraOffset.set(
          Math.cos(cameraAngle) * cameraRadius,
          dockRuntime.service.size + 5.4,
          Math.sin(cameraAngle) * cameraRadius
        );
        camera.position.lerp(targetWorld.clone().add(cameraOffset), 1 - Math.pow(0.012, delta));
        cameraDockTarget.copy(targetWorld).lerp(ship.position, 0.2);
        cameraDockTarget.y += dockRuntime.service.size * 0.22;
        camera.lookAt(cameraDockTarget);
      } else {
        forward.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
        cameraOffset.set(0, 4.8, 12.5).applyQuaternion(ship.quaternion);
        camera.position.lerp(ship.position.clone().add(cameraOffset), 1 - Math.pow(0.015, delta));
        cameraLookAt.copy(ship.position).addScaledVector(forward, 12);
        cameraLookAt.y += 1.2;
        camera.lookAt(cameraLookAt);
      }

      if (elapsed - lastTelemetry > 0.12) {
        lastTelemetry = elapsed;
        setTelemetry({
          speed: velocity.length(),
          distance: distanceToSelected,
          targetName: selectedRuntime.service.name,
          mode: dockedTarget.active ? "Docked" : autopilotTarget.active ? "Autopilot" : "Manual"
        });
      }

      if (elapsed - lastCombatHud > 0.2) {
        lastCombatHud = elapsed;
        const targetRuntime =
          planetRuntimes.find((planet) => planet.service.id === currentWaveTargetId && !planet.destroyed) ??
          activePlanets()[0] ??
          selectedRuntime;
        const threatNames = Array.from(
          new Set(
            [
              ...enemies
                .filter((enemy) => enemy.targetMode === "planet")
                .map((enemy) =>
                  planetRuntimes.find((planet) => planet.service.id === enemy.targetPlanetId && !planet.destroyed)
                )
                .filter((planet): planet is PlanetRuntime => Boolean(planet))
                .map((planet) => planet.service.name),
              ...(enemies.some((enemy) => enemy.targetMode === "ship") ? ["Your ship"] : [])
            ]
          )
        );
        const threat =
          gamePhaseRef.current === "Awaiting"
            ? "Awaiting signal"
            : gamePhaseRef.current === "Countdown"
              ? "Next round"
              : gamePhaseRef.current === "Game over"
                ? "All planets lost"
                : threatNames.length > 0
                  ? threatNames.join(" / ")
                  : "Sector clear";
        const planetHealth = targetRuntime.destroyed
          ? 0
          : Math.round((targetRuntime.health / targetRuntime.maxHealth) * 100);
        const roundCountdown =
          gamePhaseRef.current === "Countdown" ? Math.max(0, Math.ceil(waveCooldown)) : null;
        syncPlanetHud();
        setCombatHud({
          enemies: enemies.length,
          phase: gamePhaseRef.current,
          planetHealth,
          roundCountdown,
          score,
          threat,
          wave: currentWave
        });
        renderer.domElement.dataset.gameStats = JSON.stringify({
          credits: creditsRef.current,
          enemies: enemies.length,
          flamePower: Number(flamePower.toFixed(3)),
          phase: gamePhaseRef.current,
          planetHealth,
          planets: planetRuntimes.map((planet) => ({
            destroyed: planet.destroyed,
            health: Math.round((planet.health / planet.maxHealth) * 100),
            id: planet.service.id
          })),
          projectiles: projectiles.length,
          roundCountdown,
          score,
          secondaryAmmo: formatWeaponAmmo(secondaryWeaponIdRef.current, weaponAmmoRef.current),
          secondaryWeapon: secondaryWeaponIdRef.current,
          shipHealth: Math.round(runtimeShipHealth),
          threat,
          primaryAmmo: formatWeaponAmmo(primaryWeaponIdRef.current, weaponAmmoRef.current),
          primaryWeapon: primaryWeaponIdRef.current,
          wave: currentWave
        });
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      if (elapsed - lastPixelSample > 0.55) {
        lastPixelSample = elapsed;
        renderer.domElement.dataset.pixelStats = JSON.stringify(sampleCanvas());
      }
    };

    animate();
    scheduleRuntimeWarmup();

    return () => {
      window.cancelAnimationFrame(frameId);
      if (runtimeWarmupIdleId !== null) {
        const idleWindow = window as Window & { cancelIdleCallback?: (handle: number) => void };
        idleWindow.cancelIdleCallback?.(runtimeWarmupIdleId);
      }
      if (runtimeWarmupTimeoutId !== null) {
        window.clearTimeout(runtimeWarmupTimeoutId);
      }
      clearTouchHoldFire();
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("pointerlockchange", syncPointerLockMode);
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      bridgeRef.current = null;
      if (window.__pirxeySpaceDebug === debugApi) {
        delete window.__pirxeySpaceDebug;
      }
      labelRenderer.domElement.remove();
      renderer.domElement.remove();
      renderer.dispose();
      disposeObject(scene);
    };
  }, [initialMatchPhase, matchId, services]);

  const offeredWeapon = nearbyWeaponOffer?.weapon ?? null;
  const offeredWeaponOwned = offeredWeapon ? ownedWeaponIds.includes(offeredWeapon.id) : false;
  const offeredWeaponEquipped =
    offeredWeapon?.slot === "primary"
      ? offeredWeapon.id === primaryWeaponId
      : offeredWeapon
        ? offeredWeapon.id === secondaryWeaponId
        : false;
  const offeredWeaponAmmo = offeredWeapon ? getWeaponAmmo(offeredWeapon.id, weaponAmmo) : 0;
  const offeredWeaponCapacity = offeredWeapon?.ammoCapacity ?? null;
  const offeredWeaponNeedsReload =
    Boolean(offeredWeapon) && offeredWeaponCapacity !== null && offeredWeaponAmmo < offeredWeaponCapacity;
  const offeredWeaponNeedsPayment = Boolean(offeredWeapon) && (!offeredWeaponOwned || offeredWeaponNeedsReload);
  const offeredWeaponAffordable = offeredWeapon ? !offeredWeaponNeedsPayment || credits >= offeredWeapon.price : false;
  const offeredWeaponAmmoStatus =
    offeredWeaponCapacity === null
      ? "Ammo INF"
      : `Ammo ${Math.max(0, Math.floor(offeredWeaponAmmo))}/${offeredWeaponCapacity}`;
  const offeredWeaponAction = !offeredWeaponOwned
    ? "Buy"
    : offeredWeaponNeedsReload
      ? "Reload"
      : offeredWeaponEquipped
        ? "Equipped"
        : "Equip";
  const offeredWeaponStatus = offeredWeaponEquipped
    ? "Equipped"
    : offeredWeaponOwned
      ? offeredWeaponNeedsReload
        ? "Reload"
        : "Owned"
      : "New";
  const offeredWeaponPriceLabel = offeredWeapon ? `${offeredWeapon.price} cr` : "";

  return (
    <main
      ref={shellRef}
      className={`space-game-shell relative w-screen overflow-hidden bg-void text-parchment ${dockedService ? "is-docked" : ""} ${
        isBattleStarted || gamePhase === "Game over" ? "is-battle-active" : ""
      }`}
    >
      <div
        ref={mountRef}
        className={`absolute inset-0 ${
          cameraMode === "Mouse aim" ? "cursor-none" : "cursor-grab active:cursor-grabbing"
        }`}
      />

      {!dockedService ? (
        <div className="game-crosshair" aria-hidden="true" />
      ) : null}

      {isBattleStarted && !dockedService ? (
        <div className="pointer-events-none ammo-strip" aria-hidden="true">
          <div className="ammo-strip-card">
            <span>
              <span className="ammo-label-full">Primary</span>
              <span className="ammo-label-short">PRI</span>
            </span>
            <strong>{primaryAmmoLabel}</strong>
            <em>{activePrimaryWeapon.name}</em>
          </div>
          <div className="ammo-strip-card">
            <span>
              <span className="ammo-label-full">Secondary</span>
              <span className="ammo-label-short">SEC</span>
            </span>
            <strong>{secondaryAmmoLabel}</strong>
            <em>{activeSecondaryWeapon?.name ?? "Empty"}</em>
          </div>
        </div>
      ) : null}

      {!dockedService && gamePhase !== "Awaiting" && gamePhase !== "Game over" ? (
        <div className="mobile-flight-controls" aria-label="Touch flight controls">
          <div className="mobile-control-cluster mobile-control-cluster-left mobile-throttle-cluster">
            <MobileFlightButton
              label="Boost"
              className="is-compact is-boost"
              icon={<ChevronsUp />}
              pressInput={{ boost: true }}
              setTouchInput={setTouchInput}
            />
            <div className="mobile-throttle-row" aria-label="Touch thrust and yaw">
              <MobileFlightButton
                label="Yaw"
                ariaLabel="Yaw left"
                className="is-icon-only"
                icon={<ChevronLeft />}
                pressInput={{ yawLeft: true }}
                setTouchInput={setTouchInput}
              />
              <MobileFlightButton
                label="Thrust"
                className="is-thrust"
                icon={<Rocket />}
                pressInput={{ thrust: true }}
                setTouchInput={setTouchInput}
              />
              <MobileFlightButton
                label="Yaw"
                ariaLabel="Yaw right"
                className="is-icon-only"
                icon={<ChevronRight />}
                pressInput={{ yawRight: true }}
                setTouchInput={setTouchInput}
              />
            </div>
            <MobileFlightButton
              label="Brake"
              className="is-compact is-brake"
              icon={<Gauge />}
              pressInput={{ brake: true }}
              setTouchInput={setTouchInput}
            />
          </div>

          <div className={`mobile-control-cluster mobile-control-cluster-right ${canUseNavigation ? "mobile-navigation-cluster" : ""}`}>
            {canUseNavigation ? (
              <div className="mobile-target-row" aria-label="Touch destination navigation">
                <MobileActionButton
                  label="Previous target"
                  className="is-nav-action"
                  icon={<ChevronLeft />}
                  onClick={() => selectAdjacentTarget(-1)}
                />
                <MobileActionButton
                  label="Autopilot"
                  className="is-nav-action is-autopilot"
                  icon={<Navigation />}
                  onClick={() => selectTarget(selectedService.id)}
                />
                <MobileActionButton
                  label="Next target"
                  className="is-nav-action"
                  icon={<ChevronRight />}
                  onClick={() => selectAdjacentTarget(1)}
                />
              </div>
            ) : (
              <>
                <div className="mobile-fire-row">
                  <MobileFlightButton
                    label="Fire"
                    className="is-fire"
                    icon={<Crosshair />}
                    pressInput={{ primaryFire: true }}
                    setTouchInput={setTouchInput}
                  />
                  <MobileFlightButton
                    label="Alt"
                    className="is-alt-fire"
                    ariaLabel="Fire secondary weapon"
                    icon={<Zap />}
                    pressInput={{ secondaryFire: true }}
                    setTouchInput={setTouchInput}
                  />
                </div>
                <div className="mobile-control-row">
                  <MobileFlightButton
                    label="Evade L"
                    className="is-compact"
                    icon={<RotateCcw />}
                    pressInput={{ rollLeft: true }}
                    setTouchInput={setTouchInput}
                  />
                  <MobileFlightButton
                    label="Evade R"
                    className="is-compact"
                    icon={<RotateCcw className="mobile-flip-icon" />}
                    pressInput={{ rollRight: true }}
                    setTouchInput={setTouchInput}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {gamePhase === "Countdown" ? (
        <div className="round-banner" aria-live="polite">
          <span>Next round</span>
          <strong>{combatHud.roundCountdown ?? 0}</strong>
        </div>
      ) : null}

      {gamePhase === "Paused" ? (
        <div className="round-banner is-paused" aria-live="polite">
          <span>Simulation</span>
          <strong>Paused</strong>
        </div>
      ) : null}

      {gamePhase === "Game over" ? (
        <div className="round-banner is-danger" aria-live="polite">
          <span>Defense failed</span>
          <strong>Game over</strong>
          <div className="round-actions">
            <button type="button" onClick={restartMatch}>
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
            <button type="button" onClick={enterExploreMode}>
              <Telescope className="h-4 w-4" />
              Explore
            </button>
          </div>
        </div>
      ) : null}

      {gamePhase === "Awaiting" ? (
        <section className="invasion-toast is-invitation" aria-label="Space bugs invasion alert">
          <p>The space bugs invasion is starting. Will you help defend the Pirxey planets?</p>
          <div className="invasion-actions">
            <button type="button" onClick={startGame}>
              Yes, launch
            </button>
            <button type="button" className="is-secondary" onClick={enterExploreMode}>
              Explore first
            </button>
          </div>
        </section>
      ) : null}

      {showPlanetRoster ? (
        <div className="pointer-events-none planet-roster" aria-hidden="true">
          {planetHud.map((planet) => (
            <div key={planet.id} className={`planet-status ${planet.destroyed ? "is-destroyed" : ""}`}>
              <span className="planet-status-name">{planet.name}</span>
              <strong className="planet-status-value">{planet.destroyed ? "Lost" : `${planet.health}%`}</strong>
              <span className="planet-status-compact">
                <em>{getPlanetCode(planet)}</em>
                <strong>{planet.destroyed ? "Lost" : `${planet.health}%`}</strong>
              </span>
              <i>
                <b style={{ width: `${planet.destroyed ? 0 : planet.health}%` }} />
              </i>
            </div>
          ))}
        </div>
      ) : null}

      {showCombatHud ? (
        <div className="pointer-events-none combat-hud" aria-hidden="true">
          <div className="combat-card combat-card-wave">
            <span className="combat-label">
              <span className="combat-label-full">Wave</span>
              <span className="combat-label-short">W</span>
            </span>
            <strong>{combatHud.wave}</strong>
          </div>
          <div className="combat-card combat-card-hostiles">
            <span className="combat-label">
              <span className="combat-label-full">Hostiles</span>
              <span className="combat-label-short">HST</span>
            </span>
            <strong>{combatHud.enemies}</strong>
          </div>
          <div className="combat-card combat-card-wide combat-card-ship">
            <span className="combat-label">
              <span className="combat-label-full">Ship HP</span>
              <span className="combat-label-short">HP</span>
            </span>
            <strong>{shipHealth}%</strong>
            <div className="ship-health">
              <i style={{ width: `${shipHealth}%` }} />
            </div>
          </div>
          <div className="combat-card combat-card-wide combat-card-planet">
            <span className="combat-label">
              <span className="combat-label-full">Defend {combatHud.threat}</span>
              <span className="combat-label-short">DEF</span>
            </span>
            <strong>{combatHud.planetHealth}%</strong>
            <div className="planet-health">
              <i style={{ width: `${combatHud.planetHealth}%` }} />
            </div>
          </div>
          <div className="combat-card combat-card-score">
            <span className="combat-label">
              <span className="combat-label-full">Score</span>
              <span className="combat-label-short">SC</span>
            </span>
            <strong>{combatHud.score}</strong>
          </div>
          <div className="combat-card combat-card-credits">
            <span className="combat-label">
              <span className="combat-label-full">Credits</span>
              <span className="combat-label-short">CR</span>
            </span>
            <strong>{credits}</strong>
          </div>
          <div className="combat-card combat-card-state">
            <span className="combat-label">
              <span className="combat-label-full">State</span>
              <span className="combat-label-short">ST</span>
            </span>
            <strong>{gamePhase}</strong>
          </div>
        </div>
      ) : null}

      <div className="game-ui-layer pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="pointer-events-auto top-shell flex items-center gap-4">
            <div className="pirxey-mark">
              <img src="/pirxey-logo.svg" alt="Pirxey" className="pirxey-logo" />
            </div>
            <div className="top-shell-copy hidden min-w-0 border-l border-parchment/20 pl-4 md:block">
              <p className="font-display text-xs uppercase text-parchment/55">AI-native mission map</p>
              <p className="max-w-xl font-body text-sm text-parchment/80">
                Fly between service planets. Dock near an orbit to open the Pirxey service brief.
              </p>
            </div>
          </div>

          <div className="pointer-events-auto status-strip hidden items-center gap-3 lg:flex">
            <Radio className="h-4 w-4 text-orbit" />
            <span>{telemetry.mode}</span>
            <span className="h-1 w-1 rounded-full bg-parchment/40" />
            <span>{telemetry.targetName}</span>
          </div>
        </header>

        {!dockedService ? (
          <div className="pointer-events-auto flight-toolbar" aria-label="Flight actions">
            <button
              className={`toolbar-button controls-toggle ${showControls ? "is-active" : ""}`}
              type="button"
              aria-expanded={showControls}
              onClick={() => setShowControls((value) => !value)}
            >
              <Gauge className="h-4 w-4" />
              Controls
            </button>
            {canUseNavigation ? (
              <>
                <button
                  className={`toolbar-button ${showDestinations ? "is-active" : ""}`}
                  type="button"
                  aria-expanded={showDestinations}
                  onClick={() => setShowDestinations((value) => !value)}
                >
                  <ListChecks className="h-4 w-4" />
                  Destinations
                </button>
                <button className="toolbar-button autopilot-cta" type="button" onClick={() => selectTarget(selectedService.id)}>
                  <Navigation className="h-4 w-4" />
                  Autopilot
                </button>
                {gamePhase === "Exploring" ? (
                  <button className="toolbar-button defense-cta" type="button" onClick={startDefenseFromExplore}>
                    <Play className="h-4 w-4" />
                    Start defense
                  </button>
                ) : null}
              </>
            ) : null}
            {gamePhase === "Running" || gamePhase === "Countdown" || gamePhase === "Paused" ? (
              <button
                className={`toolbar-button ${gamePhase === "Paused" ? "is-active" : ""}`}
                type="button"
                onClick={togglePause}
              >
                {gamePhase === "Paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {gamePhase === "Paused" ? "Resume" : "Pause"}
              </button>
            ) : null}
            {isBattleStarted ? (
              <button
                className={`toolbar-button audio-toggle ${audioMuted ? "is-muted" : ""}`}
                type="button"
                aria-label={audioMuted ? "Unmute battle audio" : "Mute battle audio"}
                title={audioMuted ? "Unmute battle audio" : "Mute battle audio"}
                onClick={toggleAudioMuted}
              >
                {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span className="sr-only">{audioMuted ? "Unmute audio" : "Mute audio"}</span>
              </button>
            ) : null}
          </div>
        ) : null}

        <section className="grid flex-1 grid-cols-1 items-end gap-4 pt-4 lg:grid-cols-[minmax(260px,340px)_1fr_minmax(280px,360px)]">
          <div className={`pointer-events-auto hud-panel controls-panel order-2 self-end lg:order-1 ${showControls ? "" : "is-hidden"}`}>
            <div className="flex items-center gap-2 border-b border-parchment/10 pb-3">
              <Rocket className="h-4 w-4 text-ember" />
              <h1 className="font-display text-sm uppercase text-parchment">Pirxey scout controls</h1>
            </div>
            <div className="controls-grid mt-4 grid grid-cols-2 gap-3 text-sm">
              <ControlHint icon={<Navigation />} label="W / Shift" value="thrust / boost" />
              <ControlHint icon={<Gauge />} label="S" value="brake" />
              <ControlHint icon={<Compass />} label="A / D" value="yaw" />
              <ControlHint icon={<MousePointer2 />} label="Drag" value="look around" />
              <ControlHint icon={<MousePointer2 />} label="V" value="toggle camera" />
              <ControlHint icon={<Target />} label="E" value={canUseNavigation ? "dock nearby" : "disabled in battle"} />
              <ControlHint icon={<Crosshair />} label="Hold Click / F" value="fire cannons" />
              <ControlHint icon={<Zap />} label="Right Click / G" value={activeSecondaryWeapon ? activeSecondaryWeapon.name : "buy secondary"} />
              <ControlHint icon={<Navigation />} label="Space / C" value="vertical" />
            </div>
            <div className="camera-mode-note">
              <span>
                <MousePointer2 className="h-4 w-4" />
                Press V to toggle camera mode
              </span>
              <button type="button" onClick={() => bridgeRef.current?.toggleCameraMode()}>
                {cameraMode === "Mouse aim" ? "Drag aim" : "Mouse aim"}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-parchment/10 pt-4">
              <Metric label="speed" value={`${telemetry.speed.toFixed(1)}`} />
              <Metric label="target" value={formatDistance(telemetry.distance)} />
              <Metric
                label="dock"
                value={!canUseNavigation ? "locked" : nearby?.canDock ? "ready" : "scan"}
                tone={canUseNavigation && nearby?.canDock ? "hot" : "cool"}
              />
            </div>
            <div className="weapon-loadout">
              <div className="weapon-loadout-head">
                <span>Loadout</span>
                <strong>{credits} Credits</strong>
              </div>
              <div className="weapon-loadout-row">
                <span>Primary</span>
                <div>
                  {ownedPrimaryWeapons.map((weapon) => {
                    const ammo = getWeaponAmmo(weapon.id, weaponAmmo);
                    const empty = weapon.ammoCapacity !== null && ammo <= 0;
                    return (
                      <button
                        key={weapon.id}
                        className={`weapon-chip ${weapon.id === primaryWeaponId ? "is-active" : ""} ${empty ? "is-empty" : ""}`}
                        type="button"
                        onClick={() => equipWeapon(weapon.id)}
                      >
                        {weapon.name}
                        <span>{formatWeaponAmmo(weapon.id, weaponAmmo)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="weapon-loadout-row">
                <span>Secondary</span>
                <div>
                  {ownedSecondaryWeapons.length > 0 ? (
                    ownedSecondaryWeapons.map((weapon) => {
                      const ammo = getWeaponAmmo(weapon.id, weaponAmmo);
                      const empty = weapon.ammoCapacity !== null && ammo <= 0;
                      return (
                        <button
                          key={weapon.id}
                          className={`weapon-chip ${weapon.id === secondaryWeaponId ? "is-active" : ""} ${empty ? "is-empty" : ""}`}
                          type="button"
                          onClick={() => equipWeapon(weapon.id)}
                        >
                          {weapon.name}
                          <span>{formatWeaponAmmo(weapon.id, weaponAmmo)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <em>Buy at planets</em>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none hud-action-slot order-1 flex min-h-[170px] items-end justify-center lg:order-2">
            {nearbyWeaponOffer && offeredWeapon ? (
              <div className="pointer-events-auto weapon-shop-bubble">
                <div className="weapon-shop-icon">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="weapon-shop-copy">
                  <span>{nearbyWeaponOffer.planetName} armory</span>
                  <strong>{offeredWeapon.name}</strong>
                  <p>{offeredWeapon.description}</p>
                  <small>
                    <span>{offeredWeapon.slot}</span>
                    <span>{offeredWeaponAmmoStatus}</span>
                    <span>Price {offeredWeaponPriceLabel}</span>
                    <span>{offeredWeaponStatus}</span>
                  </small>
                </div>
                <button
                  className={offeredWeaponNeedsPayment && !offeredWeaponAffordable ? "is-locked" : ""}
                  type="button"
                  aria-disabled={offeredWeaponNeedsPayment && !offeredWeaponAffordable}
                  onClick={() => buyOrEquipWeapon(offeredWeapon.id)}
                >
                  <Coins className="h-4 w-4" />
                  {offeredWeaponAction}
                  <span className="weapon-shop-key">E</span>
                </button>
              </div>
            ) : canUseNavigation && nearby?.canDock && !dockedService ? (
              <button
                className="pointer-events-auto dock-button"
                type="button"
                onClick={() => bridgeRef.current?.dockCurrent()}
              >
                <Target className="h-4 w-4" />
                <span className="dock-button-text dock-button-text-full">Dock with {nearby.name}</span>
                <span className="dock-button-text dock-button-text-short">Visit planet</span>
                <span className="dock-button-key">E</span>
              </button>
            ) : dockedService ? (
              <div className="flight-status-pill pointer-events-none hidden rounded-full border border-orbit/30 bg-void/45 px-4 py-2 font-display text-xs uppercase text-parchment/70 backdrop-blur-md md:block">
                Docked orbit active - camera tracking {dockedService.name}
              </div>
            ) : (
              <div className="flight-status-pill pointer-events-none hidden rounded-full border border-parchment/15 bg-void/35 px-4 py-2 font-display text-xs uppercase text-parchment/55 backdrop-blur-md md:block">
                Nearest orbit: {nearby ? `${nearby.name} - ${formatDistance(nearby.distance)}` : "scanning"}
              </div>
            )}
          </div>

          <aside className={`pointer-events-auto service-panel order-3 self-end ${dockedService || !showDestinations || !canUseNavigation ? "is-stowed" : ""}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-xs uppercase text-orbit">Service planets</p>
                <h2 className="font-display text-xl text-parchment">Select destination</h2>
              </div>
              <Target className="h-5 w-5 text-ember" />
            </div>

            <div className="service-list">
              {services.map((service, index) => {
                const isDestroyed = destroyedPlanetIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    className={`service-target ${selectedId === service.id ? "is-active" : ""} ${isDestroyed ? "is-destroyed" : ""}`}
                    type="button"
                    disabled={isDestroyed}
                    onClick={() => selectTarget(service.id)}
                  >
                    <span className="service-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-sm">{service.name}</span>
                      <span className="block truncate font-body text-xs text-parchment/55">
                        {isDestroyed ? "Planet lost" : service.eyebrow}
                      </span>
                    </span>
                    <span className="service-dot" />
                  </button>
                );
              })}
            </div>
          </aside>
        </section>
      </div>

      {dockedService ? (
        <div className="modal-backdrop" role="presentation">
          <section className="dock-modal" role="dialog" aria-modal="true" aria-labelledby="dock-title">
            <button className="modal-close" type="button" aria-label="Close service brief" onClick={closeDock}>
              <X className="h-5 w-5" />
            </button>
            <p className="font-display text-xs uppercase text-ember">{dockedService.eyebrow}</p>
            <h2 id="dock-title" className="mt-2 font-display text-3xl text-void">
              {dockedService.title}
            </h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-7 text-void/75">{dockedService.description}</p>

            <div className="dock-modal-grid mt-6">
              <div>
                <h3 className="font-display text-xs uppercase text-void/50">Subservices</h3>
                <div className="mt-3 grid gap-2">
                  {dockedService.subservices.map((item) => (
                    <div key={item} className="service-chip">
                      <span />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="case-brief">
                <h3 className="font-display text-xs uppercase text-void/50">Mission fit</h3>
                <p className="mt-3 font-body text-sm leading-6 text-void/70">{dockedService.caseStudy}</p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button className="modal-action" type="button" onClick={closeDock}>
                Undock and continue flight
              </button>
              <span className="font-display text-xs uppercase text-void/40">Pirxey service galaxy prototype</span>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function ControlHint({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="control-hint">
      <span className="control-icon">{icon}</span>
      <span>
        <span className="block font-display text-xs uppercase text-parchment">{label}</span>
        <span className="block truncate text-xs text-parchment/55">{value}</span>
      </span>
    </div>
  );
}

function Metric({ label, value, tone = "cool" }: { label: string; value: string; tone?: "cool" | "hot" }) {
  return (
    <div className={`metric ${tone === "hot" ? "is-hot" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const getTouchReleasePatch = (pressInput: Partial<TouchFlightInput>) => {
  const releaseInput: Partial<TouchFlightInput> = {};
  for (const key of Object.keys(pressInput) as Array<keyof TouchFlightInput>) {
    releaseInput[key] = false;
  }
  return releaseInput;
};

function MobileFlightButton({
  ariaLabel,
  className = "",
  icon,
  label,
  pressInput,
  releaseInput,
  setTouchInput
}: {
  ariaLabel?: string;
  className?: string;
  icon: React.ReactNode;
  label: string;
  pressInput: Partial<TouchFlightInput>;
  releaseInput?: Partial<TouchFlightInput>;
  setTouchInput: (patch: Partial<TouchFlightInput>) => void;
}) {
  const stopTouch = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const release = (event: React.PointerEvent<HTMLButtonElement>) => {
    stopTouch(event);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setTouchInput(releaseInput ?? getTouchReleasePatch(pressInput));
  };

  return (
    <button
      className={`mobile-control-button ${className}`}
      type="button"
      aria-label={ariaLabel ?? label}
      onPointerDown={(event) => {
        stopTouch(event);
        event.currentTarget.setPointerCapture(event.pointerId);
        setTouchInput(pressInput);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="mobile-control-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MobileActionButton({
  className = "",
  icon,
  label,
  onClick
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const stopTouch = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <button
      className={`mobile-control-button ${className}`}
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={stopTouch}
      onPointerUp={stopTouch}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="mobile-control-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
