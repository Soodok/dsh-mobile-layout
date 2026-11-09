'use strict'

/**
 * 底栏样式层（胶囊 / 抽屉把手）单元测试。
 *
 * ## 背景
 * 一个外部 PR 把 v2 的底栏直接改成「浮起胶囊 + 可收起把手」，但它是无条件生效的：
 * 底栏从此永远铺不透明底色，而仓库里对这条**已经有明确决策**——输入卡的软阴影
 * 会落到导航这一行，铺一层不透明底色会把阴影切成一条硬边（见 lib/client.js 的
 * v2 样式段注释与 docs/preset2-progress.md）。所以这里把外观收成**可选的样式层**：
 *
 *   data-dshm-dock="capsule"   打开胶囊外观（默认没有这条属性 = 透明底栏）
 *   data-dshm-dock-collapsed   把手收起态（只在胶囊外观下有意义）
 *
 * 这个文件锁四件事：
 *   1. 根属性的读写是幂等的、默认不写（升级不会自动改外观）；
 *   2. 胶囊样式的每条 CSS 都收在 `[data-dshm-dock="capsule"]` 之下——不能漏到
 *      默认底栏上去，否则「透明底栏」这个决策会被悄悄推翻；
 *   3. 高度契约：底栏行总高走 `--dshm-v2-nav-total`，四处按底栏让位的地方都
 *      改用它，加一行把手不会再让面板 / 设置弹窗 / 工作台错位；
 *   4. 清理链：切预设 / 切形态 / clearAnchors 都要把两条根属性摘干净。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const SOURCE_PATH = path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(SOURCE_PATH, 'utf8')

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

const {
  resolveDockStyle,
  syncDockMarker,
  readDockPrefs,
  writeDockPrefs,
  dockPages,
  dockVisibleItems,
  DOCK_STYLE_PLAIN,
  DOCK_STYLE_CAPSULE,
  DOCK_STYLE_KEY,
  DOCK_COLLAPSED_KEY,
  DOCK_NAV_ITEMS_ID,
} = loadClient().__test

/** 够用的假元素：只记属性表，够验证 sync 的幂等与清理。 */
function fakeElement() {
  const attrs = new Map()
  return {
    attrs,
    setAttribute(name, value) {
      attrs.set(name, value === undefined ? '' : String(value))
    },
    removeAttribute(name) {
      attrs.delete(name)
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null
    },
    hasAttribute(name) {
      return attrs.has(name)
    },
  }
}

/** 假 Storage；`throwOn` 用来模拟隐私模式下的写入失败。 */
function fakeStorage(initial, throwOn) {
  const map = Object.assign({}, initial)
  const guard = (kind) => {
    if (throwOn === kind) throw new Error('SecurityError')
  }
  return {
    map,
    getItem(key) {
      guard('get')
      return key in map ? map[key] : null
    },
    setItem(key, value) {
      guard('set')
      map[key] = String(value)
    },
    removeItem(key) {
      guard('remove')
      delete map[key]
    },
  }
}

/** 跨 vm 上下文的返回值转成当前 realm 的朴素对象，才能用 deepEqual 逐字段比。 */
function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

test('resolveDockStyle：只认 capsule，其余一律 literal 默认 plain', () => {
  assert.equal(resolveDockStyle(DOCK_STYLE_CAPSULE), DOCK_STYLE_CAPSULE)
  assert.equal(resolveDockStyle('  CAPSULE '), DOCK_STYLE_PLAIN) // 不做 trim/大小写宽容
  assert.equal(resolveDockStyle(DOCK_STYLE_PLAIN), DOCK_STYLE_PLAIN)
  assert.equal(resolveDockStyle(undefined), DOCK_STYLE_PLAIN)
  assert.equal(resolveDockStyle(null), DOCK_STYLE_PLAIN)
  assert.equal(resolveDockStyle('collapsed'), DOCK_STYLE_PLAIN) // 旧 PR 的脏值
})

test('syncDockMarker：默认（plain）不写任何属性', () => {
  const html = fakeElement()
  syncDockMarker(html, DOCK_STYLE_PLAIN, true)
  assert.equal(html.hasAttribute('data-dshm-dock'), false)
  // plain 下收起无意义：连 collapsed 一起摘掉，避免切回胶囊时「莫名其妙是收起的」
  assert.equal(html.hasAttribute('data-dshm-dock-collapsed'), false)
})

