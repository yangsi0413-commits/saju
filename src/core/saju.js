// 사주 엔진
// 절기 시각은 lunar-javascript(Solar/Lunar)를 사용. 라이브러리는 UTC+8(베이징) 기준 시각으로 동작한다.
// 내부적으로 천간은 0~9, 지지는 0~11, 오행은 0~4(목화토금수) 인덱스로 다룬다.

// ============================================================
// 1. 기본 상수
// ============================================================

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ELEMENTS = ['목', '화', '토', '금', '수'];
const ELEMENTS_HANJA = ['木', '火', '土', '金', '水'];
const YINYANG = ['양', '음'];
const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
// 화면 표시용(기존 호환)
const STEM_ELEMENT = STEM_EL.map(e => ELEMENTS[e]);
const BRANCH_ELEMENT = BRANCH_EL.map(e => ELEMENTS[e]);

// 지장간: [천간, 일수] 순서는 여기 → 중기 → 정기(마지막). 월률분야 30일 기준
const HIDDEN_STEMS = [
  [[8, 10], [9, 20]],          // 子: 임 계
  [[9, 9], [7, 3], [5, 18]],   // 丑: 계 신 기
  [[4, 7], [2, 7], [0, 16]],   // 寅: 무 병 갑
  [[0, 10], [1, 20]],          // 卯: 갑 을
  [[1, 9], [9, 3], [4, 18]],   // 辰: 을 계 무
  [[4, 7], [6, 7], [2, 16]],   // 巳: 무 경 병
  [[2, 10], [5, 9], [3, 11]],  // 午: 병 기 정
  [[3, 9], [1, 3], [5, 18]],   // 未: 정 을 기
  [[4, 7], [8, 7], [6, 16]],   // 申: 무 임 경
  [[6, 10], [7, 20]],          // 酉: 경 신
  [[7, 9], [3, 3], [4, 18]],   // 戌: 신 정 무
  [[4, 7], [0, 7], [8, 16]],   // 亥: 무 갑 임
];
const mainStem = (b) => HIDDEN_STEMS[b][HIDDEN_STEMS[b].length - 1][0];
const hiddenRole = (len, i) => (i === len - 1 ? '정기' : len === 3 && i === 1 ? '중기' : '여기');

// 납음오행: 60갑자 두 개씩 묶어 30개
const NAYIN = [
  ['해중금', '海中金'], ['노중화', '爐中火'], ['대림목', '大林木'], ['노방토', '路傍土'], ['검봉금', '劍鋒金'],
  ['산두화', '山頭火'], ['간하수', '澗下水'], ['성두토', '城頭土'], ['백랍금', '白蠟金'], ['양류목', '楊柳木'],
  ['천중수', '泉中水'], ['옥상토', '屋上土'], ['벽력화', '霹靂火'], ['송백목', '松柏木'], ['장류수', '長流水'],
  ['사중금', '沙中金'], ['산하화', '山下火'], ['평지목', '平地木'], ['벽상토', '壁上土'], ['금박금', '金箔金'],
  ['복등화', '覆燈火'], ['천하수', '天河水'], ['대역토', '大驛土'], ['차천금', '釵釧金'], ['상자목', '桑柘木'],
  ['대계수', '大溪水'], ['사중토', '沙中土'], ['천상화', '天上火'], ['석류목', '石榴木'], ['대해수', '大海水'],
];

// 월의 시작이 되는 12절(節) → 월지 인덱스
const JIE_TO_BRANCH = {
  '立春': 2, '惊蛰': 3, '清明': 4, '立夏': 5, '芒种': 6, '小暑': 7,
  '立秋': 8, '白露': 9, '寒露': 10, '立冬': 11, '大雪': 0, '小寒': 1,
};
const JIEQI_KO = {
  '立春': '입춘', '惊蛰': '경칩', '清明': '청명', '立夏': '입하', '芒种': '망종', '小暑': '소서',
  '立秋': '입추', '白露': '백로', '寒露': '한로', '立冬': '입동', '大雪': '대설', '小寒': '소한',
};

// 일간 물상, 십성 키워드 (해석 화면용 짧은 설명)
const STEM_NATURE = [
  '큰 나무 — 곧고 위로 뻗는 성장, 추진력', '풀·덩굴 — 유연함, 적응력, 끈기',
  '태양 — 밝고 열정적, 드러냄', '촛불·등불 — 섬세한 따뜻함, 집중, 헌신',
  '큰 산 — 묵직함, 신뢰, 포용', '논밭 — 기르고 가꿈, 실속, 세심함',
  '바위·무쇠 — 결단, 의리, 강직함', '보석·칼날 — 예리함, 완벽주의, 자존심',
  '바다·큰 강 — 지혜, 포용, 활동성', '비·이슬 — 총명함, 감수성, 스며듦',
];
const TEN_GOD_KEYWORDS = {
  비견: '자립, 동료, 주체성', 겁재: '경쟁, 승부욕, 재물 분산',
  식신: '표현, 여유, 먹을 복, 재능', 상관: '창의, 언변, 기존 질서에 대한 반발',
  편재: '유동 재물, 사업, 활동 무대', 정재: '고정 재물, 성실, 관리',
  편관: '권위, 압박, 추진력, 위기 돌파', 정관: '명예, 규범, 직장, 책임',
  편인: '직관, 특수 학문, 고독', 정인: '학문, 보호, 문서, 어머니',
};

const mod = (n, m) => ((n % m) + m) % m;
const ganzhiIndex = (s, b) => mod(6 * s - 5 * b, 60);
const ganzhiText = (idx) => STEMS[idx % 10] + BRANCHES[idx % 12];
const ganzhiHanja = (idx) => STEMS_HANJA[idx % 10] + BRANCHES_HANJA[idx % 12];

