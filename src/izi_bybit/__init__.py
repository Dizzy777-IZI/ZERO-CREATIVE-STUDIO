"""PROJECT IZI Bybit integration package.

This package exposes read-only account auditing only. It contains no order
placement, cancellation, leverage, margin-mode, or transfer operations.
"""
from .readonly import BybitReadOnlyClient, ReadOnlyViolation

__all__ = ["BybitReadOnlyClient", "ReadOnlyViolation"]
