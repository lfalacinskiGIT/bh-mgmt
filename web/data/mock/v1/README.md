# Mock Data v1

This folder stores JSON datasets used by the Box Haus prototype.

## Dataset profiles

- baseline: default scenario with standard, representative values.
- stress: edge-case scenario with incomplete/misaligned records, KWS anomalies, and margin pressure.

## Files

- contracts-economics.json: baseline contract economics cards.
- contracts-economics.stress.json: stress contract economics cards.
- source-records.json: baseline management source records (revenue/cost).
- source-records.stress.json: stress management source records.
- source-cost-entries.json: baseline cost entries for KWS controls.
- source-cost-entries.stress.json: stress cost entries with anomalies.
- outside-contract-positions.json: baseline outside-contract positions.
- outside-contract-positions.stress.json: stress outside-contract positions.
- invoices.json: invoice list used by invoices screen sync prototype.

## Notes

- JSON is intentionally editable by non-developers for mockup workshops.
- Keep IDs stable where possible to avoid UI drilldown inconsistencies.
- Use baseline for demos and stress for control/regression walkthroughs.
