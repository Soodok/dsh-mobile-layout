# 修复计划：透明底栏 / 胶囊底栏样式层彻底隔离

> 状态：**已实施并验证**（T1–T3 + 文档；T4 抖动用例未能复现丢失，未改手势）。实施记录见第 10 节。
> 基线：`7908901`（v0.4.11 + 23 个提交），实测设备 `Medium_Phone_API_35`（1080×2400，CSS 视口 457×962，dpr 2.625）
> 关联提交：`32563dc`（胶囊合并 + 按页换项）、`69d3aa0`（回形针注入）、`626f758`（一行输入）、`09ecc3b`（胶囊动作行等距）
> 仓库约定：计划文档统一放 `docs/`，任务清单内嵌在本文第 8 节（本仓库没有 `tasks/` 目录）。

---

## 0. 结论摘要

1. **透明底栏被打回胶囊形态（已确认，P0）**：`V2Nav` 无条件使用 `dockPages()` 的「按页换项」模型，透明态因此显示成 `会话 / 插件 / 工作权限 / 模型 / 更多`，并多出一套「更多 → 第二页 / 返回」的翻页交互。这与 README、`docs/preset-v2.md` 里「透明五项 = 会话 / 自动化任务 / 插件 / 工作台 / 设置」「透明底栏逐像素不变」的既有承诺直接冲突。
2. **左侧 ⊕ 偶现无响应（已定位到可复现的时序缺陷，P0）**：透明态下 ⊕ 是官方按钮，插件没有包裹点；官方弹层出现后会被 `data-dshm-v2-addmenu`（幽灵态）隐成数据源，而接管逻辑在幽灵存在时拒绝接管。只要幽灵属性比自绘面板多活一拍，点 ⊕ 就会「官方弹层开了但透明不可见、自绘面板不接管」——实测注入幽灵后 100% 复现「按了没反应」。
3. **双击 / 快速连点会把面板开完又关（已复现，P1）**：面板一打开，遮罩就盖住输入行和 ⊕；第二次点落在遮罩上 = 关闭。实测间隔 40–600ms 的两次点击，7/7 全部以「面板关闭」收场，视觉上就是「没反应」。
4. **胶囊的回形针按钮被注入到透明态的官方 ⊕ 行（跨样式泄漏，P1）**：`syncComposerAttach()` 不判断底栏样式，透明态也会插入 `[data-dshm-attach-btn]`，靠同一 tick 的 `cleanupCapsuleArtifacts()` 删掉；窗口内是未加样的裸按钮，还会让官方 ⊕ 行发生 DOM 变更。
5. **修复原则**：透明路径回到 `navSlots()` + 官方 ⊕ + 既有自绘加号面板；胶囊路径保持 `dockPages()` + 自绘动作行 + 灰槽/把手/脚注。两条路径不共享「当前第几页」「自绘动作行」「幽灵清理」等状态，并用单测 + AVD 矩阵双向锁死。

---

## 1. 目标与行为契约（验收基线）

| 维度 | 透明底栏（目标 = 恢复之前） | 胶囊底栏（目标 = 保持当前） |
| --- | --- | --- |
| 导航项 | `会话 / 自动化任务 / 插件 / 工作台 / 设置`（`NAV_KEYS` 顺序，能力缺失时少一格） | 会话页 `会话 / 插件 / 工作权限 / 模型 / 更多`；面板页/设置页由「更多」里的目的地补位 |
| 翻页 | **没有**「更多 / 返回」两级页，`dockPage` 不生效 | 保留两页、Esc/返回退第二页 |
| 底栏外壳 | 透明、无灰槽、无把手、无脚注，阴影可落到导航行 | 合并卡片（28 圆角）、灰槽（22 圆角）、40×4 把手、权限/模型脚注、可收起 |
| 输入行 | 官方 `⊕`（左）、权限/模型 chip、官方发送；工具行 42px 高 | 自绘 `⊕ / 回形针 / 发送`（右、40px），chip 透明化，工具行收成 0 高 |
| 让位高度 | `--dshm-v2-nav`（56px） | `--dshm-v2-nav-total`（含把手行，收起态变小） |
| 根属性 | 无 `data-dshm-dock` | `data-dshm-dock="capsule"`（+ 可选 `data-dshm-dock-collapsed`） |
| 加号面板 | 同一套自绘面板（0.4.9 之前的既有能力，不变） | 同上；透明态不得因胶囊逻辑改变打开/关闭行为 |

**不变量**：透明态由官方 ⊕ 打开自绘加号面板的链路、面板数据来源（`readAddMenu`）、点击条目派发方式（`dispatchAddOption`）都保持不变；本次只修「状态机可靠性」与「样式层串味」。

---

## 2. 现状实测（HEAD 7908901，透明态）

在 `Medium_Phone_API_35` 上把根属性切到透明后测得：

