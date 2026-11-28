import unittest

from izi_bybit.readonly import (
    BybitAPIError,
    BybitReadOnlyClient,
    ReadOnlyViolation,
    _collect_pages,
)


class FakeSession:
    def __init__(self, read_only=1):
        self.read_only = read_only
        self.calls = []

    def get_api_key_information(self):
        self.calls.append(("api_key", {}))
        return {
            "retCode": 0,
            "result": {
                "readOnly": self.read_only,
                "apiKey": "MUST_NOT_APPEAR",
                "createdAt": "2026-01-01T00:00:00Z",
                "expiredAt": "",
                "ips": ["203.0.113.10"],
                "permissions": {"ContractTrade": [], "Spot": [], "Wallet": []},
            },
        }

    def get_account_info(self):
        self.calls.append(("account", {}))
        return {"retCode": 0, "result": {"marginMode": "REGULAR_MARGIN"}}

    def get_wallet_balance(self, **kwargs):
        self.calls.append(("wallet", kwargs))
        return {"retCode": 0, "result": {"list": [{"accountType": kwargs["accountType"]}]}}

    def get_positions(self, **kwargs):
        self.calls.append(("positions", kwargs))
        return {"retCode": 0, "result": {"list": [{"symbol": "BTCUSDT", "size": "0"}]}}

    def get_open_orders(self, **kwargs):
        self.calls.append(("orders", kwargs))
        return {"retCode": 0, "result": {"list": [], "nextPageCursor": ""}}


class BybitReadOnlyTests(unittest.TestCase):
    def test_audit_reads_account_and_open_orders(self):
        session = FakeSession()
        report = BybitReadOnlyClient(session).audit()

        self.assertEqual(report["mode"], "READ_ONLY")
        self.assertTrue(report["api_key"]["read_only"])
        self.assertFalse(report["mutations_performed"])
        self.assertEqual(len(report["linear_positions"]), 1)
        self.assertEqual(len(report["linear_open_orders"]), 0)
        self.assertEqual(len(report["spot_open_orders"]), 0)
        self.assertNotIn("apiKey", report["api_key"])
        self.assertNotIn("MUST_NOT_APPEAR", repr(report))

        called = [name for name, _ in session.calls]
        self.assertEqual(
            called,
            ["api_key", "account", "wallet", "positions", "orders", "orders"],
        )

    def test_rejects_non_read_only_key_before_account_reads(self):
        session = FakeSession(read_only=0)
        with self.assertRaises(ReadOnlyViolation):
            BybitReadOnlyClient(session).audit()
        self.assertEqual([name for name, _ in session.calls], ["api_key"])

    def test_rejects_missing_read_only_flag(self):
        session = FakeSession()
        session.get_api_key_information = lambda: {
            "retCode": 0,
            "result": {"apiKey": "secretless"},
        }
        with self.assertRaises(ReadOnlyViolation):
            BybitReadOnlyClient(session).audit()

    def test_rejects_api_errors(self):
        session = FakeSession()
        session.get_account_info = lambda: {
            "retCode": 10003,
            "retMsg": "invalid key",
            "result": {},
        }
        with self.assertRaises(BybitAPIError):
            BybitReadOnlyClient(session).audit()

    def test_paginates_open_orders(self):
        pages = [
            {"retCode": 0, "result": {"list": [{"id": "1"}], "nextPageCursor": "cursor-1"}},
            {"retCode": 0, "result": {"list": [{"id": "2"}], "nextPageCursor": ""}},
        ]
        seen = []

        def fake_method(**kwargs):
            seen.append(kwargs.copy())
            return pages.pop(0)

        rows = _collect_pages(fake_method, "test", max_pages=3, category="linear")
        self.assertEqual(rows, [{"id": "1"}, {"id": "2"}])
        self.assertNotIn("cursor", seen[0])
        self.assertEqual(seen[1]["cursor"], "cursor-1")

    def test_rejects_repeated_pagination_cursor(self):
        def fake_method(**kwargs):
            return {"retCode": 0, "result": {"list": [], "nextPageCursor": "same"}}

        with self.assertRaises(BybitAPIError):
            _collect_pages(fake_method, "test", max_pages=3)


if __name__ == "__main__":
    unittest.main()
