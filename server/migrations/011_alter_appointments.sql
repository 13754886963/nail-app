-- Add 'rejected' to status enum
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'rejected';

-- Make service_id nullable (not used in MVP)
ALTER TABLE appointments ALTER COLUMN service_id DROP NOT NULL;

-- Add reject_reason column
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reject_reason TEXT;
