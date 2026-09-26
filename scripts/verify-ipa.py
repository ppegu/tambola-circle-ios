"""Validate the actual downloadable IPA without Apple tooling (also runs on Windows)."""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import plistlib
import struct
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_device_executable(data):
    require(len(data) >= 32, "Missing Mach-O executable")
    magic, cpu, _, filetype, ncmds, _, _, _ = struct.unpack_from("<8I", data)
    require(magic == 0xFEEDFACF and cpu == 0x0100000C and filetype == 2,
            "Expected a 64-bit arm64 device executable")
    offset = 32
    platform = None
    for _ in range(ncmds):
        require(offset + 8 <= len(data), "Truncated Mach-O load commands")
        command, size = struct.unpack_from("<2I", data, offset)
        require(size >= 8 and offset + size <= len(data), "Invalid Mach-O load command")
        if command == 0x32:  # LC_BUILD_VERSION: 2 = iOS, 7 = iOS Simulator
            require(size >= 24, "Invalid LC_BUILD_VERSION")
            platform = struct.unpack_from("<I", data, offset + 8)[0]
        offset += size
    require(platform == 2, "Executable must target iOS devices, not the simulator")


def verify_ipa(ipa_path, config, voices):
    with zipfile.ZipFile(ipa_path) as ipa:
        names = ipa.namelist()
        require(len(names) == len(set(names)), "IPA contains duplicate ZIP entries")
        require(all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts
                    for n in names), "Unsafe IPA archive paths")
        apps = {n.split('/')[1] for n in names if n.startswith('Payload/')
                and len(n.split('/')) >= 3 and n.split('/')[1].endswith('.app')}
        require(len(apps) == 1, "IPA must contain exactly one Payload/*.app")
        base = f"Payload/{next(iter(apps))}/"
        info = plistlib.loads(ipa.read(base + 'Info.plist'))
        require(info.get('CFBundleDisplayName') == config['displayName'], "Incorrect app display name")
        require(info.get('CFBundleIdentifier') == config['ios']['bundleIdentifier'], "Incorrect bundle ID")
        require(info.get('CFBundleShortVersionString') == config['version'], "Incorrect app version")
        require(info.get('CFBundleSupportedPlatforms') == ['iPhoneOS'], "IPA is not a device build")
        require(info.get('CFBundlePackageType') == 'APPL', "Invalid app bundle type")
        require(not any(n.startswith(base + '_CodeSignature/') for n in names),
                "Main app must be unsigned for this distribution")
        require(base + 'embedded.mobileprovision' not in names, "Unexpected provisioning profile")
        permissions = [key for key in info if key.startswith('NS') and key.endswith('UsageDescription')]

        EXPECTED_PERMISSIONS = {
            'NSMicrophoneUsageDescription': 'Speak with players at your table when you unmute your microphone.'
        }

        # 1. Ensure no unexpected permissions slipped in
        unexpected = [k for k in permissions if k not in EXPECTED_PERMISSIONS]
        require(not unexpected, f"Unexpected permission prompt descriptions: {unexpected}")

        require(not info.get('UIBackgroundModes'), "Unexpected background capabilities")
        executable = info['CFBundleExecutable']
        require('/' not in executable and '\\' not in executable, "Invalid executable name")
        entry = ipa.getinfo(base + executable)
        require((entry.external_attr >> 16) & 0o111, "App executable lost its executable permission")
        verify_device_executable(ipa.read(entry))
        require(base + 'main.jsbundle' in names and ipa.getinfo(base + 'main.jsbundle').file_size > 1000,
                "Standalone JavaScript bundle missing")
        wavs = [n for n in names if n.startswith(base) and n.endswith('.wav')]
        actual = Counter(hashlib.sha256(ipa.read(n)).hexdigest() for n in wavs)
        expected = Counter(clip['sha256'] for clip in voices)
        require(actual == expected, "Offline voice files are missing, changed, or duplicated")
        return {
            'file': Path(ipa_path).name,
            'name': info['CFBundleDisplayName'],
            'bundleIdentifier': info['CFBundleIdentifier'],
            'version': info['CFBundleShortVersionString'],
            'buildNumber': info['CFBundleVersion'],
            'minimumIOSVersion': info.get('MinimumOSVersion'),
            'architecture': 'arm64',
            'platform': 'iPhoneOS',
            'signed': False,
            'standaloneJavaScript': True,
            'verifiedVoiceClips': len(wavs),
            'permissionPromptDescriptions': permissions,
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ipa', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    config = json.loads((ROOT / 'app.json').read_text(encoding='utf-8'))
    catalog = json.loads((ROOT / 'shared/voicePacks.json').read_text(encoding='utf-8'))
    voices = [clip for pack in catalog['packs'] for clip in pack['files']
              if pack['bundled'] or clip['number'] == 47]
    report = verify_ipa(args.ipa, config, voices)
    report.update({
        'sha256': hashlib.sha256(args.ipa.read_bytes()).hexdigest(),
        'sizeBytes': args.ipa.stat().st_size,
        'sourceCommit': os.environ.get('GITHUB_SHA'),
        'workflowRun': os.environ.get('GITHUB_RUN_ID'),
    })
    result = json.dumps(report, indent=2) + '\n'
    if args.output:
        args.output.write_text(result, encoding='utf-8')
    print(result, end='')


if __name__ == '__main__':
    main()
