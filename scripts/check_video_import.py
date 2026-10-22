"""Exercise local video import/playback in both current prototype surfaces."""
from pathlib import Path
import os,json,base64,struct
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1];FIXTURE=ROOT/'.tools/tmp/video-import';OUT=ROOT/'design/previews/gogo-lettering'
os.environ.update(PLAYWRIGHT_BROWSERS_PATH=str(ROOT/'.tools/browsers'),LD_LIBRARY_PATH=str(ROOT/'.tools/browser-libs/usr/lib/x86_64-linux-gnu'),TMPDIR=str(ROOT/'.tools/tmp'))
checks=[];errors=[]
TRACK='''window.__mediaURLs=new Set();window.__releasedURLs=[];
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=o=>{const u=create(o);window.__mediaURLs.add(u);return u};
URL.revokeObjectURL=u=>{window.__mediaURLs.delete(u);window.__releasedURLs.push(u);return revoke(u)};'''
def prepare_fixture(browser):
    """Create media from a test canvas; no user photos or external codecs required."""
    FIXTURE.mkdir(parents=True,exist_ok=True)
    fixture_page=browser.new_page()
    media=fixture_page.evaluate('''async()=>{
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
        const ctx=canvas.getContext('2d'),stream=canvas.captureStream(20),chunks=[];
        const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});
        recorder.ondataavailable=e=>chunks.push(e.data);
        const stopped=new Promise(resolve=>recorder.onstop=resolve);
        recorder.start();
        for(let frame=0;frame<16;frame++){
            ctx.fillStyle='#d0b990';ctx.fillRect(0,0,320,240);
            ctx.fillStyle='#353e36';ctx.fillRect(20+frame*12,80,70,70);
            ctx.font='18px sans-serif';ctx.fillText('VIDEO IMPORT TEST',40,205);
            await new Promise(resolve=>setTimeout(resolve,100));
        }
        recorder.stop();await stopped;stream.getTracks().forEach(track=>track.stop());
        const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());
        return {video:btoa(String.fromCharCode(...bytes)),photo:canvas.toDataURL('image/png').split(',')[1]};
    }''')
    fixture_page.close()
    video=base64.b64decode(media['video'])
    # MediaRecorder omits duration. Add a standard EBML Duration (ms) to Segment Info.
    offset=video.index(bytes.fromhex('1549a966'))+4
    width=next(n for n in range(1,9) if video[offset]&(1<<(8-n)))
    size=int.from_bytes(video[offset:offset+width],'big')&((1<<(7*width))-1)
    info_end=offset+width+size
    duration=bytes.fromhex('448988')+struct.pack('>d',1600)
    new_size=size+len(duration)
    new_width=next(n for n in range(1,9) if new_size<(1<<(7*n))-1)
    encoded_size=((1<<(7*new_width))|new_size).to_bytes(new_width,'big')
    video=video[:offset]+encoded_size+video[offset+width:info_end]+duration+video[info_end:]
    (FIXTURE/'test-video.webm').write_bytes(video)
    (FIXTURE/'test-photo.png').write_bytes(base64.b64decode(media['photo']))
    (FIXTURE/'bad-video.mp4').write_bytes(b'Invalid media fixture')
def act(name,**attrs):f.locator('[data-action="'+name+'"]'+''.join(f'[data-{k}="{v}"]' for k,v in attrs.items())).click()
def close():act('close');expect(f.locator('.overlay-host [role="dialog"]')).to_have_count(0)
def fresh(surface='gogo-lettering',variant=0):
    global f
    page.goto((ROOT/('.tools/'+surface+'-check.html')).as_uri());f=page.frames[1]
    f.locator('.proto-picker-item').nth(variant).click();f.locator('.pet-bar').wait_for()
    act('tab',tab='prints');f.evaluate('document.fonts.ready')
def select(files):
    with page.expect_file_chooser() as chooser:act('import')
    expect(f.locator('.media-input')).to_have_attribute('accept','image/*,video/*')
    chooser.value.set_files([str(FIXTURE/name) for name in files])
