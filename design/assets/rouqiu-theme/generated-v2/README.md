# 肉球 · 照片质感主题素材

2026-10-13，使用 **内置 image_gen 工具**，按用户提供的近景萨摩耶参考图逐枚生成。共 13 次生成、13 个独立素材；没有拼图裁切、程序描摹或用通用卡通替代。

当前目录保存原始 PNG。实际提示词见 [prompts.json](prompts.json)，调用来源与参考关系见 [generation.json](generation.json)，压缩尺寸、字节及原图 SHA-256 见 [manifest.json](manifest.json)。参考只保存在被忽略的 `design/references/private/rouqiu/style-reference.png`，未打进小程序包。

| 文件 | 用途 |
|---|---|
| food.png | 伏在碗边吃饭 |
| water.png | 舔水与水碗 |
| pee.png | 抬起后腿 |
| poop.png | 蹲下与小便便标识 |
| footprints.png | 抬前爪迈步 |
| notebook.png | 趴在打开的日记本上 |
| scale.png | 站上体重秤 |
| pencil.png | 叼铅笔、歪头 |
| image.png | 前爪搭着影集 |
| bell.png | 按小铃铛 |
| logo.png | 贴近镜头的表情 |
| sleep.png | 团起来休息 |
| background.png | 固定近景写真背景 |

前 12 张含透明背景；背景图为不透明竖幅。图中动作是依据参考生成的主题形象，不作为肉球真实经历或用户相册记录。

运行资产在 `wechat/miniprogram/assets/rouqiu/photo/*.webp`。`scripts/package_rouqiu_images.js` 只等比例缩小和格式压缩，保留生成的 alpha 与原始 PNG；两种明暗共用白毛素材。关闭、加号等通用按钮继续使用既有清晰符号。

本轮已接入原生小程序，用户视觉认可与微信真机效果仍待确认。
