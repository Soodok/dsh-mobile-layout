# 手机外壳改版实施计划（对照设计稿 v1）

> **依据**：设计稿 `ui-final-a.png`（浅色 / 深色双联）+ 交接文档《dsh-mobile-layout 界面改版交接》
> + 本轮 AVD 实测（`Medium_Phone_API_35`，1080×2400 / 420dpi / API 35）。
> **状态**：只有第一阶段（底栏胶囊 + 把手，做成可选样式层）已合入 `main`；设计稿的四块结构性改动**尚未开始**。
> **本文件性质**：实施计划与验收口径，不替代 `docs/preset-v2.md`（用户文档）与 `docs/technical-notes.md`（坑位档案）。

---

## 0. 一句话结论

已合入的是「底栏胶囊 + 抽屉把手」的可选样式层；**设计稿的主体还没做**，而且已合入的胶囊在结构上与设计稿并不一致：

| 设计稿 | 当前 main |
|---|---|
| 输入区 + 导航 + 把手 = **一块**卡片 | 输入卡与胶囊是**两块**，胶囊在卡片下方 |
| 把手是**一条** 40×4 横杠 | 把手是**两条** 1.1em 横杠 |
| 导航五项：会话 / 插件 / 工作权限 / 模型 / 更多 | 仍是旧五项：会话 / 自动化任务 / 插件 / 工作台 / 设置 |
| 顶部是**悬浮卡片头 + 居中分段控件** | 官方扁平 header + 下划线页签 |
| 对话区：工具 chip、代码块卡片、居中日期分隔 | 官方原样（仅用户气泡已右对齐） |

所以「当前合入效果是否都做好了」的答案是：**没有**。底栏胶囊只是第一块砖，且还需要在 P1 里重做成「合并形态」。

---

## 1. 设计稿拆解（按图像逐块读出）

### 1.1 顶部卡片头

| 元素 | 规格（按 1080×2400 截图换算，CSS px） | 建议 token / 实现 |
|---|---|---|
| 卡片 | 圆角 ≈24、左右留白 16、距状态栏 8、轻投影 | `--dshm-header-card-radius`（新增）、`--dsw-elevation-panel` |
| 卡片面 | 浅色近白 / 深色 #1a1c20 级 | `--dsw-alias-bg-layer-2` |
| 第一行 | 侧栏图标（24）+ 标题 22/700 + 副标题 13 次要色 + 右侧三枚 24 图标（圆点 / ⋮ / 面板） | 标题 `--dsw-alias-label-primary`，副标题 `--dsw-alias-label-secondary` |
| 第二行 | 居中分段控件：灰轨道（radius 22、高 ≈44、内边距 4）+ 四段 对话/轨迹/编辑器/… | 轨道 `--dsw-alias-bg-secondary`；选中胶囊 `--dsw-alias-bg-layer-2` + 文字 `--dsw-alias-state-business-primary` |

### 1.2 对话区

| 元素 | 规格 | 现状 |
|---|---|---|
| 用户消息 | 右对齐气泡、浅蓝底、圆角 20、最大宽 78%、内边距 ≈14×18 | 已右对齐（需核对圆角/最大宽/底色档位） |
| AI 消息 | 无头像无名字，正文 0.85em、行高 1.65 | 已无头像；行高未调 |
| 工具调用 | 单行 chip：`Bash · git diff --stat · 1.2s`，圆角 12、`bg-secondary` | **未做**（官方是普通卡片列表） |
| 代码块 | 独立卡片、语言标签 + 复制按钮、圆角 14、等宽 0.7em | **未做**（官方样式无语言标签/复制） |
| 操作行 | 复制 / 重试 / 分支 | 官方是复制 / 赞 / 踩 / 分支 / 库 五枚 |
| 日期分隔 | 居中、弱化 `今天 14:20` | 官方在气泡右下角打时间戳 |

### 1.3 底栏（合并形态，方案 6）

