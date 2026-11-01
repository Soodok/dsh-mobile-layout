# 更新日志

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.4.3] - 2026-11-01

### 调试

- 新增诊断探针 `probeIme`：在**键盘开合**与**抽屉 / 底部表收起**这几个低频时刻，往控制台打一行 JSON（`clientHeight` / `visualViewport` 的 `height`+`scale`+`offsetTop` / `data-dshm-ime` 标记 / 输入卡上下边 / `activeElement` / 当前预设）。app 侧 `onConsoleMessage` 会把 WARNING 写进 logcat，用来分辨「键盘没让位（app / OEM 侧 insets）」和「输入卡定位算错（插件侧）」——vivo X300 与 Redmi K70 表现不一致，靠这条日志定位。

## [0.4.2] - 2026-11-01

### 修复

- **收起侧边栏会自动唤起输入法，输入框还被键盘挡住**（真机：正常手机 + 悬浮预设）。抽屉关闭时把焦点「还给打开前的元素」，而打开抽屉前焦点就在输入框里：`textarea.focus()` 在 Android 上会无条件拉起软键盘，于是「手动收键盘 → 开抽屉 → 收抽屉」变成键盘自己弹回来；这一路是脚本聚焦，WebView 拿不到对应的键盘让位，输入卡就被压在键盘下面。
  - 文本录入控件（`input` / `textarea` / `select` / `contenteditable`）**不再归还焦点**，新增纯函数 `isTextEntry`；底部表的焦点归还走同一条规矩。
  - 新增 400ms 的「焦点回弹」护栏 `guardComposerFocusAfterOverlay`：浮层收起后短时间内任何落进文本控件的焦点都被 blur 掉（挡住官方自己的 refocus，比如切换会话后的补焦），一旦出现真实触摸立刻撤窗——用户点输入框照常弹键盘。

### 测试

- 新增 `test/focus-return.test.js`（4 条）：`isTextEntry` 的控件判定、护栏 blur 行为、`pointerdown` 撤窗、非文本控件不受影响。

## [0.4.1] - 2026-11-01

### 修复

- **键盘判定被页面缩放误触发**（真机：平板小窗 + 悬浮预设，底部导航栏整条消失）。`visualViewport.height` 会随页面缩放等比变化，150% 缩放下 826dp 窗口量出来是 551（差 275 ≥ 120 阈值）→ 被当成键盘弹出 → `data-dshm-ime` 生效、导航 `opacity: 0`。改为统一换算成「布局 px」（`clientHeight × scale`）再比，对缩放免疫。新增 `layoutHeightPx` / `isKeyboardOpen` 两个纯函数与 6 条回归用例。
- **顶部状态带（轮次/Token/缓存命中/上下文）掉回输入区下方**。定位链原先依赖「tok 按钮 + 上下文按钮」的 aria-label 配对，两处宿主变化都会让它失配：① 官方是 `activity ? null : <ContextMeter/>`，智能体执行期间上下文环整块不渲染；② 新宿主顶栏多了「对话 / 轨迹 / 上下文」切换条，`/上下文/` 先命中页签，公共祖先一路爬到中心列后判定 `dock === root` 直接清标。改为**优先认官方结构锚点 `[data-composer-dock]`**（运行中与空闲都在），aria 配对降为老宿主退路。
- 兜底「轮次统计行」的文本长度上限由 40 放宽到 80：官方补上「缓存命中 95%」后中文整行 41 字符，正好被旧上限拒掉。
- 状态带高度在打标后改量子项（原先量自身，而上一次写入的固定高度会自指），执行中上下文环消失时能缩回去。
- **键盘弹起后输入框与键盘之间多一条白带**（真机：正常手机 + 悬浮预设）。导航只做了 `opacity: 0`，官方 `shell.bottom` 这一行（grid 第二行，尺寸 `auto`）仍被导航自身 56px 撑着，输入卡就被顶到离键盘一整条导航远的位置。改为键盘态把该行 `height: 0`、卡片下沿那 8px「阴影净空」一并归零（阴影落在键盘上看不见，留着只是一条白缝），设置页弹窗底边同步落到键盘上沿。

### 测试

