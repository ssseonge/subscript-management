# Supabase 연결 방향

이 앱은 `ssseonge/insung-scheduler`에서 쓰는 Supabase 프로젝트를 같이 사용한다.

## 방향

1. 같은 Supabase 프로젝트에 `subscription_services` 테이블을 추가한다.
2. 브라우저에는 `SUPABASE_SERVICE_ROLE_KEY`를 절대 노출하지 않는다.
3. 처음에는 스케줄러와 같은 서버 API + 비밀번호 세션 방식으로 동기화한다.
4. 나중에 GitHub OAuth가 필요해지면 Supabase Auth를 붙인다.
5. 스케줄러 연동은 `scheduler_sync_enabled`, `scheduler_event_id` 필드로 시작한다.

## 이유

- 구독 결제일은 일정 데이터와 자연스럽게 연결될 수 있다.
- 같은 `owner_id = default` 기준을 쓰면 기존 스케줄러 데이터 구조와 맞는다.
- 별도 Supabase 프로젝트를 만들면 나중에 스케줄러 연동이 번거로워진다.

## 다음 구현 순서

1. Supabase SQL editor에서 `supabase/subscription_services.sql` 실행
2. Vercel 또는 스케줄러 API 쪽에 `/api/subscriptions` 추가
3. 현재 `localStorage` 데이터를 Supabase로 마이그레이션
4. 결제일을 스케줄러 `schedule_events`로 내보내는 기능 추가

