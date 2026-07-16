# 키즈메모 라이브 출시 운영 체크리스트

> 기준일: 2026-07-16
>
> 이 문서는 과거 QA·배포 문서를 대체하거나 삭제하지 않는다. 기존 기록은 각 문서에 보존하고, 출시 판단과 실행 순서는 이 문서의 현재 상태를 기준으로 한다. 비밀값과 실제 환경변수 값은 이 문서에 기록하지 않는다.

## 1. 출시 판단

현재 상태는 **출시 준비 중**이다. 저장소와 배포 연결, 일부 live API 권한 smoke, 기본 빌드 검증은 완료 기록이 있지만, 최종 production sign-off는 아직 하지 않는다.

- [ ] 아래 남은 단계와 smoke를 현재 target 환경에서 재실행한다.
- [ ] 브라우저 수동 QA와 print preview를 완료한다.
- [ ] 실제 메시지·푸시 provider를 결정하고 운영 승인을 받는다.
- [ ] provider, 수신동의, 템플릿, webhook, retry/장애 대응 기준이 확정되기 전에는 실발송을 production 완료로 표시하지 않는다.
- [ ] 모든 blocker가 해소되고 담당자가 production sign-off를 남긴 뒤에만 출시 완료로 전환한다.

## 2. 완료된 검증 기록

다음은 기존 문서에 남아 있는 완료 기록이다. 날짜가 지난 항목은 출시 직전 smoke의 대체물이 아니므로, 코드·환경 변경이 있었으면 재실행한다.

- [x] Vercel 프로젝트 연결과 production 배포 상태 `Ready` 확인.
- [x] production `/`, `/app`, `/admin` route 응답 확인.
- [x] 비인증 `/api/events`가 mock 데이터를 노출하지 않고 인증 오류를 반환하는지 확인.
- [x] Supabase 프로젝트 연결, 초기 migration push, linked DB lint 통과 기록.
- [x] bearer token 기반 사용자 세션, organization membership, user-scoped repository와 service-role 전용 경로 분리.
- [x] member organization의 event 조회·생성 및 비회원 organization write 차단 API smoke 통과.
- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check` 통과 기록.
- [x] `/app`의 320/390/768/1440 폭 수평 overflow 점검 기록.
- [x] 관리자 운영, 기관 CMS, 초대·온보딩, 교직원 쿠폰 흐름과 대응 smoke script가 저장소에 존재.
- [x] 직원 휴가·연차 및 원아 출석 기능을 제품 범위에서 제외하는 정리 migration이 추가됨.

근거 문서: `docs/deployment-env-inventory.md`, `docs/project-handoff-plan.md`, `docs/qa-sprint-1.md`, `docs/sprint-1-board.md`.

## 3. 남은 단계

### 출시 전 필수

- [ ] **Target env read-only 확인:** 실행 대상이 preview인지 production인지 확인하고, 필요한 변수의 존재·환경 범위·노출 위치를 점검한다. 값 자체는 로그에 출력하지 않는다.
- [ ] **DB migration 확인:** 현재 코드에 포함된 모든 migration이 target Supabase에 적용되었고, migration 목록과 RLS 상태가 일치하는지 확인한다. 기존 운영 데이터를 임의로 삭제하지 않는다.
- [ ] **정적 검증 재실행:** `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- [ ] **live API smoke 재실행:** 아래 순서를 지키고 각 결과와 실행 target을 기록한다.
- [ ] **브라우저 QA:** `/`, `/login`, `/signup`, `/onboarding`, `/app`, `/admin`을 확인한다. 데스크톱과 모바일에서 auth 오류, organization 전환, CMS 반영, 쿠폰 조회·다운로드, admin 탭·테이블, AI 영역을 확인한다.
- [ ] **print preview:** `/app#ai-helper`에서 인쇄 미리보기, 긴 문구, 페이지 잘림을 확인한다.
- [ ] **격리·정리 확인:** smoke가 만든 QA organization, invite, campaign, coupon, CMS marker가 의도한 정책에 따라 정리되었는지 확인한다.
- [ ] **production sign-off:** 담당자, 시각, 배포 식별자, smoke 결과, known limitation, rollback 담당자를 기록한다.

