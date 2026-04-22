const ROADMAP_ID = 'javascript-complete-path';
const LANGUAGE_ID = 'javascript';
const LANGUAGE_LABEL = 'JavaScript';
const COURSE_ACCENT = '#38BDF8';
const DEMO_NOW = new Date('2026-04-20T18:30:00.000Z');

function l(title, token, statement, exampleCode, predictionCode, predictionAnswer, debuggingCode, debuggingAnswer, debuggingHint) {
  return { title, token, statement, exampleCode, predictionCode, predictionAnswer, debuggingCode, debuggingAnswer, debuggingHint };
}

function capstone(title, prompt, functionName, starterCode, solutionCode, testCases, explanation) {
  return { title, prompt, functionName, starterCode, solutionCode, testCases, explanation };
}

function unit(id, title, summary, distractors, capstoneSpec, lessons) {
  return { id, title, summary, distractors, capstone: capstoneSpec, lessons };
}

const COURSE_BLUEPRINT = [
  {
    id: 'basic',
    label: 'Básico',
    levelNumber: 1,
    objective: 'Entender sintaxis y logica base para escribir scripts pequenos con seguridad.',
    badge: 'JS NIVEL 1',
    message: 'Empiezas con sintaxis, decisiones y repeticion controlada.',
    glyph: 'JS',
    units: [
      unit(
        'variables-types',
        'Variables y tipos',
        'Aprendes a guardar datos y reconocer valores primitivos.',
        ['Solo sirve para imprimir mensajes.', 'Convierte cualquier valor en un array automaticamente.'],
        capstone('Construir ficha basica', 'Implementa buildProfileLabel(name, age) para devolver exactamente "name (age)".', 'buildProfileLabel', 'function buildProfileLabel(name, age) {\n  // devuelve el texto final\n}\n', 'function buildProfileLabel(name, age) {\n  return `${name} (${age})`;\n}\n', [{ label: 'Caso Ana', args: ['Ana', 23], expected: 'Ana (23)' }, { label: 'Caso Luis', args: ['Luis', 31], expected: 'Luis (31)' }], 'El reto final usa strings y valores dinamicos para construir una salida exacta.'),
        [
          l('Que es una variable', 'variable', 'Una variable reserva un espacio para guardar un valor y reutilizarlo despues.', 'let score = 0;\nconsole.log(score);', 'let score = 0;\nconsole.log(score);', '0', 'score = 1;\nconsole.log(score);', 'let', 'Debes declarar la variable antes de usarla con let o const.'),
          l('Declaracion con let y const', 'const', 'const se usa cuando la referencia no se va a reasignar y let cuando si cambia.', 'const appName = "Duocode";\nlet attempts = 1;', 'const appName = "Duocode";\nconsole.log(appName);', 'Duocode', 'const total = 10;\ntotal = 12;', 'const', 'const no permite reasignar la referencia despues de declararla.'),
          l('Tipos number string boolean', 'boolean', 'JavaScript tiene tipos primitivos como number, string y boolean para representar datos.', 'const active = true;\nconst age = 18;\nconst name = "Ana";', 'const active = true;\nconsole.log(active);', 'true', 'const active = "true";\nif (active === true) { console.log("ok"); }', 'boolean', 'La comparacion estricta falla porque "true" es string y no boolean.'),
          l('Operaciones basicas', 'number', 'Las operaciones aritmeticas permiten sumar, restar, multiplicar y dividir valores numericos.', 'const total = 5 + 3;\nconsole.log(total);', 'const total = 8 - 3;\nconsole.log(total);', '5', 'const total = "8" + 2;', 'Number', 'Si necesitas operar como numero conviene convertir el valor antes.'),
          l('Conversion de tipos', 'Number', 'Puedes convertir strings a number con Number y valores a string con String.', 'const age = Number("24");\nconsole.log(age);', 'const age = Number("24");\nconsole.log(age + 1);', '25', 'const age = Number("veinte");\nconsole.log(age);', 'NaN', 'Cuando la conversion no es valida obtienes NaN y debes validarlo.'),
        ]
      ),
      unit(
        'input-output',
        'Entrada y salida',
        'Practicas como mostrar informacion y simular entrada del usuario.',
        ['Solo funciona dentro de HTML.', 'Siempre modifica variables aunque no lo indiques.'],
        capstone('Banner de consola', 'Implementa buildConsoleBanner(name, stack) para devolver "Aprendiendo stack con name".', 'buildConsoleBanner', 'function buildConsoleBanner(name, stack) {\n  // arma el banner final\n}\n', 'function buildConsoleBanner(name, stack) {\n  return `Aprendiendo ${stack} con ${name}`;\n}\n', [{ label: 'Caso React', args: ['Ana', 'React'], expected: 'Aprendiendo React con Ana' }, { label: 'Caso Node', args: ['Luis', 'Node'], expected: 'Aprendiendo Node con Luis' }], 'La salida exacta es clave cuando construyes mensajes visibles para el usuario.'),
        [
          l('console.log', 'console.log', 'console.log muestra informacion en la consola para inspeccionar el programa.', 'console.log("Hola Duocode");', 'console.log("Hola Duocode");', 'Hola Duocode', 'console.log = "hola";\nconsole.log("test");', 'console.log', 'No debes sobrescribir console.log porque es la funcion de salida.'),
          l('Mostrar texto y variables', 'console.log', 'Puedes enviar texto y variables juntas a console.log para inspeccionar valores.', 'const name = "Ana";\nconsole.log("Hola", name);', 'const name = "Ana";\nconsole.log("Hola", name);', "'Hola' 'Ana'", 'const name = "Ana";\nconsole.log("Hola" name);', ',', 'Falta la coma para separar los argumentos enviados a console.log.'),
          l('Concatenacion', '+', 'La concatenacion une strings usando el operador +.', 'const name = "Ana";\nconst msg = "Hola " + name;', 'const name = "Ana";\nconsole.log("Hola " + name);', 'Hola Ana', 'const msg = "Hola " name;', '+', 'Para concatenar strings debes usar + o un template string.'),
          l('Template strings', 'template string', 'Los template strings permiten interpolar valores con ${} dentro de backticks.', 'const name = "Ana";\nconst msg = `Hola ${name}`;', 'const name = "Ana";\nconsole.log(`Hola ${name}`);', 'Hola Ana', 'const name = "Ana";\nconsole.log("Hola ${name}");', 'backticks', 'La interpolacion solo funciona con backticks y no con comillas normales.'),
          l('Entrada simulada con prompt', 'prompt', 'prompt permite capturar texto del usuario en entornos donde esta disponible.', 'const name = prompt("Tu nombre");', 'const city = "La Paz";\nconsole.log(city);', 'La Paz', 'const name = prompt(Tu nombre);', 'comillas', 'El mensaje de prompt debe ir entre comillas porque es un string.'),
        ]
      ),
      unit(
        'operators',
        'Operadores',
        'Comparas valores y combinas expresiones para tomar decisiones.',
        ['Siempre repite bloques automaticamente.', 'Solo sirve para declarar funciones nuevas.'],
        capstone('Comparador de puntajes', 'Implementa compareScores(current, target) y devuelve "above", "equal" o "below".', 'compareScores', 'function compareScores(current, target) {\n  // compara los valores\n}\n', 'function compareScores(current, target) {\n  if (current > target) return "above";\n  if (current === target) return "equal";\n  return "below";\n}\n', [{ label: 'Mayor', args: [8, 5], expected: 'above' }, { label: 'Igual', args: [5, 5], expected: 'equal' }, { label: 'Menor', args: [2, 5], expected: 'below' }], 'Comparar bien operadores evita errores de flujo y permite decisiones precisas.'),
        [
          l('Operadores aritmeticos', '+', 'Los operadores aritmeticos trabajan con numeros para obtener un nuevo resultado.', 'const total = 10 / 2;\nconsole.log(total);', 'const total = 3 * 4;\nconsole.log(total);', '12', 'const total = 10 // 2;', '/', 'En JavaScript la division se hace con / y no con //.'),
          l('Comparacion == y ===', '===', '=== compara valor y tipo; == intenta convertir antes de comparar.', 'console.log(5 === "5");', 'console.log(5 === "5");', 'false', 'if (5 = 5) { console.log("ok"); }', '===', 'Para comparar debes usar === o == y no el operador de asignacion =.'),
          l('Logicos && y ||', '&&', 'Los operadores logicos combinan condiciones para producir true o false.', 'const canEnter = true && true;', 'console.log(true && false);', 'false', 'if (active and admin) { console.log("ok"); }', '&&', 'En JavaScript el operador and es && y el or es ||.'),
          l('Precedencia', '()', 'La precedencia indica que operaciones se resuelven primero y los parentesis ayudan a aclararlo.', 'const total = 2 + 3 * 4;', 'console.log(2 + 3 * 4);', '14', 'const total = 2 + 3 *;', 'operando', 'Falta un operando despues del operador * para completar la expresion.'),
          l('Expresiones complejas', 'expresion', 'Una expresion compleja combina operadores para producir un unico resultado.', 'const access = (score > 70 && active) || admin;', 'const access = (8 > 5 && true) || false;\nconsole.log(access);', 'true', 'const access = (8 > 5 &&) true;', 'condicion', 'Despues de && debe venir una condicion valida antes del siguiente valor.'),
        ]
      ),
      unit(
        'conditionals',
        'Condicionales',
        'Controlas el flujo del programa segun condiciones.',
        ['Siempre ejecuta todos los bloques.', 'Solo puede usarse con arrays y no con numeros.'],
        capstone('Mensaje de acceso', 'Implementa accessMessage(role, active) y devuelve "Acceso permitido" o "Acceso denegado". El acceso se permite solo si role es "admin" o active es true.', 'accessMessage', 'function accessMessage(role, active) {\n  // devuelve el mensaje correcto\n}\n', 'function accessMessage(role, active) {\n  if (role === "admin" || active) {\n    return "Acceso permitido";\n  }\n\n  return "Acceso denegado";\n}\n', [{ label: 'Admin', args: ['admin', false], expected: 'Acceso permitido' }, { label: 'Activo', args: ['student', true], expected: 'Acceso permitido' }, { label: 'Bloqueado', args: ['student', false], expected: 'Acceso denegado' }], 'Las condiciones combinadas te ayudan a definir reglas de acceso claras.'),
        [
          l('if', 'if', 'if ejecuta un bloque solo cuando la condicion es verdadera.', 'if (score > 10) {\n  console.log("alto");\n}', 'const score = 15;\nif (score > 10) { console.log("alto"); }', 'alto', '(score > 10) { console.log("alto"); }', 'if', 'Hace falta la palabra clave if para introducir la condicion.'),
          l('if else', 'else', 'else define que hacer cuando la condicion del if es falsa.', 'if (active) {\n  console.log("ok");\n} else {\n  console.log("no");\n}', 'const active = false;\nif (active) { console.log("ok"); } else { console.log("no"); }', 'no', 'if (active) { console.log("ok"); } console.log("no");', 'else', 'Sin else el caso alterno queda fuera de la decision principal.'),
          l('else if', 'else if', 'else if permite revisar una segunda condicion cuando la primera falla.', 'if (score > 90) {\n  console.log("A");\n} else if (score > 70) {\n  console.log("B");\n}', 'const score = 75;\nif (score > 90) { console.log("A"); } else if (score > 70) { console.log("B"); }', 'B', 'if (score > 90) { console.log("A"); } if (score > 70) { console.log("B"); }', 'else if', 'Si quieres una cadena excluyente debes usar else if y no if sueltos.'),
          l('switch', 'switch', 'switch compara un valor contra varios casos posibles.', 'switch (role) {\n  case "admin":\n    console.log("full");\n    break;\n}', 'const role = "admin";\nswitch (role) { case "admin": console.log("full"); break; default: console.log("basic"); }', 'full', 'case "admin": console.log("full");', 'switch', 'Los case deben vivir dentro de una estructura switch.'),
          l('Condiciones combinadas', '&&', 'Puedes combinar varias condiciones para describir reglas mas realistas.', 'if (active && score > 50) {\n  console.log("seguir");\n}', 'const active = true;\nconst score = 60;\nif (active && score > 50) { console.log("seguir"); }', 'seguir', 'if (active score > 50) { console.log("seguir"); }', '&&', 'Falta un operador logico para unir ambas condiciones.'),
        ]
      ),
      unit(
        'loops',
        'Bucles',
        'Repites instrucciones sin copiar codigo innecesario.',
        ['Solo se puede usar una vez por archivo.', 'Siempre devuelve arrays sin necesidad de variables.'],
        capstone('Recolectar pares', 'Implementa collectEvenNumbers(limit) y devuelve un array con los numeros pares desde 0 hasta limit inclusive.', 'collectEvenNumbers', 'function collectEvenNumbers(limit) {\n  // devuelve los pares hasta limit\n}\n', 'function collectEvenNumbers(limit) {\n  const result = [];\n\n  for (let value = 0; value <= limit; value += 1) {\n    if (value % 2 === 0) {\n      result.push(value);\n    }\n  }\n\n  return result;\n}\n', [{ label: 'Hasta 4', args: [4], expected: [0, 2, 4] }, { label: 'Hasta 1', args: [1], expected: [0] }], 'La combinacion de for e if permite construir resultados acumulados.'),
        [
          l('for', 'for', 'for es ideal cuando conoces el contador y el numero de repeticiones.', 'for (let i = 0; i < 3; i += 1) {\n  console.log(i);\n}', 'for (let i = 0; i < 2; i += 1) { console.log(i); }', '0\n1', 'for let i = 0; i < 3; i += 1 { console.log(i); }', '()', 'La cabecera del for debe ir entre parentesis.'),
          l('while', 'while', 'while repite mientras la condicion siga siendo verdadera.', 'let count = 0;\nwhile (count < 2) {\n  console.log(count);\n  count += 1;\n}', 'let count = 0;\nwhile (count < 2) { console.log(count); count += 1; }', '0\n1', 'let count = 0;\nwhile count < 2 { count += 1; }', '()', 'La condicion de while tambien debe estar entre parentesis.'),
          l('do while', 'do while', 'do while ejecuta el bloque al menos una vez antes de evaluar la condicion.', 'let count = 0;\ndo {\n  console.log(count);\n  count += 1;\n} while (count < 1);', 'let count = 0;\ndo { console.log(count); count += 1; } while (count < 1);', '0', 'do { console.log("ok"); } while count < 1;', '()', 'La condicion final de while necesita parentesis.'),
          l('break y continue', 'break', 'break corta el bucle y continue salta a la siguiente iteracion.', 'for (let i = 0; i < 5; i += 1) {\n  if (i === 2) break;\n}', 'for (let i = 0; i < 4; i += 1) { if (i === 2) continue; console.log(i); }', '0\n1\n3', 'for (let i = 0; i < 4; i += 1) { if (i === 2) skip; }', 'continue', 'skip no existe en JavaScript; para saltar una vuelta usas continue.'),
          l('Bucles anidados', 'anidado', 'Un bucle anidado es un bucle dentro de otro para recorrer combinaciones.', 'for (let row = 0; row < 2; row += 1) {\n  for (let col = 0; col < 2; col += 1) {\n    console.log(row, col);\n  }\n}', 'for (let row = 0; row < 1; row += 1) { for (let col = 0; col < 2; col += 1) { console.log(col); } }', '0\n1', 'for (let row = 0; row < 2; row += 1) { for let col = 0; col < 2; col += 1 { console.log(col); } }', 'for', 'El bucle interno tambien necesita la palabra clave for completa.'),
        ]
      ),
    ],
  },
  {
    id: 'intermediate',
    label: 'Intermedio',
    levelNumber: 2,
    objective: 'Estructurar codigo, transformar datos y resolver problemas mas reales.',
    badge: 'JS NIVEL 2',
    message: 'Pasas de sintaxis a piezas reutilizables y manejo de estructuras.',
    glyph: 'fn',
    units: [
      unit(
        'functions',
        'Funciones',
        'Encapsulas comportamiento y controlas entradas y salidas.',
        ['Las funciones solo se usan con HTML.', 'Una funcion siempre modifica variables globales.'],
        capstone('Mensaje de commit', 'Implementa formatCommitMessage(type, message) y devuelve "type: message".', 'formatCommitMessage', 'function formatCommitMessage(type, message) {\n  // devuelve el commit listo\n}\n', 'function formatCommitMessage(type, message) {\n  return `${type}: ${message}`;\n}\n', [{ label: 'Feat', args: ['feat', 'add login'], expected: 'feat: add login' }, { label: 'Fix', args: ['fix', 'repair api'], expected: 'fix: repair api' }], 'Una funcion reutilizable facilita construir mensajes consistentes.'),
        [
          l('Declaracion de funciones', 'function', 'Una funcion agrupa instrucciones reutilizables bajo un nombre.', 'function greet() {\n  return "hola";\n}', 'function greet() { return "hola"; }\nconsole.log(greet());', 'hola', 'greet() {\n  return "hola";\n}', 'function', 'Para declarar una funcion debes empezar con la palabra clave function.'),
          l('Parametros', 'parametro', 'Los parametros reciben datos de entrada para que la funcion trabaje con ellos.', 'function greet(name) {\n  return `Hola ${name}`;\n}', 'function greet(name) { return `Hola ${name}`; }\nconsole.log(greet("Ana"));', 'Hola Ana', 'function greet() { return `Hola ${name}`; }', 'name', 'Si usas name dentro de la funcion debes declararlo como parametro.'),
          l('Return', 'return', 'return entrega el resultado final de una funcion al lugar donde se llama.', 'function double(value) {\n  return value * 2;\n}', 'function double(value) { return value * 2; }\nconsole.log(double(3));', '6', 'function double(value) { value * 2; }', 'return', 'Sin return la funcion calcula algo pero no lo devuelve.'),
          l('Funciones flecha', '=>', 'Las funciones flecha ofrecen una sintaxis mas compacta para funciones pequenas.', 'const double = (value) => value * 2;', 'const double = (value) => value * 2;\nconsole.log(double(4));', '8', 'const double = value) => value * 2;', '(', 'Falta abrir el parentesis del parametro antes de usar la flecha.'),
          l('Scope', 'scope', 'El scope define donde una variable esta disponible y donde deja de existir.', 'function test() {\n  const inside = 1;\n  return inside;\n}', 'function test() { const inside = 1; return inside; }\nconsole.log(test());', '1', 'function test() { const inside = 1; }\nconsole.log(inside);', 'scope', 'inside vive dentro de la funcion y fuera de ese scope ya no existe.'),
        ]
      ),
      unit(
        'arrays',
        'Arrays',
        'Guardas listas y recorres colecciones de forma ordenada.',
        ['Un array solo puede guardar un valor.', 'Los arrays no se pueden recorrer en JavaScript.'],
        capstone('Normalizar puntajes', 'Implementa normalizeScores(scores) y devuelve un nuevo array sumando 10 a cada puntaje.', 'normalizeScores', 'function normalizeScores(scores) {\n  // devuelve un nuevo array\n}\n', 'function normalizeScores(scores) {\n  return scores.map((score) => score + 10);\n}\n', [{ label: 'Dos valores', args: [[10, 20]], expected: [20, 30] }, { label: 'Vacio', args: [[]], expected: [] }], 'map crea un nuevo array sin modificar el original.'),
        [
          l('Crear arrays', '[]', 'Un array es una lista ordenada de valores entre corchetes.', 'const tags = ["js", "react"];', 'const tags = ["js", "react"];\nconsole.log(tags.length);', '2', 'const tags = ("js", "react");', '[]', 'Para crear un array necesitas corchetes y no parentesis.'),
          l('Acceso a elementos', 'indice', 'Accedes a un elemento del array usando su indice empezando en 0.', 'const tags = ["js", "react"];\nconsole.log(tags[0]);', 'const tags = ["js", "react"];\nconsole.log(tags[1]);', 'react', 'const tags = ["js", "react"];\nconsole.log(tags[2]);', 'indice', 'El ultimo elemento valido depende del indice maximo disponible.'),
          l('Metodos push y pop', 'push', 'push agrega al final y pop quita el ultimo elemento del array.', 'const queue = ["a"];\nqueue.push("b");', 'const queue = ["a"];\nqueue.push("b");\nconsole.log(queue.length);', '2', 'const queue = ["a"];\nqueue.append("b");', 'push', 'append no es un metodo de arrays en JavaScript; usa push.'),
          l('Recorrer arrays', 'for of', 'Puedes recorrer arrays con for clasico o con for...of.', 'const tags = ["js", "react"];\nfor (const tag of tags) {\n  console.log(tag);\n}', 'const tags = ["js", "react"];\nfor (const tag of tags) { console.log(tag); }', 'js\nreact', 'for (const tag in tags) { console.log(tag.value); }', 'for of', 'Si quieres el valor directo suele ser mejor for...of.'),
          l('map y filter', 'map', 'map transforma cada valor y filter conserva solo los que cumplen una regla.', 'const values = [1, 2, 3];\nconst doubled = values.map((value) => value * 2);', 'const values = [1, 2, 3];\nconsole.log(values.filter((value) => value > 1).length);', '2', 'const values = [1, 2];\nvalues.map = (value) => value * 2;', 'map', 'map es un metodo que llamas sobre el array, no una variable que reasignas.'),
        ]
      ),
      unit(
        'objects',
        'Objetos',
        'Modelas datos relacionados en pares clave-valor.',
        ['Un objeto solo puede tener una propiedad.', 'Los objetos no admiten metodos.'],
        capstone('Resumen de usuario', 'Implementa buildUserSummary(user) y devuelve "name - role" usando las propiedades del objeto.', 'buildUserSummary', 'function buildUserSummary(user) {\n  // usa user.name y user.role\n}\n', 'function buildUserSummary(user) {\n  return `${user.name} - ${user.role}`;\n}\n', [{ label: 'Ana', args: [{ name: 'Ana', role: 'admin' }], expected: 'Ana - admin' }, { label: 'Luis', args: [{ name: 'Luis', role: 'student' }], expected: 'Luis - student' }], 'Los objetos permiten agrupar datos relacionados para leerlos con claridad.'),
        [
          l('Crear objetos', '{}', 'Un objeto agrupa propiedades entre llaves para representar una entidad.', 'const user = { name: "Ana", role: "student" };', 'const user = { name: "Ana", role: "student" };\nconsole.log(user.role);', 'student', 'const user = [ name: "Ana" ];', '{}', 'Los objetos usan llaves y no corchetes con propiedades nombradas.'),
          l('Propiedades', 'propiedad', 'Cada propiedad relaciona una clave con un valor dentro del objeto.', 'const user = { name: "Ana" };', 'const user = { name: "Ana" };\nconsole.log(user.name);', 'Ana', 'const user = { name = "Ana" };', ':', 'Dentro del objeto separas clave y valor con : y no con =.'),
          l('Metodos', 'metodo', 'Un metodo es una funcion guardada como propiedad del objeto.', 'const user = { greet() { return "hola"; } };', 'const user = { greet() { return "hola"; } };\nconsole.log(user.greet());', 'hola', 'const user = { greet => "hola" };', 'function', 'Un metodo necesita sintaxis de funcion o metodo valida para ejecutarse.'),
          l('Acceso dinamico', '[]', 'Puedes acceder a una propiedad dinamica usando corchetes con una variable.', 'const key = "role";\nconst user = { role: "admin" };\nconsole.log(user[key]);', 'const key = "role";\nconst user = { role: "admin" };\nconsole.log(user[key]);', 'admin', 'const key = "role";\nconsole.log(user.key);', '[]', 'Si la clave esta en una variable debes usar corchetes para leerla.'),
          l('Destructuring', 'destructuring', 'El destructuring extrae propiedades de un objeto a variables mas cortas.', 'const user = { name: "Ana" };\nconst { name } = user;', 'const user = { name: "Ana" };\nconst { name } = user;\nconsole.log(name);', 'Ana', 'const { user.name } = user;', '{}', 'El destructuring de objetos usa llaves con los nombres de propiedad.'),
        ]
      ),
      unit(
        'strings-advanced',
        'Strings avanzados',
        'Manipulas texto y preparas datos limpios para interfaz o logs.',
        ['Los strings no tienen metodos utiles.', 'Un string siempre se convierte en objeto complejo.'],
        capstone('Normalizar handle', 'Implementa sanitizeHandle(handle) para devolver el texto trim, en minusculas y reemplazando espacios internos por "-".', 'sanitizeHandle', 'function sanitizeHandle(handle) {\n  // normaliza el texto\n}\n', 'function sanitizeHandle(handle) {\n  return handle.trim().toLowerCase().replace(/\\s+/g, "-");\n}\n', [{ label: 'Dos palabras', args: ['  Hola Mundo  '], expected: 'hola-mundo' }, { label: 'Una palabra', args: ['React'], expected: 'react' }], 'Combinar metodos de string ayuda a limpiar datos antes de mostrarlos o guardarlos.'),
        [
          l('length e includes', 'length', 'length mide caracteres e includes verifica si un texto contiene otro.', 'const title = "duocode";\nconsole.log(title.length);', 'const title = "duocode";\nconsole.log(title.includes("code"));', 'true', 'const title = "duocode";\nconsole.log(title.length());', 'length', 'length es una propiedad y no una funcion con parentesis.'),
          l('Manipulacion basica', 'trim', 'Metodos como trim limpian espacios al inicio y al final del texto.', 'const raw = "  hola  ";\nconsole.log(raw.trim());', 'const raw = "  hola  ";\nconsole.log(raw.trim());', 'hola', 'const raw = " hola ";\nconsole.log(raw.clean());', 'trim', 'clean no existe en strings; para limpiar espacios usas trim.'),
          l('Busqueda', 'indexOf', 'Puedes buscar la posicion de un fragmento con indexOf o validar presencia con includes.', 'const text = "javascript";\nconsole.log(text.indexOf("script"));', 'const text = "javascript";\nconsole.log(text.indexOf("script"));', '4', 'const text = "javascript";\nconsole.log(text.find("script"));', 'indexOf', 'Para hallar la posicion del texto debes usar indexOf.'),
          l('Reemplazo', 'replace', 'replace cambia una coincidencia por otro fragmento de texto.', 'const text = "hola mundo";\nconsole.log(text.replace("mundo", "dev"));', 'const text = "hola mundo";\nconsole.log(text.replace("mundo", "dev"));', 'hola dev', 'const text = "hola mundo";\nconsole.log(text.swap("mundo", "dev"));', 'replace', 'swap no es un metodo de strings en JavaScript.'),
          l('Expresiones comunes', 'toLowerCase', 'Combinar trim, toLowerCase y replace cubre muchos casos de normalizacion.', 'const email = " ANA@MAIL.COM ";\nconsole.log(email.trim().toLowerCase());', 'const email = " ANA@MAIL.COM ";\nconsole.log(email.trim().toLowerCase());', 'ana@mail.com', 'const email = " ANA@MAIL.COM ";\nconsole.log(email.lower());', 'toLowerCase', 'El metodo correcto para minusculas es toLowerCase.'),
        ]
      ),
      unit(
        'error-handling',
        'Manejo de errores',
        'Controlas fallos y validas entradas antes de que rompan el flujo.',
        ['Los errores solo existen en bases de datos.', 'Una vez ocurre un error nunca puedes recuperarte.'],
        capstone('Parseo seguro de edad', 'Implementa safeParseAge(value). Debe convertir value a numero y devolver null si el resultado no es valido.', 'safeParseAge', 'function safeParseAge(value) {\n  // devuelve un numero o null\n}\n', 'function safeParseAge(value) {\n  const parsed = Number(value);\n  return Number.isNaN(parsed) ? null : parsed;\n}\n', [{ label: 'Numero valido', args: ['24'], expected: 24 }, { label: 'Texto invalido', args: ['abc'], expected: null }], 'Antes de usar un valor externo conviene validarlo para evitar errores posteriores.'),
        [
          l('try catch', 'try', 'try captura codigo riesgoso y catch maneja el error si algo falla.', 'try {\n  JSON.parse("{");\n} catch (error) {\n  console.log("fallo");\n}', 'try { JSON.parse("{"); } catch (error) { console.log("fallo"); }', 'fallo', 'try { JSON.parse("{"); } catc (error) { console.log("fallo"); }', 'catch', 'La palabra clave correcta para capturar el error es catch.'),
          l('throw', 'throw', 'throw crea un error manual cuando una condicion invalida aparece.', 'if (!name) {\n  throw new Error("name required");\n}', 'try { throw new Error("fail"); } catch (error) { console.log("fail"); }', 'fail', 'if (!name) { error("name required"); }', 'throw', 'Para lanzar un error debes usar throw y no una llamada inexistente.'),
          l('Tipos de error', 'Error', 'JavaScript tiene errores como Error, TypeError o ReferenceError segun el problema.', 'throw new TypeError("Tipo invalido");', 'try { throw new TypeError("Tipo invalido"); } catch (error) { console.log(error.name); }', 'TypeError', 'throw new typeerror("Tipo invalido");', 'TypeError', 'Los nombres de clases de error respetan mayusculas correctas.'),
          l('Validaciones', 'validacion', 'Validar entradas antes de procesarlas evita errores y datos inconsistentes.', 'if (email.trim() === "") {\n  throw new Error("email required");\n}', 'const email = "  ";\nconsole.log(email.trim() === "");', 'true', 'if (email = "") { throw new Error("email required"); }', '===', 'Para validar igualdad debes comparar con === y no asignar con =.'),
          l('Buenas practicas de errores', 'mensaje', 'Un buen manejo de errores da mensajes claros y no oculta el problema real.', 'throw new Error("Token faltante");', 'try { throw new Error("Token faltante"); } catch (error) { console.log(error.message); }', 'Token faltante', 'throw Error(Token faltante);', 'comillas', 'El mensaje del error debe ser un string entre comillas.'),
        ]
      ),
    ],
  },
  {
    id: 'advanced',
    label: 'Avanzado',
    levelNumber: 3,
    objective: 'Pensar como desarrollador real con asincronia, arquitectura y patrones modernos.',
    badge: 'JS NIVEL 3',
    message: 'Ya trabajas flujos mas cercanos a una app de produccion.',
    glyph: 'async',
    units: [
      unit(
        'async',
        'Asincronia',
        'Coordinar tareas que no terminan inmediatamente.',
        ['El codigo asincrono siempre se ejecuta de forma lineal.', 'Promises y async solo sirven en CSS.'],
        capstone('Estado asincrono', 'Implementa async function fetchStatusLabel(statusPromise) que espere la promesa y devuelva "status:<valor>".', 'fetchStatusLabel', 'async function fetchStatusLabel(statusPromise) {\n  // espera la promesa y devuelve el texto final\n}\n', 'async function fetchStatusLabel(statusPromise) {\n  const status = await statusPromise;\n  return `status:${status}`;\n}\n', [{ label: 'OK', args: ['ok'], expected: 'status:ok' }, { label: 'Ready', args: ['ready'], expected: 'status:ready' }], 'await te permite escribir flujo asincrono con una sintaxis mas legible.'),
        [
          l('Que es asincronia', 'asincronia', 'La asincronia permite iniciar una tarea y continuar mientras esperas su resultado.', 'console.log("inicio");\nsetTimeout(() => console.log("fin"), 0);', 'console.log("inicio");\nconsole.log("fin");', 'inicio\nfin', 'const result = await Promise.resolve("ok");', 'async', 'await solo funciona dentro de una funcion async o en contextos permitidos.'),
          l('Callbacks', 'callback', 'Un callback es una funcion que entregas para que se ejecute despues.', 'runTask(() => console.log("done"));', 'const done = () => "ok";\nconsole.log(done());', 'ok', 'runTask(console.log("done"));', 'funcion', 'Debes pasar una funcion como callback y no ejecutar console.log al instante.'),
          l('Promises', 'Promise', 'Una Promise representa un resultado futuro que puede resolverse o fallar.', 'const task = Promise.resolve("ok");', 'Promise.resolve("ok").then((value) => console.log(value));', 'ok', 'const task = new Promise.resolve("ok");', 'Promise', 'Promise.resolve es un metodo estatico y no se usa con new.'),
          l('async await', 'await', 'async y await hacen mas claro el flujo asincrono que antes se escribia con then.', 'async function load() {\n  const value = await Promise.resolve("ok");\n  return value;\n}', 'async function load() { const value = await Promise.resolve("ok"); console.log(value); }\nload();', 'ok', 'function load() { const value = await Promise.resolve("ok"); }', 'async', 'Si usas await debes marcar la funcion como async.'),
          l('Manejo de errores async', 'try', 'El flujo asincrono tambien necesita try/catch para atrapar fallos de await.', 'async function load() {\n  try {\n    await Promise.reject(new Error("fail"));\n  } catch (error) {\n    console.log("fail");\n  }\n}', 'async function load() { try { await Promise.reject(new Error("fail")); } catch (error) { console.log("fail"); } }\nload();', 'fail', 'async function load() { await Promise.reject(new Error("fail")); catch (error) { console.log("fail"); } }', 'try', 'catch siempre debe ir unido a un bloque try valido.'),
        ]
      ),
      unit(
        'dom',
        'DOM (Frontend)',
        'Lees y cambias elementos de interfaz desde JavaScript.',
        ['El DOM solo existe dentro de MySQL.', 'Manipular el DOM significa reescribir el backend entero.'],
        capstone('Markup de lista', 'Implementa buildTodoMarkup(items) y devuelve un string HTML con cada item dentro de <li>...</li> unido sin separadores.', 'buildTodoMarkup', 'function buildTodoMarkup(items) {\n  // devuelve el markup final\n}\n', 'function buildTodoMarkup(items) {\n  return items.map((item) => `<li>${item}</li>`).join("");\n}\n', [{ label: 'Dos items', args: [['js', 'react']], expected: '<li>js</li><li>react</li>' }, { label: 'Vacio', args: [[]], expected: '' }], 'Aunque el DOM real vive en el navegador, puedes preparar markup como string de forma pura.'),
        [
          l('querySelector', 'querySelector', 'querySelector obtiene el primer elemento que coincide con un selector CSS.', 'const button = document.querySelector(".save-btn");', 'const selector = ".card";\nconsole.log(selector);', '.card', 'document.select(".save-btn");', 'querySelector', 'El metodo correcto para seleccionar un elemento es querySelector.'),
          l('Modificar contenido', 'textContent', 'Puedes cambiar texto visible de un nodo usando textContent o innerHTML con cuidado.', 'title.textContent = "Nuevo titulo";', 'const label = "Nuevo titulo";\nconsole.log(label);', 'Nuevo titulo', 'title.content = "Nuevo titulo";', 'textContent', 'Para texto simple la propiedad estandar es textContent.'),
          l('Eventos', 'addEventListener', 'Los eventos ejecutan una funcion cuando el usuario interactua con un elemento.', 'button.addEventListener("click", () => console.log("ok"));', 'const eventName = "click";\nconsole.log(eventName);', 'click', 'button.on("click", () => console.log("ok"));', 'addEventListener', 'En DOM moderno se usa addEventListener para registrar eventos.'),
          l('Formularios', 'submit', 'Los formularios disparan submit y puedes evitar su comportamiento por defecto.', 'form.addEventListener("submit", (event) => {\n  event.preventDefault();\n});', 'const action = "submit";\nconsole.log(action);', 'submit', 'form.addEventListener("submit", () => {\n  preventDefault();\n});', 'event', 'preventDefault pertenece al objeto event entregado al handler.'),
          l('Manipulacion dinamica', 'appendChild', 'Puedes crear nodos y agregarlos dinamicamente a la interfaz.', 'const item = document.createElement("li");\nlist.appendChild(item);', 'const method = "appendChild";\nconsole.log(method);', 'appendChild', 'list.addChild(item);', 'appendChild', 'El metodo tradicional para anexar un nodo hijo es appendChild.'),
        ]
      ),
      unit(
        'functional',
        'Programacion funcional',
        'Trabajas con transformaciones puras y composicion de funciones.',
        ['La programacion funcional exige eliminar todas las funciones.', 'Solo sirve para estilos visuales.'],
        capstone('Componer pipeline', 'Implementa composePipeline(value, steps). steps es un array de strings y puede incluir "trim", "upper" y "suffix-js". Debes aplicarlos en orden.', 'composePipeline', 'function composePipeline(value, steps) {\n  // aplica los pasos en secuencia\n}\n', 'function composePipeline(value, steps) {\n  return steps.reduce((current, step) => {\n    if (step === "trim") return current.trim();\n    if (step === "upper") return current.toUpperCase();\n    if (step === "suffix-js") return `${current}-js`;\n    return current;\n  }, value);\n}\n', [{ label: 'Trim y upper', args: ['  ok  ', ['trim', 'upper']], expected: 'OK' }, { label: 'Agregar sufijo', args: ['react', ['suffix-js']], expected: 'react-js' }], 'reduce permite encadenar transformaciones de manera declarativa.'),
        [
          l('Funciones puras', 'pura', 'Una funcion pura devuelve el mismo resultado para las mismas entradas y evita efectos externos.', 'function add(a, b) {\n  return a + b;\n}', 'function add(a, b) { return a + b; }\nconsole.log(add(2, 3));', '5', 'let total = 0;\nfunction add(value) { total += value; }', 'efecto', 'Modificar una variable externa crea un efecto secundario y deja de ser pura.'),
          l('Inmutabilidad', 'inmutable', 'La inmutabilidad evita modificar datos originales y prefiere crear nuevas versiones.', 'const next = [...values, 4];', 'const values = [1, 2];\nconst next = [...values, 3];\nconsole.log(values.length);', '2', 'const values = [1, 2];\nvalues.length = 0;', 'copia', 'Si buscas inmutabilidad debes trabajar sobre una copia y no vaciar el original.'),
          l('map y reduce', 'reduce', 'map transforma cada valor y reduce acumula todo en un unico resultado.', 'const total = [1, 2, 3].reduce((sum, value) => sum + value, 0);', 'const total = [1, 2, 3].reduce((sum, value) => sum + value, 0);\nconsole.log(total);', '6', 'const total = [1, 2, 3].reduce(sum + value, 0);', 'callback', 'reduce necesita un callback con acumulador y valor actual.'),
          l('Composicion', 'composicion', 'La composicion conecta funciones pequenas para resolver una tarea mayor.', 'const result = format(trim(input));', 'const trim = (value) => value.trim();\nconst upper = (value) => value.toUpperCase();\nconsole.log(upper(trim(" ok ")));', 'OK', 'const result = trim + upper;', 'funciones', 'La composicion trabaja aplicando funciones y no sumando referencias.'),
          l('Closures', 'closure', 'Un closure recuerda variables del scope donde fue creado incluso despues.', 'function createCounter() {\n  let count = 0;\n  return () => ++count;\n}', 'function createCounter() { let count = 0; return () => ++count; }\nconst next = createCounter();\nconsole.log(next());', '1', 'function createCounter() { return () => ++count; }', 'count', 'La variable capturada debe existir en el scope externo para que el closure la use.'),
        ]
      ),
      unit(
        'advanced-structures',
        'Estructuras avanzadas',
        'Trabajas con colecciones modernas y operadores utiles del lenguaje.',
        ['Set y Map son exactamente iguales que un numero.', 'Spread y rest solo sirven dentro de CSS.'],
        capstone('Unir etiquetas unicas', 'Implementa mergeUniqueTags(baseTags, incomingTags) y devuelve un array con etiquetas unicas manteniendo el orden de aparicion.', 'mergeUniqueTags', 'function mergeUniqueTags(baseTags, incomingTags) {\n  // devuelve un array sin repetidos\n}\n', 'function mergeUniqueTags(baseTags, incomingTags) {\n  return [...new Set([...baseTags, ...incomingTags])];\n}\n', [{ label: 'Con repetidos', args: [['js', 'react'], ['react', 'node']], expected: ['js', 'react', 'node'] }, { label: 'Sin nuevos', args: [['js'], []], expected: ['js'] }], 'Set ayuda a eliminar repetidos y spread a reconstruir el array final.'),
        [
          l('Set', 'Set', 'Set guarda valores unicos y evita repetidos automaticamente.', 'const tags = new Set(["js", "js", "react"]);', 'const tags = new Set(["js", "js", "react"]);\nconsole.log(tags.size);', '2', 'const tags = Set(["js"]);', 'new', 'Set es una clase y normalmente se instancia con new.'),
          l('Map', 'Map', 'Map guarda pares clave-valor donde la clave puede ser mas flexible que en un objeto.', 'const statusMap = new Map([["ok", 1]]);', 'const statusMap = new Map([["ok", 1]]);\nconsole.log(statusMap.get("ok"));', '1', 'const statusMap = new Map();\nstatusMap["ok"] = 1;', 'set', 'Con Map lo normal es usar set y get para trabajar sus claves.'),
          l('Iteradores', 'iterador', 'Los iteradores permiten consumir elementos uno a uno siguiendo un protocolo comun.', 'const iterator = [1, 2][Symbol.iterator]();', 'const iterator = [1, 2][Symbol.iterator]();\nconsole.log(iterator.next().value);', '1', 'const iterator = [1, 2].iterator();', 'Symbol.iterator', 'Para obtener el iterador nativo se usa Symbol.iterator.'),
          l('Spread operator', '...', 'Spread expande elementos de arrays u objetos dentro de otra estructura.', 'const all = [...a, ...b];', 'const values = [1, 2];\nconst next = [...values, 3];\nconsole.log(next.length);', '3', 'const next = ..values;', '...', 'El operador spread siempre usa tres puntos seguidos.'),
          l('Rest parameters', 'rest', 'Rest agrupa argumentos restantes en un array dentro de una funcion.', 'function sum(...values) {\n  return values.length;\n}', 'function count(...values) { return values.length; }\nconsole.log(count(1, 2, 3));', '3', 'function count(..values) { return values.length; }', '...', 'Los rest parameters tambien se escriben con tres puntos.'),
        ]
      ),
      unit(
        'best-practices',
        'Buenas practicas',
        'Ordenas codigo, depuras mejor y piensas en mantenimiento.',
        ['Las buenas practicas consisten solo en escribir codigo largo.', 'El debugging implica probar a ciegas.'],
        capstone('Reporte de modulos', 'Implementa createModuleReport(modules) y devuelve un objeto { total, active } donde active cuenta cuantos modulos tienen enabled en true.', 'createModuleReport', 'function createModuleReport(modules) {\n  // devuelve total y active\n}\n', 'function createModuleReport(modules) {\n  return {\n    total: modules.length,\n    active: modules.filter((module) => module.enabled).length,\n  };\n}\n', [{ label: 'Tres modulos', args: [[{ enabled: true }, { enabled: false }, { enabled: true }]], expected: { total: 3, active: 2 } }, { label: 'Vacio', args: [[]], expected: { total: 0, active: 0 } }], 'Una solucion simple y legible suele ser mejor que una compleja sin necesidad.'),
        [
          l('Clean code', 'legible', 'El clean code prioriza nombres claros, funciones pequenas y una lectura sencilla.', 'const activeUsers = users.filter((user) => user.active);', 'const title = "Codigo claro";\nconsole.log(title);', 'Codigo claro', 'const x = users.filter((user) => user.active);', 'nombre', 'Un nombre generico como x dificulta entender la intencion del codigo.'),
          l('Modularizacion', 'modulo', 'Modularizar separa responsabilidades para que cada archivo haga una sola cosa.', 'export function getUsers() {\n  return [];\n}', 'const file = "api/users.js";\nconsole.log(file);', 'api/users.js', 'function everything() {\n  // auth, ui, api, stats\n}', 'separar', 'Si una funcion hace de todo conviene separar responsabilidades en modulos.'),
          l('Debugging', 'debugging', 'Depurar es observar el estado real del programa y acotar donde aparece el fallo.', 'console.log({ value, type: typeof value });', 'const status = "debug";\nconsole.log(status);', 'debug', 'const result = getData();\nconsole.log(data);', 'variable', 'Estas imprimiendo data cuando la variable disponible se llama result.'),
          l('Performance basica', 'performance', 'La performance basica evita trabajo innecesario y repeticiones costosas.', 'const visible = items.filter((item) => item.visible);', 'const size = [1, 2, 3].length;\nconsole.log(size);', '3', 'for (let i = 0; i < list.length; i += 1) { console.log(list.length); }', 'cache', 'Si un valor se reutiliza mucho conviene guardarlo en una variable temporal.'),
          l('Organizacion de proyectos', 'estructura', 'Una buena estructura facilita encontrar codigo, pruebas y configuracion rapidamente.', 'src/\n  components/\n  services/\n  utils/', 'const folder = "src/components";\nconsole.log(folder);', 'src/components', 'const project = ["todo-junto-en-index.js"];', 'carpetas', 'Separar por carpetas y responsabilidades hace el proyecto mas mantenible.'),
        ]
      ),
    ],
  },
];

