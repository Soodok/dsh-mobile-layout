'use strict'

/**
 * 浮层收起后的焦点归还测试（v0.4.2）。
 *
 * 背景（真机反馈）：焦点在输入框时手动收起软键盘 → 打开侧边栏 → 收起侧边栏，
 * 软键盘被自动唤起，输入卡被压在键盘下面。原因是抽屉关闭时把焦点还给了打开前
 * 的元素（那个 textarea），而 Android 上脚本 focus() 会无条件拉起软键盘。
 *
 * 两条防线：
 *   ① isTextEntry：文本录入控件一律不归还焦点；
 *   ② guardComposerFocusAfterOverlay：收起后 400ms 内，任何落进文本控件的
 *      焦点都被 blur 掉（拦住官方自己的 refocus），真实触摸则立刻撤窗。
 *
 * isTextEntry 是纯函数，无 DOM 也能跑；护栏用例需要 jsdom，装不上就 skip。
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
 * @param {Window} jsdomWindow jsdom window
 * @returns {object} __test 导出
 */
function loadClient(jsdomWindow) {
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load({ factory }) {
          captured = factory(() => ({}))
        },
      },
      setTimeout,
      clearTimeout,
    },
    document: jsdomWindow.document,
    Node: jsdomWindow.Node,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    console: { warn() {}, error() {}, log() {} },
  }
  vm.createContext(sandbox)
  vm.runInContext(SOURCE, sandbox, { filename: 'lib/client.js' })
  return captured.__test
}

/** 等一轮宏任务，让护栏里的 setTimeout(0) 落地。 */
function tick(ms = 10) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('isTextEntry：输入类控件与可编辑区算文本录入', () => {
  const api = loadClientStub()
  assert.equal(api.isTextEntry({ tagName: 'TEXTAREA' }), true)
  assert.equal(api.isTextEntry({ tagName: 'INPUT' }), true)
  assert.equal(api.isTextEntry({ tagName: 'SELECT' }), true)
  assert.equal(api.isTextEntry({ tagName: 'DIV', isContentEditable: true }), true)
  assert.equal(api.isTextEntry({ tagName: 'BUTTON' }), false)
  assert.equal(api.isTextEntry({ tagName: 'A' }), false)
  assert.equal(api.isTextEntry({ tagName: 'DIV', isContentEditable: false }), false)
  assert.equal(api.isTextEntry(null), false)
  assert.equal(api.isTextEntry(undefined), false)
})

/** 纯函数用例不需要 document，给个最小桩即可。 */
function loadClientStub() {
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load({ factory }) {
          captured = factory(() => ({}))
        },
      },
      setTimeout,
      clearTimeout,
    },
    document: {
      documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {} },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {},
      removeEventListener() {},
    },
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    console: { warn() {}, error() {}, log() {} },
  }
  vm.createContext(sandbox)
  vm.runInContext(SOURCE, sandbox, { filename: 'lib/client.js' })
  return captured.__test
}

test('护栏：收起浮层后脚本聚焦输入框会被 blur 掉（回归）', { skip: SKIP }, async () => {
  const dom = new JSDOM('<!doctype html><html><body><textarea id="t"></textarea><button id="b">x</button></body></html>')
  const api = loadClient(dom.window)
  const doc = dom.window.document
  const ta = doc.getElementById('t')

  api.guardComposerFocusAfterOverlay()
  ta.focus()
  assert.equal(doc.activeElement, ta, '前提：focus() 确实把焦点放到输入框上')

  await tick()
  assert.notEqual(doc.activeElement, ta, '护栏应把焦点从输入框撤走（否则 Android 会弹键盘）')
})

test('护栏：真实触摸（pointerdown）后失效，用户点输入框照常聚焦', { skip: SKIP }, async () => {
  const dom = new JSDOM('<!doctype html><html><body><textarea id="t"></textarea></body></html>')
  const api = loadClient(dom.window)
  const doc = dom.window.document
  const ta = doc.getElementById('t')

  api.guardComposerFocusAfterOverlay()
  doc.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }))
  ta.focus()

  await tick()
  assert.equal(doc.activeElement, ta, '用户手势之后不应再被 blur')
})

test('护栏：非文本控件不受影响（按钮焦点保留）', { skip: SKIP }, async () => {
  const dom = new JSDOM('<!doctype html><html><body><button id="b">x</button></body></html>')
  const api = loadClient(dom.window)
  const doc = dom.window.document
  const btn = doc.getElementById('b')

  api.guardComposerFocusAfterOverlay()
  btn.focus()

  await tick()
  assert.equal(doc.activeElement, btn)
})
