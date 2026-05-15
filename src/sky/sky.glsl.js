/**
 * Sky rendering — moonlit night atmosphere.
 * Realistic moon with surface detail, twinkling stars, layered clouds.
 */

export default /* glsl */ `

// --- Moon surface rendering ---
// Maria (dark plains) via domain-warped noise — strong contrast
float moonMaria(vec3 n) {
  // Double domain warp for organic, non-circular maria shapes
  vec3 warp1 = vec3(
    noise3D(n * 1.5 + vec3(5.2, 1.3, 2.8)),
    noise3D(n * 1.5 + vec3(1.7, 9.2, 3.1)),
    noise3D(n * 1.5 + vec3(8.3, 2.8, 4.7))
  );
  vec3 warp2 = vec3(
    noise3D((n + warp1 * 0.35) * 1.8 + vec3(3.1, 7.4, 1.2)),
    noise3D((n + warp1 * 0.35) * 1.8 + vec3(6.5, 2.1, 8.3)),
    noise3D((n + warp1 * 0.35) * 1.8 + vec3(1.8, 5.7, 3.9))
  );
  float m = noise3D((n + warp2 * 0.25) * 2.0);
  // Sharp threshold for distinct maria/highland boundary
  return smoothstep(0.32, 0.48, m);
}

// Moon surface detail — multi-scale craters + texture
float moonDetail(vec3 n) {
  float c = 0.0;
  // Large impact basins
  float large = noise3D(n * 4.0);
  c += smoothstep(0.0, 0.20, large) * 0.35;
  // Medium craters — with rim brightening
  float med = noise3D(n * 10.0);
  float medCrater = smoothstep(0.0, 0.12, med);
  float medRim = smoothstep(0.12, 0.15, med) * smoothstep(0.20, 0.15, med);
  c += medCrater * 0.25 + medRim * 0.3;
  // Small craters
  c += smoothstep(0.0, 0.12, noise3D(n * 25.0)) * 0.15;
  // Fine regolith texture
  c += smoothstep(0.0, 0.15, noise3D(n * 55.0)) * 0.06;
  c += noise3D(n * 100.0) * 0.03;
  return c;
}

// Render the moon disc — returns vec4(rgb, alpha)
vec4 renderMoon(vec3 rd) {
  vec3 moonDir = normalize(MOON_DIR);
  float moonAngle = acos(clamp(dot(rd, moonDir), 0.0, 1.0));
  float discRadius = 0.030;

  if (moonAngle > discRadius * 1.5) return vec4(0.0);

  // Project onto moon sphere
  vec3 up = normalize(cross(moonDir, vec3(0.0, 0.0, 1.0)));
  vec3 right = normalize(cross(up, moonDir));
  float px = dot(rd - moonDir, right);
  float py = dot(rd - moonDir, up);
  float nr = length(vec2(px, py)) / discRadius;
  if (nr > 1.0) return vec4(0.0);

  float nz = sqrt(1.0 - nr * nr);
  vec3 sphereN = normalize(right * px / discRadius + up * py / discRadius + moonDir * nz);

  // Surface albedo — maria + highlands with strong contrast
  float maria = moonMaria(sphereN * 2.5);
  vec3 highlandCol = vec3(1.10, 1.07, 1.00); // bright warm highlands
  vec3 mariaCol = vec3(0.45, 0.44, 0.42);     // dark grey maria
  vec3 baseCol = mix(highlandCol, mariaCol, maria);

  // Multi-scale crater detail
  float detail = moonDetail(sphereN);
  baseCol *= 0.70 + detail * 0.55;

  // Bump normals — stronger for visible surface relief
  float eps = 0.004;
  float bumpStr = 0.22;
  vec3 grad = vec3(
    noise3D(sphereN * 18.0 + vec3(eps, 0.0, 0.0)) - noise3D(sphereN * 18.0 - vec3(eps, 0.0, 0.0)),
    noise3D(sphereN * 18.0 + vec3(0.0, eps, 0.0)) - noise3D(sphereN * 18.0 - vec3(0.0, eps, 0.0)),
    noise3D(sphereN * 18.0 + vec3(0.0, 0.0, eps)) - noise3D(sphereN * 18.0 - vec3(0.0, 0.0, eps))
  ) / (2.0 * eps);
  // Add medium-scale bump
  grad += 0.5 * vec3(
    noise3D(sphereN * 40.0 + vec3(eps, 0.0, 0.0)) - noise3D(sphereN * 40.0 - vec3(eps, 0.0, 0.0)),
    noise3D(sphereN * 40.0 + vec3(0.0, eps, 0.0)) - noise3D(sphereN * 40.0 - vec3(0.0, eps, 0.0)),
    noise3D(sphereN * 40.0 + vec3(0.0, 0.0, eps)) - noise3D(sphereN * 40.0 - vec3(0.0, 0.0, eps))
  ) / (2.0 * eps);
  vec3 bumpN = normalize(sphereN + bumpStr * grad);

  // Full moon lighting — opposition surge (nearly uniform, slight edge falloff)
  float cosNV = max(dot(bumpN, -rd), 0.0);
  float brightness = 0.95 - 0.05 * pow(1.0 - cosNV, 3.0);

  // Extra brightness — moon should be clearly the brightest object
  vec3 moonCol = baseCol * brightness * 1.6;

  // Anti-aliased edge
  float edgeAA = smoothstep(1.0, 0.94, nr);
  return vec4(moonCol, edgeAA);
}


vec3 sky(vec3 rd, float time) {
  float y = max(rd.y, 0.0);
  float moonDot = max(dot(rd, MOON_DIR), 0.0);

  // Night sky gradient with depth variation
  vec3 col = mix(SKY_HORIZON, SKY_MID, pow(y, 0.12));
  col = mix(col, SKY_ZENITH, pow(y, 0.4));
  col += vec3(0.02, 0.03, 0.06) * pow(moonDot, 1.5);
  // Subtle noise-based variation in the deep sky — breaks up flat blue
  float skyNoise = noise3D(rd * 3.0) * 0.5 + noise3D(rd * 7.0) * 0.3;
  col += vec3(0.005, 0.008, 0.018) * skyNoise * pow(y, 0.3);

  // --- Nebula background — texture-based deep sky tones ---
  float nebPhi = atan(rd.z, rd.x);
  float nebTheta = acos(clamp(rd.y, -1.0, 1.0));
  vec2 nebUv = vec2(nebPhi * 0.3 + 0.5, nebTheta * 0.5);
  vec3 nebCol = texture2D(uNebula, nebUv).rgb;
  float nebLuma = dot(nebCol, vec3(0.2126, 0.7152, 0.0722));
  nebCol = mix(vec3(nebLuma), nebCol, 0.6);
  // Stronger at zenith, fading toward horizon
  float nebMask = smoothstep(0.03, 0.20, y);
  float zenithBoost = smoothstep(0.15, 0.5, y) * 0.5 + 0.5;
  col += nebCol * nebMask * zenithBoost * 0.22;

  // --- Real star catalogue (computed here, added after clouds with occlusion) ---
  float starMask = smoothstep(0.02, 0.10, y);
  float moonGlare = 1.0 - smoothstep(0.05, 0.25, acos(clamp(moonDot, 0.0, 1.0)));
  starMask *= (1.0 - moonGlare);
  vec3 starLight = renderStars(rd, time) * starMask;

  // --- Moon disc (behind clouds — rendered first) ---
  float moonAngle = acos(clamp(moonDot, 0.0, 1.0));
  vec4 moon = renderMoon(rd);
  if (moon.a > 0.0) {
    col = mix(col, moon.rgb, moon.a);
  }

  // --- Moon bloom (also behind clouds, but wide bloom bleeds through) ---
  float theta = moonAngle;
  float bloom = 0.0;
  bloom += 0.50 * exp(-theta * theta / 0.002);
  bloom += 0.30 * exp(-theta * theta / 0.010);
  bloom += 0.15 * exp(-theta * theta / 0.04);
  bloom += 0.06 * exp(-theta * theta / 0.15);
  col += vec3(0.50, 0.60, 0.75) * bloom * 1.2;

  // Lunar corona
  float coronaDeg = theta * 57.2958;
  float corona = exp(-(coronaDeg - 2.0) * (coronaDeg - 2.0) / 1.0) * 0.15;
  col += vec3(0.50, 0.58, 0.70) * corona;

  // --- Horizon atmosphere ---
  float horizonFade = smoothstep(0.10, 0.0, y);
  col = mix(col, SKY_HORIZON * 1.3, horizonFade * 0.18);

  // --- Theatrical layered-plane clouds (in front of moon) ---
  vec4 cloudResult = vec4(0.0);
  float clouds = 0.0;
  if (y > 0.02) {
    vec3 cloudRo = vec3(0.0, 10.0, 0.0);
    cloudResult = cloudLayers(cloudRo, rd, time);
    float horizonCloudFade = smoothstep(0.02, 0.08, y);
    clouds = cloudResult.a * horizonCloudFade;
    col = mix(col, cloudResult.rgb, clouds);
  }

  // --- Stars dimmed by clouds (alpha-based occlusion) ---
  col += starLight * pow(1.0 - clouds, 3.0);

  // --- Wide bloom bleeds through thin clouds ---
  float bloomThrough = 0.0;
  bloomThrough += 0.10 * exp(-theta * theta / 0.04);
  bloomThrough += 0.04 * exp(-theta * theta / 0.12);
  col += vec3(0.45, 0.55, 0.70) * bloomThrough * (0.3 + 0.7 * (1.0 - clouds));

  // --- Veiling luminance (subtle) ---
  float veil = pow(moonDot, 5.0);
  col = mix(col, vec3(0.18, 0.22, 0.32), veil * 0.08);

  // --- Ethereal horizon haze with variation ---
  float hazeY = y;
  float haze = exp(-hazeY * hazeY / 0.0008);
  float hazeMoonBias = 1.0 + pow(moonDot, 3.0) * 0.5;
  // Break up the haze band with noise so it's not a flat stripe
  float hazeNoise = noise3D(rd * 8.0 + vec3(time * 0.02)) * 0.4 + 0.8;
  haze *= hazeNoise;
  vec3 hazeCol = mix(SKY_HORIZON, MOON_COLOR * 0.15, 0.3) * hazeMoonBias;
  col = mix(col, hazeCol, haze * 0.15);

  return max(col, vec3(0.0));
}

// Lightweight sky for ocean reflections
vec3 skyReflect(vec3 rd, float time) {
  float y = max(rd.y, 0.0);
  float moonDot = max(dot(rd, MOON_DIR), 0.0);
  vec3 col = mix(SKY_HORIZON, SKY_MID, pow(y, 0.12));
  col = mix(col, SKY_ZENITH, pow(y, 0.4));
  col += vec3(0.02, 0.03, 0.06) * pow(moonDot, 1.5);

  // Moon bloom for reflections — stronger near horizon
  float theta = acos(clamp(moonDot, 0.0, 1.0));
  float bloom = 0.30 * exp(-theta * theta / 0.012) + 0.15 * exp(-theta * theta / 0.05);
  // Extra wide bloom for horizon reflections
  bloom += 0.08 * exp(-theta * theta / 0.15);
  col += vec3(0.45, 0.55, 0.70) * bloom * 0.8;

  // Moon disc in reflections (simplified)
  float moonAngle = theta;
  float discRadius = 0.028;
  float disc = 1.0 - smoothstep(discRadius * 0.85, discRadius, moonAngle);
  col += vec3(0.85, 0.83, 0.78) * disc * 1.0;

  // Cloud reflection approximation
  vec4 reflCloud = cloudReflectApprox(rd, time);
  col = mix(col, reflCloud.rgb, reflCloud.a * 0.4);

  return max(col, vec3(0.0));
}
`;
