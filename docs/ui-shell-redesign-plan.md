# 手机外壳改版实施计划（对照设计稿 v1 · 修订 2）

> **依据**：设计稿 `ui-final-a.png`（浅色 / 深色双联）+ 交接文档《dsh-mobile-layout 界面改版交接》
> + 本轮 AVD 实测（`Medium_Phone_API_35`，1080×2400 / 420dpi / API 35）。
> **状态**：只有第一阶段（底栏胶囊 + 把手，做成可选样式层）已合入 `main`；设计稿的四块结构性改动**尚未开始**。
> **修订 2 变更**：补「弹出层 / 衍生页影响面矩阵」（§4）、图标改为「只用现有官方图标」并给出实测映射（§2.5 / §8）、圆角单独分档（§2.3）、平板明确保持现规则（§6.3）。

---

## 0. 一句话结论

已合入的是「底栏胶囊 + 抽屉把手」的可选样式层；**设计稿主体还没做**，且已合入的胶囊在结构上与设计稿并不一致：

| 设计稿 | 当前 main |
|---|---|
| 输入区 + 导航 + 把手 = **一块**卡片 | 输入卡与胶囊是**两块**，胶囊在卡片下方 |
| 导航槽：灰底胶囊内五个键 | 无槽，五项平铺 |
| 把手是**一条** 40×4 横杠 | 把手是**两条** 1.1em 横杠 |
| 导航五项：会话 / 插件 / 工作权限 / 模型 / 更多 | 旧五项：会话 / 自动化任务 / 插件 / 工作台 / 设置 |
| 顶部**悬浮卡片头 + 居中分段控件** | 官方扁平 header + 下划线页签 |
| 对话区：工具 chip、代码块卡片、居中日期 | 官方原样（仅用户气泡已右对齐） |

> 关键前提：改底栏 / 顶栏不只是「换一块皮肤」。仓库里**有 12 处几何消费点**（底栏高度、表高、抽屉让位、菜单锚点、统计带、hero 位移）依赖 `--dshm-bar-height` / `--dshm-v2-nav` / `--dshm-header-height`。所以每一项外观改动都必须同步过 §4 的影响面矩阵，否则会出现「底栏好看了，会话表却压住半截」这类回归。

---

## 1. 设计稿拆解

### 1.1 顶部卡片头

| 元素 | 规格（按 1080×2400 换算，CSS px） | 落点 |
|---|---|---|
| 卡片 | 圆角 ≈24、左右留白 16、距状态栏 8、轻投影 | 新 token `--dshm-header-card-radius` + `--dsw-elevation-panel` |
| 卡片面 | 浅色近白 / 深色 #1a1c20 级 | `--dsw-alias-bg-layer-2` |
| 第一行 | 侧栏图标 24 + 标题 22/700 + 副标题 13 次要色 + 右侧三枚 24 图标 | `label-primary` / `label-secondary` |
| 第二行 | 居中分段控件：灰轨道（radius 22、高 ≈44、内边距 4）+ 四段 对话/轨迹/编辑器/… | 轨道 `bg-secondary`；选中胶囊 `bg-layer-2` + `state-business-primary` 文字 |

### 1.2 对话区

| 元素 | 规格 | 现状 |
|---|---|---|
| 用户消息 | 右对齐气泡、浅蓝底、圆角 20、最大宽 78%、内边距 ≈14×18 | 已右对齐，规格未校准 |
| AI 消息 | 无头像无名字；正文 0.85em、行高 1.65 | 无头像 ✓；行高未调 |
| 工具调用 | 单行 chip：`Bash · git diff --stat · 1.2s`，圆角 12、`bg-secondary` | **未做** |
| 代码块 | 独立卡片、语言标签 + 复制按钮、圆角 14、等宽 0.7em | **未做** |
| 操作行 | 复制 / 重试 / 分支 | 官方五枚（含赞踩 / 库） |
| 日期分隔 | 居中、`label-tertiary`（`今天 14:20`） | 右下时间戳 |

### 1.3 底栏（合并形态，方案 6）

