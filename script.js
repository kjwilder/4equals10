const TOLERANCE = 1e-9;
const DEFAULT_OPERATORS = ['+', '-', '*', '/'];

const digitsInput = document.getElementById('digitsInput');
const digitCountInput = document.getElementById('digitCount');
const targetInput = document.getElementById('targetSum');
const operatorInputs = Array.from(document.querySelectorAll('.operator'));
const allowReorderInput = document.getElementById('allowReorder');
const allowParenthesesInput = document.getElementById('allowParentheses');
const solveIconButton = document.getElementById('solveIcon');
const refreshDigitsButton = document.getElementById('refreshDigits');
const userSolutionInput = document.getElementById('userSolution');
const userFeedback = document.getElementById('userFeedback');
const SOLUTION_STATES = {
  correct: 'correct',
  incorrect: 'incorrect',
  waiting: 'waiting',
  neutral: 'neutral',
};

let pendingValidationToken = 0;
let pendingValidationTimeout = null;
let lastSolutionDigitCount = 0;

function approxEqual(a, b) {
  if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b)) {
    return false;
  }
  return Math.abs(a - b) < TOLERANCE;
}

function parseDigits(raw) {
  const cleaned = (raw || '').replace(/\D/g, '');
  return cleaned.split('').filter(Boolean).map((d) => Number(d));
}

function* uniquePermutations(input, includePerms = true) {
  const original = input.slice();
  yield original.slice();

  if (!includePerms) return;

  const arr = [...input].sort();
  const used = new Array(arr.length).fill(false);
  const perm = [];

  let skippedOriginal = false;

  function* backtrack() {
    if (perm.length === arr.length) {
      if (
        !skippedOriginal &&
        perm.every((v, i) => v === original[i])
      ) {
        skippedOriginal = true;
        return;
      }

      yield perm.slice();
      return;
    }

    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue;
      if (i > 0 && arr[i] === arr[i - 1] && !used[i - 1]) continue;

      used[i] = true;
      perm.push(arr[i]);

      yield* backtrack();

      perm.pop();
      used[i] = false;
    }
  }

  yield* backtrack();
}

function* candidateOperations(operators, l) {
  if (!Number.isInteger(l) || l < 0) throw new Error("l must be a non-negative integer");
  if (l === 0) { yield []; return; }

  const n = operators.length;
  if (n === 0) return; // no tuples if l>0 and no operators

  const idx = Array(l).fill(0);
  while (true) {
    yield idx.map(i => operators[i]);

    // increment base-n number stored in idx (right-to-left)
    let pos = l - 1;
    while (pos >= 0) {
      idx[pos]++;
      if (idx[pos] < n) break;
      idx[pos] = 0;
      pos--;
    }
    if (pos < 0) return; // overflow => done
  }
}

function evaluateEquation(eq) {
  return Function(`\"use strict\"; return (${eq});`)();
}

function buildTokens(digits, ops) {
  const tokens = [];
  for (let i = 0; i < digits.length; i += 1) {
    tokens.push(String(digits[i]));
    if (i < ops.length) tokens.push(ops[i]);
  }
  return tokens;
}

function tokensToExpression(tokens) {
  return tokens.join(' ');
}

function evaluateTokens(tokens) {
  return evaluateEquation(tokensToExpression(tokens));
}

function solveWithSingleParentheses(digits, operators, target, allowParentheses) {
  const opCount = digits.length - 1;
  for (const ops of candidateOperations(operators, opCount)) {
    const baseTokens = buildTokens(digits, ops);
    if (approxEqual(evaluateTokens(baseTokens), target)) {
      return tokensToExpression(baseTokens);
    }

    if (!allowParentheses) continue;

    const tokenCount = baseTokens.length;
    for (let gap = 4; gap < tokenCount; gap += 2) {
      for (let start = 0; start <= tokenCount + 1 - gap; start += 2) {
        const endExclusive = start + gap;
        const candidate = baseTokens.slice();
        candidate.splice(start, 0, '(');
        candidate.splice(endExclusive, 0, ')');
        if (approxEqual(evaluateTokens(candidate), target)) {
          return tokensToExpression(candidate);
        }
      }
    }
  }
  return null;
}

function solvePuzzle({ digits, target, operators, allowReorder, allowParentheses }) {
  for (const perm of uniquePermutations(digits, allowReorder)) {
    const expr = solveWithSingleParentheses(perm, operators, target, allowParentheses);
    if (expr) return expr;
  }
  return null;
}