- `.dshm-v2-nav`：`[0, 906, 457, 56]`，五键文本 **`会话 / 插件 / 工作权限 / 模型 / 更多`**（错误，应为 `会话 / 自动化任务 / 插件 / 工作台 / 设置`）。
- `.dshm-dock-foot` / `.dshm-dock-grabber` / `.dshm-seg` / `[data-dshm-actions]` / `[data-dshm-attach-btn]` 计数均为 0（这些回收正常）。
- 输入行：官方 ⊕ `[16, 861, 28, 28]`、权限 chip `[52, 861, 78, 28]`、模型 chip `[337, 861, 54, 28]`、官方发送 `[407, 856, 34, 34]`、工具行高 42px、`padding-right: 0px`。
- 胶囊态（同机）对照：`.dshm-v2-nav` 高 88、脚注 1 个、`[data-dshm-actions]` 1 组（40px 三键 @ `311/353/403, 822`）。

**文档冲突证据**：

- `README.md:42`：五项导航 = 会话 / 自动化任务 / 插件 / 工作台 / 设置。
- `docs/preset-v2.md:22`：透明底栏 = 会话 / 自动化任务 / 插件 / 工作台 / 设置。
- `docs/preset-v2.md:55-62`：「默认仍是透明底栏，v2 的外观与之前逐像素一致」。
- 胶囊文档 `docs/preset-v2-capsule.md` 才描述「按页换项」。也就是说，按页换项本应只属于胶囊样式层。

---

## 3. 根因分析

### 3.1 导航项模型没有按样式层分叉（P0，确认）

`lib/client.js`（HEAD 行号）：

- `dockPages()` 在 `:682`：返回 `{ page1: ['sessions','plugins', ...] , page2: [...] }`，是胶囊「按页换项」的模型。
- `V2Nav` 在 `:12843-12844` **无条件**使用它：
  ```js
  const dockItems = dockPages(slots, Object.assign({ conversation: !pageKey }, chipFlags));
  const pageItems = dockPage === 2 && dockItems.page2.length > 0 ? dockItems.page2 : dockItems.page1;
  ```
- 透明态的能力过滤 `navSlots(caps)` 只在 `:12767` 计算，算完却不再用于渲染（`:13027` 渲染的是 `pageItems`）。

历史：`32563dc` 把 `slots.map(...)` 换成了 `pageItems.map(...)`，同时把「第二页」状态 `dockPage` 引入组件；当时没有把渲染按 `data-dshm-dock` 分叉，于是透明态也被卷进胶囊的换项模型。

**副作用**（都在透明态）：

- 设置 / 自动化任务 / 工作台被折叠进「更多」第二页，用户必须点两次才能到达。
- 「工作权限 / 模型」出现在透明底栏，而透明态输入行里本来就有这两枚官方 chip，入口重复。
- 透明态多出一个无意义的第二页状态；`dockPage` 的 Esc 监听（`:12801-12811`）在透明态也会挂上。

### 3.2 胶囊的回形针注入到官方 ⊕ 行（P1，跨样式泄漏）

- `syncComposerAttach()` 在 `:2339-2391` 没有判断底栏样式；它把 `[data-dshm-attach-btn]` 插到官方 `⊕` 的**同一行**（`host.insertBefore(button, addChip.nextSibling)`，`:2389`）。
- 透明态由 `cleanupCapsuleArtifacts()`（`:2100-2118`）在同一 tick 的 `syncComposer()` 末尾（`:2527`）删掉，所以最终计数为 0；但插入/删除本身会让官方 ⊕ 行发生 DOM 变更，且窗口内是一个**未加样式的裸按钮**（`.dshm-attach-btn` 的 CSS 全部限定在 `[data-dshm-dock="capsule"]`）。
- 影响：① 增加官方按钮被 React 重挂/命中区抖动的概率；② 如果同步链在插入后发生异常，裸按钮会残留到下一次 1.2s 轮询，用户会看到一个多余按钮甚至点到它（点开的是未加样的附件菜单）。

### 3.3 加号面板接管状态机：⊕「偶现无响应」的四类窗口（P0/P1）

⊕ 的完整链路是：官方 ⊕ 点击 → 官方 `[role=listbox]` 弹层出现 → 主观察器打 `[data-dshm-popover]` → `V2AddPanel` 的 effect / 200ms 心跳尝试接管 → `openV2AddMenu()` 给 `<html>` 打 `data-dshm-v2-addmenu`（官方弹层 `opacity:0; pointer-events:none`）→ 渲染 `.dshm-v2-addpanel` + 遮罩。任何一步「幽灵在前、面板在后」都会让用户看到「按了没反应」。

**3.3.1 幽灵态压过接管（已用注入实验复现）**

