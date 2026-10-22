"""Isolated lettering trial: reuses the validated engine, never modifies its source."""
from pathlib import Path
import base64, hashlib, json, re
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT/'design/prototypes/gogo-next'
SOURCE = ROOT/'design/prototypes/gogo-lettering'
OUT = ROOT/'design/previews/gogo-lettering'
OUT.mkdir(exist_ok=True)

def adapt(text):
    return text.replace('gogo-next','gogo-lettering').replace('gogo-exploration','gogo-lettering-exploration')

engine = adapt((BASE/'app.js').read_text())
def replace_once(old,new):
    global engine
    assert engine.count(old)==1,old
    engine=engine.replace(old,new)

replace_once('const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;',
             'const icon = name => direction.lettering === "baseline" ? `<i data-lucide="${name}" aria-hidden="true"></i>` : letteringIcon(name);')
replace_once('root.dataset.direction=direction.id;',
             'root.dataset.direction=direction.id; root.dataset.lettering=direction.lettering;')
replace_once('let data = shared.data || seed(),',
             'if(shared.viewState)Object.assign(state,shared.viewState);\n  let data = shared.data || seed(),')
replace_once('snapshot(){shared.draft=', 'snapshot(){shared.viewState={...state};shared.draft=')
replace_once('privateContent:{variant:direction.id,', 'privateContent:{surface:"lettering",variant:direction.lettering,')

view=adapt((BASE/'view.html').read_text()).replace('Go狗新版交互原型','Go狗字体与图标对照')
for old,new in [('影集','随手写'),('手账','钢笔字'),('日常','原版')]:view=view.replace('>'+old+'<','>'+new+'<')
(SOURCE/'view.html').write_text(view)
js='\n'.join([(SOURCE/'variants.js').read_text(),(SOURCE/'icons.js').read_text(),engine,(SOURCE/'harness.js').read_text()])
marks={}
icon_names={'arrow-up-right','arrow-left','arrow-right','bell','book','calendar','camera','check','chevron-down','chevron-left','chevron-right','chevron-up','circle','download','ellipsis','heart','image','list','moon','notebook','pencil','play','plus','scissors','sun','trash','undo','x','gauge','settings','share','users','paw-print','leaf'}
for name in sorted(icon_names):
    path=ROOT/'design/assets/icons/doodle'/(name+'.svg')
    if not path.exists():continue
    tree=ET.fromstring(path.read_text())
    assert all(child.tag.endswith('path') and set(child.attrib)=={'d'} for child in tree),name
    marks[name]=''.join('<path d="'+child.attrib['d']+'"/>' for child in tree)
js=js.replace('__DOODLE_ICONS__',json.dumps(marks,separators=(',',':')))
css='\n'.join([adapt((BASE/f).read_text()) for f in ['picker.css','forms.css','style.css']])+ '\n'+(SOURCE/'style.css').read_text()
all_text=view+js+css
chars=set(chr(i) for i in range(32,127))|set(re.findall('[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]',all_text))|set('…·—随手写钢笔字散步洗澡驱虫疫苗吃饭喝水提醒肉球格林')
fonts=[]
for source,family,token,license_name,upstream in [
    (ROOT/'.tools/ChillRoundF-v3.ttf','GoDog Lettering Round','__FONT_DATA__','ChillRound-LICENSE.txt','Existing project ChillRound source'),
    (ROOT/'.tools/fonts/Xiaolai-Regular.ttf','GoDog Lettering Hand','__HAND_FONT__','Xiaolai-OFL.txt','https://github.com/lxgw/kose-font/releases/tag/v3.126'),
    (ROOT/'.tools/fonts/LXGWWenKai-Regular.ttf','GoDog Lettering Pen','__PEN_FONT__','LXGWWenKai-OFL.txt','https://github.com/lxgw/LxgwWenKai/releases/tag/v1.522')]:
    font=TTFont(source);missing=[c for c in chars if ord(c) not in font.getBestCmap()];assert not missing,(family,missing)
    names={1:family,2:'Regular',3:family.replace(' ','')+'-20261013',4:family,6:family.replace(' ','')+'-Regular',16:family,17:'Regular',18:family}
    for record in font['name'].names:
        if record.nameID in names:record.string=names[record.nameID].encode(record.getEncoding())
    options=subset.Options();options.name_IDs=['*'];options.name_legacy=True
    sub=subset.Subsetter(options=options);sub.populate(text=''.join(sorted(chars)));sub.subset(font);font.flavor='woff2'
    dest=ROOT/'design/assets/fonts'/(family.lower().replace(' ','-')+'.woff2');font.save(dest)
    css=css.replace(token,'data:font/woff2;base64,'+base64.b64encode(dest.read_bytes()).decode())
    fonts.append({'source':upstream,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'subset':str(dest.relative_to(ROOT)),'renamedFamily':family,'license':license_name,'characters':len(chars),'missing':missing})
photo=ROOT/'design/assets/album-samples/dog-life-contact-sheet-v1.webp'
css=css.replace('__PHOTO_DATA__','data:image/webp;base64,'+base64.b64encode(photo.read_bytes()).decode())
license_text=(ROOT/'design/assets/icons/doodle/LICENSE').read_text()
fragment='<!-- Static Doodle Icons attribution\n'+license_text+'\n-->\n<style>\n'+css+'\n</style>\n'+view+'\n<script>\n(()=>{\n'+js+'\n})();\n</script>\n'
dest=ROOT/'design/previews/gogo-lettering.html';dest.write_text(fragment)
assert dest.stat().st_size<1_000_000
assert not re.search(r'__[A-Z_]+__',fragment)
picker=re.search(r'```css\n(.*?)\n```',(ROOT/'.agents/skills/prototype/PICKER.md').read_text(),re.S).group(1)
assert (BASE/'picker.css').read_text().strip()==picker.strip()
report={'preview':str(dest.relative_to(ROOT)),'bytes':dest.stat().st_size,'fonts':fonts,'engineSource':str((BASE/'app.js').relative_to(ROOT)),'engineSha256':hashlib.sha256((BASE/'app.js').read_bytes()).hexdigest(),'pickerStylesMatchSkill':True,'scope':'Reminder lettering and icon comparison; in-memory data; existing three-tab flows reused'}
(OUT/'build.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(ROOT/'design/assets/fonts/lettering-provenance.json').write_text(json.dumps(fonts,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'bytes':report['bytes'],'fontCharacters':len(chars),'missing':[]},ensure_ascii=False))
