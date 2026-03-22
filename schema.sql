-- ============================================================
-- 카지노 어드민 시스템 - Supabase (PostgreSQL) 스키마
-- 생성일: 2026-03-21
-- ============================================================

-- RLS 비활성화 (앱 레이어에서 인증 처리)
-- 각 테이블 생성 후 RLS를 disable 처리함

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- 파트너 레벨: admin(관리자), head(본사), sub_head(부본사), distributor(총판), store(매장)
CREATE TYPE partner_level AS ENUM ('admin', 'head', 'sub_head', 'distributor', 'store');

-- 계정 상태
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'blocked', 'pending');

-- 트랜잭션 상태: pending(대기), approved(승인), rejected(거절), cancelled(취소)
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- 배팅 게임 타입
CREATE TYPE game_type AS ENUM ('slot', 'casino');

-- 머니 이동 타입
CREATE TYPE money_transfer_type AS ENUM (
  'admin_to_partner',       -- 관리자 → 파트너 지급
  'partner_to_partner',     -- 파트너 → 파트너
  'partner_to_member',      -- 파트너 → 회원
  'member_deposit',         -- 회원 충전
  'member_withdraw',        -- 회원 환전
  'rolling_convert',        -- 롤링금 전환
  'admin_recover'           -- 관리자 회수
);

-- 공지사항 타입
CREATE TYPE notice_type AS ENUM ('notice', 'event', 'maintenance');

-- 문의 상태
CREATE TYPE inquiry_status AS ENUM ('pending', 'in_progress', 'done');

-- 로그인 결과
CREATE TYPE login_result AS ENUM ('success', 'fail', 'blocked');

-- 정산 타입
CREATE TYPE settlement_type AS ENUM ('slot', 'casino', 'combined');

-- 게임사 상태
CREATE TYPE provider_status AS ENUM ('active', 'inactive', 'maintenance');

-- 텔레그램 알림 이벤트 타입
CREATE TYPE telegram_event_type AS ENUM (
  'deposit_request', 'withdraw_request', 'new_member',
  'max_win_alarm', 'inquiry_received'
);

-- ============================================================
-- 1. 파트너 테이블 (관리자 포함 전체 파트너 계층)
-- ============================================================
-- 관리자(admin) → 본사(head) → 부본사(sub_head) → 총판(distributor) → 매장(store)
CREATE TABLE partners (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id             UUID REFERENCES partners(id) ON DELETE RESTRICT,   -- 상위 파트너
  username              VARCHAR(50) UNIQUE NOT NULL,                        -- 로그인 아이디
  password_hash         TEXT NOT NULL,                                      -- bcrypt 해시
  nickname              VARCHAR(100),                                       -- 닉네임
  level                 partner_level NOT NULL,                             -- 파트너 레벨
  status                account_status NOT NULL DEFAULT 'active',           -- 계정 상태
  phone                 VARCHAR(30),                                        -- 연락처

  -- 보유 금액
  balance               BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),    -- 보유머니 (원)
  rolling_balance       BIGINT NOT NULL DEFAULT 0 CHECK (rolling_balance >= 0), -- 보유롤링금 (원)

  -- 슬롯 수수료율 (소수점 2자리, 예: 1.50 = 1.50%)
  slot_rolling_pct      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (slot_rolling_pct >= 0 AND slot_rolling_pct <= 100),   -- 슬롯 롤링%
  slot_losing_pct       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (slot_losing_pct >= 0 AND slot_losing_pct <= 100),     -- 슬롯 루징%
  -- 카지노 수수료율
  casino_rolling_pct    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (casino_rolling_pct >= 0 AND casino_rolling_pct <= 100), -- 카지노 롤링%
  casino_losing_pct     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (casino_losing_pct >= 0 AND casino_losing_pct <= 100),   -- 카지노 루징%

  -- 지급/회수 권한
  can_give_money        BOOLEAN NOT NULL DEFAULT true,   -- 하부에게 머니 지급 권한
  can_take_money        BOOLEAN NOT NULL DEFAULT true,   -- 하부에서 머니 회수 권한

  -- 정산 설정
  settlement_cycle      VARCHAR(20) DEFAULT 'daily',     -- 정산 주기 (daily/weekly/monthly)

  -- 은행 정보
  bank_name             VARCHAR(50),                     -- 은행명
  bank_account          VARCHAR(50),                     -- 계좌번호
  bank_holder           VARCHAR(50),                     -- 예금주

  -- 메모
  memo                  TEXT,

  -- 타임스탬프
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE partners DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_partners_parent_id ON partners(parent_id);
CREATE INDEX idx_partners_level ON partners(level);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_username ON partners(username);