| 元素 | 规格 | 落点 |
|---|---|---|
| 整块卡片 | 圆角 **28**、左右 16、下沿 10、面 `bg-layer-2`、轻投影 | **新档** `--dshm-v2-dock-radius: 28px`（仅胶囊/合并态） |
| 第一行 | 输入框（placeholder tertiary）+ 回形针 + 蓝色发送圆钮 40 | 回形针用现有 `IconPaperclipOutlineRegular` |
| 第二行导航槽 | 灰底胶囊：`bg-secondary`、圆角 22、高 ≈64、五等分 | `--dshm-v2-dock-track-radius: 22px`；高 = `calc(var(--dshm-v2-nav) + var(--dshm-v2-gutter))` |
| 导航项 | 图标 22 + 标签 10；未选中 `label-tertiary`、选中 `state-business-primary` | 复用现有 `builtinIcon(..., 22)` |
| 把手 | **一条** 40×4、radius 999、`label-tertiary` @55% | 与 `.dshm-sheet-grabber` 完全同语法；复用 `--dshm-v2-dock-handle`(44px) 作触控区 |

**圆角分档（已定）**：

| 层 | token | 值 | 说明 |
|---|---|---|---|
| 输入卡（现有） | `--dshm-v2-radius` | 20px | **不动**，避免输入卡观感漂移 |
| 胶囊 / 合并卡片 | `--dshm-v2-dock-radius` | 28px | 新增档，只服务胶囊样式 |
| 导航槽 | `--dshm-v2-dock-track-radius` | 22px | 新增档；槽内留 3px 内边距正好与卡片圆角同心 |
| 抽屉 / 底部表 | 现有（24 / 20） | — | **不扩散**新档，保持现规则 |

### 1.4 深色

同布局，正文 +1px（设计稿标注）。

### 1.5 图标映射（**只用现有图标**，零手绘）

设计稿五枚 + 第二页四枚，都能在现有官方图标集里找到对应，**不需要新造图标**：

| 设计稿项 | 官方图标（实测存在） | 来源 |
|---|---|---|
| 会话 | `IconNewChatOutlineRegular` | 现有 `NAV_ICONS.sessions` |
| 插件 | `IconPluginPinwheelOutlineRegular` | 现有 `NAV_ICONS.plugins` |
| 工作权限 | `IconShieldOutlineRegular` | 新引用（实测存在；官方无「盾+勾」变体，取盾形） |
| 模型 | `IconSparkleRegular` | 新引用（实测存在，对应设计稿四角星） |
| 更多 | `IconEllipsisOutlineRegular` | 新引用（实测存在） |
| 第二页·目标 | `IconGoalOutlineRegular` | 实测存在 |
| 第二页·计划 | `IconPlanOutlineRegular` | 实测存在 |
| 第二页·压缩 | `IconCompactOutlineRegular` | 实测存在 |
| 第二页·设置 | `IconSettingsOutlineRegular` | 现有 `NAV_ICONS.settings` |
| 第二页·返回 | `strokeIcon('M14.5 5 8 12l6.5 7')` | 现有 `ICONS.back` |
| 对话·复制 / 重试 / 分支 | `IconCopyOutlineRegular` / `IconRefreshOutlineRegular` / `IconBranchOutlineRegular` | 均实测存在 |
| 附件（回形针） | `IconPaperclipOutlineRegular` | 实测存在 |

- 全部走 `builtinIcon(name, 22)` → 缺图标库时 `strokeIcon(...)` 兜底 → 两份都带 `aria-hidden: 'true'`。
- 图标名不许按语义猜：本表每个名字都已用 `findstr /C:"<name>" app.asar` 实测（完整清单见 `.tmp-shot/icon-inventory.txt`，260 个名字）。
- 图标取证方式追加到 `docs/preset2-progress.md` 的图标取证小节（沿用既有写法）。

---

## 2. 现状实测（AVD 一帧 + 代码定位）

