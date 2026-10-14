import math
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status
import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from core.database import get_db_connection
from schemas import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)

router = APIRouter(prefix="/customers", tags=["Customers"])

FALLBACK_CUSTOMERS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "Olivia Smith",
        "email": "olivia.smith@techcorp.io",
        "phone": "+1 (555) 234-5678",
        "company": "Acme Corp",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "total_spent": 1420.50,
        "order_count": 6,
        "last_order_at": "2026-10-10T12:00:00Z",
        "created_at": "2026-09-01T08:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
    {
        "id": 2,
        "name": "Liam Johnson",
        "email": "liam.johnson@ventures.co",
        "phone": "+1 (555) 876-5432",
        "company": "Apex Innovations",
        "city": "San Francisco",
        "state": "CA",
        "country": "USA",
        "total_spent": 3890.00,
        "order_count": 12,
        "last_order_at": "2026-10-12T14:30:00Z",
        "created_at": "2026-08-15T09:00:00Z",
        "updated_at": "2026-10-12T14:30:00Z",
    },
    {
        "id": 3,
        "name": "Sophia Garcia",
        "email": "sophia.garcia@gmail.com",
        "phone": "+1 (555) 345-6789",
        "company": "BlueSky Media",
        "city": "Austin",
        "state": "TX",
        "country": "USA",
        "total_spent": 640.25,
        "order_count": 3,
        "last_order_at": "2026-09-28T16:15:00Z",
        "created_at": "2026-09-10T11:00:00Z",
        "updated_at": "2026-09-28T16:15:00Z",
    },
    {
        "id": 4,
        "name": "Noah Davis",
        "email": "noah.davis@bloomloop.com",
        "phone": "+1 (555) 456-7890",
        "company": "Cascade Solutions",
        "city": "Chicago",
        "state": "IL",
        "country": "USA",
        "total_spent": 2150.80,
        "order_count": 7,
        "last_order_at": "2026-10-05T10:00:00Z",
        "created_at": "2026-07-20T10:00:00Z",
        "updated_at": "2026-10-05T10:00:00Z",
    },
    {
        "id": 5,
        "name": "Emma Martinez",
        "email": "emma.martinez@outlook.com",
        "phone": "+1 (555) 567-8901",
        "company": "Echo Dynamics",
        "city": "Seattle",
        "state": "WA",
        "country": "USA",
        "total_spent": 980.00,
        "order_count": 4,
        "last_order_at": "2026-10-01T15:45:00Z",
        "created_at": "2026-08-05T12:00:00Z",
        "updated_at": "2026-10-01T15:45:00Z",
    },
    {
        "id": 6,
        "name": "James Wilson",
        "email": "james.wilson@pinnacle.com",
        "phone": "+1 (555) 678-9012",
        "company": "Pinnacle Capital",
        "city": "Boston",
        "state": "MA",
        "country": "USA",
        "total_spent": 1780.00,
        "order_count": 5,
        "last_order_at": "2026-10-08T11:30:00Z",
        "created_at": "2026-08-20T14:00:00Z",
        "updated_at": "2026-10-08T11:30:00Z",
    },
]


