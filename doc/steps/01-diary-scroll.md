# 日记叠卡改为上下滚动

日期：2026-10-12。阶段 01 的交互修正，不涉及原生工程或 Git 推送。

后续修正：用户指出本轮平移缩放仍不符合要求，明确要「上下轮轴滚动」。下文保留当时过程；当前几何与验证以[轮轴滚动](01-diary-wheel.md)为准。

## 输入与决定

用户指出截图中的日记叠卡应该用滚动交互。此前只通过左右箭头或点背卡换篇，纵向滚动只在内容溢出时出现，卡片层次没有随滚动改变。

本次保留纸卡、双主题和全局宠物上下文，以连续纵向滚动作为翻阅动作。向上查看更早记录，向下返回较新记录；移除底部左右箭头，保留「记一笔」。当前卡点开全文，相邻露出的卡可点到对应篇。需求同步至 [脚印 PRD](../../prd/daily-quick-recording.md)。

## 实现

- 在 [app.js](../../design/prototypes/gogo-life/app.js) 中用实际日记建立滚动轨道和停靠点；浏览器原生处理滚轮、触控板和触屏滚动，通过同一滚动位置计算卡片的位移、缩放和层次，停下后对齐最近一篇。
- 不用手动劫持触屏拖拽；只有日记区域滚动，标题、宠物栏、主要记录操作与底栏保持稳定。滑动过程中抑制点击打开详情，停稳后点击正常打开。
- 打开 / 关闭详情保留原篇，换主题保留阅读位置，换宠物从该狗的最新日记开始。页间往返保留当前篇；新建 / 编辑仍定位到保存的日记。
- 上下键、Page Up / Down、Home / End 可定位日记，焦点同步移到选中卡，支持连续键盘操作。读屏状态在滚动停稳后播报篇数，不逐帧播报。
- [样式](../../design/prototypes/gogo-life/style.css) 保留实色纸卡；最多三张在停稳时可见，一篇时没有假背卡，零篇时仍是空状态。长摘要最多显示五行，全文在详情完整保留；大字号按卡片实际高度调整位置，纯照片卡限制封面尺寸。
- 减少动态效果时程序定位直接到目标，手动滚动仍可用。滚动与尺寸监听在页面卸载时清理。
- 重新构建 `design/previews/gogo-life.html`；未改动历史 `two-dog-themes.html`。

沿用 UI UX Pro Max。针对 `vertical scrolling gestures` 的 UX 查询命中移动端手势冲突规则，本轮采用纵向原生滚动，不增加横向手势或更换设计系统。

## 验证

- [滚动专项检查](../../design/previews/gogo-life/diary-scroll-checks.json)：滚轮前后翻阅、键盘定位、详情返回、换主题保持位置、换狗、减少动态效果、单篇 / 空状态、320 / 375 / 390px 的 125% 字号边界。脚本为 [check_diary_scroll.py](../../scripts/check_diary_scroll.py)。
- [触屏模拟检查](../../design/previews/gogo-life/diary-touch-checks.json)：Chromium 真实触点事件上滑后从第一篇进入第二篇，滑动不误开详情，停稳点击打开详情，返回保持第二篇。脚本为 [check_diary_touch.py](../../scripts/check_diary_touch.py)。
- 原有四页浏览器回归再次通过：12 组主要流程、32 组布局与字号组合，无 JS 运行错误，见[回归报告](../../design/previews/gogo-life/browser-checks.json)。
- 人工查看起始、第二篇、深色与 320px 大字号截图，照片和摘要无边界裁切，底部仅一个「记一笔」。截图位于 `design/previews/gogo-life/diary-scroll-*.png`。

触屏结果来自 Chromium 模拟，iPhone Safari / 原生 iOS 的惯性、VoiceOver 与真机手势仍未验证。原型仍只在页面内存保存内容。