- **顶栏**：官方扁平 header（标题 + 圆点 / ⋯ / 面板），下方下划线式页签 → 不是卡片头，也不是分段控件。
- **对话区**：用户气泡已右对齐浅蓝；AI 正文无头像；操作行五枚图标；时间戳在右下。
- **底栏**：输入卡单独浮起；下方是**透明**底栏（plain 默认档）五枚；选中项蓝色；无把手。
- **设备侧插件版本**：`app.dsh.mobile` 1.5.0 引擎里装的是 **0.4.6**，本轮改动**从未上过设备**。
- **代码侧**：胶囊层已实现（两条根属性、`--dshm-v2-nav-total`、`--dshm-v2-dock-handle`、设置页「底栏样式」行）；合并形态 / 卡片头 / 分段控件 / 两页导航 / 对话区重排无对应代码。

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
| 7 | 用户气泡规格 | 圆角 20 / 78% / 浅蓝 | 近似未校准 | 样式级 | P3 |
| 8 | 工具调用 chip | 单行 chip | 官方卡片 | 结构级 | P3 |
| 9 | 代码块卡片 | 语言标签 + 复制 | 官方样式 | 结构级 | P3 |
| 10 | 操作行图标 | 复制/重试/分支 | 五枚（含赞踩/库） | 样式 + 语义 | P3 |
| 11 | 日期分隔 | 居中弱化 | 右下时间戳 | 样式级 | P3 |
| 12 | 深色字号 +1 | 有 | 无 | 样式级 | P3 |
| 13 | 两页导航 | 有 | 无 | 结构级 + 待确认动作 | P4 |

---

## 4. 影响面矩阵（**每期必过**）

改主外观（圆角 / 面 / 高度 / 让位）必须逐层过这张表。下表左列是**已知几何消费点**（行号取自当前 `lib/client.js`），右列是本期改动会怎么波及它、以及怎么验证。

### 4.1 依赖底栏高度的层

| 层 | 依赖 | 改动后的影响 | 验证 |
|---|---|---|---|
| 底栏行自身 | `--dshm-bar-height`（8731）、`--dshm-v2-nav-total` | 合并后总高变化 | 量 `.dshm-v2-nav` rect == token 解析值 |
| 会话表 / 底部表 `.dshm-sheet` | `inset` 与 `bottom` 用 `--dshm-bar-height`（8769、8780）、`max-height` 用 bar+header（8787） | **滞后风险**：表底仍按 56px 算，合并后会被底栏压住 | v2 下改消费 `--dshm-v2-nav-total`；截图「开会话表」 |
| 表遮罩 | 同 8769 | 遮罩底边露缝 | 同上 |
| 加号面板 `.dshm-v2-addpanel` | 55% 屏高、z 1401、底部留白 | 面板与合并底栏重叠 / 点不到 | 开面板截图 + `elementFromPoint` 抽查 |
| 设置弹窗 | `bottom: var(--dshm-v2-nav-total)`（已改）、`[data-dshm-settings-open] .dshm-v2-nav` | 设置页底部被合并卡片盖住 | 设置页截图 + 滚到底 |
| 工作台右栏（全屏） | `padding-bottom: var(--dshm-v2-nav-total)`（已改） | 最后一行被遮 | 工作台滚到底截图 |
| 面板页（插件 / 自动化 / SSH） | `[data-dshm-v2-page] [data-slot="main"]` 让位（已改） | 同 | 三个面板页各滚到底 |
| 权限 / 模型 / 工作区 三个底部弹层 | 由官方 chip 触发，锚在底栏上方 | 底栏变高 → 弹层被顶起或压住 | 三个 chip 各开一次截图 |
| 键盘态 | `[data-dshm-ime] [data-dshm-bottom] { height: 0 }` | 合并卡片在底栏行**之上**，需确认输入框仍贴键盘 | 弹键盘截图 + 量 gap |

### 4.2 依赖顶栏高度 / 锚点的层

| 层 | 依赖 | 影响 | 验证 |
|---|---|---|---|
| 顶栏菜单（`⋯`） | `--dshm-header-menu-top/right`（JS 量取，4780-4793） | 卡片头改了 header 高度 → 菜单锚点错位 | 点开菜单截图 + 量 rect |
| 统计带 | `--dshm-stats-top`（9164/9244）、`--dshm-stats-height`（9160/9170） | 卡片头下移 → 统计带压在卡片上 | 会话页截图 |
| 空态 hero | `--dshm-hero-shift`（9034） | 位移基准变 | 空会话截图 |
| 底部表 max-height | `--dshm-header-height`（8787） | 表可长高/变矮 | 长列表截图 |
| 引擎状态条 | `--dshm-engine-bar` | 卡片头顶部留白与其叠加 | 冷启动截图 |

### 4.3 圆角 / 面 / 阴影的派生影响

