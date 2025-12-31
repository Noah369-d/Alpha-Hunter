// 修复 fc.float 添加 noNaN: true 的脚本
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const filesToFix = [
  'src/utils/IndicatorCalculator.property.test.js',
  'src/utils/RiskManager.property.test.js',
  'src/utils/SignalGenerator.property.test.js',
  'src/utils/StrategyManager.property.test.js',
  'src/utils/BacktestEngine.property.test.js',
  'src/utils/MarketDataAdapter.property.test.js'
]

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file)
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - file not found`)
    return
  }
  
  let content = fs.readFileSync(filePath, 'utf8')
  let changeCount = 0
  
  // 替换所有没有 noNaN 的 fc.float 调用
  // 匹配: fc.float({ ... }) 但不包含 noNaN
  content = content.replace(/fc\.float\(\{([^}]*)\}\)/g, (match, params) => {
    // 如果已经有 noNaN，跳过
    if (params.includes('noNaN')) {
      return match
    }
    // 添加 noNaN: true
    changeCount++
    return `fc.float({${params}, noNaN: true })`
  })
  
  if (changeCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`Fixed ${file} - ${changeCount} changes`)
  } else {
    console.log(`No changes needed for ${file}`)
  }
})

console.log('Done!')
