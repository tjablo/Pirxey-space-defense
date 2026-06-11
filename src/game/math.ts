export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const randomFromSeed = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

export const mixColor = (a: string, b: string, amount: number) => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * amount);
  const g = Math.round(ca.g + (cb.g - ca.g) * amount);
  const blue = Math.round(ca.b + (cb.b - ca.b) * amount);
  return `rgb(${r}, ${g}, ${blue})`;
};

export const formatDistance = (value: number | null) => {
  if (value === null) {
    return "--";
  }
  return `${Math.max(0, value).toFixed(1)} au`;
};
