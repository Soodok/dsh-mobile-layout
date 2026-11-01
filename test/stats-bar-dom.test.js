'use strict'

/**
 * 顶部状态带定位的 DOM 行为测试（v0.4.1）。
 *
 * 用 jsdom 搭一个「官方 composer 底部 dock」的最小骨架，验证 syncStatsBar 在
 * 三种真实状态下的选择：
 *   ① 空闲：两枚统计胶囊 + 上下文环
 *   ② 执行中：官方 `activity ? null : <ContextMeter/>`，上下文环整块消失
 *   ③ 空会话：dock 里什么都没有
 *
 * jsdom 不是本仓库的依赖（插件本身零运行时依赖），装不上就整体 skip；
 * 想跑这套用例：`NODE_PATH=<某处 node_modules> npm test`。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

let JSDOM = null
try {
  // eslint-disable-next-line global-require
  ;({ JSDOM } = require('jsdom'))
} catch (error) {
  JSDOM = null
}

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8')
const SKIP = JSDOM ? false : 'jsdom 未安装（NODE_PATH 指向含 jsdom 的 node_modules 即可运行）'

/**
 * 在给定 jsdom window 上装载插件模块并取 __test。
 * @param {Window} win jsdom window
 * @returns {object} __test 导出
 */
function loadClient(win) {
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load({ factory }) {
          captured = factory(() => ({}))
        },
      },
    },
    document: win.document,
    Node: win.Node,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    console: { warn() {}, error() {}, log() {} },
  }
  vm.createContext(sandbox)
  vm.runInContext(SOURCE, sandbox, { filename: 'lib/client.js' })
  return captured.__test
}

const PILL_ACTIVITY = '<span data-composer-stat="activity"><button type="button" aria-label="3 轮 24 步 · 231 tok/s"><span>3 轮 24 步 · 231 tok/s</span></button></span>'
const PILL_USAGE = '<span data-composer-stat="usage"><button type="button" aria-label="693K tok · 缓存命中 95%"><span>693K tok · 缓存命中 95%</span></button></span>'
const CONTEXT_METER = '<span><button type="button" aria-label="上下文已用 4%"><svg></svg><span>4%</span></button></span>'

/**
 * 官方 composer 骨架：中心列 > 标题栏 + 输入卡 + dock。
 * @param {string} dockInner dock 内部 HTML
 * @param {{tab?: string}} [options] 额外结构
 * @returns {string} HTML
 */
function hostHtml(dockInner, options = {}) {
  const tab = options.tab
    ? `<button type="button" role="tab" aria-label="${options.tab}">${options.tab}</button>`
    : ''
  return `<!doctype html><html data-dshm-mode="mobile"><body>
    <div data-dshm-center>
      <header data-window-drag><div data-dshm-tabs>${tab}</div></header>
      <div class="composer">
        <div data-composer-card><div contenteditable="true"></div></div>
        <div class="dock" data-composer-dock>${dockInner}</div>
      </div>
    </div>
  </body></html>`
}

test('空闲态：dock 有胶囊 + 上下文环时被打上顶部状态带标记', { skip: SKIP }, () => {
  const dom = new JSDOM(hostHtml(PILL_ACTIVITY + PILL_USAGE + CONTEXT_METER))
  const api = loadClient(dom.window)
  api.syncStatsBar()
  const doc = dom.window.document
  const dock = doc.querySelector('[data-composer-dock]')
  assert.equal(dock.hasAttribute('data-dshm-stats'), true)
  assert.equal(doc.documentElement.hasAttribute('data-dshm-stats-on'), true)
  assert.ok(doc.documentElement.style.getPropertyValue('--dshm-stats-height'))
  assert.ok(doc.documentElement.style.getPropertyValue('--dshm-stats-top'))
})

test('执行中：上下文环不渲染（只有两枚胶囊）时仍要打标（回归）', { skip: SKIP }, () => {
  // 官方是 activity ? null : <ContextMeter/>；旧实现要求 tok + 上下文两枚按钮
  // 同时存在，运行中必然失配 → 状态带掉回输入区下方。
  const dom = new JSDOM(hostHtml(PILL_ACTIVITY + PILL_USAGE))
  const api = loadClient(dom.window)
  api.syncStatsBar()
  const dock = dom.window.document.querySelector('[data-composer-dock]')
  assert.equal(dock.hasAttribute('data-dshm-stats'), true)
})

test('头部有「上下文」页签时不会把它误当成统计按钮（回归）', { skip: SKIP }, () => {
  // 新宿主顶部多了「对话 / 轨迹 / 上下文」切换条；旧实现按 aria-label 找
  // /上下文/ 会命中页签，爬公共祖先一路爬到中心列 → 判 dock === root → 清标。
  const dom = new JSDOM(hostHtml(PILL_ACTIVITY + PILL_USAGE, { tab: '上下文' }))
  const api = loadClient(dom.window)
  api.syncStatsBar()
  const dock = dom.window.document.querySelector('[data-composer-dock]')
  assert.equal(dock.hasAttribute('data-dshm-stats'), true)
})

test('空 dock（空会话）不打标，也不留 --dshm-stats-* 变量', { skip: SKIP }, () => {
  const dom = new JSDOM(hostHtml(''))
  const api = loadClient(dom.window)
  api.syncStatsBar()
  const doc = dom.window.document
  assert.equal(doc.querySelector('[data-composer-dock]').hasAttribute('data-dshm-stats'), false)
  assert.equal(doc.documentElement.hasAttribute('data-dshm-stats-on'), false)
  assert.equal(doc.documentElement.style.getPropertyValue('--dshm-stats-height'), '')
})

test('窄屏纯文本轮次行（无胶囊、无上下文环）也认（41 字符不再被拒）', { skip: SKIP }, () => {
  const row = '3 轮 24 步 · 231 tok/s · 693K tok · 缓存命中 95% · 4%'
  assert.ok(row.length > 40)
  const dom = new JSDOM(hostHtml(`<span>${row}</span>`))
  const api = loadClient(dom.window)
  api.syncStatsBar()
  assert.equal(dom.window.document.querySelector('[data-composer-dock]').hasAttribute('data-dshm-stats'), true)
})
