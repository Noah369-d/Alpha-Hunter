# 需求文档

## 简介

Zpoint Quant是一个综合性的个人量化交易系统，旨在为交易者提供策略回测、数据分析和交易策略编写的完整解决方案。该系统支持多个全球主要交易市场，包括美股、港股、A股、加密货币和期货市场，通过技术指标分析、信号生成和风险管理功能，帮助用户制定和验证交易策略。

## 术语表

- **Zpoint Quant系统**：本量化交易平台的总称
- **策略回测引擎**：用于在历史数据上测试交易策略性能的模块
- **技术指标计算器**：计算各类技术分析指标（如MA、RSI、MACD等）的组件
- **信号生成器**：基于技术指标和策略规则生成买入/卖出信号的模块
- **风险管理模块**：监控和控制交易风险的组件
- **策略编辑器**：用户编写和修改交易策略的界面
- **市场数据适配器**：连接不同交易市场数据源的接口层
- **信号推送服务**：向用户发送交易信号通知的服务
- **回测报告**：包含策略性能指标的分析报告
- **交易信号**：系统生成的买入或卖出建议

## 需求

### 需求 1：多市场数据支持

**用户故事：** 作为量化交易者，我希望系统能够接入多个交易市场的数据，以便我可以在不同市场上测试和应用我的策略。

#### 验收标准

1. WHEN 用户选择美股市场 THEN Zpoint Quant系统 SHALL 获取并显示美股实时和历史价格数据
2. WHEN 用户选择港股市场 THEN Zpoint Quant系统 SHALL 获取并显示港股实时和历史价格数据
3. WHEN 用户选择A股市场 THEN Zpoint Quant系统 SHALL 获取并显示A股实时和历史价格数据
4. WHEN 用户选择加密货币市场 THEN Zpoint Quant系统 SHALL 获取并显示加密货币实时和历史价格数据
5. WHEN 用户选择期货市场 THEN Zpoint Quant系统 SHALL 获取并显示期货合约实时和历史价格数据
6. WHEN 市场数据适配器接收到数据 THEN Zpoint Quant系统 SHALL 将数据标准化为统一格式存储

### 需求 2：策略编写功能

**用户故事：** 作为量化交易者，我希望能够编写和保存自定义交易策略，以便实现我的交易思路。

#### 验收标准

1. WHEN 用户打开策略编辑器 THEN Zpoint Quant系统 SHALL 提供代码编辑界面和语法高亮功能
2. WHEN 用户编写策略代码 THEN Zpoint Quant系统 SHALL 实时验证代码语法的正确性
3. WHEN 用户保存策略 THEN Zpoint Quant系统 SHALL 将策略代码持久化到本地存储
4. WHEN 用户加载已保存的策略 THEN Zpoint Quant系统 SHALL 恢复完整的策略代码和配置
5. WHEN 策略代码包含语法错误 THEN Zpoint Quant系统 SHALL 显示具体的错误位置和错误信息

### 需求 3：技术指标计算

**用户故事：** 作为量化交易者，我希望系统能够计算常用的技术指标，以便我可以基于这些指标构建交易策略。

#### 验收标准

1. WHEN 用户请求计算移动平均线 THEN 技术指标计算器 SHALL 基于指定周期计算并返回MA值
2. WHEN 用户请求计算相对强弱指标 THEN 技术指标计算器 SHALL 基于指定周期计算并返回RSI值
3. WHEN 用户请求计算MACD指标 THEN 技术指标计算器 SHALL 计算并返回MACD线、信号线和柱状图值
4. WHEN 用户请求计算布林带 THEN 技术指标计算器 SHALL 计算并返回上轨、中轨和下轨值
5. WHEN 用户请求计算KDJ指标 THEN 技术指标计算器 SHALL 计算并返回K值、D值和J值
6. WHEN 技术指标计算器接收到不完整的数据 THEN Zpoint Quant系统 SHALL 返回错误提示并说明所需的最小数据量

### 需求 4：策略回测引擎

**用户故事：** 作为量化交易者，我希望能够在历史数据上回测我的策略，以便评估策略的有效性。

#### 验收标准

1. WHEN 用户启动回测 THEN 策略回测引擎 SHALL 在指定的历史时间段内执行策略逻辑
2. WHEN 策略回测引擎执行策略 THEN Zpoint Quant系统 SHALL 模拟真实的交易执行过程
3. WHEN 回测完成 THEN Zpoint Quant系统 SHALL 生成包含收益率、最大回撤、夏普比率的回测报告
4. WHEN 回测完成 THEN Zpoint Quant系统 SHALL 显示每笔模拟交易的详细记录
5. WHEN 用户指定回测参数 THEN 策略回测引擎 SHALL 使用指定的初始资金、手续费率和滑点设置
6. WHEN 回测过程中发生错误 THEN Zpoint Quant系统 SHALL 记录错误信息并停止回测

### 需求 5：信号生成

**用户故事：** 作为量化交易者，我希望系统能够根据策略自动生成交易信号，以便我可以及时把握交易机会。