// ============================================================
// 2. 시간 처리: 한국 표준시 변천, 서머타임, 진태양시
// ============================================================

// Asia/Seoul 전환표: [전환 시점(UTC), 새 UTC 오프셋(분), 서머타임 여부]. 1908년 이전은 서울 지방시(8:27:52)
const KR_TZ = [
  ['1908-03-31T15:32:08Z', 510, 0], ['1911-12-31T15:30Z', 540, 0],
  ['1948-05-31T15:00Z', 600, 1], ['1948-09-12T14:00Z', 540, 0],
  ['1949-04-02T15:00Z', 600, 1], ['1949-09-10T14:00Z', 540, 0],
  ['1950-03-31T15:00Z', 600, 1], ['1950-09-09T14:00Z', 540, 0],
  ['1951-05-05T15:00Z', 600, 1], ['1951-09-08T14:00Z', 540, 0],
  ['1954-03-20T15:00Z', 510, 0],
  ['1955-05-04T15:30Z', 570, 1], ['1955-09-08T14:30Z', 510, 0],
  ['1956-05-19T15:30Z', 570, 1], ['1956-09-29T14:30Z', 510, 0],
  ['1957-05-04T15:30Z', 570, 1], ['1957-09-21T14:30Z', 510, 0],
  ['1958-05-03T15:30Z', 570, 1], ['1958-09-20T14:30Z', 510, 0],
  ['1959-05-02T15:30Z', 570, 1], ['1959-09-19T14:30Z', 510, 0],
  ['1960-04-30T15:30Z', 570, 1], ['1960-09-17T14:30Z', 510, 0],
  ['1961-08-09T15:30Z', 540, 0],
  ['1987-05-09T17:00Z', 600, 1], ['1987-10-10T17:00Z', 540, 0],
  ['1988-05-07T17:00Z', 600, 1], ['1988-10-08T17:00Z', 540, 0],
].map(([t, off, dst]) => [Date.parse(t), off, dst]);

// 특정 시점(UTC ms)의 한국 오프셋
function koreaOffsetAt(instant) {
  let cur = [0, 507 + 52 / 60, 0];
  for (const e of KR_TZ) { if (instant >= e[0]) cur = e; else break; }
  return { offset: cur[1], dst: !!cur[2] };
}

// 한국 벽시계 시각 → 실제 시점. 서머타임 시작 직후의 없는 시각은 이전 오프셋으로 해석한다
function koreaLocalToInstant(localMs) {
  const o1 = koreaOffsetAt(localMs - 540 * 60000).offset;
  for (const o of [o1, koreaOffsetAt(localMs - o1 * 60000).offset]) {
    if (koreaOffsetAt(localMs - o * 60000).offset === o) return localMs - o * 60000;
  }
  return localMs - o1 * 60000;
}

