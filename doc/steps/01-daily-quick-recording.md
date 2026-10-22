# 每日快记交互 v0.4

日期：2026-10-10。所属阶段：01 产品与设计，阶段仍进行中。
用户确认了六项默认快捷记录；当前交互细节待评审，原生业务尚未开始。

历史版本说明：本页记录 v0.4；最新首页已改为 [v0.5 陪伴首页](01-companion-home.md)。复现本页检查请包装 `design/previews/archive/two-dog-themes-v04.html`，避免用旧脚本检查新版布局。

## 输入与设计判断

- 用户要求：交互简单、功能比较齐全，重视每日频繁记录；确认喂食、喝水、尿尿、便便、遛狗、日记。
- 沿用已确认的 v0.3 圆体、紧凑布局及肉球 / 格林双主题；不融合狗狗特征。
- 按已安装的 UI UX Pro Max 通用规则检查触控、反馈和必要输入。对“progressive disclosure”和“undo”的检索重试后仍未找到适用条目，因此未采纳或持久化不相关搜索结果；具体层级与撤销方案来自本次用户需求和设计判断，并非检索命中结论。

## 实施内容

1. 将旧预览及两套首页、检查报告保留在 `design/previews/archive/*v03*`。
2. 重写当前功能清单、产品范围与页面流程，新增 [每日快捷记录](../../prd/daily-quick-recording.md)。基础照护移入阶段 03；阶段 04 保留扩展照护、健康、趋势和提醒；阶段 05 继续覆盖回忆与数据管理。
3. 首页加入 3×2 快捷区：五项普通照护点击即创建事件，日记先输入；显示当前狗狗今天的次数与最近时间。
4. 增加补充、补记、编辑、撤销、删除确认与同狗同类型 650ms 防误触；撤销按记录 ID 及原状态处理，换主题或狗狗不会改变目标。
5. “更多记录”提供称重、洗澡、美容、训练、用药、疫苗、驱虫、就诊、里程碑、自定义简短表单；体重正数和健康必要内容有校验。
6. 成长页增加狗狗及记录类别筛选；档案提供体重与健康记录入口。
7. 更新嵌入圆体为 360 字符子集，保留原许可及派生字体名称。记录仍只在页面内存；宿主只保存主题与当前狗狗偏好，不保存用户输入内容。

主要文件：`design/previews/two-dog-themes.html`、`prd/daily-quick-recording.md`、`prd/user-features.md`、`prd/product-scope.md`、`prd/mvp-design.md`、`prd/two-dog-visual-system.md`、`doc/development-plan.md`、阶段 03/04 文档及字体子集。

## 验证结果

已执行浏览器检查，结果见 [browser-checks.json](../../design/previews/browser-checks.json)。

- 两套主题在 320、375、390、768px 及 844×390 横屏共 10 组首页尺寸，无横向溢出，可见按钮均至少 44×44 CSS px。
- 另检查小屏反馈区、日记编辑、更多记录、档案、健康筛选，共 5 个页面状态。
- 五项一键照护、按狗统计、跨狗撤销、650ms 误触防重及后续真实重复事件通过。
- 补记不增加今天次数、撤销编辑恢复原记录、日记空文本、主题切换保留草稿与归属、放弃 / 继续编辑通过。
- 体重必填且大于零、用药必填、健康 / 日记筛选、删除确认及取消通过。
- 减少动态效果、嵌入字体加载通过；源字体覆盖全部 360 个子集字符。两套首页已目视检查。
- JavaScript 语法检查通过，浏览器未捕获 JavaScript 运行错误。片段约 283 KB，小于 1 MB。
- 最终 Markdown 本地链接全部有效；片段结构与内嵌资源检查通过。
- 初轮检查发现未修改的时间经分钟输入框往返后丢失秒数，导致刚保存的日记排序后移；修复为未修改时间保留原时间戳，复验通过。
- 原有语义色不变，未新增未计算的颜色组合；本轮未重复旧对比度计算。原对比度证据仍见 `design/previews/contrast-results.json`。

复现脚本：[check_daily_preview.py](../../scripts/check_daily_preview.py)。先用可视化工具的 `render.py` 包装片段至项目 `.tools/two-dog-themes-check.html`，然后执行：

```bash
TMPDIR=/data/zuoweimen/gogo/.tools/tmp PLAYWRIGHT_BROWSERS_PATH=/data/zuoweimen/gogo/.tools/browsers LD_LIBRARY_PATH=/data/zuoweimen/gogo/.tools/browser-libs/usr/lib/x86_64-linux-gnu /data/zuoweimen/gogo/.tools/ui-preview/bin/python3 /data/zuoweimen/gogo/scripts/check_daily_preview.py
```

## 尚未验证或实现

- 本次不是原生 iOS 实现。无持久化、真实相册、提醒、体重趋势、回忆生成、数据导出 / 恢复、快捷项配置或完整档案管理。
- 未验证真实存储失败与重试、重启恢复、通知权限、安全区、系统键盘、VoiceOver、Dynamic Type、跨时区与跨午夜长时间运行；浏览器检查不可替代这些验收。
- 健康内容目前是简短文字表单，结构化药名 / 剂量、附件和下次提醒仍需详细设计。没有自动推荐用量或健康判定。
- 预览保留原有示例记录标识，所有试写内容关闭后清空。用户照片没有复制到源码或发送到外部服务。
- 当前目录不是 Git 仓库，未执行提交或推送。

下一步：评审快记流程，继续补齐照片、提醒、档案与数据恢复原型，再进入阶段 02。
