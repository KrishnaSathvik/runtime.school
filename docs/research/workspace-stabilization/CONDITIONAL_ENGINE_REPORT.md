# Conditional engine recovery batch

2026-10-21. Changes limited to SQL/Python execution clients and `tests/engine-preparation-recovery.test.ts`. No graders, fixtures, production gates or package policies changed.

## Reproduction before repair

Command: `npx vitest run tests/engine-preparation-recovery.test.ts`.

Initial run: **3 failed, 2 passed**, before the conditional client patch.

- `never resurrects a cancelled boot after a newer successful run`: after cancelling never-ready SQL A, completing B, and advancing beyond the original 12-second boot limit plus retry backoff, expected two workers but received three. The cancelled retry loop created an orphan worker.
- `cancelling during retry backoff prevents another worker`: boot failure followed by cancellation before the 400 ms retry; expected one worker but received two.
- `bounds stalled mounts separately from execution and retries the same hash`: a ready Python interpreter with a never-resolving dataset fetch still had no terminal result after 60,001 ms (`expected undefined to be 'crashed'`). The proposed separate 60-second download deadline was absent; this was not a Python execution-timeout failure.
- Existing behavior passed: package startup times out at its declared 120-second budget and later retry succeeds; cancelled package A cannot change the ready status of completed B. No speculative package-timeout redesign was made.

## Narrow repair

SQL preparation is generation-bound. Discard cancels the active boot timer/listeners; obsolete retry/backoff continuations cannot create workers or clear a newer readiness promise. The original three-attempt policy and Run/Check/dataset limits remain.

Each Python mount download/hash verification now has a separate 60-second deadline and its own AbortController. Stop/supersession immediately removes only that operation's still-pending matching cache entry, allowing a same-hash retry to start fresh. It does not abort a transport shared with preload/other consumers; that transport retains its own bounded deadline. Rejection evicts only the matching promise, so a late old failure cannot remove a replacement. Successful verified bytes remain reusable. Code execution still starts its clock only after preparation.

The added combined regression checks Stop → immediate same-hash retry → old request rejects → preload reuses the new pending request → new run succeeds. It also checks that Stop did not abort a potentially shared request or the replacement request.

## Verification

Final targeted command:

`npx vitest run tests/engine-preparation-recovery.test.ts tests/sql-client.test.ts tests/python-client.test.ts tests/python-operation-ownership.test.ts`

Result: **48/48 passed** across four files (new preparation recovery 6, SQL client 10, Python client 27, owned-operation UI/client 5).

`python3 docs/research/workspace-stabilization/verify_frozen.py`: **812 files verified**, no failures; worker changes remain only the earlier allowlisted expectedTotal response metadata.

These are controlled regression results. Parent-owned browser journeys/preparation evidence and independent review are recorded in the verification ledger. No production isolation validation or deployment is implied.
