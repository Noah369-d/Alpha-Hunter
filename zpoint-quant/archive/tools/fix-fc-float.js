// 修复fc.float的脚本
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const filesToFix = [
  'src/utils/BacktestEngine.property.test.js',
  'src/utils/IndicatorCalculator.property.test.js',
  'src/utils/RiskManager.property.test.js',
  'src/utils/SignalGenerator.property.test.js',
  'src/utils/StrategyManager.property.test.js',
  'src/utils/MarketDataAdapter.property.test.js'
]

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file)
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - file not found`)
    return
  }
  
  let content = fs.readFileSync(filePath, 'utf8')
  
  // 替换所有的fc.float({ min: X, max: Y })为fc.float({ min: Math.fround(X), max: Math.fround(Y) })
  content = content.replace(/fc\.float\(\{\s*min:\s*(-?\d+(?:\.\d+)?)\s*,\s*max:\s*(-?\d+(?:\.\d+)?)/g, (match, min, max) => {
    return `fc.float({ min: Math.fround(${min}), max: Math.fround(${max})`
  })
  
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`Fixed ${file}`)
})

console.log('Done!')
