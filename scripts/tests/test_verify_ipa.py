"""Exercise broken IPA packaging without requiring an Apple runner."""
import hashlib
import importlib.util
import io
from pathlib import Path
import plistlib
import struct
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('verify_ipa', Path(__file__).parents[1] / 'verify-ipa.py')
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)

CONFIG = {'displayName': 'Trust Tambola', 'version': '1.0.1', 'ios': {'bundleIdentifier': 'com.ppegu.tambola'}}
VOICE = b'fixture-voice-content'
VOICES = [{'sha256': hashlib.sha256(VOICE).hexdigest()}]


def fixture(*, platform=2, missing_js=False, voice=VOICE, permission=False, signed=False,
            executable_mode=0o100755, minimum='15.1'):
    buf = io.BytesIO()
    base = 'Payload/TrustTambola.app/'
    info = {
        'CFBundleDisplayName': CONFIG['displayName'],
        'CFBundleIdentifier': CONFIG['ios']['bundleIdentifier'],
        'CFBundleShortVersionString': CONFIG['version'],
        'CFBundleVersion': '1',
        'CFBundleExecutable': 'TrustTambola',
        'CFBundlePackageType': 'APPL',
        'CFBundleSupportedPlatforms': ['iPhoneOS'],
        'MinimumOSVersion': minimum,
    }
    if permission:
        info['NSMicrophoneUsageDescription'] = 'Unexpected microphone request'
    macho = struct.pack('<8I', 0xFEEDFACF, 0x0100000C, 0, 2, 1, 24, 0, 0)
    macho += struct.pack('<6I', 0x32, 24, platform, 0, 0, 0)
    with zipfile.ZipFile(buf, 'w') as archive:
        archive.writestr(base + 'Info.plist', plistlib.dumps(info))
        entry = zipfile.ZipInfo(base + 'TrustTambola')
        entry.create_system = 3
        entry.external_attr = executable_mode << 16
        archive.writestr(entry, macho)
        if not missing_js:
            archive.writestr(base + 'main.jsbundle', b'x' * 1001)
        archive.writestr(base + 'assets/voice.wav', voice)
        if signed:
            archive.writestr(base + '_CodeSignature/CodeResources', b'signed')
    buf.seek(0)
    return buf


class IPAVerificationTests(unittest.TestCase):
    def verify_fixture(self, **kwargs):
        # ZipFile accepts a file-like object; the reported filename needs a Path.
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            ipa = Path(folder) / 'fixture.ipa'
            ipa.write_bytes(fixture(**kwargs).getvalue())
            return verifier.verify_ipa(ipa, CONFIG, VOICES)

    def test_accepts_standalone_unsigned_device_app(self):
        result = self.verify_fixture()
        self.assertEqual(result['verifiedVoiceClips'], 1)
        self.assertEqual(result['minimumIOSVersion'], '15.1')
        self.assertFalse(result['signed'])

    def test_rejects_arm64_simulator_even_with_device_plist(self):
        with self.assertRaisesRegex(ValueError, 'not the simulator'):
            self.verify_fixture(platform=7)

    def test_rejects_missing_standalone_javascript(self):
        with self.assertRaisesRegex(ValueError, 'JavaScript bundle missing'):
            self.verify_fixture(missing_js=True)

    def test_rejects_modified_voice_audio(self):
        with self.assertRaisesRegex(ValueError, 'Offline voice files'):
            self.verify_fixture(voice=b'corrupt')

    def test_rejects_lost_executable_permissions(self):
        with self.assertRaisesRegex(ValueError, 'executable permission'):
            self.verify_fixture(executable_mode=0o100644)

    def test_rejects_signed_main_app(self):
        with self.assertRaisesRegex(ValueError, 'unsigned'):
            self.verify_fixture(signed=True)

    def test_rejects_unexpected_permission_prompts(self):
        with self.assertRaisesRegex(ValueError, 'permission prompt'):
            self.verify_fixture(permission=True)


if __name__ == '__main__':
    unittest.main()
