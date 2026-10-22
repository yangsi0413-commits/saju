// 검증: 점수가 20점 이상 다른데 같은 문장이 나오는 비율 (점수와 해석이 따로 놀면 실패)
const R = '../src/core/';
const S = require(R + 'saju.js'), M = require(R + 'methods.js'), I = require(R + 'interpret.js');
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const mk = (g) => { const t = new Date(Date.UTC(1960, 0, 1) + rnd() * 45 * 365.25 * 86400000); return M.applyMethod(S.analyzeSaju({ name: g === 'M' ? '남' : '여', gender: g, year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: t.getUTCHours(), minute: 0 }), 'consensus', 2026); };
const now = new Date(2026, 9, 20);
const rec = {}; // type → Map(text → [scores])
const put = (type, text, score) => { const m = (rec[type] ||= new Map()); const k = String(text); (m.get(k) || m.set(k, []).get(k)).push(score); };
const N = 150;
for (let i = 0; i < N; i++) {
  const a = mk(rnd() < .5 ? 'M' : 'F'), b = mk(a.gender === 'M' ? 'F' : 'M');
  const c = I.readCompat(a, b, now);
  for (const x of c.categories) put('궁합:' + x.key, x.verdict + ' | ' + x.text.replace(/남|여/g, 'X').replace(/점수[^.]*\./, ''), x.score);
  put('궁합:총점-요약', c.grade + ' | ' + c.advice.join(' '), c.score);
  const sp = I.analyzeSpouse(a);
  put('배우자운 등급', sp.grade, sp.index);
  put('신강약 문장', I.readFullSaju(a).sections.find(x => x.id === 'strength').paragraphs[0], a.strength.score);
  const yr = I.readYear(a, 2026);
  put('신년:분야별', yr.categories.map(([k, v]) => v).join(' '), yr.score.score);
  put('신년:상반기', yr.sections[0].paragraphs[1], yr.score.score);
  for (const m of yr.months) put('월운:한줄', m.line, m.score);
  const td = I.readToday(a, now);
  put('오늘:분야별', td.categories.map(([k, v]) => v).join(' '), td.score.score);
  put('오늘:요약', td.sections[0].lead, td.score.score);
  const da = I.readDaeun(a, 2026);
  if (da) for (const d of da.list) put('대운:테마', d.theme, d.score);
}
const rows = [];
for (const [type, m] of Object.entries(rec)) {
  let bad = 0, total = 0, worst = { range: 0 };
  for (const [t, sc] of m) {
    const v = sc.filter(Number.isFinite); if (v.length < 2) { total += v.length; continue; }
    const range = Math.max(...v) - Math.min(...v);
    total += v.length; if (range >= 20) bad += v.length;
    if (range > worst.range) worst = { range, t, min: Math.min(...v), max: Math.max(...v), n: v.length };
  }
  rows.push({ type, rate: Math.round(bad / total * 100), worst });
}
rows.sort((a, b) => b.rate - a.rate);



const avg = rows.reduce((a, r) => a + r.rate, 0) / rows.length;
const worst = rows.slice().sort((a, b) => b.rate - a.rate).slice(0, 3).map(r => `${r.type} ${r.rate}%`).join(', ');
console.log(`점수-해석 일치: 점수 차 20점 이상인데 같은 문장인 비율 평균 ${Math.round(avg)}% (높은 항목: ${worst})`);
const fail = avg >= 5 || rows.some(r => r.rate >= 20);
console.log(fail ? '실패' : '1건 중 실패 0건');
process.exit(fail ? 1 : 0);
