"""Build the isolated three-direction Go狗 exploration; never rewrites gogo-life."""
from pathlib import Path
import base64,json,re
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'design/prototypes/gogo-next'
scripts=['variants/cinema.js','variants/journal.js','variants/everyday.js','app.js','harness.js']
styles=['picker.css','forms.css','style.css']
text='\n'.join((SOURCE/f).read_text() for f in ['view.html',*styles,*scripts])
characters=set(chr(i) for i in range(32,127))|set(re.findall('[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]',text))|set('…·—')
font=TTFont(ROOT/'.tools/ChillRoundF-v3.ttf')
missing=[c for c in characters if ord(c) not in font.getBestCmap()]
assert not missing,missing
names={1:'GoDog Next Round',2:'Regular',3:'GoDogNextRound-20261012',4:'GoDog Next Round',6:'GoDogNextRound-Regular',16:'GoDog Next Round',17:'Regular',18:'GoDog Next Round'}
for record in font['name'].names:
    if record.nameID in names:record.string=names[record.nameID].encode(record.getEncoding())
options=subset.Options();options.name_IDs=['*'];options.name_legacy=True
sub=subset.Subsetter(options=options);sub.populate(text=''.join(sorted(characters)));sub.subset(font);font.flavor='woff2'
font_path=ROOT/'design/assets/fonts/godog-next-round.woff2';font.save(font_path)
def inline(path,mime):return f'data:{mime};base64,'+base64.b64encode(path.read_bytes()).decode()
css='\n'.join((SOURCE/f).read_text() for f in styles).replace('__FONT_DATA__',inline(font_path,'font/woff2')).replace('__PHOTO_DATA__',inline(ROOT/'design/assets/album-samples/dog-life-contact-sheet-v1.webp','image/webp'))
js='\n'.join((SOURCE/f).read_text() for f in scripts)
fragment='<style>\n'+css+'\n</style>\n'+(SOURCE/'view.html').read_text()+'\n<script>\n(()=>{\n'+js+'\n})();\n</script>\n'
destination=ROOT/'design/previews/gogo-next.html';destination.write_text(fragment)
assert destination.stat().st_size<1_000_000
picker=Path(ROOT/'.agents/skills/prototype/PICKER.md').read_text()
assert (SOURCE/'picker.css').read_text().strip()==re.search(r'```css\n(.*?)\n```',picker,re.S).group(1).strip()
report={'preview':str(destination.relative_to(ROOT)),'bytes':destination.stat().st_size,'directions':['影集','手账','日常'],'fontCharacters':len(characters),'fontMissingCharacters':missing,'pickerStylesMatchSkill':True,'photoSource':'Existing AI-generated samples, not the original dog photographs','data':'Shared across variants, in memory only'}
(ROOT/'design/previews/gogo-next/build.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
