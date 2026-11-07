# 更新日志

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.4.8] - 2026-11-07

0.2.2-rc.1 第二轮适配修复（审计报告：`.workbuddy/plan/audit-022rc1-fix-plan.md`）+ 平板宽屏侧栏手势。

### 修复

- **悬浮 / 融合预设点「设置」打不开**。`openSettings()` 重试梯子在「展开抽屉」一组之后就放弃，永远不会补点账号菜单，而抽屉关闭时账号菜单按钮在 inert 容器里点击无效、旧「更多操作」入口在 0.2.2-rc.1 已不存在。入口链重排为「关着先开抽屉 → 点账号菜单 → 更多操作兜底 → 收口补刀」，实测设置页 1s 内打开（旧版永不）。
- **设置页内容贴边且整页不可滚**（三预设通用）。0.2.2-rc.1 经 `SlotOutlet` 给官方 options 内层包装渲染内联 `display:contents`（无盒），「最高子元素 = 滚动容器」启发式把滚动标打在空元素上：插件内边距落空（贴边）、真滚动容器被强制 `overflow:hidden`（内容 1215px > 视口 711px，下半页够不着）。`tagSettingsContent()` 现在跳过 `display:contents` 子元素、对旧标去重，全部无实体时把 content 本体当滚动区；content 的清边距 / 锁溢出规则改为 `:not([data-dshm-settings-scroll])` 让位。实测三预设内容区留白 16px 且可滚到底。
- **原生预设左缘右滑不开抽屉**。`bindDrawerGesture` 的 `mode !== MODE_MOBILE` 门禁把原生预设（`mode` 恒 `default`）整个排除。新判据 `gestureEligible()` = mobile 模式或手机竖屏几何；实测原生预设右滑开、左滑收均正常。同门禁的 `applyDrawerDecision` 复核一并放宽。
- **统计状态带没有移到顶部、「更多」弹层悬空**。官方 0.2.2-rc.1 给 `composerSeat` 写了 `will-change:transform`，使其成为 fixed 后代的包含块，插件固定定位的统计带与弹层全部锚到 seat（统计带停在底部 y=903、弹层与底栏间空 202px）。新增 `html[data-dshm-form="phone"] [class*="composerSeat"] { will-change: auto !important; }`，实测统计带回顶部、弹层贴回底栏上沿。
- **「更多」偶发点了没反应**。官方 ⊕ 按钮随页面切换重挂时（工作台返回后 composer 短暂缺位），`openOfficialAddMenu()` 找不到按钮即静默放弃。现在 160ms × 5 次有限重试，仍失败才告警；后一次点击会取消前一次的待重试链，避免链间互斥打架。
- **设置页顶部多出两行杂项**（三预设通用）：品牌行下悬着一条被裁切的「设置」标题行、页签行与内容区之间插着一条静态「打开配置文件 / ✕」工具行。0.2.2-rc.1 把两者都从 `nav` / `content` 内部挪成了面板直接子元素，旧打标循环够不着。`tagSettings()` 现在在面板层补扫：无交互元素的短文本节点打 `title` 标隐藏，带关闭按钮的行打 `head` 标叠到品牌行右侧；内容区上移约 85px。顺带 `data-dshm-settings-close` 在三预设都能正向打标，返回箭头 / 系统返回关页不再依赖兜底查找。
- **悬浮预设「自动化任务」键无作用**。0.2.2-rc.1 的 `data-slot="sidebar"` 列是抽屉**遮罩**（drawerMask），按钮所在的内容列（sidebarCol）是它的兄弟节点——`automationEntry()` 在遮罩里搜按钮永远搜不到，静默失效。改为全文档按 aria-label 搜索（排除插件自己的底栏键防递归），并顺手在点击前后解除 / 恢复抽屉列 inert 作保险。
- **悬浮预设点「设置」会先滑出抽屉再开设置**。0.2.2-rc.1 抽屉收起时官方给内容列置 inert，账号菜单的弹层类点击无效，旧链只能先 `requestDrawer(true)` 再点。现在改为**临时解除抽屉列 inert → 点账号菜单 → 恢复**：全程抽屉保持收起、无闪动（实测设置页 ~350ms 打开，inert 在 ~700ms 恢复）；「展开抽屉」降级为老宿主的最后一组兜底。恢复函数提到闭包级共享——重试链跨多次 `openSettings()` 调用，局部变量会让组 0 的解锁记录随调用返回丢失、抽屉永不恢复。
- **悬浮预设「工作台」从面板页切换时固定 140ms 人为延迟**。改为轮询面板卸载（40ms 步进、上限 360ms），React 一两帧内卸载完成即立刻开右栏，实测能省约 100ms。另实测插件 / 工作台面板的本体打开耗时 140~720ms（首次含官方异步数据加载），控制链路本身无附加延迟。

