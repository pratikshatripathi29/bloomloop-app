import math
from typing import Any, Dict, List, Tuple
from psycopg import sql

# Allowed filter fields strictly enforced
ALLOWED_FIELDS = {
    "city",
    "min_total_spent",
    "max_total_spent",
    "min_order_count",
    "days_since_last_order",
    "churn_score_min",
}


def build_segment_filter_clause(
    filters: Dict[str, Any],
) -> Tuple[sql.Composable, List[Any]]:
    """Validate a filters dictionary and convert it into a safe, parameterized SQL WHERE clause.
    
    Security & Validation Guarantees:
    - Enforces strict whitelist of allowable keys.
    - Rejects NaN, Infinity, negative values, and type confusion.
    - Limits string lengths to prevent regex/wildcard DOS.
    - Cross-validates ranges (e.g. min_total_spent <= max_total_spent).
    - Always builds parameterized SQL; user input is never concatenated directly.
    
    Returns:
        (where_clause: sql.Composable, params: List[Any])
    """
    if not isinstance(filters, dict):
        raise ValueError("Filters must be a JSON object (dictionary).")

    predicates: List[sql.Composable] = []
    params: List[Any] = []

    min_spent = None
    max_spent = None

    for key, val in filters.items():
        if key not in ALLOWED_FIELDS:
            raise ValueError(
                f"Invalid filter field '{key}'. Allowed fields: {', '.join(sorted(ALLOWED_FIELDS))}"
            )

        # Skip null or empty values
        if val is None or val == "":
            continue

        if key == "city":
            if not isinstance(val, str):
                raise ValueError("city must be a text string.")
            cleaned_city = val.strip()
            if len(cleaned_city) > 100:
                raise ValueError("city length must not exceed 100 characters.")
            if cleaned_city:
                predicates.append(sql.SQL("city ILIKE %s"))
                params.append(f"%{cleaned_city}%")

        elif key == "min_total_spent":
            try:
                numeric_val = float(val)
            except (ValueError, TypeError):
                raise ValueError("min_total_spent must be a valid number.")
            if math.isnan(numeric_val) or math.isinf(numeric_val):
                raise ValueError("min_total_spent must be a finite number.")
            if numeric_val < 0:
                raise ValueError("min_total_spent cannot be negative.")
            min_spent = numeric_val
            predicates.append(sql.SQL("total_spent >= %s"))
            params.append(numeric_val)

        elif key == "max_total_spent":
            try:
                numeric_val = float(val)
            except (ValueError, TypeError):
                raise ValueError("max_total_spent must be a valid number.")
            if math.isnan(numeric_val) or math.isinf(numeric_val):
                raise ValueError("max_total_spent must be a finite number.")
            if numeric_val < 0:
                raise ValueError("max_total_spent cannot be negative.")
            max_spent = numeric_val
            predicates.append(sql.SQL("total_spent <= %s"))
            params.append(numeric_val)

        elif key == "min_order_count":
            try:
                int_val = int(val)
            except (ValueError, TypeError):
                raise ValueError("min_order_count must be an integer.")
            if int_val < 0:
                raise ValueError("min_order_count cannot be negative.")
            if int_val > 1_000_000:
                raise ValueError("min_order_count exceeds reasonable limit.")
            predicates.append(sql.SQL("order_count >= %s"))
            params.append(int_val)

        elif key == "days_since_last_order":
            try:
                int_days = int(val)
            except (ValueError, TypeError):
                raise ValueError("days_since_last_order must be an integer.")
            if int_days < 0:
                raise ValueError("days_since_last_order cannot be negative.")
            if int_days > 36500:
                raise ValueError("days_since_last_order exceeds reasonable limit (100 years).")
            # Customers whose last order was N+ days ago or who have never placed an order
            predicates.append(
                sql.SQL(
                    "(last_order_at IS NULL OR last_order_at <= CURRENT_TIMESTAMP - (%s * INTERVAL '1 day'))"
                )
            )
            params.append(int_days)

        elif key == "churn_score_min":
            try:
                score = float(val)
            except (ValueError, TypeError):
                raise ValueError("churn_score_min must be a valid number.")
            if math.isnan(score) or math.isinf(score):
                raise ValueError("churn_score_min must be a finite number.")
            if score < 0.0 or score > 100.0:
                raise ValueError("churn_score_min must be between 0.0 and 100.0.")
            predicates.append(sql.SQL("COALESCE(churn_score, 0.0) >= %s"))
            params.append(score)

    # Range validation: min <= max
    if min_spent is not None and max_spent is not None and min_spent > max_spent:
        raise ValueError(
            f"min_total_spent (${min_spent}) cannot be greater than max_total_spent (${max_spent})."
        )

    if predicates:
        where_clause = sql.SQL("WHERE ") + sql.SQL(" AND ").join(predicates)
    else:
        where_clause = sql.SQL("")

    return where_clause, params
