'use strict'

/**
 * 返回栈纯函数单元测试。
 *
 * 覆盖两件事：
 * ① planBackStack —— 本次同步该压 / 该弹哪几层、顺序是否满足「压 page 先、
 *    弹 overlay 先」；
 * ② nextBackTarget —— 一次 popstate 该退哪一层，顺序即「谁在最上面」。
 *
 * vm 沙箱跨 realm：不能对返回的对象用 assert.deepEqual（原型不同），
 * 一律逐字段断言，数组先 Array.from 再逐项比。
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

const { planBackStack, nextBackTarget, BACK_KIND, BACK_OWNER } = loadClient().__test

/** 取 planBackStack 结果的扁平快照；数组转成本 realm 数组。 */
function snapshot(plan) {
  return {
    push: Array.from(plan.push),
    pop: Array.from(plan.pop),
    baseEntry: plan.baseEntry,
    pageEntry: plan.pageEntry,
    overlayEntry: plan.overlayEntry,
    consumable: plan.consumable,
    depth: plan.depth,
  }
}

function plan(overrides) {
  return snapshot(
    planBackStack(
      Object.assign(
        {
          mobile: true,
          pageVisible: false,
          overlayVisible: false,
          pageEntry: false,
          overlayEntry: false,
          closingOverlay: false,
        },
        overrides,
      ),
    ),
  )
}

// ---- 常量 ----

test('返回栈层级常量与 owner 稳定', () => {
  assert.equal(BACK_KIND.BASE, 'base')
  assert.equal(BACK_KIND.PAGE, 'page')
  assert.equal(BACK_KIND.OVERLAY, 'overlay')
  assert.equal(BACK_OWNER, 'dsh-mobile-layout')
})

// ---- planBackStack：基础 ----

test('会话页无浮层：不压不弹，栈为空', () => {
  const state = plan({})
  assert.equal(state.push.length, 0)
  assert.equal(state.pop.length, 0)
  assert.equal(state.pageEntry, false)
  assert.equal(state.overlayEntry, false)
  assert.equal(state.consumable, false)
  assert.equal(state.depth, 0)
})

test('进入整页面板：压一条 page', () => {
  const state = plan({ pageVisible: true })
  assert.equal(state.push.length, 1)
  assert.equal(state.push[0], 'page')
  assert.equal(state.pop.length, 0)
  assert.equal(state.pageEntry, true)
  assert.equal(state.depth, 1)
  assert.equal(state.consumable, true)
})

test('页面 + 浮层叠加：压两条，page 在前 overlay 在后', () => {
  const state = plan({ pageVisible: true, overlayVisible: true })
  assert.equal(state.push.length, 2)
  assert.equal(state.push[0], 'page')
  assert.equal(state.push[1], 'overlay')
  assert.equal(state.depth, 2)
})

test('浮层单独出现：只压 overlay', () => {
  const state = plan({ overlayVisible: true })
  assert.equal(state.push.length, 1)
  assert.equal(state.push[0], 'overlay')
  assert.equal(state.depth, 1)
})

test('浮层关闭但页面还在：只弹 overlay，page 保留', () => {
  const state = plan({ pageVisible: true, overlayVisible: false, pageEntry: true, overlayEntry: true })
  assert.equal(state.pop.length, 1)
  assert.equal(state.pop[0], 'overlay')
  assert.equal(state.pageEntry, true)
  assert.equal(state.overlayEntry, false)
  assert.equal(state.depth, 1)
})

test('页面与浮层同时消失：先弹 overlay 再弹 page', () => {
  const state = plan({ pageVisible: false, overlayVisible: false, pageEntry: true, overlayEntry: true })
  assert.equal(state.pop.length, 2)
  assert.equal(state.pop[0], 'overlay')
  assert.equal(state.pop[1], 'page')
  assert.equal(state.depth, 0)
  assert.equal(state.consumable, false)
})

test('页面关闭但浮层还在（不常见）：只弹 page', () => {
  const state = plan({ pageVisible: false, overlayVisible: true, pageEntry: true, overlayEntry: true })
  assert.equal(state.pop.length, 1)
  assert.equal(state.pop[0], 'page')
  assert.equal(state.overlayEntry, true)
})