-- ============================================================
-- 2. 회원 테이블
-- ============================================================
-- 매장(store) 소속 실제 게임 이용 회원
CREATE TABLE members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT, -- 소속 매장
  username              VARCHAR(50) UNIQUE NOT NULL,                              -- 로그인 아이디
  password_hash         TEXT NOT NULL,                                            -- bcrypt 해시
  nickname              VARCHAR(100),                                             -- 닉네임
  status                account_status NOT NULL DEFAULT 'pending',                -- 계정 상태 (기본: 승인대기)
  phone                 VARCHAR(30),

  -- 보유 금액
  balance               BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),          -- 보유머니 (원)
  point_rolling         BIGINT NOT NULL DEFAULT 0 CHECK (point_rolling >= 0),    -- 포인트롤링 (원)

  -- 은행 정보
  bank_name             VARCHAR(50),
  bank_account          VARCHAR(50),
  bank_holder           VARCHAR(50),

  -- 제한 설정
  max_win_amount        BIGINT,                          -- 최대 당첨 가능 금액
  is_bet_blocked        BOOLEAN NOT NULL DEFAULT false,  -- 배팅 차단 여부

  -- 접속 정보
  last_login_at         TIMESTAMPTZ,
  last_login_ip         INET,
  referral_code         VARCHAR(30),                     -- 추천인 코드

  -- 메모
  memo                  TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE members DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_members_store_id ON members(store_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_username ON members(username);
CREATE INDEX idx_members_created_at ON members(created_at DESC);


-- ============================================================
-- 3. 충전 신청 테이블 (회원 → 시스템)
-- ============================================================
CREATE TABLE deposit_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT, -- 소속 매장 (빠른 조회용)

  amount                BIGINT NOT NULL CHECK (amount > 0),                       -- 신청 금액
  bonus_amount          BIGINT NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),      -- 보너스 금액
  status                transaction_status NOT NULL DEFAULT 'pending',            -- 처리 상태

  -- 처리 정보
  processed_by          UUID REFERENCES partners(id),                             -- 처리한 파트너
  processed_at          TIMESTAMPTZ,
  reject_reason         TEXT,

  -- 입금 정보
  depositor_name        VARCHAR(50),                                              -- 입금자명
  bank_name             VARCHAR(50),                                              -- 입금 은행

  memo                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE deposit_requests DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_deposit_requests_member_id ON deposit_requests(member_id);
CREATE INDEX idx_deposit_requests_store_id ON deposit_requests(store_id);
CREATE INDEX idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX idx_deposit_requests_created_at ON deposit_requests(created_at DESC);


-- ============================================================
-- 4. 환전 신청 테이블 (회원 → 시스템)
-- ============================================================
CREATE TABLE withdraw_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  amount                BIGINT NOT NULL CHECK (amount > 0),                       -- 신청 금액
  status                transaction_status NOT NULL DEFAULT 'pending',

  -- 처리 정보
  processed_by          UUID REFERENCES partners(id),
  processed_at          TIMESTAMPTZ,
  reject_reason         TEXT,

  -- 출금 계좌 정보 (신청 시점 스냅샷)
  bank_name             VARCHAR(50),
  bank_account          VARCHAR(50),
  bank_holder           VARCHAR(50),

  memo                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE withdraw_requests DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_withdraw_requests_member_id ON withdraw_requests(member_id);
CREATE INDEX idx_withdraw_requests_store_id ON withdraw_requests(store_id);
CREATE INDEX idx_withdraw_requests_status ON withdraw_requests(status);
CREATE INDEX idx_withdraw_requests_created_at ON withdraw_requests(created_at DESC);


-- ============================================================
-- 5. 슬롯 배팅 내역
-- ============================================================
CREATE TABLE slot_bet_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  -- 게임 정보
  provider_id           UUID,                            -- 게임사 ID (game_providers FK, 후에 추가)
  provider_name         VARCHAR(100),                    -- 게임사명 (스냅샷)
  game_id               VARCHAR(100),                    -- 게임 ID
  game_name             VARCHAR(200),                    -- 게임명
  round_id              VARCHAR(200) UNIQUE,             -- 라운드(회차) ID (외부 게임사 제공)

  -- 금액
  bet_amount            BIGINT NOT NULL DEFAULT 0,       -- 배팅금
  win_amount            BIGINT NOT NULL DEFAULT 0,       -- 당첨금
  net_amount            BIGINT GENERATED ALWAYS AS (bet_amount - win_amount) STORED, -- 손익 (배팅-당첨)

  -- 롤링 처리
  rolling_amount        BIGINT NOT NULL DEFAULT 0,       -- 발생 롤링금
  is_rolling_processed  BOOLEAN NOT NULL DEFAULT false,  -- 롤링 지급 처리 여부

  -- 공배팅 여부
  is_public_bet         BOOLEAN NOT NULL DEFAULT false,

  bet_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE slot_bet_history DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_slot_bet_member_id ON slot_bet_history(member_id);
CREATE INDEX idx_slot_bet_store_id ON slot_bet_history(store_id);
CREATE INDEX idx_slot_bet_bet_at ON slot_bet_history(bet_at DESC);
CREATE INDEX idx_slot_bet_provider_id ON slot_bet_history(provider_id);
CREATE INDEX idx_slot_bet_round_id ON slot_bet_history(round_id);
CREATE INDEX idx_slot_bet_rolling_processed ON slot_bet_history(is_rolling_processed) WHERE is_rolling_processed = false;