| 层 | 现状 | 新增 28px 档后 |
|---|---|---|
| 输入卡 | 20px（`--dshm-v2-radius`） | 不参与新档；合并态下与卡片同面，需检查**接缝圆角同心** |
| 胶囊 / 合并卡片 | 20px（借用） | 28px；与输入卡之间若留缝，缝里会露出页面底色 → 需「无缝贴合」 |
| 导航槽 | — | 22px，槽内按钮高亮时圆角不溢出 |
| 抽屉 / 底部表 / 设置弹窗 | 24 / 20 / 全屏 | **不扩散**，保持原样 |
| popover（加号 / 权限 / 模型 / 工作区） | 官方 | 不扩散 |

### 4.4 交互 / 状态派生

| 项 | 影响 |
|---|---|
| 系统返回栈 | 两页导航（P4）必须接入 `planBackStack`：第二页时返回先回第一页 |
| 焦点 | 收起/展开、切页时焦点不能落在 `display:none` 元素上（现有实现已处理收起） |
| 滚动 | 合并卡片后内容区可滚动高度变化 → 长对话滚到底不能被遮 |
| 预设切换 | 所有新根属性必须进 `clearAnchors` / `dispose`（三档双向不残留） |
| 平板 | 见 §6.3，一律不生效 |

> **交付规则**：P1 / P2 / P3 的 PR 必须附带「本期影响面自检表」：上表逐行标「已确认 / 不适用 / 待真机」，缺一行不算完成。

---

## 5. 分期计划

### P0 · 部署与验证基线（**阻塞，等模拟器空闲**）

1. `npm pack` → `adb push` → `run-as` 备份并解包覆盖 `files/dsh-home/profiles/web/node_modules/@xiaopb/dsh-mobile-layout`（不跑 npm、不联网、不动 engine 与 `android-overlay.yml`）；
2. 强停重开 `app.dsh.mobile`，`logcat` 核对 `[dsh-mobile-layout]` 与 VERSION；
3. 截图矩阵：浅/深 × 透明/胶囊 × 展开/收起 × 空态/对话；
4. CDP 断言：`dataset.dshmPreset`、`dataset.dshmDock`、`.dshm-v2-nav` 高 == token 值、`.dshm-dock-grabber` 高 ≥ 44、导航槽/选中色 == 官方 token 解析值；
5. §4.1 / §4.2 每层各截一张（这是后续每期的对照基线）；
6. 回滚演练：还原备份，确认外观回到 0.4.6。

### P1 · 底栏合并 + 新五项 + 单条把手（核心，风险最高）

- 视觉合并（不搬官方 DOM）：新增样式层 `data-dshm-merged="1"`（默认关，确认后开）；让 `[data-dshm-composer-clip]` 下沿与底栏行共享面与圆角，接缝不留缝；
- 导航槽：`.dshm-v2-nav-items` 铺 `bg-secondary`、`--dshm-v2-dock-track-radius`、内边距 4、五等分；
- 把手两条 → **一条**（40×4，删掉多余 `<span>`）；
- 五项改 会话 / 插件 / 工作权限 / 模型 / 更多（图标见 §1.5；动作入口由 task-1 决定，拿不到就不显示）；
- 圆角：新增 `--dshm-v2-dock-radius: 28px` 与 `--dshm-v2-dock-track-radius: 22px`，**不动** `--dshm-v2-radius`；
- 高度：`--dshm-v2-nav-total` 重算；同时把 §4.1 里仍按 `--dshm-bar-height` 算的层（会话表 / 遮罩 / 加号面板）在 v2 下改为消费 nav-total；
- 门禁：`npm run check` 全绿；新增源码契约（单条把手、槽圆角、五项顺序、所有新选择器带 `[data-dshm-mode="mobile"]`）。

### P2 · 顶部卡片头 + 居中分段控件

- 只做 CSS + `data-dshm-*` 锚点（锚点来自 task-1；已有 `data-dshm-viewtabs-row` / `data-dshm-header-menu*`）；
- 同步重算：顶栏菜单锚点（`--dshm-header-menu-*`）、统计带（`--dshm-stats-*`）、hero 位移、底部表 max-height；
- 验收：切页签选中态跟随、标题省略不换行、键盘不抖、深色有层次。

### P3 · 对话区重排

