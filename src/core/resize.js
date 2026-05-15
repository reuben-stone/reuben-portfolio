/**
 * Handle canvas resize with device pixel ratio clamping.
 */

import { gl, canvas } from "./gl.js";

const MAX_DPR = 1.5;

export function resize() {
  const dpr = Math.min(devicePixelRatio, MAX_DPR);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

export function onResize(callback) {
  addEventListener("resize", () => {
    resize();
    if (callback) callback();
  });
  resize();
}
