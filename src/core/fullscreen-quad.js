/**
 * Fullscreen triangle — covers the viewport with a single triangle.
 * More efficient than a quad (no overdraw on the diagonal).
 */

import { gl } from "./gl.js";

export function setupFullscreenTriangle(program) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );

  const pos = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
}

export function drawFullscreen() {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
