# 胶囊底栏（v2 预设 · 可选样式）

> v2 悬浮布局之上的**第二套底栏样式**：底栏浮起成圆角胶囊，顶部是悬浮卡片头，输入区合成一行。
> 入口：**设置 → 通用设置 → 布局模式 → 悬浮 → 底栏样式 → 胶囊**（默认仍是「透明底栏」，老外观逐像素不变）。
> **「按页换项」是胶囊专属**：会话页 会话 / 插件 / 工作权限 / 模型 / 更多，面板页由「更多」里的目的地补位；透明底栏始终是 会话 / 自动化任务 / 插件 / 工作台 / 设置 五项，没有第二页。

其他预设：[原生](preset-default.md) ｜ [融合](preset-classic.md) ｜ [v2 悬浮](preset-v2.md) ｜ 回到 [README](../README.md)

> 截图为 `Medium_Phone_API_35` 模拟器（物理 1080×2400，CSS 视口 457×962，时区 Asia/Shanghai）的整机实拍，浅色主题（深色单独一节）。
> **0.4.12 起对话正文交还 DSH 原生渲染**：以下截图拍摄于 0.4.9–0.4.11，消息区里的日期分隔、工具 chip、代码块折叠开关等属于历史形态；当前只保留外壳（卡片头 / 分段控件 / 输入区 / 底栏 / 设置页）。
> 根属性：`html[data-dshm-mode="mobile"][data-dshm-preset="v2"][data-dshm-dock="capsule"]`。

---

## 界面总览

<table>
  <tr>
    <th align="center">会话页（展开）</th>
    <th align="center">收起态</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/capsule/01-conversation.png" width="280"></td>
    <td align="center"><img src="assets/screens/capsule/06-collapsed.png" width="280"></td>
  </tr>
  <tr>
    <td valign="top">顶部悬浮卡片头（标题行 / 居中分段控件 / 统计带）+ 一行输入区 + 灰槽五键底栏 + 脚注「实际权限 · 把手 · 实际模型」。</td>
    <td valign="top">点把手收起：底栏只剩脚注一行，页面让位量（<code>--dshm-v2-nav-total</code>）同步收缩，会话区顺势变高。</td>
  </tr>
</table>

## 顶部卡片头

<table>
  <tr>
    <th align="center">标题行 + 分段控件 + 统计带</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/capsule/01-conversation.png" width="320"></td>
  </tr>
  <tr>
    <td valign="top">
      三段各自独立：<b>标题行</b>（44px，左右 24px 内缩、按键与标题同中线）→ <b>页签带</b>（52px，官方页签行尺寸不变、仅透明化，自绘分段控件叠在预留带上）→ <b>统计带</b>（26px，透明底并入卡片）。
      分段控件高 48px，末尾保留「⋯」，点击按索引转发给官方页签。
    </td>
  </tr>
</table>

## 输入区一行

<table>
  <tr>
    <th align="center">输入卡（与五键槽等高）</th>
    <th align="center">键盘态</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/capsule/01-conversation.png" width="280"></td>
    <td align="center"><img src="assets/screens/capsule/10-keyboard.png" width="280"></td>
  </tr>
  <tr>
    <td valign="top"><code>[输入框] ⊕ 回形针 发送</code> 合成一行：卡片 <code>min-height</code> 与下方导航槽同为 64px，动作按钮 44px、图标 24px。</td>
    <td valign="top">软键盘弹出时 <code>data-dshm-ime</code> 置位：底栏让位为 0、输入卡贴在键盘上沿，不出现白带。</td>
  </tr>
</table>

## 弹层

<table>
  <tr>
    <th align="center">工作权限</th>
    <th align="center">模型 / 推理等级</th>
    <th align="center">回形针（图片 / 文件）</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/capsule/03-permission-menu.png" width="240"></td>
    <td align="center"><img src="assets/screens/capsule/04-model-menu.png" width="240"></td>
    <td align="center"><img src="assets/screens/capsule/05-attach-menu.png" width="240"></td>
  </tr>
  <tr>
    <td valign="top">三档带图标；当前档位（完全权限）整项标红。底栏「工作权限」的图标直接取自这份菜单。</td>
    <td valign="top">两行（模型 / 推理等级），子菜单即时展开；高度按内容，最长 <code>min(58vh, 22em)</code>。</td>
    <td valign="top">只两项；与权限菜单同款行高 36px、白面 14 圆角，以按钮为中心、两侧留 12px。</td>
  </tr>
</table>

<table>
  <tr>
    <th align="center">加号面板（sheet）</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/capsule/02-addpanel.png" width="320"></td>
  </tr>
  <tr>
    <td valign="top">附件（图片 / 相机 / 文件）+ 添加（目标 · 计划 · 反馈）+ 指令（压缩 · 权限 · 模型 · 下载日志）。面板与遮罩都停在底栏上沿，底栏保持可见可点。</td>
  </tr>
