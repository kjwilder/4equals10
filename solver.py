import argparse
import itertools

OPERATORS = '+-*/'


def test_eq(expected=10, *args):
    eq = ' '.join(str(arg) for arg in args)
    try:
        result = eval(eq)
    except ZeroDivisionError:
        return None
    if result == expected:
        return eq
    return None


def try_to_solve_with_parentheses(expected, *args):
    for parentheses_gap in range(4, len(args), 2):
        for first in range(0, len(args) + 2 - parentheses_gap, 2):
            second = first + parentheses_gap
            largs = list(args)
            largs.insert(first, '(')
            largs.insert(second, ')')
            eq = test_eq(expected, *largs)
            if eq:
                return eq
    return None


def try_to_solve(*args, expected):
    nops = len(args) - 1
    offsets = [4 ** i for i in range(nops - 1, -1, -1)]
    peq = None
    for i in range(4 ** nops):
        ops = [OPERATORS[i // offsets[j] % 4] for j in range(nops)]
        eq = test_eq(
            expected, *(x for t in zip(args, ops) for x in t), args[-1])
        if eq:
            return eq, 'on'
        if not peq:
            peq = try_to_solve_with_parentheses(
                expected, *(x for t in zip(args, ops) for x in t), args[-1])
    if peq:
        return peq, 'op'
    return None


def update_solutions(solutions):
    for quad in solutions:
        if solutions[quad]:
            squad = tuple(sorted(quad))
            if not solutions[squad]:
                solutions[squad] = (
                        solutions[quad][0],
                        solutions[quad][1].replace('o', 'r'))
            if (solutions[squad][1] == 'rp' and 'p' not in solutions[quad][1]):
                solutions[squad] = solutions[quad][0], 'rn'

    for quad in solutions:
        if not solutions[quad]:
            squad = tuple(sorted(quad))
            if solutions[squad]:
                solutions[quad] = (
                        solutions[squad][0],
                        solutions[squad][1].replace('o', 'r'))
    return solutions


def solve_one(digits, expected):
    sq = 'No solution'
    solution = try_to_solve(*digits, expected=expected)
    if solution:
        sq = ': '.join(solution[::-1])
        print(f'{sq}')
        return
    psol = None
    for perm in itertools.permutations(digits):
        solution = try_to_solve(*perm, expected=expected)
        if solution:
            solution = list(solution)
            solution[1] = solution[1].replace('o', 'r')
            sq = ': '.join(solution[::-1])
            print(f'{sq}')
            return
    if psol:
        sq = ': '.join(psol[::-1])
    print(f'{sq}')


def main(num_digits, expected):
    solutions = {}
    for n in range(10 ** num_digits):
        values = tuple(f'{n:0>{num_digits}}')
        solutions[values] = try_to_solve(*values, expected=expected)
    solutions = update_solutions(solutions)
    for quad in sorted(solutions):
        sq = ''
        if solutions[quad]:
            sq = ': '.join(solutions[quad][::-1])
        ind = ''.join(quad)
        print(f'{[ind]} {sq}')


def parse_args():
    parser = argparse.ArgumentParser(prog='Sums')
    parser.add_argument(
        '-d',
        '--digits',
    )
    parser.add_argument(
        '-nd',
        '--num_digits',
        type=int,
        default=4,
    )
    parser.add_argument(
        '-e',
        '--expected',
        type=int,
        default=10,
    )
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    if args.digits:
        solve_one(args.digits, args.expected)
    else:
        main(args.num_digits, args.expected)
