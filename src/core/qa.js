// 사주 Q&A
// 1) answer(): 질문의 주제·시점·형태를 읽고, 이미 계산된 사주 데이터로 결론 → 근거 → 조언을 만든다 (규칙 기반, 무료)
// 2) buildReport(): AI 상담에 넘길 "사주 보고서" 텍스트. AI는 이 보고서만 근거로 답한다

(function (root) {
  const node = typeof module !== 'undefined' && typeof require !== 'undefined';
  const E = node ? require('./saju.js') : { STEMS_HANJA, BRANCHES, BRANCHES_HANJA, getSeun, getWolun, getIljin, currentDaeun, sinsal12 };
  const I = node ? require('./interpret.js') : root.Interpret;
  const M = node ? require('./methods.js') : root.Methods;

  const GOD = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
  const isMale = (s) => s.gender === 'M' || s.gender === '남';
  const starGroup = (s) => (isMale(s) ? '재성' : '관성');
  const roleOf = (s, e) => { const y = s.yongsin; return e === y.yongsin ? '용신' : e === y.huisin ? '희신' : e === y.gisin ? '기신' : e === y.gusin ? '구신' : '한신'; };
  const favorable = (role) => role === '용신' || role === '희신';
  const clamp = (v) => Math.max(10, Math.min(95, Math.round(v)));
  const plain = (t) => String(t).replace(/\[\[([^\]]+)\]\]/g, '$1');
  const josa = (w, p) => I.josa(w, p);

  // ============================================================
  // 질문 이해
  // ============================================================

  const TOPICS = [
    { id: 'marriage', label: '결혼', kw: ['결혼', '배우자', '신랑', '신부', '시집', '장가', '혼인', '남편', '아내', '와이프', '부부'] },
    { id: 'love', label: '연애', kw: ['연애', '애인', '남자친구', '여자친구', '남친', '여친', '썸', '인연', '이성', '소개팅', '재회', '헤어', '고백', '짝사랑', '솔로'] },
    { id: 'ideal', label: '어울리는 상대', kw: ['어떤 사람과', '어떤 사람이랑', '어떤 사람하고', '이상형', '어떤 상대', '잘 맞는 사람', '어울리는 사람', '어떤 사람을 만나', '무슨 띠'] },
    { id: 'compat', label: '궁합', kw: ['궁합', '그 사람', '상대', '잘 맞', '우리 둘', '두 사람', '누가 더'] },
    { id: 'business', label: '사업·창업', kw: ['사업', '창업', '장사', '가게', '개업', '동업', '프리랜서', '자영업'] },
    { id: 'career', label: '직장·커리어', kw: ['이직', '직장', '회사', '취업', '취직', '승진', '퇴사', '커리어', '직업', '적성', '업무', '전직', '진로', '일자리', '면접'] },
    { id: 'money', label: '재물·돈', kw: ['돈', '재물', '재테크', '투자', '주식', '코인', '부동산', '집 사', '월급', '연봉', '수입', '저축', '빚', '대출', '로또', '금전', '부자', '재산'] },
    { id: 'exam', label: '시험·학업', kw: ['시험', '합격', '공부', '자격증', '수능', '공무원', '고시', '학업', '대학', '입시', '학교', '성적'] },
    { id: 'health', label: '건강', kw: ['건강', '아프', '병원', '질병', '몸이', '수술', '다이어트', '우울', '불면', '피곤', '체력'] },
    { id: 'move', label: '이사·이동', kw: ['이사', '이동', '해외', '이민', '유학', '여행', '출장', '전근', '독립'] },
    { id: 'children', label: '자녀', kw: ['자녀', '아이', '임신', '출산', '아기', '자식', '육아'] },
    { id: 'people', label: '인간관계', kw: ['친구', '인간관계', '동료', '상사', '부모', '가족', '형제', '대인관계', '사람들'] },
    { id: 'personality', label: '성격', kw: ['성격', '성향', '장점', '단점', '어떤 사람', '기질', '가치관', '나는 왜', '내 성향'] },
    { id: 'lucky', label: '행운·개운', kw: ['행운', '색깔', '무슨 색', '숫자', '방향', '개운', '용신', '필요한 기운', '좋은 기운', '보완'] },
    { id: 'daeun', label: '대운', kw: ['대운', '10년 운', '십년'] },
    { id: 'method', label: '해석 방법', kw: ['학파', '해석 방법', '억부', '조후', '격국', '통관', '병약', '물상', '왜 다르'] },
    { id: 'today', label: '오늘', kw: ['오늘', '내일', '일진'] },
    { id: 'hard', label: '힘든 시기', kw: ['힘든', '안 좋', '나쁜 시기', '조심', '위기', '고비', '불운', '최악', '안풀', '안 풀'] },
    { id: 'good', label: '좋은 시기', kw: ['좋은 시기', '잘 풀', '기회', '언제 좋', '최고', '상승', '대박', '성공', '전성기', '풀릴'] },
    { id: 'month', label: '달별 운', kw: ['이번 달', '다음 달', '몇 월', '월별', '달에'] },
    { id: 'year', label: '한 해 운', kw: ['올해', '내년', '작년', '신년', '운세', '이번 해', '한 해'] },
  ];

  // 주제와 관련된 십성 묶음 (해마다 이 기운이 들어오면 그 주제가 움직인다고 본다)
  function topicGroups(s, topic) {
    return {
      career: ['관성', '식상'], business: ['재성', '식상'], money: ['재성'], exam: ['인성', '관성'],
      love: [starGroup(s)], marriage: [starGroup(s)], children: [isMale(s) ? '관성' : '식상'], people: ['비겁'],
    }[topic] || [];
  }

  function detectTopic(q) {
    let best = null, bestHits = 0;
    for (const t of TOPICS) {
      const hits = t.kw.filter(k => q.includes(k)).length;
      if (hits > bestHits) { best = t; bestHits = hits; }
    }
    return best;
  }

  function parseTime(q, s, Y, now) {
    const birth = s.birth.solarDate.year;
    const years = [];
    for (const m of q.matchAll(/(19|20)\d{2}(?=\s*년|\D|$)/g)) years.push(Number(m[0]));
    if (/내후년/.test(q)) years.push(Y + 2);
    else if (/내년|다음 해/.test(q)) years.push(Y + 1);
    if (/재작년/.test(q)) years.push(Y - 2);
    else if (/작년|지난해/.test(q)) years.push(Y - 1);
    if (/올해|금년|이번 해/.test(q)) years.push(Y);
    for (const m of q.matchAll(/(\d{1,2})\s*년\s*(후|뒤)/g)) years.push(Y + Number(m[1]));
    for (const m of q.matchAll(/(\d{1,3})\s*(살|세)/g)) years.push(birth + Number(m[1]) - 1);
    let month = null;
    const mm = q.match(/(\d{1,2})\s*월/);
    if (mm && Number(mm[1]) >= 1 && Number(mm[1]) <= 12) month = Number(mm[1]);
    if (/이번 달|이달/.test(q)) month = now.getMonth() + 1;
    if (/다음 달/.test(q)) month = (now.getMonth() + 1) % 12 + 1;
    const when = /언제|몇 살|몇 년|시기|때가|타이밍|몇월|몇 월/.test(q);
    const past = /과거|예전|그때|지났|있었|했었|였을|었을|힘들었|좋았/.test(q) || years.some(y => y < Y);
    return { raw: q, years: [...new Set(years)].filter(y => y >= birth && y <= birth + 100).sort(), month, when, past };
  }

  // ============================================================
  // 해마다 주제 점수
  // ============================================================

  function topicYear(s, y, topic) {
    const se = E.getSeun(s, y, y)[0];
    const dae = s.daeun ? E.currentDaeun(s, y) : null;
    const base = I.yearScore(s, se, dae);
    let score = base.score;
    const notes = [];
    for (const [pos, god, el] of [['천간', se.stemTenGod, se.stemElement], ['지지', se.branchTenGod, se.branchElement]]) {
      const g = GOD[god];
      if (!topicGroups(s, topic).includes(g)) continue;
      const role = roleOf(s, el);
      score += favorable(role) ? 10 : 4;
      notes.push(`${pos}에 ${god}(${g}) — ${favorable(role) ? `주제와 직결되는 기운이 나에게 필요한 ${josa(role, '으로/로')} 들어옴` : `주제와 직결되는 기운이 들어오지만 나에게는 ${josa(role, '이라/라')} 부담도 함께 옴`}`);
    }
    const n12 = E.sinsal12(s.pillars.year.branch, se.branch);
    if (topic === 'move') {
      if (n12 === '역마살') { score += 8; notes.push('역마살이 들어오는 해 — 이동·이사·해외 기운'); }
      if (base.events.some(e => e.includes('변동'))) { score += 5; notes.push('내 사주와 충이 있어 자리가 바뀌기 쉬운 해'); }
    }
    if (topic === 'love' && n12 === '년살(도화)') { score += 6; notes.push('도화살이 들어오는 해 — 매력과 인기가 올라감'); }
    if (topic === 'marriage') {
      const dayRel = se.relations.filter(r => r.members.includes('일지'));
      if (dayRel.some(r => ['육합', '삼합', '반합'].includes(r.type))) { score += 8; notes.push('배우자궁(일지)과 합 — 인연이 맺어지기 쉬운 해'); }
      if (dayRel.some(r => r.type === '충')) { score -= 4; notes.push('배우자궁(일지)과 충 — 관계에 큰 변화가 생기기 쉬운 해'); }
    }
    if (topic === 'exam' && ['관대', '건록', '제왕', '장생'].includes(se.twelveStage)) { score += 3; notes.push(`12운성 ${se.twelveStage} — 기운이 차오르는 단계`); }
    return { year: y, age: se.age, hanja: se.hanja, text: se.text, score: clamp(score), base: base.score, notes, factors: base.factors, events: base.events };
  }

  const verdictOf = (v) => (v >= 68 ? '좋은 해' : v >= 52 ? '무난한 해' : '신중해야 할 해');
  const yearLine = (r) => `${r.year}년 ${r.hanja}(${r.age}세): ${r.score}점 — ${verdictOf(r.score)}`;
  const reasonLine = (r) => [r.notes[0], r.factors[0].replace(/^\d{4}년 \S+: /, '그해 기운 '), r.events[0]].filter(Boolean).join(' / ');

  function rankYears(s, topic, from, to) {
    const list = [];
    for (let y = from; y <= to; y++) list.push(topicYear(s, y, topic));
    return list;
  }

  // ============================================================
  // 답변 만들기
  // ============================================================

  const TOPIC_ADVICE = {
    career: ['좋은 해에는 이직·승진·새 프로젝트에 도전하고, 신중한 해에는 실력과 평판을 쌓는 데 집중하세요.', '관성(직장·명예)이 들어오는 해는 조직 안의 기회, 식상(재능·표현)이 들어오는 해는 이직·독립의 기회로 봅니다.'],
    business: ['창업·확장은 좋은 해에 맞춰 준비하고, 신중한 해에는 고정비를 줄이고 현금을 확보하세요.', '동업은 계약서로 역할과 지분을 분명히 해 두세요.'],
    money: ['재성(재물)이 나에게 필요한 기운으로 들어오는 해에 수입을 늘릴 기회를 잡으세요.', '신중한 해에는 큰 투자·보증·대출을 피하고 지출 관리에 집중하세요.'],
    exam: ['인성(공부·문서)이 들어오는 해는 시험과 자격증에 유리합니다.', '운이 약한 해일수록 준비 기간을 길게 잡고 실전 연습을 늘리세요.'],
    love: ['배우자 별이 들어오는 해에는 소개·모임에 적극적으로 나가 보세요.', '운이 약한 해에는 새 인연보다 지금 관계를 다지는 데 집중하세요.'],
    marriage: ['결혼은 두 사람의 준비가 가장 중요합니다. 좋은 해는 그 결정을 밀어주는 바람 정도로 보세요.', '배우자궁에 충이 드는 해에는 큰 결정을 서두르지 말고 충분히 대화하세요.'],
    children: ['자녀 기운이 들어오는 해는 인연이 닿기 쉬운 시기로 봅니다. 실제 계획은 건강 상태와 전문의 상담을 우선하세요.'],
    people: ['비겁(동료·친구)이 필요한 기운이면 사람을 통해 기회가 오고, 아니면 돈거래·동업을 조심하세요.'],
    move: ['역마나 충이 드는 해에 이사·이직·해외 기회가 오기 쉽습니다. 준비해 두면 기회를 잡기 좋습니다.'],
    health: ['사주로 보는 건강은 체질적인 경향일 뿐입니다. 증상이 있으면 꼭 병원 진료를 받으세요.'],
  };

  // 주제 + 시기 질문 (직장·재물·연애·결혼·시험·이사·자녀·인간관계·사업)
  function answerTopic(s, topic, t, Y) {
    const label = TOPICS.find(x => x.id === topic).label;
    const groups = topicGroups(s, topic);
    const groupText = groups.length ? `${groups.join('·')}` : '';
    const out = { topic, title: `${label}에 대한 답변`, points: [], advice: TOPIC_ADVICE[topic] || [], why: [], links: [] };
    out.why.push(`${label}은(는) ${groups.length ? `사주에서 ${groupText}의 기운으로 봅니다.` : '이동 관련 신살과 충으로 봅니다.'} 해마다 이 기운이 들어오는지, 그 기운이 나에게 필요한 기운(용신 ${s.yongsin.yongsin}·희신 ${s.yongsin.huisin})인지, 내 사주와 부딪히는지(충)를 함께 계산했습니다.`);
    out.why.push(`해석 기준: ${s.yongsin.method || '억부법'} (화면 위 '해석 방법'에서 바꿀 수 있어요)`);
    if (/(살|세)/.test(t.raw || '')) out.why.push('질문 속 나이는 한국식 세는 나이(태어난 해 1살)로 계산했습니다.');

    if (t.years.length && !t.when) {
      const rows = t.years.map(y => topicYear(s, y, topic));
      const r = rows[0];
      out.conclusion = `${r.year}년은 ${label} 면에서 ${r.score}점, ${verdictOf(r.score)}로 봅니다.`;
      for (const x of rows) {
        out.points.push(`${yearLine(x)}`);
        for (const n of x.notes) out.points.push(`근거: ${n}`);
        out.points.push(`그해 전체 흐름: ${x.factors.join(' / ')}${x.events.length ? ` · ${x.events.join(', ')}` : ''}`);
      }
      if (t.past) out.points.push(r.score < 52 ? `과거 시점이라면, 이 해에 ${label} 쪽으로 어려움이나 변화가 있었을 가능성이 높아요.` : `과거 시점이라면, 이 해에 ${label} 쪽으로 좋은 일이 있었을 가능성이 높아요.`);
      out.why.push('점수: 그해 전체 운(세운 60% + 대운 40%)에서 출발해, 주제 기운이 필요한 기운으로 들어오면 +10, 부담스러운 기운으로 들어오면 +4(기회와 부담이 함께) 등을 더했습니다.');
      return out;
    }

    const from = t.years[0] && t.years[0] >= Y ? t.years[0] : Y;
    const to = from + 9;
    const rows = rankYears(s, topic, from, to);
    const best = rows.slice().sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.year - b.year);
    const worst = rows.slice().sort((a, b) => a.score - b.score).slice(0, 2).sort((a, b) => a.year - b.year);
    const top = rows.slice().sort((a, b) => b.score - a.score)[0];
    out.conclusion = `${from}~${to}년 중 ${label}에 가장 힘이 실리는 해는 ${top.year}년(${top.age}세)입니다.`;
    out.points.push(`가장 좋은 시기: ${best.map(r => `${r.year}년(${r.score}점)`).join(', ')}`);
    for (const r of best) out.points.push(`${r.year}년 ${r.hanja}: ${reasonLine(r)}`);
    out.points.push(`조심할 시기: ${worst.map(r => `${r.year}년(${r.score}점)`).join(', ')}`);
    for (const r of worst) out.points.push(`${r.year}년 ${r.hanja}: ${reasonLine(r)}`);
    const cur = rows.find(r => r.year === Y);
    if (cur && from === Y) out.points.push(`올해(${Y}년)는 ${cur.score}점으로 ${verdictOf(cur.score)}입니다.`);
    if (topic === 'love' || topic === 'marriage') {
      const p = s.pillars.day;
      out.points.push(`배우자궁(일지 ${E.BRANCHES_HANJA[p.branch]})의 십성은 ${p.branchTenGod}입니다. ${I.TEN_GOD_INFO[p.branchTenGod].plain.split(' — ')[1] || ''} 성향의 상대와 인연이 깊다고 봅니다.`);
    }
    out.why.push(`10년 동안 해마다 ${label} 점수를 계산해 높은 순·낮은 순으로 골랐습니다: ${rows.map(r => `${r.year} ${r.score}`).join(', ')}`);
    out.links.push({ menu: 'life', label: '인생 흐름 보기' });
    return out;
  }

  function answerHealth(s, t, Y) {
    const sec = I.readFullSaju(s).sections.find(x => x.id === 'health');
    const rows = rankYears(s, 'health', Y, Y + 9);
    const worst = rows.slice().sort((a, b) => a.score - b.score).slice(0, 2).sort((a, b) => a.year - b.year);
    return {
      topic: 'health', title: '건강에 대한 답변', conclusion: plain(sec.lead),
      points: [...sec.paragraphs.map(plain).slice(0, 4), `컨디션 관리가 특히 필요한 해: ${worst.map(r => `${r.year}년(${r.score}점)`).join(', ')}`],
      advice: TOPIC_ADVICE.health, why: [...sec.why.map(plain), '운이 약한 해(기신이 들어오거나 충이 겹치는 해)는 몸과 마음이 지치기 쉬운 해로 봅니다.'],
      links: [{ menu: 'saju', label: '종합풀이 보기' }],
    };
  }

  function answerPersonality(s) {
    const r = I.readPersona(s);
    const pick = (id) => r.sections.find(x => x.id === id);
    return {
      topic: 'personality', title: '성격에 대한 답변', conclusion: `"${r.typeName}" — ${plain(r.oneLine)}`,
      points: [
        ...r.axes.map(a => `${a.left}↔${a.right}: ${a.value >= 60 ? a.right : a.value <= 40 ? a.left : '균형'} (${a.value}%) — ${a.text}`),
        ...pick('p-who').paragraphs.map(plain).slice(2, 4),
      ],
      advice: [plain(pick('p-stress').paragraphs[1])],
      why: [...pick('p-who').why.map(plain), ...r.axes.map(a => plain(a.why))],
      links: [{ menu: 'persona', label: '성격·성향 풀이 보기' }],
    };
  }

  function answerLucky(s) {
    const l = I.luckyItems(s), y = s.yongsin, info = I.ELEMENT_INFO[y.yongsin];
    return {
      topic: 'lucky', title: '행운과 개운법', conclusion: `나에게 필요한 기운은 ${y.yongsin}(${info.hanja})입니다. 이 기운을 가까이하면 균형이 맞춰진다고 봅니다.`,
      points: [`행운의 색: ${l.color}`, `좋은 방향: ${l.direction}`, `행운의 숫자: ${l.numbers}`, `도움이 되는 활동: ${info.acts}`, `잘 맞는 분야: ${info.careers}`, `피하면 좋은 기운: ${y.gisin}(${I.ELEMENT_INFO[y.gisin].hanja}) — 이 기운이 강한 해에는 무리하지 마세요.`],
      advice: ['개운법은 운을 바꾸는 마법이 아니라, 부족한 기운을 생활 속에서 의식적으로 채우는 습관입니다.'],
      why: [`해석 기준: ${y.method || '억부법'}. ${plain(y.reason || '')}`],
      links: [{ menu: 'saju', label: '용신 풀이 보기' }],
    };
  }

  function answerDaeun(s, Y) {
    const r = I.readDaeun(s, Y);
    if (!r) return null;
    const now = r.sections.find(x => x.id === 'daeun-now'), next = r.sections.find(x => x.id === 'daeun-next'), best = r.sections.find(x => x.id === 'daeun-best');
    return {
      topic: 'daeun', title: '대운에 대한 답변', conclusion: now ? `지금은 ${plain(now.lead)} 시기입니다.` : plain(r.sections[0].lead),
      points: [...(now ? now.paragraphs.map(plain).slice(0, 3) : []), next ? `다음 대운: ${plain(next.lead)}` : null, best ? `인생에서 가장 힘이 실리는 대운: ${plain(best.lead)}` : null].filter(Boolean),
      advice: ['대운은 10년의 큰 계절입니다. 순풍인 대운에는 확장을, 역풍인 대운에는 내실을 다지세요.'],
      why: [...r.sections[0].why.map(plain), ...(now ? now.why.map(plain) : [])],
      links: [{ menu: 'daeun', label: '대운 흐름 보기' }],
    };
  }

  function answerYear(s, y, Y, t = {}) {
    const r = I.readYear(s, y);
    const sec = r.sections[0];
    const se = r.pillar, dae = s.daeun ? E.currentDaeun(s, y) : null;
    const ys = I.yearScore(s, se, dae);
    const why = /왜|이유|때문/.test(t.raw || '');
    const reasons = [
      `그해 들어온 기운: ${ys.factors.join(' / ')}`,
      ...ys.events.map(e => `겹친 요인: ${e}`),
      `${y}년 종합 점수 ${ys.score}점 (세운 60% + 대운 40%, 평생 기준 ${ys.score <= 45 ? '낮은 편' : ys.score >= 62 ? '높은 편' : '보통'})`,
    ];
    const best = r.months.slice().sort((a, b) => b.score - a.score).slice(0, 2);
    const worst = r.months.slice().sort((a, b) => a.score - b.score).slice(0, 2);
    return {
      topic: 'year', title: `${y}년 운세`,
      conclusion: why || y < Y
        ? `${y}년(${se.hanja})은 ${ys.score <= 45 ? `나에게 방해되는 기운이 겹쳐 ${y < Y ? '힘들었을' : '힘들'} 가능성이 높은 해` : ys.score >= 62 ? `나에게 필요한 기운이 들어와 ${y < Y ? '잘 풀렸을' : '잘 풀릴'} 가능성이 높은 해` : '좋고 나쁨이 섞인 평탄한 해'}입니다.`
        : `${y}년은 ${r.score.score}점(${r.score.grade}) — ${plain(sec.lead)}`,
      points: [...(why || y < Y ? reasons : []), ...sec.paragraphs.map(plain).slice(1, 4), ...r.categories.map(([k, v]) => `${k}: ${v}`), `좋은 달: ${best.map(m => `${m.jie} 이후(${m.startDate.slice(5, 7)}월)`).join(', ')}`, `조심할 달: ${worst.map(m => `${m.jie} 이후(${m.startDate.slice(5, 7)}월)`).join(', ')}`],
      advice: [y < Y ? '지난 해의 흐름과 실제 경험을 비교해 보면 사주의 결을 이해하는 데 도움이 됩니다.' : '좋은 달에 중요한 일을 배치하고, 조심할 달에는 일정을 여유 있게 잡으세요.'],
      why: [...sec.why.map(plain), ...r.score.why],
      links: [{ menu: 'year', label: '신년운세 보기' }],
    };
  }

  function answerMonth(s, t, Y, now) {
    const m = t.month || now.getMonth() + 1;
    const y = t.years[0] || Y;
    // 양력 m월 중순이 속한 절기 달
    const list = [...E.getWolun(s, y - 1), ...E.getWolun(s, y)];
    const target = `${y}-${String(m).padStart(2, '0')}-15`;
    const mo = list.filter(x => x.startDate.slice(0, 10) <= target).pop();
    const sc = I.luckScore(s, mo);
    const god = mo.stemTenGod;
    return {
      topic: 'month', title: `${y}년 ${m}월 운세`, conclusion: `${y}년 ${m}월(${mo.jie} 이후, ${mo.hanja})은 ${sc.score}점 — ${sc.grade}입니다.`,
      points: [`흐름: ${I.TEN_GOD_INFO[god].short}`, `${god}: ${I.TEN_GOD_INFO[god].day}`, ...mo.relations.slice(0, 3).map(r => `${r.name}: ${r.type === '충' ? '변동·마찰' : ['육합', '삼합', '반합', '천간합'].includes(r.type) ? '화합·인연' : '작은 마찰'}`)],
      advice: [sc.score >= 65 ? '이 달에 중요한 약속이나 시작을 배치해도 좋습니다.' : sc.score < 50 ? '이 달에는 큰 결정을 미루고 컨디션 관리에 신경 쓰세요.' : '평소 페이스를 유지하면 무난합니다.'],
      why: [`달은 절기 기준이라 ${mo.jie}(${mo.startDate.slice(0, 10)})부터 ${mo.hanja} 달입니다.`, ...sc.why],
      links: [{ menu: 'year', label: '월별 운세 보기' }],
    };
  }

  function answerToday(s, now) {
    const r = I.readToday(s, now);
    return {
      topic: 'today', title: '오늘의 운세', conclusion: `오늘(${r.pillar.hanja})은 ${r.score.score}점 — ${plain(r.sections[0].lead)}`,
      points: r.categories.map(([k, v]) => `${k}: ${v}`),
      advice: [`행운의 색 ${r.lucky.color}, 방향 ${r.lucky.direction}`],
      why: r.sections[0].why.map(plain),
      links: [{ menu: 'today', label: '오늘의 운세 보기' }],
    };
  }

  function answerPeriods(s, kind, t, now) {
    const r = I.readLifeFlow(s, now);
    const ids = kind === 'hard' ? (t.past ? ['life-past-hard'] : ['life-future-hard', 'life-past-hard']) : (t.past ? ['life-past-good'] : ['life-future-good', 'life-past-good']);
    const secs = ids.map(id => r.sections.find(x => x.id === id));
    return {
      topic: kind, title: kind === 'hard' ? '힘든 시기에 대한 답변' : '좋은 시기에 대한 답변', conclusion: plain(secs[0].lead),
      points: secs.flatMap((x, i) => [i ? `참고 — ${x.title}: ${plain(x.lead)}` : null, ...x.paragraphs.map(plain).slice(0, i ? 2 : 4)]).filter(Boolean),
      advice: [kind === 'hard' ? '힘든 시기는 피할 수 없는 벌이 아니라 속도를 줄이라는 신호입니다. 건강·계약·큰 지출을 특히 점검하세요.' : '좋은 시기에 맞춰 미리 준비해 두면 기회를 놓치지 않습니다.'],
      why: [...secs[0].why.map(plain), plain(r.sections[0].why[0])],
      links: [{ menu: 'life', label: '인생 흐름 보기' }],
    };
  }

  function answerCompat(s, partners, now, q = '') {
    if (!partners.length) {
      return {
        topic: 'compat', title: '궁합에 대한 답변', conclusion: '아직 상대방 정보가 없어 궁합을 볼 수 없어요.',
        points: ['궁합 메뉴에서 상대방(최대 2명)의 생년월일시를 입력하면, 이 Q&A에서도 상대에 대해 물어볼 수 있어요.'],
        advice: [], why: [], links: [{ menu: 'compat', label: '궁합 보러 가기', input: true }],
      };
    }
    if (partners.length === 2) {
      const c = I.compareCompat(s, partners[0], partners[1]);
      return {
        topic: 'compat', title: '두 사람 비교', conclusion: plain(c.section.lead),
        points: [...c.section.paragraphs.map(plain).slice(1), ...c.results.map(r => `${r.names[1]}: ${r.score}점(${r.grade}) — 잘 맞는 점 ${r.good.slice(0, 2).join(', ') || '없음'}`)],
        advice: c.results.flatMap(r => r.advice.slice(0, 1).map(a => `${r.names[1]}와(과): ${plain(a)}`)),
        why: c.section.why.map(plain), links: [{ menu: 'compat', label: '궁합 자세히 보기' }],
      };
    }
    const r = I.readCompat(s, partners[0], now);
    const fight = r.sections.find(x => x.id === 'compat-fight'), timing = r.sections.find(x => x.id === 'compat-timing');
    if (/언제|해는|시기|몇 년|결혼/.test(q)) {
      return {
        topic: 'compat', title: `${r.names[0]} ♥ ${r.names[1]} 함께하는 시기`, conclusion: plain(timing.lead),
        points: [...timing.paragraphs.map(plain), `두 사람 궁합: ${r.grade} (${r.score}점)`],
        advice: [r.timing.marry.length ? '좋은 해에 맞춰 상견례·예식 준비를 1년 전부터 시작해 보세요.' : '시기보다 두 사람의 준비가 더 중요합니다. 생활·돈·가족에 대한 대화를 먼저 충분히 나누세요.', ...r.advice.slice(0, 1).map(plain)],
        why: timing.why.map(plain), links: [{ menu: 'compat', label: '궁합 자세히 보기' }],
      };
    }
    return {
      topic: 'compat', title: `${r.names[0]} ♥ ${r.names[1]} 궁합`, conclusion: `${r.grade} (${r.score}점)`,
      points: [...(r.good.length ? [`잘 맞는 점: ${r.good.slice(0, 3).join(' / ')}`] : []), ...(r.caution.length ? [`조심할 점: ${r.caution.slice(0, 3).join(' / ')}`] : []), plain(fight.lead), ...timing.paragraphs.map(plain)],
      advice: r.advice.map(plain), why: r.sections[0].why.map(plain), links: [{ menu: 'compat', label: '궁합 자세히 보기' }],
    };
  }

  const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  const STEMS_BY_EL = { 목: '갑·을', 화: '병·정', 토: '무·기', 금: '경·신', 수: '임·계' };
  const SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];

  // 나에게 어울리는 상대 유형: 용신·배우자 별 오행의 일간, 배우자궁 성향, 합이 되는 띠, 성향 보완
  function answerIdeal(s) {
    const y = s.yongsin, star = starGroup(s);
    const starEl = I.ELEMENT_INFO && ['목', '화', '토', '금', '수'][(['목', '화', '토', '금', '수'].indexOf(s.dayMaster.element) + ['비겁', '식상', '재성', '관성', '인성'].indexOf(star)) % 5];
    const yb = s.pillars.year.branch;
    const group = SAMHAP.find(g => g.includes(yb)).filter(b => b !== yb);
    const yuk = (13 - yb) % 12;
    const ax = I.personaAxes(s);
    const day = s.pillars.day;
    const comp = [];
    if (ax[3].value >= 60) comp.push('내가 주도적인 편이라, 의견을 존중해 주면서도 자기 중심이 있는 사람');
    else if (ax[3].value <= 40) comp.push('내가 맞춰 주는 편이라, 방향을 잡아 주는 든든한 사람');
    if (ax[0].value <= 40) comp.push('혼자만의 시간을 존중해 주는 차분한 사람');
    else if (ax[0].value >= 60) comp.push('함께 어울리는 걸 즐기는 활발한 사람');
    if (ax[1].value <= 40) comp.push('감정을 따뜻하게 표현해 주는 사람(내가 이성적인 편이라 보완이 됨)');
    return {
      topic: 'ideal', title: '나에게 어울리는 상대', conclusion: `${y.yongsin}(${I.ELEMENT_INFO[y.yongsin].hanja}) 기운을 가진 사람, 그리고 ${SPOUSE_LINE(day.branchTenGod)}이 잘 맞아요.`,
      points: [
        `사주로 본 상대: 일간이 ${STEMS_BY_EL[y.yongsin]}(${y.yongsin})인 사람은 나에게 필요한 기운을 채워 주고, ${STEMS_BY_EL[starEl]}(${starEl})인 사람은 내 배우자 별의 기운이라 이성으로 끌리기 쉬워요.`,
        `배우자궁: 일지 ${E.BRANCHES_HANJA[day.branch]}의 십성이 ${day.branchTenGod} — ${I.TEN_GOD_INFO[day.branchTenGod].plain.split(' — ')[1] || day.branchTenGod} 성향의 상대와 인연이 깊어요.`,
        `잘 맞는 띠: ${group.map(b => ANIMALS[b]).join('·')}띠(삼합), ${ANIMALS[yuk]}띠(육합)`,
        `조심할 띠: ${ANIMALS[(yb + 6) % 12]}띠(충) — 끌림은 강하지만 생활 방식이 부딪히기 쉬워요.`,
        ...comp.map(c => `성향 보완: ${c}`),
      ],
      advice: ['특정 상대가 있다면 궁합 메뉴에서 생년월일을 넣어 보세요. 8개 항목으로 자세히 비교해 드려요.'],
      why: [
        `용신 ${y.yongsin}: 내 사주의 균형을 맞추는 기운(해석 기준: ${y.method || '억부법'})`,
        `배우자 별: ${isMale(s) ? '남성은 재성' : '여성은 관성'} = ${starEl} 기운`,
        `띠 궁합은 내 띠(${ANIMALS[yb]})와 삼합·육합이 되는 띠를 골랐습니다.`,
        ...ax.map(a => `${a.left}↔${a.right}: ${a.value}%`),
      ],
      links: [{ menu: 'compat', label: '궁합 보러 가기', input: true }],
    };
  }
  const SPOUSE_LINE = (god) => ({
    비견: '친구처럼 대등한 사람', 겁재: '활동적이고 승부욕 있는 사람', 식신: '다정하고 편안한 사람', 상관: '재치 있고 개성 강한 사람',
    편재: '사교적이고 통 큰 사람', 정재: '알뜰하고 성실한 사람', 편관: '카리스마 있는 사람', 정관: '반듯하고 책임감 있는 사람',
    편인: '생각이 깊고 독특한 사람', 정인: '포근하게 챙겨 주는 사람',
  }[god]);

  function answerMethod(s) {
    const m = s.methods;
    return {
      topic: 'method', title: '해석 방법에 대한 답변', conclusion: `지금은 "${(m.byId[s.method] || m.byId.consensus).name}" 기준으로 풀고 있어요. 방법마다 중시하는 것이 달라 결론이 갈릴 수 있습니다.`,
      points: M.METHOD_ORDER.map(id => `${m.byId[id].name}: ${m.byId[id].verdict}`),
      advice: ['여러 방법이 같은 기운을 가리키면 그만큼 확실한 결론으로 보고, 갈리면 각 방법이 무엇을 중시했는지 비교해 보세요.'],
      why: M.METHOD_ORDER.map(id => `${M.METHOD_INFO[id].name}: ${M.METHOD_INFO[id].short}`),
      links: [{ menu: 'saju', label: '방법별 비교 보기' }],
    };
  }

  function answerGeneral(s, Y, now) {
    const full = I.readFullSaju(s);
    const yr = I.readYear(s, Y);
    return {
      topic: 'general', title: '사주로 본 답변', conclusion: `질문의 주제를 정확히 알아듣지 못했어요. 대신 지금 사주의 핵심을 정리해 드릴게요.`,
      points: [plain(full.summary.line), `${Y}년: ${yr.score.score}점(${yr.score.grade}) — ${plain(yr.sections[0].lead)}`, ...full.sections.filter(x => ['personality', 'wealth', 'career', 'love'].includes(x.id)).map(x => `${x.title}: ${plain(x.lead)}`)],
      advice: ['"언제 이직하면 좋을까?", "2028년 재물운은?", "결혼은 언제쯤?", "나는 어떤 성격이야?"처럼 주제와 시기를 넣어 물어보면 더 정확히 답할 수 있어요.', '자유로운 질문에는 AI 상담 모드가 더 잘 답합니다.'],
      why: [], links: [{ menu: 'saju', label: '종합풀이 보기' }],
    };
  }

  // 질문 → 답변 객체 { topic, title, conclusion, points[], advice[], why[], links[] }
  function answer(s, question, ctx = {}) {
    const now = ctx.now || new Date();
    const Y = now.getFullYear();
    const q = String(question || '').trim();
    const topic = detectTopic(q);
    const t = parseTime(q, s, Y, now);
    const id = topic?.id;
    let out;
    const aboutUs = /우리|둘이|두 사람|그 사람|상대|같이|함께|남자친구랑|여자친구랑/.test(q);
    if ((id === 'marriage' || id === 'love') && aboutUs && (ctx.partners || []).length) out = answerCompat(s, ctx.partners, now, q);
    else if (['career', 'business', 'money', 'exam', 'love', 'marriage', 'children', 'people', 'move'].includes(id)) out = answerTopic(s, id, t, Y);
    else if (id === 'health') out = answerHealth(s, t, Y);
    else if (id === 'personality') out = answerPersonality(s);
    else if (id === 'ideal') out = answerIdeal(s);
    else if (id === 'lucky') out = answerLucky(s);
    else if (id === 'daeun') out = answerDaeun(s, Y);
    else if (id === 'method') out = answerMethod(s);
    else if (id === 'today') out = answerToday(s, now);
    else if (id === 'compat') out = answerCompat(s, ctx.partners || [], now);
    else if (id === 'hard' || id === 'good') out = answerPeriods(s, id, t, now);
    else if (id === 'month' || (t.month && !id)) out = answerMonth(s, t, Y, now);
    else if (id === 'year' || t.years.length) out = answerYear(s, t.years[0] || Y, Y, t);
    if (!out) out = answerGeneral(s, Y, now);
    out.question = q;
    out.points = out.points.map(I.fixJosa);
    out.conclusion = I.fixJosa(out.conclusion);
    return out;
  }

  const SUGGESTIONS = {
    saju: ['나에게 맞는 직업은 뭐야?', '돈이 모이는 시기는 언제야?', '내 약점은 뭐고 어떻게 보완해?'],
    persona: ['나는 어떤 사람과 잘 맞아?', '스트레스 받을 때 어떻게 풀면 좋아?', '내 장점을 살리려면?'],
    life: ['앞으로 가장 힘든 시기는 언제야?', '작년에 왜 힘들었을까?', '인생에서 가장 잘 풀리는 때는?'],
    today: ['오늘 중요한 미팅 괜찮을까?', '이번 달 운세는?', '내일은 어때?'],
    year: ['올해 이직해도 될까?', '내년 재물운은?', '올해 조심할 달은?'],
    daeun: ['지금 대운은 어떤 시기야?', '다음 대운에는 뭐가 달라져?', '가장 좋은 대운은 언제야?'],
    compat: ['우리 결혼하기 좋은 해는?', '자주 싸우는 이유가 뭘까?', '누구와 더 잘 맞아?'],
    qa: ['언제 이직하면 좋을까?', '결혼은 언제쯤 할까?', '2028년 재물운은?', '나는 어떤 성격이야?', '앞으로 조심할 시기는?', '행운의 색은?'],
  };

  // ============================================================
  // AI 상담용 사주 보고서
  // ============================================================

  function buildReport(s, partners = [], now = new Date()) {
    const Y = now.getFullYear();
    const lines = [];
    const h = (t) => lines.push(`\n## ${t}`);
    const add = (t) => lines.push(plain(t));
    const sec = (x) => { add(`### ${x.title}`); add(`요약: ${x.lead}`); x.paragraphs.forEach(p => add(`- ${p}`)); if (x.why.length) add(`근거: ${x.why.map(plain).join(' / ')}`); };
    const p = s.pillars, b = s.birth;

    h('기본 정보');
    add(`오늘 날짜: ${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);
    add(`이름: ${s.name} / 성별: ${isMale(s) ? '남' : '여'} / 띠: ${s.animal}`);
    add(`양력 ${b.solarDate.year}-${b.solarDate.month}-${b.solarDate.day}, 음력 ${s.lunar.year}-${s.lunar.isLeapMonth ? '윤' : ''}${s.lunar.month}-${s.lunar.day}, ${b.hourKnown ? `입력 시각 ${b.clock.slice(11)} → 보정 ${b.corrected.slice(11)}` : '태어난 시간 모름(시주 없음)'}`);
    add('사주팔자 (기둥: 천간/지지, 천간 십성/지지 십성, 지장간, 12운성, 12신살):');
    for (const [k, l] of [['year', '년주'], ['month', '월주'], ['day', '일주'], ['hour', '시주']]) {
      const x = p[k];
      if (x) add(`- ${l} ${x.hanja}(${x.text}): ${x.stemTenGod}/${x.branchTenGod}, 지장간 ${x.hiddenStems.map(z => z.text).join('')}, ${x.twelveStage}, ${x.sinsal12.byYear}`);
    }
    add(`오행 개수/비중: ${Object.entries(s.elements.count).map(([e, c]) => `${e} ${c}개(${s.elements.percent[e]}%)`).join(', ')}`);
    add(`신강약: ${s.strength.level}(${s.strength.score}점) / 격국: ${s.gyeokguk.name} / 공망: ${s.gongmang.hanja}`);
    add(`합충: ${s.relations.map(r => r.name).join(', ') || '없음'} / 신살: ${[...new Set(s.sinsal.map(x => x.name))].join(', ') || '없음'}`);

    h('해석 방법과 용신');
    add(`현재 해석 기준: ${s.yongsin.method || '억부법'} → 용신 ${s.yongsin.yongsin}, 희신 ${s.yongsin.huisin}, 기신 ${s.yongsin.gisin}, 구신 ${s.yongsin.gusin}`);
    if (s.methods) for (const id of M.METHOD_ORDER) { const m = s.methods.byId[id]; add(`- ${m.name}: ${m.verdict}${m.kind === 'yongsin' ? ` (용신 ${m.yongsin}${m.applicable ? '' : ', 조건 불충족→억부'})` : ''}`); }

    h('종합풀이');
    I.readFullSaju(s).sections.forEach(sec);

    h('성격·성향');
    const pe = I.readPersona(s);
    add(`유형: ${pe.typeName} — ${pe.oneLine}`);
    pe.axes.forEach(a => add(`- ${a.left}↔${a.right}: ${a.right} 쪽 ${a.value}% (${a.text})`));
    pe.sections.forEach(sec);

    if (s.daeun) {
      h('대운 (10년 운)');
      add(`${s.daeun.direction}, 대운수 ${s.daeun.daeunNum}, 첫 대운 시작 ${s.daeun.startDate}`);
      I.readDaeun(s, Y).list.forEach(d => add(`- ${d.age}세(${d.startYear}~) ${d.hanja}: ${d.stemTenGod}/${d.branchTenGod}, ${d.twelveStage}, 점수 ${d.score}${d.current ? ' ← 현재' : ''}`));
    }

    h('인생 흐름 (해마다 운 점수: 세운 60% + 대운 40%, 충·삼재 보정)');
    const life = I.readLifeFlow(s, now);
    add(`힘든 시기 기준 ${life.hardCut}점 이하, 잘 풀리는 시기 기준 ${life.goodCut}점 이상`);
    add(life.points.filter(x => x.year >= Y - 30 && x.year <= Y + 30).map(x => `${x.year}(${x.age}세) ${x.seun.hanja} ${x.score}${x.events.length ? `[${x.events.join('; ')}]` : ''}`).join(' | '));
    life.sections.forEach(sec);

    for (const y of [Y, Y + 1]) {
      h(`${y}년 운세`);
      const r = I.readYear(s, y);
      add(`${r.pillar.hanja}년, ${r.score.score}점(${r.score.grade}), 천간 ${r.pillar.stemTenGod}/지지 ${r.pillar.branchTenGod}${r.pillar.samjae ? `, ${r.pillar.samjae}` : ''}`);
      r.sections.forEach(sec);
      r.categories.forEach(([k, v]) => add(`- ${k}: ${v}`));
      add('월별: ' + r.months.map(m => `${m.startDate.slice(0, 10)}~ ${m.hanja} ${m.score}점(${m.stemTenGod}, ${m.line})`).join(' | '));
    }

    h('오늘');
    const td = I.readToday(s, now);
    add(`${td.pillar.hanja}일, ${td.score.score}점 — ${td.sections[0].lead}`);

    if (partners.length) {
      h('궁합');
      for (const o of partners) {
        const c = I.readCompat(s, o, now);
        add(`### ${c.names[0]} ♥ ${c.names[1]}: ${c.score}점(${c.grade})`);
        add(`상대 정보: ${o.name}, ${isMale(o) ? '남' : '여'}, ${o.birth.solarDate.year}-${o.birth.solarDate.month}-${o.birth.solarDate.day}, 사주 ${['year', 'month', 'day', 'hour'].filter(k => o.pillars[k]).map(k => o.pillars[k].hanja).join(' ')}, 일간 ${o.dayMaster.text}${o.dayMaster.element}, 용신 ${o.yongsin.yongsin}`);
        c.categories.forEach(x => add(`- ${x.title} ${x.score}점(비중 ${x.weight}%): ${x.verdict} — ${x.text}`));
        c.sections.forEach(sec);
      }
      if (partners.length === 2) { const cmp = I.compareCompat(s, partners[0], partners[1]); sec(cmp.section); }
    }
    return lines.join('\n');
  }

  // AI 상담 지침 (고정 문자열이라 프롬프트 캐시가 잘 맞는다)
  const SYSTEM_PROMPT = `당신은 사주명리 상담가입니다. 사용자는 이 사이트에서 자신의 사주 풀이를 본 뒤 질문합니다. 함께 제공되는 <saju_report>는 이 사이트의 계산 엔진이 만든 분석 결과이며, 답변의 유일한 근거입니다.

답변 원칙
1. 근거는 반드시 <saju_report>에서 찾으세요. 보고서에 없는 간지·점수·신살을 새로 계산하거나 지어내지 마세요. 보고서의 데이터(연도별 점수, 대운, 십성, 월별 점수)를 조합해 추론할 수는 있지만, 그럴 때는 추론이라고 밝히세요.
2. 구성: 첫 문단에 질문에 대한 결론을 한두 문장으로 먼저 말하세요. 이어서 "### 근거"에 어떤 글자·운·점수 때문인지 2~4개를 목록으로, "### 조언"에 실천할 수 있는 조언 1~3개를 쓰세요. 시기를 묻는 질문에는 연도와 나이를 구체적으로 답하세요.
3. 일반인이 이해할 수 있는 쉬운 말로 쓰고, 전문 용어는 처음 나올 때 괄호로 짧게 풀이하세요. 짧은 문단과 목록을 쓰고, 마크다운은 **굵게**, 목록(-), 소제목(###)만 쓰세요.
4. 사주는 경향을 보여 줄 뿐 확정된 미래가 아닙니다. 단정하지 말고 가능성으로 말하고, 불안을 키우는 표현은 피하세요. 좋은 점과 조심할 점을 균형 있게 말하세요.
5. 건강·법률·투자·임신처럼 실제 결정이 걸린 질문에는 사주 관점의 답 뒤에 전문가 상담을 함께 권하세요.
6. 보고서에 궁합 정보가 있으면 상대에 대한 질문에 활용하세요. 없으면 궁합 메뉴에서 상대를 입력하라고 안내하세요.
7. 사주와 무관한 질문에는 사주로 답할 수 있는 범위를 정중히 안내하세요.
8. 한국어로 답하세요.`;

  const api = { answer, buildReport, SYSTEM_PROMPT, SUGGESTIONS, TOPICS, detectTopic, parseTime, topicYear };
  if (node) module.exports = api;
  else root.SajuQA = api;
})(typeof window !== 'undefined' ? window : globalThis);
