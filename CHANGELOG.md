# Changelog

## v0.2 TM-021B — Same-window exchanges

### Added
- A visible **Same-window exchanges** section on every relationship page.
- Expandable season/window cards showing the players moving in each direction.
- Movement and loan counts for each qualifying window.
- A clear empty state where a relationship is bidirectional overall but has no same-window exchange.

### Data rules
- A window qualifies only when at least one player moved in each direction during the same season and transfer window.
- Non-club entities remain excluded.
- The section reads from the precomputed and validated `same_window_exchanges.json` file introduced in TM-021A.

### Next
- TM-020: permanent/loan filtering, including recalculation of same-window exchanges.
