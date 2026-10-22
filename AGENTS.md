# Go狗项目约定

- 本项目所有开发工作及产物必须位于 `/data/zuoweimen/gogo` 下。详见 `agent.md`。
- 产品需求与当前设计方案放在 `prd`；设计决策、变更原因与实施过程留痕放在 `doc`，视觉资产放在 `design`。
- 开始实施前查看 `doc/development-plan.md` 与对应阶段文档。
- 每完成一个阶段，在对应 `doc/steps` 文档中记录实现内容、验证结果与遗留问题；尚未验证的内容不得标为已通过。
- 当前首发转为微信小程序：工程位于 `wechat`，小程序功能放入 `wechat/miniprogram/pages` / `features`，共享业务与平台适配放入 `core` / `services`。原 iOS 目录保留，后续原生功能仍按 `ios/GoDog/Features` 组织，共享代码放入 `Core` 或 `Shared`。
- 不把密钥、访问令牌、签名证书或用户真实数据提交到版本库。
- GitHub 已配置仓库 Deploy Key，SSH 认证与读取已验证；连接方式与推送约定详见 `agent.md`，仅在用户授权范围内提交与推送。
