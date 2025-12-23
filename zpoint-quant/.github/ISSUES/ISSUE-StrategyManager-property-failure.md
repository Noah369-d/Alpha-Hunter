Title: [Property Failure] StrategyManager: Arbitrary strategies produce invalid/unsafe strategy code

Description:
Property tests for strategy management produced multiple failing cases where generated strategy code is invalid or returns unexpected values (e.g., `null` or missing `onBar` behaviors), causing unhandled rejections during property runs.

Representative counterexamples (from local run):
- Counterexample 1: [{"name":"!","code":"function onBar() { return { action: \"BUY\" } }","copyName":"! "}] (seed: see test output)
- Multiple other counterexamples included strategies with `code` returning `null` or returning simple `BUY` objects without expected fields.

Reproduction:
1. Run `npm run test:property`
2. Observe failures originating from `src/utils/StrategyManager.property.test.js` and related property runs

Suggested investigation/fixes:
- Tighten the Arbitrary for strategy generation: ensure `code` strings compile into a function that returns either `null` or an object with a well-defined `action` or consistent interface.
- Harden `BacktestEngine` and `StrategyManager` to validate compiled strategy functions at load time: if `new Function` fails to compile or the returned `onBar` isn't a function or returns invalid signals, treat it as an invalid strategy and fail fast with a clear error.
- Add property tests that assert the validation of strategies before they are used in BacktestEngine.

Labels: testing, property-tests, strategy

Assignee: @maintainers

Notes:
- I can propose either: (A) improving the Arbitrary generators, or (B) adding runtime validations in StrategyManager/BacktestEngine, or both if you prefer.