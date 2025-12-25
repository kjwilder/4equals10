const TOLERANCE = 1e-9;
const DEFAULT_OPERATORS = ['+', '-', '*', '/'];

const digitsInput = document.getElementById('digitsInput');
const digitCountInput = document.getElementById('digitCount');
const targetInput = document.getElementById('targetSum');
const operatorInputs = Array.from(document.querySelectorAll('.operator'));
const allowReorderInput = document.getElementById('allowReorder');
const allowParenthesesInput = document.getElementById('allowParentheses');
const solveButton = document.getElementById('solveButton');
const newGameButton = document.getElementById('newGame');
const userSolutionInput = document.getElementById('userSolution');
const checkSolutionButton = document.getElementById('checkSolution');
const userFeedback = document.getElementById('userFeedback');

function approxEqual(a, b) {
  return Math.abs(a - b) < TOLERANCE;
}

function parseDigits(raw) {
  const cleaned = (raw || '').replace(/\D/g, '');
  return cleaned.split('').filter(Boolean).map((d) => Number(d));
}

function uniquePermutations(nums) {
  const used = Array(nums.length).fill(false);
  const results = [];
  const current = [];
  const seen = new Set();

  function backtrack() {
    if (current.length === nums.length) {
      const key = current.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        results.push([...current]);
      }
      return;
    }

    for (let i = 0; i < nums.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      current.push(nums[i]);
      backtrack();
      current.pop();
      used[i] = false;
    }
  }

  backtrack();
  return results;
}

function generateOperatorSequences(operators, length) {
  const results = [];
  const sequence = [];

  function build(depth) {
    if (depth === length) {
      results.push([...sequence]);
      return;
    }
    operators.forEach((op) => {
      sequence.push(op);
      build(depth + 1);
      sequence.pop();
    });
  }

  build(0);
  return results;
}

function applyOp(a, b, op) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  if (op === '/') return b === 0 ? null : a / b;
  return null;
}

function evaluateLinear(numbers, operators) {
  const values = [numbers[0]];
  const opStack = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

  function reduce() {
    const op = opStack.pop();
    const b = values.pop();
    const a = values.pop();
    const res = applyOp(a, b, op);
    if (res === null || Number.isNaN(res)) return false;
    values.push(res);
    return true;
  }

  for (let i = 0; i < operators.length; i += 1) {
    const currentOp = operators[i];
    while (opStack.length && precedence[opStack[opStack.length - 1]] >= precedence[currentOp]) {
      if (!reduce()) return null;
    }
    opStack.push(currentOp);
    values.push(numbers[i + 1]);
  }

  while (opStack.length) {
    if (!reduce()) return null;
  }

  return values[0];
}

function enumerateExpressions(values, texts, operators, memo) {
  if (values.length === 1) {
    return [{ value: values[0], expr: texts[0] }];
  }

  const key = values.join(',');
  if (memo.has(key)) return memo.get(key);

  const results = [];
  for (let i = 1; i < values.length; i += 1) {
    const leftVals = values.slice(0, i);
    const rightVals = values.slice(i);
    const leftTexts = texts.slice(0, i);
    const rightTexts = texts.slice(i);

    const leftResults = enumerateExpressions(leftVals, leftTexts, operators, memo);
    const rightResults = enumerateExpressions(rightVals, rightTexts, operators, memo);

    leftResults.forEach((l) => {
      rightResults.forEach((r) => {
        operators.forEach((op) => {
          if (op === '/' && Math.abs(r.value) < TOLERANCE) return;
          const val = applyOp(l.value, r.value, op);
          if (val === null || Number.isNaN(val)) return;
          const expr = `(${l.expr} ${op} ${r.expr})`;
          results.push({ value: val, expr });
        });
      });
    });
  }

  memo.set(key, results);
  return results;
}

