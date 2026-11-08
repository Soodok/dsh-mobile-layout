#!/usr/bin/env node
/**
 * 官方契约漂移检测（P4）。
 *
 *   node scripts/contract-snapshot.mjs --input <dump.json>            # 与基线比对
 *   node scripts/contract-snapshot.mjs --input <dump.json> --update   # 重写基线
 *   node scripts/contract-snapshot.mjs --print                        # 打印基线摘要
 *
 * dump 的来源：在真实宿主的 WebView / DevTools 里执行
 *
 *   JSON.stringify(window.__dshmCompat)
 *
 * 得到的 JSON 直接落盘即可（含 features、serviceShapes、engineVersion 等）。
 * 这样「升级后哪些契约变了」不靠人肉记忆，而是可复核的 diff。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = path.join(root, 'contracts', 'contract-baseline.json')

const args = process.argv.slice(2)
const inputIndex = args.indexOf('--input')
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : null
const update = args.includes('--update')
const printOnly = args.includes('--print')

const SERVICES = ['theme', 'commandUi', 'sidebarRightTabs', 'sidebarRight', 'layout', 'slots']

/** 把 dump 归一化成可比对的形状。 */
function normalize(dump) {
  // dump 可能是「JSON 字符串的 JSON」（CDP 回包里常见），最多解两层。
  let d = dump
  for (let i = 0; i < 2 && typeof d === 'string'; i += 1) {
    try {
      d = JSON.parse(d)
    } catch (error) {
      break
    }
  }
  d = d && typeof d === 'object' ? d : {}
  const features = d.features && typeof d.features === 'object' ? d.features : {}
  // 兼容两种输入：实时 dump 用 serviceShapes，基线文件用 services。
  const shapes = d.serviceShapes && typeof d.serviceShapes === 'object'
    ? d.serviceShapes
    : (d.services && typeof d.services === 'object' ? d.services : {})
  const services = {}
  for (const name of SERVICES) {
    const list = Array.isArray(shapes[name]) ? shapes[name] : []
    services[name] = list.slice().sort()
  }
  const engine = typeof d.engineVersion === 'string' ? d.engineVersion.trim() : ''
  return {
    engineVersion: engine || 'unknown',
    dialogContract: typeof d.dialogContract === 'string' ? d.dialogContract : 'unknown',
    features,
    services,
  }
}

function load(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    console.error(`读取失败：${file} — ${error.message}`)
    process.exit(2)
  }
}

if (!inputPath) {
  if (printOnly && fs.existsSync(baselinePath)) {
    const base = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    const total = Object.values(base.services || {}).reduce((sum, list) => sum + list.length, 0)
    console.log(`baseline: engine=${base.engineVersion} dialog=${base.dialogContract}`)
    console.log(`features: ${Object.keys(base.features || {}).length} 项，服务方法 ${total} 个`)
    process.exit(0)
  }
  console.error('用法：node scripts/contract-snapshot.mjs --input <dump.json> [--update]')
  process.exit(2)
}

const current = normalize(load(inputPath))

if (update) {
  const payload = {
    _comment: '官方契约基线（scripts/contract-snapshot.mjs）。来自真实宿主 window.__dshmCompat 的只读快照；升级 DSH 后跑一次 --update 并复核 diff。',
    capturedFrom: 'window.__dshmCompat',
    ...current,
  }
  fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n')
  const total = Object.values(payload.services).reduce((sum, list) => sum + list.length, 0)
  console.log(`contract-baseline.json updated: engine=${payload.engineVersion}, features=${Object.keys(payload.features).length}, methods=${total}`)
  process.exit(0)
}

if (!fs.existsSync(baselinePath)) {
  console.error('基线不存在：请先用 --update 生成 contracts/contract-baseline.json')
  process.exit(2)
}

const base = normalize(load(baselinePath))
const drift = []
const notes = []

if (base.engineVersion !== current.engineVersion) {
  notes.push(`引擎版本：${base.engineVersion} → ${current.engineVersion}`)
}

for (const [name, value] of Object.entries(base.features)) {
  const now = current.features[name] === true
  if (value === true && !now) drift.push(`特征消失：${name}`)
  if (value !== true && now) notes.push(`特征新增可用：${name}`)
}

for (const service of SERVICES) {
  const before = new Set(base.services[service] || [])
  const after = new Set(current.services[service] || [])
  for (const method of before) {
    if (!after.has(method)) drift.push(`服务方法消失：${service}.${method}`)
  }
  for (const method of after) {
    if (!before.has(method)) notes.push(`服务方法新增：${service}.${method}`)
  }
}

console.log(`contract drift: engine=${current.engineVersion}, 基线=${base.engineVersion}`)
for (const note of notes) console.log(`  note ${note}`)
if (drift.length > 0) {
  console.error(`检测到 ${drift.length} 处契约漂移：`)
  for (const item of drift) console.error(`  DRIFT ${item}`)
  process.exit(1)
}
console.log('contract drift: PASS（无破坏性漂移）')