-- ============================================================
-- 6. 카지노 배팅 내역
-- ============================================================
CREATE TABLE casino_bet_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  -- 게임 정보
  provider_id           UUID,
  provider_name         VARCHAR(100),
  game_id               VARCHAR(100),
  game_name             VARCHAR(200),
  round_id              VARCHAR(200) UNIQUE,
  table_id              VARCHAR(100),                    -- 카지노 테이블 ID

  -- 금액
  bet_amount            BIGINT NOT NULL DEFAULT 0,
  win_amount            BIGINT NOT NULL DEFAULT 0,
  net_amount            BIGINT GENERATED ALWAYS AS (bet_amount - win_amount) STORED,

  -- 롤링 처리
  rolling_amount        BIGINT NOT NULL DEFAULT 0,
  is_rolling_processed  BOOLEAN NOT NULL DEFAULT false,

  -- 공배팅 여부
  is_public_bet         BOOLEAN NOT NULL DEFAULT false,

  bet_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE casino_bet_history DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_casino_bet_member_id ON casino_bet_history(member_id);
CREATE INDEX idx_casino_bet_store_id ON casino_bet_history(store_id);
CREATE INDEX idx_casino_bet_bet_at ON casino_bet_history(bet_at DESC);
CREATE INDEX idx_casino_bet_provider_id ON casino_bet_history(provider_id);
CREATE INDEX idx_casino_bet_round_id ON casino_bet_history(round_id);
CREATE INDEX idx_casino_bet_rolling_processed ON casino_bet_history(is_rolling_processed) WHERE is_rolling_processed = false;


-- ============================================================
-- 7. 머니 이동 내역 (파트너 ↔ 파트너, 파트너 ↔ 회원, 관리자 조작)
-- ============================================================
CREATE TABLE money_transfers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_type         money_transfer_type NOT NULL,    -- 이동 유형

  -- 발신자 (파트너 또는 회원, 둘 중 하나만 사용)
  from_partner_id       UUID REFERENCES partners(id),
  from_member_id        UUID REFERENCES members(id),

  -- 수신자
  to_partner_id         UUID REFERENCES partners(id),
  to_member_id          UUID REFERENCES members(id),

  amount                BIGINT NOT NULL CHECK (amount > 0), -- 이동 금액

  -- 처리 전후 잔액 스냅샷
  from_balance_before   BIGINT,                          -- 발신자 이동 전 잔액
  from_balance_after    BIGINT,                          -- 발신자 이동 후 잔액
  to_balance_before     BIGINT,                          -- 수신자 이동 전 잔액
  to_balance_after      BIGINT,                          -- 수신자 이동 후 잔액

  -- 처리자 (관리자가 직접 조작 시)
  processed_by          UUID REFERENCES partners(id),

  memo                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE money_transfers DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_money_transfers_from_partner ON money_transfers(from_partner_id);
CREATE INDEX idx_money_transfers_to_partner ON money_transfers(to_partner_id);
CREATE INDEX idx_money_transfers_from_member ON money_transfers(from_member_id);
CREATE INDEX idx_money_transfers_to_member ON money_transfers(to_member_id);
CREATE INDEX idx_money_transfers_type ON money_transfers(transfer_type);
CREATE INDEX idx_money_transfers_created_at ON money_transfers(created_at DESC);


-- ============================================================
-- 8. 롤링 내역 (배팅에서 발생한 롤링금 지급 기록)
-- ============================================================
CREATE TABLE rolling_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type             game_type NOT NULL,              -- 슬롯 / 카지노

  -- 원천 배팅
  bet_history_id        UUID,                            -- slot_bet_history or casino_bet_history ID
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  -- 수령자 (회원 또는 파트너)
  recipient_partner_id  UUID REFERENCES partners(id),   -- 롤링 수령 파트너
  recipient_member_id   UUID REFERENCES members(id),    -- 롤링 수령 회원 (해당 시)

  bet_amount            BIGINT NOT NULL,                 -- 기준 배팅금
  rolling_pct           NUMERIC(5,2) NOT NULL,           -- 적용된 롤링%
  rolling_amount        BIGINT NOT NULL,                 -- 지급 롤링금

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rolling_history DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rolling_history_member_id ON rolling_history(member_id);
CREATE INDEX idx_rolling_history_store_id ON rolling_history(store_id);
CREATE INDEX idx_rolling_history_recipient_partner ON rolling_history(recipient_partner_id);
CREATE INDEX idx_rolling_history_created_at ON rolling_history(created_at DESC);


-- ============================================================
-- 9. 롤링금 전환 내역 (롤링금 → 보유머니 전환)
-- ============================================================
CREATE TABLE rolling_convert_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID REFERENCES partners(id),    -- 파트너 전환
  member_id             UUID REFERENCES members(id),     -- 회원 전환

  rolling_amount        BIGINT NOT NULL CHECK (rolling_amount > 0), -- 전환된 롤링금
  converted_amount      BIGINT NOT NULL CHECK (converted_amount > 0), -- 전환 후 보유머니 증가액
  conversion_rate       NUMERIC(5,2) NOT NULL DEFAULT 100,            -- 전환 비율 (%)

  processed_by          UUID REFERENCES partners(id),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rolling_convert_history DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rolling_convert_partner ON rolling_convert_history(partner_id);
