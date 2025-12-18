# 4equals10
Solve 4=10 puzzles

## About

This repository provides a small Python CLI that solves the `4 = 10` style
arithmetic puzzle. Given a string of digits (for example `0254`), the solver
searches through operator combinations, optional parentheses, and optional
reordering of the digits to find an expression that equals a target value.
The default target is 10, but it can be customized.

## Getting started

1. Create a virtual environment with Python 3.11+.
2. Install the project locally (this also enables the `fourten` console script):

   ```bash
   python -m pip install -e .
   ```

Run `fourten --help` to see all available options.

## Usage examples

- `fourten` – Scan every four-digit sequence and print any solutions that
  evaluate to 10.
- `fourten -e 20` – Scan every four-digit sequence for expressions that equal
  20 instead of 10.
- `fourten -e 4 -nd 3` – Scan every three-digit sequence for expressions that
  equal 4.
- `fourten -d 123456 -e 25` – Solve a specific digit string, e.g. `1 * 2 + 3 *
  4 + 5 + 6` equals 25.
- `fourten -d 123456 -e 19 -o '+-'` – Solve a digit string while restricting the
  operators to addition and subtraction.

## How solutions are classified

The solver reports the first expression it finds, categorizing it by the
features it needed:

- `on`: ordered digits, no parentheses
- `op`: ordered digits, with parentheses
- `rn`: reordered digits, no parentheses
- `rp`: reordered digits, with parentheses

## Running tests

Tests use `pytest`. After installing the project in editable mode, run:

```bash
pytest
```