- 用户气泡规格校准；AI 行高；工具调用 chip（先纯 CSS 折叠）；代码块卡片（语言标签 + 复制）；操作行收敛为 复制/重试/分支（图标见 §1.5）；日期分隔；深色字号 +1；
- 约束：纯 CSS + 锚点，不为每条消息加 observer；代码块横滚不撑破；
- 验收：长对话滚动流畅、chip 展开不跳位。

### P4 · 两页导航

- 第二页：目标 / 计划 / 压缩 / 设置 / 返回（图标见 §1.5；动作入口由 task-1 确认，拿不到就不显示）；
- 页状态挂根属性（`data-dshm-nav-page="2"`），CSS 驱动；系统返回先回第一页（接入返回栈）；切预设 / dispose 清理；两页同高不跳位。

### P5 · 矩阵验收 + 文档 + 发版

- 机型：`Medium_Phone_API_35`（主）+ `Pixel_Tablet_API_35`（平板像素不变回归，见 §6.3）；
- 矩阵：浅/深 × 空态/对话/工具/代码块 × 设置页/面板页/工作台/键盘态/收起态/各弹出层；
- 文档：`docs/preset-v2.md` 换图 + 速查补行；`docs/technical-notes.md` 记新坑；`CHANGELOG` 版本段。

---

## 6. AVD 验证方案（**本轮不动模拟器**，等通知）

### 6.1 已勘明的环境事实

| 项 | 值 |
|---|---|
| 设备 | `emulator-5554`（`Medium_Phone_API_35`，1080×2400 @420dpi，API 35）；实体机 `71415fa9` |
| adb | `E:\Android\Sdk\platform-tools\adb.exe`（不在 PATH，用全路径） |
| App | `app.dsh.mobile` 1.5.0（debug，`run-as` 可用；`adb root` 不可用） |
| 引擎 | 设备内置：`/data/user/0/app.dsh.mobile/files/engine`，`node bin.js web --patch …/dsh-hardssh/cordis.patch.yml --patch …/android-overlay.yml --no-open` |
| 端口 | 设备侧 `127.0.0.1:3080`，WebView 从该端口载入插件包 |
| 安装位 | `files/dsh-home/profiles/web/node_modules/@xiaopb/dsh-mobile-layout`（当前 0.4.6） |
| 回滚素材 | `profiles.last-good`、`profiles.before-rollback`（**只读不写**） |
| 调试通道 | `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` → CDP 读 `window.__dshmCompat` / 根属性 / computedStyle |

### 6.2 验收执行顺序

1. 备份 → 部署 → 强停重开 → `logcat` 核版本；
2. 截图脚本 `screencap` → `pull` → 按 `docs/assets/screens/preset-v2/` 命名；
3. CDP 断言（同上）；
4. 键盘态：点输入框后确认 `[data-dshm-ime]` 下 `[data-dshm-bottom]` 高 = 0 且输入框贴键盘；
5. 每期按 §4 影响面矩阵逐层截图，缺层不算通过。

### 6.3 平板保持现规则（已定）

- 现规则：`phone` 几何才进 mobile（`isPhoneForm`），平板走原生预设 → 不生效；
- 新增样式层的所有选择器**必须**带 `html[data-dshm-mode="mobile"]`（P1 加源码契约断言锁这条）；
- 回归：`Pixel_Tablet_API_35` 上跑同一份截图脚本，与改动前逐像素 diff，**必须完全一致**；
- 平板不启用胶囊 / 合并 / 卡片头 / 两页导航。

---

## 7. 门禁与验收标准

- `npm run check` 全绿（基线：**290 项 / 282 pass / 8 skipped**，颜色 raw=0，几何 225 known/0 new，`!important` 594 零增长）。
- 每期同 PR 带：纯函数单测（若有）+ 源码契约测试 + 文档小节；新根属性进 `clearAnchors` / `dispose`。
- 新 token 走 `contracts/dshm-tokens.json` + `styles/tokens.css` + `docs/theme-tokens.md` 三方同步。
- 本期影响面自检表（§4）随 PR 提交。

---

## 8. 图标与颜色规范（可执行清单）

