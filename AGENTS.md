# Agent Instructions

Before editing code:

1. Read:
   - README.md
   - docs/architecture.md
   - docs/data-model.md
   - docs/implementation-notes.md

2. Keep this project intentionally small and janky.
   - This is not QuickBooks.
   - This is not NetSuite.
   - This is not a full accounting system.

3. Prefer boring schema changes and small UI changes.

4. Do not add:
   - double-entry accounting
   - payroll
   - bank feeds
   - full audit/event sourcing
   - complex permissions
   - accounting automation

5. When adding features, update the docs above.

6. If unsure, add a review_needed flag or simple note field instead of building a subsystem.

