#!/usr/bin/env node
/**
 * 官方 DOM 契约登记门禁。
 *
 *   node scripts/check-contracts.mjs
 *
 * 规则：`lib/client.js` 里出现的每个**官方** `data-*` 选择器（不含自有
 * `data-dshm-*`），都必须在 `contracts/official-selectors.json` 登记，
 * 且带非空 evidence。目的是把「悄悄新增一个官方属性依赖」变成构建失败，
 * 而不是等下一次宿主升级才发现。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const client = fs.readFileSync(path.join(root, 'lib', 'client.js'), 'utf8')
// 注释里会出现示例选择器，扫描前剥离块注释。
const bare = client.replace(/\/\*[\s\S]*?\*\//g, '')
const registry = JSON.parse(fs.readFileSync(path.join(root, 'contracts', 'official-selectors.json'), 'utf8'))

let failures = 0
const ok = (msg) => console.log(`  ok   ${msg}`)
const fail = (msg) => {
  failures += 1
  console.error(`  FAIL ${msg}`)
}

const entries = Array.isArray(registry.selectors) ? registry.selectors : []
const registered = new Map()
for (const entry of entries) {
  if (!/^data-[a-z0-9-]+$/.test(entry.name || '') || entry.name.startsWith('data-dshm-')) {
    fail(`登记项名字不合法或误用自有前缀：${entry.name}`)
    continue
  }
  if (registered.has(entry.name)) fail(`重复登记：${entry.name}`)
  if (typeof entry.usedFor !== 'string' || !entry.usedFor.trim()) fail(`${entry.name} 缺少 usedFor`)
  if (typeof entry.evidence !== 'string' || !entry.evidence.trim()) fail(`${entry.name} 缺少 evidence`)
  registered.set(entry.name, entry)
}

// 收集 client.js 里实际用到的官方 ARIA role
const usedRoles = new Set()
for (const match of bare.matchAll(/\[role="([a-z]+)"\]/g)) usedRoles.add(match[1])

const roleEntries = Array.isArray(registry.roles) ? registry.roles : []
const registeredRoles = new Map()
for (const entry of roleEntries) {
  if (!/^[a-z]+$/.test(entry.role || '')) {
    fail(`role 登记项名字不合法：${entry.role}`)
    continue
  }
  if (registeredRoles.has(entry.role)) fail(`重复登记的 role：${entry.role}`)
  if (typeof entry.usedFor !== 'string' || !entry.usedFor.trim()) fail(`role=${entry.role} 缺少 usedFor`)
  if (typeof entry.evidence !== 'string' || !entry.evidence.trim()) fail(`role=${entry.role} 缺少 evidence`)
  registeredRoles.set(entry.role, entry)
}

for (const role of usedRoles) {
  if (!registeredRoles.has(role)) fail(`源码使用了未登记的官方 role：${role}（请补进 contracts/official-selectors.json 的 roles）`)
}

// 收集 client.js 里实际用到的官方属性
const used = new Set()
for (const match of bare.matchAll(/\[(data-(?!dshm-)[a-z0-9-]+)/g)) used.add(match[1])
for (const match of bare.matchAll(/querySelector(?:All)?\(\s*'\[(data-(?!dshm-)[a-z0-9-]+)/g)) used.add(match[1])

console.log(`check-contracts: 属性登记 ${registered.size} 项 / 使用 ${used.size} 项；role 登记 ${registeredRoles.size} 项 / 使用 ${usedRoles.size} 项`)

for (const name of used) {
  if (!registered.has(name)) fail(`源码使用了未登记的官方属性：${name}（请补进 contracts/official-selectors.json）`)
}

// 反向：登记了但已不再使用 —— 只提示，不失败（保留证据供后续复用）
const unused = [...registered.keys()].filter((name) => !used.has(name))
if (unused.length) console.log(`  note 已登记但当前未直接引用：${unused.join(', ')}`)

if (failures > 0) {
  console.error(`check-contracts: ${failures} 项未通过`)
  process.exit(1)
}
if (used.size > 0) ok('全部官方属性依赖均已登记')
if (usedRoles.size > 0) ok('全部官方 ARIA role 依赖均已登记')
console.log('check-contracts: ALL PASS')