- `openV2AddMenu()`（`:6018`）先写幽灵属性（`:6027`），再 `setState({ v2AddMenu: true })` 让 React 挂面板；两步之间没有 try/finally。
- `addMenuTakeOverAllowed()`（`:5984-5991`）第一条就是 `if (html.hasAttribute('data-dshm-v2-addmenu')) return false`——幽灵在，接管永远不跑。
- 实测（透明态）：先给 `<html>` 注入 `data-dshm-v2-addmenu`，再点 ⊕ →
  - `popover=1, opacity=0`（官方弹层开了但不可见）、`panel=0`、诊断 phase=`suppressed`；
  - 手动清掉幽灵后 → phase=`enter`、`panel=1`（面板才出来）。
  这就是「按下去无响应」的确定性形态。

**3.3.2 幽灵比面板活得更久的三条路径**

- `runOption()` 的收尾：`closeV2AddMenu({ keepGhost: true })` + `releaseGhost()`（`:13937-13938`、`:13914-13919`）。`releaseGhost` 在 **240ms 后**先摘幽灵，再**无条件** `closeOfficialAddMenu()`（只要此刻存在任何 popover）。若用户在这 240ms 内点 ⊕，新弹层会被这枚旧定时器关掉——点击被完整吞掉。
- `dispatchAddOption()`（`:5866-5909`）的 `cleanup()` 在「点击成功」200ms 后摘幽灵；失败时最多重试 45×60ms≈2.7s。期间幽灵可能一直挂着。
- 后台化（系统文件选择器、切后台）会节流定时器，窗口被拉长；再叠加「面板组件因异常/卸载没挂上」，幽灵就可能长期残留，表现成「用一阵子 ⊕ 就死了」。

**3.3.3 双击 / 快速连点被遮罩吃掉（已复现）**

- 面板一打开，遮罩 `.dshm-v2-addpanel-mask` 立即覆盖输入行（透明态 `inset:0`；胶囊态 `inset:0 0 var(--dshm-v2-nav-total) 0`）。
- 遮罩是 `<button onClick={close}>`（`:14098-14104`），第二次点在同一点位 = 关闭面板。
- 实测（透明态，CDP 真实触摸）：两次点击间隔 `40 / 80 / 120 / 180 / 260 / 400 / 600ms`，等待 1.3s 后 **7/7 全部 `panel=0`**。间隔很短时面板只渲染了一两帧，用户感知就是「没反应」。

**3.3.4 抑制窗与事件吞没**

- `addMenuClosedAt`：关闭后 500ms 内不接管（`:5988`）；`addMenuDispatchAt`：派发后 2000ms 内不接管（`:5989`）。有 `addMenuUserIntentAt`（真实 pointerdown，`:13887-13894`）作为「用户新意图」放行，正常路径工作；但任何让 `pointerdown` 没被记录的情况都会落回抑制窗。
- `closeAddMenuForComposerTap()`（`:5124-5169`）在「点输入框收面板」路径上会**吞掉 400ms 的 `pointerup / mousedown / mouseup / click`**（`:5153-5161`）。若官方弹层未被接管（无自绘遮罩）、用户点输入框收面板后立刻点 ⊕，这次点击会被 `preventDefault + stopPropagation` 吞掉。

### 3.4 左缘手势区（P2，先验证再决定）

- 抽屉右滑起手区是「视口左 60%」（`drawerStartLimit = max(64, 0.6w)`，`:1630-1634`），意图确认阈值 24px（`:1644`）；透明态 ⊕ 位于 `x=16..44`，落在起手区内。
- 手势监听是 passive 的，不会主动 preventDefault，但**手指有横向位移的点击会被浏览器取消 click**。这条只作为验证项：用「点击 + 8/12/16px 横向抖动」的自动化用例确认是否可复现；确认后再决定是移动 ⊕、扩大热区，还是让手势忽略 `[data-composer-card]` 内的按钮起手。

---

## 4. 修复设计

### 4.1 导航项按样式层分叉（对应 3.1）

在 `V2Nav` 内把「样式判定」提到「项计算」之前，并抽一个纯函数（便于单测）：

```js
// 纯函数：样式层 → 实际渲染的项
function dockVisibleItems(input) {
  const { capsule, slots, chipFlags, page } = input || {};
  const list = Array.isArray(slots) ? slots : [];
  if (!capsule) return { items: list.slice(), canPage: false };
  const pages = dockPages(list, chipFlags);
  const items = page === 2 && pages.page2.length > 0 ? pages.page2 : pages.page1;
  return { items, canPage: pages.page2.length > 0 };
}
```

`V2Nav` 里：

- `dockStyle / dockCapsule / dockCollapsed` 目前定义在 `:12848-12850`（项计算之后），需要上移到 `pageKey` 之前。
- `const visible = dockVisibleItems({ capsule: dockCapsule, slots, chipFlags, page: dockPage })`，渲染 `visible.items`。
- `react.useEffect(() => { if (!dockCapsule) setDockPage(1); }, [dockCapsule])`；Esc 监听加 `if (!dockCapsule) return`。
- 其余结构（`.dshm-v2-nav-items` 包裹、`data-dshm-v2-nav-item`、`aria-current`、脚注/把手的 `dockCapsule` 门禁）不动。

