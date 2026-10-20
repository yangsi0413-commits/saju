// 검증: 무작위 인물 × 다양한 질문으로 Q&A 답변을 만들어 오류·빈 값을 확인
const S = require('../src/core/saju.js');
const M = require('../src/core/methods.js');
const Q = require('../src/core/qa.js');

let total = 0, failed = 0;
function check(name, ok, detail = '') {
  total++;
  if (!ok) { failed++; if (failed <= 20) console.log('✗', name, detail); }
}
const BAD = /undefined|NaN|\[object Object\]|null/;

const QUESTIONS = [
  '언제 이직하면 좋을까?', '내년에 승진할 수 있을까?', '2030년 재물운은?', '주식 투자 언제 해야 돼?', '창업해도 될까?',
  '결혼은 언제쯤 할까?', '올해 연애운 어때?', '35살에 이사 가도 될까?', '시험 합격 시기는?', '건강은 어디를 조심해야 해?',
  '나는 어떤 성격이야?', '행운의 색은?', '지금 대운은 어떤 시기야?', '앞으로 조심할 시기는?', '작년에 왜 힘들었을까?',
  '인생에서 가장 잘 풀리는 때는?', '이번 달 운세는?', '7월은 어때?', '오늘 운세 알려줘', '우리 결혼하기 좋은 해는?',
  '누구와 더 잘 맞아?', '해석 방법마다 왜 다르게 나와?', '아이는 언제 생길까?', '친구 관계는 어때?', '점심 메뉴 추천해줘', '',
];

function randomPerson(name) {
  const t = new Date(Date.UTC(1940, 0, 1) + Math.random() * 80 * 365.25 * 86400000);
  return {
    name, gender: Math.random() < 0.5 ? 'M' : 'F',
    year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(),
    hour: Math.random() < 0.15 ? null : t.getUTCHours(), minute: t.getUTCMinutes(),
  };
}

const now = new Date(2026, 9, 19);
for (let i = 0; i < 60; i++) {
  const method = M.METHOD_ORDER[i % M.METHOD_ORDER.length];
  const A = (p) => M.applyMethod(S.analyzeSaju(p), method, 2026);
  const s = A(randomPerson('나'));
  const partners = i % 3 === 0 ? [] : i % 3 === 1 ? [A(randomPerson('상대'))] : [A(randomPerson('상대'))].concat([A(randomPerson('두번째'))]);
  for (const q of QUESTIONS) {
    try {
      const a = Q.answer(s, q, { now, partners });
      const texts = [a.title, a.conclusion, ...a.points, ...a.advice, ...a.why];
      check('답변 형태', a.conclusion && a.points.length > 0, `${q} → ${a.topic}`);
      for (const t of texts) check('빈 값', typeof t === 'string' && !BAD.test(t), `${q}: ${t}`);
    } catch (e) {
      check('예외', false, `${q} ${e.stack}`);
    }
  }
}

// 주제·시점 인식
const s = M.applyMethod(S.analyzeSaju({ name: '지민', year: 1990, month: 5, day: 15, hour: 10, minute: 30, gender: 'F' }), 'consensus', 2026);
check('주제 이직', Q.detectTopic('언제 이직하면 좋을까?').id === 'career');
check('주제 결혼', Q.detectTopic('결혼은 언제쯤?').id === 'marriage');
check('주제 재물', Q.detectTopic('주식 투자 해도 될까').id === 'money');
check('시점 내년', Q.parseTime('내년 운세', s, 2026, now).years[0] === 2027);
check('시점 나이', Q.parseTime('35살에', s, 2026, now).years[0] === 2024);
check('시점 연도', Q.parseTime('2030년에', s, 2026, now).years[0] === 2030);
check('시점 달', Q.parseTime('7월은?', s, 2026, now).month === 7);
check('언제 질문', Q.parseTime('언제 좋아?', s, 2026, now).when === true);
check('과거 질문', Q.parseTime('작년에 왜 힘들었을까', s, 2026, now).past === true);
check('시점 후년', Q.parseTime('후년에 이직', s, 2026, now).years[0] === 2028);
check('시점 내일', Q.parseTime('내일은 어때?', s, 2026, now).day === 1);
// 날을 콕 집은 질문은 그날의 운세로, 달을 콕 집은 질문은 그달의 운세로 답한다
{
  const at = (q) => Q.answer(s, q, { now: new Date(2026, 9, 20) });
  check('내일 → 내일 운세', at('내일은 어때?').title.startsWith('내일의 운세 (10월 21일)'), at('내일은 어때?').title);
  check('오늘+주제 → 오늘 운세, 분야 먼저', at('내일 데이트 괜찮아?').points[0].startsWith('연애·관계'), at('내일 데이트 괜찮아?').points[0]);
  check('달+주제 → 그달 운세', at('12월 연애운').title === '2026년 12월 운세', at('12월 연애운').title);
  check('언제 질문은 여러 해', at('결혼은 언제?').topic === 'marriage');
  for (const id of M.METHOD_ORDER) {
    const x = M.applyMethod(S.analyzeSaju({ name: '지민', year: 1990, month: 5, day: 15, hour: 10, minute: 30, gender: 'F' }), id, 2026);
    check('용신 근거는 그 방법의 결론', x.yongsin.reason === x.methods.byId[x.methods.byId[id].kind === 'yongsin' ? id : 'consensus'].verdict, `${id}: ${x.yongsin.reason}`);
  }
}

console.log(`${total}건 중 실패 ${failed}건`);
process.exit(failed ? 1 : 0);
