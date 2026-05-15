/**
 * Distant rocky headland — right side of viewport.
 * Screen-space height profile using FBM for jagged coastal silhouette.
 */

export default /* glsl */ `

// Rocky headland profile — returns height in rd.y space at given horizontal angle
float headlandProfile(float xAngle) {
  // Main headland body — rises from right side
  float onset = 0.38;
  float baseRise = smoothstep(onset, 0.50, xAngle);
  float baseTaper = 1.0 - smoothstep(0.72, 0.90, xAngle);
  float base = baseRise * baseTaper * 0.012;

  // Primary peak — tall rocky cliff
  float peak1 = exp(-(xAngle - 0.58) * (xAngle - 0.58) / 0.0012) * 0.032;

  // Secondary crag — slightly shorter, offset
  float peak2 = exp(-(xAngle - 0.52) * (xAngle - 0.52) / 0.0008) * 0.020;

  // Saddle / col between peaks — dip
  float saddle = exp(-(xAngle - 0.55) * (xAngle - 0.55) / 0.0004) * 0.008;

  // Sea stack — standalone rock separated by a gap
  float stack = exp(-(xAngle - 0.44) * (xAngle - 0.44) / 0.0003) * 0.014;

  // Combine peaks
  float h = base + max(peak1, peak2) - saddle + stack;

  // FBM rocky detail on the profile edge
  float rock = fbm(vec2(xAngle * 45.0, 3.7)) * 0.005;
  rock += fbm(vec2(xAngle * 120.0, 7.1)) * 0.003;
  float crag = ridgeNoise(vec2(xAngle * 70.0, 2.3)) * 0.004;

  h += (rock + crag) * smoothstep(onset - 0.02, onset + 0.05, xAngle) * baseTaper;

  return max(h, 0.0);
}

// Render headland — returns vec4(color, mask)
vec4 renderHeadland(vec3 rd) {
  // Horizontal angle from camera forward (-z direction)
  float xAngle = atan(rd.x, -rd.z);

  // Early out — only far right, only above horizon
  if (xAngle < 0.32 || rd.y < -0.002) return vec4(0.0);

  float profile = headlandProfile(xAngle);

  // Only mask where ray is below the profile top but above horizon
  float mask = smoothstep(0.002, -0.001, rd.y - profile) * smoothstep(-0.002, 0.001, rd.y);
  if (mask < 0.001) return vec4(0.0);

  // Base: near-black silhouette with slight blue atmospheric tint
  vec3 col = vec3(0.02, 0.025, 0.04);

  // Moonlit edge highlights — approximate surface normal from profile gradient
  float eps = 0.003;
  float dProfile = headlandProfile(xAngle + eps) - headlandProfile(xAngle - eps);

  // Rock face illumination — moon-facing slopes get faint light
  float moonFacing = smoothstep(0.0, 0.12, -dProfile);
  // How far below the ridgeline — upper parts catch more light
  float heightInRock = 1.0 - smoothstep(0.0, profile, profile - rd.y);
  // Rock texture noise for variation
  float rockTex = fbm(vec2(xAngle * 80.0, rd.y * 300.0)) * 0.6 + 0.4;
  float rockLight = moonFacing * heightInRock * rockTex;
  col += MOON_COLOR * 0.06 * rockLight;

  // Edge glow on the top contour — bright silver rim
  float edgeDist = rd.y - profile + 0.004;
  float edgeLight = smoothstep(0.0, 0.003, edgeDist) * smoothstep(0.007, 0.003, edgeDist);
  col += MOON_COLOR * 0.08 * edgeLight * (0.3 + 0.7 * moonFacing);

  // Base sea-spray mist — faint glow at waterline
  float baseMist = smoothstep(0.008, 0.0, rd.y) * smoothstep(-0.002, 0.002, rd.y);
  float mistNoise = noise(vec2(xAngle * 30.0, rd.y * 200.0));
  baseMist *= smoothstep(0.3, 0.6, mistNoise);
  col += vec3(0.04, 0.05, 0.07) * baseMist * smoothstep(0.32, 0.45, xAngle);

  // Atmospheric haze — distant land is slightly blue-hazed
  float hazeFade = smoothstep(0.005, 0.0, rd.y - profile + 0.005);
  col = mix(col, SKY_HORIZON * 0.8, hazeFade * 0.3);

  return vec4(col, mask);
}
`;