function buildExerciseId(topicId, suffix) {
  return `${topicId}-${suffix}`;
}

function sanitizeFunctionName(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((chunk, index) => (index === 0 ? chunk.toLowerCase() : chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase()))
    .join('');
}

function buildChoiceOptions(correctDetail, distractors) {
  return [
    { id: 'a', label: 'Opcion A', detail: correctDetail },
    { id: 'b', label: 'Opcion B', detail: distractors[0] },
    { id: 'c', label: 'Opcion C', detail: distractors[1] },
  ];
}

function buildLearningPrompt(lessonTitle, exerciseKind) {
  switch (exerciseKind) {
    case 'multiple-choice':
      return `Lee la idea principal de ${lessonTitle} y selecciona la opcion que mejor la describe.`;
    case 'completion':
      return `Mira el fragmento de ${lessonTitle} y escribe solo la palabra, operador o expresion que falta.`;
    case 'prediction':
      return `Observa el fragmento de ${lessonTitle} y responde exactamente que salida produce al ejecutarse.`;
    case 'debugging':
      return `Encuentra el error del fragmento de ${lessonTitle} y escribe la correccion principal para arreglarlo.`;
    default:
      return `Resuelve el reto de ${lessonTitle} editando la funcion hasta que pase las pruebas.`;
  }
}

