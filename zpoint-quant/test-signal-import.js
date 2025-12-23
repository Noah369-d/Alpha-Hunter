// 测试 SignalGenerator 导入
import SignalGenerator from './src/utils/SignalGenerator.js'

console.log('SignalGenerator:', SignalGenerator)
console.log('typeof SignalGenerator:', typeof SignalGenerator)
console.log('SignalGenerator.name:', SignalGenerator.name)

try {
  const generator = new SignalGenerator()
  console.log('✅ 成功创建 SignalGenerator 实例')
  console.log('generator:', generator)
} catch (error) {
  console.error('❌ 创建实例失败:', error.message)
  console.error('错误堆栈:', error.stack)
}
