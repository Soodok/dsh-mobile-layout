'use strict'

/**
 * 顶部状态带定位单元测试（v0.4.1）。
 *
 * ## 背景
 * 用户报「进度栏（会话统计：轮次/速度、Token 用量、缓存命中、上下文占用）
 * 又掉回输入区下方了」。
 *
 * 真机取证：官方 composer 底部的统计区渲染在 `<div data-composer-dock>` 里，
 * 并且是 `activity ? null : <ContextMeter/>` —— **智能体执行期间上下文环整块
 * 不渲染**。v0.4.0 的定位逻辑第 2 层要求「tok 按钮 + 上下文按钮」同时存在，
 * 运行中必然只有前者，于是退到第 3 层 `findTurnDock`；而那一层的文本上限
 * 卡在 40 字符，官方给统计行补上「缓存命中 95%」后中文整行正好 41 字符被拒，
 * 最终 clearStatsBar()，状态带掉回底部。
 *
 * 修法：
 * 1. 先认结构锚点 `[data-composer-dock]`（运行中/空闲都在）；
 * 2. 文本长度上限放宽到 STATS_TEXT_MAX=80，只用于排除整块正文。
 *
 * 这里锁住纯判定与源码里的层级顺序。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8')

function loadClient() {
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load({ factory }) {
          captured = factory(() => ({}))
        },
      },
    },
    console: { warn() {}, error() {}, log() {} },
  }
  vm.createContext(sandbox)
  vm.runInContext(SOURCE, sandbox, { filename: 'lib/client.js' })
  return captured
}

const { isTurnStatsText, STATS_TEXT_MAX, STATS_DOCK_SELECTOR } = loadClient().__test

test('isTurnStatsText：真机那行 41 字符的统计行必须通过（回归）', () => {
  // 设备实测 textContent（三枚胶囊 + 上下文环直接拼接，无分隔符）：
  // 「3 轮 24 步 · 231 tok/s」+「693K tok · 缓存命中 95%」+「4%」= 41 字符。
  const row = '3 轮 24 步 · 231 tok/s693K tok · 缓存命中 95%4%'
  assert.equal(row.length, 41, '前提：该行确实超过旧的 40 上限')
  assert.equal(isTurnStatsText(row), true)
})

test('isTurnStatsText：轮次 / 步数的常见形态都认', () => {
  assert.equal(isTurnStatsText('12 轮 34 步'), true)
  assert.equal(isTurnStatsText('1轮 2步'), true)
  assert.equal(isTurnStatsText('12 turns 34 steps'), true)
  assert.equal(isTurnStatsText('3轮 24步 · 231 tok/s · 693k tok · 缓存命中 95% · 4%'), true)
})

test('isTurnStatsText：空值与非法输入一律 false', () => {
  assert.equal(isTurnStatsText(''), false)
  assert.equal(isTurnStatsText('   '), false)
  assert.equal(isTurnStatsText(null), false)
  assert.equal(isTurnStatsText(undefined), false)
  assert.equal(isTurnStatsText(123), false)
})

test('isTurnStatsText：不含轮次特征的长正文不算统计行', () => {
  assert.equal(isTurnStatsText('这是一段普通回复，讲的是别的事情，没有轮次也没有步数'), false)
  assert.equal(isTurnStatsText('hello world, nothing to do with counters'), false)
})

test('isTurnStatsText：仍保留长度上限，避免把整块正文当成状态带', () => {
  const long = '12 轮 34 步 ' + '啊'.repeat(STATS_TEXT_MAX)
  assert.equal(isTurnStatsText(long), false)
  assert.equal(STATS_TEXT_MAX, 80)
})

test('源码契约：syncStatsBar 先认 data-composer-dock，再退到 aria 配对', () => {
  const body = SOURCE.slice(SOURCE.indexOf('function syncStatsBar()'))
  const dockAt = body.indexOf('STATS_DOCK_SELECTOR')
  const ariaAt = body.indexOf('button[aria-label]')
  assert.ok(dockAt >= 0, 'syncStatsBar 必须使用 STATS_DOCK_SELECTOR')
  assert.ok(ariaAt >= 0, 'syncStatsBar 必须保留 aria-label 退路')
  assert.ok(dockAt < ariaAt, '结构锚点必须排在 aria 配对之前（运行中上下文环不渲染）')
})

test('源码契约：状态带锚点就是官方 data-composer-dock', () => {
  assert.equal(STATS_DOCK_SELECTOR, '[data-composer-dock]')
})
