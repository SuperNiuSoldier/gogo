// Mechanical encoding only. All character artwork comes from built-in image_gen.
// Preserve the unedited masters and their alpha; no painting, tracing or background removal.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(ROOT, '.tools/browsers');
process.env.LD_LIBRARY_PATH = path.join(ROOT, '.tools/browser-libs/usr/lib/x86_64-linux-gnu');
process.env.TMPDIR = path.join(ROOT, '.tools/tmp');
const { chromium } = require(path.join(ROOT, '.tools/ui-preview/lib/python3.10/site-packages/playwright/driver/package'));
const source = path.join(ROOT, 'design/assets/rouqiu-theme/generated-v2');
const output = path.join(ROOT, 'wechat/miniprogram/assets/rouqiu/photo');
const names = ['food','water','pee','poop','footprints','notebook','scale','pencil','image','bell','logo','sleep','background'];
(async () => {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({args:['--no-sandbox']});
  try {
    const page = await browser.newPage();
    const assets = [];
    for (const name of names) {
      const original = fs.readFileSync(path.join(source, name + '.png'));
      const limit = name === 'background' ? 960 : ['logo','sleep'].includes(name) ? 480 : 256;
      const result = await page.evaluate(async ({data,limit}) => {
        const image = new Image(); image.src = data; await image.decode();
        const ratio = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio);
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let transparent = 0, opaque = 0;
        // The generator may emit 254 (rather than 255) for solid fur pixels.
        for (let i=3;i<pixels.length;i+=4) { if(pixels[i]===0)transparent++; if(pixels[i]>=245)opaque++; }
        return {data:canvas.toDataURL('image/webp', .91),width:canvas.width,height:canvas.height,transparent,opaque};
      }, {data:'data:image/png;base64,' + original.toString('base64'),limit});
      if (!result.data.startsWith('data:image/webp;base64,')) throw new Error('WebP encoder unavailable');
      if (name !== 'background' && (!result.transparent || !result.opaque)) throw new Error('Missing usable transparency: ' + name);
      const bytes = Buffer.from(result.data.split(',')[1], 'base64');
      fs.writeFileSync(path.join(output,name+'.webp'),bytes);
      assets.push({name, file:'photo/'+name+'.webp', width:result.width, height:result.height,bytes:bytes.length,
        transparentPixels:result.transparent,sourceSha256:crypto.createHash('sha256').update(original).digest('hex')});
    }
    const manifest = {name:'肉球',version:2,source:'built-in image_gen; per-asset reference-based generation',
      prompts:'design/assets/rouqiu-theme/generated-v2/prompts.json',format:'WebP; original PNG masters retained in design',
      reference:'User-provided Rouqiu visual reference, kept outside the runtime package',
      modes:['light','dark'],note:'Shared natural fur colors in both modes; no inversion. Generated artwork, not user album records.',assets};
    fs.writeFileSync(path.join(ROOT,'wechat/miniprogram/assets/rouqiu/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    fs.writeFileSync(path.join(source,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log(JSON.stringify({assets:assets.length,bytes:assets.reduce((s,a)=>s+a.bytes,0)}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
