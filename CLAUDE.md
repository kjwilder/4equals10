# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

4equals10 is a solver for the "4=10" puzzle game where players use arithmetic operators, optional parentheses, and digit reordering to make an equation that equals a target value (default: 10). The project has two implementations:

- **Python CLI** (`fourten/`): Command-line tool and library for solving puzzles
- **JavaScript web app** (`script.js`, `index.html`, `style.css`): Browser-based interactive version at https://kjwilder.github.io/4equals10/

## Commands

### Installation and CLI
```bash
pip install .                  # Install package
pip install -e ".[dev]"        # Install with dev dependencies
fourten --help                 # Show help
```

### Example CLI usage
```bash
fourten                        # Solve all 4-digit combinations
fourten -d 0254 -e 10          # Solve specific digits
fourten -e 20                  # Change target sum
fourten -nd 3 -e 4             # Use 3 digits, target 4
fourten -o '+-'                # Restrict operators
```

### Testing
```bash
pytest                         # Run all tests
pytest tests/test_core.py      # Run specific test file
```

### Linting
```bash
ruff check .                   # Lint Python code
```

## Architecture

### Python Package (`fourten/`)

The package is organized into three modules:

#### `fourten/evaluator.py` - Safe Expression Evaluator
- Provides `safe_eval()` using AST parsing (no `eval()`)
- Only allows: integers, floats, +, -, *, /, parentheses
- Raises `UnsafeExpressionError` for disallowed operations

#### `fourten/core.py` - Pure Solver Logic
- `Solution` dataclass: expression, solution_type, digits
- `SolutionType` enum: `on` (ordered, no parens), `op` (ordered, parens), `rn` (reordered, no parens), `rp` (reordered, parens)
- `SolverConfig` dataclass: target, operators, allow_reorder, allow_parentheses
- `solve(digits, config)`: Solve for specific digits, returns `Solution` or `None`
- `solve_all_combinations(num_digits, config)`: Exhaustive search

The solver uses a priority-based search strategy:
1. Original digit order, no parentheses
2. Original digit order, with parentheses
3. Permuted digits, no parentheses
4. Permuted digits, with parentheses

#### `fourten/solver.py` - CLI Wrapper
- Thin CLI using argparse
- Input validation
- Exit codes: 0 (success), 1 (no solution), 2 (error)

#### `fourten/__init__.py` - Public API
Exports: `Solution`, `SolutionType`, `SolverConfig`, `solve`, `solve_all_combinations`, `safe_eval`, `UnsafeExpressionError`

### JavaScript Web App (`script.js`)

Organized into labeled sections:
- **Constants**: `TOLERANCE`, `MIN_PARENTHESES_GAP`, `PUZZLE_GENERATION_LIMIT`, etc.
- **Solver Functions**: `solvePuzzle()`, `solveWithSingleParentheses()`
- **UI Functions**: Event handlers, validation, puzzle generation

Key features:
- Uses `Function()` for expression evaluation (with security documentation)
- Real-time validation of user input
- Generates solvable puzzles on refresh
- Null checks for DOM elements

## Constraints

- At most one pair of parentheses allowed
- Only single-digit numbers (0-9)
- Standard arithmetic operators: +, -, *, /
- Python requires 3.10+
