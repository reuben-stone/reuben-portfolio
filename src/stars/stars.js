/**
 * Star catalogue — loads real star positions and creates a data texture.
 * Uses the 300 brightest stars from the d3-celestial/HYG catalogue.
 * Each texel encodes: RGB = direction vector (x,y,z mapped to 0-1), A = packed mag+colour.
 */

import { gl } from "../core/gl.js";
import starData from "./star-data.json";

const TEX_WIDTH = 20;
const TEX_HEIGHT = 16;
const STAR_COUNT = starData.length; // 300

// Try float textures for precision, fall back to Uint8
const floatExt = gl.getExtension("OES_texture_float");

function createStarTexture() {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  if (floatExt) {
    // Float texture — full precision direction vectors
    const data = new Float32Array(TEX_WIDTH * TEX_HEIGHT * 4);
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = starData[i];
      const offset = i * 4;
      data[offset + 0] = star.x;
      data[offset + 1] = star.y;
      data[offset + 2] = star.z;
      // Pack magnitude into [0,1]: (-1.5 to 4.5) → (0 to 1)
      data[offset + 3] = (star.m + 1.5) / 6.0;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEX_WIDTH, TEX_HEIGHT, 0, gl.RGBA, gl.FLOAT, data);
  } else {
    // Uint8 fallback — lower precision
    const data = new Uint8Array(TEX_WIDTH * TEX_HEIGHT * 4);
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = starData[i];
      const offset = i * 4;
      data[offset + 0] = Math.round((star.x * 0.5 + 0.5) * 255);
      data[offset + 1] = Math.round((star.y * 0.5 + 0.5) * 255);
      data[offset + 2] = Math.round((star.z * 0.5 + 0.5) * 255);
      data[offset + 3] = Math.round(((star.m + 1.5) / 6.0) * 255);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEX_WIDTH, TEX_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createStarColorTexture() {
  const data = new Uint8Array(TEX_WIDTH * TEX_HEIGHT * 4);
  for (let i = 0; i < STAR_COUNT; i++) {
    const star = starData[i];
    const offset = i * 4;
    // B-V: -0.4 to 2.0 → 0 to 255
    data[offset + 0] = Math.max(0, Math.min(255, Math.round(((star.c + 0.4) / 2.4) * 255)));
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 255;
  }
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEX_WIDTH, TEX_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export const useFloatTextures = !!floatExt;
export const starTexture = createStarTexture();
export const starColorTexture = createStarColorTexture();
export const starCount = STAR_COUNT;
export const texWidth = TEX_WIDTH;
export const texHeight = TEX_HEIGHT;
