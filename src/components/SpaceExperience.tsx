import {
  Compass,
  Gauge,
  ListChecks,
  MousePointer2,
  Navigation,
  Radio,
  Rocket,
  Target,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { ServicePlanet } from "../data/services";

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

type PlanetRuntime = {
  service: ServicePlanet;
  orbit: THREE.Object3D;
  body: THREE.Mesh;
  group: THREE.Group;
  ring: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  worldPosition: THREE.Vector3;
};

type SceneBridge = {
  flyTo: (id: string) => void;
  dockCurrent: () => void;
  releaseDock: () => void;
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

const createPlanetTexture = (service: ServicePlanet, index: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const random = randomFromSeed(1100 + index * 71);
  const [primary, secondary, shadow] = service.colors;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, primary);
  gradient.addColorStop(0.48, mixColor(primary, secondary, 0.45));
  gradient.addColorStop(1, shadow);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 28; i += 1) {
    const y = random() * canvas.height;
    const height = 10 + random() * 42;
    const alpha = 0.08 + random() * 0.2;
    ctx.fillStyle = random() > 0.5 ? `rgba(255, 249, 228, ${alpha})` : `rgba(7, 4, 17, ${alpha})`;
    ctx.fillRect(0, y, canvas.width, height);
  }

  for (let i = 0; i < 900; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = random() * 2.5;
    const alpha = 0.04 + random() * 0.12;
    ctx.beginPath();
    ctx.fillStyle = random() > 0.5 ? `rgba(255, 255, 235, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 24; i += 1) {
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

const createSunTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
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
  for (let i = 0; i < 120; i += 1) {
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
  for (let i = 0; i < 34; i += 1) {
    const y = random() * canvas.height;
    const height = 4 + random() * 18;
    ctx.fillStyle = `rgba(103, 25, 15, ${0.04 + random() * 0.08})`;
    ctx.fillRect(0, y, canvas.width, height);
  }

  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 1800; i += 1) {
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
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  glow.position.z = 2.55;
  glow.scale.set(2.4, 2.4, 1);
  ship.add(glow);

  const engineLight = new THREE.PointLight(0xd74721, 1.8, 18);
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

export function SpaceExperience({ services }: SpaceExperienceProps) {
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
  const [showControls, setShowControls] = useState(false);
  const [showDestinations, setShowDestinations] = useState(false);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedId) ?? services[0],
    [selectedId, services]
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selectTarget = useCallback((id: string) => {
    setSelectedId(id);
    selectedIdRef.current = id;
    setShowDestinations(false);
    bridgeRef.current?.flyTo(id);
  }, []);

  const closeDock = useCallback(() => {
    setDockedService(null);
    bridgeRef.current?.releaseDock();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || services.length === 0) {
      return;
    }

    let frameId = 0;
    let lastTelemetry = 0;
    let lastPixelSample = 0;
    let lastNearbyKey = "";
    const keys = new Set<string>();
    const clock = new THREE.Clock();
    const velocity = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const desired = new THREE.Vector3();
    const targetWorld = new THREE.Vector3();
    const cameraLookAt = new THREE.Vector3();
    const shipWorld = new THREE.Vector3();
    const shipAim = new THREE.Vector3();
    const avoidanceNormal = new THREE.Vector3();
    const dockOffset = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();
    const cameraDockTarget = new THREE.Vector3();
    const dockTangent = new THREE.Vector3();
    const lookRig = new THREE.Object3D();
    const autopilotTarget = { id: selectedIdRef.current, active: false };
    const dockedTarget = {
      active: false,
      angle: 0,
      id: "",
      radius: 0
    };

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
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
    const sunTexture = createSunTexture();
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

      const texture = createPlanetTexture(service, index);
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
        ring: dockRing,
        worldPosition: new THREE.Vector3()
      };
    });

    const ship = createShip();
    scene.add(ship);

    const setMode = (mode: FlightMode) => {
      setTelemetry((previous) => (previous.mode === mode ? previous : { ...previous, mode }));
    };

    const aimShipAt = (point: THREE.Vector3, amount: number) => {
      lookRig.position.copy(ship.position);
      lookRig.up.set(0, 1, 0);
      lookRig.lookAt(point);
      lookRig.rotateY(Math.PI);
      ship.quaternion.slerp(lookRig.quaternion, amount);
    };

    const dockCurrent = () => {
      ship.getWorldPosition(shipWorld);
      const candidate = planetRuntimes
        .map((planet) => {
          planet.group.getWorldPosition(planet.worldPosition);
          return {
            planet,
            distance: shipWorld.distanceTo(planet.worldPosition) - planet.service.size
          };
        })
        .sort((a, b) => a.distance - b.distance)[0];

      if (candidate && candidate.distance < 4.8) {
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

    bridgeRef.current = {
      flyTo: (id: string) => {
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
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
      keys.add(event.code);
      if (event.code === "KeyE") {
        dockCurrent();
      }
      if (event.code === "Escape") {
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
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (dockedTarget.active) {
        return;
      }
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      if (dockedTarget.active) {
        dragging = false;
        return;
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      ship.rotation.y -= dx * 0.004;
      ship.rotation.x = clamp(ship.rotation.x - dy * 0.0032, -0.92, 0.92);
      autopilotTarget.active = false;
      setMode("Manual");
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerUp);

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

      sun.rotation.y += delta * 0.045;
      corona.material.rotation = elapsed * 0.03;
      starFieldA.rotation.y += delta * 0.0025;
      starFieldB.rotation.y -= delta * 0.003;
      dust.rotation.y += delta * 0.004;

      for (const runtime of planetRuntimes) {
        runtime.orbit.rotation.y += runtime.service.orbitSpeed * delta;
        runtime.body.rotation.y += delta * (0.13 + runtime.service.orbitSpeed * 2);
        runtime.ring.rotation.z += delta * 1.4;
      }

      ship.getWorldPosition(shipWorld);
      const selectedRuntime =
        planetRuntimes.find((planet) => planet.service.id === selectedIdRef.current) ?? planetRuntimes[0];
      selectedRuntime.group.getWorldPosition(targetWorld);
      const distanceToSelected = shipWorld.distanceTo(targetWorld) - selectedRuntime.service.size;

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
          planetRuntimes.find((planet) => planet.service.id === autopilotTarget.id) ?? selectedRuntime;
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
      } else {
        const yaw = (keys.has("KeyA") ? 1 : 0) - (keys.has("KeyD") ? 1 : 0);
        const pitch = (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
        const roll = (keys.has("KeyQ") ? 1 : 0) - (keys.has("KeyE") ? 1 : 0);
        ship.rotation.y += yaw * delta * 1.42;
        ship.rotation.x = clamp(ship.rotation.x + pitch * delta * 1.05, -0.98, 0.98);
        ship.rotation.z += roll * delta * 1.55;
        ship.rotation.z *= 1 - delta * 0.54;

        forward.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
        const thrust = keys.has("KeyW") ? (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 32 : 17) : 0;
        if (thrust > 0) {
          velocity.addScaledVector(forward, thrust * delta);
        }
        if (keys.has("KeyS")) {
          velocity.multiplyScalar(1 - delta * 2.7);
        }
        if (keys.has("Space")) {
          velocity.y += 9.5 * delta;
        }
        if (keys.has("KeyC")) {
          velocity.y -= 9.5 * delta;
        }
      }

      velocity.multiplyScalar(1 - delta * 0.12);
      velocity.clampLength(0, 34);
      ship.position.addScaledVector(velocity, delta);
      ship.position.y = clamp(ship.position.y, -16, 28);

      if (!dockedTarget.active) {
        for (const runtime of planetRuntimes) {
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

      let nearestRuntime: PlanetRuntime | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const runtime of planetRuntimes) {
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
      }

      if (dockedTarget.active) {
        const dockRuntime =
          planetRuntimes.find((planet) => planet.service.id === dockedTarget.id) ?? selectedRuntime;
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

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      if (elapsed - lastPixelSample > 0.55) {
        lastPixelSample = elapsed;
        renderer.domElement.dataset.pixelStats = JSON.stringify(sampleCanvas());
      }
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      bridgeRef.current = null;
      if (window.__pirxeySpaceDebug === debugApi) {
        delete window.__pirxeySpaceDebug;
      }
      labelRenderer.domElement.remove();
      renderer.domElement.remove();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose());
          } else {
            material?.dispose();
          }
        }
      });
    };
  }, [services]);

  return (
    <main className={`relative h-screen w-screen overflow-hidden bg-void text-parchment ${dockedService ? "is-docked" : ""}`}>
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="pointer-events-auto top-shell flex items-center gap-4">
            <div className="pirxey-mark" aria-label="Pirxey">
              Pirxey<span>x</span>
            </div>
            <div className="hidden min-w-0 border-l border-parchment/20 pl-4 md:block">
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
              className={`toolbar-button ${showControls ? "is-active" : ""}`}
              type="button"
              aria-expanded={showControls}
              onClick={() => setShowControls((value) => !value)}
            >
              <Gauge className="h-4 w-4" />
              Controls
            </button>
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
          </div>
        ) : null}

        <section className="grid flex-1 grid-cols-1 items-end gap-4 pt-4 lg:grid-cols-[minmax(260px,340px)_1fr_minmax(280px,360px)]">
          <div className={`pointer-events-auto hud-panel order-2 self-end lg:order-1 ${showControls ? "" : "is-hidden"}`}>
            <div className="flex items-center gap-2 border-b border-parchment/10 pb-3">
              <Rocket className="h-4 w-4 text-ember" />
              <h1 className="font-display text-sm uppercase text-parchment">Pirxey scout controls</h1>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <ControlHint icon={<Navigation />} label="W / Shift" value="thrust / boost" />
              <ControlHint icon={<Gauge />} label="S" value="brake" />
              <ControlHint icon={<Compass />} label="A / D" value="yaw" />
              <ControlHint icon={<MousePointer2 />} label="Drag" value="look around" />
              <ControlHint icon={<Target />} label="E" value="dock nearby" />
              <ControlHint icon={<Navigation />} label="Space / C" value="vertical" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-parchment/10 pt-4">
              <Metric label="speed" value={`${telemetry.speed.toFixed(1)}`} />
              <Metric label="target" value={formatDistance(telemetry.distance)} />
              <Metric label="dock" value={nearby?.canDock ? "ready" : "scan"} tone={nearby?.canDock ? "hot" : "cool"} />
            </div>
          </div>

          <div className="pointer-events-none order-1 flex min-h-[170px] items-end justify-center lg:order-2">
            {nearby?.canDock && !dockedService ? (
              <button
                className="pointer-events-auto dock-button"
                type="button"
                onClick={() => bridgeRef.current?.dockCurrent()}
              >
                <Target className="h-4 w-4" />
                Dock with {nearby.name}
                <span>E</span>
              </button>
            ) : dockedService ? (
              <div className="pointer-events-none hidden rounded-full border border-orbit/30 bg-void/45 px-4 py-2 font-display text-xs uppercase text-parchment/70 backdrop-blur-md md:block">
                Docked orbit active - camera tracking {dockedService.name}
              </div>
            ) : (
              <div className="pointer-events-none hidden rounded-full border border-parchment/15 bg-void/35 px-4 py-2 font-display text-xs uppercase text-parchment/55 backdrop-blur-md md:block">
                Nearest orbit: {nearby ? `${nearby.name} - ${formatDistance(nearby.distance)}` : "scanning"}
              </div>
            )}
          </div>

          <aside className={`pointer-events-auto service-panel order-3 self-end ${dockedService || !showDestinations ? "is-stowed" : ""}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-xs uppercase text-orbit">Service planets</p>
                <h2 className="font-display text-xl text-parchment">Select destination</h2>
              </div>
              <Target className="h-5 w-5 text-ember" />
            </div>

            <div className="service-list">
              {services.map((service, index) => (
                <button
                  key={service.id}
                  className={`service-target ${selectedId === service.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => selectTarget(service.id)}
                >
                  <span className="service-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm">{service.name}</span>
                    <span className="block truncate font-body text-xs text-parchment/55">{service.eyebrow}</span>
                  </span>
                  <span className="service-dot" />
                </button>
              ))}
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
