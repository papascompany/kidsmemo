# Kidsmemo Project Handoff Plan

이 문서는 다른 PC에 세팅한 Codex가 현재 프로젝트의 제품 방향, 기술 계획, 구현 상태, 다음 작업을 빠르게 이해하고 이어받기 위한 개발 계획서입니다.

## 1. 프로젝트 개요

프로젝트명: **키즈메모 Kidsmemo**

### 2026-06-09 쿠폰 방향 정정

쿠폰 기능의 현재 목적은 **선생님이 학부모에게 쿠폰을 보내는 것**이 아니다.

현재 활성 제품 방향:

- 점보키즈 관리자가 유치원/어린이집 원장님과 선생님이 사용할 쿠폰 또는 할인코드를 제공한다.
- 원장님/선생님은 키즈메모의 `점보키즈 쿠폰함`에서 제공된 쿠폰을 확인한다.
- 쿠폰 코드를 복사하거나 다운로드한다.
- 점보키즈 또는 고도몰 주문 과정에서 해당 코드를 사용한다.
- 기존 학부모 발송형 쿠폰 캠페인 구현은 `docs/legacy-parent-coupon-campaign-flow.md`에 문서화하고, 소스에는 레거시 주석을 남겨 보존한다.

목표:

- 어린이집, 유치원 원장님과 선생님이 1년간 주요 행사와 일정을 등록한다.
- 점보키즈 관리자가 제공한 쿠폰/할인코드를 원장님과 선생님이 확인, 복사, 다운로드할 수 있게 한다.
- 점보키즈는 사용자가 직접 운영 중인 포토북, 앨범, 사진 인화 온라인 서비스다.
- 쿠폰은 점보키즈/고도몰 사용처와 함께 제공되며, 실제 운영에서는 점보키즈 관리자 콘솔과 고도몰 쿠폰 API 연동을 검토한다.
- AI 행사 도우미와 AI 감동 문구 생성기를 통해 서비스 활성화를 돕는다.

핵심 사용자:

- 어린이집 원장
- 유치원 원장
- 선생님
- 서비스 운영 관리자

핵심 운영 원칙:

- 각 유치원/어린이집은 독립된 organization workspace로 취급한다.
- 원장 계정은 마이페이지에서 자신의 기관 정보, 행사 일정, 점보키즈 쿠폰함, AI 행사 조언, 발송 설정을 관리한다.
- 원장/교사 계정은 자신이 속한 기관의 데이터만 볼 수 있어야 한다.
- 다른 유치원/어린이집의 일정, AI 결과, 쿠폰 제공 내역, 학부모 발송 이력은 절대 노출되면 안 된다.
- 서비스 운영 관리자 `admin`만 별도의 운영 권한으로 여러 기관 상태를 볼 수 있다.

제품 성격:

- 업무형 SaaS
- 모바일과 데스크톱 모두 지원하는 반응형 웹
- Pretendard 폰트 사용
- 마케팅 랜딩보다 실제 운영 대시보드 중심
- 유치원/어린이집 교사가 매일 써도 부담 없는 부드럽고 따뜻한 감성
- 모던하고 세련된 운영 도구이되, 차갑거나 엔터프라이즈스럽게 보이지 않게 한다

### 디자인 컨셉 / Visual Direction

Kidsmemo의 UI는 유치원 교사와 원장님이 사용하는 서비스라는 맥락을 분명히 가져간다. 전체 인상은 **부드럽고 따뜻하며, 모던하고 세련된 반응형 SaaS**여야 한다.

핵심 방향:

- 한글 폰트는 Pretendard를 기본으로 유지한다.
- 전반적인 UI/UX는 모바일과 데스크톱 모두에서 자연스럽고 매끄럽게 동작해야 한다.
- 반응형 제어는 핵심 품질 기준이다. 320px, 390px, 768px, 1440px 폭에서 텍스트, 버튼, 카드, 테이블 대체 UI가 겹치거나 삐져나오면 안 된다.
- 이모지나 장식 아이콘에 과도하게 기대지 않는다.
- 히어로 영역과 주요 콘텐츠 섹션은 실사 사진, 이미지컷, 운영 현장감 있는 비주얼을 적극 사용한다.
- 이미지 위에 텍스트를 오버레이하는 magazine/editorial style을 지향한다.
- 콘텐츠 카드는 단순한 흰 박스 나열이 아니라, 사진 배경과 텍스트 레이어가 자연스럽게 결합된 세련된 카드 형태를 우선한다.
- 사용자가 패션잡지나 라이프스타일 매거진을 훑는 듯한 부드러운 리듬을 느끼되, 실제 업무 도구로서 정보 탐색과 조작은 빠르고 명확해야 한다.

