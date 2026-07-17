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

개발/QA mock 모드에서는 외부 API 키 없이도 모의 응답을 사용할 수 있습니다. Production live 모드의 push·메시지 provider가 미연결이면 실제 발송을 하지 않고 `503`으로 차단하며, AI는 결과에 fallback 출처를 표시합니다.

live smoke 전에는 provider와 무관한 환경 사전 점검을 실행합니다. 대상과 smoke URL을 명시하고, 선택한 smoke에 필요한 환경변수 이름의 존재와 target 분리만 확인합니다. 값이나 credential 유효성은 출력하거나 확인하지 않습니다.

```bash
KIDSMEMO_RELEASE_TARGET=production \
KIDSMEMO_RELEASE_BASE_URL=https://kidsmemo.vercel.app \
NEXT_PUBLIC_APP_URL=https://kidsmemo.vercel.app \
KIDSMEMO_ADMIN_SMOKE_BASE_URL=https://kidsmemo.vercel.app \
npm run qa:release-preflight -- --profile admin-live
```

자세한 profile별 필수 변수와 preview/production 규칙은 `docs/live-release-runbook.md`를 참고합니다.

## Supabase

`supabase/schema.sql`에 기본 테이블, enum, RLS 초안이 들어 있습니다.
Kakao/Google OAuth는 Supabase Dashboard에서 provider를 활성화한 뒤 redirect URL을 등록합니다.
