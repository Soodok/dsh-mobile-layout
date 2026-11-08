# 悬浮布局（v2 预设）

> 输入卡浮起 + 五项导航的**手机应用形态**。三套布局之一，切换入口：**设置 → 通用设置 → 布局模式**。
> 截图为 v0.4.0 在 MuMu 模拟器（物理 720×1280，CSS 视口 400×684）的整机实拍，浅色主题。

其他预设：[原生](preset-default.md) ｜ [融合](preset-classic.md) ｜ 回到 [README](../README.md)

---

## 界面总览

<table>
  <tr>
    <th align="center">主界面（空会话）</th>
    <th align="center">通用设置 · 布局模式</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/preset-v2/home.png" width="280"></td>
    <td align="center"><img src="assets/screens/preset-v2/settings-general.png" width="280"></td>
  </tr>
  <tr>
    <td valign="top">悬浮输入卡 + <b>透明五项导航</b>（会话 / 自动化任务 / 插件 / 工作台 / 设置）。输入卡软阴影直接落到导航行，无硬边。</td>
    <td valign="top">「布局模式」三选一（<b>悬浮</b>选中），卡片带迷你线框缩略图；外观三卡与官方配色实时跟随。</td>
  </tr>
</table>

## 五项导航换页

<table>
  <tr>
    <th align="center">插件页</th>
    <th align="center">自动化任务页</th>
    <th align="center">工作台（右侧面板）</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/preset-v2/plugins.png" width="240"></td>
    <td align="center"><img src="assets/screens/preset-v2/automations.png" width="240"></td>
    <td align="center"><img src="assets/screens/preset-v2/workbench.png" width="240"></td>
  </tr>
  <tr>
    <td valign="top">页面而非弹层，导航常驻可继续换页；当前页用官方蓝高亮。</td>
    <td valign="top">官方 schedules 面板页；再点一次「自动化任务」返回会话。</td>
    <td valign="top">直接开关官方右侧面板，手机宽度下自动全屏；<b>横滑一下即退出</b>。</td>
  </tr>
</table>

- **会话键是「回首页」**：在其它页点它回会话页；在会话页点它才弹会话抽屉。
- 图标直接用 DSH 自带符号（`--dsw-alias-state-business-primary` 上色当前页）。

## 底栏样式：透明 / 胶囊

底栏之上还有一层**可选样式**。入口在设置 → 通用设置 → 布局模式：选中「悬浮」时多出一行「底栏样式」（透明底栏 / 胶囊底栏），与原生预设的「原生设置」行同一套 UI。**默认仍是透明底栏**，v2 的外观与之前逐像素一致（本文的设置页截图为加这一行之前拍的，实际位置就在三张布局卡片下方）。

| 样式 | 外观 | 根属性 |
|---|---|---|
| 透明（默认） | 不铺底色、不画分割线，输入卡的软阴影直接落到导航这一行 | 无（属性不存在） |
| 胶囊（可选） | 底栏浮起成圆角胶囊：官方卡片面 + 1px 描边 + 官方投影，底部带抽屉把手 | `html[data-dshm-dock="capsule"]` |

