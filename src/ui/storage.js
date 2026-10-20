// 저장 서버(Supabase REST) 연동
// · 방문자: 동의한 경우에만 save(), 삭제 코드로 remove()
// · 관리자: signIn() 후 list() / removeById() / purge()
// 외부 라이브러리 없이 Supabase의 REST·Auth 엔드포인트를 fetch로 직접 호출한다.

(function (root) {
  const cfg = () => root.SAJU_CONFIG || {};
  const enabled = () => {
    const c = cfg();
    return !!(c.supabaseUrl && c.supabaseAnonKey && c.operator && c.operator.contact);
  };
  const base = () => cfg().supabaseUrl.replace(/\/$/, '');
  const headers = (token) => ({
    apikey: cfg().supabaseAnonKey,
    Authorization: `Bearer ${token || cfg().supabaseAnonKey}`,
    'Content-Type': 'application/json',
  });

  async function call(path, { method = 'POST', body, token } = {}) {
    const res = await fetch(base() + path, { method, headers: headers(token), body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error((data && (data.message || data.error_description || data.msg)) || `서버 오류 ${res.status}`);
    return data;
  }

  // 저장할 레코드: 본인의 입력 정보 + 핵심 결과 요약 (궁합 상대 정보는 넣지 않는다)
  function buildRecord(profile, s, menu, method) {
    const p = s.pillars;
    return {
      consent_version: cfg().consentVersion || 'v1',
      menu, method,
      name: (profile.name || '').slice(0, 20),
      gender: profile.gender, calendar: profile.calendar || 'solar', is_leap_month: !!profile.isLeapMonth,
      birth_year: profile.year, birth_month: profile.month, birth_day: profile.day,
      birth_hour: profile.hour ?? null, birth_minute: profile.hour == null ? null : (profile.minute || 0),
      place: profile.place || null, time_mode: profile.timeMode || 'solar', longitude: profile.longitude ?? null, zi_hour: profile.ziHour || 'next',
      result: {
        pillars: ['year', 'month', 'day', 'hour'].map(k => (p[k] ? p[k].hanja : null)),
        dayMaster: `${s.dayMaster.hanja}${s.dayMaster.element}`,
        strength: { level: s.strength.level, score: s.strength.score },
        yongsin: { method: s.yongsin.method || '억부법', yongsin: s.yongsin.yongsin, gisin: s.yongsin.gisin },
        gyeokguk: s.gyeokguk.name,
        elements: s.elements.percent,
        spouse: s.spouse || null,
        persona: s.personaType || null,
      },
    };
  }

  // 저장 후 삭제 코드(uuid)를 돌려준다
  const save = (record) => call('/rest/v1/rpc/save_saju_record', { body: { rec: record } });
  const remove = (token) => call('/rest/v1/rpc/delete_my_record', { body: { token } });

  // 관리자
  async function signIn(email, password) {
    const r = await call('/auth/v1/token?grant_type=password', { body: { email, password } });
    return { token: r.access_token, refresh: r.refresh_token, expiresAt: Date.now() + r.expires_in * 1000, email: r.user?.email };
  }
  async function refresh(refreshToken) {
    const r = await call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: refreshToken } });
    return { token: r.access_token, refresh: r.refresh_token, expiresAt: Date.now() + r.expires_in * 1000, email: r.user?.email };
  }
  const list = (token, { limit = 50, offset = 0, search = '' } = {}) => {
    const q = new URLSearchParams({ select: '*', order: 'created_at.desc', limit: String(limit), offset: String(offset) });
    if (search) q.set('name', `ilike.*${search.replace(/[*,()]/g, '')}*`);
    return call(`/rest/v1/saju_records?${q}`, { method: 'GET', token });
  };
  const removeById = (token, id) => call(`/rest/v1/saju_records?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', token });
  const purge = (token) => call('/rest/v1/rpc/purge_old_records', { body: {}, token });

  // 저장한 레코드의 입력 정보 → 사이트에서 다시 열 수 있는 프로필
  const toProfile = (r) => ({
    name: r.name || '(이름 없음)', gender: r.gender, calendar: r.calendar, isLeapMonth: r.is_leap_month,
    year: r.birth_year, month: r.birth_month, day: r.birth_day, hour: r.birth_hour, minute: r.birth_minute ?? 0,
    place: r.place, timeMode: r.time_mode, longitude: r.longitude == null ? 127 : Number(r.longitude), ziHour: r.zi_hour,
  });
  // 주소에 실을 수 있게 base64url로
  const encodeProfile = (p) => btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const decodeProfile = (str) => JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))));

  const api = { enabled, buildRecord, save, remove, signIn, refresh, list, removeById, purge, toProfile, encodeProfile, decodeProfile, cfg };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SajuStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
