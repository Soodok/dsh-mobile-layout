# dsh-mobile-layout Token 契约

> 机读来源：`contracts/dshm-tokens.json`。本文、`styles/tokens.css` 与 `lib/client.js` 的默认值由
> `scripts/check-tokens.mjs` 逐值校验（属于 `npm run check`），任何一边漂移都会让 CI 失败。

## 1. 两层命名

| 层 | 前缀 | 谁写 | 谁可以覆盖 | 说明 |
|---|---|---|---|---|
| size | `--dshm-*` | 插件注入的样式表 | 第三方插件 | 版式尺寸，有静态默认值 |
| color | `--dshm-color-*` | 插件注入的样式表 | 第三方插件 | 官方没有等价 token 的颜色，可整套换色 |
| rt | `--dshm-*` | 插件运行时（写 `<html>` 内联） | 不允许 | 测量值（视口、键盘、几何），一帧一值 |

颜色不设自有 token：一律消费官方 `--dsw-*` / `--dsh-*`，缺省值写在 `var(官方, 回退)` 里。

## 2. 公开 size token

| token | 默认值 | 说明 |
|---|---|---|
| `--dshm-header-height` | `56px` | 移动布局下顶部宿主占位高度（含悬浮条） |
| `--dshm-bar-height` | `56px` | 底部常驻操作条高度 |
| `--dshm-drawer-width` | `min(86vw, 280px)` | 手机抽屉宽度上限 |
| `--dshm-safe-top` | `env(safe-area-inset-top, 0px)` | 顶部安全区 |
| `--dshm-safe-left` | `env(safe-area-inset-left, 0px)` | 左侧安全区（横屏 / 挖孔屏生效） |
| `--dshm-safe-right` | `env(safe-area-inset-right, 0px)` | 右侧安全区 |
| `--dshm-safe-bottom` | `0px` | 底部安全区；由宿主让位，默认不再叠加 |
| `--dshm-settings-gutter` | `clamp(12px, 3.4vw, 20px)` | 设置页左右留白 |
| `--dshm-settings-vpad-min` | `24px` | 设置页纵向留白下限 |
| `--dshm-settings-vpad-max` | `120px` | 设置页纵向留白上限 |
| `--dshm-settings-vpad` | `clamp(var(--dshm-settings-vpad-min, 24px), 10vh, var(--dshm-settings-vpad-max, 120px))` | 设置页纵向留白（视口高的 10% 夹逼） |
| `--dshm-settings-maxw` | `480px` | 设置面板最大宽度 |
| `--dshm-settings-safe-x` | `max(env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))` | 设置面板左右安全区（取两侧较大值保证对称） |
| `--dshm-classic-gutter` | `clamp(12px, 3.4vw, 20px)` | 融合预设空态虚线卡左右留白 |
| `--dshm-classic-radius` | `16px` | 融合预设空态虚线卡圆角 |
| `--dshm-v2-gutter` | `8px` | 悬浮预设输入卡四周留白 |
| `--dshm-v2-nav` | `56px` | 悬浮预设五项导航高度 |
| `--dshm-v2-radius` | `20px` | 悬浮预设输入卡圆角 |
| `--dshm-v2-shadow-gap` | `8px` | 悬浮预设阴影净空 |
| `--dshm-engine-bar` | `56px` | 宿主引擎悬浮条占位高度 |
| `--dshm-quick-size` | `clamp(26px, 7vw, 28px)` | 原生预设回形针按钮尺寸 |
| `--dshm-quick-icon` | `clamp(15px, 4vw, 17px)` | 原生预设回形针图标尺寸 |
| `--dshm-quick-gap` | `clamp(6px, 1.6vw, 10px)` | 原生预设附件入口与输入行的间距 |
| `--dshm-quick-menu-w` | `clamp(132px, 42vw, 168px)` | 原生预设附件浮层宽度 |
| `--dshm-native-option-min-height` | （仅覆盖） | 原生设置模式选项最小高度；插件只用 `var(..., 40px)` 消费，不写默认值 |

## 3. 颜色层（layer=color）

官方没有等价 token 的几种颜色收在这一层。**值与迁移前的字面量逐一相同**，属于「提权」而非「调色」；
使用点只消费 `var(--dshm-color-*, 回退)`，因此可以整套换色。