// 균시차(분): 진태양시 - 평균태양시
function equationOfTime(instant) {
  const d = new Date(instant);
  const n = (instant - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1;
  const b = 2 * Math.PI * (n - 81) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

// ms(벽시계 형태, UTC 필드로 읽음) → 'YYYY-MM-DD HH:mm'
function fmt(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// lunar-javascript Solar(베이징 시각) → UTC ms
const solarToInstant = (s) =>
  Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) - 8 * 3600000;

function lunarAt(instant) {
  const bj = new Date(instant + 8 * 3600000);
  return Solar.fromYmdHms(bj.getUTCFullYear(), bj.getUTCMonth() + 1, bj.getUTCDate(),
    bj.getUTCHours(), bj.getUTCMinutes(), bj.getUTCSeconds()).getLunar();
}

/*
 * 출생 시각 해석
 * timeMode
 *  - 'solar'    (기본) 출생지 경도로 평균태양시 보정. 서울(127.0°)이면 약 -32분. equationOfTime: true면 균시차까지 반영
 *  - 'standard' 서머타임만 제거한 표준시
 *  - 'clock'    입력한 시계 시각 그대로
 * utcOffset(시간 단위)을 주면 한국 시간 이력 대신 그 오프셋을 쓴다(해외 출생, 검증용)
 */
function resolveBirthTime(o) {
  let { year, month, day } = o;
  if (o.calendar === 'lunar') {
    const s = Lunar.fromYmd(year, o.isLeapMonth ? -month : month, day).getSolar();
    [year, month, day] = [s.getYear(), s.getMonth(), s.getDay()];
  }
  const hourKnown = o.hour != null && o.hour !== '';
  const hour = hourKnown ? Number(o.hour) : 12;
  const minute = hourKnown ? Number(o.minute || 0) : 0;
  const localMs = Date.UTC(year, month - 1, day, hour, minute);

  let instant, offset, dst;
  if (o.utcOffset != null) {
    offset = o.utcOffset * 60; dst = false;
    instant = localMs - offset * 60000;
  } else {
    instant = koreaLocalToInstant(localMs);
    ({ offset, dst } = koreaOffsetAt(instant));
  }

  const mode = o.timeMode || 'solar';
  const longitude = o.longitude ?? 127.0;
  let effMs;
  if (mode === 'clock') effMs = localMs;
  else if (mode === 'standard') effMs = localMs - (dst ? 60 : 0) * 60000;
  else effMs = instant + longitude * 4 * 60000 + (o.equationOfTime ? equationOfTime(instant) * 60000 : 0);

  return {
    solarDate: { year, month, day },
    hourKnown,
    instant,
    utcOffsetMin: offset,
    dst,
    timeMode: mode,
    longitude: mode === 'solar' ? longitude : null,
    clockText: fmt(localMs),
    effectiveText: fmt(effMs),
    correctionMin: Math.round((effMs - localMs) / 60000),
    effMs,
  };
}

// ============================================================
// 3. 4주 계산
// ============================================================

function pillar(stem, branch) {
  const idx = ganzhiIndex(stem, branch);
  return {
    stem, branch, idx,
    text: STEMS[stem] + BRANCHES[branch],
    hanja: STEMS_HANJA[stem] + BRANCHES_HANJA[branch],
    stemElement: STEM_ELEMENT[stem],
    branchElement: BRANCH_ELEMENT[branch],
    stemYinYang: YINYANG[stem % 2],
    branchYinYang: YINYANG[branch % 2],
    nayin: NAYIN[idx >> 1][0],
    nayinHanja: NAYIN[idx >> 1][1],
  };
}

// 연간에서 월간: 인월 천간 = 연간%5*2+2
const monthStemOf = (yearStem, monthBranch) => mod((yearStem % 5) * 2 + 2 + mod(monthBranch - 2, 12), 10);
// 일간에서 시간: 자시 천간 = 일간%5*2
const hourStemOf = (dayStem, hourBranch) => mod((dayStem % 5) * 2 + hourBranch, 10);
// 2000-01-01 = 무오(60갑자 54번)
const dayIndexOf = (y, m, d) => mod(54 + Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000), 60);

/*
 * ziHour: 'next'(기본) 23시부터 다음 날 일주 / 'split' 야자시 — 23~24시는 당일 일주에 다음 날 자시
 */
function calcPillars(t, ziHour = 'next') {
  // 1) 연주·월주: 실제 시점과 절기 비교
  const lunar = lunarAt(t.instant);
  const prevJie = lunar.getPrevJie(false);
  const nextJie = lunar.getNextJie(false);
  const monthBranch = JIE_TO_BRANCH[prevJie.getName()];

  const bj = new Date(t.instant + 8 * 3600000);
  let sajuYear = bj.getUTCFullYear();
  if (bj.getUTCMonth() + 1 <= 2 && (prevJie.getName() === '大雪' || prevJie.getName() === '小寒')) sajuYear -= 1;
  const yearIdx = mod(sajuYear - 4, 60);
  const yearStem = yearIdx % 10;
  const yearBranch = yearIdx % 12;
  const monthStem = monthStemOf(yearStem, monthBranch);

  // 2) 일주·시주: 보정된 현지 시각 기준
  const e = new Date(t.effMs);
  const [ey, em, ed, eh] = [e.getUTCFullYear(), e.getUTCMonth() + 1, e.getUTCDate(), e.getUTCHours()];
  let dayIdx = dayIndexOf(ey, em, ed);
  let hour = null;
  if (t.hourKnown) {
    const hourBranch = Math.floor((eh + 1) / 2) % 12;
    if (eh >= 23 && ziHour === 'next') dayIdx = mod(dayIdx + 1, 60);
    // 야자시: 일주는 그대로, 시간은 다음 날 일간 기준
    const stemBase = eh >= 23 && ziHour === 'split' ? (dayIdx + 1) % 10 : dayIdx % 10;
    hour = pillar(hourStemOf(stemBase, hourBranch), hourBranch);
  }

  return {
    year: pillar(yearStem, yearBranch),
    month: pillar(monthStem, monthBranch),
    day: pillar(dayIdx % 10, dayIdx % 12),
    hour,
    sajuYear,
    prevJie: { name: JIEQI_KO[prevJie.getName()], instant: solarToInstant(prevJie.getSolar()) },
    nextJie: { name: JIEQI_KO[nextJie.getName()], instant: solarToInstant(nextJie.getSolar()) },
    lunar,
  };
}

// 기존 호환: 시계 시각 그대로, tz(시간) 오프셋
function calcSaju(year, month, day, hour, minute, tz = 9) {
  const t = resolveBirthTime({ year, month, day, hour, minute, utcOffset: tz, timeMode: 'clock' });
  const p = calcPillars(t);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour };
}

// ============================================================
// 4. 십성, 12운성
// ============================================================

const TEN_GODS = [['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인']];
const TEN_GOD_GROUPS = ['비겁', '식상', '재성', '관성', '인성'];

// 일간 기준 대상 천간의 관계: 0 비겁, 1 식상(내가 생), 2 재성(내가 극), 3 관성(나를 극), 4 인성(나를 생)
const relationOf = (dayStem, stem) => mod(STEM_EL[stem] - STEM_EL[dayStem], 5);
const tenGod = (dayStem, stem) => TEN_GODS[relationOf(dayStem, stem)][dayStem % 2 === stem % 2 ? 0 : 1];
// 지지 십성은 정기 기준
const tenGodOfBranch = (dayStem, branch) => tenGod(dayStem, mainStem(branch));
// 일간 오행에서 관계 r에 해당하는 오행
const elementOfRelation = (dayStem, r) => (STEM_EL[dayStem] + r) % 5;

const TWELVE_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
// 장생지: 양간 순행, 음간 역행
const JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
const twelveStage = (stem, branch) =>
  TWELVE_STAGES[stem % 2 === 0 ? mod(branch - JANGSAENG[stem], 12) : mod(JANGSAENG[stem] - branch, 12)];

// ============================================================
// 5. 신살
// ============================================================

const SINSAL12 = ['지살', '년살(도화)', '월살', '망신살', '장성살', '반안살', '역마살', '육해살', '화개살', '겁살', '재살', '천살'];
// 삼합 그룹의 지살(생지): 申子辰→申, 巳酉丑→巳, 寅午戌→寅, 亥卯未→亥
const jisalOf = (b) => [8, 5, 2, 11][b % 4];
const sinsal12 = (base, target) => SINSAL12[mod(target - jisalOf(base), 12)];

const CHEONEUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
const GEONROK = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
const YANGIN = [3, null, 6, null, 6, null, 9, null, 0, null];
const HONGYEOM = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];
const GEUMYEO = [4, 5, 7, 8, 7, 8, 10, 11, 1, 2];
// 천덕귀인(월지 기준): ['s', 천간] 또는 ['b', 지지]
const CHEONDEOK = [['b', 5], ['s', 6], ['s', 3], ['b', 8], ['s', 8], ['s', 7], ['b', 11], ['s', 0], ['s', 9], ['b', 2], ['s', 2], ['s', 1]];
// 월덕귀인(월지 삼합): 申子辰→壬, 巳酉丑→庚, 寅午戌→丙, 亥卯未→甲
const WOLDEOK = [8, 6, 2, 0];
const BAEKHO = ['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'];
const GOEGANG = ['庚辰', '庚戌', '壬辰', '壬戌', '戊戌'];
const pairIn = (list, a, b) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
const GWIMUN = [[0, 9], [1, 6], [2, 7], [3, 8], [4, 11], [5, 10]];

// 공망: 일주가 속한 순(旬)에서 빠진 두 지지
function gongmangOf(idx) {
  const b0 = mod(idx - (idx % 10), 12);
  return [(b0 + 10) % 12, (b0 + 11) % 12];
}

const POS_LABEL = { year: '년', month: '월', day: '일', hour: '시' };

function findSinsal(pillars) {
  const pos = Object.keys(pillars).filter(k => pillars[k]);
  const ds = pillars.day.stem, ys = pillars.year.stem, mb = pillars.month.branch;
  const out = [];
  const add = (name, where, basis) => { if (where.length) out.push({ name, positions: where.map(k => POS_LABEL[k]), basis }); };
  const branchesAt = (cond) => pos.filter(k => cond(pillars[k].branch, k));
  const stemsAt = (cond) => pos.filter(k => cond(pillars[k].stem, k));

  add('천을귀인', branchesAt(b => CHEONEUL[ds].includes(b)), '일간');
  add('천을귀인', branchesAt(b => CHEONEUL[ys].includes(b)), '년간');
  add('문창귀인', branchesAt(b => b === MUNCHANG[ds]), '일간');
  add('학당귀인', branchesAt(b => b === JANGSAENG[ds]), '일간');
  add('건록', branchesAt(b => b === GEONROK[ds]), '일간');
  if (YANGIN[ds] != null) add('양인살', branchesAt(b => b === YANGIN[ds]), '일간');
  add('홍염살', branchesAt(b => b === HONGYEOM[ds]), '일간');
  add('금여록', branchesAt(b => b === GEUMYEO[ds]), '일간');

  const [cdType, cdVal] = CHEONDEOK[mb];
  add('천덕귀인', cdType === 's' ? stemsAt(s => s === cdVal) : branchesAt(b => b === cdVal), '월지');
  add('월덕귀인', stemsAt(s => s === WOLDEOK[mb % 4]), '월지');

  add('백호대살', pos.filter(k => BAEKHO.includes(pillars[k].hanja)), '간지');
  add('괴강살', pos.filter(k => GOEGANG.includes(pillars[k].hanja)), '간지');

  // 현침살: 甲 辛 卯 午 申 未 글자
  const hc = [];
  for (const k of pos) {
    if ([0, 7].includes(pillars[k].stem)) hc.push(POS_LABEL[k] + '간');
    if ([3, 6, 7, 8].includes(pillars[k].branch)) hc.push(POS_LABEL[k] + '지');
  }
  if (hc.length) out.push({ name: '현침살', positions: hc, basis: '글자' });

  // 지지 쌍으로 성립하는 살
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
    const a = pillars[pos[i]].branch, b = pillars[pos[j]].branch;
    if (pairIn(GWIMUN, a, b)) out.push({ name: '귀문관살', positions: [POS_LABEL[pos[i]], POS_LABEL[pos[j]]], basis: '지지' });
  }

  // 공망
  const gm = gongmangOf(pillars.day.idx);
  add('공망', branchesAt((b, k) => k !== 'day' && gm.includes(b)), '일주');
  return out;
}

// ============================================================
// 6. 합·충·형·파·해
// ============================================================

const STEM_HAP_EL = [2, 3, 4, 0, 1]; // 甲己土 乙庚金 丙辛水 丁壬木 戊癸火
const YUKHAP_EL = { 0: 2, 2: 0, 3: 1, 4: 3, 5: 4, 6: 1 }; // 子丑土 寅亥木 卯戌火 辰酉金 巳申水 午未火
const PA = [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10]];
const HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const HYEONG_PAIRS = [[2, 5, '무은지형'], [5, 8, '무은지형'], [2, 8, '무은지형'],
  [1, 10, '지세지형'], [10, 7, '지세지형'], [1, 7, '지세지형'], [0, 3, '무례지형']];
const SELF_HYEONG = [4, 6, 9, 11]; // 辰午酉亥
// [생지, 왕지, 고지], 오행
const SAMHAP = [[[8, 0, 4], 4], [[11, 3, 7], 0], [[2, 6, 10], 1], [[5, 9, 1], 3]];
const BANGHAP = [[[2, 3, 4], 0], [[5, 6, 7], 1], [[8, 9, 10], 3], [[11, 0, 1], 4]];
const SAMHYEONG = [[[2, 5, 8], '인사신 삼형(무은지형)'], [[1, 10, 7], '축술미 삼형(지세지형)']];

/*
 * items: [{ label, stem?, branch? }] — 원국 4주 + (선택) 대운·세운 기둥
 * 반환: [{ type, name, members: [label…], element? }]
 */
