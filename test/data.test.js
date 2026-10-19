// 검증: 사주명리 지식 DB의 모양과 대표 값
const DB = require('../src/data/myeongri.js');

let total = 0, failed = 0;
function check(name, ok, detail = '') {
  total++;
  if (!ok) { failed++; console.log('✗', name, detail); }
}
const H = '甲乙丙丁戊己庚辛壬癸';
const stems = (str) => [...str].map(c => H.indexOf(c));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 궁통보감 조후 용신표: 10 일간 × 12 월, 모두 유효한 천간
check('조후표 일간 10', DB.JOHU_BY_MONTH.length === 10);
DB.JOHU_BY_MONTH.forEach((row, i) => {
  check(`조후표 ${H[i]} 12개월`, row.length === 12);
  row.forEach((cell, m) => check(`조후표 ${H[i]} ${m}`, cell.length > 0 && cell.every(x => x >= 0 && x <= 9)));
});
// 대표 칸 (지지 인덱스: 子0 丑1 寅2 … 亥11)
const spot = [
  [0, 2, '丙癸'], [0, 0, '丁庚丙'], [0, 6, '癸丁庚'], [1, 0, '丙'], [2, 0, '壬戊己'], [3, 6, '壬庚癸'],
  [4, 6, '壬甲丙'], [5, 5, '癸丙'], [6, 6, '壬癸'], [6, 5, '壬戊丙丁'], [7, 0, '丙戊壬甲'], [8, 8, '戊丁'], [9, 8, '丁甲'], [9, 1, '丙丁'],
];
for (const [d, b, want] of spot) check(`조후 ${H[d]}일간 ${'子丑寅卯辰巳午未申酉戌亥'[b]}월`, eq(DB.johuStems(d, b), stems(want)), `${DB.johuStems(d, b).map(x => H[x]).join('')} ≠ ${want}`);

// 홍란·천희: 子년생 홍란 卯·천희 酉, 午년생 홍란 酉·천희 卯
check('홍란 子→卯', DB.hongran(0) === 3);
check('홍란 午→酉', DB.hongran(6) === 9);
check('천희 子→酉', DB.cheonhui(0) === 9);
check('홍란 辰→亥', DB.hongran(4) === 11);
// 고신·과숙: 亥子丑생 → 寅·戌, 巳午未생 → 申·辰
check('고신 子생', DB.gosinGwasuk(0).gosin === 2 && DB.gosinGwasuk(0).gwasuk === 10);
check('고신 午생', DB.gosinGwasuk(6).gosin === 8 && DB.gosinGwasuk(6).gwasuk === 4);
check('고신 전 지지', [...Array(12).keys()].every(b => DB.gosinGwasuk(b)));

// 일주 목록
check('간여지동 12', DB.GANYEOJIDONG.length === 12);
check('음양차착 12', DB.EUMYANG_CHACHAK.length === 12);
check('일주 태그', DB.ilju(6, 4).tags.includes('괴강') && DB.ilju(2, 6).tags.includes('간여지동') && DB.ilju(2, 6).tags.includes('음양차착살'));

// 육친·십성 위치
const GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
for (const g of ['M', 'F']) check(`육친 ${g}`, GODS.every(x => DB.YUKCHIN[g][x]));
check('남성 정재=아내', DB.YUKCHIN.M.정재 === '아내');
check('여성 정관=남편', DB.YUKCHIN.F.정관 === '남편');
check('십성 위치 10×4', GODS.every(x => DB.TEN_GOD_POSITION[x]?.length === 4));
check('배우자궁 12운성', Object.keys(DB.SPOUSE_RULES.palaceStage).length === 12);

console.log(`${total}건 중 실패 ${failed}건`);
process.exit(failed ? 1 : 0);
