# Go狗

随手记录狗狗的日常与成长。2026-10-13 用户确认原型设计完成，并将首发平台改为微信小程序。

当前工程在 **[wechat](wechat/README.md)**，导航为相册 / 脚印 / 提醒。已实现源码层面的宠物管理、拍照与照片 / 视频导入、成长串线快记、待办和本地持久化。首次打开从空档案开始，无虚构用户记录。

已配置用户提供的 AppID，用户已在 Windows 开发者工具打开页面；模板语法错误与随后反馈的布局挤压已修复，本地旧版 WCC/WCSC 编译和补充布局检查通过。当前修复版在开发者工具和真机上的效果待确认。云存储、订阅消息、PDF、备份恢复和发布仍待后续开发，见[实施与验证记录](doc/steps/02-wechat-foundation.md)。

## 开始开发

在 Windows 微信开发者工具中导入 `wechat` 目录。具体步骤、手机预览流程与测试命令见[工程说明](wechat/README.md)。不需要 Mac / Xcode，也不需要安装第三方 npm 运行依赖。

## 目录

- `wechat/miniprogram/pages`、`features`：小程序页面与功能。
- `wechat/miniprogram/core`、`services`：共享数据模型、本地仓库、文件和微信接口。
- `wechat/miniprogram/assets`：运行所需许可字体与图标。
- `wechat/tests`：业务、文件生命周期和页面控制器测试。
- `prd`：当前产品需求，先读[小程序首发基线](prd/wechat-release.md)。
- `doc`：设计决策、变更过程、开发路线与逐步实施记录。
- `design`：视觉源资产、原型和评审截图；已确认原型入口为 `design/previews/gogo-lettering.html`。
- `scripts`：素材构建、布局验证与工程打包辅助脚本。
- `ios`：原生路线的历史占位，当前首发不依赖它。

从[开发路线](doc/development-plan.md)查看阶段状态。GitHub 认证与读取已验证，本地仍未初始化 Git 或推送；约定见 [agent.md](agent.md)。
