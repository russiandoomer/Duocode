USE duocode;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0 AFTER is_active,
  ADD COLUMN IF NOT EXISTS locked_until DATETIME NULL AFTER failed_login_attempts,
  ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL AFTER locked_until,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD INDEX IF NOT EXISTS idx_users_role_created (role, created_at),
  ADD INDEX IF NOT EXISTS idx_users_active_lock (is_active, locked_until);

UPDATE users
SET
  is_active = COALESCE(is_active, TRUE),
  failed_login_attempts = COALESCE(failed_login_attempts, 0);

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  email VARCHAR(160) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(255) NULL,
  details_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_audit_log_email_created (email, created_at),
  INDEX idx_auth_audit_log_event_created (event_type, created_at),
  INDEX idx_auth_audit_log_user_created (user_id, created_at),
  CONSTRAINT fk_auth_audit_log_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