| 元素 | 规格 | 建议 token |
|---|---|---|
| 整块卡片 | 圆角 28、左右 16、下沿 10、面 `bg-layer-2`、轻投影 | `--dshm-v2-radius`（20→28 需新档或改值，见 §8） |
| 第一行 | 输入框（placeholder tertiary）+ 回形针 + 蓝色发送圆钮（40） | 发送钮沿用官方 |
| 第二行导航槽 | 灰底胶囊（`bg-secondary`、radius 22、高 ≈64）、五等分 | 新增 `--dshm-v2-nav-track` |
| 导航项 | 图标 22 + 标签 10；未选中 `label-tertiary`，选中 `state-business-primary` | 现有 `builtinIcon(..., 22)` 可复用 |
| 把手 | **一条** 40×4、radius 999、`label-tertiary` @55% | 与 `.dshm-sheet-grabber` 同语法 |

### 1.4 深色

同布局，正文 +1px（设计稿标注「字号 +1」）。

---

## 2. 现状实测（AVD 一帧 + 代码定位）

- **顶栏**：官方扁平 header（标题 `Greeting` + 圆点 / ⋯ / 面板），下方是下划线式页签 `对话 | 轨迹 | 编辑器 | …` → 不是卡片头，也不是分段控件。
- **对话区**：用户气泡已右对齐浅蓝；AI 正文无头像；操作行五枚图标；时间戳在右下（`11月2日 01:45`）。
- **底栏**：输入卡**单独一块**浮起；下方是**透明**底栏（plain，默认档）五枚：会话 / 自动化任务 / 插件 / 工作台 / 设置；选中项蓝色。
- **设备侧插件版本**：`app.dsh.mobile` 1.5.0 自带的 DSH 引擎里装的是 **0.4.6**（`dsh-home/profiles/web/tools/xiaopb-dsh-mobile-layout-0.4.6.tgz`），所以**本轮改动还没上过设备**——上面的截图只代表线上 0.4.6 的行为。

代码侧：胶囊层已实现（`data-dshm-dock="capsule"` / `data-dshm-dock-collapsed`、`--dshm-v2-nav-total`、`--dshm-v2-dock-handle`、设置页「底栏样式」行）；合并形态、卡片头、分段控件、两页导航、对话区重排均无对应代码。

---

## 3. 差距表

| # | 设计元素 | 设计稿 | 当前 | 差距等级 | 归属 |
|---|---|---|---|---|---|
| 1 | 输入区 + 导航合并成一块 | 一块卡片 | 两块 | **结构级** | P1 |
| 2 | 导航槽（灰底胶囊） | 有 | 无 | 结构级 | P1 |
| 3 | 导航五项语义 | 会话/插件/工作权限/模型/更多 | 会话/自动化任务/插件/工作台/设置 | **结构级 + 动作缺口** | P1 / P4 |
| 4 | 把手 | 单条 40×4 | 两条 1.1em | 样式级 | P1 |
| 5 | 顶部卡片头 | 浮起卡片 | 官方扁平 | 结构级 | P2 |
| 6 | 分段控件 | 居中四段胶囊 | 下划线页签 | 结构级 | P2 |
| 7 | 用户气泡规格 | 圆角 20 / 78% / 浅蓝 | 近似但未校准 | 样式级 | P3 |
| 8 | 工具调用 chip | 单行 chip | 官方卡片 | 结构级 | P3 |
| 9 | 代码块卡片 | 语言标签 + 复制 | 官方样式 | 结构级 | P3 |
| 10 | 操作行图标 | 复制/重试/分支 | 五枚（含赞踩/库） | 样式 + 语义 | P3 |
| 11 | 日期分隔 | 居中弱化 | 右下时间戳 | 样式级 | P3 |
| 12 | 深色字号 +1 | 有 | 无 | 样式级 | P3 |
| 13 | 两页导航 | 有（第二页 目标/计划/压缩/设置/返回） | 无 | 结构级 + 待确认动作 | P4 |

---

## 4. 分期计划

### P0 · 部署与验证基线（**阻塞，等模拟器空闲**）

目标：让 AVD 跑上 `main` 的最新包，并建立可重复的验收流程。

