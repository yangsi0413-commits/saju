# 사주풀이

생년월일시로 사주를 계산하고 풀이해 주는 웹사이트. 풀이마다 왜 그렇게 나왔는지 근거도 같이 보여준다.
빌드 없는 정적 사이트이고 계산은 전부 브라우저에서 한다.

## 기능

- 종합풀이, 성격, 인생 흐름, 오늘의 운세, 신년운세, 대운, 궁합
- 해석 방법(억부·조후·격국 등) 선택
- 사주 기초 배우기 페이지
- 디자인 테마 5종
- 동의한 경우에만 기록 저장 (Supabase, 선택)

## 실행

```bash
npm install
npm start    # http://localhost:8000
npm test
```

## 구조

```
src/core/   계산 엔진(saju.js), 풀이(interpret.js), 해석 방법(methods.js)
src/data/   명리 데이터, 통계 데이터(scripts/build-stats.js로 생성)
src/ui/     화면, 스타일, 저장 연동
admin.html  저장된 기록 보는 관리자 페이지
supabase/   DB 스키마
test/
```

## 저장 기능 설정 (선택)

`src/config.js`가 비어 있으면 저장 기능은 꺼져 있다. 켜려면

1. Supabase 프로젝트 만들고 SQL Editor에서 `supabase/schema.sql` 실행
2. 회원가입 막기 (Authentication → Allow new users to sign up 끄기)
3. 관리자 계정 만들고 `insert into public.admins (user_id) values ('UID');`
4. Project URL이랑 anon 키를 `src/config.js`에 넣기 (service_role 키는 넣으면 안 됨)

## 참고

- 음력 변환이 중국 달력 기준이라 가끔 하루 차이 날 수 있음
- 해외 출생은 경도 보정 안 함
- 재미로 보는 용도
