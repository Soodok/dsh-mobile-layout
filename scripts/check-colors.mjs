#!/usr/bin/env node
/**
 * 颜色契约守卫。
 *
 *   node scripts/check-colors.mjs           # 校验（npm run check 的一部分）
 *   node scripts/check-colors.mjs --update  # 重新生成 baseline
 *
 * 口径（见 scripts/lib/color-scan.mjs 与 docs/theme-tokens.md）：
 *   1. controlled —— 位于 `var(--官方/自有token, 回退值)` 的第二参数，不算裸色；
 *   2. exempt     —— 行内 / 上一行有 `TOKEN-OK:`，或处于 `TOKEN-OK-BLOCK:` 区间；
 *   3. raw        —— 其余颜色字面量，登记进 baseline；新增即失败。
 *
 * 为什么留 baseline：色值是视觉资产，凭「裸色清零」一刀切会逼出脆弱的官方
 * token 猜测。守卫的目标是「不许悄悄新增」，不是机械地把数字压到 0。
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { scanColors } from './lib/color-scan.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, 'lib', 'client.js')
const baselinePath = path.join(root, 'scripts', 'colors-baseline.json')

const source = fs.readFileSync(sourcePath, 'utf8')
const scan = scanColors(source)

const violations = scan.raw.map((entry) => ({
  ...entry,
  hash: crypto.createHash('sha1').update(entry.value + ':' + entry.text).digest('hex').slice(0, 12),
}))

const update = process.argv.includes('--update')
if (update) {
  const payload = {
    _comment: '颜色字面量 baseline（见 scripts/check-colors.mjs）。收紧方式：把裸色改成 var(令牌, 回退) 或加 TOKEN-OK 说明后运行 npm run colors:baseline。',
    entries: violations.map((v) => v.hash),
  }
  fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n')
  console.log('colors-baseline.json updated:', payload.entries.length, 'entries')
  process.exit(0)
}

let baseline = { entries: [] }
if (fs.existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  } catch (error) {
    console.error('colors-baseline.json 解析失败：', error.message)
    process.exit(1)
  }
}
const known = new Set(baseline.entries || [])
const fresh = violations.filter((v) => !known.has(v.hash))

if (fresh.length > 0) {
  console.error(`发现新的裸颜色字面量（${fresh.length} 处）。请改用 var(令牌, 回退)，`)
  console.error('或在该行 / 上一行注释写 TOKEN-OK: 理由 豁免。新增违规：')
  for (const v of fresh) {
    console.error(`  lib/client.js:${v.line}  ${v.value}`)
    console.error(`    ${v.text}`)
  }
  process.exit(1)
}

const stale = (baseline.entries || []).filter((hash) => !violations.some((v) => v.hash === hash))
console.log(
  'color check: PASS ('
  + violations.length + ' known raw, '
  + scan.controlled + ' controlled fallbacks, '
  + scan.exempt.length + ' exempt, '
  + fresh.length + ' new'
  + (stale.length ? ', ' + stale.length + ' stale — 可运行 npm run colors:baseline 收紧' : '')
  + ')',
)