### 출시 후 운영 전환

- [ ] production에서 실제 수신자 없이 provider dry-run 또는 단일 QA 수신자 검증을 완료한다.
- [ ] 첫 운영 기간에는 인증 오류, organization isolation, API 5xx, provider delivery 실패·재시도·webhook을 집중 관찰한다.
- [ ] provider가 결정되기 전까지 발송 기능은 mock/fallback 상태로 유지하고, 실제 발송을 전제로 한 공지나 성공 판정을 하지 않는다.

## 4. 환경변수 이름

아래는 출시·검증에 필요한 이름 목록이다. **값은 이 문서에 쓰지 않는다.** secret은 Vercel 환경 설정 또는 안전한 로컬 secret store에서만 주입한다.

### 런타임 및 Supabase

| 이름 | 용도 | Production 기준 |
| --- | --- | --- |
| `KIDSMEMO_DATA_BACKEND` | mock 또는 Supabase backend 선택 | live 전환 승인 전에는 mock 유지 |
| `KIDSMEMO_ALLOW_LIVE_SUPABASE` | live Supabase 명시적 unlock | 별도 승인 전에는 unlock하지 않음 |
| `KIDSMEMO_ALLOW_MOCK_RUNTIME` | production에서 mock 인증·repository를 임시 허용하는 개발/QA flag | Production에서는 반드시 `false` 또는 미설정 |
| `KIDSMEMO_ALLOW_MOCK_PUSH` | live 환경에서 mock push를 임시 허용하는 개발/QA flag | Production에서는 반드시 `false` 또는 미설정 |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저·서버 Supabase URL | target 환경에 존재해야 함 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 로그인·RLS 사용자 client | 브라우저 공개 가능 범위만 사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 bootstrap·운영 job | public/client env와 로그에 절대 노출하지 않음 |
| `NEXT_PUBLIC_APP_URL` | 앱의 public URL 참조 | target deployment와 일치 확인 |

### 계정 및 smoke 입력

| 이름 | 사용처 |
| --- | --- |
| `KIDSMEMO_ADMIN_EMAIL` | admin live/browser/CMS smoke |
| `KIDSMEMO_ADMIN_PASSWORD` | admin live/browser/CMS smoke |
| `KIDSMEMO_TEACHER_EMAIL` | 기관 CMS·organization scope smoke |
| `KIDSMEMO_TEACHER_PASSWORD` | 기관 CMS·organization scope smoke |
| `KIDSMEMO_E2E_ADMIN` | staff coupon E2E admin credential |
| `KIDSMEMO_E2E_STAFF` | staff coupon E2E 대상 기관 credential |
| `KIDSMEMO_E2E_OTHER_STAFF` | 다른 기관 격리 검증 credential |
| `KIDSMEMO_E2E_STAFF_ORGANIZATION_ID` | staff coupon E2E 대상 기관 식별자 |
| `KIDSMEMO_E2E_OTHER_STAFF_ORGANIZATION_ID` | 다른 기관 식별자 |
| `KIDSMEMO_ADMIN_OPERATIONS_SMOKE_ORGANIZATION_ID` | admin operations 대상 기관 선택 |
| `KIDSMEMO_CMS_SMOKE_ORGANIZATION_ID` | CMS smoke 대상 기관 선택 |
| `KIDSMEMO_ONBOARDING_OWNER_EMAIL` | onboarding owner 테스트 계정 |
| `KIDSMEMO_ONBOARDING_OWNER_PASSWORD` | onboarding owner 인증 |
| `KIDSMEMO_ONBOARDING_JOINER_EMAIL` | onboarding joiner 테스트 계정 |
| `KIDSMEMO_ONBOARDING_JOINER_PASSWORD` | onboarding joiner 인증 |

### Target·보존 정책 override

