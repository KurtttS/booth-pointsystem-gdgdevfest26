-- ==============================================================================
-- Supabase (PostgreSQL) Exact 1-to-1 Schema & Migration Script for db_gdgevents
-- Matches live 12-table MariaDB/MySQL database schema without extra constraints
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Create PostgreSQL ENUM Types (Idempotent)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_category_enum') THEN
    CREATE TYPE scan_category_enum AS ENUM ('1-10', '11-50', '51-90', '91+');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_enum') THEN
    CREATE TYPE admin_role_enum AS ENUM ('admin', 'staff');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'print_type_enum') THEN
    CREATE TYPE print_type_enum AS ENUM ('name_tag', 'certificate');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'text_alignment_enum') THEN
    CREATE TYPE text_alignment_enum AS ENUM ('left', 'center', 'right');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'print_job_status_enum') THEN
    CREATE TYPE print_job_status_enum AS ENUM ('queued', 'printing', 'printed', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_batch_status_enum') THEN
    CREATE TYPE import_batch_status_enum AS ENUM ('previewed', 'completed', 'completed_with_errors', 'failed');
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Reusable Trigger Function for ON UPDATE CURRENT_TIMESTAMP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. Core 7 Tables
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendees (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  twitter VARCHAR(255) DEFAULT NULL,
  company VARCHAR(255) DEFAULT NULL,
  role VARCHAR(255) DEFAULT NULL,
  qr_code_token VARCHAR(255) DEFAULT NULL,
  nickname VARCHAR(100) DEFAULT NULL,
  "createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE DEFAULT NULL,
  venue VARCHAR(255) DEFAULT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booths (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  "sponsorName" VARCHAR(100) DEFAULT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  display_name VARCHAR(150) NOT NULL DEFAULT '',
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role admin_role_enum NOT NULL DEFAULT 'admin',
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_by_user_id INT DEFAULT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booth_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  booth_id VARCHAR(64) NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_booth_id UNIQUE (booth_id)
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id SERIAL PRIMARY KEY,
  attendee_id INT NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  order_number VARCHAR(100) DEFAULT NULL,
  ticket_number VARCHAR(100) NOT NULL UNIQUE,
  ticket_title VARCHAR(255) DEFAULT NULL,
  ticket_venue VARCHAR(255) DEFAULT NULL,
  checkin_status SMALLINT DEFAULT 0,
  checked_in_at TIMESTAMP DEFAULT NULL,
  CONSTRAINT attendee_event UNIQUE (attendee_id, event_id)
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  "attendeeId" INT NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  "boothId" VARCHAR(64) NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  "eventId" INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
  points INT DEFAULT 100,
  category scan_category_enum DEFAULT '1-10',
  CONSTRAINT "UNIQUE_ATTENDEE_BOOTH_EVENT" UNIQUE ("attendeeId", "boothId", "eventId")
);

-- ------------------------------------------------------------------------------
-- 4. Alter Existing Live Tables to Match Updated Schema
-- ------------------------------------------------------------------------------
ALTER TABLE attendees
  ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) DEFAULT NULL;

ALTER TABLE admins
  ALTER COLUMN username TYPE VARCHAR(100);

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS role admin_role_enum NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS is_active SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by_user_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE admins DROP CONSTRAINT IF EXISTS chk_admins_is_active;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_admins_email') THEN
    ALTER TABLE admins ADD CONSTRAINT uq_admins_email UNIQUE (email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_admins_created_by') THEN
    ALTER TABLE admins
      ADD CONSTRAINT fk_admins_created_by
      FOREIGN KEY (created_by_user_id) REFERENCES admins(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admins_created_by ON admins (created_by_user_id);

DROP TRIGGER IF EXISTS trg_admins_updated_at ON admins;
CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_booth_users_booth_id ON booth_users (booth_id);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_checkin ON event_attendees (event_id, checkin_status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scan_logs' AND column_name = 'boothId'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scan_logs_booth_id ON scan_logs ("boothId")';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scan_logs' AND column_name = 'boothid'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scan_logs_booth_id ON scan_logs (boothid)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scan_logs' AND column_name = 'eventId'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scan_logs_event_id ON scan_logs ("eventId")';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scan_logs' AND column_name = 'eventid'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scan_logs_event_id ON scan_logs (eventid)';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Operational Tables (Exact 1-to-1 Constraints Only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkin_corrections (
  id BIGSERIAL PRIMARY KEY,
  event_attendee_id INT NOT NULL,
  corrected_by_user_id INT NOT NULL,
  previous_checkin_status SMALLINT NOT NULL,
  previous_checked_in_at TIMESTAMP DEFAULT NULL,
  new_checkin_status SMALLINT NOT NULL,
  new_checked_in_at TIMESTAMP DEFAULT NULL,
  reason VARCHAR(500) NOT NULL,
  corrected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_checkin_corrections_registration
    FOREIGN KEY (event_attendee_id) REFERENCES event_attendees (id),
  CONSTRAINT fk_checkin_corrections_admin
    FOREIGN KEY (corrected_by_user_id) REFERENCES admins (id),
  CONSTRAINT chk_checkin_corrections_previous_status
    CHECK (previous_checkin_status IN (0, 1)),
  CONSTRAINT chk_checkin_corrections_new_status
    CHECK (new_checkin_status IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_checkin_corrections_registration_time
  ON checkin_corrections (event_attendee_id, corrected_at);
CREATE INDEX IF NOT EXISTS idx_checkin_corrections_admin
  ON checkin_corrections (corrected_by_user_id);

CREATE TABLE IF NOT EXISTS event_print_templates (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL,
  print_type print_type_enum NOT NULL,
  template_path VARCHAR(500) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  width_mm DECIMAL(7,2) DEFAULT NULL,
  height_mm DECIMAL(7,2) DEFAULT NULL,
  is_active SMALLINT NOT NULL DEFAULT 1,
  uploaded_by_user_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name_area_x_mm DECIMAL(7,2) DEFAULT NULL,
  name_area_y_mm DECIMAL(7,2) DEFAULT NULL,
  name_area_width_mm DECIMAL(7,2) DEFAULT NULL,
  name_area_height_mm DECIMAL(7,2) DEFAULT NULL,
  font_size_pt DECIMAL(5,2) DEFAULT NULL,
  font_family VARCHAR(100) DEFAULT NULL,
  text_alignment text_alignment_enum DEFAULT NULL,
  text_color_hex CHAR(7) DEFAULT NULL,
  CONSTRAINT fk_event_print_templates_event
    FOREIGN KEY (event_id) REFERENCES events (id),
  CONSTRAINT fk_event_print_templates_admin
    FOREIGN KEY (uploaded_by_user_id) REFERENCES admins (id),
  CONSTRAINT chk_event_print_templates_dimensions
    CHECK ((width_mm IS NULL AND height_mm IS NULL) OR (width_mm > 0 AND height_mm > 0)),
  CONSTRAINT chk_event_print_templates_name_area
    CHECK (
      (name_area_x_mm IS NULL AND name_area_y_mm IS NULL
        AND name_area_width_mm IS NULL AND name_area_height_mm IS NULL)
      OR
      (width_mm IS NOT NULL AND height_mm IS NOT NULL
        AND name_area_x_mm IS NOT NULL AND name_area_y_mm IS NOT NULL
        AND name_area_width_mm IS NOT NULL AND name_area_height_mm IS NOT NULL
        AND name_area_x_mm >= 0 AND name_area_y_mm >= 0
        AND name_area_width_mm > 0 AND name_area_height_mm > 0
        AND name_area_x_mm + name_area_width_mm <= width_mm
        AND name_area_y_mm + name_area_height_mm <= height_mm)
    ),
  CONSTRAINT chk_event_print_templates_font_size
    CHECK (font_size_pt IS NULL OR font_size_pt > 0),
  CONSTRAINT chk_event_print_templates_text_color
    CHECK (text_color_hex IS NULL OR text_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT chk_event_print_templates_is_active
    CHECK (is_active IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_event_print_templates_event_type_active
  ON event_print_templates (event_id, print_type, is_active);
CREATE INDEX IF NOT EXISTS idx_event_print_templates_admin
  ON event_print_templates (uploaded_by_user_id);

DROP TRIGGER IF EXISTS trg_event_print_templates_updated_at ON event_print_templates;
CREATE TRIGGER trg_event_print_templates_updated_at
  BEFORE UPDATE ON event_print_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS print_jobs (
  id BIGSERIAL PRIMARY KEY,
  event_attendee_id INT NOT NULL,
  template_id INT DEFAULT NULL,
  print_type print_type_enum NOT NULL,
  status print_job_status_enum NOT NULL DEFAULT 'queued',
  is_reprint SMALLINT NOT NULL DEFAULT 0,
  requested_by_user_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP DEFAULT NULL,
  failure_message VARCHAR(1000) DEFAULT NULL,
  CONSTRAINT fk_print_jobs_registration
    FOREIGN KEY (event_attendee_id) REFERENCES event_attendees (id),
  CONSTRAINT fk_print_jobs_template
    FOREIGN KEY (template_id) REFERENCES event_print_templates (id),
  CONSTRAINT fk_print_jobs_admin
    FOREIGN KEY (requested_by_user_id) REFERENCES admins (id),
  CONSTRAINT chk_print_jobs_is_reprint
    CHECK (is_reprint IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_registration_type_time
  ON print_jobs (event_attendee_id, print_type, created_at);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status
  ON print_jobs (status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_admin
  ON print_jobs (requested_by_user_id);

CREATE TABLE IF NOT EXISTS import_batches (
  id BIGSERIAL PRIMARY KEY,
  event_id INT NOT NULL,
  imported_by_user_id INT NOT NULL,
  source_file_name VARCHAR(255) NOT NULL,
  status import_batch_status_enum NOT NULL,
  rows_seen INT NOT NULL DEFAULT 0,
  rows_imported INT NOT NULL DEFAULT 0,
  rows_skipped INT NOT NULL DEFAULT 0,
  rows_rejected INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_import_batches_event
    FOREIGN KEY (event_id) REFERENCES events (id),
  CONSTRAINT fk_import_batches_admin
    FOREIGN KEY (imported_by_user_id) REFERENCES admins (id)
);

ALTER TABLE import_batches DROP CONSTRAINT IF EXISTS chk_import_batches_counts_nonnegative;

CREATE INDEX IF NOT EXISTS idx_import_batches_event_time
  ON import_batches (event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_import_batches_admin
  ON import_batches (imported_by_user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash),
  CONSTRAINT fk_password_reset_tokens_admin
    FOREIGN KEY (user_id) REFERENCES admins (id)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user_expiry
  ON password_reset_tokens (user_id, expires_at);

-- ------------------------------------------------------------------------------
-- 6. Sync Auto-Increment Sequences to MAX(id)
-- ------------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('attendees', 'id'), COALESCE((SELECT MAX(id) FROM attendees), 1), (SELECT COUNT(*) > 0 FROM attendees));
SELECT setval(pg_get_serial_sequence('events', 'id'), COALESCE((SELECT MAX(id) FROM events), 1), (SELECT COUNT(*) > 0 FROM events));
SELECT setval(pg_get_serial_sequence('admins', 'id'), COALESCE((SELECT MAX(id) FROM admins), 1), (SELECT COUNT(*) > 0 FROM admins));
SELECT setval(pg_get_serial_sequence('booth_users', 'id'), COALESCE((SELECT MAX(id) FROM booth_users), 1), (SELECT COUNT(*) > 0 FROM booth_users));
SELECT setval(pg_get_serial_sequence('event_attendees', 'id'), COALESCE((SELECT MAX(id) FROM event_attendees), 1), (SELECT COUNT(*) > 0 FROM event_attendees));
SELECT setval(pg_get_serial_sequence('checkin_corrections', 'id'), COALESCE((SELECT MAX(id) FROM checkin_corrections), 1), (SELECT COUNT(*) > 0 FROM checkin_corrections));
SELECT setval(pg_get_serial_sequence('event_print_templates', 'id'), COALESCE((SELECT MAX(id) FROM event_print_templates), 1), (SELECT COUNT(*) > 0 FROM event_print_templates));
SELECT setval(pg_get_serial_sequence('print_jobs', 'id'), COALESCE((SELECT MAX(id) FROM print_jobs), 1), (SELECT COUNT(*) > 0 FROM print_jobs));
SELECT setval(pg_get_serial_sequence('import_batches', 'id'), COALESCE((SELECT MAX(id) FROM import_batches), 1), (SELECT COUNT(*) > 0 FROM import_batches));
SELECT setval(pg_get_serial_sequence('password_reset_tokens', 'id'), COALESCE((SELECT MAX(id) FROM password_reset_tokens), 1), (SELECT COUNT(*) > 0 FROM password_reset_tokens));

COMMIT;