| token | 默认值 | 说明 |
|---|---|---|
| `--dshm-color-danger` | `#e5484d` | 高危 / 错误前景色（完全访问、danger 项） |
| `--dshm-color-danger-strong` | `#d9363e` | 高危前景色加深档 |
| `--dshm-color-hairline` | `rgba(0, 0, 0, 0.14)` | 输入区与正文之间的分界线 |
| `--dshm-color-label-muted` | `rgba(0, 0, 0, 0.45)` | 次级文字（官方 label-tertiary 缺席时的回退） |
| `--dshm-color-scrim` | `rgba(0, 0, 0, 0.45)` | 抽屉 / 底部表遮罩底色 |
| `--dshm-color-scrim-soft` | `rgba(0, 0, 0, 0.32)` | 悬浮加号面板的轻遮罩底色 |
| `--dshm-color-sheen` | `rgba(255, 255, 255, 0.09)` | 面板顶部高光叠加层 |
| `--dshm-color-border-soft` | `rgba(127, 127, 127, 0.25)` | 自有容器描边（浅） |
| `--dshm-color-border-strong` | `rgba(127, 127, 127, 0.28)` | 自有容器描边（深） |
| `--dshm-color-tint-primary` | `rgba(65, 118, 230, 0.18)` | 品牌蓝 18% 透明底 |
| `--dshm-color-tint-secondary` | `rgba(77, 107, 254, 0.10)` | 次级蓝 10% 透明底 |
| `--dshm-color-tint-danger` | `rgba(229, 72, 77, 0.10)` | 危险色 10% 透明底 |
| `--dshm-color-shadow-1` | `rgba(0, 0, 0, 0.12)` | 阴影第 1 档（浮起卡片） |
| `--dshm-color-shadow-2` | `rgba(0, 0, 0, 0.16)` | 阴影第 2 档（弹出层） |
| `--dshm-color-shadow-3` | `rgba(0, 0, 0, 0.18)` | 阴影第 3 档（菜单 / 浮层） |
| `--dshm-color-shadow-4` | `rgba(0, 0, 0, 0.28)` | 阴影第 4 档（抽屉 / 面板） |
| `--dshm-color-shadow-5` | `rgba(0, 0, 0, 0.32)` | 阴影第 5 档（最重投影） |

颜色治理口径由 `scripts/check-colors.mjs` 守护：

- **controlled**：`var(官方token, 回退)` 里的回退值，不算裸色；
- **exempt**：`TOKEN-OK:` / `TOKEN-OK-BLOCK:` 显式说明的有意写死（加号面板色族、调试浮层、token 定义本身）；
- **raw**：其余裸色，必须为 0；新增即 CI 失败。

## 4. 私有运行时 token

这些值由插件在手势 / 测量 / 布局同步时写入，第三方**不要**写；需要影响版式请改用第 2 节的 size token。

| token | 说明 |
|---|---|
| `--dshm-viewport-height` | 布局视口高度，apply 写入 html 内联 |
| `--dshm-ime-height` | 键盘高度，apply 写入 html 内联 |
| `--dshm-panel-space` | 面板页底部让位高度 |
| `--dshm-drawer-x` | 抽屉跟随位移，手势引擎逐帧写入 |
| `--dshm-settle-dur` | 抽屉吸附补间时长 |
| `--dshm-hero-shift` | 空会话 hero 纵向位移 |
| `--dshm-stats-height` | 顶部统计状态带高度 |
| `--dshm-stats-top` | 顶部统计状态带纵坐标 |
| `--dshm-header-menu-top` | 顶栏菜单纵向锚点 |
| `--dshm-header-menu-right` | 顶栏菜单右缘校正量 |
| `--dshm-menu-up-bottom` | 向上展开菜单的底部锚点 |
| `--dshm-tint` | 加号面板色族前景色 |
| `--dshm-tint-soft` | 加号面板色族柔光底色 |
| `--dshm-add-rows` | 加号面板当前行数 |
| `--dshm-viewtabs-extra` | 会话视图页签行的额外横向余量 |

## 5. 第三方覆盖（3 行）

```css
html[data-dshm-form="phone"] {
  --dshm-bar-height: 64px;
  --dshm-drawer-width: 320px;
}
```

规则：

1. 选择器必须带 `html[data-dshm-form="phone"]`（或 `data-dshm-mode="mobile"`），否则桌面形态也会生效；
2. 覆盖样式表要在插件样式之后加载；**只覆盖变量**，不要直接覆盖同名非变量属性（插件样式里不少声明带 `!important`）；
3. 只覆盖第 2 / 3 节列出的 public token。

## 6. 官方主题 API 与「为什么尺寸 token 不注册」

官方把主题 token 覆盖能力放在 `ctx.theme.overrideTokens(source, tokens)`：按 source 分层、per-token 取胜、返回 disposer。

本插件**不**把尺寸 token 注册到这条通道，这是一个有意决策：

- 官方 presenter 会把 token 值写到 `body` 内联样式，而 `body` 内联的优先级高于第三方写在 `html` 上的样式表；
- 尺寸 token 的公开契约恰恰是「第三方用 CSS 覆盖」，一旦走内联，第三方覆盖会被静默压掉；
- 因此 `--dshm-*` 尺寸层只走 CSS 默认值（第 2 / 3 节）与 `styles/tokens.css` 参考表。

theme 通道留给颜色层：颜色一律消费官方 `--dsw-*` / `--dsh-*`，只有确实需要「按 source 叠加的官方 token 覆盖」时才注册，并且必须是 light/dark 成对的值。

运行态诊断（只读）：

```js
JSON.parse(JSON.stringify(window.__dshmCompat.features))   // 特征探针，含 themeOverride
JSON.parse(JSON.stringify(window.__dshmCompat.theme))      // 本插件的 theme 通道决策
```

## 7. 退出

在 `<html>` 上设置 `data-dshm-theme="off"` 可跳过官方 theme 通道注册（CSS 默认值仍然生效）。
