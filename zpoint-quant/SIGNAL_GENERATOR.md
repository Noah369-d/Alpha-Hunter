# SIGNAL_GENERATOR.md

目的：为修复/实现 `SignalGenerator` 提供可执行的逐步计划、测试要点与样例命令。

背景：
- `src/utils/SignalGenerator.test.js` 中包含多个断言或行为规范，当前部分测试被 `describe.skip` 跳过（详见仓库的状态报告）。

修复计划（小步快跑）
1. 本地复现：
   - 运行 `npm run test:unit` 并定位 `SignalGenerator` 相关失败。
   - 打开 `src/utils/SignalGenerator.test.js`，把 `describe.skip` 改回 `describe`，运行测试，记录失败信息。
2. 阅读测试：彻底理解测试期望的行为（边界、输入/输出、错误处理）。
3. 实现小功能：按测试分块实现功能，优先实现最小可通过部分测试的改动。
4. 增加属性测试：使用 `fast-check` 对信号生成的重要不变量做属性测试（例如信号稳定性、重复输入幂等性）。
5. 回测集成验证：在 `BacktestEngine` 中跑一小段历史数据，确认信号能正常驱动交易闭环。
6. 提交并打开 PR：PR 中应包含测试、说明以及回归结果截图或 coverage 报告。

测试要点
- 边界条件：空数据、NaN、零成交量、极端时间戳
- 性能：较长序列下仍能在合理时间完成（必要时写 micro-benchmark）
- 可解释性：信号输出包含来源（例如 indicator 名称/参数）以便回溯

示例命令
- 运行 SignalGenerator 的测试：
  ```bash
  npx vitest run src/utils/SignalGenerator.test.js
  ```
- 运行属性测试（例）：
  ```bash
  npm run test:property
  ```

注意：若需要，我可以为 SignalGenerator 写一个最小实现补丁，并在本地运行测试并打开 PR。