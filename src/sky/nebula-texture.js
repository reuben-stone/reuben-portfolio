/**
 * Generates a nebula texture at runtime using canvas 2D.
 * Creates a rich, Carina-style colour field with warm ambers, cool teals,
 * and deep rust tones — uploaded as a WebGL texture.
 */

import { gl } from "../core/gl.js";

const SIZE = 512;

function noise2d(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = noise2d(ix, iy), b = noise2d(ix + 1, iy);
  const c = noise2d(ix, iy + 1), d = noise2d(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x, y, octaves = 6) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return val;
}

function ridgeNoise(x, y) {
  return 1 - Math.abs(2 * smoothNoise(x, y) - 1);
}

function ridgeFbm(x, y, octaves = 5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += ridgeNoise(x * freq, y * freq) * amp;
    amp *= 0.45;
    freq *= 2.0;
  }
  return val;
}

export function createNebulaTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(SIZE, SIZE);
  const data = imageData.data;

  // Torus-mapped noise helpers — seamless horizontal tiling
  function torusFbm(u, v, scaleU, scaleV, octaves, offX, offY) {
    const angle = u * Math.PI * 2;
    const cx = Math.cos(angle) * scaleU / (Math.PI * 2);
    const cy = Math.sin(angle) * scaleU / (Math.PI * 2);
    return fbm(cx + offX, v * scaleV + offY, octaves) * 0.5
         + fbm(cy + offX + 50, v * scaleV + offY + 50, octaves) * 0.5;
  }

  function torusRidgeFbm(u, v, scaleU, scaleV, octaves, offX, offY) {
    const angle = u * Math.PI * 2;
    const cx = Math.cos(angle) * scaleU / (Math.PI * 2);
    const cy = Math.sin(angle) * scaleU / (Math.PI * 2);
    return ridgeFbm(cx + offX, v * scaleV + offY, octaves) * 0.5
         + ridgeFbm(cy + offX + 50, v * scaleV + offY + 50, octaves) * 0.5;
  }

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const u = px / SIZE;
      const v = py / SIZE;

      // Domain warp — triple layer for deep organic structure (torus-mapped)
      const w1x = torusFbm(u, v, 3, 3, 4, 5.3, 2.1);
      const w1y = torusFbm(u, v, 3, 3, 4, 8.7, 4.6);
      const w2x = torusFbm(u + w1x * 0.3, v + w1y * 0.3, 4, 4, 4, 3.1, 7.2);
      const w2y = torusFbm(u + w1x * 0.3, v + w1y * 0.3, 4, 4, 4, 9.4, 1.8);
      const wu = u + w2x * 0.15;
      const wv = v + w2y * 0.15;

      // Multi-scale density (torus-mapped)
      const dense = torusFbm(wu, wv, 4, 4, 6, 0, 0);
      const fine = torusFbm(wu, wv, 8, 8, 5, 13, 7);
      const ridge = torusRidgeFbm(wu, wv, 5, 5, 5, 4, 9);
      const filament = torusRidgeFbm(u + w1x * 0.2, v + w1y * 0.2, 6, 6, 4, 11, 2);

      // Colour channels
      // Warm amber emission
      const amber = Math.max(0, dense - 0.35) / 0.65;
      // Cool teal gas
      const teal = Math.max(0, fine - 0.4) / 0.6;
      // Rust/brown dust pillars
      const rust = Math.max(0, ridge - 0.4) / 0.6;
      // Blue filaments
      const blue = Math.max(0, filament - 0.45) / 0.55;

      // Dark absorption lanes
      const absorption = Math.max(0, (dense - 0.55)) * 1.5;

      // Compose RGB
      let r = amber * 0.7 + rust * 0.5 + teal * 0.05 + blue * 0.1;
      let g = amber * 0.35 + rust * 0.2 + teal * 0.4 + blue * 0.15;
      let b = amber * 0.05 + rust * 0.05 + teal * 0.5 + blue * 0.4;

      // Apply absorption
      r *= 1 - absorption * 0.5;
      g *= 1 - absorption * 0.6;
      b *= 1 - absorption * 0.3;

      // Subtle overall tint
      r += 0.02;
      g += 0.01;
      b += 0.03;

      const idx = (py * SIZE + px) * 4;
      data[idx] = Math.min(255, Math.max(0, r * 255));
      data[idx + 1] = Math.min(255, Math.max(0, g * 255));
      data[idx + 2] = Math.min(255, Math.max(0, b * 255));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Upload to WebGL
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  return texture;
}