// ---- planBackStack：幂等与闸门 ----

test('状态一致时幂等：重复同步不重复压栈', () => {
  const first = plan({ pageVisible: true, overlayVisible: true, pageEntry: true, overlayEntry: true })
  assert.equal(first.push.length, 0)
  assert.equal(first.pop.length, 0)
  assert.equal(first.depth, 2)
})

test('closingOverlay 挡住 overlay 的重复压栈，但不挡 page', () => {
  const state = plan({
    pageVisible: true,
    overlayVisible: true,
    pageEntry: false,
    overlayEntry: false,
    closingOverlay: true,
  })
  assert.equal(state.push.length, 1)
  assert.equal(state.push[0], 'page')
  assert.equal(state.overlayEntry, false)
  assert.equal(state.pageEntry, true)
})

test('closingOverlay 且浮层已消失：不压也不弹多余条目', () => {
  const state = plan({
    pageVisible: false,
    overlayVisible: false,
    pageEntry: false,
    overlayEntry: false,
    closingOverlay: true,
  })
  assert.equal(state.push.length, 0)
  assert.equal(state.pop.length, 0)
  assert.equal(state.depth, 0)
})

// ---- planBackStack：离开手机形态 ----

test('离开手机形态且有条目：只弹栈，不动 UI 状态', () => {
  const state = plan({ mobile: false, pageVisible: true, overlayVisible: true, pageEntry: true, overlayEntry: true })
  assert.equal(state.push.length, 0)
  assert.equal(state.pop.length, 2)
  assert.equal(state.pop[0], 'overlay')
  assert.equal(state.pop[1], 'page')
  assert.equal(state.pageEntry, false)
  assert.equal(state.overlayEntry, false)
  assert.equal(state.consumable, false)
})

test('离开手机形态且无条目：空计划', () => {
  const state = plan({ mobile: false })
  assert.equal(state.push.length, 0)
  assert.equal(state.pop.length, 0)
  assert.equal(state.consumable, false)
})

test('非手机形态即使页面可见也不压栈（桌面零回归）', () => {
  const state = plan({ mobile: false, pageVisible: true })
  assert.equal(state.push.length, 0)
})

// ---- nextBackTarget：逐层顺序 ----

test('加号面板子层最优先', () => {
  assert.equal(
    nextBackTarget({ addSubLayer: true, v2AddMenu: true, settings: true, page: true }),
    'sub-layer',
  )
})

test('注册者命中优先于自绘加号面板与设置页', () => {
  assert.equal(
    nextBackTarget({ external: true, v2AddMenu: true, settings: true, popover: true, page: true }),
    'external',
  )
})

test('自绘加号面板优先于设置页', () => {
  assert.equal(nextBackTarget({ v2AddMenu: true, settings: true, page: true }), 'v2-add')
})

test('设置页优先于官方加号浮层与头部菜单', () => {
  assert.equal(nextBackTarget({ settings: true, popover: true, headerMenu: true, page: true }), 'settings')
})

test('官方加号浮层优先于头部菜单', () => {
  assert.equal(nextBackTarget({ popover: true, headerMenu: true, page: true }), 'popover')
})

test('头部菜单优先于底部表 / 抽屉', () => {
  assert.equal(nextBackTarget({ headerMenu: true, sheet: true, drawer: true }), 'header')
})

test('底部表、抽屉、工作台同为 overlay 层', () => {
  assert.equal(nextBackTarget({ sheet: true, page: true }), 'overlay')
  assert.equal(nextBackTarget({ drawer: true }), 'overlay')
  assert.equal(nextBackTarget({ rightbarFullscreen: true }), 'overlay')
})

test('通用浮层优先于页面层', () => {
  assert.equal(nextBackTarget({ genericOverlay: true, page: true }), 'generic-overlay')
})

test('页面层：整页界面回会话页', () => {
  assert.equal(nextBackTarget({ page: true }), 'page')
})

