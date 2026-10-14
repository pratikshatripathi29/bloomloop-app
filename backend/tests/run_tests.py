"""Master test runner for BloomLoop CRM backend test suite."""

import sys
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import tests.test_segment_filters as test_filters
import tests.test_analytics_safety as test_analytics
import tests.test_rate_limiter as test_rate


def main():
    print("=" * 60)
    print(" BloomLoop CRM - Backend Safety & Validation Test Suite")
    print("=" * 60 + "\n")

    suites = [
        ("Segment Filter Validation", test_filters.run_all),
        ("Analytics Safety & SQL Isolation", test_analytics.run_all),
        ("AI Endpoint Rate Limiting", test_rate.run_all),
    ]

    failed = 0
    for name, runner in suites:
        try:
            runner()
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            failed += 1

    print("=" * 60)
    if failed == 0:
        print("ALL TESTS PASSED! Backend is fully validated and secure.")
        print("=" * 60)
        sys.exit(0)
    else:
        print(f"{failed} test suite(s) failed.")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
