# 4equals10
Solve 4=10 puzzles

## About

- In January, 2023 I came across an Android game called `4=10` in
  which one is presented with four digits and has to use a combination of
  arithmetic operators (+, -, \*, /), parentheses (at most one pair), and
  reordering of the digits to construct an equation equal to 10. For
  example, a solution for the four digits '0254' is '0 + (4 - 2) * 5'.
- After playing the game a bit, I considered trying to solve the game with
  a python program and did some back-of-the-envelope calculations.
  - python should be able to eval a string like `9 + ( 4 - 2 ) / 3` on my
    MacBook Pro in less than (and perhaps much less than) `one ten-millionth`
    of a second.
  - The number of reorderings (permutations) of four digits is bounded by and
    on the order of `10^4 = 10,000`.
  - The number of ways to choose three arithmetic operators is `4^3 = 64`.
  - There are at most `5` meaningful ways to add a single pair of parentheses
    to an equation with four digits and three arithmetic operators.
  - Putting the above points together, there are no more than about 3 million
    equations that python would need to eval in order to determine a solution
    for any particular four digits. My take was a python program to solve any
    four digits would run in less that a second.
  - I wrote the code you see here. My solution is simple and does not attempt
    any optimizations, but even so it ran fast enough that it could solve
    every sequence of four digits in about 20 seconds.
  - I spent some additional time updating this program to
    handle any number of digits, any operators, and arbitrary sums.  It can be
    very slow when there are a lot of digits, especially for cases that have
    no solution.

## Usage examples
- `fourten - Prints solutions for all four-digit sequences.
- `fourten -e 20` - Prints solutions for all four-digit sequences when
  the equation should equal 20.
- `fourten -e 4 -nd 3` - Prints solutions for all three-digit
  sequences when the equation should equal 4.
- `fourten -d 123456 -e 25` - Finds a solution, if it exists, for the six
  digits 123456 that equals 25, e.g., `1 * 2 + 3 * 4 + 5 + 6`.
- `fourten -d 123456 -e 19 -o '+-'` - Find a solution for the six
  digits 123456 that equals 19 using only addition and subtraction.

## Some details
- A "simple" solution without parentheses and reordering will be shown and labeled `on`
  if it exists.
- If no simple solution exists, the program will attempt, in order, to find:
  - a solution with parentheses (`op`).
  - a solution with reordering and no parentheses (`rn`).
  - a solution with reordering and parentheses (`rp`).