CREATE INDEX idx_rolling_convert_member ON rolling_convert_history(member_id);
CREATE INDEX idx_rolling_convert_created_at ON rolling_convert_history(created_at DESC);


-- ============================================================
-- 10. 일별 통계 (파트너/회원 단위 집계)
-- ============================================================
-- 매일 배치 또는 실시간 집계로 업데이트되는 통계 테이블
CREATE TABLE daily_statistics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date             DATE NOT NULL,                   -- 통계 날짜

  -- 대상 (파트너 또는 회원 중 하나)
  partner_id            UUID REFERENCES partners(id),
  member_id             UUID REFERENCES members(id),

  -- 슬롯
  slot_bet_amount       BIGINT NOT NULL DEFAULT 0,       -- 슬롯 배팅금
  slot_win_amount       BIGINT NOT NULL DEFAULT 0,       -- 슬롯 당첨금
  slot_net_amount       BIGINT GENERATED ALWAYS AS (slot_bet_amount - slot_win_amount) STORED,
  slot_rolling_amount   BIGINT NOT NULL DEFAULT 0,       -- 슬롯 롤링금

  -- 카지노
  casino_bet_amount     BIGINT NOT NULL DEFAULT 0,       -- 카지노 배팅금
  casino_win_amount     BIGINT NOT NULL DEFAULT 0,       -- 카지노 당첨금
  casino_net_amount     BIGINT GENERATED ALWAYS AS (casino_bet_amount - casino_win_amount) STORED,
  casino_rolling_amount BIGINT NOT NULL DEFAULT 0,       -- 카지노 롤링금

  -- 충전/환전 (회원 대상)
  deposit_amount        BIGINT NOT NULL DEFAULT 0,       -- 충전 합계
  withdraw_amount       BIGINT NOT NULL DEFAULT 0,       -- 환전 합계
  deposit_count         INT NOT NULL DEFAULT 0,          -- 충전 건수
  withdraw_count        INT NOT NULL DEFAULT 0,          -- 환전 건수

  -- 머니 지급/회수 (파트너 대상)
  give_amount           BIGINT NOT NULL DEFAULT 0,       -- 알 지급 합계
  take_amount           BIGINT NOT NULL DEFAULT 0,       -- 알 회수 합계

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 날짜 + 대상별 유니크 (파트너 혹은 회원 중 하나만)
  CONSTRAINT uq_daily_stat_partner UNIQUE (stat_date, partner_id),
  CONSTRAINT uq_daily_stat_member  UNIQUE (stat_date, member_id),
  CONSTRAINT chk_daily_stat_target CHECK (
    (partner_id IS NOT NULL AND member_id IS NULL) OR
    (partner_id IS NULL AND member_id IS NOT NULL)
  )
);

ALTER TABLE daily_statistics DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_daily_stats_date ON daily_statistics(stat_date DESC);
CREATE INDEX idx_daily_stats_partner ON daily_statistics(partner_id, stat_date DESC);
CREATE INDEX idx_daily_stats_member ON daily_statistics(member_id, stat_date DESC);


-- ============================================================
-- 11. 정산 테이블 (파트너별 정산 결과)
-- ============================================================
CREATE TABLE settlements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  settlement_type       settlement_type NOT NULL DEFAULT 'combined',

  period_start          DATE NOT NULL,                   -- 정산 시작일
  period_end            DATE NOT NULL,                   -- 정산 종료일

  -- 슬롯 정산
  slot_bet_amount       BIGINT NOT NULL DEFAULT 0,
  slot_win_amount       BIGINT NOT NULL DEFAULT 0,
  slot_net_amount       BIGINT NOT NULL DEFAULT 0,       -- 배팅 - 당첨
  slot_rolling_amount   BIGINT NOT NULL DEFAULT 0,
  slot_losing_amount    BIGINT NOT NULL DEFAULT 0,       -- 루징 정산액

  -- 카지노 정산
  casino_bet_amount     BIGINT NOT NULL DEFAULT 0,
  casino_win_amount     BIGINT NOT NULL DEFAULT 0,
  casino_net_amount     BIGINT NOT NULL DEFAULT 0,
  casino_rolling_amount BIGINT NOT NULL DEFAULT 0,
  casino_losing_amount  BIGINT NOT NULL DEFAULT 0,

  -- 합산
  total_settlement_amount BIGINT NOT NULL DEFAULT 0,     -- 총 정산금액

  is_paid               BOOLEAN NOT NULL DEFAULT false,  -- 정산 지급 여부
  paid_at               TIMESTAMPTZ,
  paid_by               UUID REFERENCES partners(id),

  memo                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE settlements DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_settlements_partner_id ON settlements(partner_id);
CREATE INDEX idx_settlements_period ON settlements(period_start, period_end);
CREATE INDEX idx_settlements_created_at ON settlements(created_at DESC);


