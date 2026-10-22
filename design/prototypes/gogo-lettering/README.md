# 提醒页书写风格对照

入口：`../../previews/gogo-lettering.html`。

三套候选共用一份可操作内容：随手写 / 钢笔字 / 原版。默认从提醒页开始，可以新增、编辑、完成提醒，顶部切狗、切换奶白 / 黑棕，并查看相册与脚印。

2026-10-13：相册同步支持照片 / 视频混合导入、封面时长与点开播放，见[视频需求](../../../prd/video-import.md)和[专项验证](../../../doc/steps/01-video-import.md)。录像和持久化未实现。

宠物管理：顶部「＋」新增；页面「…」→「当前狗档案」编辑或删除。档案和媒体在方案之间共享，刷新仍会重置。见[实施记录](../../../doc/steps/01-pet-profiles.md)。

字体与手绘资源规范见 [PRD](../../../prd/lettering-trial.md)，验证记录见 [实施文档](../../../doc/steps/01-lettering-trial.md)。尚未选定最终方案，主原型 `gogo-next` 不受本轮构建影响。

## 构建

在项目根目录运行：

```bash
.tools/ui-preview/bin/python3 scripts/build_lettering_preview.py
```

脚本读取 `../gogo-next` 的现有交互引擎、基础布局和选择器。隔离适配仅在生成产物中生效，唯一匹配断言会在基准引擎变化时提示适配失效。`style.css`、`icons.js`、`variants.js` 与 `harness.js` 为本轮独立源文件。`view.html` 是从基准生成的模板。

字体完整源文件位于项目 `.tools/fonts`，预览字体与授权位于 `../../assets/fonts`，图标与 MIT 授权位于 `../../assets/icons/doodle`。字体子集缺字回退系统字体，不能将预览子集当作正式输入字库。

选择器支持 1–3、左右键与 R；输入框中不接管快捷键。记录、日期、草稿和主题在方案切换间保留，刷新后记录重置。

此处为浏览器原型；Figma 连接已验证，但本轮尚未写入 Figma 文件。
