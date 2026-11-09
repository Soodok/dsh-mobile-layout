'use strict'

/**
 * 两处真机反馈的回归锁（2026-11）。
 *
 * ① **Token 用量闪屏**：点统计胶囊 → 官方弹窗先按自己的锚定位置画一次，
 *    插件 120ms 后才把 `data-dshm-stats-dialog` 打上、CSS 再把它钉成固定面板，
 *    肉眼就是「弹出来、跳一下、刷新两次」。修法是把「发现弹窗」放进主 observer
 *    的同步回调（与变更同帧），并在紧随其后的 rAF（绘制前）补打标记。
 *
 * ② **无障碍缺口**：底部表是模态但没有焦点陷阱（Tab 会走到遮罩下面），
 *    开合也没有读屏播报。补 `trapFocus` + 常驻 `role=status` 播报区。
 *
 * 这里锁的是结构与时机约束（DOM 行为属真机验收范围）。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

function loadClient() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8')
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load({ factory }) {
          captured = factory(() => ({}))
        },
      },
    },
    console: { warn() {}, error() {}, log() {}, info() {} },
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'lib/client.js' })
  return { captured, source }
}

const { captured, source } = loadClient()

function slice(startMarker, stopMarker) {
  const from = source.indexOf(startMarker)
  assert.notEqual(from, -1, '找不到起点：' + startMarker)
  const to = stopMarker ? source.indexOf(stopMarker, from + startMarker.length) : -1
  return to === -1 ? source.slice(from) : source.slice(from, to)
}

test('统计浮层：observer 回调里就发现新弹窗（不等 120ms 几何链）', () => {
  const body = slice('observer = new win.MutationObserver((records) => {', 'observer.observe(doc.documentElement')
  assert.match(body, /record\.addedNodes/)
  assert.match(body, /dialogDueAt = Date\.now\(\)/)
  // 深层子树的下探要有限制，别把新会话整棵树扫一遍
  assert.match(body, /childElementCount < 40/)
  // 帧内（绘制前）补打，且窗口有限
  assert.match(body, /if \(dialogDueAt\)/)
  assert.match(body, /syncStatsBar\(\);/)
  assert.match(body, /tagStatsDialog\(\);/)
  assert.match(body, /DIALOG_TAG_WINDOW_MS/)
})

test('统计浮层：补打窗口是有限值（不会退化成每帧全量）', () => {
  const body = slice('let dialogDueAt = 0;', 'observer = new win.MutationObserver')
  const match = /const DIALOG_TAG_WINDOW_MS = (\d+);/.exec(body)
  assert.ok(match, '缺少 DIALOG_TAG_WINDOW_MS 常量')
  const ms = Number(match[1])
  assert.ok(ms > 0 && ms <= 1000, '补打窗口应在 (0, 1000] ms 内')
})

test('播报文案：中英成对且英文不含中文', () => {
  const { STRINGS } = captured.__test
  for (const key of ['a11yOpened', 'a11yClosed']) {
    assert.ok(STRINGS.zh[key], 'zh 缺少 ' + key)
    assert.ok(STRINGS.en[key], 'en 缺少 ' + key)
    assert.match(STRINGS.zh[key], /\{name\}/)
    assert.match(STRINGS.en[key], /\{name\}/)
    assert.equal(/[\u4e00-\u9fa5]/.test(STRINGS.en[key]), false, '英文文案里不应有中文')
  }
})

test('播报区：role=status + aria-live，且不是 display:none', () => {
  const body = slice('function announce(message) {', 'function a11yText(')
  assert.match(body, /setAttribute\('role', 'status'\)/)
  assert.match(body, /setAttribute\('aria-live', 'polite'\)/)
  assert.match(body, /setAttribute\('aria-atomic', 'true'\)/)
  // 同一句话重复播报要先清空
  assert.match(body, /node\.textContent = ''/)
  assert.equal(/display\s*=\s*'none'/.test(body), false)
  assert.equal(/visibility\s*=\s*'hidden'/.test(body), false)
})

test('焦点陷阱：Tab 在容器内循环，Shift+Tab 反向', () => {
  const body = slice('function trapFocus(container) {', 'function guardComposerFocusAfterOverlay(')
  assert.match(body, /event\.key !== 'Tab'/)
  assert.match(body, /event\.shiftKey/)
  assert.match(body, /removeEventListener\('keydown'/)
  assert.match(body, /preventScroll: true/)
})

test('底部表：打开时装焦点陷阱并播报，关闭时解绑并播报', () => {
  const body = slice("const sheet = layoutState.mode === MODE_MOBILE", "if (!sheet) return null;")
  assert.match(body, /const releaseTrap = trapFocus\(node\)/)
  assert.match(body, /releaseTrap\(\)/)
  assert.match(body, /announce\(a11yText\('a11yOpened'/)
  assert.match(body, /announce\(a11yText\('a11yClosed'/)
})

test('抽屉开合也播报，且只在状态变化时播', () => {
  const body = slice('const syncDrawerA11y = (mobile) => {', 'const syncFrameFlags = () => {')
  assert.match(body, /drawerOpenAnnounced/)
  assert.match(body, /announce\(a11yText\(drawerNowOpen \? 'a11yOpened' : 'a11yClosed'/)
})

test('清场时摘掉播报区节点', () => {
  const body = slice('function clearAnchors(doc) {', 'function resolveAnchors')
  assert.match(body, /LIVE_ATTR/)
  assert.match(body, /removeChild\(node\)/)
})