- 部署链路（已勘明，W 权限可用，**无需 root**）：
  1. `npm pack` 产出 tgz；
  2. `adb push <tgz> /data/local/tmp/`；
  3. `run-as app.dsh.mobile` 备份并替换
     `files/dsh-home/profiles/web/node_modules/@xiaopb/dsh-mobile-layout`（解包 tgz，不跑 npm，避免设备侧联网）；
  4. 重启 WebView 与引擎（强停 `app.dsh.mobile` 后重开；引擎 pid 会重起），核对 `logcat` 里出现 `[dsh-mobile-layout]` 与版本号；
  5. 回滚：保留 `profiles.last-good` 不动，另存一份 `@xiaopb/dsh-mobile-layout.bak-<ts>`。
- 验收：设置页能看到「底栏样式」行；切「胶囊底栏」后底栏浮起且出现把手；杀进程重进保持；切回「透明底栏」外观逐像素回到 0.4.10。
- 产出：AVD 截图（浅/深 × 透明/胶囊 × 展开/收起）+ 一条 `docs/preset-v2.md` 可用的图。
- 风险：设备侧是自研引擎（`app.dsh.mobile` 1.5.0 内置 node），包结构与 npm 包一致，但插件清单/`cordis.patch.yml` 由引擎托管；**先只换 `node_modules` 里那一个包目录**，不动 engine 与 overlay。

### P1 · 底栏合并（方案 6）+ 新五项 + 单条把手（核心，风险最高）

目标：把设计稿底栏做成一块。

- 实现取向（**推荐视觉合并，不改官方 DOM 结构**）：
  - 官方 `shell.bottom` 是 grid 第二行、composer 在其上一行；**不搬 DOM**，改用「两块贴合 + 共享面」：让 `[data-dshm-composer-clip]` 的下沿与底栏行上沿共享圆角与面，视觉上成一块；
  - 新增样式层属性 `data-dshm-merged="1"`（默认关，真机确认后再默认开，与交接文档建议一致）；
  - 导航槽：`.dshm-v2-nav-items` 加 `background: var(--dsw-alias-bg-secondary)`、圆角、内边距，五个键等分；
  - 把手：两条 → **一条**（40×4，与 `.dshm-sheet-grabber` 完全对齐），删掉第二条 `<span>`。
- 五项语义改造：
  - 会话（曾用 `IconNewChatOutlineRegular`）、插件（`IconPluginPinwheelOutlineRegular`）不变；
  - 「工作权限」→ 需确认入口（App 桥 `DshAndroid*` 权限中心 / 官方设置页）；
  - 「模型」→ 官方模型选择器 chip 已有锚点（`ATTR_MODEL_CHIP`），改为点底栏键直接开；
  - 「更多」→ P4 前先降级为「打开第二页占位 / 直接开设置抽屉」，**不做死按钮**（仓库既有铁律）。
- 必须重算（否则必翻车）：`--dshm-v2-nav-total`、键盘态 `[data-dshm-ime]` 行高归零、`env(safe-area-inset-bottom)`（走 `--dshm-safe-bottom`）、面板页 `[data-slot="main"]` 让位、设置弹窗 `bottom`、右栏全屏让位。
- 验收：五键可点、当前页高亮、键盘弹起输入框贴键盘无白带、长对话滚到底最后一条不被遮、切预设不残留。
- 风险：合并后底栏总高变化 = 四处让位契约同时变；必须一次改完并让 P0 的截图矩阵回归。

### P2 · 顶部卡片头 + 分段控件

- 需要官方 **header 容器 / 标题节点 / tab 容器** 的锚点（交接文档 §4.1 待回填）。仓库已有 `ATTR_VIEWTABS_ROW`（`data-dshm-viewtabs-row`，ViewTabs 行）与 `ATTR_HEADER_MENU*`，可先复用。
- 只做 CSS + 打属性：header 卡片化（圆角/投影/留白）、tab 行改分段胶囊（选中项白底蓝字）。
- 验收：切页签选中态跟随、长标题省略不换行、深色有层次不刺眼、键盘弹出不抖动。
- 风险：官方 tab 行是 `role=tablist` 的 flex 行，改胶囊要重排内边距；属「外来 DOM 改动」，每个 `sync*` 必须幂等 + 可清理（`clearAnchors`）。

### P3 · 对话区重排

