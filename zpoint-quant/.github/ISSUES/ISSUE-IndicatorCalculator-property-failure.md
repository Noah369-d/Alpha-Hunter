Title: [Property Failure] IndicatorCalculator: RSI and indicators not handling certain price arrays

Description:
Two failing properties were observed in indicator-related property tests (RSI and handling constant prices).

Details / Counterexamples (from local run):
1) RSI responds to price trends
- Counterexample: [50,1.7241380214691162]
- Seed: 761981622
- Path: "0:0:3:3:0:1:2:0:0:0:1:0:1:1"
- Error: "All prices must be valid non-negative numbers" thrown by `IndicatorCalculator.calculateRSI` at src/utils/IndicatorCalculator.js:70

2) All indicators should handle constant prices
- Counterexample: [10,50]
- Seed: -278718907
- Path: "0:0:0"
- Failure: property returned false for a constant price input

Reproduction:
- Run `npm run test:property` and observe failures in `src/utils/IndicatorCalculator.property.test.js`.
- Re-run with given seeds using `fc.assert(..., { seed: <seed>, verbose: true })` to reproduce.

Suggested investigation areas:
- Ensure IndicatorCalculator functions accept and return defined outputs for constant price arrays and small arrays.
- RSI should handle small inputs gracefully and either return a defined numeric value (e.g., 0 / 100 / NaN) or throw a documented error; tests should reflect the desired policy.
- Add defensive checks for NaN/invalid numbers and explicit handling for constant inputs where applicable.

Labels: testing, property-tests, indicator

Assignee: @maintainers

Notes:
- I can prepare a PR that adds guard clauses and tests for these edge cases if you'd like.