function buildLearningInstructions(exerciseKind) {
  switch (exerciseKind) {
    case 'multiple-choice':
      return [
        'Lee la idea o el fragmento con calma.',
        'Compara las opciones y elige una sola respuesta.',
        'No escribas codigo en esta actividad.',
      ];
    case 'completion':
      return [
        'Observa el ejemplo o fragmento base.',
        'Identifica solo la pieza que falta.',
        'Escribe unicamente esa palabra, operador o expresion corta.',
      ];
    case 'prediction':
      return [
        'Sigue el flujo del codigo paso a paso.',
        'Piensa que valor llega realmente al resultado o al console.log.',
        'Escribe la salida exacta, sin explicacion extra.',
      ];
    case 'debugging':
      return [
        'Busca la palabra, simbolo o parte incorrecta del fragmento.',
        'Identifica la correccion minima necesaria para arreglarlo.',
        'Responde con la correccion principal, no con una explicacion larga.',
      ];
    default:
      return [
        'Lee el objetivo completo del reto.',
        'Edita la funcion manteniendo la estructura base.',
        'Prueba una solucion clara y valida el resultado.',
      ];
  }
}

function buildInputPlaceholder(exerciseKind) {
  switch (exerciseKind) {
    case 'completion':
      return 'Escribe solo la pieza faltante';
    case 'prediction':
      return 'Escribe la salida exacta';
    case 'debugging':
      return 'Escribe la correccion principal';
    default:
      return null;
  }
}