def active_video():
    expect(f.locator('.overlay-host video')).to_have_count(1)
    f.wait_for_function('document.querySelector(".overlay-host video").readyState>=2')
    return f.locator('.overlay-host video')
def play():
    video=active_video();assert video.evaluate('v=>v.paused')
    video.evaluate('async v=>{window.__playingVideo=v;await v.play()}')
    f.wait_for_function('window.__playingVideo.currentTime>0.1');return video

with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox'])
    prepare_fixture(browser)
    page=browser.new_page(viewport={'width':422,'height':1000});page.add_init_script(TRACK)
    page.on('pageerror',lambda e:errors.append(str(e)))
    for surface in ['gogo-next','gogo-lettering']:
        for variant in range(3):
            fresh(surface,variant);before=f.locator('.diary-paper').count()
            select([]);expect(f.locator('.diary-paper')).to_have_count(before)
            select(['test-video.webm']);video=active_video()
            assert video.evaluate('v=>v.paused&&!v.autoplay&&v.controls&&v.playsInline')
            duration=video.evaluate('v=>v.duration')
            assert 1<duration<2.5
            assert video.get_attribute('poster').startswith('data:image/jpeg')
            assert video.get_attribute('src').startswith('blob:')
            video.focus();video.press('ArrowRight')
            expect(f.locator('.overlay-host video')).to_have_count(1)
            assert f.locator('.proto-picker-item[data-active]').text_content()==f.locator('.proto-picker-item').nth(variant).text_content()
            play();video.evaluate('v=>v.currentTime=.7');f.wait_for_function('window.__playingVideo.currentTime>=.7')
            close();assert f.evaluate('window.__playingVideo.paused')
            expect(f.locator('.diary-paper')).to_have_count(before+1)
            expect(f.locator('.diary-card .video-thumb')).to_have_count(1)
            expect(f.locator('.diary-card .media-badge')).to_contain_text(f'0:{int(duration+.5):02d}')
            f.locator('.diary-card').click();play();close()
            act('tab',tab='weight');expect(f.locator('.growth-moment .video-thumb')).to_have_count(1)
            act('tab',tab='prints');act('theme');f.locator('.diary-card').click();play();close()
            if surface=='gogo-lettering' and variant==0:
                expect(f.locator('.toast')).to_be_hidden(timeout=8000)
                f.locator('.app-shell').screenshot(path=str(OUT/'video-card-dark.png'))
                f.locator('.diary-card').click();active_video();page.wait_for_timeout(250)
                f.locator('.app-shell').screenshot(path=str(OUT/'video-detail-dark.png'));close()
            checks.append(surface+f' variant {variant+1}: cancel, import, poster/duration, paused by default, play/seek/close, video keyboard does not switch design, diary and timeline, dark mode')

    fresh();select(['test-video.webm','test-photo.png','bad-video.mp4'])
    active_video();expect(f.locator('.toast')).to_contain_text('1 张照片、1 段视频')
    expect(f.locator('.toast')).to_contain_text('1 项未导入')
    assert f.evaluate('window.__mediaURLs.size')==1
    close();expect(f.locator('.diary-paper')).to_have_count(5)
    checks.append('Mixed batch: valid photo + video each create one diary; corrupt video skipped and temporary URL released')
    # Select the video via the full record list, so scroll/snap does not affect this test.
    act('prints-mode',mode='all');f.locator('.record-row:has(.video-thumb)').click();play()
    f.locator('.proto-picker-item').nth(1).click()
    expect(f.locator('#gogo-lettering')).to_have_attribute('data-lettering','pen')
    assert f.evaluate('window.__playingVideo.paused&&window.__mediaURLs.size===1')
    f.locator('.record-row:has(.video-thumb)').click();play();close()
    checks.append('Accepted blob survives variant remount; previous player pauses, video reopens')

    fresh();select(['bad-video.mp4'])
    expect(f.locator('.toast')).to_contain_text('无法读取',timeout=18000)
    expect(f.locator('.diary-paper')).to_have_count(3)
    assert f.evaluate('window.__mediaURLs.size')==0
    checks.append('Unreadable video creates no record and leaks no object URL')

    fresh()
    f.evaluate('''()=>{const original=Image.prototype.decode;Image.prototype.decode=async function(){await new Promise(r=>setTimeout(r,700));return original.call(this)}}''')
    select(['test-photo.png','test-video.webm']);act('pet',pet='gelin')
    expect(f.locator('.toast')).to_contain_text('1 段视频',timeout=18000)
    expect(f.locator('.video-thumb')).to_have_count(0);expect(f.locator('.diary-paper')).to_have_count(3)
    act('pet',pet='rouqiu');expect(f.locator('.diary-paper')).to_have_count(5)
    expect(f.locator('.video-thumb')).to_have_count(1)
    checks.append('Pet switched during import: entire mixed batch stays with initiating pet')

    fresh();select(['test-video.webm']);active_video();close()
    act('tab',tab='weight');act('notebook-add');act('add-weight');act('pick-photo')
    expect(f.locator('.photo-options .video-thumb')).to_have_count(0)
    with page.expect_file_chooser() as chooser:act('editor-import')
    expect(f.locator('.media-input')).to_have_attribute('accept','image/*');chooser.value.set_files([])
    act('back-editor');close();act('tab',tab='prints')
    with page.expect_file_chooser() as chooser:act('camera')
    expect(f.locator('.camera-input')).to_have_attribute('accept','image/*')
    expect(f.locator('.camera-input')).to_have_attribute('capture','environment')
    chooser.value.set_files(str(FIXTURE/'test-photo.png'))
    expect(f.locator('.viewer')).to_have_count(1);expect(f.locator('.viewer video')).to_have_count(0);close()
    expect(f.locator('.diary-paper')).to_have_count(5)
    checks.append('Weight attachments remain photos; quick camera remains image capture and creates one diary')

    fresh();select(['test-video.webm']);active_video();close();f.locator('.diary-card').click();act('edit-entry')
    f.locator('[name="text"]').fill('今天一起散步');act('save-editor')
    expect(f.locator('.diary-paper')).to_have_count(4)
    expect(f.locator('.diary-card')).to_contain_text('今天一起散步')
    f.locator('.diary-card').click();play()
    f.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))')
    assert f.evaluate('window.__playingVideo.paused')
    checks.append('Video diary edits keep attachment and do not duplicate record; hiding page pauses playback')
    # Native controls and all modal actions must remain inside a narrow phone.
    fresh();select(['test-video.webm']);active_video()
    for width in [320,375,390]:
        page.set_viewport_size({'width':width+32,'height':1000})
        for text_size in ['1','1.25']:
            f.locator('#gogo-lettering').evaluate('(el,size)=>el.style.setProperty("--size",size)',text_size)
            metrics=f.locator('.viewer').evaluate('''el=>{
                const r=el.getBoundingClientRect(),v=el.querySelector('video').getBoundingClientRect();
                return {fits:el.scrollWidth<=el.clientWidth+1&&v.left>=r.left&&v.right<=r.right+1&&v.bottom<=r.bottom,controls:el.querySelector('video').controls};
            }''')
            assert metrics['fits'] and metrics['controls'],(width,text_size,metrics)
    checks.append('Video viewer fits 320/375/390 px phone widths at standard and 125% text size')
    assert not errors,errors
    browser.close()

report={'checks':checks,'errors':errors,'testedCodec':'Canvas-generated WebM / VP8, approximately 1.6 seconds','realPhoneCameraAndMOVHEVCVerified':False,'dataPersistsAfterReload':False}
for folder in ['gogo-next','gogo-lettering']:
    (ROOT/'design/previews'/folder/'video-import-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'errors':errors},ensure_ascii=False))