function showSolutionMessage(message, expression) {
  userFeedback.textContent = message;
  if (expression && userSolutionInput) {
    userSolutionInput.value = expression;
  }
}

function currentOperators() {
  return operatorInputs.filter((input) => input.checked).map((input) => input.value);
}

function adjustDigitInputLength() {
  const desired = Number(digitCountInput.value);
  let value = digitsInput.value.replace(/\D/g, '');
  if (value.length > desired) {
    value = value.slice(0, desired);
  } else {
    while (value.length < desired) {
      value += Math.floor(Math.random() * 10);
    }
  }
  digitsInput.value = value;
}

function generateSolvableDigits(count) {
  const target = Number(targetInput.value);
  const operators = DEFAULT_OPERATORS;
  const limit = 1000;
  for (let i = 0; i < limit; i += 1) {
    const digits = Array.from({ length: count }, () => Math.floor(Math.random() * 10));
    const expr = solvePuzzle({
      digits,
      target,
      operators,
      allowReorder: true,
      allowParentheses: true,
    });
    if (expr) return digits;
  }
  const fallback = '1234'.split('').map(Number);
  userFeedback.textContent = 'Unable to produce a solvable puzzle';
  userFeedback.classList.remove('status--success');
  while (fallback.length < count) fallback.push(Math.floor(Math.random() * 10));
  return fallback.slice(0, count);
}

function handleSolve() {
  const target = Number(targetInput.value);
  const digits = parseDigits(digitsInput.value);
  const desiredLength = Number(digitCountInput.value);
  const operators = currentOperators();

  if (!Number.isFinite(target)) {
    showSolutionMessage('Please provide a valid target sum.');
    return;
  }

  if (!operators.length) {
    showSolutionMessage('Select at least one operator.');
    return;
  }

  if (digits.length !== desiredLength) {
    showSolutionMessage(`Digit count mismatch. Expected ${desiredLength} digit(s).`);
    return;
  }

  const allowReorder = allowReorderInput.checked;
  const allowParentheses = allowParenthesesInput.checked;

  const expression = solvePuzzle({ digits, target, operators, allowReorder, allowParentheses });

  if (expression) {
    showSolutionMessage('Solution found!', expression);
    applySolutionState(SOLUTION_STATES.correct, 'Solution found!');
  } else {
    showSolutionMessage('No solution with the selected rules.');
    applySolutionState(SOLUTION_STATES.neutral, 'No solution with the selected rules.');
  }
}

function handleNewGame() {
  if (userSolutionInput) userSolutionInput.value = '';
  if (userFeedback) userFeedback.textContent = '';
  if (userSolutionInput) {
    userSolutionInput.classList.remove(
      'solution-input--correct',
      'solution-input--incorrect',
      'solution-input--waiting',
    );
  }
  lastSolutionDigitCount = 0;
  const count = Number(digitCountInput.value);
  const digits = generateSolvableDigits(count);
  digitsInput.value = digits.join('');
}

function applySolutionState(state, message) {
  if (!userFeedback || !userSolutionInput) return;
  userFeedback.textContent = message || '';
  userSolutionInput.classList.remove(
    'solution-input--correct',
    'solution-input--incorrect',
    'solution-input--waiting',
  );
  if (state === SOLUTION_STATES.correct) {
    userSolutionInput.classList.add('solution-input--correct');
  } else if (state === SOLUTION_STATES.waiting) {
    userSolutionInput.classList.add('solution-input--waiting');
  } else if (state === SOLUTION_STATES.incorrect) {
    userSolutionInput.classList.add('solution-input--incorrect');
  }
}

