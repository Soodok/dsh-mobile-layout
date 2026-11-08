'use strict'

/**
 * Token / 颜色契约的一致性测试。
 *
 * 与 scripts/check-tokens.mjs、scripts/check-colors.mjs 同一口径，但作为单元测试
 * 进入 `npm test`：脚本守 CI，测试守「改了却没人发现」。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.join(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const catalog = JSON.parse(read('contracts/dshm-tokens.json'))
const tokens = catalog.tokens
const client = read('lib/client.js')
const clientBare = client.replace(/\/\*[\s\S]*?\*\//g, '')
const tokensCss = read('styles/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '')
const tokensDoc = read('docs/theme-tokens.md')

test('token 目录：条目唯一、层合法、public 为布尔、说明非空', () => {
  const seen = new Set()
  for (const token of tokens) {
    assert.match(token.name, /^--dshm-[a-z0-9-]+$/, token.name)
    assert.equal(seen.has(token.name), false, `重复登记：${token.name}`)
    seen.add(token.name)
    assert.ok(['size', 'color', 'rt'].includes(token.layer), `${token.name} layer=${token.layer}`)
    assert.equal(typeof token.public, 'boolean', `${token.name} public`)
    assert.ok(typeof token.summary === 'string' && token.summary.trim(), `${token.name} summary`)
    if (token.layer === 'rt') assert.equal(token.default, null, `${token.name} 运行时 token 不得有静态默认值`)
  }
})

test('token 目录：client.js 的实现与默认值逐一相同', () => {
  const defined = new Map()
  for (const match of clientBare.matchAll(/'[^']*?(--dshm-[a-z0-9-]+)\s*:\s*([^';]+);/g)) {
    if (!defined.has(match[1])) defined.set(match[1], match[2].trim())
  }
  for (const token of tokens) {
    if (token.layer === 'rt' || token.default === null) continue
    assert.equal(defined.get(token.name), token.default, `${token.name} 默认值应与目录一致`)
  }
})

test('token 目录：client.js 不引用未登记 token', () => {
  const names = new Set(tokens.map((token) => token.name))
  for (const match of clientBare.matchAll(/var\(\s*(--dshm-[a-z0-9-]+)/g)) {
    assert.ok(names.has(match[1]), `未登记：${match[1]}`)
  }
})

test('token 目录：公开 token 在参考样式表与文档里都有落点', () => {
  for (const token of tokens) {
    if (!token.public) continue
    assert.ok(tokensDoc.includes(token.name), `文档缺 ${token.name}`)
    if (token.layer === 'rt' || token.default === null) continue
    const declared = new RegExp(`${token.name}\\s*:\\s*([^;]+);`).exec(tokensCss)
    assert.ok(declared, `styles/tokens.css 缺 ${token.name}`)
    assert.equal(declared[1].trim(), token.default, `${token.name} 在 tokens.css 与目录一致`)
  }
})

test('颜色层：裸色为 0（与 check-colors 共用同一个扫描器）', async () => {
  // 直接复用 scripts/lib/color-scan.mjs，避免测试与守卫两套口径各说各话。
  const { scanColors } = await import('../scripts/lib/color-scan.mjs')
  const scan = scanColors(client)
  const detail = scan.raw.map((entry) => `${entry.line}: ${entry.text}`).join('\n')
  assert.equal(scan.raw.length, 0, `发现裸色：\n${detail}`)
  assert.ok(scan.controlled > 0, '应保留官方 token 的回退值')
})
