/**
 * Main fragment shader — composes sky, ocean, lighting, and post-processing.
 * Each concern is imported from its own GLSL module.
 */

import noiseGlsl from "./noise.glsl.js";
import skyGlsl from "../sky/sky.glsl.js";
import oceanGlsl from "../ocean/ocean.glsl.js";
export default /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

const vec3 SUN_DIR = normalize(vec3(0.35, 0.12, -1.0));
const vec3 DEEP    = vec3(0.02, 0.07, 0.18);
const vec3 SHALLOW = vec3(0.07, 0.20, 0.32);
const vec3 WARM_SHALLOW = vec3(0.16, 0.18, 0.10);
const vec3 BLUE_DEEP = vec3(0.03, 0.09, 0.24);

${noiseGlsl}
${skyGlsl}
${oceanGlsl}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  // Camera — gentle boat sway
  float sway = uTime * 0.35;
  float rollAmt = 0.015;
  float pitchAmt = 0.008;
  float heaveAmt = 0.25;
  float roll  = sin(sway * 0.7) * rollAmt + sin(sway * 1.1) * rollAmt * 0.5 + sin(sway * 0.3) * rollAmt * 0.3;
  float pitch = sin(sway * 0.5 + 1.0) * pitchAmt + sin(sway * 0.9) * pitchAmt * 0.4;
  float heave = sin(sway * 0.6 + 0.5) * heaveAmt + sin(sway * 1.0) * heaveAmt * 0.3;

  vec3 ro = vec3(0.0, 10.0 + heave, 0.0);
  vec3 target = vec3(2.0, 6.0, -40.0);
  vec3 fwd = normalize(target - ro);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  up = up + right * roll + fwd * pitch;
  up = normalize(up);
  vec3 rd = normalize(fwd * 2.0 + right * uv.x + up * uv.y);

  vec3 col = sky(rd, uTime);

  // Ray-ocean intersection — soft horizon blend
  float horizonBlend = smoothstep(0.006, -0.006, rd.y);
  if (rd.y < 0.006) {
    float safeRdY = min(rd.y, -0.0001);
    float t = -ro.y / safeRdY;
    vec3 hit = ro + rd * t;

    float dist = length(hit.xz);
    vec3 N = oceanNormal(hit.xz, uTime);
    vec3 V = normalize(ro - hit);
    float waveH = oceanHeight(hit.xz, uTime);

    // Fresnel — distance-aware, stronger at grazing angles
    float NdotV = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - NdotV, 5.0);
    float fresnelMin = mix(0.04, 0.15, smoothstep(10.0, 80.0, dist));
    fresnel = mix(fresnelMin, 0.90, fresnel);

    // Water colour — deep ocean blues with golden sun influence
    float crestLight = max(dot(N, vec3(0.0, 1.0, 0.0)), 0.0);
    float NdotL = max(dot(N, SUN_DIR), 0.0);
    vec3 waterCol = mix(DEEP, SHALLOW, pow(NdotV, 0.25));
    // Deeper blue away from sun
    float sunFacing = max(dot(normalize(hit.xz), normalize(SUN_DIR.xz)), 0.0);
    waterCol = mix(waterCol, BLUE_DEEP, (1.0 - sunFacing) * 0.35);
    // Golden warmth where sun hits
    waterCol = mix(waterCol, WARM_SHALLOW, NdotL * sunFacing * 0.35);
    waterCol += SUN_COLOR * 0.07 * pow(crestLight, 2.0) * NdotL;
    // Trough darkening — waves have dark valleys
    float troughDepth = 1.0 - smoothstep(0.0, 0.5, NdotL);
    waterCol *= 1.0 - troughDepth * 0.15;
    // Wave height darkening — lower areas are deeper/darker
    float heightDarken = smoothstep(0.3, -0.3, waveH);
    waterCol = mix(waterCol, DEEP * 0.8, heightDarken * 0.2);

    // Reflection
    vec3 R = reflect(-V, N);
    vec3 water = mix(waterCol, sky(R, uTime), fresnel);

    // Sun specular — golden glitter path
    vec3 H = normalize(SUN_DIR + V);
    float NdotH = max(dot(N, H), 0.0);
    water += SUN_COLOR * pow(NdotH, 600.0) * 4.0;
    water += SUN_COLOR * pow(NdotH, 120.0) * 0.40;
    water += SUN_COLOR * pow(NdotH, 25.0) * 0.12;
    water += SUN_COLOR * pow(NdotH, 5.0) * 0.05;
    // Sparkle noise — glittering individual wavelet highlights
    float sparkle = pow(NdotH, 300.0) * noise(hit.xz * 4.0 + uTime * 0.5);
    water += SUN_COLOR * sparkle * 2.2;
    // Distance sparkle — finer glitter far away
    float distSparkle = pow(NdotH, 150.0) * noise(hit.xz * 8.0 + uTime * 0.3) * smoothstep(20.0, 60.0, dist);
    water += SUN_COLOR * distSparkle * 0.8;

    // Subsurface scattering — wave height modulates translucency
    float thickness = 1.0 - smoothstep(-0.3, 0.5, waveH);
    float sssView = pow(max(dot(V, -SUN_DIR + N * 0.3), 0.0), 2.0);
    float sss = sssView * thickness * 0.35;
    water += vec3(0.18, 0.14, 0.07) * sss * 2.8;
    // Backlit crest glow — thin wave tops transmit golden light
    float backlit = pow(max(dot(rd, -SUN_DIR), 0.0), 3.0);
    float crestThin = pow(crestLight, 2.0) * thickness;
    water += vec3(0.16, 0.12, 0.05) * backlit * crestThin * 0.6;

    // Foam — Jacobian-based wave convergence
    float foam = oceanFoam(hit.xz, uTime);
    foam *= smoothstep(80.0, 15.0, dist);
    vec3 foamCol = mix(vec3(0.65, 0.65, 0.60), SUN_COLOR * 0.85, NdotL * sunFacing * 0.4);
    float foamNoise = noise(hit.xz * 5.0 + uTime * 0.3);
    foam *= smoothstep(0.25, 0.55, foamNoise);
    water = mix(water, foamCol, foam * 0.35);

    // Horizon fog — smooth blend to sky
    // Sample sky at the actual ray direction for a seamless merge
    float fog = smoothstep(30.0, 100.0, dist);
    vec3 horizonSky = sky(normalize(vec3(rd.x, max(rd.y, 0.0) + 0.005, rd.z)), uTime);
    water = mix(water, horizonSky, fog);

    col = mix(col, water, horizonBlend);
  }

  // Post — tone map, contrast, warm tint, vignette, film grain, CA
  col = col / (col + vec3(1.0));
  col = pow(col, vec3(0.88));
  // Contrast boost
  col = smoothstep(0.0, 1.0, col);
  // Warm tint in shadows
  col.r += (1.0 - col.r) * 0.02;

  // Chromatic aberration — subtle, increases toward edges
  float ca = length(vUv - 0.5) * 0.006;
  col.r *= 1.0 + ca;
  col.b *= 1.0 - ca;

  // Vignette
  float vig = 1.0 - 0.35 * pow(length(vUv - 0.5) * 1.5, 2.0);
  col *= vig;

  // Film grain — breaks up banding, adds analog warmth
  float grain = fract(sin(dot(vUv * uResolution + fract(uTime) * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.035;

  gl_FragColor = vec4(col, 1.0);
}
`;