test('syncDockMarker：胶囊样式写样式属性，收起态写布尔属性', () => {
  const html = fakeElement()
  syncDockMarker(html, DOCK_STYLE_CAPSULE, false)
  assert.equal(html.getAttribute('data-dshm-dock'), DOCK_STYLE_CAPSULE)
  assert.equal(html.hasAttribute('data-dshm-dock-collapsed'), false)

  syncDockMarker(html, DOCK_STYLE_CAPSULE, true)
  assert.equal(html.getAttribute('data-dshm-dock-collapsed'), '')
})

test('syncDockMarker：幂等，且能从胶囊态干净退回 plain', () => {
  const html = fakeElement()
  syncDockMarker(html, DOCK_STYLE_CAPSULE, true)
  syncDockMarker(html, DOCK_STYLE_CAPSULE, true)
  assert.equal(html.getAttribute('data-dshm-dock'), DOCK_STYLE_CAPSULE)
  assert.equal(html.getAttribute('data-dshm-dock-collapsed'), '')

  syncDockMarker(html, DOCK_STYLE_PLAIN, false)
  assert.equal(html.hasAttribute('data-dshm-dock'), false)
  assert.equal(html.hasAttribute('data-dshm-dock-collapsed'), false)
})

test('syncDockMarker：元素缺席时不抛', () => {
  assert.doesNotThrow(() => syncDockMarker(null, DOCK_STYLE_CAPSULE, true))
})

test('readDockPrefs：没有存储 / 读失败时回默认（不白屏）', () => {
  assert.deepEqual(plain(readDockPrefs(null)), { style: DOCK_STYLE_PLAIN, collapsed: false })
  assert.deepEqual(plain(readDockPrefs(fakeStorage({}, 'get'))), { style: DOCK_STYLE_PLAIN, collapsed: false })
  assert.deepEqual(plain(readDockPrefs(fakeStorage({}))), { style: DOCK_STYLE_PLAIN, collapsed: false })
})

test('readDockPrefs：读到 capsule + 收起', () => {
  const storage = fakeStorage({ [DOCK_STYLE_KEY]: DOCK_STYLE_CAPSULE, [DOCK_COLLAPSED_KEY]: '1' })
  assert.deepEqual(plain(readDockPrefs(storage)), { style: DOCK_STYLE_CAPSULE, collapsed: true })
})

test('readDockPrefs：被写坏的值退回 plain', () => {
  const storage = fakeStorage({ [DOCK_STYLE_KEY]: 'garbage', [DOCK_COLLAPSED_KEY]: 'yes' })
  assert.deepEqual(plain(readDockPrefs(storage)), { style: DOCK_STYLE_PLAIN, collapsed: false })
})

test('writeDockPrefs：展开时删键，不留下 "0" 记录', () => {
  const storage = fakeStorage({ [DOCK_COLLAPSED_KEY]: '1' })
  writeDockPrefs(storage, { collapsed: false })
  assert.equal(DOCK_COLLAPSED_KEY in storage.map, false)
})

test('writeDockPrefs：收起与样式分别落盘，且样式值被归一化', () => {
  const storage = fakeStorage({})
  writeDockPrefs(storage, { style: 'garbage', collapsed: true })
  assert.equal(storage.map[DOCK_STYLE_KEY], DOCK_STYLE_PLAIN)
  assert.equal(storage.map[DOCK_COLLAPSED_KEY], '1')
  writeDockPrefs(storage, { style: DOCK_STYLE_CAPSULE })
  assert.equal(storage.map[DOCK_STYLE_KEY], DOCK_STYLE_CAPSULE)
  // 只改样式不该顺手把收起态清掉
  assert.equal(storage.map[DOCK_COLLAPSED_KEY], '1')
})

test('writeDockPrefs：隐私模式写不进去也不抛', () => {
  assert.doesNotThrow(() => writeDockPrefs(fakeStorage({}, 'set'), { style: DOCK_STYLE_CAPSULE }))
  assert.doesNotThrow(() => writeDockPrefs(null, { collapsed: true }))
})

/**
 * CSS 契约：胶囊外观必须整块收在 `[data-dshm-dock="capsule"]` 之下。
 *
 * 这是这个特性最容易翻车的地方——把外观写成无条件规则，「透明底栏」那条
 * 视觉决策就被静默推翻了（输入卡阴影被切成硬边）。所以直接扫源码：
 * 出现胶囊专属选择器时，必须同时带 v2 预设属性。
 */
