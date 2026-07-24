# Transfer Mates

Discover the hidden relationships behind football transfers.

## Current release

**v0.1.0 Beta — RC1**

The static GitHub Pages site covers canonical transfer movements involving clubs from Europe's Big Five leagues between 2015/16 and 2025/26.

## Publishing from a mobile or iPad

The release deliberately uses a flat repository structure. Upload or replace all files directly in the repository root; no folders need to be created.

Required files:
- `index.html`
- `styles.css`
- `app.js`
- `meta.json`
- `clubs.json`
- `routes.json`
- `transfers.json`
- `README.md`
- `CHANGELOG.md`

## Analytical safeguards

- A route requires at least one movement in each direction.
- Non-club states such as `Without Club`, `Retired`, `Career break`, `Unknown` and placeholders are excluded from rankings.
- Route totals are reconciled to the underlying transfer records.
- Duplicate pairs and self-routes are rejected during release validation.
- Transfer fees are displayed as reported estimates and retain confidence labels.
