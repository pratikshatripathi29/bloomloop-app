import asyncio
from datetime import datetime, timedelta, timezone
import json
import logging
import random
from typing import List

from psycopg import sql
from psycopg.rows import dict_row

from core.database import get_db_connection
from services.segment_filters import build_segment_filter_clause

logger = logging.getLogger(__name__)

SIMULATED_FAILURES = [
    "Simulated: Recipient mailbox is full",
    "Simulated: Temporary carrier network timeout",
    "Simulated: Spam filter rejected message body",
    "Simulated: Domain MX record unresolved",
]


async def process_campaign(campaign_id: int) -> None:
    """Background processor for campaigns.
    
    1. Selects the segment's customers.
    2. Inserts 'queued' rows in communications table.
    3. Simulates delivery: sent -> delivered (~85%) or failed (~15%) with small delays.
    4. Updates communications and final campaign status.
    """
    logger.info("Starting processing for campaign ID %d", campaign_id)

    try:
        # Step 1: Fetch campaign and segment details
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    sql.SQL("""
                        SELECT id, name, segment_id, channel, message, status
                        FROM campaigns
                        WHERE id = %s;
                    """),
                    (campaign_id,),
                )
                campaign = cur.fetchone()

                if not campaign:
                    logger.error("Campaign %d not found for processing", campaign_id)
                    return

                segment_id = campaign["segment_id"]
                channel = campaign["channel"]

                # Step 2: Determine target customers
                if segment_id:
                    cur.execute(
                        sql.SQL("SELECT filters FROM segments WHERE id = %s;"),
                        (segment_id,),
                    )
                    seg_row = cur.fetchone()
                    raw_filters = seg_row["filters"] if seg_row else {}
                    if isinstance(raw_filters, str):
                        try:
                            raw_filters = json.loads(raw_filters)
                        except Exception:
                            raw_filters = {}

                    where_clause, params = build_segment_filter_clause(raw_filters)
                    cust_query = (
                        sql.SQL("SELECT id FROM customers ")
                        + where_clause
                        + sql.SQL(" ORDER BY id ASC;")
                    )
                    cur.execute(cust_query, tuple(params))
                else:
                    cur.execute(sql.SQL("SELECT id FROM customers ORDER BY id ASC;"))

                customers = cur.fetchall()
                customer_ids = [row["id"] for row in customers]

                if not customer_ids:
                    logger.info("No matching customers for campaign %d", campaign_id)
                    cur.execute(
                        sql.SQL("""
                            UPDATE campaigns
                            SET status = 'completed',
                                total_recipients = 0,
                                delivered_count = 0,
                                failed_count = 0,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s;
                        """),
                        (campaign_id,),
                    )
                    conn.commit()
                    return

                # Step 3: Insert initial 'queued' communications rows
                insert_comm_query = sql.SQL("""
                    INSERT INTO communications (campaign_id, customer_id, channel, status)
                    VALUES (%s, %s, %s, 'queued')
                    RETURNING id;
                """)

                comm_ids: List[int] = []
                for cid in customer_ids:
                    cur.execute(insert_comm_query, (campaign_id, cid, channel))
                    row = cur.fetchone()
                    comm_ids.append(row["id"])

                # Mark campaign as processing
                cur.execute(
                    sql.SQL("""
                        UPDATE campaigns
                        SET status = 'processing',
                            total_recipients = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s;
                    """),
                    (len(comm_ids), campaign_id),
                )
                conn.commit()

        # Step 4: Simulate delivery with small delays
        delivered_count = 0
        failed_count = 0

        for comm_id in comm_ids:
            # Small realistic delay between message dispatches
            await asyncio.sleep(0.06)

            # Random simulation: ~85% delivered, ~15% failed
            is_success = random.random() < 0.85
            now = datetime.now(timezone.utc)

            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    if is_success:
                        delivered_count += 1
                        cur.execute(
                            sql.SQL("""
                                UPDATE communications
                                SET status = 'delivered',
                                    sent_at = %s,
                                    delivered_at = %s,
                                    error_message = NULL
                                WHERE id = %s;
                            """),
                            (now, now + timedelta(milliseconds=random.randint(200, 1500)), comm_id),
                        )
                    else:
                        failed_count += 1
                        error_msg = random.choice(SIMULATED_FAILURES)
                        cur.execute(
                            sql.SQL("""
                                UPDATE communications
                                SET status = 'failed',
                                    sent_at = %s,
                                    delivered_at = NULL,
                                    error_message = %s
                                WHERE id = %s;
                            """),
                            (now, error_msg, comm_id),
                        )
                    conn.commit()

        # Step 5: Mark campaign completed and persist final statistics
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL("""
                        UPDATE campaigns
                        SET status = 'completed',
                            delivered_count = %s,
                            failed_count = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s;
                    """),
                    (delivered_count, failed_count, campaign_id),
                )
                conn.commit()

        logger.info(
            "Campaign %d processed successfully: %d delivered, %d failed",
            campaign_id,
            delivered_count,
            failed_count,
        )

    except Exception as exc:
        logger.error("Error processing campaign %d: %s", campaign_id, exc, exc_info=True)
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        sql.SQL("""
                            UPDATE campaigns
                            SET status = 'failed',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s;
                        """),
                        (campaign_id,),
                    )
                    conn.commit()
        except Exception:
            pass
