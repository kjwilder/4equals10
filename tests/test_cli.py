"""Tests for the CLI interface."""


from fourten.solver import main, parse_args, validate_args


class TestParseArgs:
    """Tests for argument parsing."""

    def test_default_args(self):
        args = parse_args([])
        assert args.digits is None
        assert args.num_digits == 4
        assert args.expected == 10
        assert args.operators == "+-*/"

    def test_digits_arg(self):
        args = parse_args(["-d", "1234"])
        assert args.digits == "1234"

    def test_digits_long_form(self):
        args = parse_args(["--digits", "5678"])
        assert args.digits == "5678"

    def test_num_digits_arg(self):
        args = parse_args(["-nd", "3"])
        assert args.num_digits == 3

    def test_expected_arg(self):
        args = parse_args(["-e", "20"])
        assert args.expected == 20

    def test_operators_arg(self):
        args = parse_args(["-o", "+-"])
        assert args.operators == "+-"

    def test_combined_args(self):
        args = parse_args(["-d", "1234", "-e", "15", "-o", "+-*/"])
        assert args.digits == "1234"
        assert args.expected == 15
        assert args.operators == "+-*/"


class TestValidateArgs:
    """Tests for argument validation."""

    def test_valid_args(self):
        args = parse_args(["-d", "1234"])
        assert validate_args(args) is None

    def test_invalid_digit_chars(self):
        args = parse_args(["-d", "12a4"])
        error = validate_args(args)
        assert error is not None
        assert "numeric" in error.lower()

    def test_too_few_digits(self):
        args = parse_args(["-d", "1"])
        error = validate_args(args)
        assert error is not None
        assert "2" in error

    def test_too_many_digits(self):
        args = parse_args(["-d", "12345678901"])
        error = validate_args(args)
        assert error is not None

    def test_invalid_num_digits_low(self):
        args = parse_args(["-nd", "1"])
        error = validate_args(args)
        assert error is not None

    def test_invalid_num_digits_high(self):
        args = parse_args(["-nd", "11"])
        error = validate_args(args)
        assert error is not None

    def test_invalid_operators(self):
        args = parse_args(["-o", "+-^"])
        error = validate_args(args)
        assert error is not None
        assert "Invalid" in error

    def test_empty_operators(self):
        args = parse_args(["-o", ""])
        error = validate_args(args)
        assert error is not None


class TestMain:
    """Tests for the main function."""

    def test_solve_specific_digits(self, capsys):
        exit_code = main(["-d", "1234"])
        captured = capsys.readouterr()
        assert exit_code == 0
        assert "on:" in captured.out or "op:" in captured.out

    def test_no_solution_exit_code(self, capsys):
        # 1111 with only + can't equal 10
        exit_code = main(["-d", "1111", "-o", "+"])
        assert exit_code == 1

    def test_validation_error_exit_code(self, capsys):
        exit_code = main(["-d", "abc"])
        captured = capsys.readouterr()
        assert exit_code == 2
        assert "Error" in captured.err

    def test_solve_all_two_digits(self, capsys):
        exit_code = main(["-nd", "2"])
        captured = capsys.readouterr()
        assert exit_code == 0
        # Should output 100 lines (00-99)
        lines = captured.out.strip().split("\n")
        assert len(lines) == 100

    def test_custom_target(self, capsys):
        exit_code = main(["-d", "5555", "-e", "20"])
        captured = capsys.readouterr()
        assert exit_code == 0
        # 5 + 5 + 5 + 5 = 20
        assert "5 + 5 + 5 + 5" in captured.out or "on:" in captured.out

    def test_custom_operators(self, capsys):
        exit_code = main(["-d", "1234", "-o", "+"])
        captured = capsys.readouterr()
        assert exit_code == 0
        # Only + should be in the expression
        assert "-" not in captured.out or "1 + 2 + 3 + 4" in captured.out


class TestExitCodes:
    """Tests for CLI exit codes."""

    def test_success_exit_code(self):
        assert main(["-d", "1234"]) == 0

    def test_no_solution_exit_code(self):
        # This specific combination has no solution with only +
        assert main(["-d", "1111", "-o", "+"]) == 1

    def test_error_exit_code(self):
        assert main(["-d", "xyz"]) == 2
