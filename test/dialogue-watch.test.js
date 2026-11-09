'use strict'

/**
 * 对话区打标器的性能整理回归（2026-11）。
 *
 * 背景：`startDialogueWatchers` 的 tick 原来挂在「body 每个 childList 变更」
 * 上（每帧一次），每次 tick 里跑两遍 `[data-dshm-center]` 全量扫描 + 9 次
 * 全文档属性扫描。流式输出时 body 每秒上百次变更，等于把这些成本全压在
 * 渲染帧上。整理后：
 *   1. 时间戳与步骤行合并成一次遍历（纯函数判定，见下）；
 *   2. tick 有 DIALOGUE_TICK_MS 节流，observer 只负责排队；
 *   3. 胶囊回收在「从未进过胶囊态」时直接返回（O(1)）；
 *   4. 打标器返回 release 并进 teardowns，dispose 能真正停掉 interval。
 *
 * 这里测纯判定 + 源码契约（DOM 行为属于真机验收范围）。
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
const { isTimestampText, stepRowMarkOf, DIALOGUE_TICK_MS } = captured.__test

test('isTimestampText：三种官方写法都认', () => {
  assert.equal(isTimestampText('11月9日 21:30'), true)
  assert.equal(isTimestampText('2026-11-09 21:30'), true)
  assert.equal(isTimestampText('2026/11/09 21:30'), true)
  assert.equal(isTimestampText('21:30'), true)
  assert.equal(isTimestampText('9:05'), true)
})

test('isTimestampText：正文与近似格式不误判', () => {
  assert.equal(isTimestampText(''), false)
  assert.equal(isTimestampText('已完成，用时 12 秒'), false)
  assert.equal(isTimestampText('思考'), false)
  assert.equal(isTimestampText('21:30 收到'), false)
  assert.equal(isTimestampText('11月9日'), false)
  assert.equal(isTimestampText('2026-11-09'), false)
  assert.equal(isTimestampText('版本 1.2:30'), false)
})

test('stepRowMarkOf：思考 / 运行命令两类，中英文都认', () => {
  assert.equal(stepRowMarkOf('思考'), 'data-dshm-think')
  assert.equal(stepRowMarkOf('Thinking'), 'data-dshm-think')
  assert.equal(stepRowMarkOf('Reasoning'), '') // 不是官方文案，不猜
  assert.equal(stepRowMarkOf('运行命令'), 'data-dshm-cmd')
  assert.equal(stepRowMarkOf('执行了命令'), 'data-dshm-cmd')
  assert.equal(stepRowMarkOf('Ran command'), 'data-dshm-cmd')
  assert.equal(stepRowMarkOf('Executed command'), 'data-dshm-cmd')
})

test('stepRowMarkOf：只认整行文本，不命中正文里的同词', () => {
  assert.equal(stepRowMarkOf('思考一下这个问题'), '')
  assert.equal(stepRowMarkOf('我运行命令看了一下'), '')
  assert.equal(stepRowMarkOf(''), '')
})

test('节流常量是有限正数（tick 闸门必须有界）', () => {
  assert.equal(typeof DIALOGUE_TICK_MS, 'number')
  assert.ok(Number.isFinite(DIALOGUE_TICK_MS) && DIALOGUE_TICK_MS > 0)
  // 上限守住「感知不到延迟」这条线
  assert.ok(DIALOGUE_TICK_MS <= 400)
})

test('源码契约：时间戳与步骤行合并成一次遍历（syncStepRows 已删除）', () => {
  assert.equal(/function\s+syncStepRows\s*\(/.test(source), false)
  assert.equal(/syncStepRows\s*\(/.test(source), false)
  const body = source.slice(source.indexOf('function syncMessageMeta('))
  const fnBody = body.slice(0, body.indexOf('\n    }\n'))
  // 合并后只查一次
  assert.equal((fnBody.match(/querySelectorAll\(/g) || []).length, 1)
  assert.ok(/isTimestampText\(/.test(fnBody))
  assert.ok(/stepRowMarkOf\(/.test(fnBody))
  // 步骤行仍只认 span 叶子（与原口径一致）
  assert.ok(/node\.tagName !== 'SPAN'/.test(fnBody))
})

test('源码契约：胶囊回收在「从未进过胶囊」时是 O(1)', () => {
  const body = source.slice(source.indexOf('function cleanupCapsuleArtifacts('))
  const fnBody = body.slice(0, body.indexOf('\n    }\n'))
  assert.ok(/capsuleArtifactsMayExist/.test(fnBody))
  // 属性回收合成一条选择器，不再 8 次全文档扫描
  assert.equal((fnBody.match(/document\.querySelectorAll\(/g) || []).length, 2)
  assert.ok(/\.join\(', '\)/.test(fnBody))
})

test('源码契约：打标器可回收，且进入 teardowns', () => {
  const body = source.slice(source.indexOf('function startDialogueWatchers('))
  const fnBody = body.slice(0, body.indexOf('\n    }\n'))
  assert.ok(/clearInterval\(/.test(fnBody))
  assert.ok(/clearTimeout\(/.test(fnBody))
  assert.ok(/disconnect\(\)/.test(fnBody))
  assert.ok(/startDialogueWatchers\.release = null/.test(fnBody))
  assert.ok(/teardowns\.push\(releaseDialogueWatchers\)/.test(source))
})

test('源码契约：每帧同步链里 syncLayoutPicker 只跑一次', () => {
  const body = source.slice(source.indexOf('observer = new win.MutationObserver('))
  const fnBody = body.slice(0, body.indexOf('observer.observe('))
  // 只数真实调用（注释里会提到函数名，先去掉行注释）
  const code = fnBody.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n')
  assert.equal((code.match(/syncLayoutPicker\(\)/g) || []).length, 1)
})
