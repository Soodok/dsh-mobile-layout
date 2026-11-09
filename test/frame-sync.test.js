'use strict'

/**
 * 每帧同步链的成本回落（2026-11）。
 *
 * 症状：手机端流式输出时「莫名卡」。根因不是某个函数慢，而是每帧对**存在性**
 * 做全文档探测——绝大多数帧的答案都是「没有设置页 / 没有弹层」，探测本身
 * 就是纯浪费，还连带把 2~4 次强制布局挂在渲染帧上。
 *
 * 整理后的四条约定（本文件锁住）：
 *   1. 存在性探测按 PRESENCE_PROBE_MS 节流、结果粘性：探到就恢复每帧维护；
 *   2. 弹层清理只遍历自己登记过的节点（popoverMarks），不再全文档扫；
 *   3. 终端换行按钮的 rect 定位进 120ms 几何组，不再每帧量；
 *   4. 反复用到的官方节点（输入卡 / 侧栏 / 选择器存在性）走缓存 + isConnected。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8')

/** 取一节源码：从 start 标记到 stop 标记（不存在则取到文件尾）。 */
function slice(startMarker, stopMarker) {
  const from = source.indexOf(startMarker)
  assert.notEqual(from, -1, '找不到起点：' + startMarker)
  const to = stopMarker ? source.indexOf(stopMarker, from + startMarker.length) : -1
  return to === -1 ? source.slice(from) : source.slice(from, to)
}

test('存在性探测有独立节流常量，且粘性保存', () => {
  const body = slice('PRESENCE_PROBE_MS = ', 'observer.observe(doc.documentElement')
  assert.match(body, /let overlaysPresent = false/)
  assert.match(body, /let menuPresent = false/)
  assert.match(body, /overlaysPresent \|\| nowAt - lastPresenceProbeAt >= PRESENCE_PROBE_MS/)
  assert.match(body, /menuPresent \|\| nowAt - menuProbeAt >= PRESENCE_PROBE_MS/)
  // 探到之后必须能继续每帧维护（否则标记被官方重渲染冲掉就停住了）
  assert.match(body, /overlaysPresent = state\.settingsOpen/)
  assert.match(body, /menuPresent = menuVisible \|\| popoverMarks\.size > 0/)
})

test('终端换行按钮不再挂在每帧链上', () => {
  const body = slice('observer = new win.MutationObserver(', 'observer.observe(doc.documentElement')
  assert.equal(/syncTerminalWrap\(\)/.test(body), false, '每帧链里不应再调用 syncTerminalWrap')
  const layout = slice('const runLayoutSync = () => {', 'const scheduleLayoutSync')
  assert.match(layout, /syncTerminalWrap\(\);/, '应归到 120ms 几何组')
})

test('弹层清理只遍历登记表，不做全文档扫描', () => {
  const body = slice('function prunePopoverMarks()', 'function tagComposerMenus')
  assert.match(body, /popoverMarks\.size === 0/)
  assert.equal(/document\.querySelectorAll\(/.test(body), false)
  // 打标时必须登记，否则清理侧永远是空表
  const tag = slice('function tagComposerMenus', 'function syncAddPaging')
  assert.match(tag, /popoverMarks\.add\(target\)/)
})

test('面板让位高度用登记表取根（不再每帧 querySelector）', () => {
  const body = slice('function syncPanelSpace()', '// ---- 设置弹窗')
  assert.match(body, /firstPopoverMark\(\)/)
  assert.equal(/querySelector\('\[data-dshm-popover\]'\)/.test(body), false)
})

test('布局选择器回收在「一份都没有」时 O(1)', () => {
  const body = slice('let layoutPickerCount = 0;', 'function findAppearanceSection')
  assert.match(body, /if \(layoutPickerCount === 0 && !keep\) return;/)
  const ensure = slice('function ensureLayoutPicker(', 'function syncLayoutCardStyle')
  assert.match(ensure, /layoutPickerCount = 1;/)
})

test('输入卡 / 侧栏节点走缓存 + isConnected 复核', () => {
  assert.match(source, /let composerCardCache = null;/)
  assert.match(source, /const composerCardNode = \(\) => \{/)
  assert.match(source, /let sidebarNodeCache = null;/)
  assert.match(source, /const sidebarNode = \(\) => \{/)
  const frame = slice('const syncFrameFlags = () => {', 'const bindFrame = ')
  assert.equal(/querySelector\('\[data-dshm-sidebar\]'\)/.test(frame), false)
})

test('clearAnchors 会清空登记表与缓存闸门（不留跨实例脏状态）', () => {
  const body = slice('function clearAnchors(doc) {', 'function ')
  assert.match(body, /popoverMarks\.clear\(\)/)
  assert.match(body, /capsuleArtifactsMayExist = false/)
  assert.match(body, /layoutPickerCount = 0/)
})
