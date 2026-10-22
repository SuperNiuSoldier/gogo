# UI skill 安装记录

日期：2026-10-10。

- 来源：https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- 固定提交：`50d8a7de0900119855614541f15a1a616691eb33`。
- 安装目录：`.agents/skills/ui-ux-pro-max`，仅项目内安装。
- 使用 skill-installer 下载开源 skill，包含数据、脚本和参考文档；保留 MIT LICENSE。
- 本地适配：将 SKILL.md 中 Claude 插件路径替换为当前项目的绝对路径，其余指导保持上游版本。
- 验证：运行 search.py 的 SwiftUI navigation 查询成功，返回 3 条规则；所需两个 reference 文档存在。
- 未执行：完整设计生成效果评估、UI 原型与真机验证。
- 使用：下一轮可调用 ui-ux-pro-max；Go狗明确采用 SwiftUI，产品方案仍维护在 prd，过程留痕在 doc。

示例：

```bash
python3 /data/zuoweimen/gogo/.agents/skills/ui-ux-pro-max/scripts/search.py "navigation" --stack swiftui
```
