'use strict'

/**
 * 原生预设「附件」快捷入口的纯函数测试。
 *
 * 只覆盖可判定的两件事：入口可见性（预设 × 宿主 × 手机几何）与形态边界。
 * 菜单开合是 React 状态，走真机验收，不进单测。
 *
 * 与 preset.test.js 同一套沙箱：lib/client.js 是浏览器产物，工厂体内除
 * require('react') 外不碰 DOM，可以直接取 exports.__test。
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

const {
  quickPickVisible,
  isPhoneForm,
  PRESET_DEFAULT,
  PRESET_CLASSIC,
  PRESET_V2,
  MODE_DEFAULT,
  MODE_MOBILE,
  HOST_DESKTOP,
  HOST_ANDROID,
  HOST_WEB,
} = loadClient().__test

test('quickPickVisible：Android 壳内只要是原生预设就显示（不分尺寸）', () => {
  // 手机竖屏、平板全屏、平板横屏小窗：phone 真假都不影响结论。
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_ANDROID, true), true)
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_ANDROID, false), true)
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_ANDROID, undefined), true)
})

test('quickPickVisible：非原生预设一律不显示', () => {
  assert.equal(quickPickVisible(PRESET_CLASSIC, HOST_ANDROID, true), false)
  assert.equal(quickPickVisible(PRESET_V2, HOST_ANDROID, true), false)
  assert.equal(quickPickVisible(PRESET_CLASSIC, HOST_WEB, true), false)
})

test('quickPickVisible：桌面宿主一律不显示', () => {
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_DESKTOP, true), false)
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_DESKTOP, false), false)
})

test('quickPickVisible：web 宿主仍限手机竖屏', () => {
  // 桌面浏览器缩成手机比例不算（phone 来自 isPhoneForm，web host 会命中），
  // 这里只锁语义：web 侧靠 phone 兜，不跟着 Android 一起放开。
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_WEB, true), true)
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_WEB, false), false)
})

test('quickPickVisible：phone 非严格 true 不当作手机形态', () => {
  // 防御性断言：state.phone 只可能是布尔，但判据不依赖真值隐式转换。
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_WEB, undefined), false)
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_WEB, 1), false)
})

test('isPhoneForm：桌面宿主优先于几何，窗口缩成手机比例也不算', () => {
  // 桌面窗口能缩到 375×800，正好命中手机的几何；但 isPhoneForm 首行就看宿主。
  assert.equal(isPhoneForm(HOST_DESKTOP, 375, 800, MODE_MOBILE), false)
  assert.equal(isPhoneForm(HOST_DESKTOP, 390, 844, MODE_DEFAULT), false)
})

test('isPhoneForm：手机竖屏命中（原生预设下 prev 恒为 default）', () => {
  assert.equal(isPhoneForm(HOST_ANDROID, 390, 844, MODE_DEFAULT), true)
  assert.equal(isPhoneForm(HOST_WEB, 412, 915, MODE_DEFAULT), true)
})

test('isPhoneForm：自由小窗 / 平板分屏命中', () => {
  assert.equal(isPhoneForm(HOST_ANDROID, 468, 826, MODE_DEFAULT), true)
})

test('isPhoneForm：平板全屏不命中（短边 > 600）', () => {
  assert.equal(isPhoneForm(HOST_ANDROID, 768, 1024, MODE_DEFAULT), false)
  assert.equal(isPhoneForm(HOST_ANDROID, 1238, 826, MODE_DEFAULT), false)
})

test('isPhoneForm：横屏小窗不命中（竖屏条件）', () => {
  assert.equal(isPhoneForm(HOST_ANDROID, 826, 468, MODE_DEFAULT), false)
})
