import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.spec.js',
        '**/*.test.js',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/vite.config.js',
        '**/vitest.config.js'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // 属性测试配置
    propertyTesting: {
      numRuns: 100 // fast-check默认运行次数
    }
  }
})
