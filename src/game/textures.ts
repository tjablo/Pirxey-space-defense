import * as THREE from "three";
import type { ServicePlanet } from "../data/services";
import { mixColor, randomFromSeed } from "./math";

const radialTextureCache = new Map<string, THREE.CanvasTexture>();

export const createPlanetTexture = (service: ServicePlanet, index: number, width = 1024) => {
  const height = Math.round(width / 2);
  const detailRatio = width / 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
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

export const createSunTexture = (width = 1024) => {
  const height = Math.round(width / 2);
  const detailRatio = width / 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
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

export const createRadialTexture = (inner: string, outer: string, alpha = 1) => {
  const cacheKey = `${inner}|${outer}|${alpha}`;
  const cached = radialTextureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

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
  radialTextureCache.set(cacheKey, texture);
  return texture;
};
