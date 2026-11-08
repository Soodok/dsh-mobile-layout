#!/usr/bin/env node
/**
 * Token 契约校验（离线，CI 与 npm run check 共用）。
 *
 *   node scripts/check-tokens.mjs
 *
 * 三方一致性：
 *   1. contracts/dshm-tokens.json ← 唯一事实来源；
 *   2. lib/client.js 注入的 CSS 默认值必须与目录里的 size 层一致；
 *   3. styles/tokens.css 与 docs/theme-tokens.md 必须覆盖全部 public token。
 *
 * 同时防止「用了没登记」与「登记了没实现」两类漂移。
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
const check = (cond, msg) => (cond ? ok(msg) : fail(msg))

const catalog = JSON.parse(read('contracts/dshm-tokens.json'))
const tokens = Array.isArray(catalog.tokens) ? catalog.tokens : []
const client = read('lib/client.js')
// 注释里会出现 `var(--dshm-color-*)` 这类示例，扫描前必须剥离块注释，
// 否则会把示例里的前缀当成一个真实引用。
const clientBare = client.replace(/\/\*[\s\S]*?\*\//g, '')
const tokensCss = read('styles/tokens.css')
// 注释里会出现「用法示例」的同名声明（如 --dshm-bar-height: 64px），
// 校验前必须先剥离，否则会把示例值当成实际默认值。
const tokensCssBare = tokensCss.replace(/\/\*[\s\S]*?\*\//g, '')
const tokensDoc = read('docs/theme-tokens.md')

console.log(`check-tokens: ${tokens.length} 个目录条目`)

// ---- 目录自身结构 ----
const names = new Set()
for (const token of tokens) {
  if (!/^--dshm-[a-z0-9-]+$/.test(token.name || '')) {
    fail(`token 名不合法：${token.name}`)
    continue
  }
  if (names.has(token.name)) fail(`token 重复登记：${token.name}`)
  names.add(token.name)
  if (!['size', 'color', 'rt'].includes(token.layer)) fail(`${token.name} 的 layer 必须是 size / color / rt`)
  if (typeof token.public !== 'boolean') fail(`${token.name} 缺少 public 布尔值`)
  if (typeof token.summary !== 'string' || !token.summary.trim()) fail(`${token.name} 缺少 summary`)
  if (token.layer === 'rt' && token.default !== null) fail(`${token.name} 是运行时 token，default 必须为 null`)
}

// ---- client.js 里的定义 ----
const definedInClient = new Map()
for (const match of clientBare.matchAll(/'[^']*?(--dshm-[a-z0-9-]+)\s*:\s*([^';]+);/g)) {
  if (!definedInClient.has(match[1])) definedInClient.set(match[1], match[2].trim())
}

for (const token of tokens) {
  if (token.layer === 'rt' || token.default === null) continue
  const actual = definedInClient.get(token.name)
  check(actual === token.default, `${token.name} 默认值与 client.js 一致${actual === undefined ? '（client.js 未定义）' : actual === token.default ? '' : `（实为 ${actual}）`}`)
}

for (const [name] of definedInClient) {
  if (!names.has(name)) fail(`client.js 定义了未登记的 token：${name}（请补进 contracts/dshm-tokens.json）`)
}

// ---- 引用是否都有登记 ----
const referenced = new Set()
for (const match of clientBare.matchAll(/var\(\s*(--dshm-[a-z0-9-]+)/g)) referenced.add(match[1])
for (const name of referenced) {
  if (!names.has(name)) fail(`client.js 引用了未登记的 token：${name}`)
}
check(referenced.size > 0, `client.js 引用 ${referenced.size} 个自有 token`)

// ---- 参考样式表 ----
for (const token of tokens) {
  if (token.layer === 'rt' || token.default === null) continue
  if (!token.public) continue
  const declared = new RegExp(`${token.name}\\s*:\\s*([^;]+);`).exec(tokensCssBare)
  check(Boolean(declared), `styles/tokens.css 声明 ${token.name}`)
  if (declared) check(declared[1].trim() === token.default, `${token.name} 在 tokens.css 与目录一致`)
}

// ---- 文档 ----
for (const token of tokens) {
  if (!token.public) continue
  check(tokensDoc.includes(token.name), `docs/theme-tokens.md 记录 ${token.name}`)
}

if (failures > 0) {
  console.error(`check-tokens: ${failures} 项未通过`)
  process.exit(1)
}
console.log('check-tokens: ALL PASS')
