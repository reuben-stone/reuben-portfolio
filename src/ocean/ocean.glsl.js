/**
 * Ocean surface — Gerstner waves with FBM detail.
 * Sharper crests, flatter troughs, visible mid-ground wave structure.
 */

export default /* glsl */ `
// Rotated noise octaves for organic ocean detail
float oceanFBM(vec2 p, float t) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  vec2 shift = vec2(t * 0.15, t * 0.1);
  for (int i = 0; i < 7; i++) {
    v += noise(p + shift) * a;
    p = rot * p * 1.9;
    shift *= 1.3;
    a *= 0.5;
  }
  return v;
}

// Single Gerstner wave — returns vec3(dx, dy, dz) displacement
vec3 gerstnerWave(vec2 p, float t, vec2 dir, float amplitude, float freq, float speed, float steepness) {
  float phase = dot(dir, p) * freq + t * speed;
  float s = sin(phase);
  float c = cos(phase);
  float Q = steepness / (freq * amplitude * 8.0);
  return vec3(
    Q * amplitude * dir.x * c,
    amplitude * s,
    Q * amplitude * dir.y * c
  );
}

// Full ocean displacement — sum of Gerstner waves + noise
vec3 oceanDisplacement(vec2 p, float t) {
  vec3 d = vec3(0.0);

  // Primary swells — long, slow, dominant
  d += gerstnerWave(p, t, normalize(vec2(0.0, -1.0)),  0.7, 0.055, 0.32, 0.75);
  d += gerstnerWave(p, t, normalize(vec2(0.2, -1.0)),  0.35, 0.08, 0.45, 0.65);
  d += gerstnerWave(p, t, normalize(vec2(-0.15, -1.0)), 0.22, 0.11, 0.38, 0.55);

  // Secondary — cross-swell
  d += gerstnerWave(p, t, normalize(vec2(0.6, -0.8)),  0.14, 0.16, 0.65, 0.55);
  d += gerstnerWave(p, t, normalize(vec2(-0.5, -0.85)), 0.10, 0.20, 0.55, 0.45);
  d += gerstnerWave(p, t, normalize(vec2(0.3, -0.95)),  0.07, 0.26, 0.85, 0.45);

  // Chop — shorter, faster, multidirectional
  d += gerstnerWave(p, t, normalize(vec2(0.7, -0.7)),  0.04, 0.38, 1.20, 0.38);
  d += gerstnerWave(p, t, normalize(vec2(-0.6, -0.8)), 0.025, 0.50, 1.50, 0.32);
  d += gerstnerWave(p, t, normalize(vec2(0.4, -0.9)),  0.016, 0.70, 1.90, 0.28);
  d += gerstnerWave(p, t, normalize(vec2(-0.3, -0.95)), 0.010, 0.95, 2.30, 0.22);

  // Extra detail chop for close-up realism
  d += gerstnerWave(p, t, normalize(vec2(0.8, -0.6)),  0.006, 1.30, 2.80, 0.18);
  d += gerstnerWave(p, t, normalize(vec2(-0.7, -0.7)), 0.004, 1.80, 3.20, 0.15);

  // FBM noise — organic detail
  float n1 = (oceanFBM(p * 0.1, t * 0.8) - 0.5) * 0.22;
  float n2 = (oceanFBM(p * 0.25 + 5.0, t) - 0.5) * 0.09;
  float n3 = (oceanFBM(p * 0.6 + 10.0, t * 1.2) - 0.5) * 0.04;
  d.y += n1 + n2 + n3;

  return d;
}

// Height-only version
float oceanHeight(vec2 p, float t) {
  return oceanDisplacement(p, t).y;
}

// Foam — Jacobian-based wave convergence
float oceanFoam(vec2 p, float t) {
  float eps = 0.1;
  vec3 d  = oceanDisplacement(p, t);
  vec3 dx = oceanDisplacement(p + vec2(eps, 0.0), t);
  vec3 dz = oceanDisplacement(p + vec2(0.0, eps), t);

  float dxdx = (dx.x - d.x) / eps;
  float dzdz = (dz.z - d.z) / eps;
  float J = (1.0 + dxdx) * (1.0 + dzdz);
  return smoothstep(0.8, 0.3, J);
}

vec3 oceanNormal(vec2 p, float t) {
  float dist = length(p);
  float eps = mix(0.006, 0.04, smoothstep(5.0, 80.0, dist));

  float hx  = oceanDisplacement(p + vec2(eps, 0.0), t).y;
  float hz  = oceanDisplacement(p + vec2(0.0, eps), t).y;
  float hx2 = oceanDisplacement(p - vec2(eps, 0.0), t).y;
  float hz2 = oceanDisplacement(p - vec2(0.0, eps), t).y;

  float yScale = mix(0.45, 1.0, smoothstep(5.0, 60.0, dist));
  return normalize(vec3(
    (hx2 - hx) / (2.0 * eps),
    yScale,
    (hz2 - hz) / (2.0 * eps)
  ));
}
`;
