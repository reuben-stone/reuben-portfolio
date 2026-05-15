/**
 * Sky rendering — rich golden hour atmosphere.
 * Warm layered horizon, Rayleigh-inspired scattering, volumetric clouds.
 */

export default /* glsl */ `
const vec3 SKY_ZENITH  = vec3(0.15, 0.22, 0.48);
const vec3 SKY_MID     = vec3(0.40, 0.35, 0.45);
const vec3 SKY_HORIZON = vec3(0.85, 0.55, 0.35);
const vec3 SUN_COLOR   = vec3(1.0, 0.75, 0.45);

vec3 sky(vec3 rd, float time) {
  float y = max(rd.y, 0.0);

  // Atmospheric gradient — Rayleigh-inspired colour shift
  float sunDot = max(dot(rd, SUN_DIR), 0.0);

  // Base gradient with more colour separation
  vec3 col = mix(SKY_HORIZON, SKY_MID, pow(y, 0.15));
  col = mix(col, SKY_ZENITH, pow(y, 0.5));

  // Rayleigh-like scattering — blue away from sun, warm toward
  float scatter = pow(1.0 - sunDot, 2.0);
  col = mix(col, vec3(0.18, 0.25, 0.52), scatter * pow(y, 0.3) * 0.3);

  // Mie-like forward scattering — warm glow around sun
  float mie = pow(sunDot, 8.0) * 0.3;
  col += vec3(1.0, 0.6, 0.25) * mie;

  // --- Sun ---
  // Wide atmospheric golden wash
  col += SUN_COLOR * pow(sunDot, 2.0) * 0.45;
  col += vec3(1.0, 0.60, 0.30) * pow(sunDot, 5.0) * 0.35;
  // Inner halo — golden, not white
  col += SUN_COLOR * pow(sunDot, 20.0) * 0.6;
  // Disc — soft golden edge
  float sunAngle = acos(sunDot);
  float discRadius = 0.045;
  float disc = 1.0 - smoothstep(discRadius * 0.5, discRadius, sunAngle);
  // Golden core, not pure white
  vec3 sunDisc = mix(vec3(1.0, 0.85, 0.55), vec3(1.0, 0.95, 0.80), disc);
  col += sunDisc * disc * 2.8;
  col += vec3(1.0, 0.90, 0.65) * disc * disc * 1.8;

  // --- Horizon atmosphere ---
  float haze = pow(1.0 - y, 4.0);
  vec3 horizonGlow = mix(vec3(0.65, 0.45, 0.35), SKY_HORIZON * 1.2, pow(sunDot, 0.5));
  col = mix(col, horizonGlow, haze * 0.5);
  // Sun-facing warm intensification
  col += vec3(1.0, 0.50, 0.20) * haze * pow(sunDot, 1.5) * 0.35;
  // Thin bright horizon line
  float horizonLine = pow(1.0 - y, 25.0);
  col += vec3(0.95, 0.65, 0.38) * horizonLine * 0.3;
  // Cool blue tint away from sun at horizon
  float awayFromSun = 1.0 - pow(sunDot, 0.4);
  col = mix(col, vec3(0.30, 0.35, 0.50), haze * awayFromSun * 0.25);

  // --- Clouds ---
  vec2 cloudUV = rd.xz / (rd.y + 0.15) * 2.5;
  float skyMask = smoothstep(0.0, 0.12, y);

  // Layer 1 — broad cloud masses
  float cloud1 = fbm(cloudUV * 0.6 + vec2(time * 0.010, time * 0.005));
  cloud1 = smoothstep(0.35, 0.68, cloud1);

  // Layer 2 — wispy detail
  float cloud2 = fbm(cloudUV * 1.4 + vec2(-time * 0.015, time * 0.008));
  cloud2 = smoothstep(0.40, 0.70, cloud2);

  // Layer 3 — high altitude cirrus
  float cloud3 = fbm(cloudUV * 2.8 + vec2(time * 0.020, -time * 0.005));
  cloud3 = smoothstep(0.48, 0.75, cloud3);

  float clouds = cloud1 * 0.55 + cloud2 * 0.30 + cloud3 * 0.15;
  clouds *= skyMask;

  // Cloud lighting — warm golden tops, muted purple-blue shadows
  vec3 cloudBright = mix(SKY_HORIZON * 1.1, SUN_COLOR * 1.4, pow(sunDot, 0.8) * 0.6 + 0.3);
  vec3 cloudShadow = vec3(0.30, 0.26, 0.32);
  float cloudLight = pow(sunDot, 0.5) * 0.4 + 0.35;
  // Self-shadowing via cloud density
  float cloudDepth = cloud1 * 0.6 + cloud2 * 0.4;
  cloudLight -= cloudDepth * 0.2;
  // Edge glow (silver lining)
  float edgeGlow = pow(clouds * (1.0 - clouds) * 4.0, 0.7);
  cloudLight += edgeGlow * pow(sunDot, 1.0) * 0.3;
  cloudLight += y * 0.12;
  vec3 cloudCol = mix(cloudShadow, cloudBright, clamp(cloudLight, 0.0, 1.0));
  // Warm rim light on sun-facing edges
  cloudCol += SUN_COLOR * edgeGlow * pow(sunDot, 2.0) * 0.15;

  col = mix(col, cloudCol, clouds * 0.45);

  return col;
}
`;