### 变更

- **平板宽屏（wide 形态）启用侧栏滑动开合手势**。宽屏原生页没有抽屉语义：侧栏是常驻列、收起后变窄条 rail，新增纯函数 `decideWideSidebarSwipe()` 走阈值触发（无跟手——收起会推动整个主内容列，跟手必抖），动画交给官方过渡。手势语义与手机抽屉对齐，**起手区统一为视口左半边**：展开态左半边任意位置左滑收起、收起态左半边任意位置右滑展开（窄条只有 ~64px，把起手限制在侧栏列 / 窄条上不符合实际操作手法）；展开态右滑 / 收起态左滑 / 右半边起手一律让路。`gestureEligible()` 放宽到宽屏（仅 android / web 宿主，桌面鼠标拖拽不启用），手机分支（抽屉跟手 / 设置页退出 / 工作台退出）在宽屏不参与，宽屏设置页（官方两列弹窗）也无左滑退出语义。**官方模态弹窗在屏时手势整轮放弃**（`data-shortcut-modal` / `role=dialog[aria-modal]` 拦截，不隔着弹窗开关被遮住的侧栏）。平板三预设实测均为原生页（`data-dshm-mode` 不写、无插件底栏 / v2 导航），手势十项用例（左半边多点开 / 收 / 双向反例 / 右半边反例 / 弹窗拦截与恢复 / 复测）全部通过。开发中发现并修复判定结果误用真值判断的问题：`'none'` 是非空字符串、恒为真，导致任何被拒绝的滑动都被当成「收起」执行——表现为「只能滑关、不能滑开」。
- 诊断对象 `window.__dshmCompat` 新增 `settingsPathNote`：`'awaiting-slot'` 表示 slot 可用但设置页尚未打开过（slot 懒挂载，冷启动宽限期后报 legacy 属正常路径），与引擎真降级区分。
- 版本锁单测改为「`VERSION` 与 `package.json` 一致」的动态断言，不再写死具体版本号（每次 bump 都要改测试）。

### 验证

- `npm run check` 全绿：语法检查 → **222 项单测（0 失败）** → 包清单 / bundle 契约（含 `VERSION` 0.4.8 一致性）→ 硬编码守卫。新增 `decideWideSidebarSwipe()` 的 6 项判定用例（左半边两方向、右半边反例、反方向、竖滑 / 阈值 / 让路、非法输入）。
- 平板 AVD（`Pixel_Tablet_API_35`，1280×752）CDP 真实触摸十项用例全部通过：左半边多点开 / 收、右半边反例、边界 `startX=640`、伪模态弹窗拦截与移除恢复、双向反例与复测；三预设逐一确认宽屏均为官方原生页。手机 AVD（`Medium_Phone_API_35`）部署同版回归正常。
- 平板 AVD 配置由 4 核 / 2GB / 堆 192MB 提到 8 核 / 4GB / 堆 336MB 后冷启动复测：掉帧率 81.8% → 26.4%、p95 帧耗时 150ms → 46ms，确认此前的卡顿是 CPU / 内存配额而非 GPU。