- **为什么透明是默认**：不透明底色会把输入卡的软阴影切成一条硬边，看起来像输入框被截断（根因与修法见[技术说明 §3.17](technical-notes.md)）。把胶囊收成「用户显式打开的样式层」，既保住了这条既有决策，也不让老用户的截图与手感变样。
- **胶囊表面全用官方 token**：卡片面 `--dsw-alias-bg-layer-2`、描边 `--dsw-alias-border-l1`、投影 `--dsw-elevation-panel`（缺省回退是整条阴影表达式，颜色取 0.16 档 `--dshm-color-shadow-2`）。**不要用 `--dsw-alias-bg-elevated`** —— 这个 token 在当前 DSH 运行时里不存在（实测），拿它当卡片面只会静默落到回退值。
- **把手**：胶囊底部两条小横杠（`.dshm-dock-grabber`）。点一下收起导航，再点展开；收起态由根属性 `html[data-dshm-dock-collapsed]`（无值布尔属性）驱动，CSS 只把五个 `.dshm-bar-btn` 设 `display: none`。**把手留在原位**——胶囊收缩到把手那一行，屏幕底边固定，所以把手的位置一点不动，用户不用重新找控件。触控区 `min-height: var(--dshm-v2-dock-handle)`（默认 44px，与 `.dshm-bar-btn` 的 44px 约定同一口径）。
- **收起 ≠ 导航失效**：「导航常驻可继续换页」在胶囊态依然成立——收起是用户主动操作、一键即恢复；没收起时换页语义与透明底栏完全一致（会话键仍是「回首页」，当前页仍用官方蓝高亮）。
- **让位高度只认一个变量**：`--dshm-v2-nav-total` 默认 `var(--dshm-v2-nav)`（即 56px，取值与行为都不变），胶囊态下等于 `calc(var(--dshm-v2-nav) + var(--dshm-v2-dock-handle) + var(--dshm-v2-gutter))`，即「导航 + 把手行 + 卡片与底栏之间那段净空」；收起态只剩把手一行，它缩到 `calc(var(--dshm-v2-dock-handle) + var(--dshm-v2-gutter))`，页面不会白留一条。面板页正文底部 padding、设置弹窗底边、工作台右栏底部 padding、设置面板内联 `bottom` 统一消费它，加一行把手不需要再改四处写死的 56px。
- **按设备记住**：`localStorage['dshm-dock-style']`（`capsule` / 缺省即透明）与 `localStorage['dshm-dock-collapsed']`（`'1'` 表示收起）。隐私模式下写不进去只影响本次会话，不报错。切回透明底栏时收起态一并复位——没有把手可点，就没有「收起」这件事。
- **无障碍**：把手是 `<button>`，带 `aria-controls` + `aria-label`（收起时念「展开底栏」）+ `aria-expanded`；两条横杠是 `aria-hidden="true"` 的纯装饰；`role="tablist"` 在五个导航键的容器上，**把手不在 tablist 里**。收起时若焦点正落在被隐藏的导航键上，焦点会移到把手，不留在一个 `display: none` 的按钮上。
- **不残留**：切走 v2 预设、切回原生、`clearAnchors()`、`dispose()` 都会摘掉这两个根属性（符合「三档双向不残留」）。
- **这一期没做**：拖动跟手（第二阶段）、两页导航、顶部卡片头、输入区与底栏合并。

## 加号面板（自绘一 / 二级菜单）

<table>
  <tr>
    <th align="center">一级菜单</th>
    <th align="center">二级菜单（指令）</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/preset-v2/add-panel.png" width="280"></td>
    <td align="center"><img src="assets/screens/preset-v2/add-submenu.png" width="280"></td>
  </tr>
  <tr>
    <td valign="top">附件三块（<b>图片 / 相机 / 文件</b>）+ 各官方分组一行；覆盖式抽屉，不推正文。</td>
    <td valign="top">点分组进二级页，条目按「标题 + 官方描述」列出；支持任意深子层。</td>
  </tr>
</table>

- 数据与动作仍来自官方节点：读它的选项、派发它的 `mousedown`，不复制命令语义。
- 图片 / 相机走自建 `input[type=file]`（相机带 `capture`）；文件保留官方上传与校验链路。
- 加号 / 模型 / 权限 / 工作区选择全部从底部盖上来；返回键 / Esc / 遮罩逐层收起。

## 设置页与多语言

<table>
  <tr>
    <th align="center">中文（默认）</th>
    <th align="center">English（实时刷新）</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/preset-v2/settings-general.png" width="280"></td>
    <td align="center"><img src="assets/screens/preset-v2/settings-english.png" width="280"></td>
  </tr>
  <tr>
    <td valign="top">全屏接管：品牌行 + 可横滑页签 + 返回键；内容区左右横滑切页签。</td>
    <td valign="top">切 English 后 <b>Layout / Native / Merged / Floating</b> 与底栏文案立即刷新，无需重启。</td>
  </tr>
</table>

- 插件自带的配置页（如桌宠配置、插件市场）同样被接管，不出现兼容异常。
- 设置页内切预设：切到**原生**时设置页保持打开（悬浮窗形态），切到**融合**变全屏形态。

## 关键行为速查

| 行为 | 说明 |
|---|---|
| 切换预设 | 设置 → 通用设置 → 布局模式；即时生效、三档双向不残留 |
| 输入卡圆角 | `--dshm-v2-radius`（默认 20px），虚线描边跟随圆角 |
| 输入卡留白 | `--dshm-v2-gutter`（默认 8px） |
| 导航高度 | `--dshm-v2-nav`（默认 56px） |
| 底栏行总高 | `--dshm-v2-nav-total`（默认 `var(--dshm-v2-nav)`；胶囊态含把手行，四处让位统一消费它） |
| 底栏样式 | 设置 → 通用设置 → 布局模式 →「悬浮」下的「底栏样式」：透明底栏（默认）/ 胶囊底栏 |
| 底栏收起 | 胶囊底栏底部的把手点一下收起、再点展开；`localStorage['dshm-dock-collapsed']` 按设备记住，把手位置不变 |
| 引擎状态条让位 | `--dshm-engine-bar`（默认 56px；习惯先收起就设 `0px`） |
| 会话抽屉 | 固定 55% 屏高，条目少时底部留白 |
