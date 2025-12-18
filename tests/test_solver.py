import math

import pytest

from fourten.solver import InvalidDigitError, InvalidOperatorError, Solution, find_solution, scan_all


def test_find_solution_for_known_digits():
    solution = find_solution("0254")
    assert solution is not None
    assert math.isclose(solution.value, 10)
    assert set(solution.expression) >= {"0", "2", "4", "5"}


def test_invalid_digits_raise_error():
    with pytest.raises(InvalidDigitError):
        find_solution("12a3")


def test_invalid_operator_raises_error():
    with pytest.raises(InvalidOperatorError):
        find_solution("1234", operators="+-x")


def test_scan_all_respects_digit_count():
    solutions = list(scan_all(num_digits=2, target=3, operators="+-"))
    assert all(len(solution.digits) == 2 for solution in solutions)
    assert solutions, "Expected at least one two-digit solution for target 3"


def test_solution_dataclass_repr():
    solution = Solution(digits="1234", expression="1 + 2 + 3 + 4", value=10, category="on")
    assert "1234" in repr(solution)