function createChoiceExercise(topicId, lessonSpec, currentUnit, sortOrder) {
  return {
    id: buildExerciseId(topicId, `choice-${sortOrder}`),
    title: `Chequeo conceptual · ${lessonSpec.title}`,
    prompt: buildLearningPrompt(lessonSpec.title, 'multiple-choice'),
    instructions: buildLearningInstructions('multiple-choice'),
    functionName: `select${sanitizeFunctionName(topicId)}Concept`,
    starterCode: 'function chooseConcept() {\n  // respuesta guiada por seleccion\n}\n',
    solutionCode: 'function chooseConcept() {\n  return "a";\n}\n',
    explanation: lessonSpec.statement,
    xpReward: 15,
    sortOrder,
    testCases: [{ label: 'Concepto correcto', args: [], expected: 'a' }],
    mode: 'choice',
    kind: 'multiple-choice',
    lessonTypeLabel: 'Seleccion',
    nodeGlyph: '?',
    choiceOptions: buildChoiceOptions(lessonSpec.statement, currentUnit.distractors),
    codeSnippet: null,
    inputPlaceholder: null,
  };
}

function createTextExercise(topicId, lessonSpec, exerciseKind, sortOrder) {
  const base = {
    functionName: `answer${sanitizeFunctionName(topicId)}${exerciseKind}`,
    starterCode: '',
    sortOrder,
    mode: 'text',
    choiceOptions: [],
  };

  if (exerciseKind === 'completion') {
    return {
      ...base,
      id: buildExerciseId(topicId, `completion-${sortOrder}`),
      title: `Completar idea · ${lessonSpec.title}`,
      prompt: buildLearningPrompt(lessonSpec.title, 'completion'),
      instructions: buildLearningInstructions('completion'),
      solutionCode: lessonSpec.token,
      explanation: `La respuesta esperada es ${lessonSpec.token} porque resume el concepto trabajado.`,
      xpReward: 15,
      testCases: [{ label: 'Palabra clave', args: [], expected: lessonSpec.token }],
      kind: 'completion',
      lessonTypeLabel: 'Completar',
      nodeGlyph: '_',
      codeSnippet: lessonSpec.exampleCode,
      inputPlaceholder: buildInputPlaceholder('completion'),
    };
  }

  if (exerciseKind === 'prediction') {
    return {
      ...base,
      id: buildExerciseId(topicId, `prediction-${sortOrder}`),
      title: `Prediccion · ${lessonSpec.title}`,
      prompt: buildLearningPrompt(lessonSpec.title, 'prediction'),
      instructions: buildLearningInstructions('prediction'),
      solutionCode: lessonSpec.predictionAnswer,
      explanation: 'La salida correcta depende del valor final impreso por el fragmento mostrado.',
      xpReward: 18,
      testCases: [{ label: 'Salida esperada', args: [], expected: lessonSpec.predictionAnswer }],
      kind: 'prediction',
      lessonTypeLabel: 'Prediccion',
      nodeGlyph: '>>',
      codeSnippet: lessonSpec.predictionCode,
      inputPlaceholder: buildInputPlaceholder('prediction'),
    };
  }

  return {
    ...base,
    id: buildExerciseId(topicId, `debug-${sortOrder}`),
    title: `Debugging · ${lessonSpec.title}`,
    prompt: buildLearningPrompt(lessonSpec.title, 'debugging'),
    instructions: buildLearningInstructions('debugging'),
    solutionCode: lessonSpec.debuggingAnswer,
    explanation: lessonSpec.debuggingHint,
    xpReward: 20,
    testCases: [{ label: 'Correccion esperada', args: [], expected: lessonSpec.debuggingAnswer }],
    kind: 'debugging',
    lessonTypeLabel: 'Debugging',
    nodeGlyph: '!!',
    codeSnippet: lessonSpec.debuggingCode,
    inputPlaceholder: buildInputPlaceholder('debugging'),
  };
}

