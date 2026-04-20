SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM deploy_checklist;
DELETE FROM deploy_config;
DELETE FROM recent_sessions;
DELETE FROM weekly_activity;
DELETE FROM stats_summary;
DELETE FROM challenge_modes;
DELETE FROM resources;
DELETE FROM resource_categories;
DELETE FROM featured_classes;
DELETE FROM roadmaps;
DELETE FROM profile_config;
DELETE FROM branding_config;
DELETE FROM exercise_attempts;
DELETE FROM user_exercise_progress;
DELETE FROM exercise_test_cases;
DELETE FROM learning_exercises;
DELETE FROM learning_topics;
DELETE FROM auth_audit_log;
DELETE FROM users;

INSERT INTO branding_config (id, app_name, headline, tagline, hero_snippet, logo_label, logo_hint) VALUES
(1, 'duocode', '<duocode />', 'Aprende programacion con clases, retos y metricas en una sola plataforma.', 'bootcamp.load(''frontend_engineer_path'')', '</>', 'Reemplaza el logo provisional desde assets/images y docs/branding-guide.md.');

INSERT INTO profile_config (id, name, handle, track, next_class, current_focus, daily_goal, repository_status) VALUES
(1, 'Jimmy Zambrana', 'JimmyCode.dev', 'Frontend Engineer Path', 'React Hooks Essentials', 'Hooks, estado, consumo de APIs y deploy web.', '45 min', 'Listo para GitHub');

INSERT INTO roadmaps (id, title, stack, classes_count, lessons_count, level_label, duration_label, progress_percent, status_label, next_label, sort_order) VALUES
('frontend-launchpad', 'Frontend Launchpad', 'HTML CSS JS React', 8, 34, 'Beginner', '4 semanas', 72, 'Activa', 'Hooks y estado', 1),
('api-builder', 'API Builder', 'Node HTTP JSON Deploy', 6, 24, 'Intermediate', '3 semanas', 41, 'En curso', 'Endpoints REST', 2),
('ship-it', 'Ship It', 'GitHub Vercel Railway', 5, 18, 'Deploy', '2 semanas', 18, 'Pendiente', 'Variables de entorno', 3);

INSERT INTO featured_classes (id, title, description, level_label, duration_label, lessons_count, tag_label, status_label, sort_order) VALUES
('react-hooks', 'React Hooks Essentials', 'useState, useEffect y componentes reutilizables con una UI de producto real.', 'Intermedio', '45 min', 6, 'React', 'Popular', 1),
('api-errors', 'Fetch y manejo de errores', 'Llamadas a API, loading states, retries y respuestas JSON limpias.', 'Intermedio', '38 min', 5, 'API', 'Nueva', 2),
('deploy-stack', 'Deploy con Vercel y Railway', 'Conecta frontend y backend, variables de entorno y despliegue desde GitHub.', 'Deploy', '52 min', 7, 'Deploy', 'Clave', 3);

INSERT INTO resource_categories (id, sort_order) VALUES
('react', 1),
('api', 2),
('git', 3),
('deploy', 4),
('typescript', 5);

INSERT INTO resources (id, label, title, meta, type_label, sort_order) VALUES
('react-patterns', 'TS', 'React Hooks Patterns', 'md - 12 min - actualizado_hoy', 'Guia', 1),
('railway-setup', 'DEP', 'Railway Setup Checklist', 'guide - 10 min - deploy_ready', 'Deploy', 2),
('vercel-env', 'ENV', 'Variables de entorno en Vercel', 'snippet - 6 min - production_safe', 'Config', 3);

INSERT INTO challenge_modes (id, label, description, color_hex, sort_order) VALUES
('easy', 'EASY', 'Reto guiado con pista y codigo base.', '#22C55E', 1),
('medium', 'MEDIUM', 'Reto intermedio con objetivos claros y validacion manual.', '#F59E0B', 2),
('hard', 'HARD', 'Reto libre orientado a portfolio y deploy final.', '#38BDF8', 3);

INSERT INTO stats_summary (id, level_value, total_xp, precision_percent, streak_days, solved_challenges, total_minutes) VALUES
(1, 12, 1280, 85, 7, 38, 245);

INSERT INTO weekly_activity (day_label, xp_value, sort_order) VALUES
('L', 90, 1),
('M', 140, 2),
('X', 110, 3),
('J', 170, 4),
('V', 210, 5),
('S', 150, 6),
('D', 120, 7);