### 文档

- `README.md` / `README.en.md` 同步到 0.4.8：标题与定位补平板形态、新增「平板宽屏侧栏手势」能力条目、修正原生预设设置页的过时描述（0.4.7 起为全屏而非悬浮窗）、版本适配矩阵加 0.4.8 行并把反向速查改为 ≥ 0.4.8、单测数 216 → 222、新增「0.4.8 变更要点」。
- `docs/technical-notes.md` §3.15 取证表补 `v0.4.8` 行；新增 §3.16 记录宽屏手势的形态前提、判据表、弹窗拦截边界、`'none'` 真值陷阱与多设备 CDP 端口乌龙。
- `docs/preset-default.md` 的设置页截图说明同步到重拍后的全屏实拍（移除「图为历史悬浮窗」注记），`docs/assets/screens/preset-default/settings.png` 已替换为 0.2.2-rc.1 上的当前形态（P2 修复后、无头部杂行）。

### 已知限制

- 抽屉展开时按系统返回键不会收起抽屉，属手机形态返回栈专项（需 Android 壳配合），不在本次范围。
- 引擎启动期底栏约 2 秒挂载延迟属 WebView 启动链路本身，插件侧无解；真机（Redmi K70）上不明显。

## [0.4.7] - 2026-11-07

### 适配

- **兼容 DSH 引擎 `@deepseek-ai/dsh-client-ui-layout 0.2.2-rc.1`**（Android App 1.5.0 / BUILD `2026.11.06-4566c0be`）。`package.json` 的 `dsh.compatibility.dshReleases` 登记该版本，并新增 `capabilities` 声明（slots / services / `dialogContract`）。
- **配置入口优先走官方 slot**：布局模式选择器注册到 `settings.general.item`（`id: 'dshm-layout'`、`order: 10.5`），落在官方「外观」与「字号大小」之间；旧版 DOM 注入保留为 `legacy` 降级路径。
- **设置弹窗按官方稳定契约正向识别**：`[data-shortcut-modal="settings"]` 是真设置页，`sidebar` / `shortcut-edit` 一律排除；不再用 `role=dialog + nav + 文案` 启发式，避免把 0.2.2-rc.1 的独立抽屉 dialog 误标成设置页。缓存复用前经 `stillMatchesSettings()` 复查，误标由 `pruneSettingsTags()` 自愈。
- **锚点优先 `data-slot`**：`sidebar` / `main` 先按官方 slot 属性定位，位置推断只作兜底。
- **`data-dshm-form` 首帧无条件写入**：宽屏从启动即为 `wide`（此前属性根本不存在），修复所有依赖该属性的 CSS 判据。
- **能力探测与三态降级**：只读诊断对象 `window.__dshmCompat` + `native` / `legacy` / `safe` 三态；未知引擎自动降级，探测失败只 `console.warn`、绝不影响启动。回滚开关：`localStorage['dshm-compat'] = 'legacy' | 'safe'`、`localStorage['dshm-settings-slot'] = 'off'`。

### 修复

- **原生预设设置页严重布局异常**（0.2.2-rc.1 上实测：浮动小窗 + 大片灰色遮罩 + 标题/页签右端裁切 + 内容底部截断）。根因是 0.4.6 给原生预设单独做的「悬浮窗重排」CSS（12/24px 边距）与 `hardenSettings()` 内联 `!important` 几何，官方换变体后把面板钉死。**三个预设统一为手机全屏设置页**（全屏 CSS 作用域从 `data-dshm-mode="mobile"` 改为 `data-dshm-form="phone"`），品牌行与返回键在原生预设下也保留；旧悬浮窗实现保留在源码里，把 `SETTINGS_UNIFIED_FULLSCREEN` 置 `false` 可一键回滚。
- **设置页关不掉**（返回箭头 / 系统返回 / Esc / 左滑手势四条路径同时失效）。0.2.2-rc.1 把「打开配置文件 / ✕」工具行移出了内容区，旧 `tagSettings()` 只在 `content.children` 里找工具行，于是 `data-dshm-settings-close` 永不打标。`closeSettingsImmediate()` 增加按 `[data-shortcut-modal="settings"]` 正向查找官方关闭按钮的兜底。

