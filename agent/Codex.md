Maintain lightweight architecture notes for future agents.

When making non-trivial changes, update or create:

docs/architecture.md
- app purpose and scope
- high-level module map
- routing structure
- database/schema overview
- important invariants
- non-goals / intentional jank

docs/implementation-notes.md
- recent implementation decisions
- known sharp edges
- migration notes
- places future agents should inspect first
- gotchas that are not obvious from filenames

docs/data-model.md
- key tables
- relationships
- enum/status meanings
- lifecycle rules
- immutability rules

Rules:
- Keep docs concise.
- Prefer bullets over prose.
- Do not duplicate entire code.
- Update docs in the same PR as code changes.
- If docs and code disagree, fix docs.
- Include “last updated” section with short changelog.
- Future agents should read these docs before scanning the whole repo.