-- ============================================================
-- 12. 게임사 관리 테이블
-- ============================================================
CREATE TABLE game_providers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  VARCHAR(50) UNIQUE NOT NULL,     -- 게임사 코드 (API 연동용)
  name                  VARCHAR(100) NOT NULL,           -- 게임사명
  name_en               VARCHAR(100),                    -- 영문명
  game_type             game_type NOT NULL,              -- 슬롯 / 카지노
  status                provider_status NOT NULL DEFAULT 'active',
  api_key               TEXT,                            -- API 키
  api_endpoint          TEXT,                            -- API 엔드포인트
  balance               BIGINT NOT NULL DEFAULT 0,       -- 게임사 잔액

  -- 기본 설정
  default_slot_rolling_pct    NUMERIC(5,2) DEFAULT 0,   -- 기본 슬롯 롤링%
  default_casino_rolling_pct  NUMERIC(5,2) DEFAULT 0,   -- 기본 카지노 롤링%

  sort_order            INT NOT NULL DEFAULT 0,          -- 노출 순서
  logo_url              TEXT,                            -- 로고 이미지 URL
  memo                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE game_providers DISABLE ROW LEVEL SECURITY;

-- game_providers FK를 배팅 테이블에 추가
ALTER TABLE slot_bet_history ADD CONSTRAINT fk_slot_bet_provider
  FOREIGN KEY (provider_id) REFERENCES game_providers(id) ON DELETE SET NULL;
ALTER TABLE casino_bet_history ADD CONSTRAINT fk_casino_bet_provider
  FOREIGN KEY (provider_id) REFERENCES game_providers(id) ON DELETE SET NULL;

CREATE INDEX idx_game_providers_game_type ON game_providers(game_type);
CREATE INDEX idx_game_providers_status ON game_providers(status);


-- ============================================================
-- 13. 게임사 제한 설정 (파트너별 게임사 ON/OFF)
-- ============================================================
CREATE TABLE partner_game_restrictions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  provider_id           UUID NOT NULL REFERENCES game_providers(id) ON DELETE CASCADE,
  is_blocked            BOOLEAN NOT NULL DEFAULT false,  -- true: 차단
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (partner_id, provider_id)
);

ALTER TABLE partner_game_restrictions DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_partner_game_restr_partner ON partner_game_restrictions(partner_id);
CREATE INDEX idx_partner_game_restr_provider ON partner_game_restrictions(provider_id);


-- ============================================================
-- 14. 게임사 그룹 설정
-- ============================================================
CREATE TABLE game_provider_groups (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL,           -- 그룹명
  description           TEXT,
  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE game_provider_groups DISABLE ROW LEVEL SECURITY;

CREATE TABLE game_provider_group_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID NOT NULL REFERENCES game_provider_groups(id) ON DELETE CASCADE,
  provider_id           UUID NOT NULL REFERENCES game_providers(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (group_id, provider_id)
);

ALTER TABLE game_provider_group_items DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 15. 공배팅(공짜배팅) 설정 테이블
-- ============================================================
-- 매장별 공배팅 LOSS 값 설정 (슬롯/카지노 구분)
CREATE TABLE public_bet_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,  -- 대상 매장
  game_type             game_type NOT NULL,              -- 슬롯 / 카지노
  loss_amount           BIGINT NOT NULL DEFAULT 0,       -- LOSS 기준값 (원)
  is_enabled            BOOLEAN NOT NULL DEFAULT true,   -- 활성화 여부
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (store_id, game_type)
);

ALTER TABLE public_bet_settings DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_public_bet_store_id ON public_bet_settings(store_id);


-- ============================================================
-- 16. 공배팅 복구 / 누락 내역
-- ============================================================
CREATE TABLE public_bet_missing_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  game_type             game_type NOT NULL,
  stat_date             DATE NOT NULL,
  expected_loss         BIGINT NOT NULL DEFAULT 0,       -- 기대 LOSS
  actual_loss           BIGINT NOT NULL DEFAULT 0,       -- 실제 LOSS
  missing_amount        BIGINT GENERATED ALWAYS AS (expected_loss - actual_loss) STORED,
  is_restored           BOOLEAN NOT NULL DEFAULT false,  -- 복구 여부
  restored_at           TIMESTAMPTZ,
  restored_by           UUID REFERENCES partners(id),
  memo                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public_bet_missing_logs DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_public_bet_missing_store ON public_bet_missing_logs(store_id);
CREATE INDEX idx_public_bet_missing_date ON public_bet_missing_logs(stat_date DESC);


-- ============================================================
-- 17. 공지사항
-- ============================================================
CREATE TABLE notices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id             UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  notice_type           notice_type NOT NULL DEFAULT 'notice',
  title                 VARCHAR(300) NOT NULL,
  content               TEXT NOT NULL,
  is_pinned             BOOLEAN NOT NULL DEFAULT false,  -- 상단 고정
  is_published          BOOLEAN NOT NULL DEFAULT true,   -- 노출 여부
  view_count            INT NOT NULL DEFAULT 0,
  published_at          TIMESTAMPTZ,
  expired_at            TIMESTAMPTZ,                     -- 노출 만료일
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notices DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notices_is_pinned ON notices(is_pinned);
CREATE INDEX idx_notices_is_published ON notices(is_published);
CREATE INDEX idx_notices_created_at ON notices(created_at DESC);


