Title: [Property Failure] BacktestEngine: Total trades != winning + losing trades

Description:
The property test "Total trades equals winning plus losing trades" fails under property testing (fast-check).

Details / Counterexample (from local run):
- Test: src/utils/BacktestEngine.property.test.js > Performance Metrics Properties > Property: Total trades equals winning plus losing trades
- Counterexample (shrunk):
  - Value: [[{"profit":0,"entryTime":new Date("1970-01-01T00:00:00.000Z"),"exitTime":new Date("1970-01-01T00:00:00.000Z")}], 1000]
  - Seed: -1952293897
  - Path: "7:2:0:1:2:2:1:0:0:0"

Reproduction:
1. Run property tests locally: `npm run test:property`
2. Re-run with fixed seed: modify the test to call `fc.assert(prop, { seed: -1952293897, verbose: true })` or run using environment with verbose output to reproduce the failing case.

Expected behavior:
- totalTrades should equal the sum of winningTrades.length + losingTrades.length for any generated trade array.

Suggested investigation areas:
- Inspect how totalTrades/winningTrades/losingTrades are computed in BacktestEngine.calculateMetrics.
- Edge cases: trade objects with profit === 0 (ties), undefined profit fields, trades with missing entry/exit times, or trades with zero quantity.
- Add defensive checks in `calculateMetrics` to treat zero/undefined profits deterministically (e.g., count zero-profit as neither win nor loss or define a policy and update test). Also add a property test which makes explicit the expected behavior for profit === 0.

Labels: testing, property-tests, priority-high

Assignee: @maintainers

Notes:
- I can open a PR with a proposed patch and tests if you want me to attempt a fix.