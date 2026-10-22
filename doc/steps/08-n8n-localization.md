# n8n 中文界面安装

日期：2026-10-16。独立服务维护，不改变 Go狗小程序的产品阶段。

## 输入与方案

- 用户授权安装 `bsi-bcp/n8n-i18n-chinese`。
- 现有服务部署配置位于 `/data/ageni/services/n8n-ai-demo`；Compose 项目为 `n8n-ai-demo`。
- 安装前页面元数据及部署配置均为 n8n `2.42.4`，界面语言为 `en`，监听 `127.0.0.1:25678`。
- 使用同版本 `n8n-editor-ui@2.42.4.tar.gz`，保留现有官方 n8n 镜像，挂载中文前端静态文件，并设置 `N8N_DEFAULT_LOCALE=zh-CN`。
- 汉化文件、Compose 覆盖文件、操作脚本及私有备份均保存在本项目的 `.tools/n8n-i18n/` 下；该目录已由 `.gitignore` 排除。现有服务目录中的配置保持原样。
- 原 n8n 数据卷、AI 配置、runners、sandbox 和端口映射由原部署配置提供。

## 来源

- [2.42.4 发布说明](https://github.com/bsi-bcp/n8n-i18n-chinese/releases/tag/release%2F2.42.4)
- 发布附件大小：16,449,152 字节。
- GitHub Release API 声明的 SHA-256：`c327583ec1592afb236c54b1e1a678ff92b30f5e0533ada24c84d6b823ba8693`。

## 操作入口

安装或重新创建中文 n8n：

```bash
sg docker -c 'bash /data/zuoweimen/gogo/.tools/n8n-i18n/manage.sh apply'
```

撤销中文前端和语言环境变量，重新创建原官方镜像容器：

```bash
sg docker -c 'bash /data/zuoweimen/gogo/.tools/n8n-i18n/manage.sh rollback'
```

普通 Docker 容器重启会保留汉化；后续重新创建容器应使用上述 `apply` 命令，以包含本项目的汉化覆盖配置。直接使用原服务目录的 Compose 配置重新创建 n8n 会恢复英文界面。

## 实现与备份

- 发布附件已下载，文件大小及 SHA-256 与 GitHub Release API 一致；解包前检查路径与文件类型，未发现符号链接或目录穿越路径。
- 私有备份：`.tools/n8n-i18n/backups/20261016-before-zh-CN/`。包括原 Compose 文件、`.env`、镜像锁定信息，以及 n8n 停止后复制的完整 `/home/node/.n8n`。
- 备份目录权限为 `0700`，备份文件权限为 `0600`；数据库备份的 SQLite `PRAGMA quick_check` 返回 `ok`。
- 使用 `.tools/n8n-i18n/compose.zh-CN.json` 和 `manage.sh` 重新创建 n8n 容器；静态文件以只读方式挂载。
- 安装前后官方镜像 ID 均为 `sha256:b4d8352822748c8198a62c7a9413dfbb37a7723a57b00e13b8c7e79bf10c64ee`，版本保持 `2.42.4`。
- 运行时、端口映射、原数据卷与除 `N8N_DEFAULT_LOCALE` 之外的全部容器环境变量均已逐项比对一致。原部署目录文件与备份哈希一致，未被修改。

## 已通过的验证

- 合并后的 Compose 配置有效：仅 n8n 新增语言设置与一个只读挂载，其他服务配置与命名卷保持一致；操作脚本通过 `bash -n`。
- n8n 容器为 `healthy`；`/healthz` 与 `/healthz/readiness` 均返回 HTTP 200 和 `{"status":"ok"}`。
- `/rest/settings` 返回 `defaultLocale: zh-CN`，容器内语言环境变量为 `zh-CN`。
- Chromium 无登录态访问 `/signin` 返回 HTTP 200；浏览器语言设为 `en-US` 时，页面仍显示「登录 / 电子邮件 / 密码 / 忘记密码」。未发现页面 JavaScript 异常或静态资源 HTTP 错误。
- 已查看登录页截图，中文可见。服务器无头浏览器的默认字体缺少中文字形，截图验证时复用本项目已有 Fontconfig 与本地中文字体；这只影响验证浏览器，不修改 n8n 前端字体或用户浏览器设置。
- 安装后以只读连接检查正在运行的 SQLite：`PRAGMA quick_check` 为 `ok`；工作流、凭据及账户记录数与安装前备份一致。
- AI sandbox、sandbox runner 与 n8n task runners 继续运行，未随 n8n 重建。
- 安装摘要保存在 `.tools/n8n-i18n/installation-result.json`，浏览器验证结果与截图分别为同目录下的 `browser-verification.json`、`signin-zh-CN.png`。

## 遗留边界与后续操作

- 未登录验证工作流编辑器、节点配置或 AI 自然语言操作；未执行或修改用户工作流。
- 本方案仅安装发布包中的中文前端；未运行第三方中文镜像中的节点参数注入脚本，不承诺全部节点参数、第三方节点或日志均为中文。
- 回退命令与原配置备份已准备，但本次未实际执行回退演练。
- 用户本地刷新原 n8n 页面即可；若仍使用旧缓存，强制刷新浏览器。
- 后续升级 n8n 时，应同时更新为相同版本的中文前端包；不要跨版本继续挂载本次 `2.42.4` 前端。