INSERT INTO recent_sessions (id, title, topic, status_label, power_percent, reward_xp, accuracy_percent, code_lines, sort_order) VALUES
('react-07', 'Sprint React #07', 'Hooks y estado', 'COMPLETADO', 52, 187, 89, JSON_ARRAY('const xp = streak * 40;', 'if (answer.correct) level++;', 'return ''duocode'';'), 1),
('api-03', 'API Debug #03', 'Fetch y manejo de errores', 'EN CURSO', 68, 142, 81, JSON_ARRAY('try {', '  const data = await fetch(url);', '} catch (error) {'), 2),
('js-11', 'JavaScript Loops #11', 'Bucles y arrays', 'COMPLETADO', 74, 201, 93, JSON_ARRAY('for (const item of items) {', '  total += item.value;', '}'), 3);

INSERT INTO deploy_config (id, repository_name, frontend_platform, backend_platform, frontend_build_command, backend_start_command, env_var_name) VALUES
(1, 'duocode-platform', 'Vercel', 'Railway', 'npm run web:build', 'npm run api:start', 'EXPO_PUBLIC_API_URL');

INSERT INTO deploy_checklist (item_text, sort_order) VALUES
('Crear repositorio en GitHub', 1),
('Subir rama main', 2),
('Conectar Vercel al repo', 3),
('Conectar Railway al repo', 4),
('Configurar EXPO_PUBLIC_API_URL en Vercel', 5);

INSERT INTO users (id, name, email, password_hash, role, is_active, failed_login_attempts, locked_until, last_login_at, track_label, focus_text, daily_goal_minutes, created_at) VALUES
(1, 'Admin Duocode', 'admin@duocode.dev', 'scrypt$16a7143145ec89d067ea10761c6a0143$2c224336efd06602fa02f163cd13fc9b6ac10778facdbc139f66eea39d045d8865ac52455e4e873d778845462d41d2236bfb6dde8f1be95206358332b3bddbad', 'admin', true, 0, NULL, '2026-04-16 09:15:00', 'Platform Oversight', 'Metricas, progresion y roadmap editorial.', 0, '2026-04-01 09:00:00'),
(2, 'Jimmy Zambrana', 'student@duocode.dev', 'scrypt$2d3c760f34a4876a637274cea3c347a4$c8d04d915c05eab2d43d5075f24dab39e4702c0748e35248034612c90d3b0a335ce937c0471cd9ce84b992e8ae766bf3012217bd1c465516f4118c08e010c7dc', 'student', true, 0, NULL, '2026-04-16 08:32:00', 'Frontend Engineer Path', 'Hooks, estado, consumo de APIs y deploy web.', 45, '2026-04-02 10:15:00'),
(3, 'Ana API', 'ana@duocode.dev', 'scrypt$2d3c760f34a4876a637274cea3c347a4$c8d04d915c05eab2d43d5075f24dab39e4702c0748e35248034612c90d3b0a335ce937c0471cd9ce84b992e8ae766bf3012217bd1c465516f4118c08e010c7dc', 'student', true, 0, NULL, '2026-04-15 11:00:00', 'API Builder', 'Endpoints REST y manejo seguro de errores.', 35, '2026-04-03 12:45:00');

INSERT INTO learning_topics (id, roadmap_id, title, description, estimated_minutes, status_label, sort_order) VALUES
('js-foundations', 'frontend-launchpad', 'JavaScript Foundations', 'Funciones puras, arrays y strings para resolver retos base.', 95, 'Activo', 1),
('react-state', 'frontend-launchpad', 'React State Patterns', 'Funciones que formatean y transforman datos como lo haria una UI React.', 110, 'Activo', 2),
('deploy-readiness', 'ship-it', 'Deploy Readiness', 'Respuestas escritas como funciones para simular estados de deploy y resumenes de entorno.', 85, 'Siguiente', 3);

