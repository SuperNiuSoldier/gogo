# 日记正面上下滑动与毛玻璃模糊

日期：2026-10-12。阶段 01 原型修正，待用户评审。

## 输入与设计

用户澄清：「不是这种，是上下滑动的方式，然后划走后会用类似毛玻璃的方式模糊」。由此替换[上一轮三维轮轴尝试](01-diary-wheel.md)。

当前方案：日记卡保持正面、原尺寸上下滑动。阅读位置的卡片清晰；离开后内容逐渐模糊、蒙上柔和的同色薄层，下一张从下方滑入时逐渐恢复清晰。滑回旧卡也恢复清晰。相邻卡只露出一部分，首尾有界；顶部宠物、标题、记录按钮和底栏保持清晰稳定。

当前需求见[脚印 PRD](../../prd/daily-quick-recording.md)与[视觉规范](../../prd/two-dog-visual-system.md)。模糊强度和滑动间距为本轮实现提案，尚未获用户视觉确认。

## 实现

- [app.js](../../design/prototypes/gogo-life/app.js)：继续使用浏览器原生纵向滚动和停靠，替换圆周坐标、透视和旋转为连续纵向位移。卡间距由最大卡片高度加 20px 得出，避免放大文字时相邻卡相交。
- [style.css](../../design/prototypes/gogo-life/style.css)：在每张纸卡内增加内容层，离开中心后渐进模糊，最大为 6px；上层同纸色薄层最大不透明度 28%，保留纸卡轮廓。停稳的当前卡模糊为零、薄层完全透明。效果只改变当前呈现，不修改照片原件或详情。
- 位移和模糊从同一连续滚动位置计算，按住滑动时持续更新，无固定自动播放动画；反向滑动按原路径恢复清晰。
- 保留滚轮、触控板、触屏、键盘定位、详情返回原篇、主题独立、全局切狗与空 / 单篇状态。减少动态效果时只展示当前清晰卡，静态切换。
- 已更新 [聊天预览](../../design/previews/gogo-life.html)及[原型说明](../../design/prototypes/gogo-life/README.md)，历史 `two-dog-themes.html` 未修改。

## 验证结果

- [桌面专项](../../design/previews/gogo-life/diary-frost-scroll-checks.json)通过：三张卡保持相同宽度、无旋转和深度，前后卡在上下方模糊，中央卡清晰；反向滚动后恢复零模糊。滚轮、键盘、详情返回、主题保留位置、切狗、减少动态效果、空 / 单篇、320 / 375 / 390px 大字号边界通过。脚本为 [check_diary_scroll.py](../../scripts/check_diary_scroll.py)。
- [触屏模拟专项](../../design/previews/gogo-life/diary-frost-touch-checks.json)通过：按住上滑过程中采集 12 个位置，卡片持续向上移动、保持正面，划走卡的模糊增加，滑入卡的模糊减少；滑动不误开详情，停稳点击打开，关闭后保持阅读位置。脚本为 [check_diary_touch.py](../../scripts/check_diary_touch.py)。
- [四页回归](../../design/previews/gogo-life/browser-checks.json) 12 组通过，[布局检查](../../design/previews/gogo-life/layout-checks.json) 32 组通过，无 JS 运行错误。
- 人工查看[停靠状态](../../design/previews/gogo-life/diary-frost-middle.png)、[滑动中途](../../design/previews/gogo-life/diary-frost-midgesture.png)和[黑棕主题](../../design/previews/gogo-life/diary-frost-dark.png)：离开位置的内容呈模糊薄层，当前卡完整清晰，页面操作没有一起模糊。

## 遗留问题

以上触屏结果来自 Chromium 模拟；iPhone Safari / 原生 iOS 的实机滚动、滤镜性能、VoiceOver 与 Dynamic Type 未验证。数据仍在原型内存中，原生开发阶段状态不变。
