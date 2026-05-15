/**
 * Main fragment shader — composes sky, ocean, lighting, and post-processing.
 * Each concern is imported from its own GLSL module (clouds injected before sky).
 */

import noiseGlsl from "./noise.glsl.js";
import starsGlsl from "../stars/stars.glsl.js";
import cloudsGlsl from "../sky/clouds.glsl.js";
import skyGlsl from "../sky/sky.glsl.js";
import oceanGlsl from "../ocean/ocean.glsl.js";
export default /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

const vec3 MOON_DIR = normalize(vec3(0.05, 0.07, -1.0));
const vec3 DEEP    = vec3(0.02, 0.04, 0.08);
const vec3 SHALLOW = vec3(0.04, 0.07, 0.14);

${noiseGlsl}
${starsGlsl}
${cloudsGlsl}
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
  vec3 target = vec3(2.0, 11.5, -40.0);
  vec3 fwd = normalize(target - ro);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  up = up + right * roll + fwd * pitch;
  up = normalize(up);
  vec3 rd = normalize(fwd * 2.0 + right * uv.x + up * uv.y);

  vec3 col = sky(rd, uTime);

  // Horizon definition — subtle darkening right at rd.y ≈ 0 (perfectly straight)
  float horizonDark = exp(-rd.y * rd.y / 0.00003);
  col *= 1.0 - horizonDark * 0.12;

  // Ray-ocean intersection
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y;
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

    // Water colour — moonlit ocean
    float NdotL = max(dot(N, MOON_DIR), 0.0);
    vec3 waterCol = mix(DEEP, SHALLOW, pow(NdotV, 0.25));
    // Moonlit brightening on wave faces
    waterCol += MOON_COLOR * 0.06 * NdotL;
    // Wave height darkening
    float heightDarken = smoothstep(0.3, -0.3, waveH);
    waterCol = mix(waterCol, DEEP * 0.7, heightDarken * 0.2);

    // Reflection — dominant at night (dark water = high Fresnel)
    vec3 R = reflect(-V, N);
    vec3 water = mix(waterCol, skyReflect(R, uTime), fresnel);

    // Moon specular — silver dancing column
    vec3 H = normalize(MOON_DIR + V);
    float NdotH = max(dot(N, H), 0.0);
    water += MOON_COLOR * pow(NdotH, 800.0) * 5.0;   // tight bright core
    water += MOON_COLOR * pow(NdotH, 200.0) * 0.6;    // medium spread
    water += MOON_COLOR * pow(NdotH, 40.0) * 0.08;    // soft glow
    // Dancing sparkle from wave normals
    float sparkle = pow(NdotH, 500.0);
    water += MOON_COLOR * sparkle * 2.0;

    // Foam — silver-grey at night
    float foam = oceanFoam(hit.xz, uTime);
    foam *= smoothstep(200.0, 30.0, dist);
    vec3 foamCol = vec3(0.12, 0.14, 0.18) + MOON_COLOR * 0.15 * NdotL;
    float foamTex = worley(hit.xz * 3.0 + uTime * 0.2);
    foam *= smoothstep(0.15, 0.50, foamTex);
    water = mix(water, foamCol, foam * 0.25);

    // Atmospheric perspective — distant ocean fades to dark horizon
    float atmoDist = smoothstep(200.0, 800.0, dist);
    vec3 horizonTint = SKY_HORIZON;
    water = mix(water, horizonTint, atmoDist * 0.40);

    // Horizon fog — blend to night sky at distance
    float fog = smoothstep(350.0, 1200.0, dist);
    vec3 horizonSky = skyReflect(normalize(vec3(rd.x, max(rd.y, 0.0) + 0.005, rd.z)), uTime);
    water = mix(water, horizonSky, fog);

    col = water;
  }

  // --- Night colour grading ---
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  // Subtle cool blue shift
  col = mix(col, col * vec3(0.90, 0.93, 1.08), 0.10);
  // Desaturate slightly for nocturnal look (Purkinje effect)
  col = mix(col, vec3(luma) * vec3(0.90, 0.93, 1.05), 0.06);

  // Post — ACES filmic tone map
  col *= 0.75; // exposure — bright enough to see ocean detail
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(0.85)); // gamma lift for shadow detail
  // Moderate contrast
  col = smoothstep(0.0, 1.0, col);

  // Chromatic aberration
  float ca = length(vUv - 0.5) * 0.005;
  col.r *= 1.0 + ca;
  col.b *= 1.0 - ca;

  // Vignette
  float vig = 1.0 - 0.35 * pow(length(vUv - 0.5) * 1.5, 2.0);
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
