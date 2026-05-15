/**
 * Ship railing — SDF-based 1700s tallship wooden rail.
 * Procedural wood with ring grain, knots, weathering, hand-carved feel.
 * Lit by sunset + flickering lantern from the mast.
 */

export default /* glsl */ `
// SDF primitives
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float sdCylinder(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// --- Procedural Wood ---

// 3D noise from 2D noise for wood
float noise3D(vec3 p) {
  return noise(p.xy + p.z * 17.3) * 0.5
       + noise(p.yz + p.x * 13.7) * 0.3
       + noise(p.xz + p.y * 11.1) * 0.2;
}

// FBM on 3D noise
float woodFBM(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += noise3D(p) * a;
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

// Ring pattern — distance from pith with noise perturbation
float woodRings(vec3 p) {
  // Noise-warp the position for organic rings
  vec3 warp = vec3(
    woodFBM(p * 1.5),
    woodFBM(p * 1.5 + 7.3),
    woodFBM(p * 1.5 + 13.1)
  );
  p += warp * 0.12;

  // Distance from tree center (rings in XZ plane, grain along Y)
  float dist = length(p.xz) * 6.0;

  // Ring pattern — triangle wave for smooth rings
  float r = fract(dist);
  r = r * 2.0;
  if (r > 1.0) r = 2.0 - r;

  // Early/late wood contrast within each ring
  float earlyLate = smoothstep(0.3, 0.5, r) * 0.3;

  return r + earlyLate;
}

// Knot influence — conical distortion
float knotMask(vec3 p, vec3 knotPos, float radius) {
  vec3 delta = p - knotPos;
  float dist = length(delta);
  return smoothstep(radius, radius * 0.2, dist);
}

// Complete wood colour
vec3 woodColor(vec3 p, vec3 N) {
  // Oak palette
  vec3 earlyWood = vec3(0.28, 0.18, 0.09);
  vec3 lateWood  = vec3(0.14, 0.08, 0.04);
  vec3 knotCol   = vec3(0.10, 0.06, 0.03);

  // Ring pattern
  float rings = woodRings(p);
  vec3 col = mix(lateWood, earlyWood, rings);

  // Fine grain lines along Y
  float fineGrain = noise(vec2(p.y * 40.0, p.x * 8.0 + p.z * 8.0));
  fineGrain = smoothstep(0.4, 0.6, fineGrain);
  col = mix(col, col * 0.8, fineGrain * 0.2);

  // Medullary rays — radial flecks (characteristic of oak)
  float angle = atan(p.z, p.x);
  float rays = sin(angle * 40.0 + noise(p.xz * 3.0) * 0.8);
  rays = smoothstep(0.85, 1.0, rays);
  float radialDist = length(p.xz);
  rays *= smoothstep(0.05, 0.15, radialDist) * smoothstep(0.6, 0.3, radialDist);
  col = mix(col, earlyWood * 1.3, rays * 0.2);

  // Knots — two fixed positions along the rail
  float knot1 = knotMask(p, vec3(0.3, 0.25, 0.0), 0.06);
  float knot2 = knotMask(p, vec3(-0.8, 0.35, 0.01), 0.04);
  float knots = max(knot1, knot2);
  // Swirl the rings around knots
  col = mix(col, knotCol, knots * 0.7);
  // Dark ring around knot edge
  float knotEdge = smoothstep(0.3, 0.5, knots) * (1.0 - smoothstep(0.5, 0.8, knots));
  col = mix(col, knotCol * 0.6, knotEdge * 0.4);

  // --- Weathering & Aging ---

  // Sun bleaching on upward-facing surfaces
  float sunExposure = pow(max(N.y, 0.0), 1.5);
  float bleachNoise = woodFBM(p * 8.0) * 0.4 + 0.6;
  vec3 bleached = vec3(dot(col, vec3(0.3, 0.6, 0.1))) * vec3(1.05, 1.0, 0.95);
  col = mix(col, bleached, sunExposure * 0.25 * bleachNoise);

  // Salt spray — white deposits in grain crevices
  float saltNoise = woodFBM(p * 30.0) * woodFBM(p * 60.0);
  float saltMask = smoothstep(0.15, 0.35, saltNoise) * smoothstep(0.4, 0.6, fineGrain);
  col = mix(col, vec3(0.7, 0.68, 0.65), saltMask * 0.08);

  // Overall aging — slight yellow/dark patina
  col *= mix(vec3(1.0), vec3(0.88, 0.82, 0.7), 0.3);

  // Micro-cracks (checking)
  float cracks = smoothstep(0.47, 0.5, woodFBM(p * 50.0));
  col = mix(col, col * 0.5, cracks * 0.15);

  return col;
}

// --- SDF Geometry ---

float railPost(vec3 p) {
  // Add hand-carved imperfection — warp the domain
  vec3 wp = p + vec3(
    noise(p.yz * 12.0) * 0.003,
    noise(p.xz * 12.0) * 0.002,
    noise(p.xy * 12.0) * 0.003
  );
  // Main post — slightly tapered
  float post = sdBox(wp, vec3(0.04, 0.45, 0.04));
  // Decorative turned bulge near top
  float bulge = sdCylinder(wp - vec3(0.0, 0.35, 0.0), 0.055, 0.04);
  post = smin(post, bulge, 0.02);
  // Rounded cap
  float cap = sdCylinder(wp - vec3(0.0, 0.46, 0.0), 0.05, 0.015);
  post = smin(post, cap, 0.01);
  // Round edges for hand-turned feel
  post -= 0.004;
  return post;
}

float railingSDF(vec3 p) {
  float d = 1e5;
  vec3 rp = p;

  // Hand-carved domain warp — subtle asymmetry
  rp += vec3(
    noise(p.yz * 5.0) * 0.004,
    noise(p.xz * 5.0) * 0.002,
    noise(p.xy * 5.0) * 0.004
  );

  // Top rail — thick, rounded, the one you lean on
  float topRail = sdCapsule(rp, vec3(-3.0, 0.46, 0.0), vec3(3.0, 0.46, 0.0), 0.038);
  topRail -= 0.003; // round the edges
  d = min(d, topRail);

  // Middle rail — thinner
  float midRail = sdCapsule(rp, vec3(-3.0, 0.22, 0.0), vec3(3.0, 0.22, 0.0), 0.022);
  d = min(d, midRail);

  // Bottom rail
  float botRail = sdCapsule(rp, vec3(-3.0, 0.02, 0.0), vec3(3.0, 0.02, 0.0), 0.028);
  d = min(d, botRail);

  // Posts — repeated along X
  float spacing = 0.65;
  float postX = rp.x;
  postX = postX - spacing * clamp(floor(postX / spacing + 0.5), -4.0, 4.0);
  vec3 postP = vec3(postX, rp.y, rp.z);
  d = smin(d, railPost(postP), 0.008);

  // Deck edge — thick weathered plank
  float deck = sdBox(rp - vec3(0.0, -0.05, 0.0), vec3(3.0, 0.06, 0.12));
  deck -= 0.005; // rounded edges from years of wear
  d = min(d, deck);

  return d;
}

vec3 railingNormal(vec3 p) {
  float eps = 0.001;
  float d = railingSDF(p);
  return normalize(vec3(
    railingSDF(p + vec3(eps, 0.0, 0.0)) - d,
    railingSDF(p + vec3(0.0, eps, 0.0)) - d,
    railingSDF(p + vec3(0.0, 0.0, eps)) - d
  ));
}

// --- Lantern ---

float lanternFlicker(float time) {
  float f = 1.0;
  f += sin(time * 3.7) * 0.08;
  f += sin(time * 7.3 + 1.0) * 0.05;
  f += sin(time * 13.1 + 2.5) * 0.03;
  f += (noise(vec2(time * 5.0, 0.0)) - 0.5) * 0.1;
  return clamp(f, 0.7, 1.15);
}

// --- Lighting ---

// Grain tangent for anisotropic specular
vec3 grainTangent(vec3 p, vec3 N) {
  // Grain runs along Y (vertical on posts, horizontal on rails)
  vec3 grainDir = vec3(0.0, 1.0, 0.0);
  // For horizontal rails, grain runs along X
  if (abs(N.y) < 0.5) {
    grainDir = vec3(1.0, 0.0, 0.0);
  }
  // Project onto surface tangent plane
  vec3 T = normalize(grainDir - N * dot(grainDir, N));
  // Slight noise wobble
  T += N * noise(p.xy * 8.0) * 0.03;
  T = normalize(T - N * dot(T, N));
  return T;
}

// Ward anisotropic specular
float wardSpec(vec3 L, vec3 V, vec3 N, vec3 T, float roughPar, float roughPerp) {
  float NdotL = dot(N, L);
  float NdotV = dot(N, V);
  if (NdotL <= 0.0 || NdotV <= 0.0) return 0.0;

  vec3 H = normalize(L + V);
  float NdotH = dot(N, H);
  vec3 B = normalize(cross(N, T));
  float TdotH = dot(T, H);
  float BdotH = dot(B, H);

  float exponent = -2.0 * ((TdotH / roughPar) * (TdotH / roughPar)
                          + (BdotH / roughPerp) * (BdotH / roughPerp))
                   / (1.0 + NdotH);
  return sqrt(max(NdotL / NdotV, 0.0)) * exp(exponent)
       / (12.566 * roughPar * roughPerp);
}

vec3 shadeWood(vec3 p, vec3 N, vec3 V) {
  vec3 col = woodColor(p, N);
  vec3 T = grainTangent(p, N);

  // Edge wear — lighter on convex edges
  float edgeWear = pow(1.0 - abs(dot(N, V)), 3.0);
  col = mix(col, mix(col, vec3(0.35, 0.30, 0.25), 0.5), edgeWear * 0.15);

  // Ambient
  vec3 lit = col * 0.12;

  // --- Sun ---
  float NdotL = max(dot(N, SUN_DIR), 0.0);
  lit += col * NdotL * 0.55;
  lit += SUN_COLOR * pow(NdotL, 2.0) * 0.1;
  // Anisotropic sun specular
  float sunSpec = wardSpec(SUN_DIR, V, N, T, 0.15, 0.45);
  lit += SUN_COLOR * sunSpec * 0.08;

  // --- Lantern ---
  vec3 lPos = vec3(0.8, 0.6, 0.3);
  vec3 toLight = lPos - p;
  float lightDist = length(toLight);
  vec3 L = normalize(toLight);
  float atten = 3.0 / (1.0 + lightDist * 1.5 + lightDist * lightDist * 0.5);
  float flicker = lanternFlicker(uTime);
  float NdotLantern = max(dot(N, L), 0.0);
  vec3 lanternCol = vec3(1.0, 0.7, 0.35) * flicker;

  lit += col * lanternCol * NdotLantern * atten * 2.5;
  // Anisotropic lantern specular — warm sheen
  float lanternSpec = wardSpec(L, V, N, T, 0.2, 0.5);
  lit += lanternCol * lanternSpec * atten * 0.2;

  // Subsurface wood glow
  vec3 H = normalize(L + V);
  float TdotH = dot(T, H);
  float woodSS = exp(-TdotH * TdotH / 0.36) * 0.08;
  lit += col * lanternCol * woodSS * atten;

  // Sky ambient
  lit += vec3(0.05, 0.05, 0.09) * max(N.y, 0.0);

  return lit;
}
`;