INSERT INTO learning_exercises (id, topic_id, title, prompt, instructions_json, function_name, starter_code, solution_code, explanation, xp_reward, sort_order) VALUES
('greet-developer', 'js-foundations', 'Crear saludo de developer', 'Implementa una funcion llamada greetDeveloper que reciba un nombre y devuelva el texto exacto "Hola <nombre>, listo para codear".', JSON_ARRAY('Crea una funcion llamada greetDeveloper.', 'Debe recibir un parametro name.', 'Debe devolver un string exacto sin console.log final.'), 'greetDeveloper', 'function greetDeveloper(name) {\n  // escribe tu solucion aqui\n}\n', 'function greetDeveloper(name) {\n  return `Hola ${name}, listo para codear`;\n}\n', 'La solucion correcta usa un template string y retorna el saludo exacto que esperan los test cases.', 60, 1),
('sum-array', 'js-foundations', 'Sumar un array de numeros', 'Implementa una funcion sumArray que reciba un array de numeros y devuelva la suma total.', JSON_ARRAY('Crea una funcion llamada sumArray.', 'Recibe un array llamado numbers.', 'Devuelve la suma como numero.'), 'sumArray', 'function sumArray(numbers) {\n  // recorre el array y devuelve la suma\n}\n', 'function sumArray(numbers) {\n  return numbers.reduce((total, item) => total + item, 0);\n}\n', 'Se puede resolver con reduce o con un bucle. Lo importante es devolver la suma correcta para cualquier array.', 80, 2),
('counter-label', 'react-state', 'Formatear etiqueta de contador', 'Crea una funcion buildCounterLabel que reciba un numero y devuelva "Contador: <numero> clicks".', JSON_ARRAY('La funcion debe llamarse buildCounterLabel.', 'Recibe count como numero.', 'Devuelve el texto exacto.'), 'buildCounterLabel', 'function buildCounterLabel(count) {\n  // devuelve una etiqueta legible para la UI\n}\n', 'function buildCounterLabel(count) {\n  return `Contador: ${count} clicks`;\n}\n', 'El objetivo es practicar interpolacion y devolver un string consistente para renderizar en componentes.', 70, 1),
('pending-tasks', 'react-state', 'Filtrar tareas pendientes', 'Crea una funcion getPendingTaskTitles que reciba un array de tareas y devuelva solo los titulos de las tareas cuyo campo done sea false.', JSON_ARRAY('La funcion debe llamarse getPendingTaskTitles.', 'Cada tarea tiene title y done.', 'Debes devolver un array de strings.'), 'getPendingTaskTitles', 'function getPendingTaskTitles(tasks) {\n  // filtra las tareas pendientes y devuelve solo el title\n}\n', 'function getPendingTaskTitles(tasks) {\n  return tasks.filter((task) => !task.done).map((task) => task.title);\n}\n', 'Primero filtras por done false y luego transformas el resultado con map para quedarte solo con el title.', 120, 2),
('deploy-status', 'deploy-readiness', 'Formatear estado de deploy', 'Crea una funcion formatDeployStatus que reciba appName e isOnline y devuelva "<appName>: online" o "<appName>: offline".', JSON_ARRAY('La funcion debe llamarse formatDeployStatus.', 'Recibe appName e isOnline.', 'Devuelve el string exacto.'), 'formatDeployStatus', 'function formatDeployStatus(appName, isOnline) {\n  // devuelve el estado del deploy\n}\n', 'function formatDeployStatus(appName, isOnline) {\n  return `${appName}: ${isOnline ? ''online'' : ''offline''}`;\n}\n', 'Usa un operador ternario para resolver rapido si la app esta online u offline y concatena el nombre.', 90, 1),
('env-summary', 'deploy-readiness', 'Construir resumen de variables', 'Crea una funcion buildEnvSummary que reciba un objeto env y devuelva otro objeto con hasApiUrl y hasMysql configurados.', JSON_ARRAY('La funcion debe llamarse buildEnvSummary.', 'Devuelve un objeto con booleanos.', 'hasApiUrl depende de env.EXPO_PUBLIC_API_URL.', 'hasMysql depende de MYSQL_HOST o MYSQL_URL.'), 'buildEnvSummary', 'function buildEnvSummary(env) {\n  // devuelve un resumen de configuracion\n}\n', 'function buildEnvSummary(env) {\n  return {\n    hasApiUrl: Boolean(env.EXPO_PUBLIC_API_URL),\n    hasMysql: Boolean(env.MYSQL_HOST || env.MYSQL_URL),\n  };\n}\n', 'La solucion usa Boolean para transformar la existencia de variables en true o false de forma clara.', 140, 2);

