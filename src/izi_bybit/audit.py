"""CLI entry point for a one-shot Bybit read-only account audit."""
from __future__ import annotations

from datetime import datetime, timezone
import json
import sys

from .readonly import build_client_from_env


def main() -> int:
    try:
        snapshot = build_client_from_env().audit()
    except Exception as exc:  # CLI boundary: concise error, never print credentials.
        print(f"PROJECT IZI read-only audit failed: {exc}", file=sys.stderr)
        return 1

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project": "PROJECT IZI",
        "snapshot": snapshot,
    }
    print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
