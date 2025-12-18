"""Command line interface for the 4equals10 solver."""

from __future__ import annotations

import argparse
from dataclasses import asdict
from typing import Iterable

from .solver import Solution, find_solution, scan_all


CATEGORY_DESCRIPTIONS = {
    "on": "ordered, no parentheses",
    "op": "ordered, with parentheses",
    "rn": "reordered, no parentheses",
    "rp": "reordered, with parentheses",
}


def _solution_as_row(solution: Solution) -> str:
    label = CATEGORY_DESCRIPTIONS.get(solution.category, solution.category)
    return f"{solution.digits}: {solution.expression}  [{label}]"


def _solutions_to_rows(solutions: Iterable[Solution]) -> str:
    return "\n".join(_solution_as_row(solution) for solution in solutions)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Search for expressions that make the given digits equal the target.",
    )
    parser.add_argument(
        "-d",
        "--digits",
        help="Digit string to solve (e.g. 0254). If omitted, all digit strings of length --num-digits are scanned.",
    )
    parser.add_argument(
        "-nd",
        "--num-digits",
        type=int,
        default=4,
        help="Number of digits to scan when --digits is not provided.",
    )
    parser.add_argument(
        "-e",
        "--equals",
        type=float,
        default=10,
        help="Target value the expression should equal.",
    )
    parser.add_argument(
        "-o",
        "--operators",
        default="+-*/",
        help="Operators to consider between digits.",
    )
    parser.add_argument(
        "--show-json",
        action="store_true",
        help="Print results as JSON for easier scripting.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.digits:
        solution = find_solution(args.digits, target=args.equals, operators=args.operators)
        if not solution:
            print(f"No solution found for digits={args.digits} with target {args.equals}.")
            return 1
        if args.show_json:
            import json

            print(json.dumps(asdict(solution), indent=2))
        else:
            print(_solution_as_row(solution))
        return 0

    solutions = list(
        scan_all(num_digits=args.num_digits, target=args.equals, operators=args.operators)
    )
    if args.show_json:
        import json

        payload = [asdict(solution) for solution in solutions]
        print(json.dumps(payload, indent=2))
    else:
        print(_solutions_to_rows(solutions))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