Visual tone:

- 따뜻함: 어린이집/유치원 행사, 교사, 학부모 커뮤니케이션에 어울리는 온도감
- 전문성: 원장님이 업무 도구로 믿고 쓸 수 있는 정돈된 정보 구조
- 세련됨: 단조로운 행정 시스템처럼 보이지 않게 이미지, 여백, 타이포그래피를 섬세하게 사용
- 안정감: 쿠폰 발송, 일정, 학부모 안내처럼 실수하면 안 되는 업무를 다루므로 버튼/상태/피드백은 명확하게 표현

Image usage:

- 히어로와 주요 섹션에는 실제 유치원/교실/행사/사진 앨범/포토북/따뜻한 교사 업무 장면에 가까운 이미지를 사용한다.
- 이미지가 단순 장식이 아니라 해당 섹션의 의미를 강화해야 한다.
- 텍스트 오버레이는 충분한 대비를 확보한다. 어두운 overlay나 gradient overlay를 사용할 수 있으나 과도하게 어둡거나 흐릿하게 만들지 않는다.
- 아이콘은 기능 버튼이나 상태 표시처럼 명확한 의미가 있을 때 보조적으로 사용한다.

Layout guidance:

- 대시보드 자체는 업무형 UI이므로 정보 밀도와 반복 사용성을 유지한다.
- 그러나 섹션 진입부, 쿠폰 안내, AI 결과, 행사 제안 등은 이미지 기반 editorial card로 감성을 더한다.
- 카드 radius는 과도하게 둥글지 않게 유지하고, 정돈된 magazine grid처럼 보이게 한다.
- 모바일에서는 이미지 카드가 세로 리듬을 만들고, CTA와 상태 정보가 항상 손에 닿는 위치에 있어야 한다.

## 2. 핵심 기능 계획

### Auth / Membership

- Kakao OAuth 가입
- Google OAuth 가입
- 이메일/비밀번호 직접가입
- 가입 후 기관 생성 또는 초대 코드로 기관 참여
- 로그인 후 원장/교사는 자신의 기관 전용 마이페이지/워크스페이스로 진입
- 역할:
  - `owner`
  - `manager`
  - `teacher`
  - `admin`

### My Page / Organization Workspace

각 유치원 원장 계정은 자신의 유치원만을 위한 독립 관리 영역을 가진다.

원장 마이페이지에서 관리해야 할 것:

- 기관 기본 정보
  - 유치원/어린이집 이름
  - 주소/연락처
  - 대표자/담당자 정보
  - 초대 코드 또는 구성원 초대 상태
- 기관별 연간 행사 일정
  - 행사 등록/수정/삭제
  - 반/연령/대상 설정
  - 준비물/안내문/참고 혜택
- 기관별 AI 행사 조언
  - 행사 아이디어 생성 이력
  - 준비 체크리스트
  - 가정통신문/학부모 메시지 초안
  - AI 추천 결과 저장 또는 재사용
- 기관별 쿠폰/혜택 설정
  - 점보키즈 관리자가 제공한 쿠폰/할인코드 확인
  - 쿠폰 코드 복사와 다운로드
  - 점보키즈/고도몰 사용처 링크 확인
  - 다운로드/사용 상태 이력 확인
- 발송 설정과 이력
  - 알림톡/SMS/email 발송 상태
  - 실패 사유
  - 재발송 필요 항목

UX 원칙:

- 마이페이지는 “내 유치원 운영실”처럼 느껴져야 한다.
- 원장님이 현재 보고 있는 기관이 무엇인지 항상 명확해야 한다.
- 기관 전환이 필요한 사용자는 명시적인 organization switcher를 사용한다.
- 데이터가 없는 첫 사용자는 차갑게 빈 화면을 보지 않고, 사진/예시/가이드가 있는 따뜻한 onboarding card를 본다.
- 행사 일정, AI 조언, 점보키즈 쿠폰함은 서로 연결되어 있다는 느낌을 주되, 화면 조작은 단순해야 한다.
- 마이페이지 역시 Pretendard, 따뜻한 이미지 기반 카드, 매끄러운 반응형 레이아웃을 유지한다.

보안/데이터 격리 원칙:

