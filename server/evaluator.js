const util = require('util');
const vm = require('vm');

function stripAttemptModeEnvelope(submittedCode) {
  return String(submittedCode || '').replace(/^mode:(lesson|practice)\r?\n/, '');
}

function normalizeValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .toLowerCase();
}

function valuesEqual(left, right) {
  return JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));
}

function formatValue(value) {
  return util.inspect(value, {
    depth: 4,
    breakLength: 80,
  });
}

function extractChoiceSubmission(submittedCode) {
  const normalized = stripAttemptModeEnvelope(submittedCode).trim();
  return normalized.startsWith('choice:') ? normalized.slice('choice:'.length) : normalized;
}

function extractTextSubmission(submittedCode) {
  const normalized = stripAttemptModeEnvelope(submittedCode).trim();
  return normalized.startsWith('text:') ? normalized.slice('text:'.length) : normalized;
}

function evaluateChoiceExercise(exercise, submittedCode) {
  const expected = String(exercise.testCases[0]?.expected || '').trim();
  const received = extractChoiceSubmission(submittedCode);
  const passed = received === expected;

  return {
    passed,
    score: passed ? 100 : 0,
    previewResult: received || 'Sin seleccion',
    consoleOutput: [],
    tests: [
      {
        label: exercise.testCases[0]?.label || 'Respuesta correcta',
        pass: passed,
        argsPreview: '[]',
        expectedPreview: expected,
        receivedPreview: received || 'Sin seleccion',
        consoleOutput: [],
      },
    ],
    correctSolution: exercise.solutionCode,
    explanation: exercise.explanation,
  };
}

function evaluateTextExercise(exercise, submittedCode) {
  const expected = String(exercise.testCases[0]?.expected || '').trim();
  const received = extractTextSubmission(submittedCode);
  const passed = normalizeText(received) === normalizeText(expected);

  return {
    passed,
    score: passed ? 100 : 0,
    previewResult: received || 'Sin respuesta',
    consoleOutput: [],
    tests: [
      {
        label: exercise.testCases[0]?.label || 'Respuesta esperada',
        pass: passed,
        argsPreview: '[]',
        expectedPreview: expected,
        receivedPreview: received || 'Sin respuesta',
        consoleOutput: [],
      },
    ],
    correctSolution: exercise.solutionCode,
    explanation: exercise.explanation,
  };
}

async function evaluateCodeExercise(exercise, submittedCode) {
  const normalizedCode = stripAttemptModeEnvelope(submittedCode);
  const tests = [];
  let passCount = 0;

  for (const testCase of exercise.testCases) {
    const consoleOutput = [];
    const sandbox = {
      module: { exports: {} },
      exports: {},
      console: {
        log: (...values) => {
          consoleOutput.push(values.map((value) => formatValue(value)).join(' '));
        },
      },
    };

    const context = vm.createContext(sandbox);
    const loadScript = new vm.Script(
      `
      "use strict";
      ${normalizedCode}
      globalThis.__duocodeSolution =
        typeof ${exercise.functionName} === 'function'
          ? ${exercise.functionName}
          : typeof module.exports === 'function'
            ? module.exports
            : typeof module.exports?.${exercise.functionName} === 'function'
              ? module.exports.${exercise.functionName}
              : null;
      `,
      { timeout: 1000 }
    );

    let received;
    let runtimeError = null;

    try {
      loadScript.runInContext(context, { timeout: 1000 });

      const invokeScript = new vm.Script(
        `
        (async () => {
          if (typeof globalThis.__duocodeSolution !== 'function') {
            throw new Error('No se encontro la funcion ${exercise.functionName}');
          }

          globalThis.__duocodeResult = await globalThis.__duocodeSolution(...globalThis.__duocodeArgs);
        })()
        `,
        { timeout: 1000 }
      );

      context.__duocodeArgs = testCase.args;
      await invokeScript.runInContext(context, { timeout: 1000 });
      received = context.__duocodeResult;
    } catch (error) {
      runtimeError = error instanceof Error ? error.message : 'Error desconocido';
    }

    const passed = runtimeError ? false : valuesEqual(received, testCase.expected);

    if (passed) {
      passCount += 1;
    }

    tests.push({
      label: testCase.label,
      pass: passed,
      argsPreview: formatValue(testCase.args),
      expectedPreview: formatValue(testCase.expected),
      receivedPreview: runtimeError ? runtimeError : formatValue(received),
      consoleOutput,
    });
  }

  const score = Math.round((passCount / exercise.testCases.length) * 100);

  return {
    passed: passCount === exercise.testCases.length,
    score,
    previewResult: tests[0]?.receivedPreview ?? '',
    consoleOutput: tests.flatMap((test) => test.consoleOutput),
    tests,
    correctSolution: exercise.solutionCode,
    explanation: exercise.explanation,
  };
}

async function evaluateExerciseSubmission(exercise, submittedCode) {
  if (exercise.mode === 'choice') {
    return evaluateChoiceExercise(exercise, submittedCode);
  }

  if (exercise.mode === 'text') {
    return evaluateTextExercise(exercise, submittedCode);
  }

  return evaluateCodeExercise(exercise, submittedCode);
}

module.exports = {
  evaluateExerciseSubmission,
};