| 이름 | 사용처 |
| --- | --- |
| `KIDSMEMO_ADMIN_SMOKE_BASE_URL` | admin API smoke target override |
| `KIDSMEMO_ADMIN_OPERATIONS_SMOKE_BASE_URL` | admin operations target override |
| `KIDSMEMO_CMS_SMOKE_BASE_URL` | organization CMS target override |
| `KIDSMEMO_ONBOARDING_SMOKE_BASE_URL` | onboarding target override |
| `KIDSMEMO_E2E_BASE_URL` | staff coupon E2E target override |
| `KIDSMEMO_ADMIN_BROWSER_QA_BASE_URL` | browser QA target override |
| `KIDSMEMO_ADMIN_BROWSER_QA_TARGET` | browser QA target 구분 |
| `KIDSMEMO_ADMIN_BROWSER_QA_MODE` | browser QA 실행 모드 |
| `KIDSMEMO_ADMIN_BROWSER_QA_TIMEOUT_MS` | browser QA 요청 timeout |
| `KIDSMEMO_ADMIN_SMOKE_KEEP_RECORD` | admin smoke QA record 보존 여부 |
| `KIDSMEMO_ADMIN_OPERATIONS_SMOKE_KEEP_RECORD` | admin operations record 보존 여부 |
| `KIDSMEMO_ONBOARDING_SMOKE_KEEP_RECORD` | onboarding QA record 보존 여부 |

### 선택 provider 및 외부 API

| 이름 | 현재 의미 |
| --- | --- |
| `OPENAI_API_KEY` | live AI output 선택 시 필요 |
| `OPENAI_MODEL` | AI model override |
| `NAVER_CLIENT_ID` | live shopping 검색 선택 시 필요 |
| `NAVER_CLIENT_SECRET` | live shopping 검색 인증 |
| `JUMBOKIDS_API_BASE_URL` | 점보키즈 live 연동 후보 |
| `JUMBOKIDS_API_KEY` | 점보키즈 live 연동 인증 후보 |
| `MESSAGE_PROVIDER_API_BASE_URL` | 실제 메시지 provider 결정 후 endpoint |
| `MESSAGE_PROVIDER_API_KEY` | 실제 메시지 provider 결정 후 credential |

bootstrap 작업을 할 때만 추가로 `KIDSMEMO_BOOTSTRAP_EMAIL`, `KIDSMEMO_BOOTSTRAP_PASSWORD`, `KIDSMEMO_BOOTSTRAP_PROFILE_NAME`, `KIDSMEMO_BOOTSTRAP_ORG_NAME`, `KIDSMEMO_BOOTSTRAP_ORG_TYPE`, `KIDSMEMO_BOOTSTRAP_ORG_REGION`, `KIDSMEMO_BOOTSTRAP_ROLE`, `KIDSMEMO_BOOTSTRAP_SEED_EVENT` 및 admin bootstrap alias를 사용한다. service-role 값은 로컬 서버 작업에만 주입한다.

## 5. Smoke 실행 순서

모든 smoke는 실행 전에 target env와 테스트 계정, QA organization 범위를 확인한다. 실패 시 다음 단계로 넘어가지 않고 실패 endpoint·오류 코드·정리 결과만 기록한다.

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. `npm run qa:admin-browser-auth`
5. `npm run smoke:admin-live`
6. `npm run smoke:admin-operations-live`
7. `npm run smoke:organization-cms-live`
8. `npm run test:staff-coupon-e2e`
9. `npm run smoke:onboarding-invite-live`
10. 브라우저 수동 QA와 print preview

실행 규칙:

- production에서는 target override를 명시적으로 확인하고, 기본값에 의존하지 않는다.
- preview에서는 preview URL을 주입하고 preview에 연결된 격리 QA 데이터만 사용한다.
- mutation smoke는 QA marker를 사용하고, `KEEP_RECORD`가 필요한 경우에만 증적 보존을 승인받는다.
- access token, password, anon/service key는 출력·커밋·문서화하지 않는다.
- 브라우저 QA가 통과해도 실제 provider 발송 성공을 의미하지 않는다.

## 6. Production과 Preview 운영 구분

