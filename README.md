# 키즈메모

어린이집과 유치원을 위한 점보키즈 행사 리마인드 SaaS입니다.

## 포함된 기능

- 연간 행사 일정 관리
- 점보키즈 API 발급 쿠폰 캠페인
- 관리자가 직접 쿠폰 링크/코드를 입력하는 수동발행 캠페인
- 단일 이미지 또는 HTML 쿠폰 안내 랜딩
- 전날 자동 발송 작업 API
- 카카오 알림톡, SMS/LMS, 이메일 발송 폴백 구조
- AI 행사 도우미와 AI 감동 문구 생성기
- Kakao OAuth, Google OAuth, 이메일 가입을 위한 Supabase Auth 준비

## 실행

```bash
npm install
npm run dev
```

## 환경 변수

`.env.example`을 참고해 Supabase, OpenAI, 네이버 쇼핑 검색, 점보키즈 API, 발송사 API 값을 설정합니다.

현재 구현은 외부 API 키가 없어도 모의 응답으로 동작합니다.

## Supabase

`supabase/schema.sql`에 기본 테이블, enum, RLS 초안이 들어 있습니다.
Kakao/Google OAuth는 Supabase Dashboard에서 provider를 활성화한 뒤 redirect URL을 등록합니다.