function validateUserSolution() {
  const expression = (userSolutionInput?.value ?? '').trim();
  if (!expression) {
    applySolutionState(SOLUTION_STATES.neutral, '');
    return;
  }

  const invalidChars = /[^0-9+*\\/()\s-]/;
  if (invalidChars.test(expression)) {
    applySolutionState(SOLUTION_STATES.incorrect, 'Use only digits, operators and parentheses.');
    return;
  }

  const allowParentheses = allowParenthesesInput.checked;
  if (!allowParentheses && /[()]/.test(expression)) {
    applySolutionState(SOLUTION_STATES.incorrect, 'Parentheses currently are not allowed.');
    return;
  }

  if (allowParentheses) {
    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      applySolutionState(SOLUTION_STATES.incorrect, 'Mismatched parentheses detected.');
      return;
    }
    if (openParens > 1) {
      applySolutionState(SOLUTION_STATES.incorrect, 'Only one pair of parentheses is allowed.');
      return;
    }
    if (openParens === 1 && expression.indexOf(')') < expression.indexOf('(')) {
      applySolutionState(SOLUTION_STATES.incorrect, 'Closing parenthesis appears before opening.');
      return;
    }
  }

  const usedOps = expression.match(/[+*/-]/g) || [];
  const operators = currentOperators();
  if (!usedOps.every((op) => operators.includes(op))) {
    applySolutionState(SOLUTION_STATES.incorrect, 'Use only the specified operators.');
    return;
  }

  const numberTokens = expression.match(/\d+/g) || [];
  if (!numberTokens.every((token) => token.length === 1)) {
    applySolutionState(SOLUTION_STATES.incorrect, 'Use only the specified digits.');
    return;
  }

  const digits = parseDigits(digitsInput.value);
  const allowReorder = allowReorderInput.checked;
  if (allowReorder) {
    const expectedCounts = digits.reduce((map, d) => {
      map[d] = (map[d] || 0) + 1;
      return map;
    }, {});
    const actualCounts = numberTokens.reduce((map, token) => {
      const d = Number(token);
      map[d] = (map[d] || 0) + 1;
      return map;
    }, {});
    for (const digit of Object.keys(actualCounts)) {
      if (!expectedCounts[digit]) {
        applySolutionState(SOLUTION_STATES.incorrect, 'Use only the specified digits.');
        return;
      }
    }
    for (const [digit, count] of Object.entries(expectedCounts)) {
      if (actualCounts[digit] > count) {
        applySolutionState(SOLUTION_STATES.incorrect, 'Use only the specified digits.');
        return;
      }
    }
  } else {
    const expected = digits.join('');
    if (expected.indexOf(numberTokens.join('')) !== 0) {
      applySolutionState(SOLUTION_STATES.incorrect, 'Digits must be used in the given order.');
      return;
    }
  }

  if (numberTokens.length < digits.length) {
    applySolutionState(SOLUTION_STATES.waiting, 'Waiting for input.');
    return;
  }

  if (numberTokens.length !== digits.length) {
    applySolutionState(SOLUTION_STATES.incorrect, 'Use each digit exactly once.');
    return;
  }

  let result;
  try {
    result = evaluateEquation(expression);
  } catch (error) {
    applySolutionState(SOLUTION_STATES.incorrect, 'Invalid expression. Please check your syntax.');
    return;
  }

  if (result === null || Number.isNaN(result) || !Number.isFinite(result)) {
    applySolutionState(SOLUTION_STATES.incorrect, 'The expression does not evaluate to a number.');
    return;
  }

  const target = Number(targetInput.value);
  if (approxEqual(result, target)) {
    applySolutionState(SOLUTION_STATES.correct, 'Correct!');
  } else {
    applySolutionState(
      SOLUTION_STATES.incorrect,
      `Incorrect! ${expression} equals ${result} not ${target}.`,
    );
  }
}

function scheduleSolutionValidation() {
  pendingValidationToken += 1;
  const token = pendingValidationToken;
  if (pendingValidationTimeout) clearTimeout(pendingValidationTimeout);
  pendingValidationTimeout = setTimeout(() => {
    if (token !== pendingValidationToken) return;
    validateUserSolution();
  }, 0);
}

function handleSolutionInput(event) {
  const value = event?.target?.value ?? '';
  const digitCount = (value.match(/\d/g) || []).length;
  scheduleSolutionValidation();
  lastSolutionDigitCount = digitCount;
}

function handleRuleChange() {
  scheduleSolutionValidation();
}

function init() {
  digitCountInput.addEventListener('change', adjustDigitInputLength);
  digitCountInput.addEventListener('change', handleRuleChange);
  targetInput.addEventListener('input', handleRuleChange);
  digitsInput.addEventListener('input', handleRuleChange);
  allowReorderInput.addEventListener('change', handleRuleChange);
  allowParenthesesInput.addEventListener('change', handleRuleChange);
  operatorInputs.forEach((input) => input.addEventListener('change', handleRuleChange));
  solveIconButton.addEventListener('click', handleSolve);
  refreshDigitsButton.addEventListener('click', handleNewGame);
  if (userSolutionInput) {
    userSolutionInput.addEventListener('input', handleSolutionInput);
  }
  handleNewGame();
}

init();
