Title: docs: add architecture, developer guide, testing guide, contributing, and SignalGenerator plan

Summary:
This PR adds repository-level documentation to help contributors and AI agents onboard quickly, and drafts three issue reports for failing property tests discovered during local runs.

Files added/modified:
- Added: `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, `TESTING.md`, `CONTRIBUTING.md`, `SIGNAL_GENERATOR.md`
- Added: three issue drafts in `.github/ISSUES/` for BacktestEngine, IndicatorCalculator, and StrategyManager property failures
- Modified: `E2E_README.md` (expanded Playwright guidance)
- Modified: `.github/copilot-instructions.md` (improved, actionable guidance)

Why:
- Tests (property-based) revealed 3 failing properties. The new documentation includes reproduction steps and debugging tips for property tests (how to use fast-check's seed/path).
- The repository lacked consolidated architecture and developer onboarding docs. The added files aim to make onboarding and automated agent work more efficient.

Notes:
- I attempted to push branch `docs/add-guides-and-issues` to `origin`, but the push failed due to a network error: `Recv failure: Connection was reset`.
- The branch and commits are available locally; please push when network is available or allow me to retry.

Next steps suggested in this PR:
1. Push branch and open PR on GitHub.
2. Tag maintainers and assign reviewers.
3. Optionally, run CI and address any linter/test issues from the initial run.
4. After merging docs, open separate PRs for fixes to the failing property tests (I can implement fixes if you prefer).

Issues created as drafts (links/filenames):
- `.github/ISSUES/ISSUE-BacktestEngine-property-failure.md`
- `.github/ISSUES/ISSUE-IndicatorCalculator-property-failure.md`
- `.github/ISSUES/ISSUE-StrategyManager-property-failure.md`

If you want, I can retry pushing now or prepare a GitHub Actions workflow for E2E tests (`.github/workflows/e2e.yml`).