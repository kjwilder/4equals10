// =============================================================================
// Constants
// =============================================================================

const TOLERANCE = 1e-9;
const DEFAULT_OPERATORS = ['+', '-', '*', '/'];
const MIN_PARENTHESES_GAP = 4; // Minimum gap between ( and ) positions in token list
const PUZZLE_GENERATION_LIMIT = 1000; // Max attempts to generate a solvable puzzle
const FALLBACK_DIGITS = [1, 2, 3, 4]; // Default digits if puzzle generation fails

const SOLUTION_STATES = {
  correct: 'correct',
  incorrect: 'incorrect',
  waiting: 'waiting',
  neutral: 'neutral',
};

// =============================================================================
// DOM Elements
// =============================================================================

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

// =============================================================================
// Validation State
// =============================================================================

let pendingValidationToken = 0;
let pendingValidationTimeout = null;

// =============================================================================
// Utility Functions
// =============================================================================

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

// =============================================================================
// Permutation Generator
// =============================================================================

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

// =============================================================================
// Operator Combination Generator
// =============================================================================

function* candidateOperations(operators, l) {
  if (!Number.isInteger(l) || l < 0) throw new Error("l must be a non-negative integer");
  if (l === 0) { yield []; return; }

  const n = operators.length;
  if (n === 0) return;

  const idx = Array(l).fill(0);
  while (true) {
    yield idx.map(i => operators[i]);

    let pos = l - 1;
    while (pos >= 0) {
      idx[pos]++;
      if (idx[pos] < n) break;
      idx[pos] = 0;
      pos--;
    }
    if (pos < 0) return;
  }
}

// =============================================================================
// Expression Evaluation
// =============================================================================

/**
 * Evaluates an arithmetic expression string.
 *
 * Security Note: This function uses Function() to evaluate expressions.
 * While Function() is safer than eval() (no access to local scope), it still
 * executes arbitrary code. This is acceptable here because:
 * 1. Input is validated before reaching this function (only digits, operators, parentheses)
 * 2. The application is client-side only with no server interaction
 * 3. Users can only harm their own browser session
 *
 * For server-side usage, use an AST-based parser instead.
 */
function evaluateEquation(eq) {
  return Function(`"use strict"; return (${eq});`)();
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

// =============================================================================
// Solver Functions
// =============================================================================

function solveWithSingleParentheses(digits, operators, target, allowParentheses) {
  const opCount = digits.length - 1;
  for (const ops of candidateOperations(operators, opCount)) {
    const baseTokens = buildTokens(digits, ops);
    if (approxEqual(evaluateTokens(baseTokens), target)) {
      return tokensToExpression(baseTokens);
    }

    if (!allowParentheses) continue;

    const tokenCount = baseTokens.length;
    for (let gap = MIN_PARENTHESES_GAP; gap < tokenCount; gap += 2) {
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

// =============================================================================
// UI Helper Functions
// =============================================================================

function showSolutionMessage(message, expression) {
  if (userFeedback) {
    userFeedback.textContent = message;
  }
  if (expression && userSolutionInput) {
    userSolutionInput.value = expression;
  }
}

function currentOperators() {
  return operatorInputs.filter((input) => input.checked).map((input) => input.value);
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

// =============================================================================
// Puzzle Generation
// =============================================================================

function adjustDigitInputLength() {
  if (!digitCountInput || !digitsInput) return;
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
  for (let i = 0; i < PUZZLE_GENERATION_LIMIT; i += 1) {
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
  const fallback = FALLBACK_DIGITS.slice();
  if (userFeedback) {
    userFeedback.textContent = 'Unable to produce a solvable puzzle';
    userFeedback.classList.remove('status--success');
  }
  while (fallback.length < count) fallback.push(Math.floor(Math.random() * 10));
  return fallback.slice(0, count);
}

// =============================================================================
// Event Handlers
// =============================================================================

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
  const count = Number(digitCountInput.value);
  const digits = generateSolvableDigits(count);
  if (digitsInput) {
    digitsInput.value = digits.join('');
  }
}

// =============================================================================
// User Solution Validation
// =============================================================================

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

function handleSolutionInput() {
  scheduleSolutionValidation();
}

function handleRuleChange() {
  scheduleSolutionValidation();
}

// =============================================================================
// Initialization
// =============================================================================

function init() {
  if (!digitCountInput || !digitsInput || !targetInput) {
    console.error('Required DOM elements not found');
    return;
  }

  digitCountInput.addEventListener('change', adjustDigitInputLength);
  digitCountInput.addEventListener('change', handleRuleChange);
  targetInput.addEventListener('input', handleRuleChange);
  digitsInput.addEventListener('input', handleRuleChange);

  if (allowReorderInput) {
    allowReorderInput.addEventListener('change', handleRuleChange);
  }
  if (allowParenthesesInput) {
    allowParenthesesInput.addEventListener('change', handleRuleChange);
  }

  operatorInputs.forEach((input) => input.addEventListener('change', handleRuleChange));

  if (solveIconButton) {
    solveIconButton.addEventListener('click', handleSolve);
  }
  if (refreshDigitsButton) {
    refreshDigitsButton.addEventListener('click', handleNewGame);
  }
  if (userSolutionInput) {
    userSolutionInput.addEventListener('input', handleSolutionInput);
  }

  handleNewGame();
}

init();
