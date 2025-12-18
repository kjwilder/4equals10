"""Solver logic for 4=10 style equations.

The solver searches for expressions that reach a target value using a set of
single-digit numbers, arithmetic operators, optional reordering of the digits,
and optional parentheses.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from itertools import permutations, product
from typing import Iterable, List, Sequence, Tuple


actionable_ops = {"+", "-", "*", "/"}


@dataclass(frozen=True)
class Solution:
    """Represents a solution expression for a digit sequence."""

    digits: str
    expression: str
    value: float
    category: str


class InvalidOperatorError(ValueError):
    pass


class InvalidDigitError(ValueError):
    pass


def _apply_operator(left: float, right: float, operator: str) -> float | None:
    if operator == "+":
        return left + right
    if operator == "-":
        return left - right
    if operator == "*":
        return left * right
    if operator == "/":
        if right == 0:
            return None
        return left / right
    raise InvalidOperatorError(f"Unsupported operator: {operator}")


@lru_cache(maxsize=None)
def _parenthesized_expressions(
    numbers: Tuple[int, ...], operators: Tuple[str, ...]
) -> List[Tuple[str, float]]:
    if len(numbers) == 1:
        value = float(numbers[0])
        return [(str(numbers[0]), value)]

    expressions: List[Tuple[str, float]] = []
    for index in range(1, len(numbers)):
        left_numbers = numbers[:index]
        right_numbers = numbers[index:]
        left_ops = operators[: index - 1]
        right_ops = operators[index:]
        pivot_op = operators[index - 1]

        for left_expr, left_val in _parenthesized_expressions(left_numbers, left_ops):
            for right_expr, right_val in _parenthesized_expressions(
                right_numbers, right_ops
            ):
                result = _apply_operator(left_val, right_val, pivot_op)
                if result is None:
                    continue
                expression = f"({left_expr} {pivot_op} {right_expr})"
                expressions.append((expression, result))

    return expressions


def _standard_precedence_value(numbers: Sequence[int], operators: Sequence[str]) -> float | None:
    values: List[float | str] = [float(numbers[0])]
    for op, number in zip(operators, numbers[1:]):
        if op in {"*", "/"}:
            left_value = float(values.pop())
            right_value = float(number)
            result = _apply_operator(left_value, right_value, op)
            if result is None:
                return None
            values.append(result)
        else:
            values.append(op)
            values.append(float(number))

    total = float(values[0])
    for idx in range(1, len(values), 2):
        op = values[idx]
        right = float(values[idx + 1])
        result = _apply_operator(total, right, op)  # type: ignore[arg-type]
        if result is None:
            return None
        total = result
    return total


def _is_close(value: float, target: float, tolerance: float = 1e-6) -> bool:
    return abs(value - target) <= tolerance


def _normalize_digits(digits: str) -> Tuple[int, ...]:
    if not digits or not digits.isdigit():
        raise InvalidDigitError("Digits must be a non-empty string of numbers.")
    return tuple(int(d) for d in digits)


def _normalize_operators(operators: str) -> Tuple[str, ...]:
    normalized = tuple(operators)
    unsupported = sorted(set(normalized) - actionable_ops)
    if unsupported:
        raise InvalidOperatorError(f"Unsupported operators provided: {' '.join(unsupported)}")
    return normalized


def unique_permutations(items: Sequence[int]) -> Iterable[Tuple[int, ...]]:
    seen: set[Tuple[int, ...]] = set()
    for perm in permutations(items):
        if perm in seen:
            continue
        seen.add(perm)
        yield perm


def _expression_without_parentheses(
    digits: Sequence[int], operators: Sequence[str]
) -> Tuple[str, float | None]:
    operator_sequence = tuple(operators)
    expression_parts: List[str] = []
    for digit, operator in zip(digits, operator_sequence + ("",)):
        expression_parts.append(str(digit))
        if operator:
            expression_parts.append(f" {operator} ")
    expression = "".join(expression_parts)
    value = _standard_precedence_value(digits, operator_sequence)
    return expression, value


def _find_solution_for_order(
    digits: Tuple[int, ...],
    operator_pool: Tuple[str, ...],
    target: float,
    with_parentheses: bool,
) -> Tuple[str, float] | None:
    slots = len(digits) - 1
    for operators in product(operator_pool, repeat=slots):
        if with_parentheses:
            for expression, value in _parenthesized_expressions(digits, operators):
                if _is_close(value, target):
                    return expression, value
        else:
            expression, value = _expression_without_parentheses(digits, operators)
            if value is not None and _is_close(value, target):
                return expression, value
    return None


def find_solution(
    digits: str,
    *,
    target: float = 10,
    operators: str = "+-*/",
) -> Solution | None:
    numeric_digits = _normalize_digits(digits)
    operator_pool = _normalize_operators(operators)

    modes = (
        ("on", False),
        ("op", True),
        ("rn", False),
        ("rp", True),
    )

    for mode, with_parentheses in modes:
        orders: Iterable[Tuple[int, ...]]
        if mode in {"rn", "rp"}:
            orders = unique_permutations(numeric_digits)
        else:
            orders = (numeric_digits,)

        for order in orders:
            result = _find_solution_for_order(
                order, operator_pool, target, with_parentheses=with_parentheses
            )
            if result:
                expression, value = result
                return Solution(
                    digits="".join(str(d) for d in order),
                    expression=expression,
                    value=value,
                    category=mode,
                )

    return None


def scan_all(
    *,
    num_digits: int = 4,
    target: float = 10,
    operators: str = "+-*/",
) -> Iterable[Solution]:
    operator_pool = _normalize_operators(operators)
    if num_digits < 1:
        raise InvalidDigitError("Number of digits must be at least one.")

    for number in range(10**num_digits):
        digits = str(number).zfill(num_digits)
        solution = find_solution(digits, target=target, operators="".join(operator_pool))
        if solution:
            yield solution
