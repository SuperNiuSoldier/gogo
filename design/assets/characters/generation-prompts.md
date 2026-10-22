# 角色动作帧生成记录

2026-10-10，使用内置 image_gen 工具（imagegen skill），不是 CLI/API 回退。参考图为项目中的 `../rouqiu-gelin-portraits-v1.png`，参考其左右两只独立角色。

最终候选：肉球 `rouqiu-actions-v1.png`；格林 `gelin-actions-v2.png`。格林第二稿仍有一帧抬错爪，播放序列排除了第 6 帧（从 0 计数），不将它接入动画。网页 WebP 为等比例缩小和格式压缩，未重绘角色内容。

项目内最终资产：

- [肉球原始动作图集](rouqiu-actions-v1.png)、[肉球网页图集](rouqiu-actions-preview.webp)。
- [格林原始动作图集](gelin-actions-v2.png)、[格林网页图集](gelin-actions-preview.webp)。
- [帧网格、固定脚掌对齐参数与播放顺序](sprite-manifest.json)。

原 PNG 为 1448×1086，4×3 个正方形单元；网页图集为 1024×768，保留透明通道。肉球网页图集约 228 KB，格林约 171 KB。

## 格林连续性修正提示词

Edit the supplied Gelin animation sprite sheet. This is a precision animation continuity correction.
Keep the same 4 columns x 3 rows, exactly equal square cells, transparent alpha background, identical art style, face, markings, size, seated pelvis, and registration. Preserve every frame's character identity.
Critical correction: the dog must lift ONLY the foreleg on the VIEWER'S LEFT for the ENTIRE greeting sequence. It must never change which paw it lifts. The forepaw on the VIEWER'S RIGHT remains firmly planted at exactly the same ground position in every frame. Do not mirror the whole dog.
Fix row 2 column 2 and row 2 column 3, which currently lift the wrong foreleg: lower the viewer-right foreleg and raise the viewer-left foreleg progressively, matching the later wave poses in row 2 column 4 and row 3 columns 1–2. Row 2 column 2 = viewer-left paw just lifted, elbow bends. Row 2 column 3 = viewer-left paw chest-high, palm beginning to rotate outward. Row 2 column 4 and row 3 column 1 = viewer-left paw pads facing viewer, a friendly wave. Row 3 column 2 = viewer-left paw lowering to chest. Row 3 column 3 = viewer-left paw almost touching floor. Row 3 column 4 = both paws planted again.
Keep row 1's open / half closed / closed / open eye blink poses. Keep the head tilts and subtle wagging tail, but keep torso, hips and planted paw fixed. Same black coat, soft floppy ears, paired tan eyebrow dots, tan cheek patches and legs, dark sage collar. No white fur, no upright ears.
Entire background genuinely transparent, no opaque rectangles, ground, checkerboard or text. No extra limbs. No foot sliding. No full-body rotating or changing scale.

## 肉球初稿

Use case: stylized-concept. Asset type: transparent animation sprite atlas for a tappable pet in an iOS app.
Create ONE precisely registered 4-column by 3-row sprite sheet (12 equal square cells, 4:3 whole canvas). No margins between cells, no grid lines, no labels, no words, no decorations. Every cell contains the SAME full-body seated dog at the SAME scale, camera angle, pelvis position, and planted-foot baseline. The dog occupies about 76% of cell height, with generous transparent padding on all sides. Genuine transparent alpha throughout background, NO backdrop, floor, ellipse, badge, tile, shadow plate, checkerboard, scenery, furniture, or opaque white rectangles.
Match the elegant, soft detailed fur illustration style and exact character identity in the reference. Maintain identical lighting and body proportions across all cells. Do not redraw as generic emoji/cartoon, do not merge the two dogs. Feet/pelvis must not shift between frames. Animate body parts, not whole-image rotation.
Frames ordered left-to-right, top-to-bottom:
0: neutral seated, both forepaws planted, eyes open.
1: same pose and head position, eyelids half closed.
2: same pose and head position, eyes gently fully closed (blink).
3: EXACT same neutral open-eyed pose as frame 0.
4: starts an inquisitive small head tilt, paws planted.
5: tilts head a little more, begins lifting the forepaw on viewer's right.
6: forepaw raised chest-high, elbow bent; other forepaw and pelvis stay planted.
7: raised paw extends toward viewer in a friendly waving motion; paw pads visible.
8: raised paw waves outward slightly, with a happy expression.
9: raised paw returns toward chest while the head straightens.
10: paw lowers almost to floor, face returning neutral.
11: EXACT same planted-paw neutral pose as frame 0.
The frames must have visibly distinct articulated eyes/head/foreleg positions with coherent anatomy. This is a production animation sheet, not a contact sheet of unrelated portraits.
Subject: ONLY the WHITE dog on the LEFT of the reference, Rouqiu. Cream-white long fluffy coat, small upright triangular ears, very full neck ruff, dark round eyes, black nose, muted sage triangular bandana. Preserve this dog's face. No tan eyebrows, no black coat, no floppy ears. Tail is fluffy and tucked behind the body; keep it unobtrusive. In action frames 6–9 the raised white paw clearly changes shape and position.

## 格林初稿

Use case: stylized-concept. Asset type: transparent animation sprite atlas for a tappable pet in an iOS app.
Create ONE precisely registered 4-column by 3-row sprite sheet (12 equal square cells, 4:3 whole canvas). No margins between cells, no grid lines, no labels, no words, no decorations. Every cell contains the SAME full-body seated dog at the SAME scale, camera angle, pelvis position, and planted-foot baseline. The dog occupies about 76% of cell height, with generous transparent padding on all sides. Genuine transparent alpha throughout background, NO backdrop, floor, ellipse, badge, tile, shadow plate, checkerboard, scenery, furniture, or opaque white rectangles.
Match the elegant, soft detailed fur illustration style and exact character identity in the reference. Maintain identical lighting and body proportions across all cells. Do not redraw as generic emoji/cartoon, do not merge the two dogs. Feet/pelvis must not shift between frames. Animate body parts, not whole-image rotation.
Frames ordered left-to-right, top-to-bottom:
0: neutral seated, both forepaws planted, eyes open.
1: same pose and head position, eyelids half closed.
2: same pose and head position, eyes gently fully closed (blink).
3: EXACT same neutral open-eyed pose as frame 0.
4: starts an inquisitive small head tilt, paws planted.
5: tilts head a little more, begins lifting the forepaw on viewer's right.
6: forepaw raised chest-high, elbow bent; other forepaw and pelvis stay planted.
7: raised paw extends toward viewer in a friendly waving motion; paw pads visible.
8: raised paw waves outward slightly, with a happy expression.
9: raised paw returns toward chest while the head straightens.
10: paw lowers almost to floor, face returning neutral.
11: EXACT same planted-paw neutral pose as frame 0.
The frames must have visibly distinct articulated eyes/head/foreleg positions with coherent anatomy. This is a production animation sheet, not a contact sheet of unrelated portraits.
Subject: ONLY the BLACK-AND-TAN dog on the RIGHT of the reference, Gelin. Black long coat, floppy wide ears, distinctive paired tan eyebrow dots, tan cheeks/muzzle sides, tan front legs/paws, warm brown eyes, dark sage collar. Preserve this dog's face and markings. No white fur or upright ears. Show a fluffy black tail peeking out on the viewer's left beside the haunch; during frames 4–10 its tip sweeps from left to right and back while its base stays attached. Head tilts with floppy ears following; in action frames 6–9 the tan forepaw clearly lifts and waves.