- 用户气泡规格校准；AI 行高；工具调用 chip（纯 CSS 折叠成一行 + 点击展开需官方节点，先做纯 CSS 版本）；代码块卡片（`pre > code` + 语言标签来自 class/label）；操作行图标收敛为 复制/重试/分支（官方「重试」入口需确认）；日期分隔。
- 验收：长对话滚动流畅（不加 resize observer）、chip 展开不跳位、代码块横滚不撑破。
- 风险：消息 DOM 结构随官方版本变；一律用 `data-dshm-*` 锚点 + 幂等重打，不认哈希类名（仓库已有守卫 `CSS 无 [class*=]`）。

### P4 · 两页导航

- 第二页：目标 / 计划 / 压缩 / 设置 / 返回。四个动作**必须确认官方入口**：`/goal`、`/plan`、`/compact` 指令或官方菜单；`工作权限` 走 App 桥。
- 规则：拿不到动作的项**不显示**（不做死按钮）。

### P5 · 矩阵验收 + 文档 + 发版

- 机型：`Medium_Phone_API_35`（主）、`Pixel_Tablet_API_35`（平板不启用手机布局）。
- 矩阵：浅/深 × 空态/对话/工具/代码块 × 设置页/面板页/工作台/键盘态/收起态。
- 文档：`docs/preset-v2.md` 换图 + 行为速查补行；`docs/technical-notes.md` 记新坑；`CHANGELOG` 版本段。
- 门禁：`npm run check` 全绿 + 每期新增源码契约测试。

---

## 5. AVD 验证方案（**本轮不动模拟器**，等通知）

已勘明的环境事实（供下次直接开始）：

| 项 | 值 |
|---|---|
| 设备 | `emulator-5554`（`Medium_Phone_API_35`，1080×2400 @420dpi，API 35）；另有实体机 `71415fa9` |
| adb | `E:\Android\Sdk\platform-tools\adb.exe`（不在 PATH，需全路径） |
| App | `app.dsh.mobile` 1.5.0（debug，`run-as` 可用；`adb root` 不可用） |
| 引擎 | 设备内置：`/data/user/0/app.dsh.mobile/files/engine`，`node bin.js web --patch …/dsh-hardssh/cordis.patch.yml --patch …/android-overlay.yml --no-open` |
| 服务端口 | 设备侧 `127.0.0.1:3080`（WebView 载入 `http://127.0.0.1:3080/plugins/…@xiaopb/dsh-mobile-layout/client.js`） |
| 插件安装位 | `/data/user/0/app.dsh.mobile/files/dsh-home/profiles/web/node_modules/@xiaopb/dsh-mobile-layout`（当前 0.4.6） |
| 回滚素材 | 同目录下 `profiles.last-good`、`profiles.before-rollback`（**只读不写**） |
| 调试通道 | WebView devtools socket `@webview_devtools_remote_<pid>` → `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` 可 CDP 读 `window.__dshmCompat` / 根属性 / computedStyle |

验收执行顺序（下次照做）：

1. 备份 → 部署新包 → 强停重开 → `logcat | grep dsh-mobile-layout` 确认版本；
2. 截图脚本：`screencap` → `pull` → 按 `docs/assets/screens/preset-v2/` 命名；
3. CDP 断言（比肉眼可靠）：`document.documentElement.dataset.dshmPreset === 'v2'`、`dataset.dshmDock` 取值、`.dshm-v2-nav` 的 `getBoundingClientRect()` 高度 == `--dshm-v2-nav-total` 计算值、`.dshm-dock-grabber` 的 `rect.height >= 44`、导航槽背景色 == `--dsw-alias-bg-secondary` 解析值；
4. 键盘态：`adb shell input keyevent` + 单击输入框，确认 `[data-dshm-ime]` 下手动量 `[data-dshm-bottom]` 高度 = 0；
5. 回滚演练：把备份目录换回，确认外观恢复。

**若模拟器长期被占用**：降级用桌面 Chrome 的 device emulation（1080×2400、DPR 2.625）验证 CSS/颜色/结构，真机矩阵后补；但**键盘态、safe-area、手势手感必须真机**，不能拿桌面模拟充数。

