/**
 * Core noise functions — value noise, Worley, curl, and FBM.
 * Used by sky, ocean, and ship modules.
 */

export default /* glsl */ `
// Dave Hoskins hash — less directional bias than sin-based
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    v += noise(p) * a;
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

// 3D hash — for moon surface detail
float hash3D(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// 3D value noise
float noise3D(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3D(p + vec3(0, 0, 0)), hash3D(p + vec3(1, 0, 0)), f.x),
                 mix(hash3D(p + vec3(0, 1, 0)), hash3D(p + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3D(p + vec3(0, 0, 1)), hash3D(p + vec3(1, 0, 1)), f.x),
                 mix(hash3D(p + vec3(0, 1, 1)), hash3D(p + vec3(1, 1, 1)), f.x), f.y), f.z);
}

// Worley (cellular) noise — distance to nearest cell point
float worley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cellPoint = hash2(i + neighbor);
      float d = length(neighbor + cellPoint - f);
      minDist = min(minDist, d);
    }
  }
  return minDist;
}

// Ridge noise — sharp creases for cumulus cloud edges
float ridgeNoise(vec2 p) {
  return 1.0 - abs(noise(p) * 2.0 - 1.0);
}

float ridgeFBM(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    float r = ridgeNoise(p);
    v += r * r * a;
    p = rot * p * 2.1;
    a *= 0.45;
  }
  return v;
}

// Curl noise — divergence-free turbulent displacement
vec2 curlNoise(vec2 p) {
  float eps = 0.01;
  float n1 = noise(vec2(p.x, p.y + eps));
  float n2 = noise(vec2(p.x, p.y - eps));
  float n3 = noise(vec2(p.x + eps, p.y));
  float n4 = noise(vec2(p.x - eps, p.y));
  float dndx = (n3 - n4) / (2.0 * eps);
  float dndy = (n1 - n2) / (2.0 * eps);
  return vec2(dndy, -dndx);
}
`;
