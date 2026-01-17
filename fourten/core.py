"""Core solver logic for the 4=10 puzzle.

This module contains pure functions and data structures for solving the puzzle.
It has no I/O side effects and is designed for testability.
"""

from collections.abc import Iterator
from dataclasses import dataclass
from enum import Enum
from itertools import permutations

from .evaluator import UnsafeExpressionError, safe_eval


class SolutionType(Enum):
    """Classification of how a solution was found.

    The solution type indicates whether the original digit order was preserved
    and whether parentheses were needed.

    Attributes:
        ORDERED_NO_PARENS: Original digit order, no parentheses needed (on)
        ORDERED_PARENS: Original digit order, parentheses required (op)
        REORDERED_NO_PARENS: Digits were reordered, no parentheses (rn)
        REORDERED_PARENS: Digits were reordered, parentheses required (rp)
    """

    ORDERED_NO_PARENS = "on"
    ORDERED_PARENS = "op"
    REORDERED_NO_PARENS = "rn"
    REORDERED_PARENS = "rp"


@dataclass(frozen=True)
class Solution:
    """Represents a solution to the puzzle.

    Attributes:
        expression: The arithmetic expression that equals the target.
        solution_type: How the solution was found (ordering/parentheses).
        digits: The original digits used in the puzzle.
    """

    expression: str
    solution_type: SolutionType
    digits: tuple[str, ...]


@dataclass(frozen=True)
class SolverConfig:
    """Configuration for the puzzle solver.

    Attributes:
        target: The target value the expression should equal (default: 10).
        operators: The allowed operators as a string (default: "+-*/").
        allow_reorder: Whether digit reordering is allowed (default: True).
        allow_parentheses: Whether parentheses are allowed (default: True).
    """

    target: int = 10
    operators: str = "+-*/"
    allow_reorder: bool = True
    allow_parentheses: bool = True


# Validation constants
MIN_DIGITS = 2
MAX_DIGITS = 10
VALID_OPERATORS = frozenset("+-*/")
VALID_DIGIT_CHARS = frozenset("0123456789")

# Parentheses placement constants
MIN_PARENTHESES_GAP = 4  # Minimum gap between ( and ) in token list


def validate_digits(digits: str) -> tuple[str, ...]:
    """Validate and convert a digit string to a tuple.

    Args:
        digits: A string of single-digit numbers.

    Returns:
        A tuple of digit characters.

    Raises:
        ValueError: If digits are invalid (non-numeric, wrong length, etc.).
    """
    if not digits:
        raise ValueError("Digits cannot be empty")

    if not all(c in VALID_DIGIT_CHARS for c in digits):
        raise ValueError(f"Invalid characters in digits: {digits!r}")

    if len(digits) < MIN_DIGITS:
        raise ValueError(f"At least {MIN_DIGITS} digits required, got {len(digits)}")

    if len(digits) > MAX_DIGITS:
        raise ValueError(f"At most {MAX_DIGITS} digits allowed, got {len(digits)}")

    return tuple(digits)


def validate_operators(operators: str) -> str:
    """Validate the operator string.

    Args:
        operators: A string of operators to allow.

    Returns:
        The validated operator string.

    Raises:
        ValueError: If operators are invalid.
    """
    if not operators:
        raise ValueError("At least one operator is required")

    invalid = set(operators) - VALID_OPERATORS
    if invalid:
        raise ValueError(f"Invalid operators: {invalid}")

    return operators


def _test_expression(expected: int, tokens: tuple[str, ...]) -> str | None:
    """Test if a sequence of tokens evaluates to the expected value.

    Args:
        expected: The target value.
        tokens: A tuple of tokens (digits, operators, parentheses).

    Returns:
        The expression string if it equals the target, None otherwise.
    """
    expression = " ".join(tokens)
    try:
        result = safe_eval(expression)
    except (ZeroDivisionError, UnsafeExpressionError, SyntaxError):
        return None

    if result == expected:
        return expression
    return None