1. **图标来源优先级**：现有官方图标（`builtinIcon('Icon…', 22)`）→ 现有 `strokeIcon(...)` 自绘兜底 → 都不行才考虑新增；**禁止** `<i>` 手绘。
2. **图标名必须实测**：`findstr /C:"IconXxx" app.asar`；260 个官方图标名清单已导出到 `.tmp-shot/icon-inventory.txt`，新名字先查表。
3. **颜色只用**官方 `--dsw-*` 或自有 `--dshm-color-*`；回退值取语义正确档位（阴影 `--dshm-color-shadow-*`、描边 `--dshm-color-border-*`）。
4. **设计稿 token 映射**：卡片面 `bg-layer-2`、槽 `bg-secondary`、描边 `border-l1`、主/次/弱文字 `label-primary/secondary/tertiary`、选中 `state-business-primary`、危险 `state-error-primary`、投影 `elevation-panel`。
5. **禁止**：`--dsw-alias-bg-elevated`（实测不存在）、裸色、新增 `!important`、`[class*=]` 选择器。

---

## 9. 已定决策与未决问题

### 9.1 已定（本轮确认）

| # | 决策 |
|---|---|
| 1 | 把手以**设计稿为准**：单条 40×4 |
| 2 | 圆角**单独一档**：`--dshm-v2-dock-radius: 28px`（+ 槽 22px），不改 `--dshm-v2-radius: 20px` |
| 3 | 平板**保持现规则**：不启用手机布局与任何新样式层，并做像素不变回归 |
| 4 | 图标**优先用现有**：§1.5 映射表全部为实测存在的官方图标，零手绘 |
| 5 | 主外观改动必须同步评估弹出层 / 衍生页（§4 矩阵，每期随 PR 自检） |

### 9.2 未决（需作者 / 用户确认，task-1 负责回填）

| # | 问题 | 阻塞 |
|---|---|---|
| 1 | 顶部 header 容器 / 标题节点 / tab 容器的 DOM 锚点 | P2 |
| 2 | 「工作权限 / 模型 / 更多」的官方入口（桥 / 服务 / 指令） | P1 五项定稿 |
| 3 | 消息列表 / 工具调用 / 代码块 / 操作行 的官方 DOM 结构 | P3 |
| 4 | 「目标 / 计划 / 压缩」的官方入口（`IconGoalOutlineRegular` 等图标已就绪，差动作） | P4 |
| 5 | 深色字号 +1 的实现（主题 token / 媒体查询分支） | P3 |

---

## 10. 风险登记

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| **弹出层滞后**：底栏变高但会话表/遮罩/加号面板仍按 56px 算 | 高 | 高 | §4.1 逐行改造 + 每层截图；P1 必须一次改完 |
| 合并底栏改 DOM → 官方重渲染打回 | 中 | 高 | 只做视觉合并 + `data-dshm-*` 幂等锚点 |
| 圆角 28 与既有 20/24 体系并存导致接缝错位 | 中 | 中 | 新档只服务胶囊；接缝处同心检查（截图放大） |
| 顶栏卡片头改高 → 菜单锚点 / 统计带 / hero 全错位 | 高 | 中 | P2 同步重算三个 JS 量取值 + 截图对照 |
| 平板被误伤 | 低 | 高 | 选择器强制 `[data-dshm-mode="mobile"]` + 平板像素 diff |
| 设备侧部署失败（自研引擎、无 root） | 中 | 中 | `run-as` + 备份 + `profiles.last-good` 保底 |
| 官方 token / 图标名猜错（静默走回退） | 中 | 中 | 先 `findstr` 实测再写；结论记进 `docs/preset2-progress.md` |
| 对话区改造拖慢长列表滚动 | 中 | 中 | 纯 CSS、不加 observer；滚动目测 + 脚本验证 |
| 模拟器被其它任务占用 | 高 | 低 | 桌面 device emulation 先过样式；真机项排队 |

---

## 11. 修订 3（2026-11-09）：当前情况与全部待办方案

> 本节是**执行现状**，§1–§10 仍是设计口径。已合入 main 的三个提交：`32563dc`（底栏合并 + 按页换项 + 输入区收纳）、`69d3aa0`（回形针）、`48e9b06`（弹层锚点修复尝试 + 一行输入回滚）。门禁：`npm run check` 299 项 / 291 pass / 0 fail。

### 11.1 已落地并 AVD 实测通过