#### 验收标准

1. WHEN 策略条件满足买入规则 THEN 信号生成器 SHALL 生成买入信号并标注信号强度
2. WHEN 策略条件满足卖出规则 THEN 信号生成器 SHALL 生成卖出信号并标注信号强度
3. WHEN 信号生成器生成交易信号 THEN Zpoint Quant系统 SHALL 记录信号生成的时间、价格和触发条件
4. WHEN 多个策略同时运行 THEN 信号生成器 SHALL 为每个策略独立生成信号
5. WHEN 信号生成 THEN Zpoint Quant系统 SHALL 在用户界面上实时显示最新信号

### 需求 6：风险管理

**用户故事：** 作为量化交易者，我希望系统能够帮助我管理交易风险，以便保护我的资金安全。

#### 验收标准

1. WHEN 用户设置止损价格 THEN 风险管理模块 SHALL 监控持仓价格并在触及止损价时生成平仓信号
2. WHEN 用户设置止盈价格 THEN 风险管理模块 SHALL 监控持仓价格并在触及止盈价时生成平仓信号
3. WHEN 用户设置最大持仓比例 THEN 风险管理模块 SHALL 限制单个品种的持仓不超过总资金的指定比例
4. WHEN 用户设置最大回撤限制 THEN 风险管理模块 SHALL 在账户回撤超过限制时暂停策略执行
5. WHEN 风险管理模块检测到风险事件 THEN Zpoint Quant系统 SHALL 立即向用户发送警告通知

### 需求 7：策略切换

**用户故事：** 作为量化交易者，我希望能够快速切换不同的交易策略，以便适应不同的市场环境。

#### 验收标准

1. WHEN 用户选择切换策略 THEN Zpoint Quant系统 SHALL 显示所有已保存策略的列表
2. WHEN 用户激活新策略 THEN Zpoint Quant系统 SHALL 停止当前运行的策略并启动新策略
3. WHEN 策略切换完成 THEN Zpoint Quant系统 SHALL 保留原策略的历史交易记录
4. WHEN 用户同时运行多个策略 THEN Zpoint Quant系统 SHALL 为每个策略维护独立的状态和持仓
5. WHEN 策略切换过程中发生错误 THEN Zpoint Quant系统 SHALL 回滚到切换前的状态

### 需求 8：数据分析

**用户故事：** 作为量化交易者，我希望系统能够提供数据分析工具，以便我可以深入了解市场和策略表现。

#### 验收标准

1. WHEN 用户请求查看价格走势 THEN Zpoint Quant系统 SHALL 以K线图形式展示历史价格数据
2. WHEN 用户请求查看技术指标 THEN Zpoint Quant系统 SHALL 在图表上叠加显示所选技术指标
3. WHEN 用户请求策略性能分析 THEN Zpoint Quant系统 SHALL 生成包含收益曲线、回撤曲线的可视化报告
4. WHEN 用户请求交易统计 THEN Zpoint Quant系统 SHALL 计算并显示胜率、盈亏比、平均持仓时间等指标
5. WHEN 用户导出分析数据 THEN Zpoint Quant系统 SHALL 将数据导出为CSV或JSON格式文件

### 需求 9：操作指南

**用户故事：** 作为新用户，我希望系统能够提供清晰的操作指南，以便我可以快速上手使用系统。

#### 验收标准

1. WHEN 用户首次启动系统 THEN Zpoint Quant系统 SHALL 显示欢迎向导和基本功能介绍
2. WHEN 用户访问帮助菜单 THEN Zpoint Quant系统 SHALL 提供分类清晰的操作文档
3. WHEN 用户在特定功能页面请求帮助 THEN Zpoint Quant系统 SHALL 显示该功能的上下文相关帮助信息
4. WHEN 用户查看策略编写指南 THEN Zpoint Quant系统 SHALL 提供策略API文档和示例代码
5. WHEN 用户查看快速入门教程 THEN Zpoint Quant系统 SHALL 提供从数据导入到策略回测的完整流程说明

### 需求 10：信号推送

**用户故事：** 作为量化交易者，我希望系统能够及时推送交易信号，以便我不会错过重要的交易机会。

#### 验收标准

1. WHEN 信号生成器产生新的交易信号 THEN 信号推送服务 SHALL 在5秒内向用户发送通知
2. WHEN 用户配置推送渠道 THEN Zpoint Quant系统 SHALL 支持浏览器通知、邮件和Webhook方式
3. WHEN 推送通知发送 THEN 信号推送服务 SHALL 包含交易品种、信号类型、价格和策略名称信息
4. WHEN 用户设置推送过滤条件 THEN 信号推送服务 SHALL 仅推送满足条件的信号
5. WHEN 推送服务发送失败 THEN Zpoint Quant系统 SHALL 记录失败日志并在下次连接时重试
6. WHEN 用户关闭推送功能 THEN 信号推送服务 SHALL 停止发送所有通知但继续生成信号记录
