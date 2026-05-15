/**
 * Entry point — sets up WebGL, wires modules, runs the render loop.
 */

import { gl, createProgram } from "./core/gl.js";
import { setupFullscreenTriangle, drawFullscreen } from "./core/fullscreen-quad.js";
import { onResize } from "./core/resize.js";
import vert from "./shaders/vert.glsl.js";
import frag from "./shaders/frag.glsl.js";

const program = createProgram(vert, frag);
gl.useProgram(program);

setupFullscreenTriangle(program);

const uTime = gl.getUniformLocation(program, "uTime");
const uRes = gl.getUniformLocation(program, "uResolution");

onResize();

const t0 = performance.now();

(function loop() {
  const t = (performance.now() - t0) / 1000;
  gl.uniform1f(uTime, t);
  gl.uniform2f(uRes, gl.canvas.width, gl.canvas.height);
  drawFullscreen();
  requestAnimationFrame(loop);
})();
