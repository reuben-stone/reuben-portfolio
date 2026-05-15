/**
 * Distant ship silhouette — small vessel in the moonlight column.
 * 2D SDF billboard, puppet-theatre cutout aesthetic.
 */

export default /* glsl */ `

// 2D box SDF
float sdBox2D(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// 2D SDF for a small sailing vessel
float shipSDF(vec2 p) {
  // Hull — tapered shape
  float hull = sdBox2D(p - vec2(0.0, -0.05), vec2(0.5, 0.12));
  // Taper the bow (right)
  hull = max(hull, -(p.x - 0.35 + p.y * 0.8));
  // Taper the stern (left)
  hull = max(hull, -(-p.x - 0.40 + p.y * 0.5));
  // Round the bottom
  float keel = length(p - vec2(0.0, -0.2)) - 0.55;
  hull = max(hull, -keel);

  // Main mast
  float mast = sdBox2D(p - vec2(0.0, 0.55), vec2(0.015, 0.50));

  // Fore mast (shorter)
  float foreMast = sdBox2D(p - vec2(0.22, 0.40), vec2(0.012, 0.35));

  // Main sail — quadrilateral approximated as box
  float mainSail = sdBox2D(p - vec2(0.08, 0.55), vec2(0.15, 0.28));
  // Angle the sail slightly
  float sailAngle = p.x * 0.15;
  mainSail = sdBox2D(p - vec2(0.08, 0.55 + sailAngle), vec2(0.15, 0.26));

  // Fore sail — smaller
  float foreSail = sdBox2D(p - vec2(0.28, 0.42), vec2(0.10, 0.20));

  // Crow's nest / top
  float top = sdBox2D(p - vec2(0.0, 1.02), vec2(0.03, 0.015));

  // Combine all parts
  float d = hull;
  d = min(d, mast);
  d = min(d, foreMast);
  d = min(d, mainSail);
  d = min(d, foreSail);
  d = min(d, top);

  return d;
}

// Render ship as billboard — returns vec4(color, mask)
// ro = camera origin, rd = ray direction
vec4 renderShip(vec3 ro, vec3 rd, float time) {
  // Ship position in world space — in the moonlight column
  float shipZ = -250.0;
  float shipX = 8.0;

  // Ray-plane intersection at z = shipZ
  if (rd.z > -0.001) return vec4(0.0); // facing away
  float t = (shipZ - ro.z) / rd.z;
  if (t < 0.0) return vec4(0.0);

  vec3 hitPoint = ro + rd * t;

  // Local coordinates on the billboard — ship hull sits on waterline
  float shipScale = 3.5;
  float waterline = ro.y; // ocean surface is at camera height
  vec2 localP = vec2(hitPoint.x - shipX, hitPoint.y - waterline) / shipScale;
  // Shift so hull bottom (y≈-0.17 in SDF) aligns with waterline
  localP.y += 0.17;

  // Early out
  if (abs(localP.x) > 1.5 || localP.y < -0.5 || localP.y > 1.5) return vec4(0.0);

  float d = shipSDF(localP);
  float mask = 1.0 - smoothstep(-0.02, 0.02, d);
  if (mask < 0.001) return vec4(0.0);

  // Dark silhouette
  vec3 col = vec3(0.008, 0.01, 0.018);

  // Subtle variation in the silhouette
  float tex = noise(localP * 30.0) * 0.01;
  col += vec3(tex);

  // Tiny warm lantern glow at the stern
  vec2 lanternPos = vec2(-0.35, 0.12);
  float lanternDist = length(localP - lanternPos);
  float flicker = 0.8 + 0.2 * sin(time * 3.7 + sin(time * 7.1) * 0.5);
  float lanternGlow = exp(-lanternDist * lanternDist / 0.008) * 0.4 * flicker;
  col += vec3(1.0, 0.55, 0.15) * lanternGlow;

  return vec4(col, mask);
}

// Lantern glow on nearby water — returns warm colour contribution
vec3 shipLanternReflection(vec2 hitXZ, float time) {
  vec2 lanternWorld = vec2(8.0 - 0.35 * 3.5, -250.0);
  float dist = length(hitXZ - lanternWorld);
  float flicker = 0.8 + 0.2 * sin(time * 3.7 + sin(time * 7.1) * 0.5);
  float glow = exp(-dist * dist / 80.0) * 0.015 * flicker;
  return vec3(1.0, 0.55, 0.15) * glow;
}
`;
