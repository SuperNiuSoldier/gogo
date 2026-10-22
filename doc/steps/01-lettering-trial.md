# 提醒页字体与手绘图标试作

日期：2026-10-13。阶段 01。

## 输入与实现

用户要求将上一轮的字体、图标资源建议实现为可查看的比较稿，并告知 Figma 已安装、已授权。本轮实际调用 Figma 账号接口验证连接成功；没有创建或写入 Figma 文件。

使用项目 `prototype`、`ui-ux-pro-max` 和已有设计规范。方案为随手写 / 钢笔字 / 原版，探索书写气质与图标笔触。当前要求见 [字体对照 PRD](../../prd/lettering-trial.md)。

- 独立源文件：[gogo-lettering](../../design/prototypes/gogo-lettering/)。不改写 `gogo-next` 主原型。
- 构建脚本：[build_lettering_preview.py](../../scripts/build_lettering_preview.py)。读取现有交互引擎，以带唯一匹配断言的构建适配接入图标和比较状态，沿用记录逻辑；构建报告记录引擎 SHA256。
- 采用小赖、霞鹜文楷真实字体。下载的完整字体留在项目 `.tools/fonts`，预览子集和完整授权位于 `design/assets/fonts`。
- Doodle Icons 固定来源提交 `38de0ac9fc7524870c8e1f18373cf56f32a5028b`，仅内联用到的静态图标；项目补绘缺少的照护符号。没有执行下载仓库的代码或安装其持续动画 skill。
- 用户明确要求手绘字体与图标，因此手绘 SVG 资源优先于通用预览技能的 Lucide 默认建议。比较选择器按用户此前指定的 prototype 技能保留原样。
- 手写方案调整提醒条目、日期选中、分隔线和表单字形；主操作点击范围保留，新增说明未塞入产品页面。

## 验证

已通过：

- [构建检查](../../design/previews/gogo-lettering/build.json)：预览 715,394 字节，三个字体子集覆盖全部 438 个固定预览字符，选择器样式与技能一致。图标 MIT 授权也保留在生成预览的注释中。
- [浏览器检查](../../design/previews/gogo-lettering/browser-checks.json)：8 组流程、18 组布局通过，无 JavaScript 运行错误。覆盖字体实际加载、三套方案双主题、空事项原生校验、新增 / 编辑 / 完成 / 撤销完成、切狗隔离、草稿与所选日期跨方案保留、输入框不触发方案快捷键，以及当前三入口。
- 320 / 375 / 390px、常规与 125% 字号检查通过，表单无横向溢出；提醒最后一条可通过滚动完整显示。两套手写方案在常规字号首屏显示全部三条样例。原版 320px 首屏需要滚动查看最后一条，保留为现状比较。
- 宽屏横向容器可滚动到表单操作；减少动态效果下弹窗无位移动画。
- [文字对比度](../../design/previews/gogo-lettering/contrast-checks.json)：奶白 / 黑棕的正文、次要文字、主按钮六组配色均达到 4.5:1，最低为 5.15:1。
- 人工检查提醒页和新增提醒弹窗的明暗截图。修正初稿提醒行间距过大、第三条被底部区域截住的问题。

检验脚本：[check_lettering_preview.py](../../scripts/check_lettering_preview.py)。截图位于 `design/previews/gogo-lettering`。浏览器检查使用 Chromium，不代表真机验收。

## 边界

仍是内存原型。字体原生嵌入、iPhone 真机、VoiceOver、原生 Dynamic Type、持久化和系统通知尚未验证。本轮没有提交、推送或创建外部设计文件。
