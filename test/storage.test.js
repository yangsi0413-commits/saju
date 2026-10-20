// 검증: 저장 레코드가 스키마 제약(supabase/schema.sql)을 지키는지, 상대방 정보가 섞이지 않는지, 주소용 인코딩이 되돌아오는지
const fs = require('fs');
const S = require('../src/core/saju.js');
const M = require('../src/core/methods.js');
const I = require('../src/core/interpret.js');
const store = require('../src/ui/storage.js');

let total = 0, failed = 0;
function check(name, ok, detail = '') {
  total++;
  if (!ok) { failed++; if (failed <= 20) console.log('✗', name, detail); }
}

// 공개 저장소에 service_role 키가 들어가면 안 된다 (anon 키만 허용)
const configText = fs.readFileSync(__dirname + '/../src/config.js', 'utf8');
for (const jwt of configText.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g) || []) {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
  check('config.js에 service_role 키 없음', payload.role !== 'service_role', payload.role);
}

globalThis.SAJU_CONFIG = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'k', operator: { name: '', contact: '' }, consentVersion: '2026-10-20' };
check('운영자 연락처가 없으면 저장 꺼짐', store.enabled() === false);
globalThis.SAJU_CONFIG.operator.contact = 'a@b.c';
check('세 값이 모두 있으면 저장 켜짐', store.enabled() === true);

const ALLOWED = ['consent_version', 'menu', 'method', 'name', 'gender', 'calendar', 'is_leap_month', 'birth_year', 'birth_month', 'birth_day',
  'birth_hour', 'birth_minute', 'place', 'time_mode', 'longitude', 'zi_hour', 'result'];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const PLACES = [['서울', 126.98], ['부산', 129.08], ['제주', 126.53]];

for (let i = 0; i < 300; i++) {
  const [place, longitude] = PLACES[i % 3];
  const noTime = i % 7 === 0;
  const profile = {
    name: i % 5 ? `사람${i}이름이아주길어서스무자를넘어가는경우` : '', gender: i % 2 ? 'M' : 'F', calendar: i % 4 ? 'solar' : 'lunar', isLeapMonth: false,
    year: rnd(1930, 2020), month: rnd(1, 12), day: rnd(1, 28), hour: noTime ? null : rnd(0, 23), minute: rnd(0, 59),
    place, timeMode: ['solar', 'standard', 'clock'][i % 3], longitude, ziHour: i % 2 ? 'next' : 'split',
  };
  const method = M.METHOD_ORDER[i % M.METHOD_ORDER.length];
  const s = M.applyMethod(S.analyzeSaju(profile), method);
  const sp = I.analyzeSpouse(s);
  const rec = store.buildRecord(profile, { ...s, spouse: { index: sp.index, grade: sp.grade }, personaType: I.readPersona(s).typeName }, 'compat', s.yongsin.method);

  check('허용된 열만', Object.keys(rec).every(k => ALLOWED.includes(k)), Object.keys(rec).join());
  check('이름 20자 이하', rec.name.length <= 20);
  check('동의 버전', rec.consent_version === '2026-10-20');
  check('성별·달력 값', ['M', 'F'].includes(rec.gender) && ['solar', 'lunar'].includes(rec.calendar));
  check('시간 모름이면 시·분 null', noTime ? rec.birth_hour === null && rec.birth_minute === null : rec.birth_hour === profile.hour);
  check('해석 방법 20자 이하', !rec.method || rec.method.length <= 20, rec.method);
  check('네 기둥', rec.result.pillars.length === 4 && (noTime ? rec.result.pillars[3] === null : /^.{2}$/.test(rec.result.pillars[3])));
  check('결과 요약 값', rec.result.dayMaster && rec.result.strength.level && rec.result.yongsin.yongsin && rec.result.gyeokguk && rec.result.persona, JSON.stringify(rec.result));
  check('결과 크기 8KB 미만', Buffer.byteLength(JSON.stringify(rec.result)) < 8000);

  // 관리자 화면의 "풀이 보기": 레코드 → 프로필 → 주소 → 프로필 → 같은 사주
  const row = { ...rec, name: rec.name || null };
  const back = store.decodeProfile(store.encodeProfile(store.toProfile(row)));
  check('주소 인코딩은 URL에 안전', /^[\w-]+$/.test(store.encodeProfile(store.toProfile(row))));
  const again = M.applyMethod(S.analyzeSaju(back), method);
  check('다시 계산해도 같은 여덟 글자', ['year', 'month', 'day', 'hour'].every(k => (again.pillars[k]?.hanja ?? null) === (s.pillars[k]?.hanja ?? null)), JSON.stringify(back));
}

console.log(`${failed ? '✗' : '✓'} 저장 레코드 ${total - failed}/${total}`);
process.exit(failed ? 1 : 0);