test('全空：noop（起始页，交给壳的双击退出）', () => {
  assert.equal(nextBackTarget({}), 'noop')
  assert.equal(nextBackTarget(null), 'noop')
  assert.equal(nextBackTarget(undefined), 'noop')
})

test('false 值不误判：显式 false 时应落到下一层', () => {
  assert.equal(
    nextBackTarget({ addSubLayer: false, external: false, settings: false, page: true }),
    'page',
  )
})

// ---- 组合：一次「插件页 + 设置」连按两次 ----

test('插件页 + 设置：第一次收设置，第二次回会话页', () => {
  // 第一次：设置可关
  assert.equal(nextBackTarget({ settings: true, page: true }), 'settings')
  // 第二次：设置已关，页面还在
  assert.equal(nextBackTarget({ settings: false, page: true }), 'page')
})

test('插件页 + 设置：栈深为 2，两层的压栈顺序与退栈顺序相反', () => {
  const pushPlan = plan({ pageVisible: true, overlayVisible: true })
  assert.equal(pushPlan.push[0], 'page')
  assert.equal(pushPlan.push[1], 'overlay')
  assert.equal(pushPlan.depth, 2)
  const popPlan = plan({ pageVisible: false, overlayVisible: false, pageEntry: true, overlayEntry: true })
  assert.equal(popPlan.pop[0], 'overlay')
  assert.equal(popPlan.pop[1], 'page')
})

// ---- 旧壳兜底：栈底哨兵（sentinel） ----
//
// 新版 Android 壳有 DshAndroidBack，插件不必占条目；没有这个桥的旧壳只认
// canGoBack()，栈底必须留一条，否则会话页按返回会被直接 finish。

test('哨兵：空栈且 sentinel=true → 压一条 base', () => {
  const state = plan({ sentinel: true })
  assert.equal(state.push.length, 1)
  assert.equal(state.push[0], 'base')
  assert.equal(state.pop.length, 0)
  assert.equal(state.baseEntry, true)
})

test('哨兵：base 在栈底，page 与 overlay 依次压在它上面', () => {
  const state = plan({ sentinel: true, pageVisible: true, overlayVisible: true })
  assert.equal(state.push.length, 3)
  assert.equal(state.push[0], 'base')
  assert.equal(state.push[1], 'page')
  assert.equal(state.push[2], 'overlay')
})

test('哨兵：已压过就不重复压（幂等）', () => {
  const state = plan({ sentinel: true, baseEntry: true })
  assert.equal(state.push.length, 0)
  assert.equal(state.pop.length, 0)
  assert.equal(state.baseEntry, true)
})

test('哨兵：不算可退内容 —— consumable 与 depth 都不含 base', () => {
  const state = plan({ sentinel: true, baseEntry: true })
  assert.equal(state.consumable, false)
  assert.equal(state.depth, 0)
  // 有真实页面时 depth 只数页面层
  const withPage = plan({ sentinel: true, baseEntry: true, pageVisible: true })
  assert.equal(withPage.depth, 1)
  assert.equal(withPage.consumable, true)
})

test('哨兵：换上带桥的新壳（sentinel 变 false）要退掉旧哨兵', () => {
  const state = plan({ sentinel: false, baseEntry: true })
  assert.equal(state.pop.length, 1)
  assert.equal(state.pop[0], 'base')
  assert.equal(state.baseEntry, false)
})

test('哨兵：离开手机形态时与页面/浮层一起退回，退栈顺序 overlay→page→base', () => {
  const state = plan({
    mobile: false,
    sentinel: false,
    baseEntry: true,
    pageEntry: true,
    overlayEntry: true,
  })
  assert.equal(state.pop.length, 3)
  assert.equal(state.pop[0], 'overlay')
  assert.equal(state.pop[1], 'page')
  assert.equal(state.pop[2], 'base')
  assert.equal(state.baseEntry, false)
  assert.equal(state.consumable, false)
})

test('哨兵：回滚开关关闭后不再压（sentinel=false 时行为与 0.4.4 一致）', () => {
  assert.equal(plan({ sentinel: false }).push.length, 0)
})