def _generate_operator_combinations(
    operators: str, count: int
) -> Iterator[tuple[str, ...]]:
    """Generate all combinations of operators.

    Args:
        operators: Available operators as a string.
        count: Number of operators needed.

    Yields:
        Tuples of operators of the specified length.
    """
    if count == 0:
        yield ()
        return

    offsets = [len(operators) ** i for i in range(count - 1, -1, -1)]
    for i in range(len(operators) ** count):
        yield tuple(operators[i // offsets[j] % len(operators)] for j in range(count))


def _build_tokens(digits: tuple[str, ...], ops: tuple[str, ...]) -> tuple[str, ...]:
    """Build a token sequence from digits and operators.

    Args:
        digits: The digit characters.
        ops: The operators to insert between digits.

    Returns:
        A tuple of tokens alternating digits and operators.
    """
    tokens: list[str] = []
    for i, digit in enumerate(digits):
        tokens.append(digit)
        if i < len(ops):
            tokens.append(ops[i])
    return tuple(tokens)


def _try_with_parentheses(
    expected: int, base_tokens: tuple[str, ...]
) -> str | None:
    """Try adding parentheses to find a solution.

    Only allows a single pair of parentheses at valid positions.
    The parentheses must span at least 2 operands (gap of 4 tokens).

    Args:
        expected: The target value.
        base_tokens: The base token sequence without parentheses.

    Returns:
        The expression string if a solution is found, None otherwise.
    """
    token_count = len(base_tokens)

    # Gap must be at least MIN_PARENTHESES_GAP (spans 2+ operands)
    for gap in range(MIN_PARENTHESES_GAP, token_count, 2):
        # Start position must be on a digit (even index)
        for start in range(0, token_count + 1 - gap, 2):
            end = start + gap
            tokens = list(base_tokens)
            tokens.insert(start, "(")
            tokens.insert(end + 1, ")")
            result = _test_expression(expected, tuple(tokens))
            if result:
                return result

    return None


def _try_to_solve(
    digits: tuple[str, ...], config: SolverConfig
) -> tuple[str, bool] | None:
    """Attempt to solve for a specific digit ordering.

    Args:
        digits: The digits to use in order.
        config: The solver configuration.

    Returns:
        A tuple of (expression, used_parentheses) if solved, None otherwise.
    """
    num_ops = len(digits) - 1
    parentheses_solution: str | None = None

    for ops in _generate_operator_combinations(config.operators, num_ops):
        base_tokens = _build_tokens(digits, ops)

        # Try without parentheses first
        result = _test_expression(config.target, base_tokens)
        if result:
            return (result, False)

        # Try with parentheses if allowed and we haven't found one yet
        if config.allow_parentheses and parentheses_solution is None:
            parentheses_solution = _try_with_parentheses(config.target, base_tokens)

    if parentheses_solution:
        return (parentheses_solution, True)

    return None


def solve(digits: str, config: SolverConfig | None = None) -> Solution | None:
    """Solve the puzzle for the given digits.

    Attempts to find an arithmetic expression using the given digits that
    equals the target value. The search follows a priority order:
    1. Original digit order, no parentheses
    2. Original digit order, with parentheses
    3. Permuted digits, no parentheses
    4. Permuted digits, with parentheses

    Args:
        digits: A string of single-digit numbers.
        config: Solver configuration (uses defaults if not provided).

    Returns:
        A Solution if one is found, None otherwise.

    Raises:
        ValueError: If digits or operators are invalid.
    """
    if config is None:
        config = SolverConfig()

    validated_digits = validate_digits(digits)
    validate_operators(config.operators)

    # Try original order first
    result = _try_to_solve(validated_digits, config)
    if result:
        expression, used_parens = result
        solution_type = (
            SolutionType.ORDERED_PARENS if used_parens else SolutionType.ORDERED_NO_PARENS
        )
        return Solution(expression, solution_type, validated_digits)

    # Try permutations if allowed
    if config.allow_reorder:
        for perm in permutations(validated_digits):
            if perm == validated_digits:
                continue  # Already tried original order

            result = _try_to_solve(perm, config)
            if result:
                expression, used_parens = result
                solution_type = (
                    SolutionType.REORDERED_PARENS
                    if used_parens
                    else SolutionType.REORDERED_NO_PARENS
                )
                return Solution(expression, solution_type, validated_digits)

    return None


def solve_all_combinations(
    num_digits: int, config: SolverConfig | None = None
) -> dict[tuple[str, ...], Solution | None]:
    """Solve for all possible digit combinations.

    This performs an exhaustive search over all n-digit combinations and
    finds solutions, normalizing so that each canonical (sorted) digit set
    has its best solution recorded.

    Args:
        num_digits: The number of digits to use (2-10).
        config: Solver configuration (uses defaults if not provided).

    Returns:
        A dictionary mapping digit tuples to their solutions (or None).

    Raises:
        ValueError: If num_digits is out of bounds.
    """
    if num_digits < MIN_DIGITS or num_digits > MAX_DIGITS:
        raise ValueError(
            f"num_digits must be between {MIN_DIGITS} and {MAX_DIGITS}, got {num_digits}"
        )

    if config is None:
        config = SolverConfig()

    validate_operators(config.operators)

    solutions: dict[tuple[str, ...], Solution | None] = {}

    # First pass: solve each combination in original order
    for n in range(10**num_digits):
        digits_str = f"{n:0>{num_digits}}"
        digits = tuple(digits_str)

        result = _try_to_solve(digits, config)
        if result:
            expression, used_parens = result
            solution_type = (
                SolutionType.ORDERED_PARENS
                if used_parens
                else SolutionType.ORDERED_NO_PARENS
            )
            solutions[digits] = Solution(expression, solution_type, digits)
        else:
            solutions[digits] = None

    # Second pass: propagate solutions to sorted equivalents
    _propagate_solutions(solutions)

    return solutions


def _propagate_solutions(
    solutions: dict[tuple[str, ...], Solution | None]
) -> None:
    """Propagate solutions between permutation-equivalent digit sets.

    Updates the solutions dictionary in place to ensure that:
    - Sorted digit tuples get the best solution from any permutation
    - Unsolved tuples get solutions from their sorted equivalent

    Args:
        solutions: Dictionary mapping digit tuples to solutions.
    """
    # First: update sorted versions with best solutions
    for digits, solution in list(solutions.items()):
        if solution is None:
            continue

        sorted_digits = tuple(sorted(digits))
        existing = solutions.get(sorted_digits)

        if existing is None:
            # No solution for sorted version, use this one (reordered)
            solutions[sorted_digits] = Solution(
                solution.expression,
                _to_reordered_type(solution.solution_type),
                sorted_digits,
            )
        elif (
            existing.solution_type == SolutionType.REORDERED_PARENS
            and solution.solution_type != SolutionType.ORDERED_PARENS
            and solution.solution_type != SolutionType.REORDERED_PARENS
        ):
            # Found a solution without parentheses, prefer it
            solutions[sorted_digits] = Solution(
                solution.expression,
                SolutionType.REORDERED_NO_PARENS,
                sorted_digits,
            )

    # Second: fill in unsolved tuples from sorted equivalents
    for digits in list(solutions.keys()):
        if solutions[digits] is not None:
            continue

        sorted_digits = tuple(sorted(digits))
        sorted_solution = solutions.get(sorted_digits)

        if sorted_solution:
            solutions[digits] = Solution(
                sorted_solution.expression,
                _to_reordered_type(sorted_solution.solution_type),
                digits,
            )


def _to_reordered_type(solution_type: SolutionType) -> SolutionType:
    """Convert a solution type to its reordered equivalent.

    Args:
        solution_type: The original solution type.

    Returns:
        The reordered version of the solution type.
    """
    if solution_type in (SolutionType.ORDERED_PARENS, SolutionType.REORDERED_PARENS):
        return SolutionType.REORDERED_PARENS
    return SolutionType.REORDERED_NO_PARENS