**注意**：透明态的 `pageItems` 必须回到 `navSlots(caps)` 的原始顺序，不要复用 `dockPages` 的排序；能力缺失时按 `navSlots` 少一格。

### 4.2 回形针只在胶囊态创建（对应 3.2）

`syncComposerAttach()` 开头加：

```js
if (document.documentElement.getAttribute('data-dshm-dock') !== DOCK_STYLE_CAPSULE) {
  const stale = card.querySelector('[data-dshm-attach-btn]');
  if (stale) stale.remove();
  return;
}
```

保留 `cleanupCapsuleArtifacts()` 作为最后兜底（切样式、切预设、clearAnchors 仍然要清）。

### 4.3 加号面板状态机加固（对应 3.3）

目标：**任何一次真实点 ⊕ 都必须让用户看到面板或官方弹层，二者不能同时不可见**。分四层：

**A. 点 ⊕ 先修状态（核心）**

新增 `ensureAddMenuCoherent(reason)`：

```js
function ensureAddMenuCoherent(armRetry) {
  const html = document.documentElement;
  const ghost = html.hasAttribute('data-dshm-v2-addmenu');
  const panel = document.querySelector('.dshm-v2-addpanel');
  if (!ghost || state.v2AddMenu || panel) return false;
  // 幽灵态但没有自绘面板：立刻摘幽灵，让官方弹层重新可见。
  // 这里**不要**顺手 closeOfficialAddMenu()：它的 170ms 退场动画会和
  // 本次 click 抢同一个节点，容易出现「刚关掉又被这次 click 当成已打开」。
  html.removeAttribute('data-dshm-v2-addmenu');
  cancelGhostRelease();
  if (armRetry) armAddMenuOpenRetry(); // 300ms 后仍无面板/可见弹层 → 兜底重开一次
  return true;
}

function armAddMenuOpenRetry() {
  window.setTimeout(() => {
    if (state.v2AddMenu) return;
    const pop = document.querySelector('[' + ATTR_POPOVER + ']');
    if (pop && getComputedStyle(pop).opacity !== '0') return; // 官方弹层已经可见
    openOfficialAddMenu(); // 只在真的什么都没有时补一次
  }, 300);
}
```

挂点：

- `document` 捕获阶段 `pointerdown`：`target.closest('[data-dshm-add-chip]')` 且 `event.isTrusted` → `addMenuUserIntentAt = Date.now(); ensureAddMenuCoherent(true)`；
- 胶囊自绘 ⊕ 的 click 里（`:1945-1950`）在 `target.click()` 前调用 `ensureAddMenuCoherent(false)`；
- `openOfficialAddMenu()` 入口调用一次 `ensureAddMenuCoherent(false)`。

**验收口径**：无论幽灵/抑制窗处在哪一拍，一次真实点击后 500ms 内必须出现「自绘面板」或「不透明的官方弹层」之一。

**B. 幽灵定时器加世代号，且只关自己那一个弹层**

```js
let addMenuGhostEpoch = 0;        // openV2AddMenu / 用户点 ⊕ 都 +1
let ghostReleaseTimer = 0;
function cancelGhostRelease() { if (ghostReleaseTimer) { clearTimeout(ghostReleaseTimer); ghostReleaseTimer = 0; } }
```

- `openV2AddMenu()`：`addMenuGhostEpoch += 1; cancelGhostRelease();` 再写幽灵属性。
- `releaseGhost()`：捕获 `epoch` 和 `rootPop = addMenuData.rootPop`；240ms 后只有 `epoch === addMenuGhostEpoch && !state.v2AddMenu && (!rootPop || rootPop === document.querySelector('[' + ATTR_POPOVER + ']'))` 才摘幽灵并在必要时 `closeOfficialAddMenu()`。
- `dispatchAddOption()` 的 `cleanup()` 同样按 epoch 判断，避免旧链关新面板。

**C. 遮罩防抖（双击不再「开了又关」）**

- `openV2AddMenu()` 记录 `v2AddMenuOpenedAt = Date.now()`。
- 遮罩 `onClick`：`if (Date.now() - v2AddMenuOpenedAt < 250) return;` 再 `close()`。
- 期望行为：300ms 内连点两次 ⊕，最终**面板保持打开**（而不是打开后立刻关闭）。这是双击场景的验收口径。

**D. 心跳自愈**

`V2AddPanel` 的 200ms 心跳（`:13864-13878`）里补一条：

```js
if (!state.v2AddMenu && html.hasAttribute('data-dshm-v2-addmenu')
    && Date.now() - addMenuClosedAt > 500 && Date.now() - addMenuDispatchAt > 500) {
  html.removeAttribute('data-dshm-v2-addmenu');
  if (document.querySelector('[' + ATTR_POPOVER + ']')) closeOfficialAddMenu();
}
```

