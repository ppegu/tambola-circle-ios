"""ADB diagnostics for the explicitly connected test phone. Files stay on D:."""
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'artifacts' / 'android-qa'
OUT.mkdir(parents=True, exist_ok=True)
ADB = r'D:\ExamAssist\.android-sdk\platform-tools\adb.exe'
os.environ['ANDROID_SDK_HOME'] = r'D:\BuildCache\android-user'
os.environ['ANDROID_PREFS_ROOT'] = r'D:\BuildCache\android-user'
os.environ['ANDROID_USER_HOME'] = r'D:\BuildCache\android-user'
devices = subprocess.check_output([ADB, 'devices'], text=True).splitlines()[1:]
devices = [line.split('\t', 1)[0] for line in devices if '\tdevice' in line]
selected = os.environ.get('CIRCLE_QA_DEVICE')
if selected:
    devices = [device for device in devices if device == selected]
if len(devices) != 1:
    raise SystemExit('Exactly one connected test device is required.')

def adb(*args):
    return subprocess.check_output([ADB, '-s', devices[0], *args])

action = sys.argv[1]
if action in ('ui', 'screenshot'):
    foreground = adb('shell', 'dumpsys', 'activity', 'activities').decode(errors='replace')
    resumed = '\n'.join(line for line in foreground.splitlines() if re.search(r'(?:topResumedActivity|mResumedActivity)\s*[:=]', line))
    allowed_foreground = ('com.ppegu.tambola', 'com.ppegu.tambola.dev', 'com.google.android.gms', 'com.android.packageinstaller', 'com.android.packageinstaller', 'com.android.permissioncontroller', 'com.oplus.packageinstaller')
    if not any(package in resumed for package in allowed_foreground):
        raise SystemExit('The test app or installer is not in the foreground; no screen captured.')
if action == 'screenshot':
    name = sys.argv[2]
    if not re.fullmatch(r'[a-z0-9-]+', name):
        raise SystemExit('Use a simple screenshot name.')
    target = OUT / (name + '.png')
    target.write_bytes(adb('exec-out', 'screencap', '-p'))
    print(target)
elif action == 'ui':
    # Android sometimes returns success but no hierarchy during a transition.
    # Never reuse the preceding screen's controls in that case.
    for attempt in range(3):
        result = adb('shell', 'uiautomator', 'dump', '/data/local/tmp/circle-qa-ui.xml')
        if b'dumped to' in result:
            break
        time.sleep(0.6)
    else:
        raise SystemExit('Android UI is transitioning; no fresh controls captured.')
    data = adb('shell', 'cat', '/data/local/tmp/circle-qa-ui.xml')
    tree = ET.fromstring(data)
    allowed = ('com.ppegu.tambola', 'com.ppegu.tambola.dev', 'com.google.android.gms', 'com.android.packageinstaller', 'com.android.packageinstaller', 'com.android.permissioncontroller', 'com.oplus.packageinstaller')
    nodes = [n for n in tree.iter('node') if (n.get('package') or '').startswith(allowed)]
    # A user may switch apps while testing. Never record unrelated app content.
    safe = ET.Element('hierarchy')
    for n in nodes:
        ET.SubElement(safe, 'node', n.attrib)
    (OUT / 'current-ui.xml').write_bytes(ET.tostring(safe))
    if not nodes:
        print('The test app or installer is not in the foreground.')
    for node in nodes:
        label = node.get('content-desc') or node.get('text')
        if label:
            if label == 'Blank' or re.fullmatch(r'\d{1,2}(, (not )?called)?', label):
                continue
            label = re.sub(r'\+?\d[\d -]{7,}\d', '[number hidden]', label)
            print(node.get('bounds'), node.get('class').split('.')[-1], label)
elif action == 'tap':
    print(adb('shell', 'input', 'tap', sys.argv[2], sys.argv[3]).decode())
elif action == 'press':
    label = sys.argv[2]
    # Refresh bounds after Metro layout updates; never tap a stale position.
    subprocess.run([sys.executable, __file__, 'ui'], check=True, stdout=subprocess.DEVNULL)
    matches = [n for n in ET.parse(OUT / 'current-ui.xml').iter('node') if (n.get('content-desc') or n.get('text')) == label]
    clickable = [n for n in matches if n.get('clickable') == 'true']
    if clickable:
        matches = clickable
    if len(matches) != 1:
        raise SystemExit(f'Expected one previously observed control, found {len(matches)}.')
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', matches[0].get('bounds')))
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
elif action == 'text':
    value = sys.argv[2]
    if not re.fullmatch(r'[A-Za-z0-9 +.-]+', value):
        raise SystemExit('Only simple test text is supported.')
    adb('shell', 'input', 'text', value.replace(' ', '%s'))
elif action == 'swipe':
    print(adb('shell', 'input', 'swipe', *sys.argv[2:]).decode())
elif action == 'back':
    adb('shell', 'input', 'keyevent', '4')
else:
    raise SystemExit('Use screenshot, ui, press LABEL, text VALUE, tap, swipe or back.')