### 验证

- `npm run check` 全绿：语法检查 → 216 项单测（0 失败）→ 包清单 / bundle 契约 → 硬编码守卫。新增 `test/compat-contract.test.js` 覆盖弹窗分类、缓存复查、slot 路径选择、能力归一化与源码契约。
- 两台 AVD（手机 `Medium_Phone_API_35` / 平板 `Pixel_Tablet_API_35`，App 1.5.0）CDP + 截图验收：三预设冷启动与设置页内热切换、设置页几何（全屏 `0,0` 覆盖视口；悬浮预设底部按设计留 56px 导航）、五个页签逐页可达、返回箭头与系统返回键、侧边栏抽屉、附件入口向上弹出、深浅主题、中英语言往返、slot 路径与抽屉误标计数全部通过；平板宽屏保持官方两列弹窗，不受手机全屏规则影响。

### 文档

- 发版后补充**版本适配矩阵**：`README.md` / `README.en.md` 各新增「插件版本 → 适配的 DSH 版本」与「DSH 版本 → 建议插件版本」两张表；`docs/technical-notes.md` §3.15 记录逐标签取证（`engines.dsh` / `dshReleases` / `capabilities`）与「能装上 ≠ 已适配」的口径差异。仅文档变更，不涉及 0.4.7 产物代码；npm 包内 README 为发布时快照。

### 已知限制

- 抽屉展开时按系统返回键不会收起抽屉（WebView 历史与官方抽屉状态分离），属 `back-stack-mobile-plan.md` 的手机形态返回栈专项，需 Android 壳侧配合，不在本次改动范围。

## [0.4.6] - 2026-11-06

### 新增

- **原生预设的输入行「附件」快捷入口**：官方 composer 工具行左侧多一枚**回形针按钮**（位置在官方 ⊕ 与权限 chip 之后、模型 chip 之前），点开就会在按钮**上方就近弹出**两项菜单——「选择图片」/「选择文件」，选完仍由官方完成校验、上传与缩略图。
  - 落点是官方给第三方插件留的 list slot `conversation.input.left`（声明 `kind:list` / `scope:session`，`replaceRisk: none`），**不往 `div.tools` 插 DOM**，因此不与 React 协调打架。
  - 复用既有「自建 input → `injectOfficialFiles` → 官方 `intakeFiles`」链路（与底部六键同一套），上传、大小/数量校验、错误 toast 全部归官方，插件不重复提示。
  - 菜单关闭有三条途径：再点一次按钮、点菜单以外任何位置、按 Esc；展开前先 `blur()` 输入框，避免菜单与软键盘同屏。
  - 生效范围：**App 内（Android 壳）一律显示**——手机 / 平板、横竖屏、全屏 / 小窗都不再区分；桌面宿主在**注册这一层**就跳过（不是「注册后返回 null」），避免 list slot 留下空容器破坏「原生零侵入」；`web` 浏览器仍按手机竖屏几何兜，桌面浏览器不多出按钮。
- 新增 `ICONS.attach`（回形针线性图标，与底部六键同一套 1.7 描边）。
- 新增纯函数 `quickPickVisible(preset, host, phone)` 并导出到 `__test`；`test/quick-pick.test.js` 覆盖 10 例（预设 × 宿主 × 形态、`isPhoneForm` 的桌面优先 / 平板全屏边界）。

### 修复

