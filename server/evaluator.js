const util = require('util');
const vm = require('vm');

function normalizeValue(value) {
  return JSON.parse(JSON.stringify(value));
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

function evaluateExerciseSubmission(exercise, submittedCode) {
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
      ${submittedCode}
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
        if (typeof globalThis.__duocodeSolution !== 'function') {
          throw new Error('No se encontro la funcion ${exercise.functionName}');
        }

        globalThis.__duocodeResult = globalThis.__duocodeSolution(...globalThis.__duocodeArgs);
        `,
        { timeout: 1000 }
      );

      context.__duocodeArgs = testCase.args;
      invokeScript.runInContext(context, { timeout: 1000 });
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

module.exports = {
  evaluateExerciseSubmission,
};
