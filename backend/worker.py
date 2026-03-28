"""RQ worker entry point.

Usage:
    python worker.py

Or with rq CLI:
    rq worker --with-scheduler

Ensure Redis is running and DATABASE_URL / SECRET_KEY are in the environment
(or backend/.env.dev is present) before starting.
"""
import logging
import os
import sys

# Add the backend directory to sys.path so app imports work
sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

from rq import Worker, Queue
from app.core.redis_client import get_redis
from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    r = get_redis()
    if r is None:
        logging.critical("Cannot start worker: Redis is unavailable at %s", settings.redis_url)
        sys.exit(1)

    queues = [Queue("default", connection=r)]
    worker = Worker(queues, connection=r)
    logging.info("RQ worker starting — listening on queue: default")
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