function findRelations(items) {
  const out = [];
  const stems = items.filter(it => it.stem != null);
  const branches = items.filter(it => it.branch != null);

  for (let i = 0; i < stems.length; i++) for (let j = i + 1; j < stems.length; j++) {
    const a = stems[i].stem, b = stems[j].stem, m = [stems[i].label + '간', stems[j].label + '간'];
    const pair = STEMS_HANJA[a] + STEMS_HANJA[b];
    if (Math.abs(a - b) === 5) out.push({ type: '천간합', name: pair + '합' + ELEMENTS_HANJA[STEM_HAP_EL[Math.min(a, b)]], members: m, element: ELEMENTS[STEM_HAP_EL[Math.min(a, b)]] });
    if (Math.abs(a - b) === 6) out.push({ type: '천간충', name: pair + '충', members: m });
  }

  for (let i = 0; i < branches.length; i++) for (let j = i + 1; j < branches.length; j++) {
    const a = branches[i].branch, b = branches[j].branch, m = [branches[i].label + '지', branches[j].label + '지'];
    const pair = BRANCHES_HANJA[a] + BRANCHES_HANJA[b];
    if ((a + b) % 12 === 1) out.push({ type: '육합', name: pair + '합' + ELEMENTS_HANJA[YUKHAP_EL[Math.min(a, b)]], members: m, element: ELEMENTS[YUKHAP_EL[Math.min(a, b)]] });
    if (Math.abs(a - b) === 6) out.push({ type: '충', name: pair + '충', members: m });
    const hy = HYEONG_PAIRS.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (hy) out.push({ type: '형', name: pair + '형(' + hy[2] + ')', members: m });
    if (a === b && SELF_HYEONG.includes(a)) out.push({ type: '형', name: pair + ' 자형', members: m });
    if (pairIn(PA, a, b)) out.push({ type: '파', name: pair + '파', members: m });
    if (pairIn(HAE, a, b)) out.push({ type: '해', name: pair + '해', members: m });
    if (pairIn(WONJIN, a, b)) out.push({ type: '원진', name: pair + '원진', members: m });
  }

  const holders = (b) => branches.filter(it => it.branch === b).map(it => it.label + '지');
  const triad = (group) => group.map(holders);

  for (const [group, el] of SAMHAP) {
    const h = triad(group);
    const name = group.map(b => BRANCHES_HANJA[b]).join('');
    if (h.every(x => x.length)) {
      out.push({ type: '삼합', name: name + ' 삼합' + ELEMENTS_HANJA[el] + '국', members: h.flat(), element: ELEMENTS[el] });
    } else if (h[1].length && (h[0].length || h[2].length)) {
      const other = h[0].length ? 0 : 2;
      out.push({ type: '반합', name: BRANCHES_HANJA[group[Math.min(1, other)]] + BRANCHES_HANJA[group[Math.max(1, other)]] + ' 반합' + ELEMENTS_HANJA[el], members: [...h[other], ...h[1]], element: ELEMENTS[el] });
    } else if (h[0].length && h[2].length) {
      out.push({ type: '반합', name: BRANCHES_HANJA[group[0]] + BRANCHES_HANJA[group[2]] + ' 공협(왕지 없음)' + ELEMENTS_HANJA[el], members: [...h[0], ...h[2]], element: ELEMENTS[el], weak: true });
    }
  }
  for (const [group, el] of BANGHAP) {
    const h = triad(group);
    if (h.every(x => x.length)) out.push({ type: '방합', name: group.map(b => BRANCHES_HANJA[b]).join('') + ' 방합' + ELEMENTS_HANJA[el], members: h.flat(), element: ELEMENTS[el] });
  }
  for (const [group, name] of SAMHYEONG) {
    const h = triad(group);
    if (h.every(x => x.length)) out.push({ type: '삼형', name, members: h.flat() });
  }
  return out;
}

const natalItems = (pillars) => Object.keys(POS_LABEL).filter(k => pillars[k])
  .map(k => ({ label: POS_LABEL[k], stem: pillars[k].stem, branch: pillars[k].branch }));

// 운 기둥과 원국 사이의 관계만 추린다
function relationsWithLuck(pillars, luck, label) {
  return findRelations([...natalItems(pillars), { label, stem: luck.stem, branch: luck.branch }])
    .filter(r => r.members.some(m => m.startsWith(label)));
}

// ============================================================
// 7. 오행 분포, 신강·신약, 격국, 용신
// ============================================================

// 신강약 가중치(일간 제외 합 100). 시주를 모르면 나머지로 다시 100에 맞춘다
const POS_WEIGHT = { year: [10, 10], month: [10, 30], day: [0, 15], hour: [10, 15] };

function analyzeElements(pillars) {
  const count = [0, 0, 0, 0, 0];
  const score = [0, 0, 0, 0, 0];
  for (const k of Object.keys(POS_LABEL)) {
    const p = pillars[k];
    if (!p) continue;
    count[STEM_EL[p.stem]]++;
    count[BRANCH_EL[p.branch]]++;
    const [ws, wb] = POS_WEIGHT[k];
    score[STEM_EL[p.stem]] += k === 'day' ? 10 : ws;
    for (const [s, days] of HIDDEN_STEMS[p.branch]) score[STEM_EL[s]] += wb * days / 30;
  }
  const total = score.reduce((a, b) => a + b, 0);
  const percent = score.map(v => Math.round(v / total * 1000) / 10);
  return {
    count: Object.fromEntries(ELEMENTS.map((e, i) => [e, count[i]])),
    percent: Object.fromEntries(ELEMENTS.map((e, i) => [e, percent[i]])),
    missing: ELEMENTS.filter((_, i) => count[i] === 0),
    excess: ELEMENTS.filter((_, i) => count[i] >= 3),
  };
}

