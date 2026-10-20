import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.campaign import Campaign
from app.services.campaign_service import dispatch_campaign_jobs

logger = logging.getLogger("kaveri_worker")


async def run_campaign_dispatcher_cycle():
    """
    Scans for scheduled campaigns whose scheduled_at <= now() and triggers dispatch.
    """
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        stmt = select(Campaign).where(
            and_(
                Campaign.status == "scheduled",
                Campaign.scheduled_at <= now,
            )
        )
        res = await db.execute(stmt)
        campaigns = list(res.scalars().all())

        for c in campaigns:
            logger.info(f"Triggering scheduled dispatch for campaign {c.id} ('{c.name}')")
            try:
                stats = await dispatch_campaign_jobs(db, c.id)
                logger.info(f"Campaign {c.id} dispatched: {stats}")
            except Exception as e:
                logger.error(f"Error dispatching campaign {c.id}: {str(e)}", exc_info=True)


async def start_worker_loop(interval_seconds: int = 30):
    """
    Background worker loop for production scheduler.
    """
    logger.info(f"Starting Kaveri Member Club background scheduler worker (interval: {interval_seconds}s)")
    while True:
        try:
            await run_campaign_dispatcher_cycle()
        except Exception as e:
            logger.error(f"Worker cycle error: {e}", exc_info=True)
        await asyncio.sleep(interval_seconds)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(start_worker_loop(interval_seconds=10))
