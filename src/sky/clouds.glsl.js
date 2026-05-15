/**
 * Theatrical layered-plane cloud system.
 * 5 cloud layers at different altitudes, drifting at different speeds.
 * Aesthetic: painted theatre flats with visible parallax layering.
 * WebGL 1 compatible — no arrays, fully unrolled.
 */

export default /* glsl */ `

// Shared sky/cloud constants — moonlit night
const vec3 SKY_ZENITH  = vec3(0.03, 0.05, 0.12);
const vec3 SKY_MID     = vec3(0.06, 0.08, 0.16);
const vec3 SKY_HORIZON = vec3(0.10, 0.12, 0.20);
const vec3 MOON_COLOR  = vec3(0.70, 0.80, 0.95);

// Per-layer density — each layer has distinct character
float cloudDensityL0(vec2 uv, float time) {
  // Distant bank — broken cumulus masses near horizon
  vec2 drift = vec2(time * 10.0, time * 2.5);
  vec2 p = (uv + drift) * 0.00012;
  float d = fbm(p);
  float patchMask = noise(p * 0.5 + vec2(3.1, 7.4));
  float edgeN = noise(p * 8.0) * 0.04;
  d = smoothstep(0.32 + edgeN, 0.45, d) * smoothstep(0.25, 0.55, patchMask);
  return d;
}

float cloudDensityL1(vec2 uv, float time) {
  // Low cumulus — hero layer. Dramatic masses with strong silhouettes.
  vec2 drift = vec2(time * 25.0, time * 6.0);
  vec2 p = (uv + drift) * 0.00022;
  // Strong double domain warp for dramatic, organic shapes
  vec2 warp1 = vec2(fbm(p + vec2(1.7, 9.2)), fbm(p + vec2(8.3, 2.8)));
  vec2 warp2 = vec2(
    fbm(p + warp1 * 0.2 + vec2(3.1, 7.4)),
    fbm(p + warp1 * 0.2 + vec2(6.5, 2.1))
  );
  p += warp2 * 0.18;
  float base = fbm(p);
  float ridge = ridgeFBM(p * 1.3 + vec2(3.7, 1.2));
  float d = mix(base, ridge, 0.45);
  // Coverage mask — distinct masses with clear gaps
  float coverage = fbm((uv + drift * 0.3) * 0.00007);
  d *= smoothstep(0.28, 0.50, coverage);
  float edgeN = noise(p * 8.0) * 0.04;
  return smoothstep(0.22 + edgeN, 0.38, d);
}

float cloudDensityL2(vec2 uv, float time) {
  // Mid cumulus — broken, scattered.
  vec2 drift = vec2(time * 50.0, time * 15.0);
  vec2 p = (uv + drift) * 0.00032;
  p += curlNoise(p * 600.0) * 0.0005;
  vec2 warp = vec2(noise(p * 1.5 + vec2(4.1, 2.3)), noise(p * 1.5 + vec2(7.8, 3.1)));
  p += warp * 0.10;
  float d = mix(fbm(p), ridgeFBM(p * 1.2 + vec2(2.0, 5.0)), 0.3);
  float mask = fbm((uv + drift * 0.4) * 0.0001 + vec2(7.3, 2.1));
  d *= smoothstep(0.30, 0.52, mask);
  float edgeN = noise(p * 8.0) * 0.04;
  return smoothstep(0.24 + edgeN, 0.40, d);
}

float cloudDensityL3(vec2 uv, float time) {
  // High altocumulus — thinner, scattered patches
  vec2 drift = vec2(time * 85.0, time * 25.0);
  vec2 p = (uv + drift) * 0.0004;
  p.x *= 0.75;
  float d = fbm(p);
  d = mix(d, ridgeFBM(p * 0.8 + vec2(5.0, 3.0)), 0.2);
  // Stronger coverage mask — more gaps
  float mask = fbm((uv + drift * 0.5) * 0.00015 + vec2(11.0, 4.5));
  d *= smoothstep(0.42, 0.60, mask);
  float edgeN = noise(p * 8.0) * 0.04;
  return smoothstep(0.35 + edgeN, 0.48, d) * 0.7;
}

float cloudDensityL4(vec2 uv, float time) {
  // Cirrus wisps — sparse, thin streaks
  vec2 drift = vec2(time * 150.0, time * 37.0);
  vec2 p = (uv + drift) * 0.0003;
  p = vec2(p.x * 0.5, p.y * 2.0);
  float d = ridgeFBM(p);
  // Much sparser coverage
  float mask = noise(uv * 0.00008 + vec2(15.0, 8.0) + time * 0.01);
  d *= smoothstep(0.45, 0.70, mask);
  float edgeN = noise(p * 8.0) * 0.04;
  return smoothstep(0.42 + edgeN, 0.55, d) * 0.35;
}

// Per-layer colour and lighting — moonlit night with internal variation
vec3 cloudColorLayer(float density, float cosTheta, float shadowAmt, float heightFrac,
                     vec3 shadowCol, vec3 litCol, float distFade) {
  float phase = 0.06 + 0.94 * pow(max(cosTheta, 0.0), 3.0);
  float shadow = exp(-shadowAmt * 6.0);

  litCol *= phase;
  float lightLevel = shadow * mix(0.08, 0.6, heightFrac);
  vec3 col = mix(shadowCol, litCol, lightLevel);

  // Deep blue ambient — never pure black, even in thick cloud
  col += vec3(0.010, 0.014, 0.028);

  // Density-based darkening — thick cloud cores go darker
  float coreDarken = smoothstep(0.3, 0.8, density);
  col *= 1.0 - coreDarken * 0.35;

  // SILVER LINING — only on genuine thin edges facing the moon
  float edge = density * (1.0 - density) * 4.0;
  float moonPhase = pow(max(cosTheta, 0.0), 1.0);
  col += MOON_COLOR * edge * moonPhase * 0.55;
  // Thin-edge glow — tight, only the very rim
  float thinEdge = smoothstep(0.20, 0.02, density) * smoothstep(0.0, 0.02, density);
  col += MOON_COLOR * thinEdge * max(cosTheta, 0.0) * 0.35;

  // Atmospheric depth — distant layers haze toward sky
  vec3 hazeCol = mix(SKY_HORIZON, SKY_MID, heightFrac * 0.5);
  col = mix(col, hazeCol, distFade * 0.20);

  return col;
}

// Main cloud compositor — returns vec4(rgb, alpha)
vec4 cloudLayers(vec3 ro, vec3 rd, float time) {
  if (rd.y <= 0.005) return vec4(0.0);

  float cosTheta = dot(rd, normalize(MOON_DIR));

  // --- Pass 1: compute densities top-to-bottom, accumulate shadow ---
  float totalShadow = 0.0;

  // Layer 4 — Cirrus (3500)
  float t4 = (3500.0 - ro.y) / rd.y;
  float d4 = (t4 > 0.0) ? cloudDensityL4((ro + rd * t4).xz, time) : 0.0;
  float sh4 = 0.0;
  totalShadow += d4 * 0.25;

  // Layer 3 — High Altocumulus (2200)
  float t3 = (2200.0 - ro.y) / rd.y;
  float d3 = (t3 > 0.0) ? cloudDensityL3((ro + rd * t3).xz, time) : 0.0;
  float sh3 = totalShadow;
  totalShadow += d3 * 0.40;

  // Layer 2 — Mid Cumulus (1400)
  float t2 = (1400.0 - ro.y) / rd.y;
  float d2 = (t2 > 0.0) ? cloudDensityL2((ro + rd * t2).xz, time) : 0.0;
  float sh2 = totalShadow;
  totalShadow += d2 * 0.55;

  // Layer 1 — Low Cumulus (800)
  float t1 = (800.0 - ro.y) / rd.y;
  float d1 = (t1 > 0.0) ? cloudDensityL1((ro + rd * t1).xz, time) : 0.0;
  float sh1 = totalShadow;
  totalShadow += d1 * 0.70;

  // Layer 0 — Distant Bank (400)
  float t0 = (400.0 - ro.y) / rd.y;
  float d0 = (t0 > 0.0) ? cloudDensityL0((ro + rd * t0).xz, time) : 0.0;
  float sh0 = totalShadow;

  // --- Pass 2: composite bottom-to-top (front-to-back from camera) ---
  vec4 result = vec4(0.0);

  // Layer 0 — Distant Bank (near-black, barely lit)
  if (d0 > 0.01) {
    vec3 col = cloudColorLayer(d0, cosTheta, sh0, 0.0,
      vec3(0.015, 0.018, 0.03), MOON_COLOR * 0.25, 0.65);
    float alpha = d0 * 0.60;
    result += vec4(col * alpha, alpha) * (1.0 - result.a);
  }

  // Layer 1 — Low Cumulus (hero — dark masses with silver rims)
  if (d1 > 0.01) {
    vec3 col = cloudColorLayer(d1, cosTheta, sh1, 0.25,
      vec3(0.012, 0.015, 0.028), MOON_COLOR * 0.6, 0.08);
    float alpha = d1 * 0.75;
    result += vec4(col * alpha, alpha) * (1.0 - result.a);
  }

  // Layer 2 — Mid Cumulus
  if (d2 > 0.01) {
    vec3 col = cloudColorLayer(d2, cosTheta, sh2, 0.45,
      vec3(0.015, 0.018, 0.032), MOON_COLOR * 0.45, 0.25);
    float alpha = d2 * 0.60;
    result += vec4(col * alpha, alpha) * (1.0 - result.a);
  }

  // Layer 3 — High Altocumulus (thin, translucent)
  if (d3 > 0.01) {
    vec3 col = cloudColorLayer(d3, cosTheta, sh3, 0.65,
      vec3(0.02, 0.025, 0.04), MOON_COLOR * 0.35, 0.45);
    float alpha = d3 * 0.35;
    result += vec4(col * alpha, alpha) * (1.0 - result.a);
  }

  // Layer 4 — Cirrus Wisps (ghostly veils)
  if (d4 > 0.01) {
    vec3 col = cloudColorLayer(d4, cosTheta, sh4, 0.85,
      vec3(0.025, 0.03, 0.05), MOON_COLOR * 0.30, 0.55);
    float alpha = d4 * 0.15;
    result += vec4(col * alpha, alpha) * (1.0 - result.a);
  }

  if (result.a > 0.001) result.rgb /= result.a;
  return clamp(result, 0.0, 1.0);
}

// Lightweight cloud approximation for ocean reflections
vec4 cloudReflectApprox(vec3 rd, float time) {
  if (rd.y <= 0.01) return vec4(0.0);
  float cosTheta = dot(rd, normalize(MOON_DIR));
  float phase = 0.25 + 0.75 * pow(max(cosTheta, 0.0), 2.0);

  vec4 result = vec4(0.0);

  // Layer 1 reflection
  float t1 = (800.0 - 10.0) / rd.y;
  if (t1 > 0.0) {
    vec2 uv = (vec3(0.0, 10.0, 0.0) + rd * t1).xz;
    vec2 p = (uv + vec2(time * 25.0, time * 6.0)) * 0.00025;
    float d = smoothstep(0.35, 0.43, fbm(p));
    if (d > 0.01) {
      vec3 col = mix(vec3(0.03, 0.04, 0.07), MOON_COLOR * 0.8 * phase, 0.3);
      col += vec3(0.02, 0.025, 0.04);
      float alpha = d * 0.45;
      result += vec4(col * alpha, alpha) * (1.0 - result.a);
    }
  }

  // Layer 2 reflection
  float t2 = (1400.0 - 10.0) / rd.y;
  if (t2 > 0.0) {
    vec2 uv = (vec3(0.0, 10.0, 0.0) + rd * t2).xz;
    vec2 p = (uv + vec2(time * 50.0, time * 15.0)) * 0.00035;
    float d = smoothstep(0.36, 0.44, fbm(p));
    if (d > 0.01) {
      vec3 col = mix(vec3(0.03, 0.04, 0.07), MOON_COLOR * 0.6 * phase, 0.4);
      col += vec3(0.02, 0.025, 0.04);
      float alpha = d * 0.35;
      result += vec4(col * alpha, alpha) * (1.0 - result.a);
    }
  }

  if (result.a > 0.001) result.rgb /= result.a;
  return clamp(result, 0.0, 1.0);
}
`;
