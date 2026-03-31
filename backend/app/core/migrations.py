"""
DEPRECATED — this module is no longer called at startup.

Schema migrations are now managed by Alembic:
  backend/alembic/versions/0001_baseline.py  — absorbs all changes that were here
  backend/alembic/versions/0002_*            — CHECK constraints, indexes, JSONB

Common commands (run from backend/):
  alembic upgrade head          # apply all pending migrations
  alembic current               # show current revision
  alembic history               # list all revisions
  alembic downgrade -1          # roll back one revision
  alembic revision -m "msg"     # create a new empty migration
  alembic revision --autogenerate -m "msg"  # auto-detect ORM changes
  alembic stamp 0001            # mark an existing DB as being at the baseline
                                # (use this when upgrading from the pre-Alembic version)
"""
