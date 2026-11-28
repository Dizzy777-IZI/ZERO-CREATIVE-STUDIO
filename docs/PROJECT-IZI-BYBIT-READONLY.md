# PROJECT IZI — Bybit read-only integration

## Scope and safety boundary

This phase connects to Bybit only to inspect API-key metadata, account settings,
wallet balances, USDT-settled linear positions, and active linear/spot orders.

The adapter intentionally exposes no order creation, amendment, cancellation,
leverage, margin-mode, transfer, or withdrawal method. It checks the API key's
`readOnly` flag and stops before reading account data unless the value is
`1`. The report omits the API key and never includes the API secret.

This code does not provision Oracle Cloud resources and does not connect to a
live account until an operator installs it on a server and supplies credentials
through server-side environment variables.

## Bybit API key setup

1. Sign in to the Bybit account using the normal official account website.
2. Open API Management and create a dedicated API key with **Read-Only** access.
3. Enable only the read permissions needed for account, wallet, positions, and
   order inspection. Do not enable Contract Trade, Spot Trade, Wallet Transfer,
   Withdraw, or any other write capability.
4. Bind the key to the Oracle VPS public IP after the VPS has a stable public IP.
5. Keep the API secret on the server only. Never paste it into chat, GitHub,
   browser JavaScript, issue comments, or a committed environment file.
6. If Bybit cannot create a read-only key with the required account scopes,
   stop and review the permissions before proceeding. Do not substitute a
   read-write key.

A dedicated read-only key is still sensitive: it can expose account balances,
positions, and order history. Protect it like a password.

## Installation

Python 3.11+ is required by this repository.

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[bybit-readonly]'
```

## Server-side configuration

Create a root-owned environment file on the VPS, for example
`/etc/izi/bybit-readonly.env`. Do not put real credentials in the repository.

```ini
BYBIT_API_KEY=replace_on_server
BYBIT_API_SECRET=replace_on_server
BYBIT_TESTNET=true
BYBIT_DOMAIN=bybit
BYBIT_TLD=com
BYBIT_ACCOUNT_TYPE=UNIFIED
```

Set `BYBIT_TESTNET=true` for the first connection test. For an actual account
audit, the operator must deliberately set it to `false` and use a key created
for the matching Bybit environment. The API host must match the account's
registration site. For example, the global Bybit domain uses `bybit.com`;
regional accounts may require a different domain/TLD. Confirm this in the
account's own Bybit API documentation before changing it.

Protect the file:

```bash
sudo install -d -m 700 -o root -g root /etc/izi
sudo chown root:root /etc/izi/bybit-readonly.env
sudo chmod 600 /etc/izi/bybit-readonly.env
```

Load it only into the audit process:

```bash
set -a
. /etc/izi/bybit-readonly.env
set +a
python -m izi_bybit.audit
```

Do not run shell tracing (`set -x`) while secrets are loaded. Do not print
environment variables in diagnostic output.

## What the audit reads

- API key metadata: verifies `readOnly=1`, expiry, IP allowlist, and reported
  permission metadata; omits the key value.
- Account configuration: `GET /v5/account/info`.
- Wallet: `GET /v5/account/wallet-balance`.
- USDT linear positions: `GET /v5/position/list?category=linear&settleCoin=USDT`.
- Active linear orders: `GET /v5/order/realtime?category=linear&settleCoin=USDT`.
- Active spot orders: `GET /v5/order/realtime?category=spot`.

Pagination is bounded. If the page limit is exceeded or the cursor repeats,
the audit fails rather than returning a potentially incomplete account view.

## Validation

```bash
PYTHONPATH=src python -m unittest tests.test_bybit_readonly -v
```

The unit tests use a fake session and make no network calls. They verify that
non-read-only keys are rejected before account reads, API errors fail closed,
pagination is bounded, and the report does not expose the API key.

A successful local unit test does not prove that Oracle networking, Bybit
credentials, account permissions, IP allowlisting, or the live API endpoint
are configured correctly.

## Current deployment status

- Oracle Always Free profile is prepared in `infra/oracle/always-free.yaml`.
- No Oracle VM, public IP, SSH access, or server-side secret store has been
  provisioned or verified.
- No Bybit API key has been created or connected.
- No order has been created, modified, or cancelled.
- This integration remains read-only by design.
