'use strict'

/**
 * 官方 DOM 契约登记表的一致性测试（与 scripts/check-contracts.mjs 同口径）。
 *
 * 目的：把「新增官方属性依赖却没登记」挡在 `npm test` 里，而不是等宿主升级。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.join(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const registry = JSON.parse(read('contracts/official-selectors.json'))
const entries = registry.selectors
const bare = read('lib/client.js').replace(/\/\*[\s\S]*?\*\//g, '')

test('官方契约登记表：名字合法、带用途与证据、无重复', () => {
  const seen = new Set()
  for (const entry of entries) {
    assert.match(entry.name, /^data-[a-z0-9-]+$/, entry.name)
    assert.equal(entry.name.startsWith('data-dshm-'), false, `${entry.name} 是自有属性，不应登记为官方契约`)
    assert.equal(seen.has(entry.name), false, `重复登记：${entry.name}`)
    seen.add(entry.name)
    assert.ok(entry.usedFor && entry.usedFor.trim(), `${entry.name} 缺 usedFor`)
    assert.ok(entry.evidence && entry.evidence.trim(), `${entry.name} 缺 evidence`)
  }
})

test('官方契约登记表：源码里用到的官方属性全部已登记', () => {
  const names = new Set(entries.map((entry) => entry.name))
  const used = new Set()
  for (const match of bare.matchAll(/\[(data-(?!dshm-)[a-z0-9-]+)/g)) used.add(match[1])
  for (const match of bare.matchAll(/querySelector(?:All)?\(\s*'\[(data-(?!dshm-)[a-z0-9-]+)/g)) used.add(match[1])
  const missing = [...used].filter((name) => !names.has(name)).sort()
  assert.deepEqual(missing, [], `未登记的官方属性：${missing.join(', ')}`)
  assert.ok(used.size > 0, '应至少依赖一个官方属性')
})

test('npm 发布白名单：只包含显式公开的 token 文档，不放开整个 docs 目录', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.ok(pkg.files.includes('docs/theme-tokens.md'))
  assert.equal(pkg.files.includes('docs'), false, '不能把整套开发文档与截图都装进包')
  const verifier = read('scripts/verify-package.mjs')
  assert.match(verifier, /f !== 'docs\/theme-tokens\.md'/, '包校验仅放行该公开文档')
})

test('兼容清单：覆盖全部特征键且四档齐备', () => {
  const compat = JSON.parse(read('contracts/compat.json'))
  const client = read('lib/client.js')
  const block = /const FEATURE_KEYS = Object\.freeze\(\[([\s\S]*?)\]\)/.exec(client)
  assert.ok(block, 'client.js 里应有 FEATURE_KEYS')
  const keys = [...block[1].matchAll(/'([a-zA-Z0-9]+)'/g)].map((m) => m[1])
  const entries = compat.features
  const seen = new Set(entries.map((entry) => entry.key))
  for (const key of keys) assert.ok(seen.has(key), `清单缺 ${key}`)
  for (const entry of entries) {
    assert.ok(keys.includes(entry.key), `清单多出 ${entry.key}`)
    assert.ok(Object.prototype.hasOwnProperty.call(compat.statusLegend, entry.status), `${entry.key} status 非法`)
    assert.ok(entry.evidence && entry.evidence.trim(), `${entry.key} 缺 evidence`)
    assert.ok(entry.whenMissing && entry.whenMissing.trim(), `${entry.key} 缺 whenMissing`)
  }
  assert.equal(Object.keys(compat.statusLegend).length, 4, '四档齐备')
})

test('契约基线：与检测脚本结构一致', () => {
  const baseline = JSON.parse(read('contracts/contract-baseline.json'))
  assert.ok(typeof baseline.engineVersion === 'string' && baseline.engineVersion, 'baseline 需 engineVersion')
  assert.ok(baseline.features && Object.keys(baseline.features).length > 0, 'baseline 需 features')
  assert.ok(baseline.services && Object.keys(baseline.services).length > 0, 'baseline 需 services')
  const methods = Object.values(baseline.services).reduce((sum, list) => sum + list.length, 0)
  assert.ok(methods > 0, 'baseline 应记录到服务方法')
})

test('官方契约登记表：ARIA role 依赖同样必须登记', () => {
  const roles = registry.roles || []
  assert.ok(roles.length > 0, 'roles 不应为空')
  const seen = new Set()
  for (const entry of roles) {
    assert.match(entry.role, /^[a-z]+$/, entry.role)
    assert.equal(seen.has(entry.role), false, `重复登记：${entry.role}`)
    seen.add(entry.role)
    assert.ok(entry.usedFor && entry.usedFor.trim(), `role=${entry.role} 缺 usedFor`)
    assert.ok(entry.evidence && entry.evidence.trim(), `role=${entry.role} 缺 evidence`)
  }
  const used = new Set()
  for (const match of bare.matchAll(/\[role="([a-z]+)"\]/g)) used.add(match[1])
  const missing = [...used].filter((role) => !seen.has(role)).sort()
  assert.deepEqual(missing, [], `未登记的 role：${missing.join(', ')}`)
})
