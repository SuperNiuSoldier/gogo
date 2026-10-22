# Emil Kowalski 技能集安装

日期：2026-10-12。用户明确要求把指定仓库的技能安装到项目目录。

## 来源与范围

- 仓库：[emilkowalski/skills](https://github.com/emilkowalski/skills/tree/main)。
- 安装时固定到提交 `2d228630ba1446365f614a108cb8252f1feda202`，避免后续上游变化导致来源不明。
- 使用系统 skill-installer，从同一版本一次性下载全部 15 个技能到项目 `.agents/skills`。下载临时目录也位于项目 `.tools/tmp` 下。
- 技能正文与配套参考文件保持上游原文；每个技能目录补充上游 MIT `LICENSE`。已有 `ui-ux-pro-max` 保留。

## 已安装

`emil-design-eng`、`animate`、`animate-expo`、`animation-performance`、`animation-vocabulary`、`apple-design`、`ask-sonner`、`break-ui`、`find-animation-opportunities`、`improve-animations`、`mobile-native`、`pick-ui-library`、`prototype`、`review-animations`、`write-swift`。

其中界面设计、动效、动效审查、移动端体验、原型和 Swift 技能可用于后续 Go狗工作。安装不等于同时执行所有技能，也不改变已确认的产品需求与技术栈。

## 验证

- 23 个上游技能及参考文件的 Git blob 哈希与固定提交一致。
- 15 个 `SKILL.md` 的 YAML 元信息可解析，名称与目录一致，描述非空。
- 14 处本地 Markdown 引用全部可解析到已有文件。
- 15 份许可证已复制，许可证内容与同一提交一致。
- 验证清单：[安装检查](../emil-skills-installation-checks.json)。

本轮仅安装技能和记录来源，没有应用技能修改 UI，没有执行 Git 提交或推送。依 skill-installer 的加载约定，技能可在下一条消息中使用；具体设计效果仍需在使用时验证。
