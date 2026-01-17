"""Tests for the safe expression evaluator."""

import pytest

from fourten.evaluator import UnsafeExpressionError, safe_eval


class TestSafeEval:
    """Tests for safe_eval function."""

    def test_simple_addition(self):
        assert safe_eval("1 + 2") == 3

    def test_simple_subtraction(self):
        assert safe_eval("5 - 3") == 2

    def test_simple_multiplication(self):
        assert safe_eval("4 * 3") == 12

    def test_simple_division(self):
        assert safe_eval("10 / 2") == 5.0

    def test_complex_expression(self):
        assert safe_eval("1 + 2 * 3") == 7

    def test_parentheses(self):
        assert safe_eval("( 1 + 2 ) * 3") == 9

    def test_nested_parentheses(self):
        assert safe_eval("( ( 1 + 2 ) * 3 )") == 9

    def test_negative_numbers(self):
        assert safe_eval("-5 + 3") == -2

    def test_unary_plus(self):
        assert safe_eval("+5") == 5

    def test_float_result(self):
        assert safe_eval("7 / 2") == 3.5

    def test_zero_result(self):
        assert safe_eval("5 - 5") == 0

    def test_division_by_zero_raises(self):
        with pytest.raises(ZeroDivisionError):
            safe_eval("1 / 0")

    def test_syntax_error(self):
        with pytest.raises(SyntaxError):
            safe_eval("1 + * 2")

    def test_empty_expression(self):
        with pytest.raises(SyntaxError):
            safe_eval("")

    def test_function_call_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("abs(-5)")

    def test_import_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("__import__('os')")

    def test_attribute_access_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("(1).__class__")

    def test_string_literal_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("'hello'")

    def test_list_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("[1, 2, 3]")

    def test_bool_literal_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("True")

    def test_comparison_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("1 < 2")

    def test_lambda_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("lambda: 1")

    def test_bitwise_operators_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("1 & 2")

    def test_modulo_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("10 % 3")

    def test_power_rejected(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("2 ** 3")

    def test_whitespace_handling(self):
        assert safe_eval("  1  +  2  ") == 3
        assert safe_eval("1+2") == 3

    def test_single_number(self):
        assert safe_eval("42") == 42

    def test_large_numbers(self):
        assert safe_eval("999999999 + 1") == 1000000000

    def test_decimal_literals(self):
        assert safe_eval("3.14 * 2") == pytest.approx(6.28)
