'use strict'

/**
 * 引擎 0.2.2-rc.1 适配契约的纯函数测试（v0.4.7）。
 *
 * 覆盖四件事：
 *   1. 弹窗按官方 data-shortcut-modal 正向分类，抽屉不再被当成设置页；
 *   2. 「已识别缓存」复用前必须复查，误标能自愈；
 *   3. 配置 UI 在 slot / legacy / none 三条路径间的选择（含宽限期与回滚开关）；
 *   4. 能力快照归一化与源码级契约（防止后续改动把 slot 接入退化掉）。
 *
 * 与其余测试共用 vm 沙箱：lib/client.js 工厂体内除 require('react') 外不碰
 * DOM，可直接取 exports.__test。跨 realm 对象不能用 assert.deepEqual，
 * 一律逐字段断言。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const CLIENT_PATH = path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(CLIENT_PATH, 'utf8')
// 版本锁：不写死具体版本号（每次 bump 都要改测试），只校验两处声明一致。
const PKG_VERSION = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
).version

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
  vm.runInContext(source, sandbox, { filename: 'lib/client.js' })
  return captured
}

const api = loadClient().__test
const {
  classifyDialog,
  stillMatchesSettings,
  chooseSettingsPath,
  resolveCapabilities,
  normalizeFeatures,
  countFeatures,
  featureMode,
  collectFeatures,
  mergeFeatures,
  FEATURE_KEYS,
  resolvePreset,
  VERSION,
  PRESET_DEFAULT,
  PRESET_CLASSIC,
  PRESET_V2,
} = api

// ---- 1. 弹窗契约分类 ----

test('正向契约：data-shortcut-modal="settings" 直接认定设置页', () => {
  assert.equal(classifyDialog({ shortcutModal: 'settings' }), 'settings')
  // 只要属性对，role / aria-modal / nav 都不必再猜
  assert.equal(classifyDialog({ shortcutModal: 'settings', role: '', ariaModal: '', navButtons: 0 }), 'settings')
})

test('正向契约：sidebar / shortcut-edit 明确排除', () => {
  assert.equal(classifyDialog({ shortcutModal: 'sidebar', role: 'dialog', ariaModal: 'true', navButtons: 4 }), 'excluded')
  assert.equal(classifyDialog({ shortcutModal: 'shortcut-edit', role: 'dialog', ariaModal: 'true', navButtons: 3 }), 'excluded')
  assert.equal(classifyDialog({ shortcutModal: 'anything-else' }), 'excluded')
})

test('旧版启发式：无属性时仍要求 role / aria-modal / nav>=3 / 内容信号', () => {
  const base = { role: 'dialog', ariaModal: 'true', navButtons: 3, hasControls: true }
  assert.equal(classifyDialog(base), 'legacy')
  assert.equal(classifyDialog(Object.assign({}, base, { hasControls: false, hasContent: true })), 'legacy')
  assert.equal(classifyDialog({ role: 'dialog', ariaModal: 'true', navButtons: 2, hasControls: true }), 'none')
  assert.equal(classifyDialog({ role: 'dialog', ariaModal: 'false', navButtons: 3, hasControls: true }), 'none')
  assert.equal(classifyDialog({ role: '', ariaModal: 'true', navButtons: 3, hasControls: true }), 'none')
  assert.equal(classifyDialog({ role: 'dialog', ariaModal: 'true', navButtons: 3, hasControls: false, hasContent: false }), 'none')
})

test('分类函数对脏输入不抛错', () => {
  assert.equal(classifyDialog(null), 'none')
  assert.equal(classifyDialog(undefined), 'none')
  assert.equal(classifyDialog('settings'), 'none')
  assert.equal(classifyDialog({}), 'none')
})

// ---- 2. 缓存复查（v0.4.6 误标抽屉的根因） ----

test('stillMatchesSettings：节点已脱离文档即失效', () => {
  assert.equal(stillMatchesSettings({ connected: false, shortcutModal: 'settings' }), false)
  assert.equal(stillMatchesSettings(null), false)
})

test('stillMatchesSettings：正向契约仍有效、其它模态一律失效', () => {
  assert.equal(stillMatchesSettings({ connected: true, shortcutModal: 'settings' }), true)
  assert.equal(stillMatchesSettings({ connected: true, shortcutModal: 'sidebar' }), false)
  assert.equal(stillMatchesSettings({ connected: true, shortcutModal: 'shortcut-edit' }), false)
})

test('stillMatchesSettings：旧版缓存只要求结构与导航，不要求内容', () => {
  // 页签切换途中官方会短暂卸载内容，这时撤标会让面板闪回
  assert.equal(stillMatchesSettings({ connected: true, role: 'dialog', navButtons: 3 }), true)
  assert.equal(stillMatchesSettings({ connected: true, role: 'dialog', navButtons: 2 }), false)
  assert.equal(stillMatchesSettings({ connected: true, role: '', navButtons: 3 }), false)
})

// ---- 3. 配置 UI 路径选择 ----

test('chooseSettingsPath：强制开关优先级最高', () => {
  assert.equal(chooseSettingsPath({ safeMode: true, settingsSlotSeen: true }, 1000), 'none')
  assert.equal(chooseSettingsPath({ forceLegacy: true, settingsSlotSeen: true }, 1000), 'legacy')
})

test('chooseSettingsPath：slot 组件已挂载则一直走 slot', () => {
  assert.equal(chooseSettingsPath({ settingsSlotSeen: true, settingsSlotRegisteredAt: 0 }, 99999), 'slot')
})

test('chooseSettingsPath：注册后宽限期内等待挂载，超时退回 legacy', () => {
  const cap = { settingsSlotRegisteredAt: 1000, settingsSlotGraceMs: 2500 }
  assert.equal(chooseSettingsPath(cap, 1000), 'slot')
  assert.equal(chooseSettingsPath(cap, 3499), 'slot')
  assert.equal(chooseSettingsPath(cap, 3500), 'legacy')
  assert.equal(chooseSettingsPath(cap, 9999), 'legacy')
})

test('chooseSettingsPath：从未注册 / 脏输入一律 legacy', () => {
  assert.equal(chooseSettingsPath({}, Date.now()), 'legacy')
  assert.equal(chooseSettingsPath(null, Date.now()), 'legacy')
  assert.equal(chooseSettingsPath({ settingsSlotRegisteredAt: 0 }, 1000), 'legacy')
  assert.equal(chooseSettingsPath({ settingsSlotGraceMs: 2500 }, 1000), 'legacy')
})

// ---- 4. 能力快照归一化 ----

test('特征快照：键集固定、脏值一律视为不可用', () => {
  const empty = normalizeFeatures(null)
  for (const key of FEATURE_KEYS) assert.equal(empty[key], false, key)
  const mixed = normalizeFeatures({ themeOverride: true, commandUi: 'yes', extra: true })
  assert.equal(mixed.themeOverride, true)
  assert.equal(mixed.commandUi, false, '非布尔 true 一律不认')
  assert.equal(Object.prototype.hasOwnProperty.call(mixed, 'extra'), false, '未知键不进入快照')
  assert.equal(countFeatures(mixed), 1)
  assert.equal(countFeatures(null), 0)
})

test('特征聚合：有 dialog/slot 契约才判 native，不再看版本号', () => {
  assert.equal(featureMode({}), 'legacy')
  assert.equal(featureMode({ dialogContract: true }), 'native')
  assert.equal(featureMode({ settingsSlot: true }), 'native')
  assert.equal(featureMode({ themeOverride: true, commandUi: true }), 'legacy', '单独的服务不足以判 native')
})

test('resolveCapabilities：版本号只作诊断，特征才是闸门', () => {
  const native = resolveCapabilities({
    engineVersion: '0.2.2-rc.1',
    features: { dialogContract: true, settingsSlot: true },
  })
  assert.equal(native.engineVersion, '0.2.2-rc.1')
  assert.equal(native.dialogContract, 'attribute')
  assert.equal(native.settingsSlotAvailable, true)
  assert.equal(native.mode, 'native')

  // 关键行为变更：只报版本号、不报契约时不再判 native（删掉版本正则）
  assert.equal(resolveCapabilities({ engineVersion: '0.2.2-rc.1' }).mode, 'legacy')
  assert.equal(resolveCapabilities({ engineVersion: '  0.2.2-rc.1  ' }).mode, 'legacy')

  const old = resolveCapabilities({ engineVersion: '0.2.1-rc.5' })
  assert.equal(old.dialogContract, 'legacy')
  assert.equal(old.settingsSlotAvailable, false)
  assert.equal(old.mode, 'legacy')
})

test('resolveCapabilities：强制档与脏输入的边界', () => {
  assert.equal(resolveCapabilities({}).engineVersion, 'unknown')
  assert.equal(resolveCapabilities({}).mode, 'legacy')
  assert.equal(resolveCapabilities({ settingsSlotAvailable: true }).mode, 'native')
  assert.equal(resolveCapabilities({ dialogContract: 'attribute' }).mode, 'native')
  assert.equal(resolveCapabilities({ features: { settingsSlot: true }, safeMode: true }).mode, 'safe')
  assert.equal(resolveCapabilities({ forceSafe: true, settingsSlotAvailable: true }).mode, 'safe')
  assert.equal(resolveCapabilities(null).engineVersion, 'unknown')
  assert.equal(resolveCapabilities({ dialogContract: 'nonsense' }).dialogContract, 'legacy')
})

test('collectFeatures：从服务与 DOM 只读探测，缺失一律 false', () => {
  const ctx = {
    get(name) {
      if (name === 'theme') return { overrideTokens() {} }
      if (name === 'commandUi') return { candidates() {}, dispatch() {} }
      if (name === 'sidebarRightTabs') return {}
      return null
    },
  }
  const doc = {
    querySelector(selector) {
      return selector === '[data-shortcut-modal]' || selector === '[data-composer-card]' ? {} : null
    },
  }
  const features = collectFeatures(ctx, doc)
  assert.equal(features.themeOverride, true)
  assert.equal(features.commandUi, true)
  assert.equal(features.sidebarRightTabs, false, 'register 缺失即不可用')
  assert.equal(features.dialogContract, true)
  assert.equal(features.composerCard, true)
  assert.equal(features.composerSeat, false)
  assert.equal(features.settingsSlot, false, 'slot 由注册结果回填，不在启动期猜')
  assert.equal(countFeatures(features), 4)

  const none = collectFeatures(null, { querySelector() { return null } })
  assert.equal(countFeatures(none), 0)
  assert.equal(collectFeatures({ get() { throw new Error('boom') } }, doc).themeOverride, false)
})

test('源码契约：版本正则已删除，特征探针进入诊断快照', () => {
  assert.doesNotMatch(source, /\/\^0\\\.2\\\.2\//, '不得再用引擎版本正则当闸门')
  assert.match(source, /runtime\.compat\.features = collectFeatures\(ctx, doc\);/)
  assert.match(source, /runtime\.compat\.featureCount = countFeatures\(caps\.features\);/)
  assert.match(source, /if \(runtime\.compat\.features\) runtime\.compat\.features\.settingsSlot = true;/)
})

test('特征合并：观察到即记住，不因瞬时缺席回退', () => {
  const first = mergeFeatures({ composerCard: true }, { composerCard: false, dialogContract: false })
  assert.equal(first.composerCard, true, '已观察到的契约不因后续帧缺席而回退')
  const later = mergeFeatures(first, { dialogContract: true })
  assert.equal(later.composerCard, true)
  assert.equal(later.dialogContract, true, '新观察到的契约要并入')
  const empty = mergeFeatures(null, null)
  for (const key of FEATURE_KEYS) assert.equal(empty[key], false, key)
})

test('预设白名单在适配改动后不变', () => {
  assert.equal(resolvePreset('DEFAULT'), PRESET_DEFAULT)
  assert.equal(resolvePreset(' classic '), PRESET_CLASSIC)
  assert.equal(resolvePreset('V2'), PRESET_V2)
  assert.equal(resolvePreset({}), PRESET_CLASSIC)
  // VERSION 必须跟着 package.json 一起 bump（verify-package.mjs 也校验）。
  assert.equal(VERSION, PKG_VERSION)
})

// ---- 6. 源码级契约（防止实现被改回去） ----

test('源码契约：设置弹窗按 data-shortcut-modal 正向识别并自愈错标', () => {
  assert.match(source, /data-shortcut-modal="settings"/)
  assert.match(source, /pruneSettingsTags\(/)
  assert.match(source, /if \(dialog\.hasAttribute\('data-shortcut-modal'\)\) continue;/)
  assert.match(source, /stillMatchesSettings\(desc\)/)
})

test('源码契约：配置优先注册 settings.general.item，且 legacy 仍在', () => {
  assert.match(source, /slots\.inject\('settings\.general\.item'/)
  assert.match(source, /id: 'dshm-layout'/)
  assert.match(source, /order: 10\.5/)
  assert.match(source, /chooseSettingsPath\(runtime\.compat, Date\.now\(\)\)/)
  // slot 组件不带 LAYOUT_PICKER_ATTR，legacy 清理不会误删它
  assert.match(source, /'data-dshm-layout-path': 'slot'/)
  assert.match(source, /function ensureLayoutPicker\(/)
})

test('源码契约：data-dshm-form 无条件写入，锚点优先 data-slot', () => {
  assert.match(source, /applyFormAttr\(phone\);\n\s*const next = effectiveMode/)
  assert.match(source, /applyFormAttr\(state\.phone\);/)
  assert.match(source, /getAttribute\('data-slot'\) === 'sidebar'/)
  assert.match(source, /getAttribute\('data-slot'\) === 'main'/)
})

test('源码契约：诊断与兼容性声明齐备', () => {
  assert.match(source, /win\.__dshmCompat = runtime\.compat/)
  assert.match(source, /dshm-settings-slot/)
  assert.match(source, /dshm-compat/)
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
  assert.equal(pkg.version, VERSION)
  assert.equal(pkg.dsh.compatibility.dshReleases['0.2.2-rc.1'], 'compatible')
  assert.ok(pkg.dsh.compatibility.capabilities.slots.includes('settings.general.item'))
})

test('源码契约：default minimal 只读设置弹窗，enhanced/classic/v2 保留设置接管路径', () => {
  assert.match(source, /function shouldManageSettingsPanel\(preset, nativeStyle\)/)
  assert.match(source, /if \(!shouldManageSettingsPanel\(state\.preset, runtime\.nativeStyle\) && path === 'legacy'\)/)
  assert.match(source, /runtime\.compat\.settingsPath = 'legacy-native';/)
  assert.match(source, /function buildLayoutPicker\(doc, options = \{\}\)/)
  assert.match(source, /if \(options\.includeNativeStyle\)/)
  assert.match(source, /function findSettingsDialog\(readOnly = false\)/)
  assert.match(source, /const found = findSettingsDialog\(true\);/)
  assert.match(source, /if \(!readOnly\) \{\n\s*pruneSettingsTags\(native\);/)
  assert.match(source, /if \(!readOnly\) pruneSettingsTags\(null\);/)
  assert.match(source, /tagSettings\(found\);\n\s*hardenSettings\(found\.dialog\);/)
  assert.match(source, /const NATIVE_STYLE_KEY = 'dshm-native-style';/)
  assert.match(source, /data-dshm-native/)
})

test('源码契约：设置页关闭按钮按官方弹窗契约正向查找', () => {
  // 0.2.2-rc.1 把工具行移出 content，旧 head 打标找不到官方 ✕
  assert.match(source, /const dialog = document\.querySelector\('\[data-shortcut-modal="settings"\]'\);/)
  assert.match(source, /Array\.from\(dialog\.querySelectorAll\('button'\)\)\.find\(isCloseButton\)/)
  assert.match(source, /close\.setAttribute\(ATTR_SETTINGS_CLOSE, ''\)/)
})