- 모든 기관 소유 데이터에는 `organization_id`가 있어야 한다.
- API route는 request session에서 user를 확인하고 membership/role을 검증해야 한다.
- Supabase RLS는 organization membership 기준으로 select/insert/update/delete를 제한해야 한다.
- service-role key는 cron, webhook, 운영자 전용 서버 작업처럼 제한된 경로에서만 사용한다.
- AI 생성 결과도 기관별 데이터로 저장되며, 다른 기관과 공유되지 않는다.

### 행사 일정 관리

- 기관별 연간 행사 등록
- 행사 등록/수정
- 행사일, 대상 연령/반, 설명, 준비물, 참고 혜택 관리
- 반복 행사 지원 예정
- 행사 전날 reminder job 대상이 됨
- 마이페이지에서는 자기 기관 일정만 조회/관리

### 점보키즈 쿠폰함

현재 활성 쿠폰 기능은 점보키즈 관리자가 원장님/선생님에게 제공한 쿠폰 또는 할인코드를 보여주는 쿠폰함이다.

원장님/선생님 화면:

- 제공된 쿠폰명, 혜택, 유효기간, 사용 가능 사이트 확인
- 쿠폰/할인코드 복사
- 쿠폰 파일 다운로드
- 점보키즈 또는 고도몰 사용처 링크 이동
- 기관별 제공 쿠폰만 표시

운영 관리자 화면 예정:

- 기관별 쿠폰 배정
- 원장/선생님 역할별 쿠폰 배정
- 고도몰 쿠폰 코드 또는 점보키즈 혜택 코드 등록
- 다운로드/사용 상태 추적

레거시 보존:

- 기존 학부모 발송형 쿠폰 캠페인 생성 UI는 `src/components/coupon-manager.tsx`에 `LegacyParentCouponCampaignManager`로 남긴다.
- 기존 공개 쿠폰 랜딩은 `src/app/coupon/[campaignId]/page.tsx`에 남긴다.
- 상세 내용은 `docs/legacy-parent-coupon-campaign-flow.md`를 기준으로 한다.

### 자동 발송

현재 자동 발송은 행사 안내/리마인더와 AI 메시지 흐름을 위한 백엔드 준비 영역이다. 쿠폰을 학부모에게 자동 발송하는 기능은 현재 활성 제품 범위가 아니며 레거시/추후 기능으로 보존한다.

- 매일 오전 배치 또는 cron으로 다음 날 행사를 조회
- 행사 안내/리마인더 대상과 상태를 확인
- 학부모 발송형 쿠폰 캠페인은 재활성화 전 별도 승인, 수신동의, 메시지 템플릿 검토가 필요
- 발송 채널 우선순위:
  - 카카오 알림톡
  - SMS/LMS
  - 이메일
- 발송 이력, 실패 사유, provider message id 저장 예정

### 점보키즈 API 연동

예정 인터페이스:

- 점보키즈 관리자 쿠폰/할인코드 조회
- 점보키즈 쿠폰 다운로드 이력 저장
- 고도몰 쿠폰 코드/사용처 연결
- 레거시 학부모 캠페인 재활성화 시에만 `POST /v1/coupons/issue`, `POST /v1/credits/grant`, `GET /v1/benefits/{benefitId}` 검토

요청 필드 예:

- `organizationId`
- `eventId`
- `benefitType`
- `amount`
- `expiresAt`
- `recipientName`
- `recipientPhone`
- `recipientEmail`

응답 필드 예:

- `code`
- `landingUrl`
- `expiresAt`
- `status`

### AI 행사 도우미

입력:

- 행사명
- 연령대
- 준비 기간
- 예산
- 장소
- 계절
- 원 분위기

출력:

- 행사 아이디어
- 준비 체크리스트
- 예상 일정표
- 가정통신문 초안
- 행사 용품 쇼핑 추천
- 기관별 AI 조언 이력으로 저장 예정
- 원장/교사는 자신의 기관에서 생성한 AI 결과만 조회 가능

쇼핑 추천:

- Naver Shopping Search API 연동 예정
- API 키가 없을 때는 mock/fallback 추천 사용

### AI 감동 문구 생성기

목적:

- 원장님/선생님이 학부모에게 보낼 따뜻한 메시지 작성

입력:

- 목적: 행사 안내, 감사, 성장 기록, 참여 독려, 사과/양해
- 톤: 따뜻함, 격식 있음, 짧고 선명함, 감성적
- 행사명
- 발신자명
- 선택적 상황 설명

출력:

- 메시지 후보 3개
- 안전 메모

## 3. 기술 스택