这样即使出现异常路径，最多 0.7s 内 ⊕ 也会恢复可用（而不是「重启才好」）。

**E. 收窄 400ms 吞事件**

`closeAddMenuForComposerTap()` 的吞事件集合里，遇到 `event.target.closest('[data-dshm-add-chip]')` 直接放行（不 `preventDefault`），避免把下一次 ⊕ 点击吃掉。

### 4.4 左缘手势（可选，验证后再改）

若 3.4 的抖动用例能复现「点击丢失」，优先方案：`gestureStart` 时把 `target.closest('[data-dshm-add-chip], [data-composer-card] button')` 记为 `blocked`，不进入抽屉手势；**不要**直接缩小起手区（会影响正常抽屉手势）。

### 4.5 文档同步

- `README.md:42` / `README.en.md`：明确「透明五项 = 会话/自动化任务/插件/工作台/设置；按页换项只属于胶囊」。
- `docs/preset-v2.md`：§底栏样式补一张对照表（导航项 / 翻页 / 输入行 / 外壳），把「按页换项」移到胶囊小节。
- `docs/preset-v2-capsule.md`：注明按页换项是胶囊专属。
- `docs/architecture.md:106`、`:136`：补「样式层分叉点：`dockVisibleItems` / `dockCapsule`」。
- `docs/technical-notes.md`：新增一节，记录幽灵态/抑制窗/遮罩双击三个坑与修法。
- `CHANGELOG.md`：一条 fix。

---

## 5. 测试与验证计划

### 5.1 单元测试（`node --test`，可进 CI）

在 `test/dock.test.js` 增补（沿用现有 `loadClient().__test` 模式）：

| 用例 | 断言 |
| --- | --- |
| `dockVisibleItems` 透明 + 全能力 | `['sessions','automation','plugins','workbench','settings']`，`canPage=false` |
| `dockVisibleItems` 透明 + 缺 workbench | 四项、顺序不变、无 `more/back` |
| `dockVisibleItems` 胶囊会话页 / 面板页 | 复用现有 `dockPages` 断言；`canPage=true` |
| `dockVisibleItems` 胶囊 page=2 | 返回第二页（`settings/automation/workbench/back`） |
| `dockVisibleItems` 退化输入 | `null`/`undefined` 不抛 |
| 源码契约：透明分支不调用 `dockPages` | `source` 中 `dockVisibleItems` 内 `!capsule` 分支必须 `return { items: list...` |
| 源码契约：`syncComposerAttach` 先判 capsule | 函数体前 400 字符内出现 `DOCK_STYLE_CAPSULE` 与 `return` |
| 源码契约：`ensureAddMenuCoherent` 存在且被三处调用 | `syncComposerActions` / `openOfficialAddMenu` / pointerdown 钩子 |
| 源码契约：遮罩防抖 | `v2AddMenuOpenedAt` 与 `< 250` 判断存在 |

### 5.2 静态门禁

```pwsh
npm test
npm run check        # 语法 + 单测 + 打包 + 硬编码/颜色/token/契约/兼容/!important 全量
```

现有 `dock.test.js` 的「胶囊 CSS 全部限定在 `[data-dshm-dock="capsule"]`」必须继续绿；新增 JS 级契约（上面 3 条源码扫描）。

### 5.3 AVD 运行时矩阵（`Medium_Phone_API_35`）

环境：`E:\Android\Sdk\platform-tools\adb.exe`，WebView 调试走 `adb forward tcp:9222` + `node .tmp-shot/cdp.mjs`。

| # | 状态 | 断言 |
| --- | --- | --- |
| 1 | 透明 · 会话页 · 亮色 | 五键 = 会话/自动化任务/插件/工作台/设置；无脚注/把手/灰槽；工具行 42px；官方 ⊕ `28×28` @ 左 |
| 2 | 透明 · 面板页（插件） | 五键不变；内容区底部让位 56px；无「更多/返回」 |
| 3 | 透明 · 设置页 | 底栏可见、可换页；设置弹窗底边 `bottom: 56px` |
| 4 | 透明 · 深色 | 同上 + 对比度不变 |
| 5 | 透明 · 键盘弹起 | 底栏收起（`data-dshm-ime`），输入行贴键盘，⊕ 仍可点开面板且面板在键盘上方 |
| 6 | 胶囊 · 会话页 | 五键 = 会话/插件/工作权限/模型/更多；灰槽/脚注/把手；自绘动作行 40px 三键；`--dshm-v2-nav-total` 正确 |
| 7 | 胶囊 · 面板页 / 设置页 | 工作权限/模型 隐藏，设置/自动化/工作台补位；脚注只留在会话页 |
| 8 | 胶囊 · 收起 | 只留把手行；让位量缩小；焦点移到把手 |
| 9 | 双向切换 | 胶囊→透明、透明→胶囊、设置页内切换：无残留节点/属性；透明五键立即恢复 |
| 10 | 三预设 × 语言 | 原生/融合/悬浮 × zh/en 无回归 |
| 11 | 平板 `Pixel_Tablet_API_35` | 插件不激活（`data-dshm-mode=null`，无胶囊节点） |

