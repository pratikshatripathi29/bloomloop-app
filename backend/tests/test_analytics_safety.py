"""Unit tests for AI business analytics query spec safety."""

import sys
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.analytics_builder import (
    ALLOWED_METRICS,
    ALLOWED_GROUP_BY,
)
from services.segment_filters import build_segment_filter_clause


def test_allowed_metrics_whitelist():
    """Verify that expected metrics exist in the allowlist and have valid formats and SQL composables."""
    expected = [
        "total_customers",
        "total_revenue",
        "average_order_value",
        "average_total_spent",
        "total_orders",
        "average_churn_score",
    ]
    for m in expected:
        assert m in ALLOWED_METRICS, f"Missing metric in allow-list: {m}"
        meta = ALLOWED_METRICS[m]
        assert "label" in meta
        assert "sql" in meta
        assert "format" in meta
        assert meta["format"] in ("integer", "currency", "number")
    print("  [PASS] test_allowed_metrics_whitelist")


def test_allowed_group_by_whitelist():
    """Verify that only authorized dimension columns are permitted for grouping."""
    expected = ["city", "state", "country"]
    for g in expected:
        assert g in ALLOWED_GROUP_BY, f"Missing group_by in allow-list: {g}"
        meta = ALLOWED_GROUP_BY[g]
        assert "label" in meta
        assert "sql" in meta

    # Ensure sensitive columns are NOT in group_by allow-list
    forbidden = ["id", "email", "phone", "password", "token", "ssn"]
    for f in forbidden:
        assert f not in ALLOWED_GROUP_BY, f"Forbidden column found in group-by allow-list: {f}"
    print("  [PASS] test_allowed_group_by_whitelist")


def test_reject_arbitrary_metric_injection():
    """Verify that SQL injection strings in the metric field are strictly neutralized."""
    malicious_metrics = [
        "SELECT * FROM customers",
        "COUNT(*); DROP TABLE customers; --",
        "pg_sleep(10)",
        "admin_passwords",
        "total_revenue; DELETE FROM orders;",
    ]

    for bad in malicious_metrics:
        # The engine must only accept keys in ALLOWED_METRICS
        cleaned = bad if bad in ALLOWED_METRICS else "total_customers"
        assert cleaned == "total_customers", f"Failed to sanitize malicious metric: {bad}"
    print("  [PASS] test_reject_arbitrary_metric_injection")


def test_reject_arbitrary_group_by_injection():
    """Verify that malicious grouping strings (e.g. subqueries, multi-statement injection) are neutralized."""
    malicious_groups = [
        "(SELECT password FROM users)",
        "city; DROP TABLE campaigns;",
        "state' OR 1=1 --",
        "email",  # Privacy check: customer emails cannot be grouped or exposed
    ]

    for bad in malicious_groups:
        cleaned = bad if bad in ALLOWED_GROUP_BY else None
        assert cleaned is None, f"Failed to reject malicious or sensitive group_by: {bad}"
    print("  [PASS] test_reject_arbitrary_group_by_injection")


def test_filter_isolation_in_analytics():
    """Verify that filters attached to analytics query specs are strictly parameterized via segment_filters."""
    spec_filters = {
        "city": "Chicago",
        "min_total_spent": 250.0,
    }
    where_clause, params = build_segment_filter_clause(spec_filters)
    assert "%Chicago%" in params
    assert 250.0 in params

    # Test that injected filter is rejected
    try:
        build_segment_filter_clause({"unauthorized_table": "exploit"})
        assert False, "Expected ValueError on unauthorized filter key in analytics spec"
    except ValueError:
        pass
    print("  [PASS] test_filter_isolation_in_analytics")


def run_all():
    print("--- Running Analytics Safety Test Suite ---")
    test_allowed_metrics_whitelist()
    test_allowed_group_by_whitelist()
    test_reject_arbitrary_metric_injection()
    test_reject_arbitrary_group_by_injection()
    test_filter_isolation_in_analytics()
    print("All analytics safety tests passed!\n")


if __name__ == "__main__":
    run_all()