| 구분 | 목적 | 데이터·변경 규칙 | 출시 판단 |
| --- | --- | --- | --- |
| **Preview** | candidate 배포 검증, UI·브라우저·통합 smoke | preview URL과 격리 QA 계정/organization 사용. live Supabase를 쓸 경우에도 별도 승인과 정리 계획 필요 | 통과는 candidate 승인 신호일 뿐 production 승인 아님 |
| **Production** | 실제 서비스 readiness와 제한적 live 권한 검증 | read-only 확인을 먼저 수행. mutation은 사전 지정 QA 범위로 제한하고 cleanup 확인. production env·deploy·DB 파괴 작업은 승인 없이 변경하지 않음 | 모든 필수 smoke, 수동 QA, provider 결정, 담당자 sign-off가 있어야 출시 완료 |

현재 기록상 production 배포는 reachable/Ready이며 일부 API 권한 smoke도 통과했다. 그러나 preview 통과 또는 과거 production 응답 확인만으로 현재 production release sign-off를 대신할 수 없다.

## 7. Provider 결정 대기

현재 push delivery 구현은 **mock provider 기준**이다. 실제 운영 provider는 아직 결정 대기이며, provider env 이름이 존재한다는 사실은 연동 완료를 뜻하지 않는다.

현재 live mode의 `auto` 발송은 실제 provider가 연결되지 않으면 `503 provider_not_configured`로 종료한다. 관리자 화면도 mock provider를 직접 요청하지 않는다. `KIDSMEMO_ALLOW_MOCK_PUSH=true`는 격리된 개발/QA 환경에서만 임시로 사용하며 Production에서는 허용하지 않는다.

결정이 필요한 항목:

- push 및 운영 메시지의 실제 provider와 채널 우선순위.
- 카카오 알림톡·SMS·이메일 중 사용할 채널, 발송사 계약, sender/template 승인.
- 수신동의·수신거부·개인정보 보관 기준과 webhook 인증 방식.
- provider message id, 실패 사유, retry/backoff, 중복 발송 방지, 장애 시 fallback과 rollback.
- 점보키즈/GodoMall 쿠폰 API 계약 및 Naver Shopping live 사용 여부.

결정 전 운영 상태:

- [ ] `MESSAGE_PROVIDER_API_BASE_URL`, `MESSAGE_PROVIDER_API_KEY`를 실값으로 채웠다고 해서 provider를 활성화하지 않는다.
- [ ] `KIDSMEMO_ALLOW_MOCK_PUSH=true`를 Production에 설정하지 않는다.
- [ ] mock delivery log의 `sent`를 외부 수신 성공으로 해석하지 않는다.
- [ ] provider 승인·템플릿·수신동의·dry-run·모니터링 기준이 모두 확인될 때까지 실수신자 발송을 하지 않는다.

## 8. 제품 범위 제외

현재 출시 범위에서는 다음을 **구현·검증·운영 대상에서 제외**한다.

- **직원 휴가:** 직원의 휴가 신청·승인·잔여일수·휴가 캘린더를 제공하지 않는다.
- **직원 연차:** 법정 연차 계산, 발생·부여·사용·소멸 및 근태 기반 계산을 제공하지 않는다.
- **원아 출석:** 원아별 출석/결석/지각/사유, 출석 마감과 출석률을 기록·집계하지 않는다.

관련 leave foundation과 child attendance 정리 migration은 현재 범위 제외를 반영한다. 따라서 release smoke, RLS 점검, 운영 대시보드, provider 결정의 완료 조건에 이 기능들을 포함하지 않는다. 행사 대상 문구의 `전체 원아`는 행사·알림의 수신 대상 표현일 뿐, 원아 출석 관리 기능을 의미하지 않는다.

## 9. 중단 및 롤백 기준

- 인증 없는 API가 조직 데이터 또는 mock live 데이터를 노출하면 즉시 출시를 중단한다.
- Production에서 live Supabase가 꺼진 상태로 mock 인증·repository가 동작하면 즉시 출시를 중단한다.
- 비회원 organization에 read/write가 허용되거나 service-role key가 client/log에 나타나면 즉시 중단한다.
- migration 불일치, RLS 오류, cleanup 실패, 주요 route 5xx가 있으면 다음 smoke로 진행하지 않는다.
- provider가 미결정인 상태에서 실발송이 시작되면 발송을 중지하고 provider 설정·job·webhook 상태를 확인한다.
- source fix, production env 변경, deploy, destructive DB 작업은 별도 승인과 변경 기록을 남긴 뒤 수행한다.
