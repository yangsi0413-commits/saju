// 검증: lunar-javascript·Intl과 교차 비교 + 알려진 사례
const { Solar } = require('lunar-javascript');
const S = require('../src/core/saju.js');

let total = 0, failed = 0;
function check(name, ok, detail = '') {
  total++;
  if (!ok) { failed++; if (failed <= 30) console.log('✗', name, detail); }
}
const randomTime = () => {
  const t = new Date(Date.UTC(1930, 0, 1) + Math.random() * 110 * 365.25 * 86400000);
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes()];
};

const SHISHEN = { 比肩: '비견', 劫财: '겁재', 食神: '식신', 伤官: '상관', 偏财: '편재', 正财: '정재', 七杀: '편관', 正官: '정관', 偏印: '편인', 正印: '정인' };
const DISHI = { 长生: '장생', 沐浴: '목욕', 冠带: '관대', 临官: '건록', 帝旺: '제왕', 衰: '쇠', 病: '병', 死: '사', 墓: '묘', 绝: '절', 胎: '태', 养: '양' };

// 1) 4주: 같은 시계(UTC+8)로 lunar-javascript와 비교. sect 1 = 23시 이후 다음 날, sect 2 = 야자시
for (let i = 0; i < 3000; i++) {
  const [y, m, d, h, mi] = randomTime();
  const ec = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
  for (const [sect, ziHour] of [[1, 'next'], [2, 'split']]) {
    ec.setSect(sect);
    const want = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(' ');
    const r = S.analyzeSaju({ year: y, month: m, day: d, hour: h, minute: mi, utcOffset: 8, timeMode: 'clock', ziHour, gender: 'M' });
    const p = r.pillars;
    const got = [p.year, p.month, p.day, p.hour].map(x => x.hanja).join(' ');
    check(`4주 sect${sect}`, got === want, `${y}-${m}-${d} ${h}:${mi} ${got} ≠ ${want}`);
    if (sect !== 1) continue;

    // 십성(천간), 12운성(일간 기준), 공망
    const gods = [ec.getYearShiShenGan(), ec.getMonthShiShenGan(), ec.getTimeShiShenGan()].map(x => SHISHEN[x]);
    check('십성', gods.join() === [p.year.stemTenGod, p.month.stemTenGod, p.hour.stemTenGod].join());
    const stages = [ec.getYearDiShi(), ec.getMonthDiShi(), ec.getDayDiShi(), ec.getTimeDiShi()].map(x => DISHI[x]);
    check('12운성', stages.join() === [p.year, p.month, p.day, p.hour].map(x => x.twelveStage).join(), `${stages} vs ${[p.year, p.month, p.day, p.hour].map(x => x.twelveStage)}`);
    check('공망', r.gongmang.hanja === ec.getDayXunKong(), `${r.gongmang.hanja} ≠ ${ec.getDayXunKong()}`);

    // 대운: 방향·간지 일치, 시작 연도 ±1
    for (const [g, gl] of [['M', 1], ['F', 0]]) {
      const rr = g === 'M' ? r : S.analyzeSaju({ year: y, month: m, day: d, hour: h, minute: mi, utcOffset: 8, timeMode: 'clock', gender: g });
      const yun = ec.getLunar().getEightChar().getYun(gl, 2);
      const dy = yun.getDaYun().slice(1, 9).map(x => x.getGanZhi()).join();
      check('대운 간지', dy === rr.daeun.list.slice(0, 8).map(x => x.hanja).join(), `${y}-${m}-${d} ${g} ${dy}`);
      check('대운 시작', Math.abs(yun.getStartSolar().getYear() - rr.daeun.list[0].startYear) <= 1,
        `${yun.getStartSolar().toYmd()} vs ${rr.daeun.startDate}`);
    }
  }
}

// 2) 한국 시간 이력: Intl(Asia/Seoul)과 비교
const intl = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', timeZoneName: 'longOffset' });
const intlOffset = (t) => { const m = intl.format(new Date(t)).match(/GMT([+-])(\d\d):(\d\d)/); return (m[1] === '+' ? 1 : -1) * (+m[2] * 60 + +m[3]); };
for (let i = 0; i < 3000; i++) {
  const t = Date.UTC(1909, 0, 1) + Math.random() * 120 * 365.25 * 86400000;
  check('KST 오프셋', S.koreaOffsetAt(t).offset === intlOffset(t), new Date(t).toISOString());
}

// 3) 알려진 사례
const eq = (name, got, want) => check(name, got === want, `${got} ≠ ${want}`);

// 2024 입춘 = 2024-02-04 17:27 KST
eq('입춘 직전', S.calcSaju(2024, 2, 4, 17, 26).year.text, '계묘');
eq('입춘 직후', S.calcSaju(2024, 2, 4, 17, 28).year.text, '갑진');

