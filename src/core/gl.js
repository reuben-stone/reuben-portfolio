/**
 * WebGL context and helpers.
 * Single source of truth for the rendering context.
 */

const canvas = document.getElementById("c");

export const gl = canvas.getContext("webgl", {
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
});

export { canvas };

export function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(vertSource, fragSource) {
  const vs = compileShader(gl.VERTEX_SHADER, vertSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fragSource);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Link error:", gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}