-- ============================================================
-- 18. 1:1 문의 (회원 → 관리자)
-- ============================================================
CREATE TABLE inquiries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  store_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  title                 VARCHAR(300) NOT NULL,
  content               TEXT NOT NULL,
  status                inquiry_status NOT NULL DEFAULT 'pending',

  -- 답변
  answer_content        TEXT,
  answered_by           UUID REFERENCES partners(id),
  answered_at           TIMESTAMPTZ,

  -- 고정 답변 사용 여부
  fixed_reply_id        UUID,                            -- 고정답변 ID (fixed_replies FK)

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inquiries DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inquiries_member_id ON inquiries(member_id);
CREATE INDEX idx_inquiries_store_id ON inquiries(store_id);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);


-- ============================================================
-- 19. 쪽지 (관리자/파트너 → 회원/파트너)
-- ============================================================
CREATE TABLE messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 발신자 (파트너만 발신 가능)
  sender_id             UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  -- 수신자 (파트너 또는 회원 중 하나)
  recipient_partner_id  UUID REFERENCES partners(id),
  recipient_member_id   UUID REFERENCES members(id),

  -- 대량 발송 여부 (전체/그룹 발송)
  is_broadcast          BOOLEAN NOT NULL DEFAULT false,
  broadcast_target      VARCHAR(50),                     -- 'all_members', 'all_partners', 'store:{id}' 등

  title                 VARCHAR(300) NOT NULL,
  content               TEXT NOT NULL,
  is_read               BOOLEAN NOT NULL DEFAULT false,
  read_at               TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_message_recipient CHECK (
    is_broadcast = true OR
    (recipient_partner_id IS NOT NULL AND recipient_member_id IS NULL) OR
    (recipient_partner_id IS NULL AND recipient_member_id IS NOT NULL)
  )
);

ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient_partner ON messages(recipient_partner_id);
CREATE INDEX idx_messages_recipient_member ON messages(recipient_member_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = false;


-- ============================================================
-- 20. 고정 답변 템플릿 (1:1 문의 빠른 답변용)
-- ============================================================
CREATE TABLE fixed_replies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 VARCHAR(200) NOT NULL,           -- 제목/분류명
  content               TEXT NOT NULL,                   -- 답변 내용
  is_active             BOOLEAN NOT NULL DEFAULT true,
  sort_order            INT NOT NULL DEFAULT 0,
  created_by            UUID REFERENCES partners(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fixed_replies DISABLE ROW LEVEL SECURITY;

-- 문의 테이블에 고정답변 FK 추가
ALTER TABLE inquiries ADD CONSTRAINT fk_inquiry_fixed_reply
  FOREIGN KEY (fixed_reply_id) REFERENCES fixed_replies(id) ON DELETE SET NULL;


-- ============================================================
-- 21. 도메인 목록
-- ============================================================
CREATE TABLE domains (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain                VARCHAR(255) UNIQUE NOT NULL,    -- 도메인 주소
  description           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  partner_id            UUID REFERENCES partners(id),    -- 담당 파트너 (선택)
  expires_at            TIMESTAMPTZ,                     -- 만료일
  registered_at         TIMESTAMPTZ,                     -- 등록일
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE domains DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_domains_is_active ON domains(is_active);


-- ============================================================
-- 22. 차단된 계정
-- ============================================================
CREATE TABLE blocked_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username              VARCHAR(100) NOT NULL,           -- 차단된 아이디
  reason                TEXT,                            -- 차단 사유
  blocked_by            UUID NOT NULL REFERENCES partners(id),
  blocked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unblocked_at          TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,   -- 차단 활성 여부
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE blocked_accounts DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_blocked_accounts_username ON blocked_accounts(username);
CREATE INDEX idx_blocked_accounts_is_active ON blocked_accounts(is_active);


-- ============================================================
-- 23. 차단된 IP
-- ============================================================
CREATE TABLE blocked_ips (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address            INET NOT NULL,                   -- 차단 IP (단일 또는 CIDR)
  reason                TEXT,
  blocked_by            UUID NOT NULL REFERENCES partners(id),
  blocked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unblocked_at          TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (ip_address)
);

ALTER TABLE blocked_ips DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_is_active ON blocked_ips(is_active);


-- ============================================================
-- 24. 로그인 기록
-- ============================================================
CREATE TABLE login_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 로그인 주체 (파트너 또는 회원)
  partner_id            UUID REFERENCES partners(id),
  member_id             UUID REFERENCES members(id),
  username              VARCHAR(100) NOT NULL,           -- 로그인 시도 아이디 (스냅샷)

  result                login_result NOT NULL,           -- 로그인 결과
  ip_address            INET,                            -- 접속 IP
  user_agent            TEXT,                            -- 브라우저 정보
  fail_reason           TEXT,                            -- 실패 사유

  logged_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_login_logs_partner_id ON login_logs(partner_id);
CREATE INDEX idx_login_logs_member_id ON login_logs(member_id);
CREATE INDEX idx_login_logs_username ON login_logs(username);
CREATE INDEX idx_login_logs_logged_at ON login_logs(logged_at DESC);
CREATE INDEX idx_login_logs_ip ON login_logs(ip_address);


-- ============================================================
-- 25. 텔레그램 알림 설정
-- ============================================================
CREATE TABLE telegram_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  bot_token             TEXT,                            -- 텔레그램 봇 토큰
  chat_id               VARCHAR(100),                    -- 채팅 ID
  is_enabled            BOOLEAN NOT NULL DEFAULT false,  -- 알림 활성화

  -- 알림 이벤트 설정 (각 이벤트별 ON/OFF)
  notify_deposit_request  BOOLEAN NOT NULL DEFAULT true,
  notify_withdraw_request BOOLEAN NOT NULL DEFAULT true,
  notify_new_member       BOOLEAN NOT NULL DEFAULT false,
  notify_max_win_alarm    BOOLEAN NOT NULL DEFAULT true,
  notify_inquiry_received BOOLEAN NOT NULL DEFAULT false,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (partner_id)
);

ALTER TABLE telegram_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 26. 최대당첨금 알람 설정
-- ============================================================
CREATE TABLE max_win_alarm_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  slot_alarm_amount     BIGINT NOT NULL DEFAULT 0,       -- 슬롯 알람 기준 금액
  casino_alarm_amount   BIGINT NOT NULL DEFAULT 0,       -- 카지노 알람 기준 금액
  is_enabled            BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (partner_id)
);

ALTER TABLE max_win_alarm_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 27. 총환전 제한 설정
-- ============================================================
CREATE TABLE exchange_limit_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- 충전 제한
  min_deposit           BIGINT NOT NULL DEFAULT 10000,   -- 최소 충전액
  max_deposit           BIGINT NOT NULL DEFAULT 100000000, -- 최대 충전액

  -- 환전 제한
  min_withdraw          BIGINT NOT NULL DEFAULT 10000,   -- 최소 환전액
  max_withdraw          BIGINT NOT NULL DEFAULT 100000000, -- 최대 환전액

  -- 일별 제한
  daily_deposit_limit   BIGINT,                          -- 일별 최대 충전액
  daily_withdraw_limit  BIGINT,                          -- 일별 최대 환전액

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (partner_id)
);

