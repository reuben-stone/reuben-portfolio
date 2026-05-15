/**
 * Realistic star rendering — brightest real stars hardcoded.
 */

export default /* glsl */ `

vec3 bvToColor(float bv) {
  if (bv < 0.0) return vec3(0.65, 0.75, 1.0);
  if (bv < 0.5) return mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 1.0, 0.9), bv / 0.5);
  if (bv < 1.0) return mix(vec3(1.0, 1.0, 0.9), vec3(1.0, 0.8, 0.5), (bv - 0.5) / 0.5);
  return mix(vec3(1.0, 0.8, 0.5), vec3(1.0, 0.5, 0.3), clamp((bv - 1.0), 0.0, 1.0));
}

void addStar(vec3 rd, vec3 sdir, float mag, float bv, float idx, float time, inout vec3 result) {
  float d = dot(rd, sdir);
  if (d < 0.9995) return;
  float ang = acos(clamp(d, 0.0, 1.0));
  // Small, tight points — vary less with magnitude
  float sz = mix(0.0018, 0.0008, clamp((mag + 1.5) / 5.0, 0.0, 1.0));
  float g = exp(-ang * ang / (sz * sz));
  // Compressed brightness — dim stars clearly visible
  float b = pow(10.0, -0.15 * mag) * 2.0;
  float tw = sin(time * (1.5 + idx * 0.13) + idx * 7.0) * 0.10 + 0.90;
  result += bvToColor(bv) * g * b * tw;
}

vec3 renderStars(vec3 rd, float time) {
  vec3 r = vec3(0.0);
  addStar(rd,normalize(vec3(0.2686,0.2876,-0.9193)),-1.4,0.0,0.0,time,r);
  addStar(rd,normalize(vec3(0.1155,0.7954,-0.5949)),-0.6,0.2,1.0,time,r);
  addStar(rd,normalize(vec3(-0.0705,-0.7193,-0.6911)),0.1,0.8,2.0,time,r);
  addStar(rd,normalize(vec3(-0.1097,0.1427,-0.9837)),0.2,0.0,3.0,time,r);
  addStar(rd,normalize(vec3(0.4953,-0.0911,-0.8639)),0.4,0.4,4.0,time,r);
  addStar(rd,normalize(vec3(0.0656,-0.1289,-0.9895)),0.5,1.5,5.0,time,r);
  addStar(rd,normalize(vec3(-0.2646,-0.2842,-0.9215)),0.9,1.5,6.0,time,r);
  addStar(rd,normalize(vec3(0.4590,-0.4699,-0.7540)),1.2,1.0,7.0,time,r);
  addStar(rd,normalize(vec3(0.2943,0.4844,-0.8239)),1.5,-0.2,8.0,time,r);
  addStar(rd,normalize(vec3(0.4071,-0.5283,-0.7451)),1.6,0.0,9.0,time,r);
  addStar(rd,normalize(vec3(-0.0644,-0.1106,-0.9918)),1.6,-0.2,10.0,time,r);
  addStar(rd,normalize(vec3(-0.0525,-0.4788,-0.8764)),1.6,-0.1,11.0,time,r);
  addStar(rd,normalize(vec3(-0.0165,0.0210,-0.9996)),1.7,-0.2,12.0,time,r);
  addStar(rd,normalize(vec3(0.0033,0.0339,-0.9994)),1.7,-0.2,13.0,time,r);
  addStar(rd,normalize(vec3(0.4115,0.7353,-0.5385)),1.8,-0.1,14.0,time,r);
  addStar(rd,normalize(vec3(0.3370,0.4445,-0.8300)),1.8,0.7,15.0,time,r);
  addStar(rd,normalize(vec3(0.0602,-0.7065,-0.7052)),1.9,0.1,16.0,time,r);
  addStar(rd,normalize(vec3(0.2390,-0.2823,-0.9291)),1.9,0.0,17.0,time,r);
  addStar(rd,normalize(vec3(0.1762,0.3083,-0.9348)),2.0,-0.2,18.0,time,r);
  addStar(rd,normalize(vec3(0.8281,0.1505,-0.5399)),2.0,1.4,19.0,time,r);
  addStar(rd,normalize(vec3(0.0334,0.1680,-0.9852)),2.1,-0.2,20.0,time,r);
  addStar(rd,normalize(vec3(0.4491,0.6428,-0.6205)),2.2,-0.3,21.0,time,r);
  addStar(rd,normalize(vec3(-0.0349,0.0052,-0.9994)),2.2,-0.2,22.0,time,r);
  addStar(rd,normalize(vec3(0.3826,0.4894,-0.7836)),2.5,-0.1,23.0,time,r);
  addStar(rd,normalize(vec3(-0.6335,-0.0713,-0.7704)),2.5,1.6,24.0,time,r);
  addStar(rd,normalize(vec3(-0.0302,0.3061,-0.9515)),2.6,0.2,25.0,time,r);
  addStar(rd,normalize(vec3(-0.0013,0.5603,-0.8283)),2.6,-0.1,26.0,time,r);
  addStar(rd,normalize(vec3(0.0684,-0.6048,-0.7935)),2.6,-0.1,27.0,time,r);
  addStar(rd,normalize(vec3(-0.1562,-0.5471,-0.8224)),2.7,1.5,28.0,time,r);
  addStar(rd,normalize(vec3(0.3280,0.6032,-0.7270)),2.7,1.6,29.0,time,r);
  addStar(rd,normalize(vec3(-0.0198,0.1030,-0.9945)),2.8,-0.2,30.0,time,r);
  addStar(rd,normalize(vec3(-0.1393,0.0887,-0.9863)),2.8,0.2,31.0,time,r);
  addStar(rd,normalize(vec3(-0.0479,0.3544,-0.9338)),2.8,0.8,32.0,time,r);
  addStar(rd,normalize(vec3(0.5470,0.4116,-0.7289)),2.8,0.5,33.0,time,r);
  addStar(rd,normalize(vec3(-0.3784,-0.5282,-0.7601)),2.8,0.3,34.0,time,r);
  addStar(rd,normalize(vec3(-0.4303,-0.4084,-0.8050)),2.9,-0.1,35.0,time,r);
  addStar(rd,normalize(vec3(0.1722,-0.3829,-0.9076)),2.9,1.6,36.0,time,r);
  addStar(rd,normalize(vec3(-0.4946,0.6469,-0.5805)),2.9,0.1,37.0,time,r);
  addStar(rd,normalize(vec3(0.4460,-0.1442,-0.8834)),2.9,-0.1,38.0,time,r);
  addStar(rd,normalize(vec3(-0.3302,-0.6429,-0.6911)),2.9,-0.2,39.0,time,r);
  addStar(rd,normalize(vec3(0.1906,0.7729,-0.6052)),2.9,1.2,40.0,time,r);
  addStar(rd,normalize(vec3(-0.4185,0.2336,-0.8777)),3.0,1.6,41.0,time,r);
  addStar(rd,normalize(vec3(-0.0096,-0.3607,-0.9326)),3.0,-0.1,42.0,time,r);
  addStar(rd,normalize(vec3(0.1515,0.5010,-0.8521)),3.0,-0.2,43.0,time,r);
  addStar(rd,normalize(vec3(0.3242,0.4041,-0.8554)),3.0,-0.1,44.0,time,r);
  addStar(rd,normalize(vec3(-0.1192,-0.6924,-0.7116)),3.0,0.5,45.0,time,r);
  addStar(rd,normalize(vec3(0.2493,-0.4247,-0.8703)),3.1,1.4,46.0,time,r);
  addStar(rd,normalize(vec3(0.7489,-0.1036,-0.6545)),3.1,1.0,47.0,time,r);
  addStar(rd,normalize(vec3(0.0388,0.5845,-0.8105)),3.1,1.1,48.0,time,r);
  addStar(rd,normalize(vec3(0.1818,0.6845,-0.7060)),3.2,-0.1,49.0,time,r);
  addStar(rd,normalize(vec3(-0.1095,-0.6591,-0.7440)),3.2,-0.1,50.0,time,r);
  addStar(rd,normalize(vec3(-0.2155,-0.1212,-0.9689)),3.2,0.5,51.0,time,r);
  addStar(rd,normalize(vec3(-0.1388,0.3806,-0.9143)),3.2,1.5,52.0,time,r);
  addStar(rd,normalize(vec3(0.3339,0.6858,-0.6467)),3.2,1.5,53.0,time,r);
  addStar(rd,normalize(vec3(-0.1132,0.2791,-0.9536)),3.3,-0.1,54.0,time,r);
  addStar(rd,normalize(vec3(-0.1627,0.8196,-0.5493)),3.3,-0.1,55.0,time,r);
  addStar(rd,normalize(vec3(0.1400,-0.3828,-0.9132)),3.3,1.6,56.0,time,r);
  addStar(rd,normalize(vec3(0.4852,0.4204,-0.7667)),3.3,1.2,57.0,time,r);
  addStar(rd,normalize(vec3(-0.0676,0.0418,-0.9968)),3.4,-0.2,58.0,time,r);
  addStar(rd,normalize(vec3(0.2740,-0.2232,-0.9355)),3.4,0.4,59.0,time,r);
  addStar(rd,normalize(vec3(0.7231,-0.1118,-0.6816)),3.4,0.7,60.0,time,r);
  addStar(rd,normalize(vec3(-0.0209,-0.1725,-0.9848)),3.4,-0.2,61.0,time,r);
  addStar(rd,normalize(vec3(-0.2946,-0.2735,-0.9157)),3.4,0.2,62.0,time,r);
  addStar(rd,normalize(vec3(-0.4100,-0.2163,-0.8861)),3.4,-0.1,63.0,time,r);
  addStar(rd,normalize(vec3(0.3384,0.7985,-0.4980)),3.5,-0.2,64.0,time,r);
  addStar(rd,normalize(vec3(-0.6957,-0.0564,-0.7161)),3.5,0.1,65.0,time,r);
  addStar(rd,normalize(vec3(0.3084,0.4685,-0.8279)),3.5,1.7,66.0,time,r);
  addStar(rd,normalize(vec3(0.2530,0.5374,-0.8045)),3.5,-0.1,67.0,time,r);
  addStar(rd,normalize(vec3(0.3923,-0.3743,-0.8402)),3.5,0.4,68.0,time,r);
  addStar(rd,normalize(vec3(-0.4806,0.1696,-0.8604)),3.5,0.9,69.0,time,r);
  addStar(rd,normalize(vec3(-0.2894,-0.3285,-0.8990)),3.5,1.0,70.0,time,r);
  addStar(rd,normalize(vec3(0.6230,-0.1596,-0.7658)),3.5,1.5,71.0,time,r);
  addStar(rd,normalize(vec3(-0.2914,0.5563,-0.7782)),3.5,-0.1,72.0,time,r);
  addStar(rd,normalize(vec3(0.0293,0.2558,-0.9663)),3.5,0.1,73.0,time,r);
  addStar(rd,normalize(vec3(0.4706,-0.4131,-0.7797)),3.6,0.9,74.0,time,r);
  addStar(rd,normalize(vec3(0.3979,-0.2847,-0.8721)),3.6,0.1,75.0,time,r);
  addStar(rd,normalize(vec3(-0.0969,0.1192,-0.9881)),3.6,-0.1,76.0,time,r);
  addStar(rd,normalize(vec3(0.0180,0.3819,-0.9240)),3.6,0.5,77.0,time,r);
  addStar(rd,normalize(vec3(0.2590,-0.5586,-0.7879)),3.6,0.1,78.0,time,r);
  addStar(rd,normalize(vec3(-0.6006,-0.4580,-0.6553)),3.6,-0.1,79.0,time,r);
  return r;
}
`;
