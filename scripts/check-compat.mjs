#!/usr/bin/env node
/**
 * 兼容清单完整性校验（E5）。
 *
 *   node scripts/check-compat.mjs
 *
 * 规则：
 *   1. contracts/compat.json 必须覆盖 lib/client.js 里 FEATURE_KEYS 的全部键；
 *   2. status 必须在四档内，evidence 非空；
 *   3. whenMissing 必须写清降级行为（例外：明确标注“不影响本插件”的探测项）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

let failures = 0
const ok = (msg) => console.log(`  ok   ${msg}`)
const fail = (msg) => {
  failures += 1
  console.error(`  FAIL ${msg}`)
}

const compat = JSON.parse(read('contracts/compat.json'))
const client = read('lib/client.js')

// 从源码里抓 FEATURE_KEYS 列表
const block = /const FEATURE_KEYS = Object\.freeze\(\[([\s\S]*?)\]\)/.exec(client)
if (!block) {
  console.error('  FAIL 无法从 lib/client.js 解析 FEATURE_KEYS')
  process.exit(1)
}
const keys = [...block[1].matchAll(/'([a-zA-Z0-9]+)'/g)].map((m) => m[1])
const entries = Array.isArray(compat.features) ? compat.features : []
const statuses = new Set(Object.keys(compat.statusLegend || {}))

console.log(`check-compat: FEATURE_KEYS ${keys.length} 项，清单 ${entries.length} 项`)

const seen = new Set()
for (const entry of entries) {
  if (!entry.key) {
    fail('清单项缺 key')
    continue
  }
  if (seen.has(entry.key)) fail(`重复：${entry.key}`)
  seen.add(entry.key)
  if (!statuses.has(entry.status)) fail(`${entry.key} 的 status 不在四档内：${entry.status}`)
  if (typeof entry.evidence !== 'string' || !entry.evidence.trim()) fail(`${entry.key} 缺 evidence`)
  if (typeof entry.whenMissing !== 'string' || !entry.whenMissing.trim()) fail(`${entry.key} 缺 whenMissing`)
}

for (const key of keys) {
  if (!seen.has(key)) fail(`FEATURE_KEYS 里的 ${key} 未登记进 contracts/compat.json`)
}
for (const entry of entries) {
  if (!keys.includes(entry.key)) fail(`清单里的 ${entry.key} 已不在 FEATURE_KEYS 中（请删除或补实现）`)
}

if (statuses.size !== 4) fail(`statusLegend 应为四档，实为 ${statuses.size} 档`)
if (failures > 0) {
  console.error(`check-compat: ${failures} 项未通过`)
  process.exit(1)
}
ok('兼容清单覆盖全部特征且四档齐备')
console.log('check-compat: ALL PASS')
