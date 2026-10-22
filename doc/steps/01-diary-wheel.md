# 日记改为上下轮轴滚动

日期：2026-10-12。阶段 01 原型修正，待用户评审。

后续反馈：用户否定三维轮轴，明确要求正面上下滑动、划走后呈毛玻璃般的模糊。本文件为历史尝试；当前方案见[滑动与毛玻璃](01-diary-frost-scroll.md)。

## 输入与决定

用户明确指出「这个滚动方式不对，要类似上下滚动方式，轮轴滚动」。[上一轮](01-diary-scroll.md)仅让纸卡平移、缩放和改变层级，没有沿轮轴翻转，不能作为本需求的完成状态。

当前方案为绕横轴旋转的纸卡轮轴：中间卡正面展开，前一篇在上方，后一篇在下方；上滑时当前卡向上翻出、后一篇从下方转入。按真实时间顺序滚动，首尾不循环。页头、记录按钮与五入口保持位置，不增加操作说明或可见控制项。需求同步至[脚印 PRD](../../prd/daily-quick-recording.md)及[视觉规范](../../prd/two-dog-visual-system.md)。

## 实现

- [app.js](../../design/prototypes/gogo-life/app.js) 保留浏览器原生滚动、惯性与停靠，用连续滚动位置计算每张卡片的圆周位置、深度和 X 轴旋转。相邻位置相隔 64°，圆柱半径按最大卡片高度计算，防止大字号时相邻卡面相交。这些是当前原型参数，尚未获用户确认。
- [style.css](../../design/prototypes/gogo-life/style.css) 为卡片区域建立 900px 透视和中心旋转原点；当前卡保持原尺寸与正面阅读，相邻卡沿弧面收进背景。只展示面向用户的真实卡片，单篇时没有假卡。
- 滑动过程中旋转持续跟手，抬手后停靠，不等手势结束才播放预设动画。滑动不误开详情；点当前卡仍打开全文。关闭详情、换主题保留当前篇，换狗按该狗的记录展示。
- 保留键盘上下、Page Up / Down、Home / End 定位与焦点移动。系统减少动态效果时，关闭三维旋转，只显示当前正面卡并静态换篇；仍可滚动与键盘操作，偏好变化即时生效。
- 已重新构建 [当前预览](../../design/previews/gogo-life.html)，原有图片、双主题和五入口沿用。历史 `two-dog-themes.html` 未修改。

## 验证结果

- [滚动专项检查](../../design/previews/gogo-life/diary-scroll-checks.json)通过：中央卡正面、前后卡分别在上下方、旋转方向相反且向后退；滚轮逐篇、详情返回、连续键盘翻阅、换主题保留位置、切狗、单篇 / 空状态与减少动态效果均通过。脚本：[check_diary_scroll.py](../../scripts/check_diary_scroll.py)。
- [触屏模拟检查](../../design/previews/gogo-life/diary-touch-checks.json)通过：按住并上滑期间采集 12 个位置，倾角持续变化；中途两张卡同时沿相反倾角转动，抬手停靠第二篇；滑动不打开详情，停稳后点击可打开并返回原位置。脚本：[check_diary_touch.py](../../scripts/check_diary_touch.py)。
- 原有[四页回归](../../design/previews/gogo-life/browser-checks.json) 12 组流程通过；[布局检查](../../design/previews/gogo-life/layout-checks.json) 32 组通过，包含 320 / 375 / 390px、横屏容器与 125% 字号，无 JS 错误。仅证明浏览器原型，不代表 iOS 安全区或 Dynamic Type 验收。
- 人工查看[滑动中间帧](../../design/previews/gogo-life/diary-wheel-midgesture.png)、[停靠中间篇](../../design/previews/gogo-life/diary-scroll-middle.png)、[黑棕主题](../../design/previews/gogo-life/diary-scroll-dark.png)及[320px 大字号](../../design/previews/gogo-life/diary-scroll-large-320.png)：上下卡片形成透视旋转，当前卡完整可读，记录按钮和底栏稳定。

## 遗留问题

触屏验证使用 Chromium 模拟；iPhone Safari / 原生 iOS 的惯性、VoiceOver 与真机手势未验证。原型数据仍在内存中，原生业务阶段未开始。轮轴的倾角、间距和跟手体验待用户在预览中评审。
