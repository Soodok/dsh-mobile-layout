'use strict'

/**
 * 单契约缺失的降级边界（三预设稳定性的核心回归）。
 *
 * 每个用例只撤掉**一个**官方契约 / 服务，断言：
 *   1. 对应特征退到既定兜底；
 *   2. 其它特征与其它预设不受牵连。
 *
 * 与 test/compat-contract.test.js 的分工：那边验证「契约存在时的分类」，
 * 这边验证「契约缺席时的隔离」，两者合起来覆盖双向对照。
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

const api = loadClient().__test
const {
  chooseSettingsPath,
  classifyDialog,
  normalizeFeatures,
  featureMode,
  resolveCapabilities,
  shouldManageSettingsPanel,
  legacyNativePickerVisible,
  navSlots,
  effectiveMode,
  quickPickVisible,
  resolvePreset,
  PRESET_DEFAULT,
  PRESET_CLASSIC,
  PRESET_V2,
  MODE_DEFAULT,
  MODE_MOBILE,
  HOST_ANDROID,
} = api

test('设置 slot 缺失：只退到 legacy 选择器，不会锁死 default 预设', () => {
  // 无可挂载信号 → legacy；但 legacy picker 仍给 default 预设提供 native 档开关。
  assert.equal(chooseSettingsPath({}, Date.now()), 'legacy')
  assert.equal(legacyNativePickerVisible(PRESET_DEFAULT, 'legacy'), true)
  // 其它预设的 legacy picker 不需要 native 档（已经接管设置页）。
  assert.equal(legacyNativePickerVisible(PRESET_CLASSIC, 'legacy'), false)
  assert.equal(legacyNativePickerVisible(PRESET_V2, 'legacy'), false)
})

test('弹窗契约缺失：回落到启发式，仍能认出设置页而不是当成抽屉', () => {
  // 无 data-shortcut-modal → legacy 启发式路径
  assert.equal(classifyDialog({ role: 'dialog', ariaModal: 'true', navButtons: 4, hasControls: true }), 'legacy')
  // 抽屉形态在老宿主上不满足 nav≥3，不会被误判成设置页
  assert.equal(classifyDialog({ role: 'dialog', ariaModal: 'true', navButtons: 1 }), 'none')
})

test('theme 服务缺失：只影响诊断，不影响设置接管与三预设判定', () => {
  const features = normalizeFeatures({ settingsSlot: true, dialogContract: true })
  assert.equal(features.themeOverride, false, 'theme 缺席')
  assert.equal(featureMode(features), 'native', '其它契约在场仍判 native')
  for (const preset of [PRESET_DEFAULT, PRESET_CLASSIC, PRESET_V2]) {
    assert.equal(effectiveMode(HOST_ANDROID, 390, 844, MODE_DEFAULT, preset) === (preset === PRESET_DEFAULT ? MODE_DEFAULT : MODE_MOBILE), true)
  }
})

test('theme 服务缺失不改变 native minimal 的接管决策', () => {
  // 接管只看 preset + nativeStyle，与 theme 无关（theme 只影响颜色来源）
  assert.equal(shouldManageSettingsPanel(PRESET_DEFAULT, 'minimal'), false)
  assert.equal(shouldManageSettingsPanel(PRESET_DEFAULT, 'enhanced'), true)
})

test('sidebarRight 缺失：v2 只摘掉工作台一项，其余四项保留且不产生空位', () => {
  const full = navSlots({ sessions: true, automation: true, plugins: true, rightbar: true, settings: true })
  const degraded = navSlots({ sessions: true, automation: true, plugins: true, rightbar: false, settings: true })
  assert.equal(full.length, 5)
  assert.equal(degraded.length, 4)
  assert.equal(degraded.includes('workbench'), false)
  assert.equal(new Set(degraded).size, degraded.length, '不得出现重复键占位')
})

test('能力快照全空：整套特征都安全降级为不可用而非抛错', () => {
  const caps = resolveCapabilities({})
  assert.equal(caps.mode, 'legacy')
  assert.equal(caps.settingsSlotAvailable, false)
  for (const value of Object.values(normalizeFeatures(null))) assert.equal(value, false)
})

test('预设切换不互相污染：同一组输入下三种预设各自给出稳定结果', () => {
  const cases = [
    [PRESET_DEFAULT, MODE_DEFAULT],
    [PRESET_CLASSIC, MODE_MOBILE],
    [PRESET_V2, MODE_MOBILE],
  ]
  for (const [preset, expected] of cases) {
    assert.equal(effectiveMode(HOST_ANDROID, 390, 844, MODE_DEFAULT, preset), expected, preset)
    // 脏输入不会把结果带到别的预设上
    assert.equal(resolvePreset(preset), preset)
  }
  // 原生附件入口只在 default 且非桌面时出现
  assert.equal(quickPickVisible(PRESET_DEFAULT, HOST_ANDROID, true), true)
  assert.equal(quickPickVisible(PRESET_CLASSIC, HOST_ANDROID, true), false)
  assert.equal(quickPickVisible(PRESET_V2, HOST_ANDROID, true), false)
})