- 新增 `test/ime.test.js`（6 条）、`test/stats-bar.test.js`（7 条）。
- 新增 `test/stats-bar-dom.test.js`（5 条，jsdom 骨架驱动 `syncStatsBar`）：空闲 / 执行中 / 顶栏有「上下文」页签 / 空会话 / 41 字符纯文本行；未安装 jsdom 时自动 skip（`NODE_PATH=<含 jsdom 的 node_modules> npm test` 可跑）。

## [0.4.0] - 2026-11-01

### 新增

- **三套布局预设体系稳定化**（原生 / 融合 / 悬浮）：设置页「布局模式」三选一（各带迷你线框缩略图，`currentColor` 适配深浅主题）；卡片一行三列、官方配色实时跟随（切主题自动重跑）。
- **插件自带配置页兼容**：dsh-pet 桌宠配置、dshmarket 插件市场实测通过；设置内容块按几何 + 内容量判定，不再强依赖表单控件。
- **原生设置悬浮窗**：`settingsFrameMetrics` 纯函数计算几何；左右等宽居中（`--dshm-settings-gutter` + `margin: 0 auto`）、上下各留约 10vh（`clamp(vpad-min 24px, 10vh, vpad-max 120px)` 双向钳制）；从其它预设切原生时设置页保持打开。
- **布局模式文案 i18n**：新增 `syncLayoutPickerTexts`，语言切换后标题 / 副标题 / aria-label 实时刷新（Native / Merged / Floating），无需重启。
- **布局几何硬编码守卫**：`scripts/check-hardcoded.mjs` 扫描注入 CSS 中「布局属性 + 纯 px」，`var()/clamp()/env()/%` 自适应表达式自动放行、`HARDCODE-OK:` 注释豁免；与 baseline 比对，**新增违规即 CI 失败**，存量 221 处渐进收紧。已接入 `npm run check` 与 CI。

### 修复

- 融合空态虚线输入卡左边贴屏、右侧多 7px（官方滚动容器 `scrollbar-gutter: stable` 经典滚动条沟槽 + 窄宽度）：滚动容器收敛改为手机布局全预设打标，空态卡恢复对称 gutter 与圆角。
- 悬浮空态输入卡虚线描边与卡片圆角不一致（虚线画在官方 `::after` 伪元素上）：伪元素 `border-radius` 跟随 `--dshm-v2-radius`。
- 预设切换临界态加固：宿主「禁用插件不 dispose / 启用不重新 apply」导致的多实例撕裂（卡片失效、底栏残留）——新增 `activeDispose` 单实例守卫；`setPreset` 显式 `syncSettingsPanel`；`clearSettingsPanel` 还原官方内联样式（含 `max-width`）。
- 设置页切页签闪烁；Agent 预设被官方贴边悬浮窗接管。
- 从其它模式切原生时设置页被 `history.back()` 直接关闭：仅在设置页 / 官方弹窗不存活时才消费历史条目。

### 文档

- README（中 / 英）同步至 0.4.0；新增三预设独立展示文档：[原生](docs/preset-default.md) / [融合](docs/preset-classic.md) / [悬浮](docs/preset-v2.md)（内嵌 HTML 表格排版，v0.4.0 整机实拍截图）。
- 架构文档补充预设体系、设置接管与质量边界；技术说明补充自适应变量表、真机取证经验与守卫脚本用法。

## [0.3.0] - 2026-10-31

### 新增

- 悬浮布局（v2）壳层：悬浮输入卡 + 五项导航（会话 / 自动化任务 / 插件 / 工作台 / 设置），DSH 官方图标与蓝色高亮。
- 三层解耦：宿主 host → 手机形态 phone → 外观预设 preset（default / classic / v2）；`data-dshm-form` / `data-dshm-preset` 根属性。
- 设置页「布局模式」三选一注入；三档改名为原生 / 融合 / 悬浮并挪到外观下面。
- 工作台走 `ctx.sidebarRight` 打开官方右侧面板，横滑退出；会话键「回首页」语义。
- 加号面板改自绘「一级菜单 + 二级列表」，附件拆图片 / 相机 / 文件。
- 引擎状态条让位变量 `--dshm-engine-bar`（默认 56px）。

### 变更

- 底栏透明、输入卡下沿贴导航上沿；覆盖式抽屉（会话抽屉固定 55%）。
