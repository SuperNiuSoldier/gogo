# Go狗视觉设计

当前产品依据 [PRD 1.0](../prd/README.md)。新版四页双主题交互原型已制作，等待用户视觉评审；原生工程仍未开始。

- `previews/gogo-next.html`：最新评审入口，使用 Apple 设计与 prototype 工具重构的影集 / 手账 / 日常三套完整交互方向。
- [新版原型源码](prototypes/gogo-next/README.md)：选择器、各方向、共享记录能力及构建方式。
- `previews/gogo-next/`：三套双主题页面截图、浏览器及布局验证。

- `previews/gogo-life.html`：上轮四页预览片段，默认相册；照片为生成示例，记录为模拟数据，操作仅存内存。
- [原型源码与范围](prototypes/gogo-life/README.md)：可维护的页面、样式与交互源文件。
- `previews/gogo-life/`：本轮双主题截图、空状态、趋势、月历与验证报告。
- [相册素材来源](assets/album-samples/README.md)：12 张照片风格生成素材及完整提示词。
- [本轮实施与检查](../doc/steps/01-four-page-prototype.md)：与 PRD 的对应范围及遗留问题。

以下 v0.12 及更早预览、截图和报告均为历史实验，不代表 PRD 1.0 已完整实现。

- [双主题设计方案](../prd/two-dog-visual-system.md)：肉球 / 格林的识别特征及交互规则。
- [照片手账视觉 v0.12](../prd/paper-photo-design.md)：旧文件的兼容索引，当前以 PRD 1.0 视觉规范为准。
- `references/tupina/`：用户提供的四张外部设计稿及来源说明，仅作研究参考。
- `theme-tokens.json`：两套语义颜色。
- `assets/rouqiu-gelin-portraits-v1.png`：独立角色插画，左肉球、右格林。
- `assets/character-generation.md`：图片来源、生成提示词及使用边界。
- `assets/fonts/`：当前预览嵌入的中文圆体子集、来源与许可。
- `assets/characters/`：肉球 / 格林独立动作图集、透明 WebP、帧顺序 / 对齐参数和完整生成提示词。
- `previews/two-dog-themes.html`：可在聊天内展示的交互预览片段；内嵌优化后的插画，无远程图片依赖。
- `previews/contrast-results.json`：已计算的主题颜色组合对比度。
- `previews/paper-photo-browser-checks.json`：v0.12 双狗视觉、纸卡布局、实际体重记录、长名字与用户照片检查。
- `previews/paper-photo-contrast.json`：本轮 8 组文字与背景的对比度计算。
- `previews/*-paper-home.png`、`previews/*-paper-tools.png`、`previews/*-paper-memories.png`、`previews/*-paper-care.png`：v0.12 双主题截图。
- `previews/paper-weight-test-data.png`：体重图表截图，使用明确标注的浏览器示例数据。
- `previews/flat-tools-browser-checks.json`：v0.11 扁平目录、简短表单、草稿保护与归属用例在当前 v0.12 上的回归报告；版本字段表示原用例版本。
- `previews/rouqiu-tools.png`、`previews/gelin-tools.png`、`previews/weight-simple.png`：当前回归运行产生的目录与体重表单截图；v0.11 旧截图位于归档目录。
- `previews/global-pet-browser-checks.json`：历史 v0.10 顶部切换、拍照结果处理、草稿保护与上下文同步的验证。
- `previews/theme-restore-browser-checks.json`：主题切换、保存状态兼容恢复与草稿保留的检查。
- `previews/photo-home-browser-checks.json`：历史 v0.9 照片轮播、弹层焦点、草稿保护与核心业务回归报告。
- `previews/photo-overlay-contrast.json`：照片文字与入口叠加在最亮底图上的对比度计算。
- `previews/care-sheet.png`：历史 v0.9 展开快记弹层的截图。
- `previews/browser-checks.json`：历史 v0.8 主题、快记、撤销、补记、表单、筛选和布局验证结果。
- `previews/detail-browser-checks.json`：历史 v0.6 照片、档案、提醒与二级页布局验证结果。
- `previews/sprite-browser-checks.json`：历史 v0.8 姿势帧播放、固定点击区、取消 / 切换、减少动态效果与布局验证结果。
- `previews/*-character-rest.png`、`previews/*-character-wave.png`：v0.8 两只角色的坐姿与抬爪状态。
- `previews/*-memories.png`：历史 v0.10 两套主题的回忆页，只有顶部宠物切换与拍照主入口。
- `previews/*-family.png`：历史 v0.6 我家页面截图。
- `previews/*-reminders.png`、`previews/reminder-editor.png`：历史 v0.6 提醒列表与编辑截图，内容为明确标注的示例。
- `previews/rouqiu-home.png`、`previews/gelin-home.png`：历史 v0.9 两套首页的浏览器截图。
- `previews/archive/`：v0.2 至 v0.11 预览、截图与验证记录，用于设计留痕。

历史 v0.12 根据用户参考稿改为照片手账视觉，加入依据已保存体重绘制的变化图，见[本轮记录](../doc/steps/01-paper-photo-design.md)。保留 v0.11 的 12 项同级功能与简短表单，以及顶部唯一头像切换、拍照留瞬间、大幅照片和折叠功能布局。未取得原照时显示标注过的插画占位，用户可添加自己的照片。角色动作保留在独立弹层，见[角色动作记录](../doc/steps/01-character-animation.md)。记录、照片及提醒仍只保留在当前页面内存，不是可安装的 iOS 应用。此前设计过程见[扁平功能记录](../doc/steps/01-flat-features.md)、[顶部切换记录](../doc/steps/01-global-pet-context.md)和[照片首页记录](../doc/steps/01-photo-home.md)。