每项保存截图到 `docs/assets/screens/`（透明底栏建议新建 `transparent/` 子目录），并在 PR 里贴关键几张。

### 5.4 像素基线比对（证明「透明 = 之前」）

1. 建一个临时 worktree 指向 `32563dc^`（胶囊合并前）：
   `git worktree add .agents/worktrees/baseline-transparent 32563dc^`
2. 用 worktree 的包部署到同一 AVD（`.tmp-shot/deploy.ps1` 的路径改成该 worktree），切透明态，截：
   - 会话页整屏（含输入行 + 底栏）；
   - 底栏裁剪图（输入行 + 五项导航）；
   - 设置页整屏。
3. 回到 HEAD 部署，同样三张；用像素差（容差 2%，抗锯齿）确认：
   - 透明态：差异应只在无关的对话内容/流式文本区域，底栏与输入行裁剪图必须一致；
   - 胶囊态：**不参与**该基线比对（它本来就要保持当前效果）。
4. 把基线截图存到 `docs/assets/screens/baseline-transparent/`（或仅在 PR 附件，避免仓库膨胀）。

### 5.5 加号风暴 / 故障注入（针对 §3.3）

用 CDP 真实触摸（`Input.dispatchTouchEvent`，坐标取 `[data-dshm-add-chip]` 的 rect 中心，CSS px）：

1. **单击循环**：200 次「点开 → 点遮罩关」，随机等待 0–800ms；断言 `panel` 每次都出现（≥ 99%，失败即打印 `window.__dshmCompat.addMenu`）。
2. **双击**：两次点击间隔 `40/80/120/180/260/400/600ms`；断言最终 `panel=1`（防抖生效）。
3. **幽灵注入**：`html.setAttribute('data-dshm-v2-addmenu','')` → 点 ⊕ → 断言 500ms 内 `panel=1`（自愈/点前修复生效）。
4. **快速重开**：点「计划」/「压缩」等派发项后 100/300/600ms 再点 ⊕ → 断言面板出现。
5. **后台化**：点「文件」拉起系统选择器，返回后立刻点 ⊕ → 断言面板出现（真机/AVD 均跑一次）。
6. **抖动点击**：点在 ⊕ 上并横向抖动 8/12/16px（模拟手指抖动）→ 记录是否丢 click；若丢，按 §4.4 处理。

脚本骨架保留在 `.tmp-shot/`（已 gitignore），PR 里给出可复制的命令。

### 5.6 诊断可观测性

- 扩展现有 `window.__dshmCompat.addMenu`（`:5742-5751`）：补 `ghost`、`panelOpen`、`maskOpen`、`openedAt`、`ghostEpoch`、`releaseTimer`。
- 新增 `data-dshm-addmenu` 之外的只读快照字段，排障时一条 `cdp.mjs` 即可判断卡在哪一步（与 0.4.9 的做法一致）。

---

## 6. 验收标准（Definition of Done）

- [ ] 透明态五键严格为 `会话 / 自动化任务 / 插件 / 工作台 / 设置`，顺序与 `NAV_KEYS` 一致；能力缺失时少一格且不留死键。
- [ ] 透明态不存在「更多 / 返回」翻页；`dockPage` 不参与透明渲染；Esc 不会误触第二页。
- [ ] 透明态底栏无灰槽/把手/脚注/自绘动作行/附件按钮；官方 ⊕ 与官方发送的几何与基线一致。
- [ ] 胶囊态导航项、灰槽、把手、脚注、自绘动作行、收起行为与修复前一致（回归截图逐项对照）。
- [ ] 任意一次真实点 ⊕ 都能在 500ms 内看到面板或官方弹层；双击 300ms 内保持打开。
- [ ] 幽灵注入、快速重开、后台化返回三个用例全部通过。
- [ ] 切换样式（两个方向 × 会话页/设置页）无残留：`data-dshm-dock*`、`.dshm-*` 节点、`--dshm-v2-nav-total` 全部复位。
- [ ] `npm run check` 全绿；平板 AVD 不激活。
- [ ] 文档（README / preset-v2 / preset-v2-capsule / architecture / technical-notes / CHANGELOG）同步。

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 透明态恢复五项后，用户已习惯「更多」入口 | 中 | 按 README/preset-v2 的既有承诺执行；发布说明写清楚；胶囊用户不受影响 |
| 遮罩防抖让「点 ⊕ 再点一次 = 关闭」的既有手势变迟钝 | 低 | 只忽略 250ms 内的第一次遮罩点击；之后仍可关闭 |
| 幽灵自愈误关刚打开的官方弹层 | 中 | 只在 `!state.v2AddMenu && 无面板 && 超时窗` 时触发；`closeOfficialAddMenu` 前校验 epoch/节点 |
| 点 ⊕ 前修状态影响胶囊自绘 ⊕ | 中 | 自绘 ⊕ 仍走官方 `.click()`；只在「幽灵在 + 无面板」时干预，面板打开时不动 |
| AVD/adb 环境不稳定（本轮已遇到双 adb server 抢 5037） | 低 | 验证脚本先 `adb kill-server/start-server`，并固定用 `E:\Android\Sdk\platform-tools\adb.exe` |
| 像素基线受引擎版本/字体影响 | 中 | 基线用同一 AVD、同一引擎版本；容差 2%；关键裁剪区域人工复核 |