ALTER TABLE exchange_limit_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 28. 한줄 공지 설정
-- ============================================================
CREATE TABLE one_line_notices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content               TEXT NOT NULL,                   -- 공지 내용
  is_active             BOOLEAN NOT NULL DEFAULT true,
  sort_order            INT NOT NULL DEFAULT 0,
  created_by            UUID REFERENCES partners(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE one_line_notices DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 29. 보안 설정
-- ============================================================
CREATE TABLE security_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- OTP/2FA
  is_otp_enabled        BOOLEAN NOT NULL DEFAULT false,
  otp_secret            TEXT,

  -- 접속 IP 제한
  allowed_ips           INET[],                          -- 허용 IP 목록 (NULL이면 전체)
  is_ip_restriction     BOOLEAN NOT NULL DEFAULT false,

  -- 세션 설정
  session_timeout_min   INT NOT NULL DEFAULT 60,         -- 세션 만료 시간 (분)
  max_login_attempts    INT NOT NULL DEFAULT 5,          -- 최대 로그인 시도 횟수

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (partner_id)
);

ALTER TABLE security_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 30. 계좌 변경 이력
-- ============================================================
CREATE TABLE bank_account_change_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 변경 대상 (파트너 또는 회원)
  partner_id            UUID REFERENCES partners(id),
  member_id             UUID REFERENCES members(id),

  -- 변경 전
  prev_bank_name        VARCHAR(50),
  prev_bank_account     VARCHAR(50),
  prev_bank_holder      VARCHAR(50),

  -- 변경 후
  new_bank_name         VARCHAR(50),
  new_bank_account      VARCHAR(50),
  new_bank_holder       VARCHAR(50),

  changed_by            UUID REFERENCES partners(id),    -- 변경한 관리자
  reason                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bank_account_change_logs DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_bank_change_partner ON bank_account_change_logs(partner_id);
CREATE INDEX idx_bank_change_member ON bank_account_change_logs(member_id);
CREATE INDEX idx_bank_change_created_at ON bank_account_change_logs(created_at DESC);


