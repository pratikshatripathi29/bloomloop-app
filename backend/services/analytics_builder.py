from typing import Any, Dict, List, Optional, Tuple
from psycopg import sql
from psycopg.rows import dict_row

from core.database import get_db_connection
from services.segment_filters import build_segment_filter_clause

# Fixed allow-list for metrics
ALLOWED_METRICS: Dict[str, Dict[str, Any]] = {
    "total_customers": {
        "label": "Total Customers",
        "sql": sql.SQL("COUNT(*)"),
        "format": "integer",
    },
    "total_revenue": {
        "label": "Total Revenue",
        "sql": sql.SQL("COALESCE(SUM(total_spent), 0)"),
        "format": "currency",
    },
    "average_order_value": {
        "label": "Average Order Value",
        "sql": sql.SQL("COALESCE(SUM(total_spent) / NULLIF(SUM(order_count), 0), 0)"),
        "format": "currency",
    },
    "average_total_spent": {
        "label": "Average Spent per Customer",
        "sql": sql.SQL("COALESCE(AVG(total_spent), 0)"),
        "format": "currency",
    },
    "total_orders": {
        "label": "Total Orders Placed",
        "sql": sql.SQL("COALESCE(SUM(order_count), 0)"),
        "format": "integer",
    },
    "average_churn_score": {
        "label": "Average Churn Risk Score",
        "sql": sql.SQL("COALESCE(AVG(churn_score), 0)"),
        "format": "number",
    },
}

# Fixed allow-list for grouping fields
ALLOWED_GROUP_BY: Dict[str, Dict[str, Any]] = {
    "city": {
        "label": "City",
        "sql": sql.SQL("COALESCE(NULLIF(TRIM(city), ''), 'Unknown')"),
    },
    "state": {
        "label": "State",
        "sql": sql.SQL("COALESCE(NULLIF(TRIM(state), ''), 'Unknown')"),
    },
    "country": {
        "label": "Country",
        "sql": sql.SQL("COALESCE(NULLIF(TRIM(country), ''), 'Unknown')"),
    },
}


def execute_analytics_spec(spec: Dict[str, Any], original_question: str) -> Dict[str, Any]:
    """Validate query specification against fixed allow-lists and construct/execute parameterized SQL.
    
    SECURITY GUARANTEES:
    - AI never writes or executes SQL.
    - SQL is strictly composed by backend using psycopg.sql composables and parameters.
    - Zero customer PII is accessed or transmitted.
    """
    raw_metric = str(spec.get("metric", "total_customers")).lower().strip()
    metric_key = raw_metric if raw_metric in ALLOWED_METRICS else "total_customers"
    metric_meta = ALLOWED_METRICS[metric_key]

    raw_group_by = spec.get("group_by")
    group_key = None
    if raw_group_by and isinstance(raw_group_by, str):
        clean_group = raw_group_by.lower().strip()
        if clean_group in ALLOWED_GROUP_BY:
            group_key = clean_group

    raw_filters = spec.get("filters", {})
    if not isinstance(raw_filters, dict):
        raw_filters = {}

    # Validate filters using segment_filters.py rules
    where_clause, params = build_segment_filter_clause(raw_filters)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            if group_key is None:
                # Scalar aggregate query
                query = (
                    sql.SQL("SELECT ")
                    + metric_meta["sql"]
                    + sql.SQL(" AS metric_value FROM customers ")
                    + where_clause
                    + sql.SQL(";")
                )
                cur.execute(query, tuple(params))
                row = cur.fetchone()
                val = float(row[0]) if row and row[0] is not None else 0.0
                if metric_meta["format"] == "integer":
                    val = int(val)
                else:
                    val = round(val, 2)

                return {
                    "question": original_question,
                    "title": spec.get("title") or metric_meta["label"],
                    "summary": spec.get("summary") or f"Computed {metric_meta['label']}",
                    "metric": metric_key,
                    "group_by": None,
                    "format": metric_meta["format"],
                    "result_type": "scalar",
                    "value": val,
                    "data": [{"label": metric_meta["label"], "value": val}],
                }
            else:
                # Grouped breakdown query
                group_meta = ALLOWED_GROUP_BY[group_key]
                group_expr = group_meta["sql"]

                query = (
                    sql.SQL("SELECT ")
                    + group_expr
                    + sql.SQL(" AS group_name, ")
                    + metric_meta["sql"]
                    + sql.SQL(" AS metric_value FROM customers ")
                    + where_clause
                    + sql.SQL(" GROUP BY group_name ORDER BY metric_value DESC LIMIT 15;")
                )
                cur.execute(query, tuple(params))
                rows = cur.fetchall()

                data_list = []
                for r in rows:
                    grp_name = str(r[0])
                    raw_val = float(r[1]) if r[1] is not None else 0.0
                    val = int(raw_val) if metric_meta["format"] == "integer" else round(raw_val, 2)
                    data_list.append({"group": grp_name, "value": val})

                return {
                    "question": original_question,
                    "title": spec.get("title") or f"{metric_meta['label']} by {group_meta['label']}",
                    "summary": spec.get("summary") or f"{metric_meta['label']} segmented across {group_meta['label']}",
                    "metric": metric_key,
                    "group_by": group_key,
                    "format": metric_meta["format"],
                    "result_type": "grouped",
                    "data": data_list,
                }