INSERT INTO exercise_test_cases (exercise_id, label, args_json, expected_json, sort_order) VALUES
('greet-developer', 'Caso Jimmy', JSON_ARRAY('Jimmy'), JSON_QUOTE('Hola Jimmy, listo para codear'), 1),
('greet-developer', 'Caso Ana', JSON_ARRAY('Ana'), JSON_QUOTE('Hola Ana, listo para codear'), 2),
('sum-array', 'Array pequeno', JSON_ARRAY(JSON_ARRAY(1, 2, 3, 4)), CAST('10' AS JSON), 1),
('sum-array', 'Incluye negativos', JSON_ARRAY(JSON_ARRAY(8, -2, 5)), CAST('11' AS JSON), 2),
('counter-label', 'Count 0', JSON_ARRAY(0), JSON_QUOTE('Contador: 0 clicks'), 1),
('counter-label', 'Count 14', JSON_ARRAY(14), JSON_QUOTE('Contador: 14 clicks'), 2),
('pending-tasks', 'Mixto', JSON_ARRAY(JSON_ARRAY(JSON_OBJECT('title', 'Login', 'done', true), JSON_OBJECT('title', 'Dashboard', 'done', false), JSON_OBJECT('title', 'Deploy', 'done', false))), JSON_ARRAY('Dashboard', 'Deploy'), 1),
('pending-tasks', 'Todo completo', JSON_ARRAY(JSON_ARRAY(JSON_OBJECT('title', 'API', 'done', true))), JSON_ARRAY(), 2),
('deploy-status', 'Online', JSON_ARRAY('duocode-api', true), JSON_QUOTE('duocode-api: online'), 1),
('deploy-status', 'Offline', JSON_ARRAY('duocode-web', false), JSON_QUOTE('duocode-web: offline'), 2),
('env-summary', 'Todo listo', JSON_ARRAY(JSON_OBJECT('EXPO_PUBLIC_API_URL', 'https://api.example.com', 'MYSQL_HOST', '127.0.0.1')), JSON_OBJECT('hasApiUrl', true, 'hasMysql', true), 1),
('env-summary', 'Sin MySQL', JSON_ARRAY(JSON_OBJECT('EXPO_PUBLIC_API_URL', 'https://api.example.com')), JSON_OBJECT('hasApiUrl', true, 'hasMysql', false), 2);

INSERT INTO user_exercise_progress (user_id, exercise_id, is_completed, best_score, last_submitted_code, updated_at, completed_at) VALUES
(2, 'greet-developer', true, 100, 'function greetDeveloper(name) {\n  return `Hola ${name}, listo para codear`;\n}\n', '2026-04-14 14:20:00', '2026-04-14 14:20:00'),
(2, 'sum-array', true, 100, 'function sumArray(numbers) {\n  return numbers.reduce((total, item) => total + item, 0);\n}\n', '2026-04-15 09:05:00', '2026-04-15 09:05:00'),
(2, 'counter-label', false, 50, 'function buildCounterLabel(count) {\n  return `Contador ${count}`;\n}\n', '2026-04-16 08:30:00', NULL),
(3, 'greet-developer', true, 100, 'function greetDeveloper(name) {\n  return `Hola ${name}, listo para codear`;\n}\n', '2026-04-15 11:00:00', '2026-04-15 11:00:00');

INSERT INTO exercise_attempts (id, user_id, exercise_id, submitted_code, passed, score, console_output_json, test_results_json, created_at) VALUES
(1, 2, 'greet-developer', 'function greetDeveloper(name) {\n  return `Hola ${name}, listo para codear`;\n}\n', true, 100, JSON_ARRAY(), JSON_ARRAY(), '2026-04-14 14:20:00'),
(2, 2, 'sum-array', 'function sumArray(numbers) {\n  return numbers.reduce((total, item) => total + item, 0);\n}\n', true, 100, JSON_ARRAY(), JSON_ARRAY(), '2026-04-15 09:05:00'),
(3, 2, 'counter-label', 'function buildCounterLabel(count) {\n  return `Contador ${count}`;\n}\n', false, 50, JSON_ARRAY(), JSON_ARRAY(), '2026-04-16 08:30:00'),
(4, 3, 'greet-developer', 'function greetDeveloper(name) {\n  return `Hola ${name}, listo para codear`;\n}\n', true, 100, JSON_ARRAY(), JSON_ARRAY(), '2026-04-15 11:00:00');

SET FOREIGN_KEY_CHECKS = 1;
