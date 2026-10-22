"""Compile WXML/WXSS locally with pinned WeChat compiler binaries; no login/upload.

These legacy binaries catch template/style syntax errors. They do not replace
compilation in the user's current Developer Tools or any real-device testing.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MINI = ROOT / 'wechat/miniprogram'
WORK = ROOT / '.tools/wechat-compiler'
OUT = ROOT / 'design/previews/wechat'
VERSION = '0.2.3'
URL = f'https://registry.npmjs.org/miniprogram-compiler/-/miniprogram-compiler-{VERSION}.tgz'
SHA512 = 'fcc7c58974c15306319eb4db8f5860c24d7ea8690c0932f5ce2f0845e3aaff448f564531a71d7d13cf70fa88580842c55e431f55b0fee9e8eb1e1dd8d6ee6c56'
WORK.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
archive_path = WORK / f'miniprogram-compiler-{VERSION}.tgz'
if not archive_path.exists():
    with urllib.request.urlopen(URL, timeout=30) as response:
        payload = response.read()
    assert hashlib.sha512(payload).hexdigest() == SHA512, 'Compiler archive integrity mismatch'
    archive_path.write_bytes(payload)
assert hashlib.sha512(archive_path.read_bytes()).hexdigest() == SHA512, 'Compiler archive integrity mismatch'
with tarfile.open(archive_path) as archive:
    # Copy only these known regular files, never execute package install hooks.
    for name in ['bin/linux/wcc', 'bin/linux/wcsc', 'LICENSE', 'package.json']:
        member = archive.getmember('package/' + name)
        assert member.isfile()
        target = WORK / 'package' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.extractfile(member).read())
        if name.startswith('bin/'):
            target.chmod(0o755)


def run(tool, arguments, cwd=MINI):
    return subprocess.run([str(WORK / 'package/bin/linux' / tool), *arguments],
                          cwd=cwd, capture_output=True, text=True, timeout=30)


config = json.loads((MINI / 'app.json').read_text())
templates = sorted(p.relative_to(MINI).as_posix() for p in MINI.rglob('*.wxml'))
wxs = sorted(p.relative_to(MINI).as_posix() for p in MINI.rglob('*.wxs'))
component_args = []
for template in templates:
    config_path = (MINI / template).with_suffix('.json')
    local = json.loads(config_path.read_text()) if config_path.exists() else {}
    if 'usingComponents' in local:
        names = list(local['usingComponents'])
        component_args.append([template, str(len(names)), *names])
components = ' '.join([str(len(component_args)), *[x for group in component_args for x in group]])
styles = sorted(p.relative_to(MINI).as_posix() for p in MINI.rglob('*.wxss'))
page_styles = [page + '.wxss' for page in config['pages'] if page + '.wxss' in styles]
styles = page_styles + [style for style in styles if style not in page_styles]
results = {}
for name, tool, arguments in [
    ('wxml', 'wcc', ['-d', '-cc', components, *templates, *wxs, '-gn', '$gwx']),
    ('wxss', 'wcsc', ['-db', '-pc', str(len(page_styles)), *styles]),
]:
    result = run(tool, arguments)
    (WORK / (name + '.compiled.js')).write_text(result.stdout)
    results[name] = {'exitCode': result.returncode, 'outputBytes': len(result.stdout.encode()),
                     'diagnostics': result.stderr}

versions = {}
for tool in ['wcc', 'wcsc']:
    result = run(tool, [])
    versions[tool] = (result.stdout + result.stderr).splitlines()[0]
report = {
    'package': 'miniprogram-compiler@' + VERSION, 'source': URL,
    'versions': versions,
    'checks': results,
    'scope': 'Local legacy WCC/WCSC syntax compilation; current Windows Developer Tools and real devices not verified',
}
(OUT / 'compiler-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
assert all(item['exitCode'] == 0 and item['outputBytes'] > 0 for item in results.values()), 'Template/style compilation failed'
