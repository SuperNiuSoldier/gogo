"""Build the self-contained, reviewable Go狗 prototype from readable sources."""
from pathlib import Path
import base64
import json
import re
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'design/prototypes/gogo-life'
text = '\n'.join((SOURCE / name).read_text() for name in ('view.html', 'style.css', 'app.js'))
characters = set(chr(i) for i in range(32, 127)) | set(re.findall('[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]', text)) | set('…·—')
font = TTFont(ROOT / '.tools/ChillRoundF-v3.ttf')
missing = [c for c in characters if ord(c) not in font.getBestCmap()]
assert not missing, missing
names = {1: 'GoDog Life Round', 2: 'Regular', 3: 'GoDogLifeRound-20261012', 4: 'GoDog Life Round', 6: 'GoDogLifeRound-Regular', 16: 'GoDog Life Round', 17: 'Regular', 18: 'GoDog Life Round'}
for record in font['name'].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
options = subset.Options()
options.name_IDs = ['*']
options.name_legacy = True
sub = subset.Subsetter(options=options)
sub.populate(text=''.join(sorted(characters)))
sub.subset(font)
font.flavor = 'woff2'
font_path = ROOT / 'design/assets/fonts/godog-life-round.woff2'
font.save(font_path)

def inline(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()

style = (SOURCE / 'style.css').read_text().replace('__FONT_DATA__', inline(font_path, 'font/woff2')).replace('__PHOTO_DATA__', inline(ROOT / 'design/assets/album-samples/dog-life-contact-sheet-v1.webp', 'image/webp'))
fragment = f'<style>\n{style}</style>\n' + (SOURCE / 'view.html').read_text() + '\n<script>\n' + (SOURCE / 'app.js').read_text() + '</script>\n'
destination = ROOT / 'design/previews/gogo-life.html'
destination.write_text(fragment)
assert destination.stat().st_size < 1_000_000
report = {'preview':str(destination.relative_to(ROOT)), 'bytes':destination.stat().st_size, 'fontCharacters':len(characters),'fontMissingCharacters':missing,'photoSource':'AI-generated contact sheet; not original dog photographs','data':'in-memory synthetic examples; no persistence or uploads'}
(ROOT / 'design/previews/gogo-life/build.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False))
