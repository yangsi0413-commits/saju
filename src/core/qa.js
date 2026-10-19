// 사주 Q&A
// answer(): 질문의 주제·시점·형태를 읽고, 이미 계산된 사주 데이터로 결론 → 근거 → 조언을 만든다

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
    out.why.push(`${josa(label, '은/는')} ${groups.length ? `사주에서 ${groupText}의 기운으로 봅니다.` : '이동 관련 신살과 충으로 봅니다.'} 해마다 이 기운이 들어오는지, 그 기운이 나에게 필요한 기운(용신 ${s.yongsin.yongsin}·희신 ${s.yongsin.huisin})인지, 내 사주와 부딪히는지(충)를 함께 계산했습니다.`);
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

  // 연애·결혼: 배우자 정밀 분석(배우자 별·배우자궁·방해 구조·결혼 신살)과 해마다 인연 기운
  function answerSpouse(s, topic, t, Y) {
    const sp = I.analyzeSpouse(s);
    const label = topic === 'marriage' ? '결혼' : '연애';
    const birth = s.birth.solarDate.year;
    const head = [
      `배우자운: ${sp.grade} (지수 ${sp.index}점)`,
      ...sp.factors.slice().sort((x, y) => Math.abs(y.w) - Math.abs(x.w)).slice(0, 2).map(f => `${f.title}: ${f.text}`),
    ];
    const why = [
      `${isMale(s) ? '남성은 재성(정재=아내, 편재=연인)' : '여성은 관성(정관=남편, 편관=연인)'}을 배우자의 별로 봅니다. 원국 위치: ${sp.occText}`,
      '해마다 인연 기운: 배우자 별이 그해 천간(정 +25·편 +18)·지지(정 +20·편 +14)에 들어오는지, 배우자궁과 육합(+18)·삼합(+10)·충(+6), 홍란(+12)·천희(+8)·도화(+6), 대운의 배우자 별(+8), 그해 전체 운을 더해 계산했습니다.',
      `배우자운 요인: ${sp.factors.map(f => `${f.title} ${f.w > 0 ? '+' : ''}${f.w}`).join(', ')}`,
    ];
    if (t.years.length && !t.when) {
      const rows = t.years.map(y => I.marriageYears(s, y, y)[0]);
      const r = rows[0];
      const lv = r.score >= 35 ? '인연 기운이 강한 해' : r.score >= 20 ? '인연 기운이 있는 해' : '인연 기운이 약한 해';
      return {
        topic, title: `${label}에 대한 답변`, conclusion: `${r.year}년(${r.age}세)은 ${label} 면에서 ${lv}입니다 (${r.score}점).`,
        points: [...rows.map(x => `${x.year}년 ${x.hanja}: ${x.reasons.length ? x.reasons.join(', ') : '배우자 별·배우자궁에 들어오는 기운이 없음'} (그해 전체 운 ${x.overall}점)`), ...head],
        advice: [r.score >= 35 ? (r.year < Y ? '이 해에 연애나 결혼과 관련된 일이 있었는지 떠올려 보세요.' : '소개·모임에 적극적으로 나가고, 마음에 둔 사람이 있다면 관계를 진전시키기 좋은 해예요.') : '이 해에는 새 인연보다 지금 관계를 다지거나 자신을 가꾸는 데 집중해 보세요.'],
        why, links: [{ menu: 'saju', label: '연애·결혼운 자세히 보기' }],
      };
    }
    const past = t.past && !t.years.length;
    const from = past ? birth + 19 : Math.max(Y, t.years[0] || Y), to = past ? Y - 1 : from + 11;
    const rows = I.marriageYears(s, from, to);
    const best = rows.slice().sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.year - b.year);
    return {
      topic, title: `${label}에 대한 답변`,
      conclusion: past ? `지나온 해 중 ${label} 기운이 가장 강했던 해는 ${best.map(x => `${x.year}년(${x.age}세)`).join(', ')}입니다.` : `${from}~${to}년 중 ${label} 기운이 가장 강한 해는 ${best.map(x => `${x.year}년(${x.age}세)`).join(', ')}입니다.`,
      points: [...best.map(x => `${x.year}년 ${x.hanja} (${x.score}점): ${x.reasons.join(', ') || '그해 전체 운이 좋음'}`), ...head],
      advice: [past ? '이 해들에 실제로 연애·결혼과 관련된 일이 있었는지 비교해 보면, 앞으로의 인연 시기를 가늠하는 데 도움이 돼요.' : topic === 'marriage' ? '결혼은 두 사람의 준비가 가장 중요합니다. 좋은 해는 그 결정을 밀어주는 바람 정도로 보세요.' : '인연 기운이 강한 해에는 소개·모임에 적극적으로 나가 보세요.'],
      why: [...why, `연도별 인연 점수: ${rows.map(x => `${x.year} ${x.score}`).join(', ')}`],
      links: [{ menu: 'saju', label: '연애·결혼운 자세히 보기' }],
    };
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
        advice: c.results.flatMap(r => r.advice.slice(0, 1).map(a => `${josa(r.names[1], '과/와')}: ${plain(a)}`)),
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
      advice: ['"언제 이직하면 좋을까?", "2028년 재물운은?", "결혼은 언제쯤?", "나는 어떤 성격이야?"처럼 주제와 시기를 넣어 물어보면 더 정확히 답할 수 있어요.'],
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
    else if (id === 'love' || id === 'marriage') out = answerSpouse(s, id, t, Y);
    else if (['career', 'business', 'money', 'exam', 'children', 'people', 'move'].includes(id)) out = answerTopic(s, id, t, Y);
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

  const api = { answer, SUGGESTIONS, TOPICS, detectTopic, parseTime, topicYear };
  if (node) module.exports = api;
  else root.SajuQA = api;
})(typeof window !== 'undefined' ? window : globalThis);