- **平板（横屏 / 全屏）看不到附件入口**。两个根因叠加：① 可见性判据原本只看 `state.phone`，而它是 `isPhoneForm()` 的结论——要求**竖屏 + 短边 ≤ 600 + 长宽比 ≥ 1.25**，平板全屏 1280×752 横屏、短边 752，两条都不满足，slot 注册成功但组件直接返回 `null`；② 样式作用域原本写成 `html[data-dshm-form="phone"]…`，而 `applyFormAttr()` 只在 `state.phone` **发生变化**时才写属性——平板从启动起就是 `false`、从未变化，属性压根不存在，即使渲染出来也拿不到任何样式。现在作用域只认 `data-dshm-preset="default"`，与 DOM 存在与否解耦，并用 `.dshm-quick.dshm-quick` 把特异性抬回原水位。
- 按钮尺寸上限从 `30px` 收到 `28px`，与官方 ⊕ 完全一致（平板 1280 宽时 `7vw` 早已顶到上限）。

### 变更

- 底部六键的「文件 / 图片」回流逻辑抽成模块级 `onPickedFiles()`，与新的附件入口共用一处 `value` 清空与上报逻辑（行为不变，仍先收浮层再交给官方）。

### 兼容

- 融合 / 悬浮预设零改动（它们各自已有底部六键 / 加号面板入口）；桌面端保持官方原样，DOM 里不新增任何节点。
- 插件的默认预设仍为「融合」，原生预设的附件入口只在用户切到原生后出现。

## [0.4.5] - 2026-11-06

### 修复

- **手机形态按系统返回键直接退出到桌面，而不是回上一级**。三层根因：① 宿主 `layout.selectPanel()` 只改 `panelInfo.activePanelId`、不写浏览器历史，插件页 / 自动化任务 / SSH 工作区这类整页界面在 WebView 历史里完全没有痕迹；② Android 壳 `onBackPressed()` 是 `canGoBack() ? goBack() : finish()`，没有条目就直接结束 Activity；③ 插件这边只有「浮层可见 ⇒ 压一条 history」的单布尔模型，`panelActive` 根本没纳入。改为**三层返回栈**（base / page / overlay）：页面层只认宿主通用字段 `panelInfo.activePanelId`（不枚举具体 id，其它插件经 `main` keyed slot 注册的页面同样命中），关闭走通用的 `layout.selectPanel(null)`；浮层层沿用原有逐层顺序。一次返回只退一层，栈顶永远是浮层。
- **面板页 + 设置页叠加时第二次返回仍然退出**。旧模型把页面态和浮层挤在同一个布尔里，第一次收浮层、第二次没有条目可退。三层栈给页面态单独一条，`S5`（面板 + 设置连按两次）现在逐层退干净。
- **内部返回会「重新加载一下」**。根因是壳无条件相信 `canGoBack()`：WebView 历史里混着跨文档条目时，`goBack()` 退到上一份文档就是整页重载。插件改为按「自己压了几条同文档条目」经 `DshAndroidBack.setState({mobile, consumable, depth})` 上报，壳只在 `mobile && consumable && canGoBack()` 时才 `goBack()`；条目 state 带 `dshm` 标记，无标记条目一律不猜测着关 UI。
- **会话页按返回直接退出、没有防误触**。壳侧改为「首次轻提示 + 2 秒内再按才退出」，提示走新增 `R.string.back_exit_hint`（五语言同步）。
- **按返回键关不掉工作台（右侧边栏）**。Android 窄屏下右栏是官方自己的**浮层**形态：`[data-sidebar-right-panel]` 挂上 `data-sidebar-right-open` 后是 `position:fixed; inset:0`，而 `layout.closeRightbar()` 只把列折叠成 0 宽，浮层标记没撤销 → 面板继续全屏盖住会话页；同时 `[data-rightbar-fullscreen]` 已经消失，返回栈随之归零，用户再按返回只能退出 App。改为优先点官方「收起右侧边栏」（按 `aria-label` 词根在右栏子树里找，避开「退出全屏」「分栏」），点不到才退回 `closeRightbar()`；返回目标的右栏判据补上窄屏浮层标记，覆盖两个状态短暂不同步的中间态。
- **会话视图页签过早收进「⋯ 更多会话视图」**。官方 `ConversationSessionHeader` 用 `visibleViewLimit = max(1, floor((row.clientWidth - 48) / 120))` 决定几个视图能直接露出标题，120px/个 的口径与实测页签间距（58px）差一倍多：手机 CSS 宽 392 时只算出 2 个，「编辑器」（由 `@xiaopb/dsh-solution-explorer` 经 `conversation.view` 槽提供）明明放得下也被折叠。公式只读 `row.clientWidth`，插件改不动它，改为给页签行打 `data-dshm-viewtabs-row` 并补一段不可见横向余量（`--dshm-viewtabs-extra`，默认 360px），名额随之从 2 升到 5；内容仍左对齐、行尾多出来的是空白，溢出的那截由中心列 `overflow-x: clip` 吃掉，实测 `scrollWidth === innerWidth` 无横向滚动。