function analyzeStrength(pillars) {
  const ds = pillars.day.stem;
  const group = [0, 0, 0, 0, 0];
  let total = 0;
  for (const k of Object.keys(POS_LABEL)) {
    const p = pillars[k];
    if (!p) continue;
    const [ws, wb] = POS_WEIGHT[k];
    if (k !== 'day') group[relationOf(ds, p.stem)] += ws;
    for (const [s, days] of HIDDEN_STEMS[p.branch]) group[relationOf(ds, s)] += wb * days / 30;
    total += ws + wb;
  }
  const g = group.map(v => v / total * 100);
  const support = g[0] + g[4];
  const isSupport = (r) => r === 0 || r === 4;

  const deukryeong = isSupport(relationOf(ds, mainStem(pillars.month.branch)));
  const deukji = isSupport(relationOf(ds, mainStem(pillars.day.branch)));
  const others = [];
  for (const k of Object.keys(POS_LABEL)) {
    const p = pillars[k];
    if (!p) continue;
    if (k !== 'day') others.push(relationOf(ds, p.stem));
    if (k !== 'month' && k !== 'day') others.push(relationOf(ds, mainStem(p.branch)));
  }
  const deukse = others.filter(isSupport).length * 2 >= others.length;

  const level = support >= 80 ? '극신강' : support >= 58 ? '신강' : support >= 50 ? '중화신강'
    : support >= 42 ? '중화신약' : support >= 20 ? '신약' : '극신약';
  return {
    score: Math.round(support * 10) / 10,
    level,
    strong: support >= 50,
    deukryeong, deukji, deukse,
    groups: Object.fromEntries(TEN_GOD_GROUPS.map((n, i) => [n, Math.round(g[i] * 10) / 10])),
  };
}

// 격국(내격): 월지 지장간 중 천간에 투출한 것(정기>중기>여기, 비겁 투출은 제외), 없으면 정기
function analyzeGyeokguk(pillars) {
  const ds = pillars.day.stem, mb = pillars.month.branch;
  const visible = ['year', 'month', 'hour'].filter(k => pillars[k]).map(k => pillars[k].stem);
  const hidden = HIDDEN_STEMS[mb].map(([s]) => s).reverse();
  const tou = hidden.find(s => visible.includes(s) && relationOf(ds, s) !== 0);
  const base = tou ?? hidden[0];
  const god = tenGod(ds, base);
  let name = god === '편관' ? '편관격(칠살격)' : god + '격';
  if (god === '비견' || god === '겁재') {
    if (mb === GEONROK[ds]) name = '건록격';
    else if (mb === YANGIN[ds]) name = '양인격';
    else name = '월겁격';
  }
  return { name, tenGod: god, baseStem: STEMS[base], transparent: tou != null };
}

// 용신: 억부법 기본 + 조후 보조. 해석 학파마다 다르므로 참고용
function analyzeYongsin(pillars, strength, elements) {
  const ds = pillars.day.stem;
  const g = strength.groups;
  let r, reason;
  if (strength.strong) {
    if (g.인성 > g.비겁) { r = 2; reason = '인성이 많아 신강 → 재성으로 인성을 제어'; }
    else if (g.관성 > 0 || g.식상 === 0) { r = 3; reason = '비겁이 많아 신강 → 관성으로 비겁을 제어'; }
    else { r = 1; reason = '비겁이 많아 신강, 관성이 없음 → 식상으로 기운을 설기'; }
  } else {
    const enemy = [['식상', 1], ['재성', 2], ['관성', 3]].sort((a, b) => g[b[0]] - g[a[0]])[0];
    if (enemy[0] === '재성') { r = 0; reason = '재성이 많아 신약 → 비겁으로 재성을 감당'; }
    else if (enemy[0] === '관성') { r = 4; reason = '관성이 많아 신약 → 인성으로 관을 흡수(살인상생)'; }
    else { r = 4; reason = '식상이 많아 신약 → 인성으로 식상을 제어하고 일간을 생조'; }
  }
  const y = elementOfRelation(ds, r);
  const yongsin = ELEMENTS[y];
  const huisin = ELEMENTS[mod(y - 1, 5)];  // 용신을 생하는 오행
  const gisin = ELEMENTS[mod(y - 2, 5)];   // 용신을 극하는 오행
  const gusin = ELEMENTS[mod(y - 3, 5)];   // 기신을 생하는 오행
  const hansin = ELEMENTS[mod(y + 1, 5)];

  // 조후: 여름(巳午未)은 수, 겨울(亥子丑)은 화가 필요
  const mb = pillars.month.branch;
  let johu = null;
  if ([5, 6, 7].includes(mb)) johu = { need: '수', reason: '여름 생 — 더위를 식힐 수(水)가 필요', present: elements.count.수 > 0 };
  else if ([11, 0, 1].includes(mb)) johu = { need: '화', reason: '겨울 생 — 추위를 녹일 화(火)가 필요', present: elements.count.화 > 0 };

  const notes = [];
  if (strength.level === '극신강' || strength.level === '극신약') {
    notes.push('한쪽으로 크게 치우친 사주 — 종격(從格) 여부를 검토할 필요가 있으며, 종격이면 용신이 반대로 잡힐 수 있음');
  }
  return { method: '억부', yongsin, huisin, gisin, gusin, hansin, tenGodGroup: TEN_GOD_GROUPS[r], reason, johu, notes };
}

// ============================================================
// 8. 대운·세운·월운·일진
// ============================================================

