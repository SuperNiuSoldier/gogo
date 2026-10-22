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
- 保持 SSH 主机密钥校验，按 [GitHub 官方指纹](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)核验。
- 2026-10-22 已在本机仓库配置 `origin` 为上述 SSH 443 地址、`main` 跟踪 `origin/main`。仓库本地 `core.sshCommand` 使用 `.tools/github/ssh.sh`，通过同目录 `proxy.py` 读取环境代理并严格校验 `known_hosts`；这些本机辅助文件由 `.tools/` 忽略，不包含在远程仓库中。换机后须按新机器环境配置认证，不依赖本机绝对路径。

### 验证状态与提交约定

- 已通过：SSH 认证与仓库读取；2026-10-22 按用户明确授权完成本地 Git 接入、项目提交和 `main` 推送，实际写入权限已验证。
- 首次项目提交为 `bd567812f28f4ef6fff3d603454e3d9616a35aad`，父提交保留远程原有的 `084edf672639e2246a0ec1fd028e17c783098143`；原有 MIT 许可证保持不变。
- 本机未配置用户的 Git 提交身份，本次使用仓库本地 `Codex <codex@openai.com>` 标明自动化提交，不修改全局身份。后续仍仅在用户授权范围内提交与推送。
- 首次提交前检查 Git 边界、忽略规则和待提交文件，确保密钥、签名文件、真实用户数据及本机工具缓存不进入提交；保留远程历史，不擅自强制推送。
- 接入过程与后续验证结果记录在 `doc/steps/07-github.md`。
