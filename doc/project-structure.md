# 文件结构与放置规则

所有路径相对于 `/data/zuoweimen/gogo`。

2026-10-13：首发改为微信小程序。当前工程职责如下，后面的 iOS 表格保留为原生路线历史规划。

| 当前路径 | 内容与职责 |
|---|---|
| `wechat/project.config.json` | 开发者工具导入配置；游客 AppID 占位 |
| `wechat/miniprogram/pages/home` | 三入口、宠物上下文、表单与详情 |
| `wechat/miniprogram/features` | 功能视图数据，如成长串线与日历 |
| `wechat/miniprogram/core` | 数据模型、校验、持久仓库事务 |
| `wechat/miniprogram/services` | 微信平台、用户文件、媒体复制与清理 |
| `wechat/miniprogram/assets` | 运行时字体、图标与许可 |
| `wechat/tests`、`wechat/scripts` | 逻辑测试与工程检查 |
| `design/previews/wechat` | 布局检查截图与报告，不含真实用户内容 |
| `scripts/build_wechat_assets.py` | 从已有许可资源生成小程序资产 |
| `scripts/check_wechat_layout.py` | WXML / WXSS 浏览器布局替身检查，不能替代微信真机 |

## 原生路线历史规划

| 路径 | 内容与职责 |
|---|---|
| `ios/GoDog/App` | App 入口、四页导航与拍照动作、依赖组装 |
| `ios/GoDog/Features/Footprints`（目标） | 脚印、日记叠卡、全部历史、快捷记录 |
| `ios/GoDog/Features/Album`（目标） | 相册、照片浏览与拍照 |
| `ios/GoDog/Features/Weight`（目标） | 照片成长线与趋势 |
| `ios/GoDog/Features/Reminders`（目标） | 日历、待办与实例 |
| `ios/GoDog/Features/Today`、`Growth`（现有占位） | 工程初始化时按新职责迁移，不作为当前页面定义 |
| `ios/GoDog/Features/Profile` | 狗狗档案、设置与数据管理 |
| `ios/GoDog/Features/Record` | 新增及编辑日记、照护与健康记录 |
| `ios/GoDog/Core/Models` | 狗狗、日记、事件等领域模型 |
| `ios/GoDog/Core/Persistence` | 本地存储、迁移与数据访问 |
| `ios/GoDog/Core/Services` | 照片、通知、导出等系统能力 |
| `ios/GoDog/Shared/Components` | 多个功能共用的 UI 组件 |
| `ios/GoDog/Shared/Theme` | 颜色、字体、间距等视觉规范 |
| `ios/GoDog/Resources` | 资源目录；Asset Catalog 在工程初始化时建立 |
| `ios/GoDogTests` | 数据与核心业务测试 |
| `ios/GoDogUITests` | 关键用户流程测试 |
| `prd` | 当前产品需求、版本范围、用户流程与页面设计 |
| `doc` | 设计决策、方案变更与实施验证留痕 |
| `doc/steps` | 各阶段实施流程与完成记录 |
| `design` | 原型、参考图与视觉资产 |
| `scripts` | 构建、校验等辅助脚本 |

2026-10-12：上表为 PRD 1.0 的目标职责；本轮未移动源码目录。当前 Today / Growth 等仍是 `.gitkeep` 占位，工程基础阶段再建立目标模块。加入实际文件后可移除对应占位。
后续 Xcode 工程放在 `ios/GoDog.xcodeproj`，工程与现有源码目录保持一致。