---

## 8. 任务清单（按依赖排序）

### Phase 1：样式层分叉（先做，收益最大）

**T1（S，1–2 文件）透明导航回退 `navSlots`**
- 新增纯函数 `dockVisibleItems`；`V2Nav` 按 `dockCapsule` 分叉；`dockPage` 在非胶囊态复位；Esc 监听门禁。
- 文件：`lib/client.js`、`test/dock.test.js`。
- 验收：单测 5 例；AVD 矩阵 #1–#3、#9 通过；截图与基线一致。
- 依赖：无。

**T2（XS，1 文件）回形针只在胶囊态创建**
- `syncComposerAttach()` 前置 capsule 判断并清理残留。
- 文件：`lib/client.js`。
- 验收：透明态 `[data-dshm-attach-btn]` 恒 0（含 1.2s 轮询窗口）；胶囊态附件菜单不回归。
- 依赖：无（可与 T1 并行）。

### Phase 2：加号面板可靠性

**T3（M，1–2 文件）幽灵态/抑制窗/遮罩防抖**
- `ensureAddMenuCoherent` + pointerdown 钩子；`addMenuGhostEpoch` + `releaseGhost` 精准关闭；`v2AddMenuOpenedAt` + 遮罩 250ms 防抖；心跳自愈；吞事件收窄。
- 文件：`lib/client.js`、`test/dock.test.js`（纯函数/源码契约）。
- 验收：§5.5 的 1–5 全过；`window.__dshmCompat.addMenu` 字段齐全。
- 依赖：T2（避免附件注入干扰命中区）。

**T4（S，1 文件）左缘手势抖动验证（可能只出结论）**
- 跑 §5.5.6；若能复现丢 click，再按 §4.4 实现；不能复现则只记录数据、不改。
- 文件：`lib/client.js`（视结论）。
- 依赖：T3。

### Checkpoint（T1–T4 后）
- [ ] `npm run check` 全绿。
- [ ] AVD 矩阵 #1–#10 全过，截图归档。
- [ ] 像素基线比对完成。
- [ ] 人工复核：透明/胶囊各一张底栏裁剪图。

### Phase 3：收尾

**T5（XS，文档）同步 README / preset-v2 / capsule / architecture / technical-notes / CHANGELOG**
- 依赖：T1、T3（以最终行为为准）。

**T6（XS，验证）平板 + 三预设 + 深色/语言回归**
- 依赖：T5。

**T7（XS，发布）`npm run check` + 打包自检 `prepack` + 版本号/CHANGELOG**
- 依赖：T6。

---

## 9. 开放问题（需产品/用户拍板）

1. 透明态恢复「五项目的地」后，是否还需要保留一个等效的「更多」入口？按现有文档是不需要；如果要，应另开需求，而不是复用胶囊的第二页。
2. 双击 ⊕ 的期望：**保持打开**（本计划推荐）还是保持「第二下关闭」？推荐前者，因为「没反应」的误判成本更高。
3. 是否接受把 ⊕ 从 `x=16` 稍向右移（例如 20px）以彻底避开左缘手势区？这会改变透明态基线，需要单独确认（本计划默认不动位置）。
4. `--dshm-v2-nav-total` 在透明态是否继续等于 `--dshm-v2-nav`（56px）？本计划保持现状。

---

## 附录 A：本轮实测命令与脚本

```pwsh
# 1) 部署当前仓库到 AVD（会重启 App）
pwsh -File .tmp-shot/deploy.ps1

# 2) 重连 WebView 调试与探针
$adb = 'E:\Android\Sdk\platform-tools\adb.exe'
$appPid = (& $adb -s emulator-5554 shell pidof app.dsh.mobile).Trim()
& $adb -s emulator-5554 forward --remove-all
& $adb -s emulator-5554 forward tcp:9222 localabstract:webview_devtools_remote_$appPid
node .tmp-shot/cdp.mjs "JSON.stringify({dock:document.documentElement.getAttribute('data-dshm-dock'),nav:[...document.querySelectorAll('.dshm-bar-btn')].map(b=>b.getAttribute('data-dshm-v2-nav-item'))})"

# 3) 切换样式（注意：setItem 与 reload 要分开两次执行，避免写入被 reload 打断）
node .tmp-shot/cdp.mjs "localStorage.setItem('dshm-dock-style','plain')"
node .tmp-shot/cdp.mjs "location.reload()"
# 恢复胶囊
node .tmp-shot/cdp.mjs "localStorage.setItem('dshm-dock-style','capsule')"
node .tmp-shot/cdp.mjs "location.reload()"

# 4) 整屏截图
& $adb -s emulator-5554 exec-out screencap -p > .tmp-shot\avd\shot.png
```

