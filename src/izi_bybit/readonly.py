"""Fail-closed, read-only Bybit V5 account audit.

No mutating Bybit methods are exposed by this adapter. The API key must report
readOnly=1 before any account, position, or open-order data is requested.
"""
from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any, Callable


class ReadOnlyViolation(RuntimeError):
    """Raised when the configured API key is not explicitly read-only."""


class BybitAPIError(RuntimeError):
    """Raised when Bybit returns an unexpected or unsuccessful response."""


@dataclass(frozen=True)
class BybitReadOnlyConfig:
    api_key: str
    api_secret: str
    testnet: bool = True
    domain: str = "bybit"
    tld: str = "com"
    account_type: str = "UNIFIED"
    settle_coin: str = "USDT"
    page_limit: int = 50
    max_pages: int = 20

    @classmethod
    def from_env(cls) -> "BybitReadOnlyConfig":
        api_key = os.environ.get("BYBIT_API_KEY", "").strip()
        api_secret = os.environ.get("BYBIT_API_SECRET", "").strip()
        if not api_key or not api_secret:
            raise ValueError(
                "BYBIT_API_KEY and BYBIT_API_SECRET must be configured on the server."
            )

        raw_testnet = os.environ.get("BYBIT_TESTNET", "true").strip().lower()
        if raw_testnet not in {"true", "false"}:
            raise ValueError("BYBIT_TESTNET must be 'true' or 'false'.")

        domain = os.environ.get("BYBIT_DOMAIN", "bybit").strip()
        tld = os.environ.get("BYBIT_TLD", "com").strip()
        account_type = os.environ.get("BYBIT_ACCOUNT_TYPE", "UNIFIED").strip().upper()
        if not domain or not tld:
            raise ValueError("BYBIT_DOMAIN and BYBIT_TLD must not be empty.")
        if account_type not in {"UNIFIED", "CONTRACT"}:
            raise ValueError("BYBIT_ACCOUNT_TYPE must be UNIFIED or CONTRACT.")

        return cls(
            api_key=api_key,
            api_secret=api_secret,
            testnet=(raw_testnet == "true"),
            domain=domain,
            tld=tld,
            account_type=account_type,
        )


def _result(response: Any, endpoint: str) -> dict[str, Any]:
    if not isinstance(response, dict):
        raise BybitAPIError(f"{endpoint}: response is not an object.")
    if response.get("retCode") != 0:
        code = response.get("retCode", "unknown")
        message = response.get("retMsg", "Unknown Bybit API error")
        raise BybitAPIError(f"{endpoint}: Bybit returned {code}: {message}")
    result = response.get("result")
    if not isinstance(result, dict):
        raise BybitAPIError(f"{endpoint}: missing result object.")
    return result


def _collect_pages(
    method: Callable[..., dict[str, Any]],
    endpoint: str,
    *,
    max_pages: int,
    **params: Any,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    cursor: str | None = None
    seen_cursors: set[str] = set()

    for _ in range(max_pages):
        request = dict(params)
        if cursor:
            request["cursor"] = cursor
        result = _result(method(**request), endpoint)
        page = result.get("list", [])
        if not isinstance(page, list):
            raise BybitAPIError(f"{endpoint}: result.list is not an array.")
        rows.extend(item for item in page if isinstance(item, dict))

        next_cursor = result.get("nextPageCursor") or ""
        if not next_cursor:
            return rows
        if not isinstance(next_cursor, str) or next_cursor in seen_cursors:
            raise BybitAPIError(f"{endpoint}: invalid or repeated pagination cursor.")
        seen_cursors.add(next_cursor)
        cursor = next_cursor

    raise BybitAPIError(
        f"{endpoint}: pagination exceeded the safety limit of {max_pages} pages."
    )


class BybitReadOnlyClient:
    """Read-only account audit wrapper around the official pybit HTTP client."""

    def __init__(
        self,
        session: Any,
        *,
        account_type: str = "UNIFIED",
        settle_coin: str = "USDT",
        page_limit: int = 50,
        max_pages: int = 20,
    ) -> None:
        self.__session = session
        self._account_type = account_type
        self._settle_coin = settle_coin
        self._page_limit = page_limit
        self._max_pages = max_pages

    @classmethod
    def from_config(cls, config: BybitReadOnlyConfig) -> "BybitReadOnlyClient":
        try:
            from pybit.unified_trading import HTTP
        except ImportError as exc:
            raise RuntimeError(
                "Install the optional dependency with: pip install '.[bybit-readonly]'"
            ) from exc

        session = HTTP(
            testnet=config.testnet,
            domain=config.domain,
            tld=config.tld,
            api_key=config.api_key,
            api_secret=config.api_secret,
            timeout=10,
            log_requests=False,
        )
        return cls(
            session,
            account_type=config.account_type,
            settle_coin=config.settle_coin,
            page_limit=config.page_limit,
            max_pages=config.max_pages,
        )

    def audit(self) -> dict[str, Any]:
        """Read API-key metadata, account, wallet, positions, and active orders."""
        key_result = _result(
            self.__session.get_api_key_information(),
            "GET /v5/user/query-api",
        )
        if str(key_result.get("readOnly")) != "1":
            raise ReadOnlyViolation(
                "API key is not explicitly read-only (readOnly != 1). "
                "Stop here and create a new read-only key in Bybit."
            )

        # Deliberately omit apiKey and all secret/token fields from the report.
        key_metadata = {
            "read_only": True,
            "created_at": key_result.get("createdAt"),
            "expires_at": key_result.get("expiredAt"),
            "ip_whitelist": key_result.get("ips", []),
            "permissions": key_result.get("permissions", {}),
        }

        account = _result(
            self.__session.get_account_info(),
            "GET /v5/account/info",
        )
        wallet = _result(
            self.__session.get_wallet_balance(accountType=self._account_type),
            "GET /v5/account/wallet-balance",
        )
        positions = _collect_pages(
            self.__session.get_positions,
            "GET /v5/position/list",
            max_pages=self._max_pages,
            category="linear",
            settleCoin=self._settle_coin,
            limit=200,
        )
        linear_orders = _collect_pages(
            self.__session.get_open_orders,
            "GET /v5/order/realtime (linear)",
            max_pages=self._max_pages,
            category="linear",
            settleCoin=self._settle_coin,
            openOnly=0,
            limit=self._page_limit,
        )
        spot_orders = _collect_pages(
            self.__session.get_open_orders,
            "GET /v5/order/realtime (spot)",
            max_pages=self._max_pages,
            category="spot",
            openOnly=0,
            limit=self._page_limit,
        )

        return {
            "mode": "READ_ONLY",
            "api_key": key_metadata,
            "account": account,
            "wallet": wallet,
            "linear_positions": positions,
            "linear_open_orders": linear_orders,
            "spot_open_orders": spot_orders,
            "mutations_performed": False,
        }


def build_client_from_env() -> BybitReadOnlyClient:
    """Build a read-only client from server-side environment variables."""
    return BybitReadOnlyClient.from_config(BybitReadOnlyConfig.from_env())
