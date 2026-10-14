"""Database Seeding Script for BloomLoop CRM.

Populates the database with:
- 40 realistic fake customers
- 150 fake orders
- Updates each customer's total_spent, order_count, and last_order_at.
"""

from datetime import datetime, timedelta, timezone
import random
import sys
import psycopg
from psycopg.rows import dict_row

from core.config import settings

# Realistic seed data pools
FIRST_NAMES = [
    "Liam", "Olivia", "Noah", "Emma", "Oliver", "Charlotte", "Elijah", "Amelia",
    "James", "Sophia", "William", "Isabella", "Benjamin", "Ava", "Lucas", "Mia",
    "Henry", "Evelyn", "Alexander", "Harper", "Sebastian", "Luna", "Jack", "Camila",
    "Samuel", "Gianna", "Daniel", "Elizabeth", "Matthew", "Eleanor", "David", "Ella",
    "Joseph", "Abigail", "Carter", "Avery", "Owen", "Scarlett", "Wyatt", "Emily"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"
]

COMPANIES = [
    "Acme Corp", "Apex Innovations", "BlueSky Media", "Cascade Solutions",
    "Echo Dynamics", "Frontier Retail", "Horizon Health", "Ironwood Ventures",
    "Kinetic Labs", "Lighthouse Tech", "Nexus Logistics", "Omni Global",
    "Pinnacle Capital", "Quantum Digital", "Radiant Systems", "Summit Advisory",
    "Terra Networks", "Unity Cloud", "Vanguard Financial", "Zenith Creative",
    "Starlight Software", "Solaris Design", "Beacon Consulting", "Atlas Commerce"
]

CITIES_STATES = [
    ("New York", "NY"), ("San Francisco", "CA"), ("Austin", "TX"),
    ("Seattle", "WA"), ("Chicago", "IL"), ("Boston", "MA"),
    ("Denver", "CO"), ("Miami", "FL"), ("Atlanta", "GA"),
    ("Los Angeles", "CA"), ("Portland", "OR"), ("San Diego", "CA"),
    ("Dallas", "TX"), ("Phoenix", "AZ"), ("Philadelphia", "PA")
]

DOMAINS = ["bloomloop.com", "gmail.com", "outlook.com", "techcorp.io", "ventures.co"]

ORDER_STATUSES = ["completed", "completed", "completed", "shipped", "processing"]


def seed_database():
    """Seed customers, orders, and update customer aggregates."""
    print("Connecting to database...")
    try:
        conn = psycopg.connect(settings.DATABASE_URL)
    except Exception as exc:
        print(f"Error connecting to database: {exc}")
        print("\nTip: Check that your DATABASE_URL in backend/.env is correct and that")
        print("outbound port 5432 is not blocked by your current network.")
        sys.exit(1)

    with conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # 1. Ensure tables exist
            print("Ensuring tables 'customers' and 'orders' exist...")
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
            """)

            # 2. Clear previous seed data cleanly
            print("Clearing existing demo data...")
            cur.execute("TRUNCATE TABLE orders, customers RESTART IDENTITY CASCADE;")

            # 3. Insert 40 realistic customers
            print("Inserting 40 realistic customers...")
            customer_insert_sql = """
                INSERT INTO customers (name, email, phone, company, city, state, country, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name;
            """

            random.seed(42)  # For reproducible realistic data
            customer_ids = []
            now = datetime.now(timezone.utc)

            for i in range(40):
                first = FIRST_NAMES[i % len(FIRST_NAMES)]
                last = LAST_NAMES[i % len(LAST_NAMES)]
                name = f"{first} {last}"
                domain = random.choice(DOMAINS)
                email = f"{first.lower()}.{last.lower()}{random.randint(10, 99)}@{domain}"
                phone = f"+1 ({random.randint(200, 999)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}"
                company = random.choice(COMPANIES)
                city, state = random.choice(CITIES_STATES)
                created_date = now - timedelta(days=random.randint(30, 365))

                cur.execute(
                    customer_insert_sql,
                    (
                        name,
                        email,
                        phone,
                        company,
                        city,
                        state,
                        "USA",
                        created_date,
                        created_date,
                    ),
                )
                row = cur.fetchone()
                customer_ids.append(row["id"])

            print(f"Successfully inserted {len(customer_ids)} customers.")

            # 4. Insert 150 fake orders
            print("Inserting 150 fake orders across customers...")
            order_insert_sql = """
                INSERT INTO orders (customer_id, amount, status, order_date, created_at)
                VALUES (%s, %s, %s, %s, %s);
            """

            for _ in range(150):
                cust_id = random.choice(customer_ids)
                amount = round(random.uniform(25.00, 1450.00), 2)
                status = random.choice(ORDER_STATUSES)
                order_date = now - timedelta(
                    days=random.randint(1, 180),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                )

                cur.execute(
                    order_insert_sql,
                    (cust_id, amount, status, order_date, order_date),
                )

            print("Successfully inserted 150 orders.")

            # 5. Update each customer's total_spent, order_count, and last_order_at
            print("Updating each customer's total_spent, order_count, and last_order_at...")
            update_aggregates_sql = """
                UPDATE customers c
                SET 
                    order_count = COALESCE(agg.cnt, 0),
                    total_spent = COALESCE(agg.total, 0.00),
                    last_order_at = agg.latest_order,
                    updated_at = CURRENT_TIMESTAMP
                FROM (
                    SELECT 
                        customer_id,
                        COUNT(*) AS cnt,
                        SUM(amount) AS total,
                        MAX(order_date) AS latest_order
                    FROM orders
                    GROUP BY customer_id
                ) agg
                WHERE c.id = agg.customer_id;
            """
            cur.execute(update_aggregates_sql)
            conn.commit()

            # 6. Fetch summary stats
            cur.execute("""
                SELECT 
                    COUNT(*) AS total_customers,
                    SUM(order_count) AS total_orders,
                    SUM(total_spent) AS total_revenue
                FROM customers;
            """)
            stats = cur.fetchone()

            print("\nDatabase Seeding Completed Successfully!")
            print("==========================================")
            print(f"Total Customers : {stats['total_customers']}")
            print(f"Total Orders    : {stats['total_orders']}")
            print(f"Total Revenue   : ${stats['total_revenue']:,.2f}")
            print("==========================================")


if __name__ == "__main__":
    seed_database()
