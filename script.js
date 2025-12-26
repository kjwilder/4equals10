const TOLERANCE = 1e-9;
const DEFAULT_OPERATORS = ['+', '-', '*', '/'];

const digitsInput = document.getElementById('digitsInput');
const digitCountInput = document.getElementById('digitCount');
const targetInput = document.getElementById('targetSum');
const operatorInputs = Array.from(document.querySelectorAll('.operator'));
const allowReorderInput = document.getElementById('allowReorder');
const allowParenthesesInput = document.getElementById('allowParentheses');
const solveButton = document.getElementById('solveButton');
const refreshDigitsButton = document.getElementById('refreshDigits');
const userSolutionInput = document.getElementById('userSolution');
const checkSolutionButton = document.getElementById('checkSolution');
const userFeedback = document.getElementById('userFeedback');

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
  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = message;
  userFeedback.textContent = message;

  if (expression) {
    const exprEl = document.createElement('div');
    exprEl.className = 'solution__expression';
    exprEl.textContent = expression;
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
    showSolutionMessage('Solution found', expression);
  } else {
    showSolutionMessage('No solution with the selected rules.');
  }
}

function handleNewGame() {
  if (userSolutionInput) userSolutionInput.value = '';
  if (userFeedback) userFeedback.textContent = '';
  const count = Number(digitCountInput.value);
  const digits = generateSolvableDigits(count);
  digitsInput.value = digits.join('');
}

function validateUserSolution() {
  const expression = (userSolutionInput?.value ?? '').trim();
  if (!expression) {
    userFeedback.textContent = 'Enter an expression to check.';
    userFeedback.classList.remove('status--success');
    return;
  }

  const invalidChars = /[^0-9+*\\/()\s-]/;
  if (invalidChars.test(expression)) {
    userFeedback.textContent = 'Use only digits, operators and parentheses.';
    userFeedback.classList.remove('status--success');
    return;
  }

  const allowParentheses = allowParenthesesInput.checked;
  if (!allowParentheses && /[()]/.test(expression)) {
    userFeedback.textContent = 'Parentheses currently are not allowed.';
    userFeedback.classList.remove('status--success');
    return;
  }

  if (allowParentheses) {
    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      userFeedback.textContent = 'Mismatched parentheses detected.';
      userFeedback.classList.remove('status--success');
      return;
    }
    if (openParens > 1) {
      userFeedback.textContent = 'Only one pair of parentheses is allowed.';
      userFeedback.classList.remove('status--success');
      return;
    }
    if (openParens === 1 && expression.indexOf(')') < expression.indexOf('(')) {
      userFeedback.textContent = 'Closing parenthesis appears before opening.';
      userFeedback.classList.remove('status--success');
      return;
    }
  }

  const usedOps = expression.match(/[+*/-]/g) || [];
  const operators = currentOperators();
  if (!usedOps.every((op) => operators.includes(op))) {
    userFeedback.textContent = 'You only the specified operators.';
    userFeedback.classList.remove('status--success');
    return;
  }

  const numberTokens = expression.match(/\d+/g) || [];
  if (!numberTokens.every((token) => token.length === 1)) {
    userFeedback.textContent = 'Use only the specified digits.';
    userFeedback.classList.remove('status--success');
    return;
  }

  const digits = parseDigits(digitsInput.value);
  if (numberTokens.length !== digits.length) {
    userFeedback.textContent = 'Use each digit exactly once.';
    userFeedback.classList.remove('status--success');
    return;
  }

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
    for (const [digit, count] of Object.entries(expectedCounts)) {
      if (actualCounts[digit] !== count) {
        userFeedback.textContent = 'Use only the specified digits.';
        userFeedback.classList.remove('status--success');
        return;
      }
    }
  } else {
    const expected = digits.join('');
    if (numberTokens.join('') !== expected) {
      userFeedback.textContent = 'Digits must be used in the given order.';
      userFeedback.classList.remove('status--success');
      return;
    }
  }

  let result;
  try {
    result = evaluateEquation(expression);
  } catch (error) {
    userFeedback.textContent = 'Invalid expression. Please check your syntax.';
    userFeedback.classList.remove('status--success');
    return;
  }

  if (result === null || Number.isNaN(result) || !Number.isFinite(result)) {
    userFeedback.textContent = 'The expression does not evaluate to a number.';
    userFeedback.classList.remove('status--success');
    return;
  }

  const target = Number(targetInput.value);
  if (approxEqual(result, target)) {
    userFeedback.textContent = `Correct! ${expression} equals ${target}.`;
    userFeedback.classList.add('status--success');
  } else {
    userFeedback.textContent = `Incorrect! ${expression} equals ${result} not ${target}.`;
    userFeedback.classList.remove('status--success');
  }
}

function init() {
  digitCountInput.addEventListener('change', adjustDigitInputLength);
  solveButton.addEventListener('click', handleSolve);
  refreshDigitsButton.addEventListener('click', handleNewGame);
  if (checkSolutionButton) {
    checkSolutionButton.addEventListener('click', validateUserSolution);
  }
  handleNewGame();
}

init();
