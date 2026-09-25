# Coin catalog

The app fetches `GET /v2/coin-plans` after device sign-in. The response contains `plans` and `testMode`. A plan contains `id`, `label`, `coins`, `artwork` (0–2) and `recommended`. D1 `coin_plans` owns the catalog, active status and sort order. There are no production client fallback packs.

`POST /v2/wallet/test-purchase` accepts `{ "id": "<purchase UUID>", "planId": "party" }`. The server resolves the active plan and its coin amount at insertion time. A receipt and its ledger credit commit atomically. Retrying the same ID returns the original credit, even after a plan changes or is disabled. Reusing an ID for another plan is rejected. The response is `{ wallet, creditedCoins }`; the UI displays the credited amount. Client-supplied amounts cannot increase the credit.

Old 1.2.0 amount-based requests remain compatible only when their amount identifies one active plan. Existing wallet balances and table memberships are preserved. Disabling all plans produces an empty shop, and fetch failures produce a retry state rather than invented offers.

TODO: authenticated admin CRUD, catalog audit history, payment-provider checkout, versioned price/currency quotes, verified payment webhooks and refund policy. Keep payment controls disabled until that system is implemented. Free test purchases remain controlled by `TEST_COIN_PURCHASES`.
