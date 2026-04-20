CREATE TABLE IF NOT EXISTS branding_config (
  id TINYINT PRIMARY KEY,
  app_name VARCHAR(80) NOT NULL,
  headline VARCHAR(120) NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  hero_snippet VARCHAR(255) NOT NULL,
  logo_label VARCHAR(32) NOT NULL,
  logo_hint VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_config (
  id TINYINT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  handle VARCHAR(120) NOT NULL,
  track VARCHAR(120) NOT NULL,
  next_class VARCHAR(120) NOT NULL,
  current_focus VARCHAR(255) NOT NULL,
  daily_goal VARCHAR(40) NOT NULL,
  repository_status VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id VARCHAR(80) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  stack VARCHAR(160) NOT NULL,
  classes_count INT NOT NULL,
  lessons_count INT NOT NULL,
  level_label VARCHAR(60) NOT NULL,
  duration_label VARCHAR(60) NOT NULL,
  progress_percent INT NOT NULL,
  status_label VARCHAR(60) NOT NULL,
  next_label VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_roadmaps_classes_count CHECK (classes_count >= 0),
  CONSTRAINT chk_roadmaps_lessons_count CHECK (lessons_count >= 0),
  CONSTRAINT chk_roadmaps_progress_percent CHECK (progress_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_roadmaps_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_roadmaps_sort_order (sort_order)
);

CREATE TABLE IF NOT EXISTS featured_classes (
  id VARCHAR(80) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  level_label VARCHAR(60) NOT NULL,
  duration_label VARCHAR(60) NOT NULL,
  lessons_count INT NOT NULL,
  tag_label VARCHAR(40) NOT NULL,
  status_label VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_featured_classes_lessons_count CHECK (lessons_count >= 0),
  CONSTRAINT chk_featured_classes_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_featured_classes_sort_order (sort_order)
);

CREATE TABLE IF NOT EXISTS resource_categories (
  id VARCHAR(60) PRIMARY KEY,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_resource_categories_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_resource_categories_sort_order (sort_order)
);

CREATE TABLE IF NOT EXISTS resources (
  id VARCHAR(80) PRIMARY KEY,
  label VARCHAR(20) NOT NULL,
  title VARCHAR(120) NOT NULL,
  meta VARCHAR(160) NOT NULL,
  type_label VARCHAR(40) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_resources_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_resources_sort_order (sort_order)
);

CREATE TABLE IF NOT EXISTS challenge_modes (
  id VARCHAR(40) PRIMARY KEY,
  label VARCHAR(40) NOT NULL,
  description VARCHAR(255) NOT NULL,
  color_hex VARCHAR(20) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_challenge_modes_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_challenge_modes_sort_order (sort_order)
);

CREATE TABLE IF NOT EXISTS stats_summary (
  id TINYINT PRIMARY KEY,
  level_value INT NOT NULL,
  total_xp INT NOT NULL,
  precision_percent INT NOT NULL,
  streak_days INT NOT NULL,
  solved_challenges INT NOT NULL,
  total_minutes INT NOT NULL,
  CONSTRAINT chk_stats_summary_level_value CHECK (level_value >= 0),
  CONSTRAINT chk_stats_summary_total_xp CHECK (total_xp >= 0),
  CONSTRAINT chk_stats_summary_precision_percent CHECK (precision_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_stats_summary_streak_days CHECK (streak_days >= 0),
  CONSTRAINT chk_stats_summary_solved_challenges CHECK (solved_challenges >= 0),
  CONSTRAINT chk_stats_summary_total_minutes CHECK (total_minutes >= 0)
);

CREATE TABLE IF NOT EXISTS weekly_activity (
  day_label CHAR(1) PRIMARY KEY,
  xp_value INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_weekly_activity_xp_value CHECK (xp_value >= 0),
  CONSTRAINT chk_weekly_activity_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_weekly_activity_sort_order (sort_order)
);

CREATE TABLE IF NOT EXISTS recent_sessions (
  id VARCHAR(80) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  topic VARCHAR(120) NOT NULL,
  status_label VARCHAR(40) NOT NULL,
  power_percent INT NOT NULL,
  reward_xp INT NOT NULL,
  accuracy_percent INT NOT NULL,
  code_lines JSON NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_recent_sessions_power_percent CHECK (power_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_recent_sessions_reward_xp CHECK (reward_xp >= 0),
  CONSTRAINT chk_recent_sessions_accuracy_percent CHECK (accuracy_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_recent_sessions_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_recent_sessions_sort_order (sort_order)
);

CREATE TABLE IF NOT EXISTS deploy_config (
  id TINYINT PRIMARY KEY,
  repository_name VARCHAR(120) NOT NULL,
  frontend_platform VARCHAR(60) NOT NULL,
  backend_platform VARCHAR(60) NOT NULL,
  frontend_build_command VARCHAR(120) NOT NULL,
  backend_start_command VARCHAR(120) NOT NULL,
  env_var_name VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS deploy_checklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_text VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_deploy_checklist_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_deploy_checklist_sort_order (sort_order)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  last_login_at DATETIME NULL,
  track_label VARCHAR(120) NOT NULL,
  focus_text VARCHAR(255) NOT NULL,
  daily_goal_minutes INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_created (role, created_at),
  INDEX idx_users_active_lock (is_active, locked_until),
  CONSTRAINT chk_users_failed_login_attempts CHECK (failed_login_attempts >= 0),
  CONSTRAINT chk_users_daily_goal_minutes CHECK (daily_goal_minutes BETWEEN 0 AND 1440)
);

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

CREATE TABLE IF NOT EXISTS learning_topics (
  id VARCHAR(80) PRIMARY KEY,
  roadmap_id VARCHAR(80) NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  estimated_minutes INT NOT NULL,
  status_label VARCHAR(40) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  INDEX idx_learning_topics_roadmap (roadmap_id),
  CONSTRAINT chk_learning_topics_estimated_minutes CHECK (estimated_minutes > 0),
  CONSTRAINT chk_learning_topics_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_learning_topics_roadmap_sort (roadmap_id, sort_order),
  CONSTRAINT fk_learning_topics_roadmap
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_exercises (
  id VARCHAR(80) PRIMARY KEY,
  topic_id VARCHAR(80) NOT NULL,
  title VARCHAR(120) NOT NULL,
  prompt TEXT NOT NULL,
  instructions_json JSON NOT NULL,
  function_name VARCHAR(80) NOT NULL,
  starter_code LONGTEXT NOT NULL,
  solution_code LONGTEXT NOT NULL,
  explanation TEXT NOT NULL,
  xp_reward INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  INDEX idx_learning_exercises_topic (topic_id),
  CONSTRAINT chk_learning_exercises_xp_reward CHECK (xp_reward >= 0),
  CONSTRAINT chk_learning_exercises_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_learning_exercises_topic_sort (topic_id, sort_order),
  CONSTRAINT fk_learning_exercises_topic
    FOREIGN KEY (topic_id) REFERENCES learning_topics(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_test_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exercise_id VARCHAR(80) NOT NULL,
  label VARCHAR(80) NOT NULL,
  args_json JSON NOT NULL,
  expected_json JSON NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  INDEX idx_exercise_test_cases_exercise (exercise_id),
  CONSTRAINT chk_exercise_test_cases_sort_order CHECK (sort_order >= 0),
  UNIQUE KEY uq_exercise_test_cases_exercise_sort (exercise_id, sort_order),
  CONSTRAINT fk_exercise_test_cases_exercise
    FOREIGN KEY (exercise_id) REFERENCES learning_exercises(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS user_exercise_progress (
  user_id INT NOT NULL,
  exercise_id VARCHAR(80) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  best_score INT NOT NULL DEFAULT 0,
  last_submitted_code LONGTEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (user_id, exercise_id),
  INDEX idx_user_exercise_progress_exercise (exercise_id),
  CONSTRAINT chk_user_exercise_progress_best_score CHECK (best_score BETWEEN 0 AND 100),
  CONSTRAINT fk_user_exercise_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_user_exercise_progress_exercise
    FOREIGN KEY (exercise_id) REFERENCES learning_exercises(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  exercise_id VARCHAR(80) NOT NULL,
  submitted_code LONGTEXT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  score INT NOT NULL DEFAULT 0,
  console_output_json JSON NOT NULL,
  test_results_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exercise_attempts_user (user_id),
  INDEX idx_exercise_attempts_exercise (exercise_id),
  CONSTRAINT chk_exercise_attempts_score CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT fk_exercise_attempts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_exercise_attempts_exercise
    FOREIGN KEY (exercise_id) REFERENCES learning_exercises(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
