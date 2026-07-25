# Changelog

## v0.2.0 — TM-021A data engine

### Added

- Precomputed `same_window_exchanges.json` for eligible bidirectional club relationships.
- Canonical relationship IDs and route references.
- Transfer-level detail for every qualifying season/window in both directions.
- Loan flags and transfer types to support the forthcoming permanent/loan filter.
- Browser-side schema and integrity validation when the data loads.

### Definition

A same-window exchange is a season and transfer window in which at least one eligible player movement occurred in each direction between the same two clubs. One-way windows are excluded.

### Scope

This task adds the TM-021A data engine only. No visible interface changes are included yet.