// 순행: 양년 남자·음년 여자. 3일 = 1년(1일 = 4개월)
function calcDaeun(p, t, gender, count = 10) {
  const male = gender === 'M' || gender === '남';
  const forward = (p.year.stem % 2 === 0) === male;
  const diffMs = Math.abs((forward ? p.nextJie.instant : p.prevJie.instant) - t.instant);
  const days = diffMs / 86400000;
  const daeunNum = Math.max(1, Math.round(days / 3));
  const startMs = t.instant + diffMs * 120;
  const startDate = new Date(startMs + 9 * 3600000);
  const list = [];
  for (let i = 1; i <= count; i++) {
    const idx = mod(p.month.idx + (forward ? i : -i), 60);
    const lp = pillar(idx % 10, idx % 12);
    list.push({
      ...lp,
      order: i,
      age: daeunNum + 10 * (i - 1),
      startYear: startDate.getUTCFullYear() + 10 * (i - 1),
      ...luckDetail(p, lp, '대운'),
    });
  }
  return {
    forward,
    direction: forward ? '순행' : '역행',
    daysToJie: Math.round(days * 100) / 100,
    daeunNum,
    startAgeExact: Math.round(days / 3 * 100) / 100,
    startDate: fmt(startMs + 9 * 3600000).slice(0, 10),
    list,
  };
}

function luckDetail(natal, lp, label) {
  const ds = natal.day.stem;
  return {
    stemTenGod: tenGod(ds, lp.stem),
    branchTenGod: tenGodOfBranch(ds, lp.branch),
    twelveStage: twelveStage(ds, lp.branch),
    sinsal12: sinsal12(natal.year.branch, lp.branch),
    relations: relationsWithLuck(natal, lp, label),
  };
}

// 삼재: 년지 삼합의 다음 방합 3년(들·눌·날)
function samjaeOf(birthYearBranch, branch) {
  const start = [2, 11, 8, 5][birthYearBranch % 4]; // 申子辰→寅, 巳酉丑→亥, 寅午戌→申, 亥卯未→巳
  const k = mod(branch - start, 12);
  return k < 3 ? ['들삼재', '눌삼재', '날삼재'][k] : null;
}

function getSeun(saju, fromYear, toYear) {
  const out = [];
  for (let y = fromYear; y <= toYear; y++) {
    const idx = mod(y - 4, 60);
    const lp = pillar(idx % 10, idx % 12);
    out.push({
      year: y,
      ...lp,
      age: y - saju.birth.solarDate.year + 1,
      manAge: y - saju.birth.solarDate.year,
      samjae: samjaeOf(saju.pillars.year.branch, lp.branch),
      ...luckDetail(saju.pillars, lp, '세운'),
    });
  }
  return out;
}

// 월운: 해당 연도 인월(입춘)~축월(다음 해 소한)
function getWolun(saju, year) {
  const yearStem = mod(year - 4, 10);
  const out = [];
  for (let i = 0; i < 12; i++) {
    const branch = (2 + i) % 12;
    const lp = pillar(monthStemOf(yearStem, branch), branch);
    const gy = i < 11 ? year : year + 1;
    const gm = i < 11 ? i + 2 : 1;
    const jie = Solar.fromYmd(gy, gm, 15).getLunar().getPrevJie(false);
    out.push({
      ...lp,
      jie: JIEQI_KO[jie.getName()],
      startDate: fmt(solarToInstant(jie.getSolar()) + 9 * 3600000),
      ...luckDetail(saju.pillars, lp, '월운'),
    });
  }
  return out;
}

// 일진(그날의 간지). saju를 주면 원국 대비 십성·관계까지
function getIljin(y, m, d, saju) {
  const idx = dayIndexOf(y, m, d);
  const lp = pillar(idx % 10, idx % 12);
  return saju ? { date: `${y}-${m}-${d}`, ...lp, ...luckDetail(saju.pillars, lp, '일진') } : { date: `${y}-${m}-${d}`, ...lp };
}

function currentDaeun(saju, year) {
  const list = saju.daeun.list;
  let cur = null;
  for (const d of list) if (d.startYear <= year) cur = d;
  return cur;
}

// ============================================================
// 9. 종합 분석
// ============================================================

/*
 * input: {
 *   name, gender: 'M' | 'F',
 *   year, month, day, hour(모르면 null), minute,
 *   calendar: 'solar' | 'lunar', isLeapMonth,
 *   timeMode: 'solar' | 'standard' | 'clock', longitude(기본 127.0), equationOfTime,
 *   ziHour: 'next' | 'split', utcOffset
 * }
 */