---

## 6. 门禁与验收标准

- `npm run check` 必须全绿（当前基线：**290 项测试 / 282 pass / 8 skipped**，颜色 raw=0，几何 225 known/0 new，`!important` 594 零增长）。
- 每期改动必须同 PR 带上：纯函数单测（若新增）+ 源码契约测试（选择器/声明/清理链）+ 文档小节。
- 新根属性必须进 `docs/architecture.md` §4.0 与 `clearAnchors` / `dispose` 清理链，并有源码契约断言（照 `test/dock.test.js` 写法）。
- 截图矩阵缺一不可：浅/深 × 底栏两态 × 键盘态 × 平板。

---

## 7. 图标与颜色规范（可执行清单）

1. **图标来源**：优先官方 `builtinIcon('Icon…', 22)`；缺库时 `strokeIcon(...)` 兜底；两者都带 `aria-hidden`。不许用 `<i>` 手绘形状。
2. **图标名必须实测**：`findstr /C:"IconXxx" app.asar`（本轮已用此法确认 `IconChevronsUpDownOutlineRegular` 存在、`--dsw-alias-bg-elevated` 不存在）。
3. **颜色只用**官方 `--dsw-*` 或自有 `--dshm-color-*`；`var(官方, 回退)` 的回退值也必须取语义正确的档位（阴影用 `--dshm-color-shadow-*`，描边用 `--dshm-color-border-*`）。
4. **设计稿 token 映射**：卡片面 `--dsw-alias-bg-layer-2`、轨道/槽 `--dsw-alias-bg-secondary`、描边 `--dsw-alias-border-l1`、主/次/弱文字 `label-primary/secondary/tertiary`、选中 `state-business-primary`、危险 `state-error-primary`、投影 `--dsw-elevation-panel`。
5. **禁止**：`--dsw-alias-bg-elevated`（不存在）、裸色、新增 `!important`、`[class*=]` 选择器。
6. 新增尺寸 token 一律走 `contracts/dshm-tokens.json` + `styles/tokens.css` + `docs/theme-tokens.md` 三方同步（`check-tokens` 会拦）。

---

## 8. 未决问题（需作者 / 用户确认）

| # | 问题 | 影响 |
|---|---|---|
| 1 | 顶部 header 容器 / 标题节点 / tab 容器的 DOM 锚点 | 阻塞 P2 |
| 2 | 「工作权限 / 模型 / 更多」的官方入口（桥 / 服务 / 指令） | 阻塞 P1 五项定稿、P4 |
| 3 | 消息列表 / 工具调用 / 代码块 / 操作行的官方 DOM 结构 | 阻塞 P3 |
| 4 | 底部卡片圆角：设计 28，现有 `--dshm-v2-radius: 20` | P1 需决定「新增档位」还是「改默认值」（改默认值会动到输入卡） |
| 5 | 把手：两条（交接文档）还是单条（设计稿） | 决定 P1 视觉锚点 |
| 6 | 深色字号 +1 的实现方式（主题 token / `prefers-color-scheme` 分支） | P3 |
| 7 | 平板是否也启用胶囊底栏 | P1/P5 矩阵 |

---

## 9. 风险登记

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 合并底栏改动 DOM 结构 → 官方重渲染打回 | 中 | 高 | 只做视觉合并 + `data-dshm-*` 幂等锚点 |
| 高度契约再次错位（键盘态白带 / 设置弹窗被盖） | 高 | 高 | 全部消费 `--dshm-v2-nav-total`；P0 截图矩阵回归 |
| 设备侧部署失败（自研引擎、无 root） | 中 | 中 | `run-as` + 备份 + `profiles.last-good` 保底 |
| 官方 token 名猜错（静默走回退） | 中 | 中 | 每个新 token 先 `findstr` 实测，并写进 `docs/preset2-progress.md` |
| 对话区改造拖慢长列表滚动 | 中 | 中 | 纯 CSS + 不加 resize observer；滚动帧率目测 + 滚动脚本验证 |
| 模拟器被其它任务占用 | 高 | 低 | 桌面 device emulation 先过样式，真机项排队 |
