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
