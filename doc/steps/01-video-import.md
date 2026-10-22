# 相册视频导入实施

日期：2026-10-13。阶段 01，浏览器原型。

## 输入与实现

用户要求「相册需要视频导入」。继续沿用三入口和顶部唯一切狗，未增加视频专区或底栏入口；当前要求见[视频导入 PRD](../../prd/video-import.md)。

1. 扩展 `design/prototypes/gogo-next/app.js` 的共享媒体处理，兼容原有照片。视频保存本地 Blob 引用、封面、时长和尺寸；原件不上传、不转码。
2. `view.html` 导入选择器允许照片与视频混选。发起时固定宠物和编辑上下文；逐项解码，成功项正常保留，失败项不创建记录。取消、读取超时、格式不支持、文件过大有结果反馈。
3. 卡片和成长线复用视频封面，附播放标记和时长。详情使用原生播放器，默认暂停，支持播放、暂停、进度和音量；关闭、内容替换、页面隐藏和设计实例销毁时暂停。照片流转遇到视频停止。
4. 临时视频解码资源结束后清理；失败 Blob URL 释放，成功 URL 随共享数据跨设计方案保留，在内容重置或页面离开时清理。已取消编辑或已销毁实例的导入结果丢弃。
5. 保持「记一笔」拍照和体重照片附件的原有行为，日记支持视频附件及文字编辑。两份 `harness.js` 避开播放器键盘事件，防止左右键拖进度时切换设计方案。
6. 重建主原型及字体对照稿；本轮属于共同功能更新，不代表选定字体或布局方向。同步当前 PRD、阶段 02 的后续媒体验证计划。

实现位置：`design/prototypes/gogo-next/{app.js,style.css,view.html,harness.js}`、`design/prototypes/gogo-lettering/{icons.js,harness.js}`。对照稿的 `view.html` 由构建脚本生成。

## 验证结果

已通过，均为 Chromium 浏览器检查：

- 两份预览构建通过，分别为 497,419 / 739,626 字节，固定文案字形无缺失，均小于 1 MB。构建报告位于各自 `design/previews` 子目录。
- [13 组专项检查](../../design/previews/gogo-lettering/video-import-checks.json)通过，无 JavaScript 运行错误；同份结果也保存到主原型目录。
- 主原型三个方向、字体对照三个方向均验证取消无记录、视频导入、实际封面与时长、默认暂停、播放 / 拖动 / 关闭停止、日记详情和成长串线、深色主题。播放器键盘操作不会切换设计方案。
- 照片 + 视频 + 损坏视频混选：两项成功、两条记录，失败项跳过，失败临时 URL 释放；仅导入损坏文件时不增加记录。
- 导入途中切狗仍归属发起宠物；切换设计方案后视频保留，旧播放器停止，新播放器可打开。
- 体重选择器仍仅照片；拍照入口仍 `image/*` 和 `capture="environment"`，模拟选择照片后只增加一条照片日记。此项不代表真实相机验证。
- 视频日记编辑保留附件且不增加重复记录；页面隐藏停止播放。
- 视频查看器在 320 / 375 / 390px、常规 / 125% 字号下无横向溢出，视频和控件位于弹层内部。
- 人工查看卡片及视频详情的深色截图，未增加大块功能说明。截图使用合成测试视频，并非用户的狗狗视频。

脚本：[check_video_import.py](../../scripts/check_video_import.py)。它通过浏览器 Canvas / MediaRecorder 自动生成约 1.6 秒 WebM / VP8 测试视频及照片，使用 EBML Duration 补足测试容器元数据；同时生成损坏文件。素材均在项目 `.tools/tmp/video-import` 下，不使用真实用户数据，也不依赖 FFmpeg。

重现方式：先运行 `build_next_preview.py` 和 `build_lettering_preview.py`，使用现有预览包装脚本生成 `.tools/gogo-next-check.html` 和 `.tools/gogo-lettering-check.html`，再以项目 `.tools/ui-preview/bin/python3` 执行专项脚本。

## 尚未验证与限制

- 实测解码样本为合成 WebM / VP8；未验收 Safari、iPhone MOV / HEVC、带音轨视频、HDR / 旋转元数据、超长视频及真实手机相册的云端下载。
- 原型每批 20 项、视频每段 200 MB、照片每张 20 MB；这些不是已验证的正式产品容量标准。不能据此宣称所有 MP4 / MOV 可用。
- 仅当前预览内存可用，刷新后内容丢失；原生持久化、后台恢复、拍摄时间提取、视频去重、转码和真实 PDF / 备份尚未实现。
- 本轮没有提交、推送或写入 Figma。字体方向仍待用户选择。

实现参考：[MDN video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video)、[MDN revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)。