### 新增

- **开放返回契约 `window.__dshmBack`**：任何插件都能 `register({ id, priority, kind, isActive, close })`，按返回时按优先级逆序询问，第一个 `close()` 返回 `true` 的独占本次返回 —— 对齐 Android `OnBackPressedDispatcher` 的「按注册逆序、谁使能谁消费」模型。其它插件新增的浮层、portal 型全屏界面、页内二级页因此都能自己接管返回，本插件不需要认识它们的 id。
- **通用浮层发现**：`[role="dialog"][aria-modal="true"]` / `[role="alertdialog"]` / `[data-dshm-back-layer]` 也会压一条 overlay 条目（用尺寸、`visibility`、`data-dshm-ignore-back` 三重过滤）。没有注册者时尝试「找关闭按钮 / 派发 Esc」，收不掉也会回会话页，**不会直接退出应用**。
- 底栏页面高亮新增 `unknown-page` 兜底：其它插件注册的 `main` 面板不再被误判成「会话页」（只影响高亮，不参与返回栈决策）。
- 新增 `planBackStack` / `nextBackTarget` 两个纯函数并导出到 `__test`，`test/back-stack.test.js` 覆盖 34 例（压栈顺序、退栈顺序、幂等、关闭闸门、离开形态清栈、逐层优先级、哨兵兜底）。
- **旧 APK 兜底（栈底哨兵）**：没有 `DshAndroidBack` 桥的旧版 App 只有 `canGoBack() ? goBack() : finish()` 一条判断，插件若不给栈底留条目，会话页按返回就会被直接 `finish()`。检测到桥缺失（且宿主是 Android 壳）时，base 层改为压一条**真实条目**并配合自绘「再按一次退出」提示 + 2 秒窗口：提示期间故意不压回，`canGoBack()` 保持 `false`，用户再按一次就落到旧壳原有的 `finish()` 上；超过 2 秒则重压哨兵，恢复「可回退」状态。哨兵不计入 `depth` / `consumable`，换到带桥的新壳或离开手机形态时会自动退回。

### 兼容

- **旧壳（无 `DshAndroidBack` 桥）**：三层栈照常维护，页面 / 浮层逐层退可用；另经栈底哨兵 + 自绘提示实现「再按一次退出」（提示样式不同于新壳的原生 Toast，时序一致）。无需升级 App 即可获得防误退。
- **桌面形态（`MODE_DEFAULT`）零改动**：不压条目、不上报、不碰 history。非 Android 宿主（纯浏览器 / 桌面）也绝不启用哨兵，不污染浏览器返回键。
- **一键回滚**：`localStorage['dshm-back-stack'] = 'off'` 退回 v0.4.4 行为（只维护浮层一条 + 上报 `mobile=false` 让壳走原逻辑），不需要降级版本。

