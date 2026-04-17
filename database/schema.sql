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
  sort_order INT NOT NULL DEFAULT 0
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
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resource_categories (
  id VARCHAR(60) PRIMARY KEY,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resources (
  id VARCHAR(80) PRIMARY KEY,
  label VARCHAR(20) NOT NULL,
  title VARCHAR(120) NOT NULL,
  meta VARCHAR(160) NOT NULL,
  type_label VARCHAR(40) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS challenge_modes (
  id VARCHAR(40) PRIMARY KEY,
  label VARCHAR(40) NOT NULL,
  description VARCHAR(255) NOT NULL,
  color_hex VARCHAR(20) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stats_summary (
  id TINYINT PRIMARY KEY,
  level_value INT NOT NULL,
  total_xp INT NOT NULL,
  precision_percent INT NOT NULL,
  streak_days INT NOT NULL,
  solved_challenges INT NOT NULL,
  total_minutes INT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_activity (
  day_label CHAR(1) PRIMARY KEY,
  xp_value INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
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
  sort_order INT NOT NULL DEFAULT 0
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
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  track_label VARCHAR(120) NOT NULL,
  focus_text VARCHAR(255) NOT NULL,
  daily_goal_minutes INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  CONSTRAINT fk_exercise_attempts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_exercise_attempts_exercise
    FOREIGN KEY (exercise_id) REFERENCES learning_exercises(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
