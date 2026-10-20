// 통계 DB 만들기: 실제로 나올 수 있는 모든 출생 시각을 계산해 분포와 조합 빈도를 src/data/stats.js에 저장한다
//   node scripts/build-stats.js            (기본: 1900~2099년, 2시간 간격 = 약 88만 명 + 궁합 10만 쌍)
//   node scripts/build-stats.js --quick    (빠른 확인용: 10일 간격)
// 결과는 "상위 몇 %", "몇 명 중 한 명" 같은 풀이 문장에 쓰인다.
const fs = require('fs');
const path = require('path');
const S = require('../src/core/saju.js');
const M = require('../src/core/methods.js');
const I = require('../src/core/interpret.js');

const QUICK = process.argv.includes('--quick');
const STEP_H = QUICK ? 240 : 2;               // 출생 시각 간격(시간)
const FROM = Date.UTC(1900, 0, 1, 0, 30), TO = Date.UTC(2100, 0, 1);
const PAIRS = QUICK ? 5000 : 100000;
const ELS = ['목', '화', '토', '금', '수'], GROUPS = ['비겁', '식상', '재성', '관성', '인성'];

// 수치 분포는 값 목록을 모아 백분위(0~100) 경계로 줄인다
const nums = {};
const num = (k, v) => (nums[k] ||= []).push(v);
const counts = {};
const cnt = (k, key) => { const m = (counts[k] ||= {}); m[key] = (m[key] || 0) + 1; };
const uniq = new Set();
let n = 0;
const charts = [];      // 궁합 표본용 (일부만 보관)
const t0 = Date.now();

for (let t = FROM; t < TO; t += STEP_H * 3600000) {
  const d = new Date(t);
  const gender = (QUICK ? n : Math.floor(t / 86400000)) % 2 ? 'F' : 'M';   // 성별은 날짜마다 번갈아 (시간대가 한쪽 성별에 몰리지 않게)
  const input = { name: '가', gender, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), timeMode: 'clock' };
  let s;
  try { s = M.applyMethod(S.analyzeSaju(input), 'consensus', 2026); } catch { continue; }
  n++;
  const p = s.pillars, ds = s.dayMaster.stem;
  uniq.add(['year', 'month', 'day', 'hour'].map(k => p[k].hanja).join(''));

  num('strength', s.strength.score);
  for (const e of ELS) num(`el:${e}`, s.elements.percent[e]);
  for (const g of GROUPS) num(`grp:${g}`, s.strength.groups[g]);
  num('missing', s.elements.missing.length);
  // 배우자운은 남녀 기준이 달라, 모든 사람에 대해 두 성별로 각각 계산한다
  for (const g of ['M', 'F']) num(`spouse:${g}`, I.analyzeSpouse({ ...s, gender: g }).index);
  const ax = I.personaAxes(s);
  ['외향', '감성', '계획', '주도'].forEach((k, i) => num(`axis:${k}`, ax[i].value));
  num('sinsal', new Set(s.sinsal.map(x => x.name)).size);
  num('relations', s.relations.length);

  const top = GROUPS.slice().sort((a, b) => s.strength.groups[b] - s.strength.groups[a])[0];
  cnt('ilju', p.day.hanja);
  cnt('gyeok', s.gyeokguk.name);
  cnt('yongsin', s.yongsin.yongsin);
  cnt('level', s.strength.level);
  cnt('stem×gyeok', `${ds}|${s.gyeokguk.name}`);
  cnt('stem×yongsin', `${ds}|${s.yongsin.yongsin}`);
  cnt('ilju×gyeok×yongsin', `${p.day.hanja}|${s.gyeokguk.name}|${s.yongsin.yongsin}`);
  cnt('type', `${ds}|${top}`);
  cnt('mode', I.conflictProfile(s).mode);
  for (const x of I.structures(s)) cnt('structure', x.id);
  for (const x of new Set(s.sinsal.map(z => z.name))) cnt('sinsal', x);
  for (const e of s.elements.missing) cnt('missingEl', e);

  // 해마다 운 점수 표본: 이 사람의 2026년 운
  num('luck2026', I.luckScore(s, S.getSeun(s, 2026, 2026)[0]).score);
  if (n % 7 === 0 && charts.length < 40000) charts.push(s);
  if (n % 50000 === 0) console.log(`${n}명 계산… ${Math.round((Date.now() - t0) / 1000)}초`);
}

// 궁합: 무작위 쌍(남녀)
const men = charts.filter(c => c.gender === 'M'), women = charts.filter(c => c.gender === 'F');
for (let i = 0; i < PAIRS; i++) {
  const a = men[Math.floor(Math.random() * men.length)], b = women[Math.floor(Math.random() * women.length)];
  const c = I.readCompat(a, b, new Date(2026, 9, 20));
  num('compat', c.score);
  for (const k of c.categories) num(`compat:${k.key}`, k.score);
}

// 백분위 경계: q[i] = 하위 i% 지점의 값 (i = 0..100)
const cuts = {};
for (const [k, list] of Object.entries(nums)) {
  list.sort((a, b) => a - b);
  cuts[k] = Array.from({ length: 101 }, (_, i) => Math.round(list[Math.min(list.length - 1, Math.floor(i / 100 * list.length))] * 10) / 10);
}
const out = { generated: new Date().toISOString().slice(0, 10), people: n, uniqueCharts: uniq.size, pairs: PAIRS, step: `${STEP_H}시간`, range: '1900~2099년', cuts, counts };
const file = path.join(__dirname, '../src/data/stats.js');
fs.writeFileSync(file, `// 자동 생성: node scripts/build-stats.js (직접 고치지 마세요)
// ${out.range} 출생 시각을 ${out.step} 간격으로 모두 계산한 ${n.toLocaleString()}명, 서로 다른 여덟 글자 ${uniq.size.toLocaleString()}가지, 궁합 ${PAIRS.toLocaleString()}쌍의 통계
(function (root) {
  const STATS = ${JSON.stringify(out)};
  if (typeof module !== 'undefined') module.exports = STATS;
  else root.SajuStats = STATS;
})(typeof window !== 'undefined' ? window : globalThis);
`);
console.log(`완료: ${n}명, 여덟 글자 ${uniq.size}가지, 궁합 ${PAIRS}쌍, ${Math.round((Date.now() - t0) / 1000)}초, ${Math.round(fs.statSync(file).size / 1024)}KB`);
