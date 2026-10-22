"""Package portable mini program sources; exclude private settings, caches and credentials."""
from pathlib import Path
import hashlib
import json
import os
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'wechat/dist'
OUT.mkdir(exist_ok=True)
target = OUT / 'godog-wechat-source.zip'
files = []
for directory, dirs, names in os.walk(ROOT / 'wechat'):
    dirs[:] = [name for name in dirs if name not in {'dist', 'node_modules', '.git', '.tools', 'secrets', '__pycache__'}]
    for name in names:
        path = Path(directory) / name
        if name == 'project.private.config.json' or name.startswith('.env') or path.suffix in {'.key', '.pem', '.p12', '.mobileprovision'}:
            continue
        files.append(path)
files.extend(ROOT / name for name in [
    'doc/steps/02-wechat-foundation.md', 'doc/steps/03-wechat-cloud.md', 'doc/steps/04-wechat-release.md',
    'prd/wechat-release.md', 'prd/notebook.md', 'prd/rouqiu-theme.md', 'doc/steps/02-rouqiu-theme.md'
])
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(path, path.relative_to(ROOT).as_posix())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert 'wechat/project.config.json' in names
    assert 'wechat/miniprogram/app.json' in names
    source_appid = json.loads((ROOT / 'wechat/project.config.json').read_text())['appid']
    assert source_appid == 'touristappid' or re.fullmatch(r'wx[0-9a-f]{16}', source_appid)
    assert json.loads(archive.read('wechat/project.config.json'))['appid'] == source_appid
report = {'path': str(target.relative_to(ROOT)), 'files': len(files), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'privateFilesIncluded': False}
(OUT / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))

# A cumulative runtime-only update does not replace local Developer Tools settings.
theme_target = OUT / 'godog-wechat-rouqiu-theme.zip'
with zipfile.ZipFile(theme_target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted((ROOT / 'wechat/miniprogram').rglob('*')):
        if path.is_file(): archive.write(path, path.relative_to(ROOT / 'wechat').as_posix())
with zipfile.ZipFile(theme_target) as archive:
    assert archive.testzip() is None
    assert all(name.startswith('miniprogram/') for name in archive.namelist())
    for name in archive.namelist(): assert archive.read(name) == (ROOT / 'wechat' / name).read_bytes()
print(json.dumps({'themeUpdate': str(theme_target.relative_to(ROOT)), 'bytes': theme_target.stat().st_size, 'scope':'runtime-only; imagegen photo-style Rouqiu assets and fixed background included'}, ensure_ascii=False))