</table>

## 对话正文

**对话页正文完全交给 DSH 原生渲染**：插件不注入节点、不打标、不改字体/行高/间距、不画日期分隔、不接管代码块或步骤折叠，消息气泡、时间戳、操作行、工具调用行都用官方原样。胶囊样式只改外壳（卡片头、分段控件、输入区、底栏、设置页），不碰消息列表内部。

> 唯一的例外：**深色下用户消息气泡的底色**改为暗蓝（只覆盖官方变量 `--dsw-specific-bubble`，主题蓝 30% 混底），因为官方深色底 `#2c2c2e` 与页面/卡片几乎没有区分度。其余主题/预设下气泡保持官方原色。

> 0.4.9–0.4.11 期间的「居中日期 / 工具 chip 胶囊 / 代码块收起 / 思考行弱化 / 步骤折叠」已全部移除；对应截图仅作历史存档，不再代表当前行为。

## 换页与设置

<table>
  <tr>
    <th align="center">插件页</th>
    <th align="center">设置页</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/capsule/08-plugins.png" width="280"></td>
    <td align="center"><img src="assets/screens/capsule/07-settings.png" width="280"></td>
  </tr>
  <tr>
    <td valign="top">换页后底栏仍五格：工作权限 / 模型两格由「更多」里的目的地补位，底栏不跳宽。</td>
    <td valign="top">「通用设置」页：权限 / 语言 / 外观 / 布局模式 / <b>底栏样式（透明底栏 · 胶囊底栏）</b></td>
  </tr>
</table>

## 深色

<table>
  <tr>
    <th align="center">深色主题（设置 → 通用设置 → 外观 → 深色）</th>
  </tr>
  <tr>
    <td align="center"><img src="assets/screens/capsule/11-dark.png" width="320"></td>
  </tr>
  <tr>
    <td valign="top">卡片头、分段控件、输入卡、底栏跟随深色 token；胶囊的阴影与 1px 外缘高光改用主题蓝（深色下黑色阴影几乎不可见），顶部 TAB 为灰轨道（<code>bg-layer-1</code>）+ 浅灰滑块（<code>bg-layer-3</code>），轨道与滑块各带 1px 灰描边，选中文字保持主题蓝。对话正文由 DSH 原生主题渲染，插件不再改字号。系统夜间模式不影响该壳，必须在 App 内切换外观。</td>
  </tr>
</table>

---

## 行为速查

| 交互 | 结果 |
|---|---|
| 点把手 | 收起 / 展开底栏；收起后让位量 = 把手行高 + 边距 |
| 点分段控件 | 切换官方页签（对话 / 轨迹 / 编辑器），末尾「⋯」转发官方更多 |
| 点 ⊕ | 打开加号面板（附件 / 添加 / 指令） |
| 点回形针 | 弹「图片 / 文件」两项，选择后走官方附件注入链路 |
| 点发送 | 转发官方发送按钮（空输入时保持官方禁用态） |
| 点工作权限 / 模型 | 弹层抬到「输入卡之上」，与输入卡、按键区零重叠 |
| 键盘弹出 | 底栏让位 0、输入卡贴键盘；收起键盘自动复原 |

## 实现要点（给维护者）

- **不搬官方结构**：输入区一行靠「官方工具行自身收成 0 高 + 自绘动作行」实现；任何改工具行**外层布局**的做法都会触发重渲染，把节点换成 16×87 的窄容器（详见 [技术说明 §3.18](technical-notes.md)）。
- **弹层用 `translate` 抬升**，不改 `bottom/left`：改布局位置会让官方子菜单按父菜单重算锚点，子菜单会一直停在 0 高度。
- **弹层目标高度读实测导航高度**，不要读 `--dshm-v2-nav-total`：该变量在弹层打开瞬间可能读到 0。
- **官方 TAB 行尺寸不变**，只 `opacity: 0` 隐藏；分段控件叠在卡片底部预留带上。
- **`em` 基准陷阱**：官方输入区这一行 `font-size` 是 13.33px，自绘按钮要显式写 `font-size: 16px`，否则 44px 的按钮只有 36.7px。

## 已知限制

1. 平板（短边 > 600）走原生布局，本样式完全不激活（已用 `Pixel_Tablet_API_35` 实测：`data-dshm-mode=null`、无胶囊节点）。
2. 官方页签行宽度由外部给定（769px 量级），无法用 CSS 居中，因此采用「透明化 + 自绘」而不是改造官方那一行。
3. 深色只能通过 App 内「外观」切换，系统夜间模式不生效。