### 配套（Android 壳，独立 PR）

- `MainActivity` 新增 `DshAndroidBack` 桥、`onBackPressed()` 三段逻辑、WebView 重建时重置返回状态、`back_exit_hint` 五语言；debug 包顺带开启 WebView 远程调试（`chrome://inspect`）。

## [0.4.4] - 2026-11-01

### 修复

- **窄窗口（悬浮小窗 / 分屏）首次打开设置页不被接管**。官方设置弹窗是桌面两列版式（导航固定 188px），视口 ~327px 时内容列只剩 ~91px，写死的宽度下限 120px 永远不成立。改为按弹窗宽度归一：宽屏仍 120px，窄屏放宽到 `min(120, max(48, 弹窗宽 × 0.25))`。内容判定同时扣掉工具行（新增 `contentPayload`：跳过含关闭按钮的头部子块再统计文本 / 节点），切预设 / 会话恢复留下的空壳弹窗不再被误判为「有内容」。
- **设置页一次横滑直接跳到最后一个 / 第一个页签**。两处根因：① 页签行原生 `overflow-x: auto + scroll-snap` 带惯性，一次快速横滑被甩到最右 / 最左——改为 `overflow-x: hidden`，页签滚动由 `centerSettingsTab` 跟随激活项完成；② 插件可能被宿主实例化多次（热重载 / 重复 entry），每份实例都在 document 上收到同一个 touchend，一次横滑连换多页——touchend 用事件对象打标（`__dshmTabSwipeHandled`）去重，并新增跨模块单实例守卫（`window.__dshmLayoutDispose`）：apply 时先真正 dispose 上一个实例，手势监听不再叠加。页签行同时纳入换页手势（返回键除外）。
- **命令结果卡片（bash / pwsh）窄屏上命令列被压到 ~20px、逐字换行没法读**。卡片 header 改三列网格：第 1 行 = 目录（左，过长省略）+ 退出码胶囊 + 复制，第 2 行 = 命令整宽一行不折行（超宽行内横滚），第 3 行起 = 多行命令的后续行各占一整行；状态点按新基准重新对齐。只依赖官方结构与 data 属性，不碰 CSS Modules 哈希类名。
- **新增命令「自动换行」开关**：插件自建浮层按钮（不进 React 的卡片 DOM，避免被协调流程冲掉），用官方复制键的 rect 定位到首行右侧，滚动 / resize / DOM 变更时重算、卡片滚出视口即隐藏；图标复用官方 `IconWrapFillRegular` / `IconNowrapFillRegular`（React 元素树序列化成 SVG，官方换图标自动跟随）；偏好存 `localStorage`（`dshm-terminal-wrap`）。打开后命令按容器宽度折行。
- **底部导航整体偏上、条底留一条空带**（DSH Mobile 宿主真机）：宿主 WebView 底边已经抬到手势条上方（让出 ~18 CSS px 导航条），页面里再叠一遍 `env(safe-area-inset-bottom)` 就是双份。`--dshm-safe-bottom` 置 0（普通移动浏览器该值一般为 0，行为不变）。

### 新增

- `package.json` 增加 `dsh.compatibility.dshReleases`：逐版本声明对 DSH 内核的兼容性，目前 `0.2.1-rc.2` 与 `0.2.1-rc.5` 标为 `compatible`（两者均实测可用）。取值沿用生态惯例 `compatible` / `incompatible` / `unknown`，未列出的版本视为 `unknown`。
  - 说明：内核 `evaluatePluginCompatibility()`（`@deepseek-ai/dsh-app-boot`）只读 `engines.dsh` 与 `peerDependencies`，**不读这个字段**，所以它不影响安装判定，是给插件市场 / 商店索引看的声明。`dsh.compatibility.dsh` 与 `engines.dsh` 保持一致（`>=0.2.1-rc.2`）。

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
