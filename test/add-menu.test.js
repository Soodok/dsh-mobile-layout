'use strict'

/**
 * 加号面板（v2）接管链的回归契约（0.4.9）。
 *
 * 这一组全是**源码契约**：接管逻辑依赖 DOM + React 状态 + 时序三者交叉，
 * 纯函数单测覆盖不到；而 0.4.8 的四个缺陷（抑制窗丢弃用户意图、面板留白吃
 * 点击、切预设不清理、派发链无取消令牌）都恰好是「一行代码改回去就复发、
 * 平时又看不出来」的类型。用契约把它们钉住，改坏了单测立刻红。
 *
 * 取证与实测见 `.workbuddy/plan/button-flow-audit-plan.md` §十 / §十一。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8')

test('用户意图：只认真人 pointerdown，且晚于关闭/派发才放行', () => {
  // 1) 意图时间戳只由 isTrusted 的 pointerdown 更新（插件自己派的事件不算）
  assert.ok(
    /if \(!event\.isTrusted\) return;\s*\n\s*addMenuUserIntentAt = Date\.now\(\);/.test(source),
    '用户意图必须过滤 isTrusted，否则「派发后官方重开面板」会被自己判成用户点击',
  )
  // 2) 放行判据：意图时刻晚于「关闭」和「派发」两个时间戳
  assert.ok(
    /addMenuUserIntentAt > Math\.max\(addMenuClosedAt, addMenuDispatchAt\)/.test(source),
    '抑制窗必须被「用户新意图」短路，否则 500ms 内的主动再点会被丢弃（S2/P0-1）',
  )
  // 3) 抑制窗本身仍然保留（挡官方重放）
  assert.ok(
    /now - addMenuClosedAt < 500/.test(source) && /now - addMenuDispatchAt < 2000/.test(source),
    '两个抑制窗仍需保留，否则面板会「关了又自己弹回来」',
  )
})

test('接管以 DOM 为准，并有心跳兜底（状态脱节可自愈）', () => {
  // 接管函数不得再看 popoverOpen（观察器漏报时该状态会长期停 false）
  const start = source.indexOf('function tryTakeOverAddMenu()')
  assert.ok(start > 0, '应有 tryTakeOverAddMenu()')
  const body = source.slice(start, start + 700)
  assert.ok(!/popoverOpen/.test(body), 'tryTakeOverAddMenu 不应依赖 state.popoverOpen')
  assert.ok(/querySelector\('\[\' \+ ATTR_POPOVER \+ '\]'\)/.test(body), '应以 DOM 浮层标记为准')
  assert.ok(/countSectionTitles\(listbox\)/.test(body), '结构不符时不得接管（保留官方原生菜单）')

  // 心跳：200ms 巡检 + 双向修状态
  assert.ok(/window\.setInterval\([\s\S]{0,900}tryTakeOverAddMenu\(\);[\s\S]{0,80}\}, 200\)/.test(source), '应每 200ms 巡检一次接管机会')
  assert.ok(/if \(state\.popoverOpen\) setState\(\{ popoverOpen: false \}\)/.test(source), '浮层已消失而状态仍为 true 时应反向自愈')
})

test('派发重试链带世代号，切预设/切模式立即作废', () => {
  assert.ok(/const epoch = addMenuEpoch;/.test(source), 'dispatchAddOption 应记录派发时的世代号')
  assert.ok(
    /if \(epoch !== addMenuEpoch\) \{\s*\n\s*done\(false\);\s*\n\s*return;/.test(source),
    '世代不符应立刻结束重试链（不再重开官方面板）',
  )
  assert.ok(
    /if \(epoch !== addMenuEpoch\) \{\s*\n\s*resolve\(false\);\s*\n\s*return;/.test(source),
    '子层派发同样要自检世代',
  )
  // setPreset：先作废派发链，再收面板，且在 evaluateNow 之前
  const sp = source.indexOf('const setPreset = (raw) => {')
  const seg = source.slice(sp, sp + 1400)
  const bump = seg.indexOf('addMenuEpoch += 1;')
  const close = seg.indexOf('closeV2AddMenu();')
  const evalAt = seg.indexOf('evaluateNow();')
  assert.ok(bump > 0 && close > bump && evalAt > close, 'setPreset 应先递增世代、再收面板、再重算模式')
  // setMode(MODE_DEFAULT)：清理清单里也要收面板
  const sm = source.indexOf('const setMode = (next) => {')
  const smSeg = source.slice(sm, sm + 3000)
  assert.ok(/if \(next === MODE_DEFAULT\) \{[\s\S]{0,400}closeV2AddMenu\(\);/.test(smSeg), 'setMode(MODE_DEFAULT) 的清理清单应包含 closeV2AddMenu()')
})

test('面板容器不吃事件，只有内容块吃（点击黑洞回归）', () => {
  const css = source.slice(source.indexOf('.dshm-v2-addpanel {\'') - 200, source.indexOf('.dshm-v2-addpanel-grab'))
  assert.ok(/\.dshm-v2-addpanel \{[\s\S]{0,600}'  pointer-events: none;'/.test(css), '面板容器应 pointer-events: none（留白点击交给遮罩）')
  assert.ok(
    /\.dshm-v2-addpanel-head,[\s\S]{0,300}'  pointer-events: auto;'/.test(source),
    'head / tiles / list 三个内容块应把事件收回来',
  )
  assert.ok(source.includes("'  flex: 0 1 auto;'"), '列表应 flex: 0 1 auto，内容不足时不要把空白撑到全高')
})

test('接管判定有可读的诊断快照', () => {
  assert.ok(/compat\.addMenu = Object\.assign/.test(source), '__dshmCompat.addMenu 应记录最近一次接管判定')
  assert.ok(/phase: 'took-over'/.test(source) && /phase: 'structure-miss'/.test(source), '应区分「接管成功」与「结构没读到」')
})
