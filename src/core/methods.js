// 해석 방법(학파)별 풀이
// - 용신을 정하는 방법 5가지: 억부·조후·격국·통관·병약 → 고르면 사이트 전체의 용신이 바뀐다
// - 읽는 관점 2가지: 신살 위주·물상론 → 용신은 그대로, 같은 사주를 다른 시선으로 읽는다
// - 종합: 다섯 방법의 결론을 투표처럼 모은다 (기본값)
// 결과 문장의 [[용어]]는 interpret.js의 GLOSSARY를 가리킨다.

(function (root) {
  const E = typeof module !== 'undefined' && typeof require !== 'undefined'
    ? require('./saju.js')
    : { STEMS, STEMS_HANJA, BRANCHES, BRANCHES_HANJA, STEM_ELEMENT, BRANCH_ELEMENT, sinsal12 };
  const DB = typeof module !== 'undefined' && typeof require !== 'undefined' ? require('../data/myeongri.js') : root.Myeongri;

  const ELS = ['목', '화', '토', '금', '수'];
  const HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
  const GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
  const idx = (e) => ELS.indexOf(e);
  const el = (i) => ELS[((i % 5) + 5) % 5];
  const elName = (e) => `${e}(${HANJA[e]})`;
  const groupEl = (s, g) => el(idx(s.dayMaster.element) + GROUPS.indexOf(g));
  const groupOf = (s, e) => GROUPS[(((idx(e) - idx(s.dayMaster.element)) % 5) + 5) % 5];
  const round1 = (v) => Math.round(v * 10) / 10;

  // 조사 보정: 괄호·한자·오행 한 글자 뒤의 은/는, 이/가, 을/를, 과/와를 받침에 맞춘다
  const READ = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' };
  E.STEMS_HANJA.forEach((h, i) => { READ[h] = E.STEMS[i]; });
  E.BRANCHES_HANJA.forEach((h, i) => { READ[h] = E.BRANCHES[i]; });
  // 마지막 글자의 받침 번호 (0 = 받침 없음, 8 = ㄹ)
  const jong = (w) => {
    const str = w.replace(/\([^)]*\)$/, '');
    const c = (READ[str[str.length - 1]] || str[str.length - 1]).charCodeAt(0);
    return c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : 0;
  };
  const batchim = (w) => jong(w) !== 0;
  const PAIR = { 은: ['은', '는'], 는: ['은', '는'], 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'] };
  const fix = (t) => t.replace(/([가-힣]+\([^)]*\)|[\u4e00-\u9fff]|(?<![가-힣])[목화토금수])(으로|로|은|는|이|가|을|를|과|와)(?=[\s,.!?:)]|$)/g,
    (m, w, j) => w + (j === '으로' || j === '로' ? (jong(w) === 0 || jong(w) === 8 ? '로' : '으로') : PAIR[j][batchim(w) ? 0 : 1]));
  const fixAll = (r) => ({ ...r, verdict: fix(r.verdict), paragraphs: r.paragraphs.map(fix), why: r.why.map(fix) });

  const METHOD_INFO = {
    consensus: {
      name: '종합', hanja: '綜合', kind: 'yongsin', source: '여러 방법의 합의',
      short: '여러 해석 방법의 결론을 모아, 가장 많이 가리키는 기운을 고릅니다.',
      how: '억부·조후·격국·통관·병약 다섯 방법을 모두 적용한 뒤 투표하듯 모읍니다. 한 방법에 치우치지 않아 가장 무난한 결론입니다.',
    },
    eokbu: {
      name: '억부법', hanja: '抑扶', kind: 'yongsin', source: '근대 명리학의 표준',
      short: '강한 것은 누르고(억), 약한 것은 돕는다(부).',
      how: '일간(나)의 힘이 센지 약한지를 먼저 잽니다. 힘이 넘치면 덜어 주는 기운을, 모자라면 채워 주는 기운을 용신으로 씁니다. 가장 기본적이고 널리 쓰이는 방법입니다.',
    },
    johu: {
      name: '조후법', hanja: '調候', kind: 'yongsin', source: '『궁통보감(난강망)』',
      short: '태어난 계절의 추위·더위, 건조함·습함을 맞춘다.',
      how: '사람도 자연의 일부라, 한겨울에 태어나면 따뜻한 불이, 한여름에 태어나면 시원한 물이 먼저 필요하다고 봅니다. 궁통보감의 조후 용신표(일간 10 × 태어난 달 12)에서 1순위 천간을 용신으로 쓰고, 사주의 온도·습도로 얼마나 시급한지를 봅니다.',
    },
    gyeok: {
      name: '격국법', hanja: '格局', kind: 'yongsin', source: '『자평진전』',
      short: '태어난 달로 사주의 그릇(격)을 정하고, 그 그릇을 살리는 기운을 찾는다.',
      how: '태어난 달에서 드러난 십성으로 격(예: 정관격)을 정한 뒤, 그 격이 제대로 쓰이도록 돕는 기운(상신)을 용신으로 씁니다. 사회적 쓰임과 직업을 볼 때 강합니다.',
    },
    tonggwan: {
      name: '통관법', hanja: '通關', kind: 'yongsin', source: '『적천수』',
      short: '두 기운이 맞서 싸울 때 그 사이를 이어 주는 기운을 쓴다.',
      how: '예를 들어 금과 목이 팽팽하게 부딪히면, 금이 낳고 목을 키우는 수(水)가 다리를 놓아 싸움을 화해로 바꿉니다. 비슷한 세력의 두 기운이 대립할 때만 씁니다.',
    },
    byeongyak: {
      name: '병약법', hanja: '病藥', kind: 'yongsin', source: '『신봉통고』',
      short: '사주의 가장 큰 문제(병)를 찾고, 그것을 고치는 기운(약)을 쓴다.',
      how: '"병이 있어야 귀하다"는 말처럼, 한 기운이 지나치게 많은 것을 병으로 보고 그것을 다스리는 기운을 약(용신)으로 씁니다. 약이 들어오는 시기에 크게 발전한다고 봅니다.',
    },
    sinsal: {
      name: '신살 위주', hanja: '神煞', kind: 'lens', source: '당사주·민간 명리',
      short: '귀인과 살(煞) 같은 별을 중심으로 삶의 사건을 읽는다.',
      how: '천을귀인, 도화살, 역마살처럼 특정 글자 조합에 붙은 별로 성향과 사건(이동, 인기, 도움)을 풉니다. 대중적인 풀이에서 많이 쓰는 방식이며, 용신은 정하지 않습니다.',
    },
    mulsang: {
      name: '물상론', hanja: '物象', kind: 'lens', source: '현대 물상 명리',
      short: '여덟 글자를 자연 풍경으로 그려서 읽는다.',
      how: '庚金은 무쇠, 丁火는 촛불처럼 글자를 사물로 보고, 태어난 계절과 주변 글자로 한 폭의 풍경을 그립니다. "용광로에서 단련되는 무쇠"처럼 직관적으로 이해하기 쉽습니다. 용신은 정하지 않습니다.',
    },
  };
  const YONGSIN_METHODS = ['eokbu', 'johu', 'gyeok', 'tonggwan', 'byeongyak'];
  const METHOD_ORDER = ['consensus', ...YONGSIN_METHODS, 'sinsal', 'mulsang'];

  // 용신 오행 하나로 희신·기신·구신·한신까지 정한다 (saju.js의 억부 결과와 같은 규칙)
  function yongsinSet(s, y, extra = {}) {
    const i = idx(y);
    return { yongsin: y, huisin: el(i - 1), gisin: el(i - 2), gusin: el(i - 3), hansin: el(i + 1), tenGodGroup: groupOf(s, y), johu: null, notes: [], ...extra };
  }

  // 원국의 억부 용신(analyzeSaju가 계산한 원래 값)
  const baseYongsin = (s) => s._eokbu || s.yongsin;

  // ============================================================
  // 용신을 정하는 방법
  // ============================================================

  function eokbu(s) {
    const b = baseYongsin(s), st = s.strength;
    return {
      applicable: true, yongsin: b.yongsin,
      verdict: `${st.level} → ${b.tenGodGroup}(${b.yongsin})로 균형`,
      paragraphs: [
        `나를 돕는 기운(비겁+인성)이 ${st.score}점으로 ${st.level}입니다. ${st.strong ? '힘이 넘치니 덜어 주는 기운이 필요합니다.' : '힘이 모자라니 채워 주는 기운이 필요합니다.'}`,
        `${b.reason}. 그래서 ${elName(b.yongsin)}이 용신입니다.`,
      ],
      why: [
        `십성 비중: ${GROUPS.map(g => `${g} ${st.groups[g]}%`).join(', ')}`,
        `득령 ${st.deukryeong ? 'O' : 'X'} · 득지 ${st.deukji ? 'O' : 'X'} · 득세 ${st.deukse ? 'O' : 'X'}`,
      ],
    };
  }

  const TEMP_BASE = [-3, -2.5, -1.5, -0.5, 0.5, 2, 3, 2.5, 1, 0, 0.5, -2];   // 子~亥
  const HUM_BASE = [1.5, 1, 0, 0.5, 1, -1.5, -1.5, -1, -0.5, -0.5, -1, 1.5];

  function johu(s) {
    const p = s.pillars, ep = s.elements.percent, mb = p.month.branch, ds = s.dayMaster.stem;
    const branches = ['year', 'month', 'day', 'hour'].filter(k => p[k]).map(k => p[k].branch);
    const wet = branches.filter(b => b === 4 || b === 1).length;   // 辰丑: 젖은 흙
    const dry = branches.filter(b => b === 10 || b === 7).length;  // 戌未: 마른 흙
    const T = round1(TEMP_BASE[mb] + (ep.화 - ep.수) / 15);
    const H = round1(HUM_BASE[mb] + (ep.수 - ep.화) / 20 + (wet - dry) * 0.4);
    const tWord = T <= -3 ? '매우 추움' : T <= -1.5 ? '추움' : T < 1.5 ? '온화함' : T < 3 ? '더움' : '매우 더움';
    const hWord = H >= 1.5 ? '습함' : H <= -1.5 ? '건조함' : '적당함';
    const month = `${E.BRANCHES[mb]}월(${E.BRANCHES_HANJA[mb]})`;
    // 궁통보감 조후 용신표: 1순위 천간의 오행이 조후 용신
    const need = DB.johuStems(ds, mb);
    const y = E.STEM_ELEMENT[need[0]];
    const stemName = (st) => `${E.STEMS_HANJA[st]}${E.STEM_ELEMENT[st]}`;
    const visible = ['year', 'month', 'hour'].filter(k => p[k]).map(k => p[k].stem);
    const hiddenAll = ['year', 'month', 'day', 'hour'].filter(k => p[k]).flatMap(k => p[k].hiddenStems.map(h => h.stem));
    const have = need.filter(st => visible.includes(st));
    const rooted = need.filter(st => !visible.includes(st) && hiddenAll.includes(st));
    const urgent = Math.abs(T) >= 3;
    return {
      applicable: true, yongsin: y, urgent, temp: T, hum: H, stems: need,
      verdict: `${E.STEMS_HANJA[ds]}일간 ${month}생 → ${stemName(need[0])} 1순위${urgent ? ' (매우 시급)' : ''}`,
      paragraphs: [
        `궁통보감은 ${month}에 태어난 ${E.STEMS_HANJA[ds]}(${E.STEMS[ds]}) 일간에게 ${need.map(stemName).join(' → ')} 순서로 필요하다고 봅니다. 1순위인 ${stemName(need[0])}의 ${elName(y)} 기운이 조후 용신입니다.`,
        `사주 전체의 온도는 ${tWord}(${T}), 습도는 ${hWord}(${H})입니다. ${urgent ? '계절의 치우침이 커서 조후가 무엇보다 시급한 사주입니다.' : '계절의 치우침이 심하지 않아 조후는 균형을 다듬는 정도로 작용합니다.'}`,
        have.includes(need[0]) ? `1순위 ${stemName(need[0])}이 원국 천간에 드러나 있어 조후를 스스로 갖춘 사주입니다.`
          : rooted.includes(need[0]) ? `1순위 ${stemName(need[0])}이 지지 속에만 숨어 있어, 이 글자가 운에서 천간으로 드러날 때 크게 힘을 얻습니다.`
          : `1순위 ${stemName(need[0])}이 원국에 없어, 이 글자가 들어오는 해와 대운에 특히 크게 좋아진다고 봅니다.${have.length + rooted.length ? ` (보조 글자 ${[...have, ...rooted].map(stemName).join(', ')}은 원국에 있음)` : ''}`,
      ],
      why: [
        `궁통보감 조후 용신표: ${E.STEMS_HANJA[ds]}일간 × ${E.BRANCHES_HANJA[mb]}월 = ${need.map(st => E.STEMS_HANJA[st]).join('')}`,
        `온도 ${T} = ${month}의 기본 온도 ${TEMP_BASE[mb]} + (화 ${ep.화}% − 수 ${ep.수}%) ÷ 15 · 습도 ${H} = 기본 ${HUM_BASE[mb]} + (수 − 화) ÷ 20 + 젖은 흙(辰丑) ${wet}개 − 마른 흙(戌未) ${dry}개`,
        '온도가 ±3을 넘으면 매우 시급하다고 보고, 종합 투표에서 조후의 비중을 1.5배로 둡니다.',
      ],
    };
  }

  // 자평진전식 상신: 격과 신강약에 따라 격을 살리는 기운을 고른다
  function gyeok(s) {
    const gk = s.gyeokguk, strong = s.strength.strong, g = s.strength.groups;
    const god = gk.tenGod;
    let pick;
    if (god === '정관') pick = strong ? ['재성', '재생관(財生官) — 재물이 관(명예)을 키워 줍니다'] : ['인성', '관인상생(官印相生) — 인성이 관의 압박을 나를 돕는 힘으로 바꿉니다'];
    else if (god === '편관') pick = strong ? ['식상', '식신제살(食神制殺) — 식신이 칠살의 거친 힘을 다스립니다'] : ['인성', '살인상생(殺印相生) — 인성이 칠살의 압박을 나를 돕는 힘으로 바꿉니다'];
    else if (god === '정재' || god === '편재') pick = !strong ? ['비겁', '비겁방신(比劫幇身) — 동료의 힘으로 큰 재물을 감당합니다']
      : g.식상 >= 5 ? ['식상', '식상생재(食傷生財) — 재능이 재물을 낳습니다'] : ['관성', '재생관(財生官) — 재물이 명예로 이어집니다'];
    else if (god === '식신') pick = strong ? ['재성', '식신생재(食神生財) — 재능이 재물로 이어집니다'] : ['비겁', '신약한 식신격은 비겁으로 몸을 먼저 세웁니다'];
    else if (god === '상관') pick = strong ? ['재성', '상관생재(傷官生財) — 날카로운 재능을 재물로 돌립니다'] : ['인성', '상관패인(傷官佩印) — 인성이 상관의 날을 다듬어 줍니다'];
    else if (god === '정인' || god === '편인') pick = !strong ? ['관성', '관인상생(官印相生) — 관(직장·명예)이 인성을 생해 나를 돕습니다']
      : g.인성 >= 30 ? ['재성', '재극인(財剋印) — 지나친 생각(인성)을 현실(재성)이 잡아 줍니다'] : ['식상', '인성으로 쌓은 지식을 식상으로 펼칩니다'];
    else pick = g.관성 >= 10 ? ['관성', gk.name === '양인격' ? '양인가살(羊刃駕殺) — 칠살이 양인의 칼을 다스려 큰 권위가 됩니다' : '넘치는 내 힘을 관성으로 다스려 쓰임을 만듭니다']
      : g.식상 >= 5 ? ['식상', '넘치는 내 힘을 식상(재능)으로 흘려 보냅니다'] : ['재성', '넘치는 내 힘을 재물을 일구는 데 씁니다'];
    const y = groupEl(s, pick[0]);
    const broken = [];
    if (god === '정관' && g.식상 >= 20) broken.push('상관견관(傷官見官): 상관이 강해 관(명예·직장)을 해칠 수 있어 말과 행동을 조심해야 합니다');
    if ((god === '정재' || god === '편재') && g.비겁 >= 35) broken.push('군겁쟁재(群劫爭財): 비겁이 많아 재물을 나눠 갖기 쉬우니 동업·보증을 피하세요');
    if (god === '식신' && s.tenGodCount.편인 >= 2) broken.push('효신탈식(梟神奪食): 편인이 식신을 막아 재능이 막히기 쉬우니 생각보다 실행을 앞세우세요');
    if ((god === '정인' || god === '편인') && g.재성 >= 30) broken.push('재파인(財破印): 재성이 강해 공부·문서가 흔들리기 쉬우니 욕심을 줄이세요');
    return {
      applicable: true, yongsin: y,
      verdict: `${gk.name} → ${pick[0]}(${y})가 격을 살림`,
      paragraphs: [
        `태어난 달에서 정해진 격은 ${gk.name}입니다. 사주의 "그릇"이 ${god}의 성격을 띤다는 뜻입니다.`,
        `${s.strength.level}한 ${gk.name}에는 ${pick[1]}. 그래서 ${pick[0]}에 해당하는 ${elName(y)}을 상신(용신)으로 씁니다.`,
        broken.length ? `격을 흔드는 요소(파격 주의): ${broken.join(' / ')}` : '격을 크게 흔드는 요소가 없어 그릇이 온전한 편입니다(성격).',
      ],
      why: [
        `격국: 월지 ${E.BRANCHES_HANJA[s.pillars.month.branch]}의 ${gk.transparent ? '투출한 천간' : '정기'} ${gk.baseStem} → ${god}`,
        `신강약: ${s.strength.level}(${s.strength.score}점). 같은 격이라도 내 힘이 세면 격을 쓰는 쪽(설기·제어), 약하면 나를 돕는 쪽을 상신으로 고릅니다.`,
      ],
    };
  }

  function tonggwan(s) {
    const ep = s.elements.percent;
    const top = ELS.slice().sort((a, b) => ep[b] - ep[a]).slice(0, 3);
    let best = null;
    for (const c of top) for (const v of top) {
      if (c === v || idx(v) !== (idx(c) + 2) % 5) continue;
      if (ep[c] < 20 || ep[v] < 20) continue;
      const power = Math.min(ep[c], ep[v]);
      if (!best || power > best.power) best = { c, v, power };
    }
    if (!best) {
      const b = baseYongsin(s);
      return {
        applicable: false, yongsin: b.yongsin,
        verdict: '팽팽히 맞서는 두 기운이 없음 → 통관 불필요',
        paragraphs: [`강한 기운(${top.map(e => `${e} ${ep[e]}%`).join(', ')}) 중에 서로 부딪히면서 둘 다 20% 이상인 쌍이 없습니다. 싸움이 없으니 다리를 놓을 필요도 없어, 억부법의 결론(${elName(b.yongsin)})을 따릅니다.`],
        why: ['통관은 서로 극하는 두 기운이 모두 20% 이상으로 팽팽할 때만 씁니다.'],
      };
    }
    const m = el(idx(best.c) + 1);
    return {
      applicable: true, yongsin: m,
      verdict: `${best.c}↔${best.v} 대립 → ${elName(m)}이 다리`,
      paragraphs: [
        `${elName(best.c)}(${ep[best.c]}%)이 ${elName(best.v)}(${ep[best.v]}%)을 누르며 팽팽하게 맞서고 있습니다. 마음속에 두 가지 욕구가 부딪히는 구조라 갈등과 스트레스가 생기기 쉽습니다.`,
        `${best.c}생${m}, ${m}생${best.v}: ${elName(m)}은 ${best.c}의 힘을 받아 ${best.v}를 키워 주므로, 싸움을 흐름으로 바꿔 줍니다. ${ep[m] < 10 ? `원국에 ${m} 기운이 약해, 운에서 들어올 때 막혔던 일이 풀립니다.` : `원국에 ${m} 기운이 있어 갈등을 조율하는 힘을 이미 갖추고 있습니다.`}`,
      ],
      why: [`오행 비중 상위: ${top.map(e => `${e} ${ep[e]}%`).join(', ')}`, `${best.c}극${best.v} 관계이고 두 기운 모두 20% 이상입니다.`],
    };
  }

  function byeongyak(s) {
    const ep = s.elements.percent, strong = s.strength.strong;
    const supportive = (e) => ['비겁', '인성'].includes(groupOf(s, e));
    const cands = ELS.filter(e => ep[e] >= 35).sort((a, b) => ep[b] - ep[a])
      .filter(e => (strong ? supportive(e) : !supportive(e)));
    if (!cands.length) {
      const b = baseYongsin(s);
      return {
        applicable: false, yongsin: b.yongsin,
        verdict: '뚜렷한 병이 없음 → 평탄한 구조',
        paragraphs: [`어느 한 기운이 지나치게(35% 이상) 몰려 나를 해치는 구조가 아닙니다. 병약법으로 보면 큰 굴곡 없이 평탄한 사주이며, 용신은 억부법의 결론(${elName(b.yongsin)})을 따릅니다.`],
        why: [`오행 비중: ${ELS.map(e => `${e} ${ep[e]}%`).join(', ')}`, `${strong ? '신강한 사주에서는 나를 돕는 기운(비겁·인성)이' : '신약한 사주에서는 나를 누르거나 빼는 기운이'} 지나칠 때를 병으로 봅니다.`],
      };
    }
    const d = cands[0], y = el(idx(d) - 2);
    return {
      applicable: true, yongsin: y,
      verdict: `병: ${d} 과다(${ep[d]}%) → 약: ${elName(y)}`,
      paragraphs: [
        `${elName(d)} 기운이 ${ep[d]}%로 지나치게 많아 사주의 균형을 무너뜨리는 "병"이 됩니다. ${strong ? '이미 힘이 센데 같은 편이 더 많아 고집과 과욕으로 흐르기 쉽습니다.' : `힘이 약한 나를 ${groupOf(s, d)}${batchim(groupOf(s, d)) ? '이' : '가'} 거세게 몰아붙이는 구조입니다.`}`,
        `${y}극${d}: ${elName(y)}이 ${d}를 다스리는 "약"입니다. 병이 깊은 만큼 약이 들어오는 시기(운)에 극적으로 좋아진다고 봅니다.`,
      ],
      why: [`오행 비중 1위 ${d} ${ep[d]}% (35% 이상이면 과다)`, `${d}는 나에게 ${groupOf(s, d)}이고, 사주는 ${s.strength.level}입니다.`],
    };
  }

  // ============================================================
  // 읽는 관점: 신살 위주, 물상론
  // ============================================================

  const NOBLE = ['천을귀인', '문창귀인', '학당귀인', '천덕귀인', '월덕귀인', '금여록', '건록'];
  const FIERCE = ['양인살', '백호대살', '괴강살', '귀문관살', '현침살'];
  const STAR12 = {
    역마살: '이동·여행·해외·이직이 잦은 삶. 한곳에 머물기보다 움직일 때 기회가 생깁니다.',
    '년살(도화)': '사람을 끄는 매력과 인기. 대인관계와 이성 인연이 삶의 큰 테마입니다.',
    화개살: '예술·종교·학문에 끌리는 깊이. 혼자 몰두하는 시간이 재능을 키웁니다.',
    장성살: '리더의 별. 조직에서 중심 역할을 맡게 됩니다.',
    반안살: '안정적인 출세의 별. 꾸준히 지위가 올라갑니다.',
  };
  const STAR12_YEAR = { 역마살: '이동·이사·이직·해외', '년살(도화)': '인기·연애·새 인연', 화개살: '공부·예술·정리', 장성살: '승진·리더 역할', 반안살: '안정·승진' };

  function sinsalLens(s, year) {
    const p = s.pillars;
    const names = s.sinsal.map(x => x.name);
    const noble = [...new Set(names.filter(n => NOBLE.includes(n)))];
    const fierce = [...new Set(names.filter(n => FIERCE.includes(n)))];
    const stars = [...new Set(['year', 'month', 'day', 'hour'].filter(k => p[k]).map(k => p[k].sinsal12.byYear).filter(n => STAR12[n]))];
    const upcoming = [];
    for (let y = year; y < year + 10 && upcoming.length < 6; y++) {
      const n = E.sinsal12(p.year.branch, ((y - 4) % 12 + 12) % 12);
      if (STAR12_YEAR[n]) upcoming.push(`${y}년 ${n.replace('년살(도화)', '도화살')} — ${STAR12_YEAR[n]}`);
    }
    const tone = noble.length > fierce.length ? '도움받는 운이 강한 사주' : fierce.length > noble.length ? '강한 기질로 스스로 길을 여는 사주' : '귀인과 강한 기운이 균형을 이룬 사주';
    return {
      applicable: true,
      verdict: `귀인 ${noble.length}개 · 강한 살 ${fierce.length}개 → ${tone}`,
      paragraphs: [
        noble.length ? `귀인(도움의 별): ${noble.join(', ')}. 어려울 때 사람이나 상황이 나를 돕는 힘이 있습니다.` : '귀인 별이 두드러지지 않아, 남의 도움보다 내 힘으로 길을 만드는 편입니다.',
        fierce.length ? `강한 살: ${fierce.join(', ')}. 날카롭고 강한 기질이라 잘 쓰면 전문성과 추진력이 되고, 못 쓰면 다툼·사고가 됩니다.` : '거친 살이 없어 큰 풍파 없이 무난한 기질입니다.',
        ...stars.map(n => `${n.replace('년살(도화)', '도화살')}: ${STAR12[n]}`),
        upcoming.length ? `앞으로 별이 들어오는 해 — ${upcoming.join(' / ')}` : null,
      ].filter(Boolean),
      why: [
        '귀인·살은 일간이나 월지를 기준으로, 역마·도화·화개 같은 12신살은 띠(년지)를 기준으로 찾았습니다.',
        '해마다 들어오는 12신살은 그해의 지지를 내 띠와 비교해 구합니다.',
      ],
    };
  }

  const STEM_NOUN = ['큰 나무', '꽃과 풀', '태양', '촛불', '큰 산', '논밭', '무쇠', '보석', '바다', '빗물'];
  const SEASONS = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
  const SEASON_STATE = {
    목: { 봄: '제철을 만나 힘차게 자라는', 여름: '무성하지만 목마른', 가을: '열매를 맺고 다듬어지는', 겨울: '추위 속에 봄을 기다리는' },
    화: { 봄: '나무를 땔감 삼아 살아나는', 여름: '가장 뜨겁게 타오르는', 가을: '저물어 가는 노을 같은', 겨울: '추운 밤이라 더욱 귀한' },
    토: { 봄: '싹을 품은 촉촉한', 여름: '볕에 달궈진 메마른', 가을: '곡식을 거두는 풍요로운', 겨울: '얼어붙어 쉬고 있는' },
    금: { 봄: '아직 무른', 여름: '불 속에서 녹고 단련되는', 가을: '가장 단단하고 날카로운', 겨울: '차갑게 빛나는' },
    수: { 봄: '만물을 적시는', 여름: '말라 가며 귀해진', 가을: '맑게 차오르는', 겨울: '가장 넓고 깊은' },
  };
  // [일간, 만나는 천간]: [이름, 풍경, 좋음 여부]
  const PAIR_SCENES = {
    '0-6': ['벽갑(劈甲)', '도끼가 나무를 다듬어 큰 재목이 됩니다. 시련을 거쳐 크게 쓰이는 사람', true],
    '0-3': ['목화통명(木火通明)', '나무가 등불을 밝힙니다. 재능과 지혜가 밖으로 빛나는 사람', true],
    '0-2': ['햇빛 받는 나무', '태양 아래 쑥쑥 자랍니다. 이름이 알려지고 성장하는 사람', true],
    '0-9': ['단비 맞는 나무', '단비가 뿌리를 적십니다. 배움과 도움으로 크는 사람', true],
    '0-4': ['산 위의 큰 나무', '든든한 산에 뿌리내렸습니다. 터전과 재물이 받쳐 주는 사람', true],
    '1-2': ['꽃과 태양', '햇살 아래 꽃이 활짝 핍니다. 화려하고 인기 있는 사람', true],
    '1-9': ['이슬 맺힌 꽃', '촉촉한 이슬이 꽃을 살립니다. 감수성과 보살핌이 있는 사람', true],
    '1-0': ['등라계갑(藤蘿繫甲)', '덩굴이 큰 나무를 타고 오릅니다. 귀인의 덕으로 높이 가는 사람', true],
    '1-7': ['가위 앞의 꽃', '날카로운 가위가 꽃을 겨눕니다. 상처받기 쉬우니 마음을 지켜야 하는 사람', false],
    '2-8': ['강휘상영(江暉相映)', '태양이 넓은 호수에 비쳐 두 배로 빛납니다. 이름이 널리 알려지는 사람', true],
    '2-0': ['나무가 키우는 태양', '숲이 태양을 받쳐 줍니다. 든든한 후원을 받는 사람', true],
    '2-9': ['구름 낀 태양', '먹구름이 해를 가립니다. 실력이 가려지기 쉬우니 드러낼 기회를 만들어야 하는 사람', false],
    '3-0': ['장작 얻은 등불', '마른 장작 덕에 오래 탑니다. 꾸준히 공부하고 성장하는 사람', true],
    '3-6': ['용광로의 불', '불이 쇠를 녹여 그릇을 만듭니다. 일을 다루고 성과를 내는 사람', true],
    '3-8': ['호수에 비친 촛불', '촛불이 잔잔한 물에 비칩니다(丁壬합). 다정하고 인연이 깊은 사람', true],
    '3-9': ['빗속의 촛불', '빗방울이 불씨를 위협합니다. 걱정이 많아 마음을 지켜야 하는 사람', false],
    '4-0': ['숲이 우거진 산', '나무가 산을 덮어 품격이 생깁니다. 명예가 따르는 사람', true],
    '4-2': ['햇살 비추는 산', '해가 산을 비춥니다. 따뜻하고 존재감 있는 사람', true],
    '4-9': ['비 내린 산', '단비가 메마른 산을 적십니다(戊癸합). 실속과 재물이 생기는 사람', true],
    '4-8': ['산과 호수', '산이 큰 호수를 품습니다. 큰 재물을 다룰 그릇', true],
    '5-2': ['햇볕 드는 논밭', '볕이 들어 곡식이 익습니다. 결실을 거두는 사람', true],
    '5-9': ['단비 내린 논밭', '촉촉한 비가 밭을 살립니다. 꾸준히 불어나는 사람', true],
    '5-0': ['나무 뿌리 내린 밭', '나무가 밭에 뿌리내립니다(甲己합). 책임과 결실이 함께하는 사람', true],
    '5-1': ['잡초 무성한 밭', '잡초가 양분을 뺏습니다. 주변 사람 때문에 지치지 않도록 해야 하는 사람', false],
    '6-3': ['용광로에서 단련되는 무쇠', '불에 달궈져 명검이 됩니다. 시련을 거쳐 크게 되는 사람', true],
    '6-8': ['금백수청(金白水淸)', '깨끗한 쇠와 맑은 물. 총명하고 수려한 사람', true],
    '6-0': ['도끼와 나무', '도끼가 나무를 만나 할 일이 생깁니다. 일과 재물을 만드는 사람', true],
    '7-8': ['도세주옥(淘洗珠玉)', '맑은 물에 씻긴 보석이 빛납니다. 재능이 드러나 인정받는 사람', true],
    '7-2': ['태양 아래 보석', '햇빛에 보석이 반짝입니다(丙辛합). 매력이 돋보이는 사람', true],
    '7-3': ['불에 녹는 보석', '촛불의 열이 보석을 상하게 합니다. 압박과 비판에 상처받기 쉬운 사람', false],
    '7-5': ['흙에 묻힌 보석', '보석이 흙 속에 묻혔습니다. 재능이 가려지기 쉬우니 드러낼 무대가 필요한 사람', false],
    '8-4': ['제방이 지켜 주는 큰 강', '둑이 물길을 잡아 줍니다. 방향이 잡히면 큰일을 해내는 사람', true],
    '8-2': ['호수에 비친 태양', '물 위에 해가 반짝입니다. 지혜와 명예를 함께 가진 사람', true],
    '8-0': ['나무를 키우는 강', '강물이 숲을 기릅니다. 사람과 일을 키워 내는 사람', true],
    '9-7': ['바위틈 샘물', '바위에서 맑은 샘이 솟습니다. 마르지 않는 지혜와 도움을 받는 사람', true],
    '9-6': ['쇠에 맺힌 이슬', '차가운 쇠에 맑은 물이 맺힙니다. 원칙과 총명함을 갖춘 사람', true],
    '9-2': ['햇살 속 무지개', '빗방울이 햇빛을 만나 무지개가 됩니다. 감성과 재능이 빛나는 사람', true],
    '9-4': ['비 그친 산', '비가 산을 적시고 그칩니다(戊癸합). 책임감 있게 결실을 맺는 사람', true],
  };

  function mulsangLens(s) {
    const p = s.pillars, ds = s.dayMaster.stem, season = SEASONS[p.month.branch];
    const scene = `${season}의 ${SEASON_STATE[s.dayMaster.element][season]} ${STEM_NOUN[ds]}`;
    const found = [], seen = new Set();
    const look = (stem, where, hidden) => {
      const key = `${ds}-${stem}`;
      if (!PAIR_SCENES[key] || seen.has(key)) return;
      seen.add(key);
      found.push({ key, where, hidden, scene: PAIR_SCENES[key] });
    };
    for (const k of ['year', 'month', 'hour']) if (p[k]) look(p[k].stem, `${{ year: '년', month: '월', hour: '시' }[k]}간 ${E.STEMS_HANJA[p[k].stem]}`, false);
    for (const k of ['year', 'month', 'day', 'hour']) if (p[k]) { const hs = p[k].hiddenStems; look(hs[hs.length - 1].stem, `${{ year: '년', month: '월', day: '일', hour: '시' }[k]}지 속 ${hs[hs.length - 1].hanja}`, true); }
    const ideal = Object.entries(PAIR_SCENES).filter(([k, v]) => k.startsWith(ds + '-') && v[2] && !seen.has(k)).slice(0, 2);
    const good = found.filter(f => f.scene[2]), bad = found.filter(f => !f.scene[2]);
    return {
      applicable: true,
      verdict: `"${scene}"${good.length ? ` + ${good[0].scene[0]}` : ''}`,
      scene,
      paragraphs: [
        `내 사주를 한 폭의 그림으로 그리면 "${scene}"입니다.`,
        ...good.map(f => `${f.scene[0]}: ${f.scene[1]}. (${f.where}${f.hidden ? ' — 땅속에 숨어 있어 은근하게 작용' : ''})`),
        ...bad.map(f => `주의 — ${f.scene[0]}: ${f.scene[1]}. (${f.where})`),
        !found.length ? '주변에 일간과 뚜렷한 짝을 이루는 글자가 없어, 스스로 풍경을 만들어 가는 사주입니다.' : null,
        ideal.length ? `이런 짝을 만나면 더 빛납니다: ${ideal.map(([k, v]) => `${E.STEMS_HANJA[Number(k.split('-')[1])]}(${v[0]})`).join(', ')}. 이 글자가 들어오는 해나 이 기운을 가진 사람이 도움이 됩니다.` : null,
      ].filter(Boolean),
      why: [
        `일간 ${s.dayMaster.hanja} = ${STEM_NOUN[ds]}, 태어난 달 ${E.BRANCHES_HANJA[p.month.branch]} = ${season}`,
        '년·월·시의 천간과 각 지지 속 대표 천간(정기)이 일간과 어떤 풍경을 이루는지 찾았습니다.',
      ],
    };
  }

  // ============================================================
  // 종합, 좋은 시기, 적용
  // ============================================================

  function goodYears(s, y, h, from, n = 10) {
    const out = [];
    for (let yr = from; yr < from + n; yr++) {
      const se = E.STEM_ELEMENT[((yr - 4) % 10 + 10) % 10], be = E.BRANCH_ELEMENT[((yr - 4) % 12 + 12) % 12];
      const pt = (se === y ? 2 : se === h ? 1 : 0) + (be === y ? 2 : be === h ? 1 : 0);
      if (pt >= 2) out.push({ year: yr, text: E.STEMS[((yr - 4) % 10 + 10) % 10] + E.BRANCHES[((yr - 4) % 12 + 12) % 12], stars: pt >= 4 ? 3 : pt === 3 ? 2 : 1 });
    }
    return out;
  }
  function goodDaeun(s, y, h) {
    if (!s.daeun) return [];
    return s.daeun.list.filter(d => [d.stemElement, d.branchElement].filter(e => e === y || e === h).length >= 1
      && [d.stemElement, d.branchElement].includes(y)).map(d => `${d.age}세(${d.startYear}~) ${d.text}`);
  }

  function analyzeMethods(s, year = new Date().getFullYear()) {
    const results = Object.fromEntries(Object.entries({
      eokbu: eokbu(s), johu: johu(s), gyeok: gyeok(s), tonggwan: tonggwan(s), byeongyak: byeongyak(s),
      sinsal: sinsalLens(s, year), mulsang: mulsangLens(s),
    }).map(([k, v]) => [k, fixAll(v)]));
    // 종합: 적용 가능한 방법만 투표 (억부 1.2로 동점 방지, 시급한 조후 1.5)
    const votes = {};
    const voters = [];
    for (const id of YONGSIN_METHODS) {
      const r = results[id];
      if (!r.applicable) continue;
      const w = id === 'eokbu' ? 1.2 : id === 'johu' && r.urgent ? 1.5 : 1;
      votes[r.yongsin] = (votes[r.yongsin] || 0) + w;
      voters.push({ id, yongsin: r.yongsin, w });
    }
    const winner = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    const agree = voters.filter(v => v.yongsin === winner).map(v => METHOD_INFO[v.id].name);
    const disagree = voters.filter(v => v.yongsin !== winner).map(v => `${METHOD_INFO[v.id].name}(${v.yongsin})`);
    results.consensus = fixAll({
      applicable: true, yongsin: winner,
      verdict: `${agree.length}개 방법이 ${elName(winner)}을 지목`,
      paragraphs: [
        `${agree.join('·')} ${agree.length}개 방법이 ${elName(winner)} 기운을 나에게 필요한 기운으로 꼽았습니다.`,
        disagree.length ? `다른 결론: ${disagree.join(', ')}. 이 방법들은 다른 측면(계절, 그릇, 갈등 등)을 더 중시하기 때문입니다.` : '적용된 모든 방법이 같은 결론을 내렸습니다. 해석이 흔들리지 않는 분명한 사주입니다.',
      ],
      why: [
        `득표: ${Object.entries(votes).map(([e, v]) => `${e} ${round1(v)}`).join(', ')} (억부 1.2점, 시급한 조후 1.5점, 나머지 1점)`,
        '조건이 맞지 않아 적용되지 않은 방법(예: 대립이 없는데 통관)은 투표에서 뺐습니다.',
      ],
    });
    const list = METHOD_ORDER.map(id => {
      const r = results[id], info = METHOD_INFO[id];
      const extra = info.kind === 'yongsin' ? (() => {
        const set = yongsinSet(s, r.yongsin);
        return { set, years: goodYears(s, set.yongsin, set.huisin, year), daeun: goodDaeun(s, set.yongsin, set.huisin) };
      })() : {};
      return { id, ...info, ...r, ...extra };
    });
    return { list, byId: Object.fromEntries(list.map(m => [m.id, m])) };
  }

  // 고른 방법의 용신으로 바꾼 사주 결과를 돌려준다. 신살·물상은 용신을 바꾸지 않으므로 종합을 쓴다
  function applyMethod(s, id = 'consensus', year) {
    const base = { ...s, _eokbu: baseYongsin(s) };
    const m = analyzeMethods(base, year);
    const pick = METHOD_INFO[id]?.kind === 'yongsin' ? m.byId[id] : m.byId.consensus;
    const set = yongsinSet(base, pick.yongsin, {
      method: pick.name, methodId: pick.id, applicable: pick.applicable,
      reason: pick.verdict,   // 이 방법의 결론 한 줄 (예: "신강 → 관성(화)로 균형")
      methodWhy: [...pick.paragraphs, ...pick.why],
      johu: base._eokbu.johu, notes: base._eokbu.notes,
    });
    return { ...base, yongsin: set, methods: m, method: id };
  }

  const api = { METHOD_INFO, METHOD_ORDER, YONGSIN_METHODS, analyzeMethods, applyMethod };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Methods = api;
})(typeof window !== 'undefined' ? window : globalThis);