현재 선택한 스택:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Pretendard font
- Supabase 예정
  - Postgres
  - Auth
  - Storage
  - RLS
- OpenAI Responses API 예정
- Naver Shopping Search API 예정
- 카카오 알림톡/SMS/이메일 발송사 API 예정
- 점보키즈 쿠폰 API 예정

현재 구현은 외부 API 키가 없어도 mock/fallback으로 동작하게 설계되어 있다.

## 4. 현재 구현 상태

현재 저장소에는 Sprint 1 프로토타입이 구현되어 있다.

주요 구현:

- Next.js 앱 구조
- 운영 대시보드
- 행사 관리 UI
- 점보키즈 쿠폰함 UI
- 레거시 수동 쿠폰 랜딩 페이지
- AI 행사 도우미 UI
- AI 감동 문구 생성기 UI
- 관리자 콘솔 UI
- API routes
- mock repository/service layer
- Supabase schema 초안
- QA 문서
- CTO 스프린트 문서

중요 파일:

- `src/app/page.tsx`
- `src/components/event-manager.tsx`
- `src/components/coupon-manager.tsx`
- `src/components/ai-workbench.tsx`
- `src/lib/types.ts`
- `src/lib/repositories.ts`
- `src/lib/validation.ts`
- `src/lib/api-response.ts`
- `src/lib/reminders.ts`
- `src/lib/ai.ts`
- `src/lib/openai-client.ts`
- `src/lib/naver-shopping.ts`
- `supabase/schema.sql`
- `docs/sprint-1-cto-charter.md`
- `docs/sprint-1-board.md`
- `docs/sprint-1-cto-review.md`
- `docs/qa-sprint-1.md`

검증된 상태:

- `npm run lint`: 통과
- `npm run build`: 통과
- `GET /api/events`: `{ ok: true, data }` 형식 확인
- invalid `POST /api/events`: `{ ok: false, error }` 형식 확인

### 2026-06-02 새 PC 이전 후 CTO 점검 결과

새 PC 경로:

```text
C:\Users\yohan\OneDrive\Desktop\codex project\kidsmemo
```

현재 저장소/환경 상태:

- GitHub repo: `https://github.com/papascompany/kidsmemo`
- 로컬 브랜치: `main`
- 원격 추적: `origin/main`
- 최신 커밋: `e3a2a4d Add kidsmemo app scaffold`
- 작업 트리: clean
- Node: `v24.14.0`
- npm: `11.11.0`
- Git: `2.54.0.windows.1`
- GitHub CLI: 설치됨, `papascompany` 인증 확인
- Vercel CLI: 설치됨, `papas-yohan` 로그인 확인
- Supabase CLI: 설치됨, 프로젝트 로그인/링크는 아직 확인 필요

새 PC에서 재검증:

- `npm install`: 완료
- `npm run lint`: 통과
- `npm run build`: 통과
- `npm run dev`: foreground 실행 시 Next.js Ready 확인

주의:

- `gh`는 일부 Codex/PowerShell 세션에서 PATH에 바로 잡히지 않을 수 있다. 이 경우 직접 경로를 사용한다.

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

- GitHub 이메일 privacy protection 때문에 로컬 git email은 `papascompany@users.noreply.github.com`로 설정되어 있다.
- Vercel 프로젝트 링크는 아직 이 repo에 고정하지 않았다. 배포 전 `vercel link`가 필요하다.
- Supabase 프로젝트 연결은 hold point 때문에 아직 하지 않는다.

## 5. API 응답 규칙

Backend Sprint 1에서 API 응답 형식을 통일했다.

성공:

```json
{
  "ok": true,
  "data": {}
}
```

실패:

```json
{
  "ok": false,
  "error": {
    "code": "validation_error",
    "message": "요청 데이터가 올바르지 않습니다.",
    "details": []
  }
}
```

주요 API routes:

- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/:eventId`
- `POST /api/events/import-year-plan`
- `GET /api/admin/coupon-campaigns`
- `POST /api/admin/coupon-campaigns`
- `PATCH /api/admin/coupon-campaigns/:campaignId`
- `POST /api/admin/coupon-campaigns/:campaignId/items`
- `POST /api/admin/coupon-campaigns/:campaignId/targets`
- `POST /api/admin/coupon-campaigns/:campaignId/notice`
- `POST /api/ai/event-assistant`
- `POST /api/ai/parent-message`
- `POST /api/jobs/send-reminders`
- `POST /api/webhooks/message-provider`
- `POST /api/webhooks/jumbokids-benefits`

## 6. CTO / 서브에이전트 운영 계획

프로젝트는 CTO 중심 오케스트레이션 방식으로 진행한다.

역할:

- CTO / Orchestrator
  - 제품/기술 방향 결정
  - 작업 분해
  - 에이전트별 책임 범위 지정
  - 결과 리뷰
  - 충돌 조정
  - 통합 순서 결정

- Backend Engineer
  - API routes
  - validation
  - repository/service layer
  - Supabase schema/RLS
  - reminder job

- Frontend Engineer
  - 행사/쿠폰/AI/관리자 UI
  - API 호출 연결
  - 반응형 웹
  - 인쇄 UI

- AI Integration Engineer
  - OpenAI adapter
  - Naver Shopping adapter
  - structured output validation
  - fallback behavior

- Designer / UX
  - 원장님/선생님 관점 UX 점검
  - 모바일/인쇄/업무 흐름 개선
  - UI 정보 구조 개선

- QA Engineer
  - QA checklist
  - API smoke test
  - 반응형/인쇄 QA
  - 릴리즈 게이트 관리

Sprint 1 통합 순서:

1. Backend
2. AI Integration
3. Frontend
4. Designer / UX
5. QA

이 순서를 유지하는 이유:

- Backend가 API 계약을 먼저 안정화한다.
- AI는 UI/쿠폰과 충돌이 적어 독립적으로 통합한다.
- Frontend는 안정화된 API 형식에 맞춰 연결한다.
- Designer는 통합된 화면 기준으로 UX를 다듬는다.
- QA는 최종 동작 기준으로 검증한다.

### 2026-06-02 CTO 서브에이전트 2차 점검

새 PC 이전 후 CTO가 다음 서브에이전트들을 별도 worktree로 오케스트레이션했다.

| Workstream | 목적 | 결과 |
| --- | --- | --- |
| Backend / Supabase readiness | schema, repository, API route, validation 점검 | Supabase 전환 구조는 준비됨. 인증/인가, RLS policy 확장, service-role 범위 분리, reminder idempotency 저장, 공개 쿠폰 랜딩 정책이 다음 핵심 리스크 |
| Frontend / UX QA | main dashboard, coupon landing, responsive, print flow 점검 | `lint/build/dev Ready` 확인. 브라우저 visual QA는 pending. 모바일 quick nav, 긴 라벨 overflow, print preview 확인 필요 |
| QA Smoke | Sprint 1 API smoke test 실행 | events/coupons/items/targets/notices/AI/coupon landing/not-found 대부분 PASS. reminder job은 mock seed의 duplicate job 때문에 `generatedJobs: []` |
| Deployment / Ops | GitHub/Vercel/Supabase/Node/npm 환경 점검 | GitHub/Vercel 준비 양호. Supabase login/link 미확인. Node 24와 Next 16 배포 정합성은 배포 전 확인 필요 |

CTO 통합 판정:

- 현재 PC에서 개발 계속 가능.
- Sprint 1 mock/fallback 앱은 통합 완료 상태로 본다.
- Supabase 연결은 사용자 승인 전까지 계속 보류한다.
- 다음 작업은 QA 문서 보정, 브라우저 수동 QA, 모바일 UX 보강, Ops 링크 준비 순서가 적절하다.

## 7. 현재 Hold Point

중요: 현재는 **Supabase 연결 전 대기 상태**다.

아직 하지 말아야 할 작업:

- `supabase/schema.sql` 실제 적용
- Supabase 프로젝트 연결
- Supabase 환경 변수 설정
- mock repository를 live Supabase repository로 교체
- Supabase Storage 이미지 업로드 연결

Supabase 연결 전 허용되는 작업:

- 브라우저 QA
- UI 문구/레이아웃 소폭 개선
- QA 문서 보강
- API smoke test 보강
- 모바일 quick navigation 개선
- 인쇄 flow QA
- Vercel 프로젝트 링크 준비 및 환경 변수 목록 정리
- Supabase 로그인 상태 확인과 프로젝트 후보 확인

Supabase 연결 전에도 조심해야 할 작업:

- `vercel link`는 허용 가능하지만 실제 production 배포는 별도 승인 후 진행한다.
- Supabase 프로젝트 링크는 2026-06-10 완료되었다.
  - Project URL: `https://fhakjrppirmjdgqlljzd.supabase.co`
  - Project ref: `fhakjrppirmjdgqlljzd`
