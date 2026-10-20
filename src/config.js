// 저장 서버(Supabase) 설정.
// 세 값이 모두 채워져야 저장 기능이 켜지고, 입력 화면에 "저장 동의" 체크박스가 나타납니다.
// · supabaseUrl / supabaseAnonKey: Supabase 대시보드 → Project Settings → API 의 Project URL과 anon public 키
//   anon 키는 공개용이라 여기에 넣어도 됩니다(읽기는 행 단위 보안으로 막혀 있음). service_role 키는 절대 넣지 마세요.
// · operator: 개인정보 처리방침에 표시할 운영자 이름과 연락처(이메일 등). 삭제·열람 요청을 받을 곳입니다.
window.SAJU_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  operator: { name: '', contact: '' },
  consentVersion: '2026-10-20',   // 동의 안내문을 바꾸면 날짜를 올리세요
  retention: '1년',
};