// 1987-07-01 10:00 (서머타임) → 표준시 09:00, 서울 진태양시 약 08:28
let r = S.analyzeSaju({ year: 1987, month: 7, day: 1, hour: 10, minute: 0, timeMode: 'standard' });
eq('서머타임 제거', r.birth.corrected, '1987-07-01 09:00');
eq('서머타임 시주', r.pillars.hour.branch, 5); // 사시
r = S.analyzeSaju({ year: 1987, month: 7, day: 1, hour: 10, minute: 0 });
eq('진태양시', r.birth.corrected, '1987-07-01 08:28');
eq('진태양시 시주', r.pillars.hour.branch, 4); // 진시

// 1958년(UTC+8:30) 서울 12:00 → 진태양시 11:58
r = S.analyzeSaju({ year: 1958, month: 1, day: 10, hour: 12, minute: 0 });
eq('8:30 시기', r.birth.corrected, '1958-01-10 11:58');

// 서울 00:10 → 진태양시 전날 23:38, 다음 날 일주 규칙이면 같은 날 일주 유지
r = S.analyzeSaju({ year: 2000, month: 1, day: 2, hour: 0, minute: 10 });
eq('자시 경계 일주', r.pillars.day.hanja, S.getIljin(2000, 1, 2).hanja);
eq('자시 경계 시지', r.pillars.hour.branch, 0);

// 음력 입력: 음력 2023-윤2-10 = 양력 2023-03-31
r = S.analyzeSaju({ year: 2023, month: 2, day: 10, isLeapMonth: true, calendar: 'lunar', hour: 12, minute: 0 });
eq('윤달 입력', `${r.birth.solarDate.month}-${r.birth.solarDate.day}`, '3-31');
eq('음력 역변환', r.lunar.isLeapMonth && r.lunar.month === 2 && r.lunar.day === 10, true);

// 시간 모름: 시주 없음
r = S.analyzeSaju({ year: 1990, month: 5, day: 15, hour: null, gender: 'F' });
eq('시간 모름', r.pillars.hour, null);
eq('시간 모름 신강약 계산', typeof r.strength.score, 'number');

// 일진: 2000-01-01 = 무오, 2024-01-01 = 갑자
eq('일진 2000', S.getIljin(2000, 1, 1).text, '무오');
eq('일진 2024', S.getIljin(2024, 1, 1).text, '갑자');

// 12운성, 12신살, 십성 기본값
eq('갑목 해 장생', S.twelveStage(0, 11), '장생');
eq('을목 오 장생', S.twelveStage(1, 6), '장생');
eq('경금 유 제왕', S.twelveStage(6, 9), '제왕');
eq('인오술 년 신 역마', S.sinsal12(2, 8), '역마살');
eq('신자진 년 유 도화', S.sinsal12(0, 9), '년살(도화)');
eq('해묘미 년 미 화개', S.sinsal12(3, 7), '화개살');
eq('갑 일간 경 편관', S.tenGod(0, 6), '편관');
eq('갑 일간 신 정관', S.tenGod(0, 7), '정관');
eq('계 일간 무 정관', S.tenGod(9, 4), '정관');

// 합충: 인오술 삼합, 자오충, 갑기합
const rel = S.findRelations([
  { label: '년', stem: 0, branch: 2 }, { label: '월', stem: 5, branch: 6 },
  { label: '일', stem: 2, branch: 10 }, { label: '시', stem: 8, branch: 0 },
]);
const names = rel.map(x => x.name);
check('삼합', names.includes('寅午戌 삼합火국'), names.join());
check('자오충', names.includes('午子충'), names.join());
check('갑기합', names.includes('甲己합土'), names.join());
check('병임충', names.includes('丙壬충'), names.join());

// 세운·월운
r = S.analyzeSaju({ year: 1990, month: 5, day: 15, hour: 10, minute: 30, gender: 'M' });
const seun = S.getSeun(r, 2024, 2026);
eq('세운 2024', seun[0].text, '갑진');
eq('세운 2026', seun[2].text, '병오');
const wol = S.getWolun(r, 2024);
eq('2024 인월', wol[0].text, '병인');
eq('2024 축월', wol[11].text, '정축');
eq('월운 절입', wol[0].startDate.slice(0, 10), '2024-02-04');
// 1990 경오년 → 인오술 → 삼재 申酉戌 (2028~2030)
eq('삼재', S.getSeun(r, 2028, 2028)[0].samjae, '들삼재');

// 궁합 실행
const other = S.analyzeSaju({ year: 1992, month: 11, day: 3, hour: 8, minute: 0, gender: 'F' });
check('궁합 점수', typeof S.compatibility(r, other).score === 'number');

console.log(`${total}건 중 실패 ${failed}건`);
process.exit(failed ? 1 : 0);