-- ============================================================
-- 31. 지급&회수 권한 설정 (파트너별 세부 권한)
-- ============================================================
CREATE TABLE transfer_auth_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- 파트너 → 하위 파트너
  can_give_to_sub_partner   BOOLEAN NOT NULL DEFAULT true,
  can_take_from_sub_partner BOOLEAN NOT NULL DEFAULT true,

  -- 파트너 → 회원
  can_give_to_member        BOOLEAN NOT NULL DEFAULT true,
  can_take_from_member      BOOLEAN NOT NULL DEFAULT true,

  -- 최대 1회 지급 한도
  max_give_per_tx       BIGINT,                          -- 1회 최대 지급액
  max_take_per_tx       BIGINT,                          -- 1회 최대 회수액

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (partner_id)
);

ALTER TABLE transfer_auth_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 32. 파트너 정산 통합 설정
-- ============================================================
CREATE TABLE partner_settlement_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- 정산 방식
  use_rolling           BOOLEAN NOT NULL DEFAULT true,   -- 롤링 정산 사용 여부
  use_losing            BOOLEAN NOT NULL DEFAULT false,  -- 루징 정산 사용 여부

  -- 하위 파트너 정산 포함 여부
  include_sub_partners  BOOLEAN NOT NULL DEFAULT true,
  include_members       BOOLEAN NOT NULL DEFAULT true,

  -- 정산 주기
  settlement_cycle      VARCHAR(20) NOT NULL DEFAULT 'daily', -- daily / weekly / monthly

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (partner_id)
);

ALTER TABLE partner_settlement_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- UPDATED_AT 자동 갱신 트리거 함수
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_deposit_requests_updated_at
  BEFORE UPDATE ON deposit_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_withdraw_requests_updated_at
  BEFORE UPDATE ON withdraw_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_daily_statistics_updated_at
  BEFORE UPDATE ON daily_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_settlements_updated_at
  BEFORE UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_game_providers_updated_at
  BEFORE UPDATE ON game_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_partner_game_restrictions_updated_at
  BEFORE UPDATE ON partner_game_restrictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_public_bet_settings_updated_at
  BEFORE UPDATE ON public_bet_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notices_updated_at
  BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_fixed_replies_updated_at
  BEFORE UPDATE ON fixed_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_domains_updated_at
  BEFORE UPDATE ON domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_telegram_settings_updated_at
  BEFORE UPDATE ON telegram_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_max_win_alarm_settings_updated_at
  BEFORE UPDATE ON max_win_alarm_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_exchange_limit_settings_updated_at
  BEFORE UPDATE ON exchange_limit_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_one_line_notices_updated_at
  BEFORE UPDATE ON one_line_notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_security_settings_updated_at
  BEFORE UPDATE ON security_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transfer_auth_settings_updated_at
  BEFORE UPDATE ON transfer_auth_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_partner_settlement_settings_updated_at
  BEFORE UPDATE ON partner_settlement_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_game_provider_groups_updated_at
  BEFORE UPDATE ON game_provider_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 기본 관리자 계정 INSERT
-- password: admin1234 (bcrypt hash - 실제 운영 시 반드시 변경)
-- ============================================================
INSERT INTO partners (
  id,
  parent_id,
  username,
  password_hash,
  nickname,
  level,
  status,
  balance,
  rolling_balance,
  slot_rolling_pct,
  slot_losing_pct,
  casino_rolling_pct,
  casino_losing_pct,
  can_give_money,
  can_take_money,
  memo
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iGJO',  -- admin1234
  '관리자',
  'admin',
  'active',
  0,
  0,
  0.00,
  0.00,
  0.00,
  0.00,
  true,
  true,
  '최고 관리자 계정'
);

-- 관리자 기본 보안 설정
INSERT INTO security_settings (
  partner_id,
  is_otp_enabled,
  is_ip_restriction,
  session_timeout_min,
  max_login_attempts
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  false,
  false,
  120,
  5
);

-- 관리자 텔레그램 설정 (기본값)
INSERT INTO telegram_settings (
  partner_id,
  is_enabled
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  false
);

-- 관리자 최대당첨금 알람 설정 (기본값)
INSERT INTO max_win_alarm_settings (
  partner_id,
  slot_alarm_amount,
  casino_alarm_amount,
  is_enabled
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  1000000,
  1000000,
  false
);

-- 관리자 총환전 제한 설정 (기본값)
INSERT INTO exchange_limit_settings (
  partner_id,
  min_deposit,
  max_deposit,
  min_withdraw,
  max_withdraw
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  10000,
  100000000,
  10000,
  100000000
);

-- 관리자 지급/회수 권한 설정 (기본값)
INSERT INTO transfer_auth_settings (
  partner_id,
  can_give_to_sub_partner,
  can_take_from_sub_partner,
  can_give_to_member,
  can_take_from_member
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  true,
  true,
  true
);

-- 관리자 정산 통합 설정 (기본값)
INSERT INTO partner_settlement_settings (
  partner_id,
  use_rolling,
  use_losing,
  include_sub_partners,
  include_members,
  settlement_cycle
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  false,
  true,
  true,
  'daily'
);

-- ============================================================
-- 기본 한줄 공지 (샘플)
-- ============================================================
INSERT INTO one_line_notices (content, is_active, sort_order, created_by)
VALUES ('환영합니다. 공지사항을 확인해 주세요.', true, 1, '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- 완료
-- ============================================================
