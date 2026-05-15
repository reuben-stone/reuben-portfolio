/**
 * Sky rendering — Turner-esque golden hour atmosphere.
 * Physically-inspired scattering, painterly sun with limb darkening,
 * concentric colour rings, veiling luminance, volumetric clouds.
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
  float sunAngle = acos(clamp(sunDot, 0.0, 1.0));
  float discRadius = 0.045;

  // Painterly edge dissolution — noise-perturbed disc radius
  float edgeTheta = atan(rd.y - SUN_DIR.y, rd.x - SUN_DIR.x);
  float edgeNoise = fbm(vec2(edgeTheta * 2.0, sunAngle * 30.0) + time * 0.01);
  float noisyRadius = discRadius * (0.85 + edgeNoise * 0.3);
  float disc = 1.0 - smoothstep(noisyRadius * 0.4, noisyRadius, sunAngle);

  // Limb darkening — Neckel & Labs model
  // mu = 1.0 at centre, 0.0 at edge
  float mu = clamp(disc, 0.0, 1.0);
  vec3 limbDarkening = vec3(
    0.3 + 0.93 * mu - 0.23 * mu * mu,
    0.1 + 0.70 * mu + 0.20 * mu * mu,
    -0.1 + 0.56 * mu + 0.54 * mu * mu
  );
  limbDarkening = max(limbDarkening, 0.0);

  // Sun disc — golden core with limb darkening
  vec3 sunDisc = mix(vec3(1.0, 0.85, 0.55), vec3(1.0, 0.95, 0.85), mu);
  sunDisc *= limbDarkening;
  col += sunDisc * disc * 3.0;
  // Hot inner core
  float innerDisc = 1.0 - smoothstep(noisyRadius * 0.15, noisyRadius * 0.5, sunAngle);
  col += vec3(1.0, 0.93, 0.7) * innerDisc * 1.5;

  // Analytical Gaussian bloom — multi-scale, replaces pow(sunDot, N) halos
  float theta = sunAngle;
  float bloom = 0.0;
  bloom += 0.45 * exp(-theta * theta / 0.004);   // tight core glow
  bloom += 0.30 * exp(-theta * theta / 0.02);    // medium spread
  bloom += 0.18 * exp(-theta * theta / 0.10);    // wide atmospheric wash
  bloom += 0.07 * exp(-theta * theta / 0.40);    // very wide subtle haze

  // Bloom colour shifts from white-gold at centre to warm amber at edge
  vec3 bloomColor = mix(vec3(1.0, 0.65, 0.30), vec3(1.0, 0.93, 0.80),
                        exp(-theta * 6.0));
  col += bloomColor * bloom * 1.4;

  // Turner concentric colour rings — banded palette radiating from sun
  float sunInfluence = 1.0 - smoothstep(0.0, 0.55, sunAngle);
  vec3 turnerCore   = vec3(1.0, 0.98, 0.92);   // near-white warm
  vec3 turnerYellow = vec3(1.0, 0.88, 0.45);   // cadmium yellow
  vec3 turnerGold   = vec3(1.0, 0.70, 0.25);   // rich gold
  vec3 turnerOrange = vec3(0.95, 0.50, 0.18);  // warm orange
  vec3 turnerSalmon = vec3(0.85, 0.45, 0.30);  // salmon/atmosphere

  float t = sunInfluence;
  vec3 turnerGlow = turnerSalmon;
  turnerGlow = mix(turnerGlow, turnerOrange, smoothstep(0.0, 0.25, t));
  turnerGlow = mix(turnerGlow, turnerGold,   smoothstep(0.25, 0.5, t));
  turnerGlow = mix(turnerGlow, turnerYellow, smoothstep(0.5, 0.75, t));
  turnerGlow = mix(turnerGlow, turnerCore,   smoothstep(0.75, 1.0, t));

  float turnerIntensity = pow(sunInfluence, 1.5) * 0.7;
  col += turnerGlow * turnerIntensity;

  // --- Horizon atmosphere ---
  float haze = pow(1.0 - y, 4.0);
  vec3 horizonGlow = mix(vec3(0.65, 0.45, 0.35), SKY_HORIZON * 1.2, pow(sunDot, 0.5));
  col = mix(col, horizonGlow, haze * 0.5);
  // Sun-facing warm intensification
  col += vec3(1.0, 0.50, 0.20) * haze * pow(sunDot, 1.5) * 0.35;
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

  // --- Veiling luminance ---
  // Light overwhelms form near the sun — Turner's key effect.
  // Applied last so it bleeds over clouds, sky gradient, everything.
  float veil = pow(sunDot, 4.0);
  vec3 veilColor = mix(vec3(1.0, 0.75, 0.40), vec3(1.0, 0.95, 0.85), veil);
  col = mix(col, veilColor, veil * 0.35);

  return col;
}
`;
