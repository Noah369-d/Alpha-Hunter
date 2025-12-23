# TASKS 汇总与当前状态

> 目的：将所有 `TASK_*_SUMMARY.md` 合并为单一任务跟踪文档，明确哪些任务已完成、哪些仍在进行、哪些需要人工干预。原始 `TASK_*_SUMMARY.md` 文件将按您的指示被永久删除（已在工作区删除并提交）。

---

## 概览（任务列表）

- Task 3.5 — 错误处理和重试机制 (MarketDataAdapter) ✅ 已完成
- Task 4   — 技术指标计算器 (IndicatorCalculator) ✅ 已实现，但 **属性测试有待修复（NaN 处理）**
- Task 6   — 策略管理器 (StrategyManager) ✅ 已实现，但 **存在 LocalStorage 时序/属性测试问题**
- Task 8   — 回测引擎 (BacktestEngine) ✅ 已实现，但 **部分 property 断言（交易计数/统计）需修复**
- Task 10  — 信号生成器 (SignalGenerator) ✅ 已实现，但 **测试失败较多（需手工核查实现与属性测试）**
- Task 11  — 风险管理模块 (RiskManager) ✅ 已完成
- Task 16  — 主应用界面集成 (UI 集成) ✅ 已集成（部分页面为占位，需要开发者完善回测/风险面板）

---

## 已完成项目（无需额外开发） ✅
- Task 3.5: MarketDataAdapter 错误处理与 `retryWithBackoff`（测试覆盖良好）
- Task 11: RiskManager 完整实现及测试
- Task 16: UI 基本集成（导航、仪表板、策略/信号/设置页面）

---

## 部分完成 / 仍需开发者介入的项目 ⚠️
这些任务**本体已实现**，但存在测试失败或占位功能，需要工程师介入：

1) Task 4 — IndicatorCalculator
- 状态：实现与单元测试通过；**属性测试在随机样本下出现 NaN 触发（RSI/恒定输入）**。
- 需要开发者做的改动：
  - 修复或完善属性测试生成器以过滤或避免生成 NaN（建议首选），或
  - 在 `IndicatorCalculator.calculateRSI` 中增加容错（对 NaN 做过滤/替换/明确报错并记录）。
- 优先级：高（影响约10个属性测试）

2) Task 6 — StrategyManager
- 状态：实现与单元测试通过；**属性测试偶发失败，常因 LocalStorage 时序/并发或生成策略代码不合规触发**。
- 需要开发者做的改动：
  - 加固 `_saveToStorage` / `_loadFromStorage`（增加一致性检查、重试或延迟策略），
  - 修正属性测试生成器以避免生成“貌似合法但测试用例误判”的策略（例如添加更严格的语法错误样本），
  - 明确策略验证的边界行为与错误返回格式。
- 优先级：高（影响约6个属性测试）

3) Task 8 — BacktestEngine
- 状态：实现与单元测试通过；**property 断言（如 totalTrades = winning + losing）在某些随机样本下失败**。
- 需要开发者做的改动：
  - 审查交易记录生成与统计逻辑（空仓平仓、部分成交、撤单是否被计入交易数等），
  - 添加额外断言和防御性检查（例如剔除零量/无效交易）。
- 优先级：中高

4) Task 10 — SignalGenerator
- 状态：实现并覆盖大量单元测试，但**属性测试失败数量较多**（涉及生成的信号完整性、历史写入一致性、IndexedDB 行为）。
- 需要开发者做的改动：
  - 复核 `logSignal` 的持久化与索引，确保查询一致性；
  - 校正信号生成器对极端或随机策略样本的容错行为；
  - （可选）暂时 `describe.skip` 部分难以短期修复的属性测试以恢复 CI 绿灯，然后逐步修复。
- 优先级：中

---

## 需要开发者手动添加或确认的项目（不可自动完成） ✋
这些项需要人工决策或代码更改：

- 在 `IndicatorCalculator` 中确定对 NaN 的最终处理策略（过滤 vs 填充 vs 抛错）并实现。
- 为 `StrategyManager` 设计并实现稳定的持久化一致性策略（例如保存后读取一致性校验或写后回读确认）。
- 明确 `BacktestEngine` 对“无效交易/部分成交/手续费/滑点”计数规则并实现一致化的统计逻辑。
- 决定 `SignalGenerator` 的短期策略：是优先修复所有相关属性测试，还是先跳过一部分属性测试以保证 CI 通过。
- UI 占位页面（Backtest / Risk）需要工程师实现完整功能或在文档中标注明确 TODO/PR 任务。

每一项都已在仓库的 issue 草稿（`.github/ISSUES/`）中记录了可复现的 seeds / counterexamples 与建议修复方案，建议逐条完成并在 PR 描述中引用对应 issue。 

---

## 推荐的优先级与下步计划
1. 验证并修复 `IndicatorCalculator` NaN 问题（高优先）
2. 稳定 `StrategyManager` 的 LocalStorage 行为（高优先）
3. 修正 `BacktestEngine` 的交易统计逻辑（中高）
4. 修复或暂时跳过 `SignalGenerator` 的难修属性测试（中）
5. 完善 UI 占位页（低）

---

## 我可以为您做的事情（选项）
- 我可以先自动修复 **fc.float** / 数值稳定问题（已完成），接着逐项修复上面的代码问题并运行属性测试验证（需要您授权继续执行修复PR）。
- 或您可以选择我先把每个需要人工确认的改动生成为 issue+PR 草案，并提供修复建议与变更 patch 供您确认。

---

**当前状态**：我已将所有 `TASK_*_SUMMARY.md` 的内容合并于本文件，并按您的要求准备删除原始 TASK 文件（已删除并提交至本地分支）。

**下一步（请回复选择）**：
- 回复 `1`：请我立即开始优先修复 `IndicatorCalculator` 的 NaN 问题并创建 PR（我会逐步提交并运行 property 测试）；
- 回复 `2`：请我先为上面列出的每个需要人工介入的项生成 issue + PR 草案，供您审核后合并；
- 回复 `3`：只执行文件整理（完成），暂停后续修复工作。

---

*文件最后变更：2025-12-23*
