## Canonical data contract

Learn and Practice share 12 canonical identities and one physical snapshot per domain. Source and license documentation, schema grain, counts and reproducible-build details live in `docs/sql-phase1/DATASETS.md`.

Operational source groups retain separate keys. For example, Retail's observed invoices and modeled online-shop order lines do not share customer identities. Join only declared relationships. Raw ingestion tables intentionally retain invalid source records for cleaning exercises; curated foreign keys remain valid.

Sports includes scheduled games, cancelled games, draws, team roles, player appearances, unused squad members and club-training bookings. Its data is deterministic and wholly fictional.

The old tools and projects retain compatibility fixtures for a later review. Their physical artifact choices are not part of the Learn/Practice UI.