test('CSS 契约：胶囊规则全部限定在 v2 + data-dshm-dock="capsule" 之下', () => {
  const stamina = Array.from(source.matchAll(/'([^']*\[data-dshm-dock[^']*)',?\s*$/gm)).map((m) => m[1])
  assert.ok(stamina.length > 0, '没有找到任何胶囊样式规则')
  for (const selector of stamina) {
    assert.ok(selector.includes('[data-dshm-preset="v2"]'), `胶囊规则缺少 v2 限定：${selector}`)
  }
})

test('CSS 契约：默认底栏仍然是透明 + 无投影（不推翻既有决策）', () => {
  const at = source.indexOf('"v2"] .dshm-v2-nav {\',')
  assert.ok(at > 0, '找不到 .dshm-v2-nav 的基础规则')
  const block = source.slice(at, at + 200)
  assert.ok(block.includes('background: transparent;'), '基础底栏必须是透明底：不透明底会把输入卡阴影切成硬边')
})

test('CSS 契约：不再引用不存在的官方 token --dsw-alias-bg-elevated', () => {
  assert.equal(
    /var\(\s*--dsw-alias-bg-elevated/.test(source),
    false,
    '官方运行时里没有这个 token（已实测），引用它只会永远落到回退值',
  )
})

test('CSS 契约：底栏行总高统一消费 --dshm-v2-nav-total', () => {
  const cases = [
    // 面板页内容让位
    'padding-bottom: var(--dshm-v2-nav-total) !important;',
    // 设置弹窗底边
    'bottom: var(--dshm-v2-nav-total) !important;',
    // 设置面板内联样式（JS 里带兜底值）
    "var(--dshm-v2-nav-total, var(--dshm-v2-nav, 56px))",
  ]
  for (const needle of cases) {
    assert.ok(source.includes(needle), `缺少统一让位声明：${needle}`)
  }
})

test('CSS 契约：把手触控区由 --dshm-v2-dock-handle 统一给出（默认 44px）', () => {
  const at = source.indexOf('.dshm-dock-grabber {\',')
  assert.ok(at > 0, '找不到把手样式')
  const block = source.slice(at, at + 600)
  assert.ok(
    block.includes('min-height: var(--dshm-v2-dock-handle);'),
    '把手触控区必须达到底栏按钮同款 44px，并与总高公式共用同一个 token',
  )
  assert.ok(source.includes("h('span', { 'aria-hidden': 'true' }),"), '两条横杠必须是 aria-hidden 装饰')
  assert.ok(source.includes("'aria-controls': DOCK_NAV_ITEMS_ID,"), '把手要声明它控制哪一行')
})

/**
 * ARIA 结构：把手是按钮，不是 tab。
 *
 * `role="tablist"` 只能包 `role="tab"`；把一个普通 button 塞进去，读屏会把它
 * 念成 tablist 的一项（收起后 tablist 还会变成 0 项）。所以语义落在内层
 * `.dshm-v2-nav-items` 上，把手是它的兄弟。
 */
test('ARIA 契约：tablist 落在导航键那一行，把手在外面', () => {
  const itemsRule = "className: 'dshm-v2-nav-items',"
  const at = source.indexOf(itemsRule)
  assert.ok(at > 0, '找不到导航键行')
  const block = source.slice(at, at + 260)
  assert.ok(block.includes("role: 'tablist'"), 'tablist 必须落在导航键行上')
  const navRoot = source.indexOf("className: 'dshm-bottom-bar dshm-v2-nav', 'data-dshm-v2-nav': ''")
  assert.ok(navRoot > 0, '找不到底栏根节点')
  const rootSnippet = source.slice(navRoot, navRoot + 120)
  assert.equal(rootSnippet.includes("role: 'tablist'"), false, '根节点不再直接是 tablist')
})

test('清理链：切预设 / 切形态 / clearAnchors 都会摘掉底栏属性', () => {
  // clearAnchors：整体还原
  const clearAt = source.indexOf('function clearAnchors(doc)')
  assert.ok(clearAt > 0)
  const clearBlock = source.slice(clearAt, clearAt + 2400)
  assert.ok(clearBlock.includes("removeAttribute('data-dshm-dock')"), 'clearAnchors 必须摘 data-dshm-dock')
  assert.ok(
    clearBlock.includes("removeAttribute('data-dshm-dock-collapsed')"),
    'clearAnchors 必须摘 data-dshm-dock-collapsed',
  )

  // setPreset：离开 v2 时复位
  const presetAt = source.indexOf('const setPreset = (raw) =>')
  assert.ok(presetAt > 0)
  const presetBlock = source.slice(presetAt, presetAt + 2000)
  assert.ok(presetBlock.includes('syncDockMarker('), 'setPreset 必须复位底栏属性')

  // setMode(DEFAULT)：离开手机形态时复位
  const modeAt = source.indexOf('const setMode = ')
  assert.ok(modeAt > 0)
  const modeBlock = source.slice(modeAt, modeAt + 4200)
  assert.ok(modeBlock.includes('syncDockMarker('), 'setMode(MODE_DEFAULT) 必须复位底栏属性')
})

test('CSS 契约：胶囊态收掉阴影净空，收起态让位量跟着缩', () => {
  // 不透明胶囊会让卡片阴影在它上沿被截断 → 胶囊态必须把 8px 净空收到 0，
  // 而且走变量本身（composer-clip 那条规则本来就消费它），不新增 !important。
  assert.ok(
    source.includes("'  --dshm-v2-shadow-gap: 0px;'"),
    '胶囊态必须把阴影净空收到 0，否则卡片阴影会在胶囊上沿出现硬边',
  )
  // 收起后只剩把手一行：让位量要跟着缩，否则页面底部白留一条。
  assert.ok(
    source.includes("'  --dshm-v2-nav-total: calc(var(--dshm-v2-dock-handle) + var(--dshm-v2-gutter));'"),
    '收起态必须把 --dshm-v2-nav-total 缩到只剩把手行',
  )
})

/**
 * 两页导航的取舍规则（设计稿：第一页「目的地 + 能力」，第二页放下沉的目的地）。
 *
 * 产品结论：工作权限 / 模型 只在**会话页**出现（它们是输入行两枚 chip 的弹层），
 * 换页后这两格由「更多」里的目的地补位，底栏恒为五格、不跳宽。
 */
test('dockPages：会话页五项、第二页四项（返回在最后）', () => {
  const pages = dockPages(['sessions', 'automation', 'plugins', 'workbench', 'settings'], {
    conversation: true,
    permission: true,
    model: true,
  })
  assert.deepEqual(plain(pages.page1), ['sessions', 'plugins', 'permission', 'model', 'more'])
  assert.deepEqual(plain(pages.page2), ['settings', 'automation', 'workbench', 'back'])
})

test('dockPages：非会话页不出现工作权限 / 模型，改由更多里的目的地补位', () => {
  const pages = dockPages(['sessions', 'automation', 'plugins', 'workbench', 'settings'], {
    conversation: false,
    permission: true,
    model: true,
  })
  assert.deepEqual(plain(pages.page1), ['sessions', 'plugins', 'settings', 'automation', 'workbench'])
  assert.deepEqual(plain(pages.page2), [])
})

test('dockPages：非会话页补位不足三格时按可达情况少一格，不留死键', () => {
  const pages = plain(dockPages(['sessions', 'plugins'], { conversation: false, permission: true, model: true }))
  assert.deepEqual(pages.page1, ['sessions', 'plugins'])
  assert.deepEqual(pages.page2, [])
})

test('dockPages：官方 chip 缺席时会话页不渲染对应项', () => {
  const pages = plain(dockPages(['sessions', 'plugins', 'settings'], { conversation: true, permission: false, model: false }))
  assert.deepEqual(pages.page1, ['sessions', 'plugins', 'more'])
  assert.deepEqual(pages.page2, ['settings', 'back'])
})

test('dockPages：退化输入不抛，且两页不重复', () => {
  assert.doesNotThrow(() => dockPages(null, null))
  assert.doesNotThrow(() => dockPages(undefined, undefined))
  const pages = plain(dockPages(undefined, { conversation: true }))
  assert.deepEqual(pages.page1, ['sessions', 'plugins'])
  const all = [...pages.page1, ...pages.page2]
  assert.equal(new Set(all).size, all.length)
})

/**
 * 样式层 → 导航项（0.4.12）。
 *
 * 32563dc 把渲染从 `slots.map` 换成 `pageItems.map` 时没有按 `data-dshm-dock`
 * 分叉，透明底栏被胶囊的「按页换项」覆盖（用户实拍：透明底栏出现「更多」，
 * 设置 / 自动化 / 工作台被折叠）。这里锁死两条路径：透明 = navSlots 原样；
 * 胶囊 = dockPages。
 */
test('dockVisibleItems：透明底栏 = navSlots 原样，没有翻页', () => {
  const slots = ['sessions', 'automation', 'plugins', 'workbench', 'settings']
  const visible = plain(dockVisibleItems({
    capsule: false,
    slots,
    chipFlags: { conversation: true, permission: true, model: true },
    page: 2,
  }))
  assert.deepEqual(visible.items, slots)
  assert.equal(visible.canPage, false)
  assert.equal(visible.items.includes('more'), false, '透明底栏不应出现「更多」')
})

test('dockVisibleItems：透明底栏能力缺失时少一格，不补位', () => {
  const visible = plain(dockVisibleItems({ capsule: false, slots: ['sessions', 'plugins', 'settings'] }))
  assert.deepEqual(visible.items, ['sessions', 'plugins', 'settings'])
  assert.equal(visible.canPage, false)
})

test('dockVisibleItems：胶囊会话页 = 按页换项的第一页', () => {
  const visible = plain(dockVisibleItems({
    capsule: true,
    slots: ['sessions', 'automation', 'plugins', 'workbench', 'settings'],
    chipFlags: { conversation: true, permission: true, model: true },
    page: 1,
  }))
  assert.deepEqual(visible.items, ['sessions', 'plugins', 'permission', 'model', 'more'])
  assert.equal(visible.canPage, true)
})

test('dockVisibleItems：胶囊第二页 & 非会话页补位', () => {
  const slots = ['sessions', 'automation', 'plugins', 'workbench', 'settings']
  const page2 = plain(dockVisibleItems({
    capsule: true,
    slots,
    chipFlags: { conversation: true, permission: true, model: true },
    page: 2,
  }))
  assert.deepEqual(page2.items, ['settings', 'automation', 'workbench', 'back'])
  const panel = plain(dockVisibleItems({ capsule: true, slots, chipFlags: { conversation: false }, page: 1 }))
  assert.deepEqual(panel.items, ['sessions', 'plugins', 'settings', 'automation', 'workbench'])
  assert.equal(panel.canPage, false)
})

test('dockVisibleItems：退化输入不抛，且不产生重复项', () => {
  assert.doesNotThrow(() => dockVisibleItems(null))
  assert.doesNotThrow(() => dockVisibleItems(undefined))
  assert.doesNotThrow(() => dockVisibleItems({ capsule: 'yes' }))
  const visible = plain(dockVisibleItems({ capsule: true, slots: null, chipFlags: null }))
  assert.deepEqual(visible.items, ['sessions', 'plugins'])
})

test('源码契约：透明导航不回到胶囊的按页换项', () => {
  const at = source.indexOf('function dockVisibleItems(')
  assert.ok(at > 0, '找不到 dockVisibleItems')
  const block = source.slice(at, at + 900)
  assert.ok(block.includes('if (data.capsule !== true)'), '透明分支必须先判断样式层')
  assert.ok(block.includes('return { items: slots.slice(), canPage: false };'), '透明必须是 navSlots 原样、无翻页')
  assert.ok(source.includes('const visibleNav = dockVisibleItems('), 'V2Nav 必须走样式层分叉')
})

test('源码契约：回形针只在胶囊样式下创建', () => {
  const at = source.indexOf('function syncComposerAttach(')
  assert.ok(at > 0, '找不到 syncComposerAttach')
  const block = source.slice(at, at + 3000)
  assert.ok(block.includes("getAttribute('data-dshm-dock') !== DOCK_STYLE_CAPSULE"), '必须先判样式层')
  assert.ok(block.indexOf('DOCK_STYLE_CAPSULE') < block.indexOf('insertBefore('), '门禁必须在插入之前')
})

test('源码契约：加号面板幽灵态自愈 + 遮罩防抖 + ⊕ 点前修复', () => {
  assert.ok(source.includes('function ensureAddMenuCoherent('), '缺少幽灵态自愈')
  assert.ok(source.includes('addMenuGhostEpoch'), '延迟收尾必须带世代号')
  assert.ok(source.includes('v2AddMenuOpenedAt'), '遮罩防抖需要打开时刻')
  assert.ok(source.includes('if (Date.now() - v2AddMenuOpenedAt < 250) return;'), '遮罩 250ms 防抖')
  const intentAt = source.indexOf('const onAddChipIntent = ')
  assert.ok(intentAt > 0, '缺少 ⊕ 真实按下的捕获处理')
  const block = source.slice(intentAt, intentAt + 800)
  assert.ok(block.includes('ensureAddMenuCoherent(true)'), '点 ⊕ 必须先修幽灵态')
  assert.ok(block.includes('addMenuGhostEpoch += 1'), '点 ⊕ 必须作废旧收尾')
})

test('CSS 契约：把手是**一条**横杠（设计稿），且与 bus 表同语法', () => {
  const grabberAt = source.indexOf("className: 'dshm-dock-grabber',")
  assert.ok(grabberAt > 0, '找不到把手节点')
  const block = source.slice(grabberAt, grabberAt + 500)
  const spans = block.match(/h\('span', \{ 'aria-hidden': 'true' \}\)/g) || []
  assert.equal(spans.length, 1, '设计稿是单条横杠：多画一条就与底部表的把手不是同一语法了')
})

test('CSS 契约：胶囊是合并形态——卡片下侧压平、底栏只留下圆角', () => {
  assert.ok(
    source.includes("'  --dshm-v2-card-radius-bottom: 0px;'"),
    '胶囊态必须把输入卡下侧圆角压成 0，否则接缝处是两个圆角对不上',
  )
  assert.ok(
    source.includes("'  --dshm-v2-card-radius-bottom: var(--dshm-v2-dock-radius);'"),
    '键盘态（底栏收掉）要把下侧圆角圆回来，否则卡片贴着键盘是直角',
  )
  assert.ok(
    source.includes("'  border-radius: 0 0 var(--dshm-v2-dock-radius) var(--dshm-v2-dock-radius);'"),
    '底栏只留下圆角，上沿要与卡片接平',
  )
  assert.ok(
    source.includes("'  --dshm-v2-dock-radius: 28px;'") && source.includes("'  --dshm-v2-dock-track-radius: 22px;'"),
    '圆角单独一档：胶囊 28 / 导航槽 22，不借用输入卡的 20',
  )
  assert.ok(
    source.includes("'  background: var(--dsw-alias-bg-secondary, rgba(127, 127, 127, 0.09));'"),
    '导航槽要铺官方灰底（设计稿的灰胶囊）',
  )
})

test('CSS 契约：合并形态不靠新增 !important 压圆角', () => {
  const cardRule = source.indexOf("'  border-radius: var(--dshm-v2-card-radius) var(--dshm-v2-card-radius) var(--dshm-v2-card-radius-bottom) var(--dshm-v2-card-radius-bottom) !important;'")
  assert.ok(cardRule > 0, '卡片圆角应消费上/下两组变量')
  // 胶囊态可以再给卡片加规则（比如改成一行布局），但不许再叠一条 !important 的圆角覆盖。
  const at = source.indexOf('[data-dshm-dock="capsule"] [data-composer-card] {')
  if (at > 0) {
    const block = source.slice(at, at + 400)
    assert.equal(
      /border-radius[^;]*!important/.test(block),
      false,
      '胶囊态不应再写带 !important 的卡片圆角覆盖——变量已经够用',
    )
  }
})

test('CSS 契约：胶囊态底栏宽度改回 auto（100% + 左右 margin 会溢出屏外）', () => {
  const navAt = source.indexOf("'html[data-dshm-mode=\"mobile\"][data-dshm-preset=\"v2\"][data-dshm-dock=\"capsule\"] .dshm-v2-nav {',")
  assert.ok(navAt > 0, '找不到胶囊底栏规则')
  const block = source.slice(navAt, navAt + 700)
  assert.ok(block.includes("'  width: calc(100% - 2 * var(--dshm-v2-gutter));'"), '底栏要显式扣掉两侧留白，否则 margin 会把胶囊顶出屏幕；也不能用 auto（设置页是 flex 容器，会缩成内容宽）')
  assert.ok(block.includes("'  box-sizing: border-box;'"), '盒模型要显式 border-box，min-height 才与 token 相加一致')
})

test('i18n：底栏样式与把手的文案中英成对', () => {
  for (const key of ['dockStyle', 'dockStyleHint', 'dockStylePlain', 'dockStyleCapsule', 'dockGrabberCollapse', 'dockGrabberExpand']) {
    const hits = source.split(`${key}:`).length - 1
    assert.ok(hits >= 2, `${key} 必须中英各一条（当前 ${hits} 条）`)
  }
  assert.equal(DOCK_NAV_ITEMS_ID, 'dshm-v2-nav-items')
})