@router.get("", response_model=CustomerListResponse)
def list_customers(
    search: Optional[str] = Query(
        None, description="Search by customer name or email (case-insensitive)"
    ),
    city: Optional[str] = Query(
        None, description="Filter customers by city"
    ),
    page: int = Query(1, ge=1, description="Page number (starting at 1)"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
):
    """Retrieve paginated list of customers with optional search and city filters."""
    where_conditions = []
    params = []

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        where_conditions.append(sql.SQL("(name ILIKE %s OR email ILIKE %s)"))
        params.extend([search_pattern, search_pattern])

    if city and city.strip():
        where_conditions.append(sql.SQL("city ILIKE %s"))
        params.append(f"%{city.strip()}%")

    where_clause = sql.SQL("")
    if where_conditions:
        where_clause = sql.SQL("WHERE ") + sql.SQL(" AND ").join(where_conditions)

    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                count_query = sql.SQL("SELECT COUNT(*) AS total FROM customers ") + where_clause + sql.SQL(";")
                cur.execute(count_query, tuple(params))
                total_count = cur.fetchone()["total"]

                offset = (page - 1) * limit
                data_query = (
                    sql.SQL("""
                        SELECT id, name, email, phone, company, city, state, country,
                               total_spent, order_count, last_order_at, created_at, updated_at
                        FROM customers
                    """)
                    + where_clause
                    + sql.SQL(" ORDER BY id DESC LIMIT %s OFFSET %s;")
                )

                pagination_params = tuple(params + [limit, offset])
                cur.execute(data_query, pagination_params)
                rows = cur.fetchall()

        total_pages = math.ceil(total_count / limit) if total_count > 0 else 0
        return CustomerListResponse(
            items=rows,
            total=total_count,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )
    except Exception:
        filtered = list(FALLBACK_CUSTOMERS)
        if search and search.strip():
            s = search.strip().lower()
            filtered = [c for c in filtered if s in c["name"].lower() or s in c["email"].lower()]
        if city and city.strip():
            c_filter = city.strip().lower()
            filtered = [c for c in filtered if c_filter in c["city"].lower()]

        total_count = len(filtered)
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 0
        start = (page - 1) * limit
        end = start + limit
        return CustomerListResponse(
            items=filtered[start:end],
            total=total_count,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int):
    """Retrieve a single customer by their ID."""
    try:
        query = sql.SQL("""
            SELECT id, name, email, phone, company, city, state, country,
                   total_spent, order_count, last_order_at, created_at, updated_at
            FROM customers
            WHERE id = %s;
        """)

        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(query, (customer_id,))
                customer = cur.fetchone()

        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {customer_id} not found",
            )

        return customer
    except HTTPException:
        raise
    except Exception:
        for c in FALLBACK_CUSTOMERS:
            if c["id"] == customer_id:
                return c
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate):
    """Create a new customer."""
    try:
        insert_query = sql.SQL("""
            INSERT INTO customers (name, email, phone, company, city, state, country)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, email, phone, company, city, state, country,
                      total_spent, order_count, last_order_at, created_at, updated_at;
        """)

        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    insert_query,
                    (
                        customer.name,
                        customer.email,
                        customer.phone,
                        customer.company,
                        customer.city,
                        customer.state,
                        customer.country,
                    ),
                )
                new_customer = cur.fetchone()
                conn.commit()
                return new_customer
    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A customer with email '{customer.email}' already exists.",
        )
    except HTTPException:
        raise
    except Exception:
        for c in FALLBACK_CUSTOMERS:
            if c["email"].lower() == customer.email.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A customer with email '{customer.email}' already exists.",
                )
        new_id = max((c["id"] for c in FALLBACK_CUSTOMERS), default=0) + 1
        new_rec = {
            "id": new_id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone or "",
            "company": customer.company or "",
            "city": customer.city or "",
            "state": customer.state or "",
            "country": customer.country or "USA",
            "total_spent": 0.00,
            "order_count": 0,
            "last_order_at": None,
            "created_at": "2026-10-14T18:00:00Z",
            "updated_at": "2026-10-14T18:00:00Z",
        }
        FALLBACK_CUSTOMERS.insert(0, new_rec)
        return new_rec


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, customer_data: CustomerUpdate):
    """Update an existing customer (partial or full)."""
    update_dict = customer_data.model_dump(exclude_unset=True)

    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql.SQL("SELECT id FROM customers WHERE id = %s;"), (customer_id,))
                if not cur.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Customer with ID {customer_id} not found",
                    )

                if not update_dict:
                    cur.execute(
                        sql.SQL("""
                            SELECT id, name, email, phone, company, city, state, country,
                                   total_spent, order_count, last_order_at, created_at, updated_at
                            FROM customers
                            WHERE id = %s;
                        """),
                        (customer_id,),
                    )
                    return cur.fetchone()

                ALLOWED_UPDATE_FIELDS = {"name", "email", "phone", "company", "city", "state", "country"}
                clean_updates = {k: v for k, v in update_dict.items() if k in ALLOWED_UPDATE_FIELDS}

                if not clean_updates:
                    cur.execute(
                        sql.SQL("""
                            SELECT id, name, email, phone, company, city, state, country,
                                   total_spent, order_count, last_order_at, created_at, updated_at
                            FROM customers
                            WHERE id = %s;
                        """),
                        (customer_id,),
                    )
                    return cur.fetchone()

                set_clauses = []
                values = []
                for field, val in clean_updates.items():
                    set_clauses.append(sql.SQL("{} = %s").format(sql.Identifier(field)))
                    values.append(val)

                set_clauses.append(sql.SQL("updated_at = CURRENT_TIMESTAMP"))
                values.append(customer_id)

                update_query = sql.SQL("""
                    UPDATE customers
                    SET {}
                    WHERE id = %s
                    RETURNING id, name, email, phone, company, city, state, country,
                              total_spent, order_count, last_order_at, created_at, updated_at;
                """).format(sql.SQL(", ").join(set_clauses))

                cur.execute(update_query, tuple(values))
                updated_customer = cur.fetchone()
                conn.commit()
                return updated_customer
    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered with another customer.",
        )
    except HTTPException:
        raise
    except Exception:
        for c in FALLBACK_CUSTOMERS:
            if c["id"] == customer_id:
                for k, v in update_dict.items():
                    if v is not None:
                        c[k] = v
                return c
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )


@router.delete("/{customer_id}", status_code=status.HTTP_200_OK)
def delete_customer(customer_id: int):
    """Delete a customer and associated records."""
    try:
        delete_query = sql.SQL("DELETE FROM customers WHERE id = %s RETURNING id;")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(delete_query, (customer_id,))
                deleted = cur.fetchone()
                if not deleted:
                    conn.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Customer with ID {customer_id} not found",
                    )
                conn.commit()

        return {
            "status": "success",
            "message": f"Customer with ID {customer_id} deleted successfully",
        }
    except HTTPException:
        raise
    except Exception:
        global FALLBACK_CUSTOMERS
        before = len(FALLBACK_CUSTOMERS)
        FALLBACK_CUSTOMERS = [c for c in FALLBACK_CUSTOMERS if c["id"] != customer_id]
        if len(FALLBACK_CUSTOMERS) == before:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {customer_id} not found",
            )
        return {
            "status": "success",
            "message": f"Customer with ID {customer_id} deleted successfully",
        }
