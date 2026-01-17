"""Command-line interface for the 4=10 puzzle solver.

This module provides the CLI entry point for the solver.
All solving logic is delegated to the core module.
"""

import argparse
import sys
from typing import NoReturn

from .core import (
    MAX_DIGITS,
    MIN_DIGITS,
    VALID_OPERATORS,
    Solution,
    SolverConfig,
    solve,
    solve_all_combinations,
)


def _format_solution(solution: Solution | None) -> str:
    """Format a solution for display.

    Args:
        solution: A Solution object or None.

    Returns:
        A formatted string representation.
    """
    if solution is None:
        return ""
    return f"{solution.solution_type.value}: {solution.expression}"


def solve_one(digits: str, config: SolverConfig) -> int:
    """Solve for specific digits and print the result.

    Args:
        digits: The digits to solve for.
        config: The solver configuration.

    Returns:
        Exit code (0 if solution found, 1 if not).
    """
    try:
        solution = solve(digits, config)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2

    if solution:
        print(_format_solution(solution))
        return 0
    else:
        print("No solution")
        return 1


def solve_all(num_digits: int, config: SolverConfig) -> int:
    """Solve for all digit combinations and print results.

    Args:
        num_digits: Number of digits to use.
        config: The solver configuration.

    Returns:
        Exit code (always 0 for successful completion).
    """
    try:
        solutions = solve_all_combinations(num_digits, config)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2

    for digits in sorted(solutions.keys()):
        digits_str = "".join(digits)
        result = _format_solution(solutions[digits])
        print(f"[{digits_str}] {result}")

    return 0


def validate_args(args: argparse.Namespace) -> str | None:
    """Validate command-line arguments.

    Args:
        args: Parsed command-line arguments.

    Returns:
        Error message if validation fails, None otherwise.
    """
    if args.digits:
        if not all(c.isdigit() for c in args.digits):
            return f"Digits must contain only numeric characters: {args.digits!r}"
        if len(args.digits) < MIN_DIGITS:
            return f"At least {MIN_DIGITS} digits required"
        if len(args.digits) > MAX_DIGITS:
            return f"At most {MAX_DIGITS} digits allowed"

    if args.num_digits < MIN_DIGITS:
        return f"num_digits must be at least {MIN_DIGITS}"
    if args.num_digits > MAX_DIGITS:
        return f"num_digits must be at most {MAX_DIGITS}"

    invalid_ops = set(args.operators) - VALID_OPERATORS
    if invalid_ops:
        return f"Invalid operators: {invalid_ops}"

    if not args.operators:
        return "At least one operator is required"

    return None


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments.

    Args:
        argv: Command-line arguments (uses sys.argv if None).

    Returns:
        Parsed arguments namespace.
    """
    parser = argparse.ArgumentParser(
        prog="fourten",
        description="Solve 4=10 puzzles: find arithmetic expressions equaling a target.",
    )
    parser.add_argument(
        "-d",
        "--digits",
        metavar="DIGITS",
        help="Specific digits to solve (e.g., '1234')",
    )
    parser.add_argument(
        "-nd",
        "--num_digits",
        type=int,
        default=4,
        metavar="N",
        help=f"Number of digits for exhaustive search ({MIN_DIGITS}-{MAX_DIGITS}, default: 4)",
    )
    parser.add_argument(
        "-e",
        "--expected",
        type=int,
        default=10,
        metavar="TARGET",
        help="Target value for the expression (default: 10)",
    )
    parser.add_argument(
        "-o",
        "--operators",
        default="+-*/",
        metavar="OPS",
        help="Operators to use (default: '+-*/')",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Main entry point for the CLI.

    Args:
        argv: Command-line arguments (uses sys.argv if None).

    Returns:
        Exit code.
    """
    args = parse_args(argv)

    error = validate_args(args)
    if error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    config = SolverConfig(
        target=args.expected,
        operators=args.operators,
    )

    if args.digits:
        return solve_one(args.digits, config)
    else:
        return solve_all(args.num_digits, config)


def cli_main() -> NoReturn:
    """CLI entry point that handles exit codes."""
    sys.exit(main())


if __name__ == "__main__":
    cli_main()
