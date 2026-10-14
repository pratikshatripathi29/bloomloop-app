from contextlib import asynccontextmanager, contextmanager
from typing import AsyncGenerator, Generator, Optional
import psycopg
from psycopg_pool import ConnectionPool
from fastapi import FastAPI
from core.config import settings

# Global connection pool instance
pool: Optional[ConnectionPool] = None


def init_db_pool() -> None:
    """Initialize and open the psycopg connection pool."""
    global pool
    if pool is None:
        pool = ConnectionPool(
            conninfo=settings.DATABASE_URL,
            min_size=0,
            max_size=10,
            timeout=2.0,
            open=True,
        )


def close_db_pool() -> None:
    """Close the psycopg connection pool and all active connections."""
    global pool
    if pool is not None:
        pool.close()
        pool = None


@contextmanager
def get_db_connection() -> Generator[psycopg.Connection, None, None]:
    """Context manager to borrow a connection from the pool and release it when done.
    
    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
    """
    if pool is None:
        raise RuntimeError(
            "Database connection pool is not initialized. Ensure application startup has completed."
        )
    with pool.connection() as conn:
        yield conn


def get_db() -> Generator[psycopg.Connection, None, None]:
    """FastAPI dependency that yields a database connection."""
    with get_db_connection() as conn:
        yield conn


def init_db_tables() -> None:
    """Ensure required database schema tables exist."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS customers (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        phone VARCHAR(50),
                        company VARCHAR(255),
                        city VARCHAR(100),
                        state VARCHAR(100),
                        country VARCHAR(100) DEFAULT 'USA',
                        total_spent NUMERIC(12, 2) DEFAULT 0.00,
                        order_count INT DEFAULT 0,
                        last_order_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS orders (
                        id SERIAL PRIMARY KEY,
                        customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                        amount NUMERIC(10, 2) NOT NULL,
                        status VARCHAR(50) DEFAULT 'completed',
                        order_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
                    CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
                    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

                    ALTER TABLE customers ADD COLUMN IF NOT EXISTS churn_score NUMERIC(5, 2) DEFAULT 0.00;

                    CREATE TABLE IF NOT EXISTS segments (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        filters JSONB NOT NULL DEFAULT '{}'::jsonb,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_segments_name ON segments(name);

                    CREATE TABLE IF NOT EXISTS campaigns (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        segment_id INT REFERENCES segments(id) ON DELETE SET NULL,
                        channel VARCHAR(50) NOT NULL DEFAULT 'email',
                        message TEXT NOT NULL,
                        status VARCHAR(50) NOT NULL DEFAULT 'queued',
                        total_recipients INT DEFAULT 0,
                        delivered_count INT DEFAULT 0,
                        failed_count INT DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

                    CREATE TABLE IF NOT EXISTS communications (
                        id SERIAL PRIMARY KEY,
                        campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                        customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                        channel VARCHAR(50) NOT NULL,
                        status VARCHAR(50) NOT NULL DEFAULT 'queued',
                        sent_at TIMESTAMPTZ,
                        delivered_at TIMESTAMPTZ,
                        error_message TEXT,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_communications_campaign_id ON communications(campaign_id);
                    CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
                """)
                conn.commit()
    except Exception:
        # Don't fail app initialization if database is temporarily unreachable
        pass


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI lifespan context manager handling startup and shutdown events."""
    # Startup: Open the connection pool (min_size=0 ensures instant non-blocking startup)
    init_db_pool()
    yield
    # Shutdown: Close the connection pool
    close_db_pool()
