// 검증: 무작위 생년월일로 모든 풀이를 만들어 오류·빈 값·없는 용어가 없는지 확인
const S = require('../src/core/saju.js');
const I = require('../src/core/interpret.js');
const M = require('../src/core/methods.js');

let total = 0, failed = 0;
function check(name, ok, detail = '') {
  total++;
  if (!ok) { failed++; if (failed <= 20) console.log('✗', name, detail); }
}

const BAD = /undefined|NaN|\[object Object\]|null/;
const TERM = /\[\[([^\]]+)\]\]/g;

// 화면에 나가는 문장(sections, summary, categories, months.line)만 검사한다
function texts(value) {
  const out = [];
  const pick = (v) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(pick); else if (v && typeof v === 'object') Object.values(v).forEach(pick); };
  pick([value.sections, value.summary, value.categories, (value.months || []).map(m => m.line)]);
  return out;
}

function scan(name, value) {
  const list = texts(value);
  check(`${name} 문장 있음`, list.length > 0);
  for (const text of list) {
    check(`${name} 빈 값`, !BAD.test(text), text);
    for (const [, term] of text.matchAll(TERM)) check(`${name} 용어 [[${term}]]`, !!I.GLOSSARY[term]);
  }
}

function randomPerson() {
  const t = new Date(Date.UTC(1930, 0, 1) + Math.random() * 95 * 365.25 * 86400000);
  return {
    name: '홍길동',
    gender: Math.random() < 0.5 ? 'M' : 'F',
    year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(),
    hour: Math.random() < 0.15 ? null : t.getUTCHours(), minute: t.getUTCMinutes(),
  };
}

for (let i = 0; i < 400; i++) {
  const p = randomPerson();
  const label = JSON.stringify(p);
  try {
    const methodId = M.METHOD_ORDER[i % M.METHOD_ORDER.length];
    const s = M.applyMethod(S.analyzeSaju(p), methodId, 2026);
    for (const m of s.methods.list) { scan('방법 ' + m.id, { sections: [{ lead: m.verdict, paragraphs: m.paragraphs, why: m.why }] }); if (m.kind === 'yongsin') check('방법 용신', ['목', '화', '토', '금', '수'].includes(m.yongsin), label); }
    const life = I.readLifeFlow(s, new Date(2026, 9, 19));
    check('인생 흐름 점수', life.points.every(x => x.score >= 10 && x.score <= 95), label);
    scan('인생 흐름', life);
    const full = I.readFullSaju(s);
    check('종합 섹션 수', full.sections.length === 14, label);
    scan('종합', full);
    scan('오늘', I.readToday(s, new Date(2026, 9, 19)));
    const y = I.readYear(s, 2026);
    check('월운 12개', y.months.length === 12, label);
    scan('신년', y);
    const d = I.readDaeun(s, 2026);
    check('대운 10개', d.list.length === 10, label);
    scan('대운', d);
    const other = M.applyMethod(S.analyzeSaju(randomPerson()), methodId, 2026);
    const c = I.readCompat(s, other);
    check('궁합 점수 범위', c.score >= 0 && c.score <= 100, label);
    check('궁합 항목 8개', c.categories.length === 8 && c.categories.every(x => x.score >= 0 && x.score <= 100), label);
    scan('궁합', c);
    const cmp = I.compareCompat(s, other, M.applyMethod(S.analyzeSaju(randomPerson()), methodId, 2026));
    check('비교 결과 2개', cmp.results.length === 2, label);
    scan('비교', { sections: [cmp.section] });
    const pe = I.readPersona(s);
    check('성향 지표 4개', pe.axes.length === 4 && pe.axes.every(x => x.value >= 0 && x.value <= 100), label);
    check('성향 섹션 6개', pe.sections.length === 6, label);
    scan('성향', { sections: pe.sections, summary: [pe.typeName, pe.oneLine, pe.hashtags, pe.axes.map(x => [x.text, x.why])] });
    const sc = I.luckScore(s, y.pillar).score;
    check('운 점수 범위', sc >= 15 && sc <= 95, label);
  } catch (e) {
    check('예외', false, `${label} ${e.stack}`);
  }
}

// 조사 처리
check('조사 받침', I.josa('목', '이/가') === '목이');
check('조사 무받침', I.josa('화', '이/가') === '화가');
check('조사 은/는', I.josa('경금', '은/는') === '경금은');
for (let k = 0; k < 30; k++) { const t = JSON.stringify(I.readCompat(M.applyMethod(S.analyzeSaju(randomPerson()), 'consensus'), M.applyMethod(S.analyzeSaju(randomPerson()), 'consensus'))); check('조사 괄호', !/\((가|를|는|을|이)\)/.test(t)); }

// 다양성: 여러 사람에게 글자까지 똑같이 나오는 문장(10% 이상의 사람에게 반복)이 섹션 평균 30% 미만이어야 한다
{
  const bySec = {};
  for (let i = 0; i < 150; i++) {
    const s = M.applyMethod(S.analyzeSaju(randomPerson()), 'consensus', 2026);
    const add = (id, x) => (bySec[id] ||= []).push(new Set([x.lead, ...x.paragraphs]));
    I.readFullSaju(s).sections.forEach(x => add('종합:' + x.id, x));
    I.readPersona(s).sections.forEach(x => add('성격:' + x.id, x));
  }
  const rates = Object.entries(bySec).map(([id, sets]) => {
    const freq = new Map();
    for (const st of sets) for (const t of st) freq.set(t, (freq.get(t) || 0) + 1);
    let common = 0, all = 0;
    for (const st of sets) for (const t of st) { all++; if (freq.get(t) >= sets.length * 0.1) common++; }
    return [id, common / all];
  });
  const avg = rates.reduce((a, [, r]) => a + r, 0) / rates.length;
  check('풀이 다양성(평균 공통 문장 < 30%)', avg < 0.3, `${Math.round(avg * 100)}% — ${rates.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, r]) => `${id} ${Math.round(r * 100)}%`).join(', ')}`);
  console.log(`풀이 다양성: 평균 공통 문장 ${Math.round(avg * 100)}%`);
}

console.log(`${total}건 중 실패 ${failed}건`);
process.exit(failed ? 1 : 0);