function createCodeExercise(topicId, capstoneSpec, sortOrder) {
  return {
    id: buildExerciseId(topicId, `code-${sortOrder}`),
    title: capstoneSpec.title,
    prompt: capstoneSpec.prompt,
    instructions: buildLearningInstructions('code'),
    functionName: capstoneSpec.functionName,
    starterCode: capstoneSpec.starterCode,
    solutionCode: capstoneSpec.solutionCode,
    explanation: capstoneSpec.explanation,
    xpReward: 60,
    sortOrder,
    testCases: capstoneSpec.testCases,
    mode: 'code',
    kind: 'code',
    lessonTypeLabel: 'Codigo',
    nodeGlyph: 'fn',
    choiceOptions: [],
    codeSnippet: null,
    inputPlaceholder: null,
  };
}

function buildTopicsFromBlueprint() {
  const topics = [];
  let topicSortOrder = 1;

  for (const level of COURSE_BLUEPRINT) {
    level.units.forEach((currentUnit, unitIndex) => {
      currentUnit.lessons.forEach((lessonSpec, lessonIndex) => {
        const topicId = `js-${level.id}-u${unitIndex + 1}-l${lessonIndex + 1}`;
        const exercises = [
          createChoiceExercise(topicId, lessonSpec, currentUnit, 1),
          createTextExercise(topicId, lessonSpec, 'completion', 2),
          createTextExercise(topicId, lessonSpec, 'prediction', 3),
          createTextExercise(topicId, lessonSpec, 'debugging', 4),
        ];

        if (lessonIndex === currentUnit.lessons.length - 1) {
          exercises.push(createCodeExercise(topicId, currentUnit.capstone, 5));
        }

        topics.push({
          id: topicId,
          roadmapId: ROADMAP_ID,
          title: `Leccion ${lessonIndex + 1} · ${lessonSpec.title}`,
          description: lessonSpec.statement,
          estimatedMinutes: 14 + exercises.length * 3,
          status: 'Disponible',
          sortOrder: topicSortOrder++,
          languageId: LANGUAGE_ID,
          languageLabel: LANGUAGE_LABEL,
          levelId: level.id,
          level: level.label,
          levelNumber: level.levelNumber,
          levelObjective: level.objective,
          unitId: `js-${level.id}-u${unitIndex + 1}`,
          unitTitle: currentUnit.title,
          unitNumber: unitIndex + 1,
          lessonNumber: lessonIndex + 1,
          lessonGoal: lessonSpec.statement,
          stageNumber: level.levelNumber,
          stageBadge: level.badge,
          stageMessage: level.message,
          stageGoal: currentUnit.summary,
          stageAccent: COURSE_ACCENT,
          stageGlyph: level.glyph,
          exampleCode: lessonSpec.exampleCode,
          exercises,
        });
      });
    });
  }

  return topics;
}

