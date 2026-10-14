"""Unit tests for segment filter validation and parameterized SQL generation."""

import sys
from pathlib import Path

# Add backend directory to sys.path for test execution
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.segment_filters import build_segment_filter_clause


def test_valid_filters():
    """Verify that legitimate filter combinations produce valid WHERE clauses and parameters."""
    filters = {
        "city": "Austin",
        "min_total_spent": 150.50,
        "max_total_spent": 1000.00,
        "min_order_count": 3,
        "days_since_last_order": 30,
        "churn_score_min": 45.0,
    }
    where_clause, params = build_segment_filter_clause(filters)
    assert where_clause is not None
    assert len(params) == 6
    assert "%Austin%" in params
    assert 150.50 in params
    assert 1000.00 in params
    assert 3 in params
    assert 30 in params
    assert 45.0 in params
    print("  [PASS] test_valid_filters")


def test_empty_filters():
    """Verify that empty or null filters return an empty WHERE clause with zero parameters."""
    clause, params = build_segment_filter_clause({})
    assert len(params) == 0

    clause, params = build_segment_filter_clause({
        "city": "",
        "min_total_spent": None,
        "max_total_spent": None,
    })
    assert len(params) == 0
    print("  [PASS] test_empty_filters")


def test_reject_unallowed_fields():
    """Verify that non-whitelisted fields (e.g. internal columns, arbitrary keys) are strictly rejected."""
    bad_keys = ["is_admin", "password", "email", "credit_card", "select * from customers"]
    for key in bad_keys:
        try:
            build_segment_filter_clause({key: "exploit"})
            assert False, f"Expected ValueError for unallowed key: {key}"
        except ValueError as exc:
            assert f"Invalid filter field '{key}'" in str(exc)
    print("  [PASS] test_reject_unallowed_fields")


def test_sql_injection_defense():
    """Verify that malicious SQL injection attempts in string fields are parameterized and never executed."""
    malicious_inputs = [
        "'; DROP TABLE customers; --",
        "' OR '1'='1",
        "Austin' UNION SELECT * FROM users --",
        "New York'; UPDATE customers SET total_spent = 999999; --",
    ]
    for injection in malicious_inputs:
        where_clause, params = build_segment_filter_clause({"city": injection})
        assert f"%{injection}%" in params
    print("  [PASS] test_sql_injection_defense")


def test_nan_and_infinity_defense():
    """Verify that NaN and Infinity are strictly rejected for numeric filters."""
    for bad_num in [float("nan"), float("inf"), float("-inf"), "nan", "inf"]:
        for field in ["min_total_spent", "max_total_spent", "churn_score_min"]:
            try:
                build_segment_filter_clause({field: bad_num})
                assert False, f"Expected ValueError for {field}={bad_num}"
            except ValueError as exc:
                assert "finite number" in str(exc) or "valid number" in str(exc)
    print("  [PASS] test_nan_and_infinity_defense")


def test_negative_numbers_defense():
    """Verify that negative amounts or counts are rejected."""
    invalid_cases = [
        ({"min_total_spent": -50}, "cannot be negative"),
        ({"max_total_spent": -1}, "cannot be negative"),
        ({"min_order_count": -5}, "cannot be negative"),
        ({"days_since_last_order": -10}, "cannot be negative"),
        ({"churn_score_min": -5}, "between 0.0 and 100.0"),
        ({"churn_score_min": 105.0}, "between 0.0 and 100.0"),
    ]
    for filter_dict, expected_err in invalid_cases:
        try:
            build_segment_filter_clause(filter_dict)
            assert False, f"Expected ValueError for: {filter_dict}"
        except ValueError as exc:
            assert expected_err in str(exc)
    print("  [PASS] test_negative_numbers_defense")


def test_range_cross_validation():
    """Verify that min_total_spent > max_total_spent raises an informative validation error."""
    try:
        build_segment_filter_clause({
            "min_total_spent": 500,
            "max_total_spent": 100,
        })
        assert False, "Expected ValueError when min_total_spent > max_total_spent"
    except ValueError as exc:
        assert "cannot be greater than max_total_spent" in str(exc)
    print("  [PASS] test_range_cross_validation")


def run_all():
    print("--- Running Segment Filters Test Suite ---")
    test_valid_filters()
    test_empty_filters()
    test_reject_unallowed_fields()
    test_sql_injection_defense()
    test_nan_and_infinity_defense()
    test_negative_numbers_defense()
    test_range_cross_validation()
    print("All segment filter validation tests passed!\n")


if __name__ == "__main__":
    run_all()