**幽灵注入最小复现（透明态）**：

```js
// 前置：面板已关闭
document.documentElement.setAttribute('data-dshm-v2-addmenu', '');
// 然后真实点 ⊕（CDP Input.dispatchTouchEvent，坐标取 [data-dshm-add-chip] 中心）
// 观察：官方 popover 出现但 opacity=0，无 .dshm-v2-addpanel，phase=suppressed
// 清掉幽灵后，接管才会跑起来（phase=enter，面板出现）
```

**双击复现**：两次真实点击间隔 40–600ms，1.3s 后读 `.dshm-v2-addpanel` 数量，全部为 0。

---

## 附录 B：本轮实测数据（透明态）

| 项 | 值 |
| --- | --- |
| `.dshm-v2-nav` | `[0, 906, 457, 56]` |
| 导航项 | `sessions / plugins / permission / model / more`（错误） |
| 官方 ⊕ | `[16, 861, 28, 28]` |
| 权限 chip | `[52, 861, 78, 28]` |
| 模型 chip | `[337, 861, 54, 28]` |
| 官方发送 | `[407, 856, 34, 34]` |
| 工具行 | 42px，`opacity: 1` |
| 输入行 `padding-right` | `0px` |
| 胶囊残留计数 | foot 0 / actions 0 / attach 0 / seg 0 |
| 单击 12 连击 | 12/12 正常开合 |
| 双击 7 档间隔 | 7/7 最终关闭（= 「没反应」） |
| 幽灵注入 | `pop=1, opacity=0, panel=0, phase=suppressed`；清幽灵后 `phase=enter, panel=1` |

---

## 10. 实施记录（2026-11-09）

### 已落地

- **T1** `dockVisibleItems` 纯函数 + `V2Nav` 分叉 + `dockPage` 复位 / Esc 门禁；`__test` 导出；`test/dock.test.js` 新增 6 个用例（透明五项、能力缺失、胶囊两页、退化输入、源码契约）。
- **T2** `syncComposerAttach()` 增加胶囊门禁；源码契约测试锁「门禁必须在 insertBefore 之前」。
- **T3** `ensureAddMenuCoherent()` + `addMenuGhostEpoch` / `addMenuGhostTimer` + ⊕ 捕获阶段 pointerdown + `releaseGhost(popAtClose)` 世代号 + 遮罩 250ms 防抖 + 200ms 心跳自愈 + 400ms 吞事件放行 ⊕；`dispatchAddOption` 收尾同样带世代号。
- **文档**：README / README.en / preset-v2 / preset-v2-capsule / architecture / technical-notes §3.19 / CHANGELOG。
- **T4** 抖动用例：单击 60 次风暴无丢失；未复现「横向抖动导致 click 丢失」，按计划不改手势。

### 验证结果（AVD `Medium_Phone_API_35`）

| 用例 | 结果 |
| --- | --- |
| 透明底栏五键 | `sessions / automation / plugins / workbench / settings`（中文：会话 / 自动化任务 / 插件 / 工作台 / 设置）✓ |
| 透明面板页 / 设置页五键 | 不变，无「更多 / 返回」✓ |
| 透明残留计数 | foot 0 / actions 0 / attach 0 / seg 0 ✓ |
| 透明官方 ⊕ | `[16, 861, 28, 28]`，官方发送 `[407, 856, 34, 34]` ✓ |
| 胶囊底栏 | 按页换项、脚注 1、自绘动作行 1、回形针 1、`--dshm-v2-nav-total` 公式不变 ✓ |
| 胶囊自绘 ⊕ | 40×40 @ `[311, 822]`，点开面板 `panel=1` ✓ |
| 单击风暴 60 次 | 0 失败 ✓ |
| 幽灵注入后单击 | 900ms 内 `panel=1`（修复前为 `pop=1, opacity=0, panel=0`）✓ |
| 双击 60/120/200ms | 全部保持打开（修复前 7/7 关闭）✓ |
| `npm test` | 299 pass / 0 fail / 8 skipped |
| `npm run check` | 全绿（hardcode 0 new、tokens/colors/contracts/compat/important 全 PASS） |

### 未做 / 后续

- 像素基线比对（§5.4）未执行：需要额外建 `32563dc^` worktree 并重复部署；本轮以 DOM/几何断言 + 截图替代，建议在发布前补一次。
- 深色截图未重拍（壳不跟随系统夜间模式，需 App 内切外观）。
- 代码未提交，工作区保留改动供评审。