function serializeChoiceSubmission(selectedOptionId) {
  return `choice:${selectedOptionId}`;
}

function serializeTextSubmission(answerText) {
  return `text:${String(answerText || '').trim()}`;
}

function buildSuccessfulSubmission(exercise) {
  if (exercise.mode === 'choice') return serializeChoiceSubmission('a');
  if (exercise.mode === 'text') return serializeTextSubmission(exercise.testCases[0]?.expected || '');
  return exercise.solutionCode;
}

function buildPartialSubmission(exercise) {
  if (exercise.mode === 'choice') return serializeChoiceSubmission('b');
  if (exercise.mode === 'text') return serializeTextSubmission('pendiente');
  return exercise.starterCode;
}

function hoursAgo(value) {
  return new Date(DEMO_NOW.getTime() - value * 60 * 60 * 1000).toISOString();
}

function buildUsers() {
  return [
    { id: 1, name: 'Admin Duocode', email: 'admin@duocode.dev', passwordHash: 'scrypt$16a7143145ec89d067ea10761c6a0143$2c224336efd06602fa02f163cd13fc9b6ac10778facdbc139f66eea39d045d8865ac52455e4e873d778845462d41d2236bfb6dde8f1be95206358332b3bddbad', role: 'admin', track: 'Program Oversight', focus: 'Metricas del curso, progresion editorial y seguimiento de estudiantes.', dailyGoalMinutes: 0, createdAt: '2026-04-01T09:00:00.000Z' },
    { id: 2, name: 'Jimmy Zambrana', email: 'student@duocode.dev', passwordHash: 'scrypt$2d3c760f34a4876a637274cea3c347a4$c8d04d915c05eab2d43d5075f24dab39e4702c0748e35248034612c90d3b0a335ce937c0471cd9ce84b992e8ae766bf3012217bd1c465516f4118c08e010c7dc', role: 'student', track: 'JavaScript Full Path', focus: 'Fundamentos, estructuras y laboratorio tecnico con feedback inmediato.', dailyGoalMinutes: 45, createdAt: '2026-04-02T10:15:00.000Z' },
    { id: 3, name: 'Ana API', email: 'ana@duocode.dev', passwordHash: 'scrypt$2d3c760f34a4876a637274cea3c347a4$c8d04d915c05eab2d43d5075f24dab39e4702c0748e35248034612c90d3b0a335ce937c0471cd9ce84b992e8ae766bf3012217bd1c465516f4118c08e010c7dc', role: 'student', track: 'JavaScript Practice Track', focus: 'Refuerzo de funciones, arrays y objetos con ejercicios cortos.', dailyGoalMinutes: 35, createdAt: '2026-04-03T12:45:00.000Z' },
  ];
}

