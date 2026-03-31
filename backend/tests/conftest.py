"""pytest configuration for the backend test suite."""
import pytest


# Ensure pytest-asyncio treats all async tests in this package as asyncio mode
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