| 能力 | 证据 | 备注 |
|---|---|---|
| 底栏与输入卡合并成一块卡片 | 实拍：圆角卡片从输入行贯通到把手；`[data-composer-card]` 圆角 = `28 28 0 0` | 接缝靠「卡片只留上圆角 + 底栏只留下圆角」，底栏用 `clip-path` 裁掉上沿阴影 |
| 灰底导航槽 + 单条把手 | `track` 429×64；`grabber` 高 44、单条 40×4 | 与 `.dshm-sheet-grabber` 同语法 |
| 五项：会话/插件/工作权限/模型/更多 | 官方图标实测存在 | `IconShield / IconSparkle / IconEllipsis` 等 |
| 按页换项 | 面板块实测 `[sessions, plugins, settings, automation, workbench]` | 权限/模型只在会话页；其他页由「更多」项补位，恒五格 |
| 危险权限标红 | 实拍「工作权限」整项红色 | 根属性 `data-dshm-perm-alert`，切形态自动摘 |
| 回形针 + 两项小菜单 | 实拍：`⊕ 回形针 发送`；菜单 `["图片","文件"]` | 注入式按钮（幂等重挂）+ 自建 `input[type=file]` → `injectOfficialFiles` |
| 圆角分档 / 无新增 `!important` | `dock-radius 28` / `track-radius 22` / 输入卡 20 不动；`!important` 594 → 594 | 卡片上下圆角改成变量 `--dshm-v2-card-radius*` |

### 11.2 待修（按优先级）

**A. 权限/模型弹层跑到屏幕顶部（task-9）**

- 根因：胶囊态把两枚 chip `display:none`，官方弹层锚在 0×0 的锚点上 → 出现位置在状态栏下方；改内层 `listbox` 的 `bottom` 无效（它是 `static`），真正的定位层在祖先链上。
- 方案 A1（推荐，改动最小）：**不再隐藏 chip**，改成 `opacity: 0; pointer-events: none;`（保留原位置与尺寸）→ 官方弹层天然锚在输入行上方；再用一次 JS 微调把 `bottom` 抬到 `nav-total + 8px`、`left` 对齐到所点底栏项。
- 方案 A2：保留 `display:none`，点击后沿祖先链找 `position≠static` 的层，直接改 `bottom`/`left`（本轮已写，未复验）。
- 验收：点两项，弹层紧贴底栏上方 8px、左右对齐所点项；点空白可关；断言「弹层底边 ≤ 底栏上沿 − 4px」。

**B. 输入行合成一行（task-8）：`[(输入) ⊕ 回形针 发送]`**

- 已踩坑：`flex-direction: row` 会让官方 `overlayAnchor`（441px 宽、0 高）吃掉整行，把工具行挤出卡片（实拍），已回滚。
- 方案 B1（推荐，纯视觉）：保持卡片纵向 flex，用 `margin-top: calc(-1 * var(--dshm-input-row-h))` + `align-self: flex-end` 把工具行上提到输入行同一基线，输入行加 `padding-right` 让位。
- 方案 B2：只让 `[data-dshm-input-row]` 与 `[data-dshm-tools-row]` 参与横排，overlayAnchor 等 0 高兄弟节点改 `position:absolute; width:0`（须验证弹层锚点不受影响——与 A 是同一个坑）。
- 验收：四个元素同一行垂直居中；多行输入时自动长高、按钮贴底；键盘态不跳位。

**C. 顶部卡片头 + 居中分段控件（task-4）**

- 已查清阻塞：官方 `[data-dshm-viewtabs-row]` 实测 **769px 宽**（视口 457），在横向可滚容器里 → 纯 CSS 居中会把内容推出屏外。
- 方案 C1（已获授权，推荐）：直接干预 —— 给 ViewTabs 的外层容器打锚点并 `width: 100%; overflow: hidden`，把 row 的 `flex` 约束回 100%，再套「灰轨道 + 白胶囊」；header 本体打 `data-dshm-header-card` 做卡片化。
- 方案 C2：在 header 内重注入一个自绘容器承载 tab 列表（更大改动，需把点击转发回官方 tab；不推荐）。
- 必须同步复核：`--dshm-header-menu-top/right`（JS 量取）、`--dshm-stats-top`（按 header.bottom 量取，会自动跟随）、底部表 `max-height`。
- 验收：分段控件真正居中不溢出、切页签选中跟随、标题省略、菜单锚点正确、统计带不压卡片。

