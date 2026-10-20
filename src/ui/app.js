// 화면 흐름: 홈(운세 선택) → 입력(#/input/:menu) → 결과(#/result/:menu)
// 입력 정보는 이 브라우저에만 저장되고 서버로 보내지 않는다.

(function () {
  const I = window.Interpret;
  const app = document.getElementById('app');
  const THIS_YEAR = new Date().getFullYear();
  const STORAGE_KEY = 'saju.profiles';

  const MENUS = [
    { id: 'saju', icon: '命', title: '사주팔자 종합풀이', desc: '타고난 성격·재물·직업·연애·건강을 근거와 함께 풀어 드려요', people: 1 },
    { id: 'persona', icon: '性', title: '성격·성향 풀이', desc: '일·친구·연애에서 나는 어떤 사람일까? 가치관까지', people: 1 },
    { id: 'life', icon: '時', title: '인생 흐름 · 과거와 미래', desc: '힘들었던 시기와 앞으로 잘 풀릴 시기를 근거와 함께', people: 1 },
    { id: 'today', icon: '日', title: '오늘의 운세', desc: '오늘의 일진이 내 사주에 주는 영향', people: 1 },
    { id: 'year', icon: '年', title: '신년운세', desc: '한 해의 흐름과 달마다의 운', people: 1 },
    { id: 'daeun', icon: '運', title: '대운 · 인생 흐름', desc: '10년마다 바뀌는 인생의 큰 계절', people: 1 },
    { id: 'compat', icon: '緣', title: '궁합 · 상대 비교', desc: '애인·배우자와 얼마나 맞는지, 두 사람까지 비교', people: 2 },
    { id: 'learn', icon: '學', title: '사주 기초 배우기', desc: '오행, 십성, 용신… 처음이라도 쉽게', people: 0 },
  ];
  const menuOf = (id) => MENUS.find(m => m.id === id);

  const PLACES = [['서울', 127.0], ['인천', 126.7], ['수원', 127.0], ['춘천', 127.7], ['강릉', 128.9], ['대전', 127.4], ['청주', 127.5],
    ['전주', 127.1], ['광주', 126.9], ['대구', 128.6], ['포항', 129.4], ['울산', 129.3], ['부산', 129.1], ['창원', 128.7], ['제주', 126.5]];

  const THEMES = [
    ['night', '밤하늘 천문'], ['hanji', '한지·먹'], ['dancheong', '궁궐 단청'], ['obang', '오방색'], ['bujeok', '부적'], ['light', '밝은 기본형'],
  ];
  const params = new URLSearchParams(location.search);
  // ?demo: 미리보기용 예시 인물로 채우고 저장하지 않는다
  // ?profile=…: 관리자 페이지에서 저장된 기록을 다시 열 때. 이 기기에 저장하지 않는다
  // 주소로 들어온 값이라 형식을 확인하고, 계산이 안 되는 값이면 무시한다
  const SHARED = (() => {
    try {
      const p = params.get('profile') ? SajuStore.decodeProfile(params.get('profile')) : null;
      if (!p) return null;
      const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
      const ok = ['M', 'F'].includes(p.gender) && ['solar', 'lunar'].includes(p.calendar) && int(p.year, 1900, 2100) && int(p.month, 1, 12) && int(p.day, 1, 31)
        && (p.hour == null || (int(p.hour, 0, 23) && int(p.minute ?? 0, 0, 59))) && ['solar', 'standard', 'clock'].includes(p.timeMode) && ['next', 'split'].includes(p.ziHour);
      if (!ok) return null;
      const clean = { ...p, name: String(p.name || '').slice(0, 20), place: String(p.place || '').slice(0, 20), longitude: Number(p.longitude) || 127, isLeapMonth: !!p.isLeapMonth };
      analyzeSaju(clean); // 존재하지 않는 날짜(예: 없는 윤달)면 여기서 걸러진다
      return clean;
    } catch { return null; }
  })();
  const DEMO = params.has('demo') || !!SHARED;
  const DEMO_PROFILES = [
    { name: '지민', gender: 'F', calendar: 'solar', isLeapMonth: false, year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울', timeMode: 'solar', longitude: 127.0, ziHour: 'next' },
    { name: '현우', gender: 'M', calendar: 'solar', isLeapMonth: false, year: 1988, month: 11, day: 3, hour: 7, minute: 0, place: '부산', timeMode: 'solar', longitude: 129.1, ziHour: 'next' },
    { name: '민준', gender: 'M', calendar: 'solar', isLeapMonth: false, year: 1991, month: 2, day: 20, hour: 15, minute: 0, place: '대구', timeMode: 'solar', longitude: 128.6, ziHour: 'next' },
  ];

  const METHOD_KEY = 'saju.method';
  const loadMethod = () => { try { return localStorage.getItem(METHOD_KEY) || 'consensus'; } catch { return 'consensus'; } };
  const state = { profiles: SHARED ? [SHARED] : DEMO ? DEMO_PROFILES : loadProfiles(), saved: null, year: THIS_YEAR, method: params.get('method') || loadMethod(), route: '' };
  state.qa = { sig: '', items: [], ctx: null };

  // 사주 계산 + 고른 해석 방법(학파)의 용신 적용
  const analyze = (p) => Methods.applyMethod(analyzeSaju(p), state.method, THIS_YEAR);

  // ============================================================
  // 저장 (이 기기에만)
  // ============================================================

  function loadProfiles() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  }
  function saveProfiles(list) {
    if (DEMO) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* 저장 불가 환경은 무시 */ }
  }

  // ============================================================
  // 렌더링 도우미
  // ============================================================

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // [[용어]] → 누르면 설명이 뜨는 버튼
  const rich = (text) => esc(text)
    .replace(/\[\[([^\]]+)\]\]/g, (_, t) => (I.GLOSSARY[t] ? `<button type="button" class="term" data-term="${esc(t)}">${esc(t)}</button>` : esc(t)))
    .replace(/([목화토금수])\(([木火土金水])\)/g, '<b class="elw">$1($2)</b>');
  const term = (t, label = t) => `<button type="button" class="term" data-term="${esc(t)}">${esc(label)}</button>`;

  // "라벨: 내용" 형태의 문단은 라벨을 따로 굵게 보여 준다
  function paragraph(p) {
    const m = p.match(/^([^:：.!?\[]{2,26}):\s+([\s\S]+)$/);
    if (m) return `<div class="kv"><span class="kv-label">${rich(m[1])}</span><p>${rich(m[2])}</p></div>`;
    return `<p>${rich(p)}</p>`;
  }
  const VISIBLE = 4;
  function paragraphs(list) {
    const head = list.slice(0, VISIBLE).map(paragraph).join('');
    if (list.length <= VISIBLE + 1) return list.map(paragraph).join('');
    return `${head}<details class="more"><summary>더 읽기 (${list.length - VISIBLE})</summary>${list.slice(VISIBLE).map(paragraph).join('')}</details>`;
  }

  function renderSection(sec, extra = '') {
    return `
      <section class="card" id="sec-${sec.id}">
        <h2>${esc(sec.title)}</h2>
        <p class="lead">${rich(sec.lead)}</p>
        ${extra}
        ${paragraphs(sec.paragraphs)}
        ${sec.why.length ? `
          <details class="why">
            <summary>왜 이렇게 풀이되나요?</summary>
            <ul>${sec.why.map(w => `<li>${rich(w)}</li>`).join('')}</ul>
          </details>` : ''}
      </section>`;
  }

  function pillarTable(s) {
    const cols = [['시주', s.pillars.hour], ['일주', s.pillars.day], ['월주', s.pillars.month], ['년주', s.pillars.year]];
    const cell = (p, f) => (p ? f(p) : '<span class="muted">-</span>');
    const row = (label, f, cls = '') => `<tr class="${cls}"><th scope="row">${label}</th>${cols.map(([, p]) => `<td>${cell(p, f)}</td>`).join('')}</tr>`;
    const charCell = (hanja, ko, el, yy) => `<div class="char el-bg-${el}"><span class="hanja">${hanja}</span><span class="ko">${ko} · ${yy}${el}</span></div>`;
    return `
      <div class="table-wrap">
        <table class="pillars">
          <thead><tr><th></th>${cols.map(([t]) => `<th scope="col">${t}</th>`).join('')}</tr></thead>
          <tbody>
            ${row(term('십성'), p => esc(p.stemTenGod), 'sub')}
            ${row(term('천간'), p => charCell(STEMS_HANJA[p.stem], STEMS[p.stem], p.stemElement, p.stemYinYang), 'chars')}
            ${row(term('지지'), p => charCell(BRANCHES_HANJA[p.branch], BRANCHES[p.branch], p.branchElement, p.branchYinYang), 'chars')}
            ${row(term('십성'), p => esc(p.branchTenGod), 'sub')}
            ${row(term('지장간'), p => p.hiddenStems.map(h => h.text).join(' '), 'sub')}
            ${row(term('12운성'), p => esc(p.twelveStage), 'sub')}
            ${row(term('신살', '12신살'), p => esc(p.sinsal12.byYear.replace('년살(도화)', '도화살')), 'sub')}
            ${row(term('납음'), p => esc(p.nayin), 'sub')}
          </tbody>
        </table>
      </div>`;
  }

  function birthLine(s) {
    const b = s.birth;
    const lunar = `음력 ${s.lunar.year}.${s.lunar.isLeapMonth ? '윤' : ''}${s.lunar.month}.${s.lunar.day}`;
    const time = b.hourKnown ? `${b.clock.slice(11)} 출생 → 보정 ${b.corrected.slice(11)}` : '태어난 시간 모름';
    return `양력 ${b.solarDate.year}.${b.solarDate.month}.${b.solarDate.day} · ${lunar} · ${s.animal}띠 · ${s.gender === 'M' ? '남' : '여'} · ${time}`;
  }

  function personHeader(s) {
    return `
      <section class="card person">
        <h2>${esc(s.name)}님의 사주팔자</h2>
        <p class="muted small">${esc(birthLine(s))}</p>
        ${pillarTable(s)}
      </section>`;
  }

  // 오행 분포: 항목마다 이름과 값을 직접 표기한 가로 막대
  function elementBars(s, compact = false) {
    const { count, percent } = s.elements;
    const max = Math.max(...ELEMENTS.map(e => percent[e]), 1);
    return `
      <div class="bars ${compact ? 'compact' : ''}" role="table" aria-label="오행 분포">
        ${ELEMENTS.map(e => `
          <div class="bar-row" role="row" title="${e}(${I.ELEMENT_INFO[e].hanja}) ${count[e]}개 · ${percent[e]}%">
            <span class="bar-label" role="cell">${e} <span class="muted">${I.ELEMENT_INFO[e].hanja}</span></span>
            <span class="bar-track" role="cell"><span class="bar-fill el-fill-${e}" style="width:${(percent[e] / max) * 100}%"></span></span>
            <span class="bar-value" role="cell">${count[e]}개 · ${percent[e]}%</span>
          </div>`).join('')}
      </div>`;
  }

  function groupBars(s) {
    const g = s.strength.groups;
    const max = Math.max(...Object.values(g), 1);
    return `
      <div class="bars" role="table" aria-label="십성 비중">
        ${Object.entries(g).map(([k, v]) => `
          <div class="bar-row" role="row" title="${k} ${v}%">
            <span class="bar-label" role="cell">${term(k)}</span>
            <span class="bar-track" role="cell"><span class="bar-fill neutral" style="width:${(v / max) * 100}%"></span></span>
            <span class="bar-value" role="cell">${v}%</span>
          </div>`).join('')}
      </div>`;
  }

  function strengthMeter(s) {
    const v = s.strength.score;
    return `
      <div class="meter" aria-label="신강약 점수 ${v}점">
        <div class="meter-track"><span class="meter-mid"></span><span class="meter-dot" style="left:${Math.min(100, Math.max(0, v))}%"></span></div>
        <div class="meter-scale"><span>신약</span><span>중화 (50)</span><span>신강</span></div>
      </div>`;
  }

  function scoreCard(title, sc, sub = '') {
    return `
      <section class="card score-card">
        <p class="muted small">${esc(title)}</p>
        <div class="score"><span class="score-num">${sc.score}</span><span class="score-grade grade-${gradeClass(sc.score)}">${esc(sc.grade)}</span></div>
        <div class="score-track"><span style="width:${sc.score}%"></span></div>
        ${sub}
      </section>`;
  }
  const gradeClass = (v) => (v >= 65 ? 'good' : v >= 50 ? 'mid' : 'low');

  function categoryGrid(cats) {
    return `<div class="cat-grid">${cats.map(([k, v]) => `<div class="cat"><h3>${esc(k)}</h3><p>${esc(v)}</p></div>`).join('')}</div>`;
  }

  function luckyBox(l) {
    return `
      <div class="lucky">
        <div><span class="muted small">행운의 색</span><b>${esc(l.color)}</b></div>
        <div><span class="muted small">방향</span><b>${esc(l.direction)}</b></div>
        <div><span class="muted small">숫자</span><b>${esc(l.numbers)}</b></div>
        <div><span class="muted small">추천 활동</span><b>${esc(l.act)}</b></div>
      </div>`;
  }

  function otherMenus(current) {
    return `
      <section class="card">
        <h2>다른 운세도 보기</h2>
        <div class="chips">
          ${MENUS.filter(m => m.id !== current && m.id !== 'learn').map(m =>
            `<a class="chip" href="#/${m.people === 2 && state.profiles.length < 2 ? 'input' : 'result'}/${m.id}">${m.icon} ${esc(m.title)}</a>`).join('')}
          <a class="chip ghost" href="#/input/${current}">정보 다시 입력</a>
        </div>
      </section>`;
  }

  // ============================================================
  // 화면: 홈
  // ============================================================

  function renderHome() {
    app.innerHTML = `
      <section class="hero">
        <h1>어떤 운세가 궁금하세요?</h1>
        <p class="muted">생년월일시로 사주를 계산하고, 결과가 <b>왜 그렇게 나왔는지</b>까지 쉽게 설명해 드려요.</p>
      </section>
      <div class="menu-grid">
        ${MENUS.map(m => `
          <a class="menu-card" href="#/${m.id === 'learn' ? 'learn' : 'input/' + m.id}">
            <span class="menu-icon" aria-hidden="true">${m.icon}</span>
            <span class="menu-title">${esc(m.id === 'year' ? `${THIS_YEAR}·${THIS_YEAR + 1} 신년운세` : m.title)}</span>
            <span class="menu-desc">${esc(m.desc)}</span>
          </a>`).join('')}
      </div>
      <p class="notice">${privacyNotice()}</p>`;
  }

  // ============================================================
  // 화면: 입력
  // ============================================================

  function personFields(i, p = {}) {
    const n = (k) => `p${i}-${k}`;
    const sel = (a, b) => (a === b ? 'selected' : '');
    const date = p.year ? `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` : '';
    const time = p.hour != null ? `${String(p.hour).padStart(2, '0')}:${String(p.minute || 0).padStart(2, '0')}` : '';
    return `
      <fieldset class="card person-form">
        <legend>${['나의 정보', '상대방 정보', '비교할 두 번째 상대'][i]}</legend>
        <label>이름 <input id="${n('name')}" required maxlength="20" value="${esc(p.name)}" placeholder="홍길동"></label>
        <div class="field">
          <span class="field-label">성별</span>
          <div class="segmented">
            <label><input type="radio" name="${n('gender')}" value="M" ${p.gender !== 'F' ? 'checked' : ''}> 남</label>
            <label><input type="radio" name="${n('gender')}" value="F" ${p.gender === 'F' ? 'checked' : ''}> 여</label>
          </div>
        </div>
        <div class="row">
          <label>달력
            <select id="${n('calendar')}">
              <option value="solar" ${sel(p.calendar, 'solar')}>양력</option>
              <option value="lunar" ${sel(p.calendar, 'lunar')}>음력</option>
            </select>
          </label>
          <label class="check"><input type="checkbox" id="${n('leap')}" ${p.isLeapMonth ? 'checked' : ''}> 윤달</label>
        </div>
        <label>생년월일 <input type="date" id="${n('date')}" required min="1900-01-01" max="2100-12-31" value="${date}"></label>
        <div class="row">
          <label>태어난 시간 <input type="time" id="${n('time')}" value="${time}"></label>
          <label class="check"><input type="checkbox" id="${n('notime')}" ${p.year && p.hour == null ? 'checked' : ''}> 모름</label>
        </div>
        <label>태어난 곳
          <select id="${n('place')}">
            ${PLACES.map(([name, lng]) => `<option value="${name}" ${sel(p.place || '서울', name)}>${name}</option>`).join('')}
            <option value="해외" ${sel(p.place, '해외')}>해외·기타 (보정 없음)</option>
          </select>
        </label>
        <details class="advanced">
          <summary>고급 설정</summary>
          <label><span>시간 보정 (${term('진태양시', '설명')})</span>
            <select id="${n('timeMode')}">
              <option value="solar" ${sel(p.timeMode || 'solar', 'solar')}>진태양시 — 출생지 경도로 보정 (권장)</option>
              <option value="standard" ${sel(p.timeMode, 'standard')}>표준시 — 서머타임만 제거</option>
              <option value="clock" ${sel(p.timeMode, 'clock')}>입력한 시각 그대로</option>
            </select>
          </label>
          <label><span>밤 11시~12시 출생 (${term('야자시', '설명')})</span>
            <select id="${n('ziHour')}">
              <option value="next" ${sel(p.ziHour || 'next', 'next')}>다음 날로 보기 (통자시)</option>
              <option value="split" ${sel(p.ziHour, 'split')}>당일로 보기 (야자시)</option>
            </select>
          </label>
        </details>
      </fieldset>`;
  }

  function readPerson(i) {
    const v = (k) => document.getElementById(`p${i}-${k}`);
    const date = v('date').value;
    if (!date) throw new Error('생년월일을 입력해 주세요.');
    const [year, month, day] = date.split('-').map(Number);
    const noTime = v('notime').checked || !v('time').value;
    const [hour, minute] = noTime ? [null, 0] : v('time').value.split(':').map(Number);
    const place = v('place').value;
    const lng = PLACES.find(([n]) => n === place)?.[1];
    return {
      name: v('name').value.trim() || ['나', '상대', '두 번째 상대'][i],
      gender: document.querySelector(`input[name="p${i}-gender"]:checked`).value,
      calendar: v('calendar').value, isLeapMonth: v('leap').checked,
      year, month, day, hour, minute,
      place,
      timeMode: place === '해외' && v('timeMode').value === 'solar' ? 'standard' : v('timeMode').value,
      longitude: lng ?? 127.0,
      ziHour: v('ziHour').value,
    };
  }

  function renderInput(menuId) {
    const m = menuOf(menuId);
    if (!m) return go('#/');
    app.innerHTML = `
      <a class="back" href="#/">← 운세 선택</a>
      <section class="hero small">
        <h1><span class="menu-icon inline" aria-hidden="true">${m.icon}</span> ${esc(m.title)}</h1>
        <p class="muted">${esc(m.desc)}</p>
      </section>
      <form id="input-form" novalidate>
        ${personFields(0, state.profiles[0])}
        ${m.people === 2 ? `
          ${personFields(1, state.profiles[1])}
          <label class="card compare-toggle"><input type="checkbox" id="compare-two" ${state.profiles[2] ? 'checked' : ''}>
            <span><b>두 번째 상대와 비교하기</b><br><span class="muted small">애인·배우자 후보 두 사람 중 누구와 더 잘 맞는지 항목별로 비교해 드려요.</span></span></label>
          <div id="p2-wrap" ${state.profiles[2] ? '' : 'hidden'}>${personFields(2, state.profiles[2])}</div>` : ''}
        ${m.id === 'year' ? `
          <fieldset class="card">
            <legend>보고 싶은 해</legend>
            <div class="segmented">
              ${[THIS_YEAR, THIS_YEAR + 1].map(y => `<label><input type="radio" name="year" value="${y}" ${y === state.year ? 'checked' : ''}> ${y}년</label>`).join('')}
            </div>
          </fieldset>` : ''}
        ${consentBlock()}
        <p class="error" id="form-error" role="alert"></p>
        <button class="primary">분석하기</button>
        <p class="notice">${privacyNotice()}</p>
      </form>`;

    const compareBox = document.getElementById('compare-two');
    if (compareBox) compareBox.addEventListener('change', () => { document.getElementById('p2-wrap').hidden = !compareBox.checked; });

    const form = document.getElementById('input-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.dataset.busy) return;
      try {
        const people = [readPerson(0)];
        if (m.people === 2) people.push(readPerson(1));
        if (compareBox?.checked) people.push(readPerson(2));
        const charts = people.map(p => analyzeSaju(p)); // 계산 가능한 입력인지 미리 확인
        state.profiles = m.people === 2 ? people : [people[0], ...state.profiles.slice(1)];
        const yr = document.querySelector('input[name="year"]:checked');
        if (yr) state.year = Number(yr.value);
        saveProfiles(state.profiles);
        form.dataset.busy = '1';
        const consent = document.getElementById('consent');
        const saving = consent?.checked && SajuStore.enabled() && !DEMO ? saveRecord(people[0], m.id) : null;
        await playLoading(charts[0], m);
        if (saving) await saving;
        delete form.dataset.busy;
        go(`#/result/${m.id}`);
      } catch (err) {
        delete form.dataset.busy;
        document.getElementById('form-error').textContent = err.message.includes('입력') ? err.message : '입력한 날짜를 계산할 수 없습니다. 날짜(특히 음력·윤달)를 다시 확인해 주세요.';
      }
    });
  }

  // ============================================================
  // 화면: 결과
  // ============================================================

  function renderResult(menuId) {
    const m = menuOf(menuId);
    if (!m || !state.profiles[0] || (m.people === 2 && !state.profiles[1])) return go(`#/input/${menuId}`);
    const s = analyze(state.profiles[0]);
    setQaContext(s);
    const body = { saju: resultSaju, persona: resultPersona, life: resultLife, today: resultToday, year: resultYear, daeun: resultDaeun, compat: resultCompat }[menuId](s);
    app.innerHTML = `
      <a class="back" href="#/">← 운세 선택</a>
      ${savedNotice()}
      ${methodBar(s, menuId === 'saju')}
      ${body}
      ${qaSection(menuId)}
      ${otherMenus(menuId)}`;
    window.scrollTo(0, 0);
    // 대운 흐름표는 가로로 길어서, 지금 대운이 보이도록 가운데로 옮겨 둔다
    const tl = app.querySelector('.timeline'), cur = tl?.querySelector('.dae.current');
    if (cur) tl.scrollLeft += cur.getBoundingClientRect().left - tl.getBoundingClientRect().left - (tl.clientWidth - cur.offsetWidth) / 2;
  }

  function resultSaju(s) {
    const r = I.readFullSaju(s);
    const extras = {
      elements: elementBars(s),
      tengods: groupBars(s),
      strength: strengthMeter(s),
    };
    return `
      ${personHeader(s)}
      <section class="card summary">
        <h2>한눈에 보기</h2>
        <div class="chips">${r.summary.keywords.map(k => `<span class="chip static">${esc(k)}</span>`).join('')}</div>
        <p class="lead">${rich(r.summary.line)}</p>
        <ol class="keypoints" aria-label="핵심 요약">${r.sections.map(x => `
          <li><a href="#sec-${x.id}" data-scroll><b>${esc(x.title.split(' — ')[0].split(',')[0])}</b><span>${rich(x.lead)}</span></a></li>`).join('')}</ol>
      </section>
      ${r.sections.map(x => renderSection(x, extras[x.id] || '')).join('')}`;
  }

  function resultToday(s) {
    const r = I.readToday(s, new Date());
    return `
      ${scoreCard(r.title, r.score, `<p class="muted small">오늘의 간지 ${r.pillar.hanja}(${r.pillar.text}) · ${esc(r.pillar.stemTenGod)}·${esc(r.pillar.branchTenGod)}</p>`)}
      <section class="card"><h2>분야별 한마디</h2>${categoryGrid(r.categories)}${luckyBox(r.lucky)}</section>
      ${r.sections.map(x => renderSection(x)).join('')}
      ${personHeader(s)}`;
  }

  function resultYear(s) {
    const r = I.readYear(s, state.year);
    const months = `
      <section class="card">
        <h2>월별 운세</h2>
        <p class="muted small">달은 양력 1일이 아니라 ${term('절기')} 기준으로 바뀝니다.</p>
        <div class="table-wrap">
          <table class="months">
            <thead><tr><th scope="col">시작</th><th scope="col">간지</th><th scope="col">흐름</th><th scope="col">점수</th></tr></thead>
            <tbody>
              ${r.months.map(x => `
                <tr>
                  <td>${esc(x.jie)}<br><span class="muted small">${x.startDate.slice(5, 10).replace('-', '.')}~</span></td>
                  <td><b>${x.hanja}</b><br><span class="muted small">${x.text}</span></td>
                  <td>${esc(x.line)}<br><span class="muted small">${esc(x.stemTenGod)} · ${esc(x.branchTenGod)}${x.relations.length ? ' · ' + esc(x.relations.map(y => y.type).filter((v, i, a) => a.indexOf(v) === i).join(', ')) : ''}</span></td>
                  <td class="num"><span class="mini-score grade-${gradeClass(x.score)}">${x.score}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>`;
    return `
      <div class="year-tabs">
        ${[THIS_YEAR, THIS_YEAR + 1].map(y => `<button type="button" class="chip ${y === state.year ? 'active' : ''}" data-year="${y}">${y}년</button>`).join('')}
      </div>
      ${scoreCard(r.title, r.score, `<p class="muted small">${r.pillar.hanja}(${r.pillar.text})년 · ${esc(r.pillar.stemTenGod)}·${esc(r.pillar.branchTenGod)}${r.pillar.samjae ? ' · ' + r.pillar.samjae : ''}</p>`)}
      <section class="card"><h2>분야별 한마디</h2>${categoryGrid(r.categories)}${luckyBox(r.lucky)}</section>
      ${r.sections.map(x => renderSection(x)).join('')}
      ${months}
      ${personHeader(s)}`;
  }

  function resultDaeun(s) {
    const r = I.readDaeun(s, THIS_YEAR);
    const timeline = `
      <section class="card">
        <h2>대운 흐름표</h2>
        <p class="muted small">점수는 그 10년에 나에게 필요한 기운(${term('용신')})이 얼마나 들어오는지를 나타냅니다.</p>
        <div class="timeline">
          ${r.list.map(d => `
            <div class="dae ${d.current ? 'current' : ''}">
              <span class="muted small dae-when">${d.age}세<br>${d.startYear}</span>
              <span class="dae-char el-bg-${d.stemElement}">${STEMS_HANJA[d.stem]}</span>
              <span class="dae-char el-bg-${d.branchElement}">${BRANCHES_HANJA[d.branch]}</span>
              <span class="small">${esc(d.stemTenGod)}·${esc(d.branchTenGod)}</span>
              <span class="mini-score grade-${gradeClass(d.score)}">${d.score}</span>
              ${d.current ? '<span class="now">지금</span>' : ''}
            </div>`).join('')}
        </div>
      </section>`;
    return `
      ${personHeader(s)}
      ${timeline}
      ${r.sections.map(x => renderSection(x)).join('')}`;
  }

  // ============================================================
  // 사주 Q&A: 결과 화면 맨 끝에서 위의 풀이를 근거로 질문하고 그 자리에서 답을 본다
  // ============================================================

  // 대화는 같은 사람·같은 해석 방법일 때만 이어 간다
  function setQaContext(s) {
    const sig = JSON.stringify([state.profiles, state.method]);
    if (state.qa.sig !== sig) Object.assign(state.qa, { sig, items: [] });
    state.qa.ctx = { s, partners: state.profiles.slice(1, 3).filter(Boolean).map(p => analyze(p)) };
  }

  function answerCard(a) {
    return `
      <article class="qa-answer">
        <p class="qa-kind muted small">${esc(a.title)}</p>
        <p class="lead">${rich(a.conclusion)}</p>
        ${paragraphs(a.points)}
        ${a.advice.length ? `<div class="qa-advice"><b>조언</b><ul>${a.advice.map(x => `<li>${rich(x)}</li>`).join('')}</ul></div>` : ''}
        ${a.why.length ? `<details class="why"><summary>근거 더 보기</summary><ul>${a.why.map(w => `<li>${rich(w)}</li>`).join('')}</ul></details>` : ''}
        ${a.links.length ? `<div class="chips">${a.links.map(l => `<a class="chip" href="#/${l.input ? 'input' : 'result'}/${l.menu}">${esc(l.label)} →</a>`).join('')}</div>` : ''}
      </article>`;
  }

  const threadHtml = () => state.qa.items
    .map(it => (it.role === 'user' ? `<div class="qa-q"><span>${esc(it.text)}</span></div>` : answerCard(it.answer))).join('');

  function qaSection(menuId) {
    const sug = SajuQA.SUGGESTIONS[menuId] || SajuQA.SUGGESTIONS.qa;
    return `
      <section class="card qa-entry" id="qa">
        <h2>풀이를 보고 궁금한 게 있나요?</h2>
        <p class="muted small">위의 풀이를 근거로 답해 드려요. 주제(직장·재물·연애·결혼·건강·이사 등)와 시기(연도·나이·달)를 넣어 물어보면 더 정확해요.</p>
        <div class="qa-thread" id="qa-thread" aria-live="polite">${threadHtml()}</div>
        <form class="qa-form-inline" data-qa-form>
          <input name="q" maxlength="200" placeholder="예: ${esc(sug[0])}" aria-label="질문">
          <button class="primary small-btn">질문하기</button>
        </form>
        <div class="chips">${sug.map(q => `<button type="button" class="chip" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <button type="button" class="chip ghost qa-clear" data-qa-clear ${state.qa.items.length ? '' : 'hidden'}>대화 지우기</button>
      </section>`;
  }

  function redrawThread() {
    const el = document.getElementById('qa-thread');
    if (el) el.innerHTML = threadHtml();
    const clear = document.querySelector('[data-qa-clear]');
    if (clear) clear.hidden = !state.qa.items.length;
  }

  function askQuestion(q) {
    q = q.trim();
    if (!q || !state.qa.ctx) return;
    const { s, partners } = state.qa.ctx;
    state.qa.items.push({ role: 'user', text: q }, { role: 'assistant', answer: SajuQA.answer(s, q, { partners, now: new Date() }) });
    redrawThread();
    const thread = document.getElementById('qa-thread');
    thread?.children[thread.children.length - 2]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============================================================
  // 해석 방법(학파) 선택
  // ============================================================

  function methodBar(s, openCompare) {
    const M = s.methods, cur = M.byId[state.method] ? state.method : 'consensus', sel = M.byId[cur];
    const stars = (n) => '★'.repeat(n);
    const resultHtml = sel.kind === 'yongsin' ? `
        ${paragraphs(sel.paragraphs)}
        ${sel.years.length ? `<div class="kv"><span class="kv-label">이 방법으로 본 좋은 해</span><p>${sel.years.map(y => `${y.year}년(${y.text}) ${stars(y.stars)}`).join(' · ')}</p></div>` : ''}
        ${sel.daeun.length ? `<div class="kv"><span class="kv-label">힘이 실리는 대운</span><p>${esc(sel.daeun.join(' · '))}</p></div>` : ''}
        <details class="why"><summary>왜 이렇게 보나요?</summary><ul>${sel.why.map(w => `<li>${rich(w)}</li>`).join('')}</ul></details>
        <p class="muted small">지금 아래의 모든 풀이(용신·운세 점수·궁합)는 <b>${esc(sel.name)}</b> 기준이에요.</p>`
      : `
        ${paragraphs(sel.paragraphs)}
        <details class="why"><summary>왜 이렇게 보나요?</summary><ul>${sel.why.map(w => `<li>${rich(w)}</li>`).join('')}</ul></details>
        <p class="muted small">${esc(sel.name)}은 읽는 관점이라 용신은 바꾸지 않아요. 아래 풀이는 <b>종합</b> 기준이에요.</p>`;
    return `
      <section class="card method-bar" id="method-bar">
        <div class="method-head"><h2>해석 방법</h2>${I.GLOSSARY.해석방법 ? `<button type="button" class="term small" data-term="해석방법">이게 뭔가요?</button>` : ''}</div>
        <div class="chips method-chips" role="tablist" aria-label="해석 방법">
          ${Methods.METHOD_ORDER.map(id => { const x = M.byId[id]; return `<button type="button" role="tab" aria-selected="${id === cur}" class="chip ${id === cur ? 'active' : ''} ${x.kind === 'lens' ? 'lens' : ''}" data-method="${id}">${esc(x.name)}</button>`; }).join('')}
        </div>
        <div class="method-info">
          <p class="method-name"><b>${esc(sel.name)}</b> <span class="hanja-tag">${esc(sel.hanja)}</span> <span class="muted small">${esc(sel.short)}</span></p>
          <p class="lead">${rich(sel.verdict)}</p>
          <details class="method-detail" ${openCompare ? 'open' : ''}>
            <summary>이 방법으로 본 풀이</summary>
            <p class="muted">${esc(sel.how)} <span class="small">(${esc(sel.source)})</span></p>
            ${resultHtml}
          </details>
        </div>
        <details class="compare-methods">
          <summary>방법별 결론 한눈에 비교</summary>
          <div class="table-wrap"><table class="method-table">
            <thead><tr><th scope="col">방법</th><th scope="col">결론</th><th scope="col">용신</th></tr></thead>
            <tbody>${Methods.METHOD_ORDER.map(id => { const x = M.byId[id]; return `
              <tr class="${id === cur ? 'on' : ''}">
                <th scope="row"><button type="button" class="link" data-method="${id}">${esc(x.name)}</button></th>
                <td>${rich(x.verdict)}</td>
                <td>${x.kind === 'yongsin' ? `<b class="elw">${x.yongsin}</b>${x.applicable ? '' : '<br><span class="muted small">해당 없음→억부</span>'}` : '<span class="muted small">관점</span>'}</td>
              </tr>`; }).join('')}</tbody>
          </table></div>
        </details>
      </section>`;
  }

  // ============================================================
  // 인생 흐름 (과거·미래)
  // ============================================================

  function lifeChart(r) {
    const pts = r.points, W = 340, H = 190, L = 26, R = 8, T = 10, B = 24;
    const x = (i) => L + (i / (pts.length - 1)) * (W - L - R);
    const y = (v) => T + (1 - v / 100) * (H - T - B);
    const nowIdx = pts.findIndex(p => p.year === r.current);
    const smooth = pts.map((p, i) => { const w = pts.slice(Math.max(0, i - 1), i + 2); return w.reduce((a, q) => a + q.score, 0) / w.length; });
    const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const raw = line(pts.map(p => p.score)), path = line(smooth);
    const ticks = pts.map((p, i) => [p, i]).filter(([p]) => p.age % 10 === 1 || p.age === 1);
    const data = esc(JSON.stringify(pts.map(p => [p.year, p.age, p.score])));
    return `
      <figure class="life-chart" data-points="${data}" data-w="${W}" data-l="${L}" data-r="${R}">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="나이별 운 점수 그래프. 지금 ${pts[nowIdx]?.score ?? ''}점">
          <rect x="${x(nowIdx)}" y="${T}" width="${W - R - x(nowIdx)}" height="${H - T - B}" class="future-zone"/>
          ${[0, 50, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 4}" y="${y(v) + 3}" class="tick" text-anchor="end">${v}</text>`).join('')}
          <line x1="${L}" x2="${W - R}" y1="${y(r.goodCut)}" y2="${y(r.goodCut)}" class="guide"/><text x="${W - R}" y="${y(r.goodCut) - 3}" class="tick" text-anchor="end">순풍 ${r.goodCut}</text>
          <line x1="${L}" x2="${W - R}" y1="${y(r.hardCut)}" y2="${y(r.hardCut)}" class="guide"/><text x="${W - R}" y="${y(r.hardCut) + 10}" class="tick" text-anchor="end">역풍 ${r.hardCut}</text>
          <path d="${raw}" class="line raw"/>
          <path d="${path}" class="line"/>
          ${ticks.map(([p, i]) => `<text x="${x(i)}" y="${H - 8}" class="tick" text-anchor="middle">${p.age - 1}세</text>`).join('')}
          ${nowIdx >= 0 ? `<line x1="${x(nowIdx)}" x2="${x(nowIdx)}" y1="${T}" y2="${H - B}" class="now-line"/><circle cx="${x(nowIdx)}" cy="${y(pts[nowIdx].score)}" r="4" class="now-dot"/><text x="${x(nowIdx) + 5}" y="${T + 9}" class="tick strong">지금 ${pts[nowIdx].score}점</text>` : ''}
          <circle r="4" class="hover-dot" cx="-10" cy="-10"/>
        </svg>
        <div class="chart-tip" hidden></div>
        <figcaption class="muted small"><span class="key-line"></span> 3년 평균 흐름 <span class="key-line raw"></span> 해마다 점수 · 세로는 운 점수(높을수록 순풍), 가로는 나이, 오른쪽 옅은 영역은 앞으로의 시기예요. 그래프를 누르면 그해 점수가 보여요.</figcaption>
      </figure>`;
  }

  function resultLife(s) {
    const r = I.readLifeFlow(s, new Date());
    return `
      <section class="card">
        <h2>${esc(s.name)}님의 인생 운 그래프</h2>
        ${lifeChart(r)}
      </section>
      ${r.sections.map(x => renderSection(x)).join('')}
      ${personHeader(s)}`;
  }

  function resultPersona(s) {
    const r = I.readPersona(s);
    return `
      <section class="card persona-hero">
        <p class="muted small">${esc(s.name)}님은</p>
        <h2 class="persona-type">${esc(r.typeName)}</h2>
        <p>${rich(r.oneLine)}</p>
        <div class="chips">${r.hashtags.map(t => `<span class="chip static">#${esc(t)}</span>`).join('')}</div>
      </section>
      <section class="card">
        <h2>성향 지표</h2>
        <p class="muted small">사주 여덟 글자의 음양·오행·십성 비율로 계산한 성향입니다. 막대의 점이 치우친 쪽이 더 강한 성향이에요.</p>
        <div class="axes">
          ${r.axes.map(a => `
            <div class="axis">
              <div class="axis-labels"><span class="${a.value <= 40 ? 'on' : ''}">${a.left}</span><b>${a.value >= 60 ? a.right : a.value <= 40 ? a.left : '균형'}</b><span class="${a.value >= 60 ? 'on' : ''}">${a.right}</span></div>
              <div class="axis-track" role="img" aria-label="${a.left} ${100 - a.value}% · ${a.right} ${a.value}%"><span class="axis-dot" style="left:${a.value}%"></span></div>
              <p class="small">${esc(a.text)}</p>
              <details class="why"><summary>왜 이렇게 나왔나요?</summary><ul><li>${rich(a.why)}</li></ul></details>
            </div>`).join('')}
        </div>
      </section>
      ${r.sections.map(x => renderSection(x)).join('')}
      ${personHeader(s)}`;
  }

  // 궁합 항목별 점수 막대 (한 사람 또는 두 사람 비교)
  function compatBars(results) {
    const names = results.map(r => r.names[1]);
    return `
      <div class="table-wrap">
        <table class="compat-table">
          <thead><tr><th scope="col">항목</th>${names.map(n => `<th scope="col">${esc(n)}</th>`).join('')}</tr></thead>
          <tbody>
            ${results[0].categories.map((c, i) => `
              <tr>
                <th scope="row">${esc(c.title.replace(' (배우자궁)', ''))}<br><span class="muted small">비중 ${c.weight}%</span></th>
                ${results.map(r => { const x = r.categories[i]; return `
                  <td><div class="cbar"><span class="cbar-track"><span class="cbar-fill grade-bg-${gradeClass(x.score)}" style="width:${x.score}%"></span></span><b class="grade-${gradeClass(x.score)}">${x.score}</b></div>
                  <span class="muted small">${esc(x.verdict)}</span></td>`; }).join('')}
              </tr>`).join('')}
            <tr class="total"><th scope="row">종합</th>${results.map(r => `<td><b class="grade-${gradeClass(r.score)}">${r.score}점</b> <span class="small">${esc(r.grade)}</span></td>`).join('')}</tr>
          </tbody>
        </table>
      </div>`;
  }

  function compatPersons(list) {
    const mini = (x) => `
      <div class="compat-person">
        <h3>${esc(x.name)}</h3>
        <p class="muted small">${['year', 'month', 'day', 'hour'].filter(k => x.pillars[k]).map(k => x.pillars[k].hanja).join(' ')} · ${x.animal}띠</p>
        <p class="small">"${esc(I.readPersona(x).typeName)}"</p>
        ${elementBars(x, true)}
      </div>`;
    return `<section class="card"><h2>${list.length === 3 ? '세' : '두'} 사람의 사주</h2><div class="compat-grid">${list.map(mini).join('')}</div></section>`;
  }

  function resultCompat(s) {
    const partners = state.profiles.slice(1, 3).filter(Boolean).map(p => analyze(p));
    if (partners.length === 2) {
      const cmp = I.compareCompat(s, partners[0], partners[1]);
      return `
        <section class="card versus">
          <p class="muted small">${esc(s.name)}님과 더 잘 맞는 사람은?</p>
          <div class="versus-row">
            ${cmp.results.map(r => `
              <div class="versus-item ${r.score === Math.max(...cmp.results.map(x => x.score)) ? 'win' : ''}">
                <span class="versus-name">${esc(r.names[1])}</span>
                <span class="score-num">${r.score}</span>
                <span class="small">${esc(r.grade)}</span>
              </div>`).join('<span class="versus-vs">VS</span>')}
          </div>
        </section>
        ${renderSection(cmp.section)}
        <section class="card"><h2>항목별 비교</h2>${compatBars(cmp.results)}</section>
        ${compatPersons([s, ...partners])}
        ${cmp.results.map(r => `
          <details class="card partner-detail">
            <summary><h2>${esc(r.names[0])} ♥ ${esc(r.names[1])} 자세히 보기 <span class="grade-${gradeClass(r.score)}">${r.score}점</span></h2></summary>
            ${r.sections.map(x => renderSection(x)).join('')}
          </details>`).join('')}`;
    }
    const o = partners[0];
    const r = I.readCompat(s, o);
    return `
      ${scoreCard(`${s.name} ♥ ${o.name} 궁합`, { score: r.score, grade: r.grade })}
      <section class="card"><h2>항목별 궁합</h2>${compatBars([r])}</section>
      ${r.sections.map(x => renderSection(x)).join('')}
      ${compatPersons([s, o])}`;
  }

  // ============================================================
  // 분석 중 애니메이션: 여덟 글자가 하나씩 떠오른 뒤 결과로 이동
  // ============================================================

  function playLoading(s, menu) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? 700 : 2600;
    const cols = ['hour', 'day', 'month', 'year'].map(k => s.pillars[k]);
    const steps = ['태어난 순간의 절기를 찾고 있어요', '여덟 글자를 세우고 있어요', '오행의 균형을 재고 있어요', menu.people === 2 ? '두 사람의 기운을 맞춰 보고 있어요' : '풀이를 적고 있어요'];
    const el = document.createElement('div');
    el.className = 'loading-overlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="loading-orbit" aria-hidden="true">
        ${ELEMENTS.map((e, i) => `<span class="planet el-fill-${e}" style="--i:${i}">${I.ELEMENT_INFO[e].hanja}</span>`).join('')}
        <span class="orbit-center">${menu.icon}</span>
      </div>
      <div class="loading-pillars" aria-hidden="true">
        ${cols.map((p, c) => `<div class="lp-col">${p
          ? `<span class="lp-char" style="--d:${c * 2}">${STEMS_HANJA[p.stem]}</span><span class="lp-char" style="--d:${c * 2 + 1}">${BRANCHES_HANJA[p.branch]}</span>`
          : '<span class="lp-char empty" style="--d:0">?</span><span class="lp-char empty" style="--d:0">?</span>'}</div>`).join('')}
      </div>
      <p class="loading-step">${steps[0]}</p>
      <div class="loading-bar"><span style="transition-duration:${duration}ms"></span></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('run'); }));
    const stepEl = el.querySelector('.loading-step');
    let i = 0;
    const timer = setInterval(() => { i = Math.min(i + 1, steps.length - 1); stepEl.textContent = steps[i]; }, duration / steps.length);
    return new Promise(resolve => setTimeout(() => {
      clearInterval(timer);
      el.classList.add('done');
      setTimeout(() => el.remove(), reduce ? 0 : 350);
      resolve();
    }, duration));
  }

  // ============================================================
  // 화면: 기초 배우기
  // ============================================================

  // 상생(바깥 원 화살표)·상극(안쪽 별 점선) 다이어그램
  function cycleDiagram() {
    const cx = 160, cy = 150, R = 105;
    const pts = ELEMENTS.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    });
    const shorten = ([x1, y1], [x2, y2], d = 30) => {
      const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      return [x1 + ux * d, y1 + uy * d, x2 - ux * d, y2 - uy * d];
    };
    const line = (a, b, cls) => { const [x1, y1, x2, y2] = shorten(pts[a], pts[b]); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" marker-end="url(#arrow-${cls})"/>`; };
    return `
      <figure class="diagram">
        <svg viewBox="0 0 320 300" role="img" aria-label="오행 상생 상극도: 실선은 상생(목→화→토→금→수→목), 점선은 상극(목→토→수→화→금→목)">
          <defs>
            ${['saeng', 'geuk'].map(c => `<marker id="arrow-${c}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="${c}-head"/></marker>`).join('')}
          </defs>
          ${ELEMENTS.map((_, i) => line(i, (i + 1) % 5, 'saeng')).join('')}
          ${ELEMENTS.map((_, i) => line(i, (i + 2) % 5, 'geuk')).join('')}
          ${ELEMENTS.map((e, i) => `
            <g><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="26" class="node el-fill-${e}"/>
            <text x="${pts[i][0]}" y="${pts[i][1] + 6}" text-anchor="middle" class="node-text">${e}${I.ELEMENT_INFO[e].hanja}</text></g>`).join('')}
        </svg>
        <figcaption><span><i class="swatch saeng"></i>상생: 낳고 돕는 관계</span><span><i class="swatch geuk"></i>상극: 누르고 조절하는 관계</span></figcaption>
      </figure>`;
  }

  function renderLearn() {
    const G = I.GLOSSARY;
    const groups = [
      ['기본 개념', ['사주팔자', '천간', '지지', '음양', '오행', '상생', '상극']],
      ['나와 다른 글자의 관계', ['일간', '일주', '십성', '비겁', '식상', '재성', '관성', '인성', '지장간', '12운성']],
      ['사주를 판단하는 법', ['신강신약', '득령', '득지', '득세', '용신', '희신', '기신', '억부', '조후', '격국']],
      ['운의 흐름', ['대운', '대운수', '세운', '월운', '일진', '삼재']],
      ['합충과 신살', ['합', '충', '형파해', '원진', '신살', '공망', '배우자궁']],
      ['시간 계산', ['절기', '입춘', '시진', '진태양시', '서머타임', '야자시', '사령', '납음']],
    ];
    const E_INFO = I.ELEMENT_INFO;
    app.innerHTML = `
      <a class="back" href="#/">← 운세 선택</a>
      <section class="hero small"><h1>사주 기초 배우기</h1><p class="muted">사주 풀이에 나오는 말들을 쉽게 정리했어요.</p></section>

      <section class="card">
        <h2>오행 — 모든 풀이의 출발점</h2>
        <p>사주는 결국 <b>다섯 가지 기운(목·화·토·금·수)의 균형</b>을 보는 학문입니다. 다섯 기운은 서로 돕고(상생) 서로 조절하며(상극) 돌아갑니다.</p>
        ${cycleDiagram()}
        <div class="table-wrap">
          <table class="info">
            <thead><tr><th scope="col">오행</th><th scope="col">상징</th><th scope="col">계절·방향</th><th scope="col">색</th><th scope="col">몸</th><th scope="col">성향</th></tr></thead>
            <tbody>${ELEMENTS.map(e => `<tr><th scope="row"><span class="dot el-fill-${e}"></span>${e} ${E_INFO[e].hanja}</th><td>${E_INFO[e].image}</td><td>${E_INFO[e].season} · ${E_INFO[e].direction}</td><td>${E_INFO[e].color}</td><td>${E_INFO[e].organ}</td><td>${E_INFO[e].virtue}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>천간 10글자 — 일간이 되면 나의 성격</h2>
        <div class="table-wrap">
          <table class="info">
            <thead><tr><th scope="col">천간</th><th scope="col">음양·오행</th><th scope="col">이미지</th><th scope="col">강점</th></tr></thead>
            <tbody>${STEMS.map((t, i) => `<tr><th scope="row">${STEMS_HANJA[i]} ${t}</th><td>${i % 2 ? '음' : '양'} ${ELEMENTS[Math.floor(i / 2)]}</td><td>${I.STEM_INFO[i].image}</td><td>${I.STEM_INFO[i].strength}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>십성 10가지 — 다른 글자는 나에게 누구인가</h2>
        <p>일간(나)과 다른 글자의 <b>오행 관계</b>와 <b>음양이 같은지</b>로 정해집니다.</p>
        <div class="table-wrap">
          <table class="info">
            <thead><tr><th scope="col">십성</th><th scope="col">정하는 법</th><th scope="col">뜻</th></tr></thead>
            <tbody>${Object.entries(I.TEN_GOD_INFO).map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v.how}</td><td>${v.plain}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>해석 방법(학파) — 같은 사주, 다른 풀이</h2>
        <p>같은 사주도 <b>무엇을 가장 중요하게 보느냐</b>에 따라 필요한 기운(용신)이 달라집니다. 결과 화면 맨 위에서 방법을 바꿔 가며 비교해 보세요.</p>
        <dl class="glossary">${Methods.METHOD_ORDER.map(id => { const x = Methods.METHOD_INFO[id]; return `<dt>${esc(x.name)} <span class="hanja-tag">${esc(x.hanja)}</span> <span class="muted small">${esc(x.source)}</span></dt><dd><b>${esc(x.short)}</b> ${esc(x.how)}</dd>`; }).join('')}</dl>
      </section>

      ${groups.map(([title, keys]) => `
        <section class="card">
          <h2>${title}</h2>
          <dl class="glossary">${keys.map(k => `<dt>${esc(G[k].title)}</dt><dd>${esc(G[k].body)}</dd>`).join('')}</dl>
        </section>`).join('')}
      <section class="card"><h2>직접 보기</h2><div class="chips">${MENUS.filter(m => m.id !== 'learn').map(m => `<a class="chip" href="#/input/${m.id}">${m.icon} ${esc(m.title)}</a>`).join('')}</div></section>`;
  }

  // ============================================================
  // 용어 설명 창, 라우팅
  // ============================================================

  const dialog = document.getElementById('term-dialog');
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.term');
    if (t) {
      const g = I.GLOSSARY[t.dataset.term];
      if (!g) return;
      dialog.querySelector('h2').textContent = g.title;
      dialog.querySelector('p').textContent = g.body;
      dialog.showModal();
      return;
    }
    const del = e.target.closest('[data-del-token]');
    if (del) { if (confirm('이 기록을 서버에서 삭제할까요?')) deleteByToken(del.dataset.delToken); return; }
    const ask = e.target.closest('[data-ask]');
    if (ask) { askQuestion(ask.dataset.ask); return; }
    if (e.target.closest('[data-qa-clear]')) { state.qa.items = []; redrawThread(); return; }
    const mb = e.target.closest('[data-method]');
    if (mb) {
      state.method = mb.dataset.method;
      try { localStorage.setItem(METHOD_KEY, state.method); } catch { /* 저장 불가 환경은 무시 */ }
      const [, page, arg] = (location.hash || '#/').split('/');
      if (page === 'result') { renderResult(arg); document.getElementById('method-bar')?.scrollIntoView(); }
      return;
    }
    const y = e.target.closest('[data-year]');
    if (y) { state.year = Number(y.dataset.year); renderResult('year'); return; }
    const a = e.target.closest('a[data-scroll]');
    if (a) { e.preventDefault(); document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }); }
  });
  document.addEventListener('submit', (e) => {
    const delForm = e.target.closest('[data-delete-form]');
    if (delForm) { e.preventDefault(); deleteByToken(delForm.token.value); return; }
    const qaForm = e.target.closest('[data-qa-form]');
    if (qaForm) {
      e.preventDefault();
      const q = qaForm.q.value.trim();
      if (!q) return;
      qaForm.q.value = '';
      askQuestion(q);
    }
  });

  // 인생 그래프: 가장 가까운 해의 점수를 보여 준다
  function chartHover(e) {
    const fig = e.target.closest?.('.life-chart');
    if (!fig) return;
    const pts = JSON.parse(fig.dataset.points), svg = fig.querySelector('svg'), box = svg.getBoundingClientRect();
    const W = Number(fig.dataset.w), L = Number(fig.dataset.l), R = Number(fig.dataset.r);
    const vx = ((e.clientX - box.left) / box.width) * W;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(((vx - L) / (W - L - R)) * (pts.length - 1))));
    const [yr, age, sc] = pts[i];
    const cx = L + (i / (pts.length - 1)) * (W - L - R), cy = 10 + (1 - sc / 100) * (190 - 34);
    const dot = svg.querySelector('.hover-dot');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    const tip = fig.querySelector('.chart-tip');
    tip.hidden = false;
    tip.textContent = `${yr}년 · ${age}세 · ${sc}점`;
    tip.style.left = `${Math.min(box.width - 120, Math.max(0, (cx / W) * box.width - 50))}px`;
  }
  document.addEventListener('pointermove', chartHover);
  document.addEventListener('pointerdown', chartHover);

  dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.closest('[data-close]')) dialog.close(); });

  // ============================================================
  // 저장 동의 · 저장 · 삭제
  // ============================================================

  const SAVED_KEY = 'saju.savedTokens';
  const savedTokens = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; } };
  const setSavedTokens = (l) => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(l)); } catch { /* 저장 불가 */ } };

  function privacyNotice() {
    return SajuStore.enabled()
      ? '입력한 정보는 이 기기에서 계산되며, 아래에서 저장에 동의한 경우에만 서버에 보관됩니다. <a href="privacy.html">개인정보 처리방침</a>'
      : '입력한 정보는 이 기기 안에서만 계산되며 서버로 전송되지 않습니다.';
  }

  function consentBlock() {
    if (!SajuStore.enabled() || DEMO) return '';
    const c = SajuStore.cfg();
    return `
      <fieldset class="card consent">
        <label class="check"><input type="checkbox" id="consent"> <span><b>(선택)</b> 내 사주 정보 저장에 동의합니다</span></label>
        <details class="why">
          <summary>무엇을, 왜 저장하나요?</summary>
          <ul>
            <li>목적: 풀이 정확도 개선과 서비스 연구</li>
            <li>항목: 이름(입력한 경우), 성별, 생년월일시, 출생지·시간 보정 설정, 풀이 결과 요약(여덟 글자, 용신, 신강약 등). 궁합에 입력한 상대방 정보는 저장하지 않습니다.</li>
            <li>보관 기간: ${esc(c.retention || '1년')} 후 삭제</li>
            <li>동의하지 않아도 모든 풀이를 똑같이 이용할 수 있습니다.</li>
            <li>저장 후 받는 삭제 코드로 언제든 직접 삭제할 수 있고, 운영자(${esc(c.operator.contact)})에게 열람·삭제를 요청할 수 있습니다.</li>
          </ul>
          <p class="small"><a href="privacy.html">개인정보 처리방침 전문 보기</a></p>
        </details>
      </fieldset>`;
  }

  async function saveRecord(profile, menu) {
    try {
      const s = analyze(profile);
      const sp = I.analyzeSpouse(s);
      const enriched = { ...s, spouse: { index: sp.index, grade: sp.grade }, personaType: I.readPersona(s).typeName };
      const token = await SajuStore.save(SajuStore.buildRecord(profile, enriched, menu, s.yongsin.method));
      state.saved = { ok: true, token };
      setSavedTokens([{ token, name: profile.name, at: new Date().toISOString().slice(0, 10) }, ...savedTokens()].slice(0, 20));
    } catch (err) {
      state.saved = { ok: false, error: err.message };
    }
  }

  function savedNotice() {
    const sv = state.saved;
    if (!sv) return '';
    state.saved = null; // 한 번만 보여 준다
    return sv.ok
      ? `<section class="card saved-note"><p><b>저장했어요.</b> 삭제 코드: <code>${esc(sv.token)}</code></p><p class="muted small">이 코드로 언제든 <a href="#/delete">내 기록 삭제</a>를 할 수 있어요. 이 기기에도 코드를 기억해 둡니다.</p></section>`
      : `<section class="card saved-note"><p class="error">저장하지 못했어요: ${esc(sv.error)}</p><p class="muted small">풀이는 그대로 볼 수 있어요.</p></section>`;
  }

  function renderDelete() {
    const list = savedTokens();
    app.innerHTML = `
      <a class="back" href="#/">← 운세 선택</a>
      <section class="hero small"><h1>내 저장 기록 삭제</h1><p class="muted">저장할 때 받은 삭제 코드로 기록을 지울 수 있어요.</p></section>
      ${list.length ? `<section class="card"><h2>이 기기에서 저장한 기록</h2><ul class="saved-list">${list.map(x => `<li>${esc(x.at)} · ${esc(x.name || '이름 없음')} <button type="button" class="chip" data-del-token="${esc(x.token)}">삭제</button></li>`).join('')}</ul></section>` : ''}
      <form class="card" data-delete-form>
        <label>삭제 코드 <input name="token" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" pattern="[0-9a-fA-F-]{36}"></label>
        <button class="primary">삭제하기</button>
        <p class="notice" id="delete-msg" role="status"></p>
      </form>
      <p class="notice">코드를 잃어버렸다면 운영자(${esc(SajuStore.cfg().operator?.contact || '-')})에게 요청해 주세요.</p>`;
  }

  async function deleteByToken(token) {
    const say = (t) => { const msg = document.getElementById('delete-msg'); if (msg) msg.textContent = t; };
    if (!SajuStore.enabled()) return say('지금은 저장 기능이 꺼져 있어 서버에 저장된 기록이 없어요.');
    try {
      const n = await SajuStore.remove(token.trim());
      setSavedTokens(savedTokens().filter(x => x.token !== token.trim()));
      if (n) renderDelete(); // 목록을 새로 그린 뒤 안내를 띄운다
      say(n ? '삭제했어요.' : '해당 코드의 기록이 없어요(이미 삭제되었을 수 있어요).');
    } catch (err) {
      say(`삭제하지 못했어요: ${err.message}`);
    }
  }

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function route() {
    const [, page, arg] = (location.hash || '#/').split('/');
    try {
      if (page === 'input') renderInput(arg);
      else if (page === 'result') renderResult(arg);
      else if (page === 'learn') renderLearn();
      else if (page === 'delete') renderDelete();
      else renderHome();
    } catch (err) {
      // 예전에 저장된 입력값 등으로 계산이 안 되면 빈 화면 대신 입력 화면으로 안내한다
      console.error(err);
      if (page !== 'result') throw err;
      renderInput(arg);
      const e = document.getElementById('form-error');
      if (e) e.textContent = '저장된 정보로 풀이를 계산하지 못했어요. 생년월일을 다시 확인해 주세요.';
    }
    if (page !== 'result') window.scrollTo(0, 0);
  }

  // 디자인 선택: URL의 ?theme 로 열린 경우(미리보기)에는 저장하지 않는다
  const picker = document.getElementById('theme-picker');
  if (picker) {
    const current = document.documentElement.dataset.theme || 'light';
    picker.innerHTML = THEMES.map(([id, name]) => `<option value="${id}" ${id === current ? 'selected' : ''}>${name}</option>`).join('');
    picker.addEventListener('change', () => {
      const id = picker.value;
      if (id === 'light') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = id;
      try { localStorage.setItem('saju.theme.v2', id); } catch { /* 저장 불가 환경은 무시 */ }
    });
  }

  window.addEventListener('hashchange', route);
  route();
})();