- `supabase db push`, schema 적용, live repository 활성화는 migration/RLS 검토 후 진행한다.
- mock repository를 유지해야 하며, 외부 API 키가 없어도 앱이 동작해야 한다.

## 8. 다음 작업 계획

### 다음 CTO 액션

1. QA 문서 보정
   - reminder job smoke 기대값을 `duplicate_job` 기준으로 둘지, seed를 조정해 generated job을 검증할지 결정
2. 현재 코드 기준 브라우저 QA
   - `/`
   - `/coupon/coupon-2`
   - `/coupon/unknown-campaign`
   - 320/390/768/1440 viewport
   - print preview
3. 모바일 quick navigation 추가 여부 결정
4. 점보키즈 쿠폰함 카드에 핵심 운영 정보 보강
   - 기관/역할별 제공 대상
   - 다운로드 이력
   - 점보키즈/고도몰 사용처
   - 사용 완료 상태
5. 행사 모바일 카드 정보 우선순위 정리
6. AI 행사 도우미 입력 필드 확장
   - 행사명
   - 연령
   - 장소
   - 예산
7. Vercel link 여부 결정
8. Supabase 연결 착수 여부 사용자 승인 대기

### Supabase 연결 승인 후 작업

1. Supabase 프로젝트 생성/연결
2. 기존 `supabase/schema.sql`을 제품 방향에 맞는 migration으로 재정리
3. 점보키즈 제공 쿠폰함 중심의 쿠폰 테이블/RLS 설계
4. Kakao/Google OAuth 설정
5. `.env.local` 구성
6. request cookie/session 기반 `requireUser`, `requireOrgRole` 유틸 추가
7. API route에 org scope/role guard 적용
8. service-role repository와 user-scoped repository 분리
9. RLS policy 확장
10. 행사 CRUD persistence 구현
11. 점보키즈 제공 쿠폰/할인코드 persistence 구현
12. 다운로드/복사/사용 상태 이력 저장
13. 레거시 공개 쿠폰 랜딩 접근 정책은 재활성화 시 별도 설계
14. reminder job 저장/upsert와 idempotency 구현
15. 웹훅 처리 구현
16. QA 재검증

## 9. 새 PC에서 이어받는 방법

새 PC에 프로젝트 폴더를 복사한 뒤:

```bash
cd kidsmemo
npm install
npm run dev
```

검증:

```bash
npm run lint
npm run build
```

개발 서버:

```text
http://localhost:3000
```

만약 3000번 포트가 사용 중이면 Next.js가 다른 포트를 안내한다.

현재 새 PC에서는 GitHub 연결과 push가 완료되어 있다. 새로 clone하는 경우:

```bash
git clone https://github.com/papascompany/kidsmemo.git
cd kidsmemo
npm install
npm run lint
npm run build
```

이미 복사된 현재 PC 폴더에서는:

```bash
git status
git pull
npm install
npm run dev
```

CLI 확인:

```bash
node --version
npm --version
git --version
vercel --version
supabase --version
```

GitHub CLI가 PATH에 없으면:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

## 10. 새 Codex에게 줄 첫 요청 예시

```text
이 프로젝트는 Kidsmemo라는 어린이집/유치원 행사 리마인드 SaaS입니다.
먼저 docs/project-handoff-plan.md, docs/sprint-1-cto-review.md, docs/qa-sprint-1.md를 읽고 현재 상태를 파악해주세요.
현재는 Supabase 연결 전 대기 상태입니다.
Supabase 연결은 제가 명시적으로 승인하기 전까지 시작하지 마세요.
우선 현재 mock/fallback 기반 앱의 브라우저 QA, reminder job smoke 기대값 정리, 모바일 UX 개선 계획부터 검토해주세요.
```

## 11. 개발 철학

- 원장님과 선생님이 “어렵지 않다”고 느끼는 업무형 UI를 우선한다.
- 화려한 랜딩보다 실제 운영 화면을 먼저 만든다.
- 외부 API 키가 없어도 앱은 mock/fallback으로 동작해야 한다.
- API 계약과 validation은 먼저 안정화한다.
- Supabase 연결 이후에도 권한/RLS/개인정보 보호를 핵심 리스크로 관리한다.
- 카카오 알림톡/SMS/이메일 발송은 승인/템플릿/수신동의 이슈를 운영 리스크로 별도 관리한다.
- 유치원별 독립 workspace와 마이페이지 경험을 제품의 중심 구조로 둔다.
- 원장님이 “내 유치원만의 일정과 조언을 안전하게 관리한다”고 느끼는 UI/UX를 우선한다.
