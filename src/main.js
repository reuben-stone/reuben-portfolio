/**
 * Entry point — sets up WebGL, wires modules, runs the render loop.
 */

import { gl, createProgram } from "./core/gl.js";
import { setupFullscreenTriangle, drawFullscreen } from "./core/fullscreen-quad.js";
import { onResize } from "./core/resize.js";
import { createNebulaTexture } from "./sky/nebula-texture.js";
import vert from "./shaders/vert.glsl.js";
import frag from "./shaders/frag.glsl.js";

const program = createProgram(vert, frag);
gl.useProgram(program);

setupFullscreenTriangle(program);

const uTime = gl.getUniformLocation(program, "uTime");
const uRes = gl.getUniformLocation(program, "uResolution");
const uNebula = gl.getUniformLocation(program, "uNebula");

// Generate and bind nebula texture
const nebulaTex = createNebulaTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, nebulaTex);
gl.uniform1i(uNebula, 0);

onResize();

const t0 = performance.now();

(function loop() {
  const t = (performance.now() - t0) / 1000;
  gl.uniform1f(uTime, t);
  gl.uniform2f(uRes, gl.canvas.width, gl.canvas.height);
  drawFullscreen();
  requestAnimationFrame(loop);
})();
