# COD return payouts

COD settlement uses RazorpayX Composite Payouts. Prepaid refunds continue to use
the original payment gateway. Historical manually settled returns cannot be paid again.

Configure these secrets on the backend hosting service:

- `RAZORPAYX_KEY_ID` and `RAZORPAYX_KEY_SECRET`: the active RazorpayX API credentials.
- `RAZORPAYX_ACCOUNT_NUMBER`: your RazorpayX funding account/customer identifier,
  not the customer's refund bank account. Match test/live mode to the keys.
- `RAZORPAYX_WEBHOOK_SECRET`: the secret chosen when configuring the webhook.

Allowlist the backend's outbound IP in RazorpayX. Configure the webhook as
`https://YOUR_BACKEND/api/razorpayx/webhook` and subscribe to payout events,
including `payout.processed`, `payout.failed`, `payout.reversed`, `payout.updated`,
`payout.queued`, `payout.pending` and `payout.initiated`.

Payouts require warehouse receipt, QC PASS, valid customer bank/UPI details and
a balance sufficient for the amount plus provider fees/tax. Amounts are in INR
(minimum ₹1). Full and partial payout actions are available in Return Requests.
The customer's order page displays safe payout messages and the explicit customer
note; provider credentials, request payloads and raw diagnostics remain admin-only.

Only a provider `processed` result completes the refund. Queued/processing
payouts remain open, and failures/reversals retain the unpaid refund. Status checks
and signed webhooks fetch the latest provider state. Network failures retain the
same persisted payload and idempotency key. Only an explicitly confirmed retry of
a definitively failed/reversed/cancelled/rejected payout creates a new attempt.
Use the RazorpayX dashboard to reconcile an uncertain payout before intervening.

References:
- https://razorpay.com/docs/api/x/payout-composite/create/bank-account
- https://razorpay.com/docs/api/x/payout-composite/create/vpa
- https://razorpay.com/docs/api/x/payout-idempotency/make-request
- https://razorpay.com/docs/webhooks/validate-test
