# 4equals10
Solve 4=10 game

## Online javascript version:

https://kjwilder.github.io/4equals10/

## About

This repository provides a python CLI to solve the `4=10` game in which
one is given four digits and must use a combination of
- arithmetic operators (+, -, \*, /)
- parentheses (at most one pair)
- reordering of the digits
to construct an equation that equals 10.

For example, a solution for the four digits `0 2 5 4` is `0 + (4 - 2) * 5`.

The CLI adds additional functionality:
- User can select number of digits other than 4.
- User can select sums other than 10.
- User can select operators to use.

## Installation

Install using `pip` from the root of this repository:
```bash
pip install .
```

Run `fourten --help` to see all available options.

## Usage examples

- `fourten` – Find a solution for every four-digit sequence (that has a
  solution).
- `fourten -e 20` - Find solutions to `4=20`.
- `fourten -e 4 -nd 3` – Find solutions to `3=4`.
- `fourten -d 123456 -e 25` – Find an equation using the digits `1 2 3 4 5 6`
  that equals 25.
- `fourten -d 123456 -e 19 -o '+-'` – Find an equation using the digits
  `1 2 3 4 5 6` that equals 19 using only addition and subtraction.

## Details

The solver tries to find a solution that preserves the order of the digits
and does not use parentheses. If it cannot find such a solution, it will
look for others as follows:
- ordered digits, no parentheses
- ordered digits, with parentheses
- reordered digits, no parentheses
- reordered digits, with parentheses