function isFullyWrapped(expr) {
  if (!expr.startsWith('(') || !expr.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (depth === 0 && i < expr.length - 1) return false;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function stripOuterParens(expression) {
  const expr = expression.trim();
  return isFullyWrapped(expr) ? expr.slice(1, -1).trim() : expr;
}

function solveWithParentheses(digits, operators, target) {
  const values = digits.map(Number);
  const texts = digits.map(String);
  const memo = new Map();
  const expressions = enumerateExpressions(values, texts, operators, memo);
  const match = expressions.find((item) => approxEqual(item.value, target));
  return match ? stripOuterParens(match.expr) : null;
}

function solveWithoutParentheses(digits, operators, target) {
  const operatorSequences = generateOperatorSequences(operators, digits.length - 1);
  for (const sequence of operatorSequences) {
    const value = evaluateLinear(digits, sequence);
    if (value === null || Number.isNaN(value)) continue;
    if (approxEqual(value, target)) {
      const expr = digits
        .map(String)
        .reduce((acc, cur, idx) => (idx === 0 ? cur : `${acc} ${sequence[idx - 1]} ${cur}`), '');
      return expr;
    }
  }
  return null;
}

function solvePuzzle({ digits, target, operators, allowReorder, allowParentheses }) {
  const puzzles = allowReorder ? uniquePermutations(digits) : [digits];
  for (const perm of puzzles) {
    if (allowParentheses) {
      const expr = solveWithParentheses(perm, operators, target);
      if (expr) return expr;
    } else {
      const expr = solveWithoutParentheses(perm, operators, target);
      if (expr) return expr;
    }
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
  const target = 10;
  const operators = DEFAULT_OPERATORS;
  const limit = 800;
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
  const count = Number(digitCountInput.value);
  const digits = generateSolvableDigits(count);
  digitsInput.value = digits.join('');
  if (userSolutionInput) userSolutionInput.value = '';
  if (userFeedback) userFeedback.textContent = '';
}

function validateUserSolution() {
  const expression = (userSolutionInput?.value ?? '').trim();
  if (!expression) {
    userFeedback.textContent = 'Enter an expression to check.';
    userFeedback.classList.remove('status--success');
    return;
  }

  const digits = parseDigits(digitsInput.value);
  const target = Number(targetInput.value);
  const operators = currentOperators();
  const allowReorder = allowReorderInput.checked;
  const allowParentheses = allowParenthesesInput.checked;

  const invalidChars = /[^0-9+*\\/()\s-]/;
  if (invalidChars.test(expression)) {
    userFeedback.textContent = 'Only digits, operators, and parentheses are allowed.';
    userFeedback.classList.remove('status--success');
    return;
  }

  if (!allowParentheses && /[()]/.test(expression)) {
    userFeedback.textContent = 'Parentheses are not allowed for this puzzle.';
    userFeedback.classList.remove('status--success');
    return;
  }

  const usedOps = expression.match(/[+*/-]/g) || [];
  if (!usedOps.every((op) => operators.includes(op))) {
    userFeedback.textContent = 'You used an operator that is not allowed.';
    userFeedback.classList.remove('status--success');
    return;
  }

  const numberTokens = expression.match(/\d+/g) || [];
  if (!numberTokens.every((token) => token.length === 1)) {
    userFeedback.textContent = 'Use the provided single-digit numbers only.';
    userFeedback.classList.remove('status--success');
    return;
  }

  if (numberTokens.length !== digits.length) {
    userFeedback.textContent = 'Use all digits exactly once.';
    userFeedback.classList.remove('status--success');
    return;
  }

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
        userFeedback.textContent = 'Digits do not match the puzzle.';
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
    // eslint-disable-next-line no-new-func
    result = Function(`\"use strict\"; return (${expression});`)();
  } catch (error) {
    userFeedback.textContent = 'Invalid expression. Please check your syntax.';
    userFeedback.classList.remove('status--success');
    return;
  }

  if (result === null || Number.isNaN(result) || !Number.isFinite(result)) {
    userFeedback.textContent = 'The expression is not valid to evaluate.';
    userFeedback.classList.remove('status--success');
    return;
  }

  if (approxEqual(result, target)) {
    userFeedback.textContent = `Correct! ${expression} equals ${target}.`;
    userFeedback.classList.add('status--success');
  } else {
    userFeedback.textContent = `Not quite. ${expression} equals ${result}.`;
    userFeedback.classList.remove('status--success');
  }
}

function init() {
  digitCountInput.addEventListener('change', adjustDigitInputLength);
  solveButton.addEventListener('click', handleSolve);
  newGameButton.addEventListener('click', handleNewGame);
  if (checkSolutionButton) {
    checkSolutionButton.addEventListener('click', validateUserSolution);
  }
  handleNewGame();
}

init();