function analyzeSaju(input) {
  const t = resolveBirthTime(input);
  const p = calcPillars(t, input.ziHour);
  const pillars = { year: p.year, month: p.month, day: p.day, hour: p.hour };
  const ds = p.day.stem;

  for (const k of Object.keys(POS_LABEL)) {
    const pl = pillars[k];
    if (!pl) continue;
    const hs = HIDDEN_STEMS[pl.branch];
    Object.assign(pl, {
      position: POS_LABEL[k] + '주',
      stemTenGod: k === 'day' ? '일간' : tenGod(ds, pl.stem),
      branchTenGod: tenGodOfBranch(ds, pl.branch),
      hiddenStems: hs.map(([s, days], i) => ({
        stem: s, text: STEMS[s], hanja: STEMS_HANJA[s], days,
        role: hiddenRole(hs.length, i), tenGod: tenGod(ds, s),
      })),
      twelveStage: twelveStage(ds, pl.branch),   // 일간 기준(봉법)
      selfStage: twelveStage(pl.stem, pl.branch), // 각 기둥 천간 기준(좌법)
      sinsal12: { byYear: sinsal12(p.year.branch, pl.branch), byDay: sinsal12(p.day.branch, pl.branch) },
    });
  }

  // 사령: 절입 후 경과일로 월지 지장간 중 당령한 천간
  const elapsed = (t.instant - p.prevJie.instant) / 86400000;
  const mh = HIDDEN_STEMS[p.month.branch];
  let acc = 0, saryeong = mh[mh.length - 1][0];
  for (const [s, days] of mh) {
    acc += days;
    if (elapsed < acc) { saryeong = s; break; }
  }

  const tenGodCount = Object.fromEntries([...TEN_GODS.flat()].map(n => [n, 0]));
  for (const k of Object.keys(POS_LABEL)) {
    const pl = pillars[k];
    if (!pl) continue;
    if (k !== 'day') tenGodCount[pl.stemTenGod]++;
    tenGodCount[pl.branchTenGod]++;
  }

  const lunar = Solar.fromYmd(t.solarDate.year, t.solarDate.month, t.solarDate.day).getLunar();
  const elements = analyzeElements(pillars);
  const strength = analyzeStrength(pillars);
  const gm = gongmangOf(p.day.idx);

  const result = {
    name: input.name,
    calendar: input.calendar === 'lunar' ? 'lunar' : 'solar',   // 입력한 달력 (궁합 보정 식별에 사용)
    gender: input.gender,
    birth: {
      solarDate: t.solarDate,
      clock: t.clockText,
      corrected: t.effectiveText,
      correctionMin: t.correctionMin,
      timeMode: t.timeMode,
      longitude: t.longitude,
      utcOffset: `UTC${t.utcOffsetMin >= 0 ? '+' : '-'}${Math.floor(Math.abs(t.utcOffsetMin) / 60)}:${String(Math.round(Math.abs(t.utcOffsetMin) % 60)).padStart(2, '0')}`,
      dst: t.dst,
      hourKnown: t.hourKnown,
      instant: new Date(t.instant).toISOString(),
    },
    lunar: {
      year: lunar.getYear(), month: Math.abs(lunar.getMonth()), day: lunar.getDay(), isLeapMonth: lunar.getMonth() < 0,
    },
    animal: ANIMALS[p.year.branch],
    pillars,
    dayMaster: {
      stem: ds, text: STEMS[ds], hanja: STEMS_HANJA[ds],
      element: ELEMENTS[STEM_EL[ds]], yinyang: YINYANG[ds % 2], nature: STEM_NATURE[ds],
    },
    jieqi: {
      prev: { name: p.prevJie.name, date: fmt(p.prevJie.instant + 9 * 3600000) },
      next: { name: p.nextJie.name, date: fmt(p.nextJie.instant + 9 * 3600000) },
      daysSincePrev: Math.round(elapsed * 10) / 10,
      saryeong: { stem: STEMS[saryeong], hanja: STEMS_HANJA[saryeong], tenGod: tenGod(ds, saryeong) },
    },
    elements,
    tenGodCount,
    strength,
    gyeokguk: analyzeGyeokguk(pillars),
    yongsin: analyzeYongsin(pillars, strength, elements),
    relations: findRelations(natalItems(pillars)),
    sinsal: findSinsal(pillars),
    gongmang: { branches: gm.map(b => BRANCHES[b]), hanja: gm.map(b => BRANCHES_HANJA[b]).join('') },
  };
  result.daeun = input.gender ? calcDaeun(p, t, input.gender) : null;
  return result;
}

// ============================================================
// 10. 궁합 (기본)
// ============================================================

function compatibility(a, b) {
  const items = [];
  let score = 50;
  const note = (delta, text) => { score += delta; items.push({ delta, text }); };
  const pa = a.pillars, pb = b.pillars;

  const rel = (x, y, lx, ly) => findRelations([{ label: lx, ...x }, { label: ly, ...y }]);

  // 일간
  const ds = rel({ stem: pa.day.stem }, { stem: pb.day.stem }, 'A', 'B');
  if (ds.some(r => r.type === '천간합')) note(15, `일간 ${pa.day.hanja[0]}·${pb.day.hanja[0]} 천간합 — 서로 끌리는 관계`);
  if (ds.some(r => r.type === '천간충')) note(-10, `일간 ${pa.day.hanja[0]}·${pb.day.hanja[0]} 충 — 기질 충돌`);
  items.push({ delta: 0, text: `A가 본 B 일간: ${tenGod(pa.day.stem, pb.day.stem)}, B가 본 A 일간: ${tenGod(pb.day.stem, pa.day.stem)}` });

  // 일지(배우자궁), 년지(띠)
  for (const [k, title] of [['day', '일지(배우자궁)'], ['year', '띠']]) {
    const r = rel({ branch: pa[k].branch }, { branch: pb[k].branch }, 'A', 'B');
    for (const x of r) {
      const d = { 육합: 12, 반합: 8, 충: -12, 원진: -10, 형: -6, 해: -5, 파: -4 }[x.type] ?? 0;
      if (d) note(d, `${title} ${x.name}`);
    }
  }

  // 오행 보완: 상대가 내 용신 오행을 많이 갖고 있는가
  for (const [x, y, nx] of [[a, b, 'A'], [b, a, 'B']]) {
    const pct = y.elements.percent[x.yongsin.yongsin];
    if (pct >= 25) note(8, `${nx}의 용신(${x.yongsin.yongsin})을 상대가 충분히 가짐`);
    for (const m of x.elements.missing) if (y.elements.count[m] >= 2) note(4, `${nx}에게 없는 ${m}${'목금'.includes(m) ? '을' : '를'} 상대가 보완`);
  }

  return { score: Math.max(0, Math.min(100, score)), items };
}

// Node에서 테스트할 때용
if (typeof module !== 'undefined') {
  const lj = require('lunar-javascript');
  globalThis.Solar = lj.Solar;
  globalThis.Lunar = lj.Lunar;
  module.exports = {
    STEMS, STEMS_HANJA, BRANCHES, BRANCHES_HANJA, ELEMENTS, HIDDEN_STEMS, NAYIN, STEM_ELEMENT, BRANCH_ELEMENT,
    calcSaju, analyzeSaju, resolveBirthTime, koreaOffsetAt, koreaLocalToInstant,
    tenGod, twelveStage, sinsal12, gongmangOf, findRelations,
    getSeun, getWolun, getIljin, currentDaeun, compatibility,
  };
}