**D. 弹层让位回归（task-7）**：会话表 `inset/bottom`、表遮罩、加号面板底边仍按 `--dshm-bar-height`（56px）算；胶囊态底栏 122px → 需要改成 `--dshm-v2-nav-total` 并逐层截图。

**E. 对话区重排（task-5，最后做）**：用户气泡规格、工具调用 chip、代码块卡片、操作行图标（`IconCopy/IconRefresh/IconBranch`）、居中日期分隔、深色字号 +1。

### 11.3 验证口径（本轮已建立，后续沿用）

1. 部署：`.tmp-shot/deploy.ps1`（npm pack → push → `run-as` 解包 → 强停重开 → 等 `data-dshm-preset` 出现）。
2. 断言：`.tmp-shot/cdp.mjs @表达式文件`（`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`）；表达式写文件避免 PowerShell 引号踩坑。
3. 截图：`screencap` → `.tmp-shot/avd/`；矩阵 = 浅/深 × 会话/面板/设置 × 展开/收起/键盘。
4. 平板：`Pixel_Tablet_API_35` 跑同一脚本，与改动前逐像素 diff，必须完全一致。
5. 门禁：每个可交付点跑 `npm run check`；新增选择器必须带 `html[data-dshm-mode="mobile"]`；新增 `--dshm-*` 走三方同步。

### 11.4 需要确认

1. **A 方案**用「chip 保留原位但透明」（A1）是否可接受？它会牺牲「chips 视觉上收进底栏」这一点（chip 仍占据布局位置，只是看不见）——但弹层锚点最稳。
2. **B 方案**用「负 margin 视觉上提」（B1）是否可接受？它不改 flex 方向，风险最小，但多行输入时工具行会跟着走。
3. **C 方案**允许我改官方 header 内部容器的宽度（C1）吗？这是本轮唯一「直接干预原生布局」的地方。
4. 平板 `Pixel_Tablet_API_35` 这轮是否也要跑一遍像素 diff（需要额外一轮部署 + 截图）？

### 11.4 修订 4（2026-11-09 深夜）：胶囊形态收口

本轮把「胶囊形态」从骨架做到可用，逐项 AVD 实测：

| 项 | 状态 | 实测口径 |
|---|---|---|
| 顶部卡片头 | 完成 | 标题行 44 / 页签带 52 / 统计带 26；卡片左右 24px 内缩；标题贴近左侧按键 |
| 居中分段控件 | 完成 | 官方页签行**尺寸不变**（25px，仅透明化），自绘控件叠在预留带上：seg 48px，末尾「⋯」，点击转发官方 |
| 统计带并入卡片 | 完成 | 透明底 + 左右 8px，落于卡片内部 |
| 输入区一行 | 完成 | `[输入 ⊕ 回形针 发送]`：官方工具行 0 高，自绘动作行 44px 按钮 / 24px 图标 |
| 回形针菜单 | 完成 | 与权限菜单同款（36px 行、白面、14 圆角），以按钮为中心、两侧 ≥12px |
| 底栏胶囊 | 完成 | 灰槽 + 五项 + 18px 把手 + 两侧「权限 / 模型」只读文案 |
| 权限档位 | 完成 | 图标从权限菜单克隆；完全访问整项标红 |
| 弹层定位 | 完成 | 抬到「输入卡之上」：menu 684..794 vs card 802..866（零重叠）；子菜单 700..790 同 |
| 平板不变 | 完成（静态+单测） | 64/64 平板相关单测；胶囊选择器全部带 mobile 前缀 |

**仍未完成（明确列出）**：

1. 对话区剩余：工具调用 chip、操作行图标、居中日期 —— 需要一条带工具调用的消息做样本；
2. 真实软键盘点按（模拟态已验证：底栏 0 高、输入卡贴底）；
3. 浅/深截图矩阵（深色需切系统主题）、真实平板 AVD 像素 diff；
4. 菜单「先高后缩」的加载态收敛（子菜单已能即时渲染，跳动是否仍存在需目视确认）。

**调试工具**：`localStorage['dshm-debug'] = '1'` 后，弹层定位会在屏幕中央打印节点链与几何数据（本轮靠它定位到 `--dshm-v2-nav-total` 读到 0 的问题）。
