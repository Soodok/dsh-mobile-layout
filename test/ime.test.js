'use strict'

/**
 * 键盘测量单元测试（v0.4.1）。
 *
 * ## 背景
 * 用户报「小窗悬浮预设下底部导航栏不见了」。根因不是导航没渲染，而是
 * `data-dshm-ime` 被误置：旧实现拿 `visualViewport.height` 和历史满高比，
 * 而页面缩放 ≠ 100% 时 height 会整条等比缩放（468dp 窗口 + 150% 缩放 = 826 → 551，
 * 差 275 ≥ 120），于是一应用 viewport meta 就被当成键盘弹出，导航 opacity: 0。
 *
 * 修法：满高按「布局 px」记（clientHeight × scale），对页面缩放免疫。
 * 这里锁住换算与判定两个纯函数。
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
    console: { warn() {}, error() {}, log() {} },
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'lib/client.js' })
  return captured
}

const { layoutHeightPx, isKeyboardOpen, IME_MIN_PX } = loadClient().__test

test('layoutHeightPx：不同页面缩放换算回同一布局高度', () => {
  // 826dp 高的窗口：scale=1 时 clientHeight=826，scale=1.5 时 551。
  assert.equal(layoutHeightPx(826, 1), 826)
  assert.equal(layoutHeightPx(551, 1.5), 827) // 551×1.5 = 826.5，四舍五入
  // 90%（插件页默认 90%，见 app DEFAULT_PAGE_SCALE）
  assert.equal(layoutHeightPx(918, 0.9), 826)
})

test('layoutHeightPx：非法输入返回 0，scale 缺失按 1 处理', () => {
  assert.equal(layoutHeightPx(0, 1), 0)
  assert.equal(layoutHeightPx(-5, 1), 0)
  assert.equal(layoutHeightPx(Number.NaN, 1), 0)
  assert.equal(layoutHeightPx(800, undefined), 800)
  assert.equal(layoutHeightPx(800, 0), 800)
  assert.equal(layoutHeightPx(800, Number.NaN), 800)
})

test('isKeyboardOpen：页面缩放从 100% 变 150% 不算键盘（回归）', () => {
  const full = layoutHeightPx(826, 1) // 826
  const zoomed = layoutHeightPx(551, 1.5) // 827 —— 缩放后仍是同一满高
  assert.equal(isKeyboardOpen(zoomed, full), false)
})

test('isKeyboardOpen：真键盘（布局高度收缩 ≥120）才算', () => {
  const full = 826
  assert.equal(isKeyboardOpen(826 - 119, full), false)
  assert.equal(isKeyboardOpen(826 - 120, full), true)
  // 150% 缩放下键盘 300 设备 px → 布局 826 → 526
  assert.equal(isKeyboardOpen(layoutHeightPx(351, 1.5), full), true)
})

test('isKeyboardOpen：满高未知（0）时不判定为键盘', () => {
  assert.equal(isKeyboardOpen(400, 0), false)
  assert.equal(isKeyboardOpen(0, 826), false)
  assert.equal(isKeyboardOpen(Number.NaN, 826), false)
})

test('IME_MIN_PX 是判定阈值本身', () => {
  assert.equal(IME_MIN_PX, 120)
  assert.equal(isKeyboardOpen(826 - IME_MIN_PX, 826), true)
  assert.equal(isKeyboardOpen(826 - IME_MIN_PX + 1, 826), false)
})

/**
 * CSS 契约：键盘态只淡出导航是不够的。
 *
 * 官方 shell.bottom 是 grid 的第二行（尺寸 auto），行高由导航自身 56px 撑开；
 * 导航 `opacity: 0` 后行高还在，输入卡就被顶到离键盘整整一条导航远的地方 ——
 * 真机看到的就是「输入框和键盘之间多了一条白条」（1260×2800 截图实测约 200
 * 物理 px ≈ 56dp + 8px 阴影净空）。这里锁住修法本身，避免以后被「只做淡出」
 * 的改动悄悄带回来。
 */
test('CSS 契约：键盘态收掉底栏行高度与阴影净空（回归）', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8')
  const cases = [
    ['[data-dshm-preset="v2"][data-dshm-ime] [data-dshm-bottom]', 'height: 0 !important;'],
    ['[data-dshm-preset="v2"][data-dshm-ime] [data-dshm-composer-clip]', 'padding-bottom: 0 !important;'],
  ]
  for (const [selector, declaration] of cases) {
    const at = source.indexOf(selector)
    assert.ok(at > 0, `缺少键盘态规则：${selector}`)
    const block = source.slice(at, at + 400)
    assert.ok(
      block.includes(declaration),
      `${selector} 必须声明 ${declaration}（只淡出导航会在输入框与键盘之间留一条白条）`,
    )
  }
})
