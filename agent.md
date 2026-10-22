# 项目开发约定

本项目（Go狗）的所有开发工作都必须在 `/data/zuoweimen/gogo` 文件夹下进行。项目代码、配置、文档及其他开发产物均应存放在该文件夹内。

## 当前平台

2026-10-13 用户确认首发改为微信小程序，先搭建工程，随后提供 AppID 并完成本地配置；用户已在 Windows 开发者工具打开页面，反馈的模板与布局问题已修复，当前修复版和手机预览待复验。当前业务代码在 `wechat/miniprogram`，共享代码按 `core` / `services` 分离；`ios` 保留为后续原生路线。当前范围以 `prd/wechat-release.md` 为准，实施先看 `doc/development-plan.md` 与 `doc/steps/02-wechat-foundation.md`。

## GitHub 仓库与推送

- 仓库：`https://github.com/SuperNiuSoldier/gogo`。
- 默认分支：`main`；远程已有提交，首次接入时应先读取并保留现有历史。
- 认证方式：仓库专用 SSH Deploy Key，名称为 `gogo-dev-server`；用户已在 GitHub 开启 `Read/write` 权限。
- 本机私钥：`/data/zuoweimen/gogo/secrets/gogo_github_ed25519.key`；公钥为同路径加 `.pub`。
- 密钥指纹：`SHA256:6Bm5Ij0C5oFubKy3Sp0kBBDfsEL04Sep/Zmf1GbrpTE`。
- `secrets/` 已由 `.gitignore` 排除；私钥权限为 `0600`，目录权限为 `0700`。不得将私钥或代理凭据写入文档、日志或提交到版本库。

### 当前环境的连接方式

- 2026-10-10 验证时，直连 `github.com:22` 和 `ssh.github.com:443` 均不可达；使用环境中现有的 HTTPS 代理建立 HTTP CONNECT 隧道后，SSH 443 连接成功。
- 可用仓库地址：`ssh://git@ssh.github.com:443/SuperNiuSoldier/gogo.git`。
- SSH 不会自动使用 `HTTPS_PROXY` / `https_proxy`；后续连接需通过 `ProxyCommand` 使用现有代理，并显式指定上述专用私钥及 `IdentitiesOnly=yes`。代理地址和凭据从环境读取，不硬编码。
- 保持 SSH 主机密钥校验，按 [GitHub 官方指纹](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)核验。既有验证仅使用临时命令，尚未持久化 SSH 或 Git 连接配置。

### 验证状态与提交约定

- 已通过：SSH 认证，GitHub 返回 `Hi SuperNiuSoldier/gogo! You've successfully authenticated`；`git ls-remote --symref` 成功读取远程，并确认默认分支为 `main`。
- `Read/write` 来自用户提供的 GitHub 配置截图；尚未通过实际推送验证写入。
- 截至上述验证，本地尚未初始化 Git、设置远程、提交或推送。仅在用户授权范围内执行这些操作，不将连接验证视为已完成上传。
- 首次提交前检查 Git 边界、忽略规则和待提交文件，确保密钥、签名文件、真实用户数据及本机工具缓存不进入提交；保留远程历史，不擅自强制推送。
- 接入过程与后续验证结果记录在 `doc/steps/07-github.md`。
