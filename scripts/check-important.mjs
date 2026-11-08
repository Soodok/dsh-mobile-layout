#!/usr/bin/env node
/**
 * `!important` 增长守卫。
 *
 *   node scripts/check-important.mjs            # 校验
 *   node scripts/check-important.mjs --update   # 重写 baseline
 *
 * 为什么是「守卫增长」而不是「一律清零」：绝大多数 !important 是在压官方
 * 弹窗 / 输入卡自带的样式（同一属性、更高优先级），删掉就会静默错位——
 * 本轮已用真机结构度量验证：设置面板的盒模型一旦去掉 !important，tabs 的
 * 内边距与 head 高度立刻变化。所以目标定为「不许悄悄新增」，允许逐条带着
 * 验证再减。
 *
 * 判定口径：
 *   · 每条 CSS 规则按选择器算一个指纹，记录其中 !important 的条数；
 *   · 新规则带 !important（baseline 里没有该指纹）→ 失败；
 *   · 已有规则的条数上涨 → 失败；
 *   · 条数下降 → note（可 --update 收紧基线）。
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, 'lib', 'client.js')
const baselinePath = path.join(root, 'scripts', 'important-baseline.json')

const raw = fs.readFileSync(sourcePath, 'utf8')
const lines = raw.split(/\r?\n/)

const RULE = /^\s*'(.+?)\{\s*',?$/
const DECL = /^\s*'\s*(.+?);\s*',?$/

const counts = new Map()
let currentSelector = null

for (const line of lines) {
  const rule = RULE.exec(line)
  if (rule) {
    currentSelector = rule[1].trim()
    continue
  }
  if (!currentSelector) continue
  if (/^\s*'\}'\s*,?$/.test(line)) {
    currentSelector = null
    continue
  }
  const decl = DECL.exec(line)
  if (!decl) continue
  const important = (decl[1].match(/!important/g) || []).length
  if (important === 0) continue
  counts.set(currentSelector, (counts.get(currentSelector) || 0) + important)
}

const fingerprint = (selector) => crypto.createHash('sha1').update(selector).digest('hex').slice(0, 12)
const current = [...counts.entries()].map(([selector, count]) => ({ selector, count, hash: fingerprint(selector) }))
const total = current.reduce((sum, item) => sum + item.count, 0)

const update = process.argv.includes('--update')
if (update) {
  fs.writeFileSync(baselinePath, JSON.stringify({
    _comment: '!important baseline（见 scripts/check-important.mjs）。减量口径：先在真机比对结构度量，再删、再跑 npm run important:baseline 收紧。',
    total,
    rules: current.map((item) => ({ hash: item.hash, selector: item.selector, count: item.count })),
  }, null, 2) + '\n')
  console.log(`important-baseline.json updated: ${current.length} rules, ${total} declarations`)
  process.exit(0)
}

let baseline = { total: 0, rules: [] }
if (fs.existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  } catch (error) {
    console.error('important-baseline.json 解析失败：', error.message)
    process.exit(1)
  }
}
const known = new Map((baseline.rules || []).map((rule) => [rule.hash, rule]))
const failures = []
const notes = []

for (const item of current) {
  const before = known.get(item.hash)
  if (!before) {
    failures.push(`新增带 !important 的规则：${item.selector}（${item.count} 条）`)
    continue
  }
  if (item.count > before.count) {
    failures.push(`规则 !important 增加：${item.selector}（${before.count} → ${item.count}）`)
  } else if (item.count < before.count) {
    notes.push(`可收紧：${item.selector}（${before.count} → ${item.count}）`)
  }
}

for (const note of notes) console.log(`  note ${note}`)
if (failures.length > 0) {
  console.error(`发现 ${failures.length} 处 !important 增长：`)
  for (const failure of failures) console.error(`  FAIL ${failure}`)
  console.error('请先用真机结构度量证明该改动不改变版式，或改写为更高特异性的选择器。')
  process.exit(1)
}

console.log(`important check: PASS (${current.length} rules, ${total} declarations, ${notes.length} 可收紧)`)