function buildStudentHistory(topics, userId, completedLessonCount, partialLessonSolvedCount, baseHourOffset) {
  const progress = [];
  const attempts = [];
  let nextAttemptId = userId * 1000;
  let hourOffset = baseHourOffset;

  topics.slice().sort((left, right) => left.sortOrder - right.sortOrder).forEach((topic, topicIndex) => {
    const isCompletedTopic = topicIndex < completedLessonCount;
    const isPartialTopic = !isCompletedTopic && topicIndex === completedLessonCount;

    topic.exercises.forEach((exercise, exerciseIndex) => {
      if (!isCompletedTopic && (!isPartialTopic || exerciseIndex >= partialLessonSolvedCount)) return;

      const passed = isCompletedTopic || exerciseIndex < Math.max(0, partialLessonSolvedCount - 1);
      const submittedCode = passed ? buildSuccessfulSubmission(exercise) : buildPartialSubmission(exercise);
      const createdAt = hoursAgo(hourOffset);
      hourOffset -= 4;

      progress.push({
        userId,
        exerciseId: exercise.id,
        isCompleted: passed,
        bestScore: passed ? 100 : 50,
        lastSubmittedCode: submittedCode,
        updatedAt: createdAt,
        completedAt: passed ? createdAt : null,
      });

      attempts.push({
        id: nextAttemptId++,
        userId,
        exerciseId: exercise.id,
        submittedCode,
        passed,
        score: passed ? 100 : 50,
        consoleOutput: [],
        testResults: [],
        createdAt,
      });
    });
  });

  return { progress, attempts };
}

function buildLearningData() {
  const topics = buildTopicsFromBlueprint();
  const jimmyHistory = buildStudentHistory(topics, 2, 12, 2, 8);
  const anaHistory = buildStudentHistory(topics, 3, 6, 1, 36);

  return {
    users: buildUsers(),
    topics,
    progress: [...jimmyHistory.progress, ...anaHistory.progress],
    attempts: [...jimmyHistory.attempts, ...anaHistory.attempts],
  };
}

const fallbackLearningData = buildLearningData();

module.exports = {
  buildLearningData,
  fallbackLearningData,
};
