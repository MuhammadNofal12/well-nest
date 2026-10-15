CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_normalized CHECK (email = LOWER(email)),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_business_email_unique UNIQUE (business_id, email),
  CONSTRAINT users_business_id_id_unique UNIQUE (business_id, id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  clinician TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_business_user_fk
    FOREIGN KEY (business_id, user_id) REFERENCES users(business_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_sessions_business_user_fk
    FOREIGN KEY (business_id, user_id) REFERENCES users(business_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  ai_provider TEXT,
  extracted_intent JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_business_created_idx ON users (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS appointments_user_schedule_idx ON appointments (user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS appointments_business_schedule_idx ON appointments (business_id, starts_at, status);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_user_active_slot_idx
  ON appointments (user_id, starts_at) WHERE status = 'scheduled';
CREATE UNIQUE INDEX IF NOT EXISTS appointments_provider_active_slot_idx
  ON appointments (business_id, clinician, starts_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS chat_sessions_user_updated_idx ON chat_sessions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx ON chat_messages (session_id, created_at);
