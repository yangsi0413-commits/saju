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
  const DEMO = params.has('demo');
  const DEMO_PROFILES = [
    { name: '지민', gender: 'F', calendar: 'solar', isLeapMonth: false, year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울', timeMode: 'solar', longitude: 127.0, ziHour: 'next' },
    { name: '현우', gender: 'M', calendar: 'solar', isLeapMonth: false, year: 1988, month: 11, day: 3, hour: 7, minute: 0, place: '부산', timeMode: 'solar', longitude: 129.1, ziHour: 'next' },
    { name: '민준', gender: 'M', calendar: 'solar', isLeapMonth: false, year: 1991, month: 2, day: 20, hour: 15, minute: 0, place: '대구', timeMode: 'solar', longitude: 128.6, ziHour: 'next' },
  ];

  const state = { profiles: DEMO ? DEMO_PROFILES : loadProfiles(), year: THIS_YEAR };

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
  const rich = (text) => esc(text).replace(/\[\[([^\]]+)\]\]/g, (_, t) =>
    I.GLOSSARY[t] ? `<button type="button" class="term" data-term="${esc(t)}">${esc(t)}</button>` : esc(t));
  const term = (t, label = t) => `<button type="button" class="term" data-term="${esc(t)}">${esc(label)}</button>`;

  function renderSection(sec, extra = '') {
    return `
      <section class="card" id="sec-${sec.id}">
        <h2>${esc(sec.title)}</h2>
        <p class="lead">${rich(sec.lead)}</p>
        ${extra}
        ${sec.paragraphs.map(p => `<p>${rich(p)}</p>`).join('')}
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
      <p class="notice">입력한 정보는 이 기기 안에서만 계산되며 서버로 전송되지 않습니다.</p>`;
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
      name: v('name').value.trim() || (i === 0 ? '나' : '상대'),
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
        <p class="error" id="form-error" role="alert"></p>
        <button class="primary">분석하기</button>
        <p class="notice">입력한 정보는 이 기기에만 저장되며 서버로 전송되지 않습니다.</p>
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
        await playLoading(charts[0], m);
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
    const s = analyzeSaju(state.profiles[0]);
    const body = { saju: resultSaju, persona: resultPersona, today: resultToday, year: resultYear, daeun: resultDaeun, compat: resultCompat }[menuId](s);
    app.innerHTML = `
      <a class="back" href="#/">← 운세 선택</a>
      ${body}
      ${otherMenus(menuId)}`;
    window.scrollTo(0, 0);
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
        <nav class="toc" aria-label="목차">${r.sections.map(x => `<a href="#sec-${x.id}" data-scroll>${esc(x.title.split(' — ')[0].split(',')[0])}</a>`).join('')}</nav>
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
              <span class="muted small">${d.age}세 · ${d.startYear}</span>
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
    const partners = state.profiles.slice(1, 3).filter(Boolean).map(p => analyzeSaju(p));
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
    const y = e.target.closest('[data-year]');
    if (y) { state.year = Number(y.dataset.year); renderResult('year'); return; }
    const a = e.target.closest('a[data-scroll]');
    if (a) { e.preventDefault(); document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }); }
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.closest('[data-close]')) dialog.close(); });

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function route() {
    const [, page, arg] = (location.hash || '#/').split('/');
    if (page === 'input') renderInput(arg);
    else if (page === 'result') renderResult(arg);
    else if (page === 'learn') renderLearn();
    else renderHome();
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
