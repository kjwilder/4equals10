"""4=10 Puzzle Solver.

A solver for the "4=10" puzzle game where players use arithmetic operators,
optional parentheses, and digit reordering to make an equation that equals
a target value (default: 10).

Example usage:
    >>> from fourten import solve, SolverConfig
    >>> solution = solve("1234")
    >>> print(solution.expression)
    1 + 2 + 3 + 4
    >>> solution = solve("5678", SolverConfig(target=20))
    >>> print(solution.expression if solution else "No solution")
"""

__version__ = "0.2.0"

from .core import (
    MAX_DIGITS,
    MIN_DIGITS,
    VALID_OPERATORS,
    Solution,
    SolutionType,
    SolverConfig,
    solve,
    solve_all_combinations,
)
from .evaluator import UnsafeExpressionError, safe_eval

__all__ = [
    # Version
    "__version__",
    # Constants
    "MIN_DIGITS",
    "MAX_DIGITS",
    "VALID_OPERATORS",
    # Data classes and enums
    "Solution",
    "SolutionType",
    "SolverConfig",
    # Functions
    "solve",
    "solve_all_combinations",
    "safe_eval",
    # Exceptions
    "UnsafeExpressionError",
]
