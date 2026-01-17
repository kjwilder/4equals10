"""Safe arithmetic expression evaluator using AST parsing.

This module provides a secure alternative to eval() for evaluating arithmetic
expressions. It only allows basic arithmetic operations (+, -, *, /) and
parentheses, rejecting any potentially dangerous operations.
"""

import ast
import operator

# Allowed binary operators
_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}

# Allowed unary operators
_UNARY_OPERATORS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


class UnsafeExpressionError(ValueError):
    """Raised when an expression contains disallowed operations."""

    pass


def safe_eval(expression: str) -> int | float:
    """Safely evaluate an arithmetic expression.

    Only allows:
    - Integer and float literals
    - Binary operators: +, -, *, /
    - Unary operators: +, -
    - Parentheses for grouping

    Args:
        expression: A string containing an arithmetic expression.

    Returns:
        The numeric result of evaluating the expression.

    Raises:
        UnsafeExpressionError: If the expression contains disallowed operations.
        ZeroDivisionError: If the expression involves division by zero.
        SyntaxError: If the expression has invalid syntax.

    Examples:
        >>> safe_eval("1 + 2 * 3")
        7
        >>> safe_eval("( 1 + 2 ) * 3")
        9
        >>> safe_eval("10 / 2")
        5.0
    """
    try:
        tree = ast.parse(expression.strip(), mode="eval")
    except SyntaxError as e:
        raise SyntaxError(f"Invalid expression syntax: {e}") from e

    return _eval_node(tree.body)


def _eval_node(node: ast.AST) -> int | float:
    """Recursively evaluate an AST node.

    Args:
        node: An AST node to evaluate.

    Returns:
        The numeric result of the node.

    Raises:
        UnsafeExpressionError: If the node type is not allowed.
    """
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            return node.value
        raise UnsafeExpressionError(
            f"Only numeric literals are allowed, got {type(node.value).__name__}"
        )

    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in _OPERATORS:
            raise UnsafeExpressionError(
                f"Operator {op_type.__name__} is not allowed"
            )
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        return _OPERATORS[op_type](left, right)

    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in _UNARY_OPERATORS:
            raise UnsafeExpressionError(
                f"Unary operator {op_type.__name__} is not allowed"
            )
        operand = _eval_node(node.operand)
        return _UNARY_OPERATORS[op_type](operand)

    # For Python 3.7 compatibility (ast.Num is deprecated but still used)
    if isinstance(node, ast.Constant):
        return node.n

    raise UnsafeExpressionError(
        f"Expression type {type(node).__name__} is not allowed"
    )
