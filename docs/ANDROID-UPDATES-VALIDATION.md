# Android update validation — 2026-09-23

Implementation follows the [approved workflow and screen specification](android-updates-design-v1/SCREEN_SPEC.md). Operational instructions are in [ANDROID-UPDATES.md](ANDROID-UPDATES.md).

## Completed verification

| Check                                                        | Result                                                                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| App and Worker TypeScript                                    | Passed                                                                                                                        |
| Full Vitest suite                                            | 102 tests, 15 files passed                                                                                                    |
| Native configuration checks                                  | 2 passed                                                                                                                      |
| Local update integration                                     | 87 assertions passed against real isolated D1, R2 and Durable Objects                                                         |
| Native Kotlin / manifest compilation                         | Passed                                                                                                                        |
| Signed release build                                         | Passed, 1.4.0 / build 9, three ABIs                                                                                           |
| APK manifest, permissions, standalone bundle, native updater | Passed                                                                                                                        |
| Existing production signing certificate                      | Matched                                                                                                                       |
| Bundled voice integrity                                      | All 90 expected Aria clips matched                                                                                            |
| Worker deployment                                            | Passed dry run; production deployment completed, version `e8e4c638-4940-4aa3-a3d4-eff3236ab52f`                               |
| Public page browser review                                   | Desktop/mobile download, release details, copy link and install-help flows checked                                            |
| App screen visual fixture                                    | Mandatory, restricted, progress and source-permission layouts reviewed using the actual screen component in a browser fixture |

The browser fixture is layout evidence only. It is not a substitute for Android native interaction or installer testing.

Integration coverage includes valid RSA signatures; optional/mandatory/retired/incompatible decisions; device blocks surviving version change and a new installation identity; account block/unblock; HTTP and ticket enforcement; passive socket revocation; immutable download bytes and range resume; scheduled retirement; stale revisions; unique release IDs/version links; and public help security headers.

## Release candidate

- File: `artifacts/release-1.4.0/tambola-circle-1.4.0.apk`
- Package: `com.ppegu.tambola`
- Version: `1.4.0`, Android build `9`
- Size: `74,757,006` bytes (about 71.3 MiB)
- SHA-256: `9ac9b66e42c719b0936c252f4034f7f0e42443bb010476a3394e88c95f5e656d`
- Certificate SHA-256: `2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071`
- Build evidence: adjacent `signature.txt`, `apk-info.txt`, `permissions.txt`, `SHA256SUMS.txt`, `release.json`, `build-info.json` and `build-local.log`.

This release was built from the shared working tree, including concurrent online UI work. It was published after explicit user approval on 2026-09-23. The production service is live and verifies signed access correctly. The full public APK download matched the checksum above; its alias, size and range responses also passed. A temporary production verification device was removed after testing. Physical Android installation remains untested by this task.

[Live download page](https://tambola-circle.ffegu0617.workers.dev/download/android) · [Direct APK](https://tambola-circle.ffegu0617.workers.dev/download/android/latest.apk) · [Release notes](https://tambola-circle.ffegu0617.workers.dev/releases/android/1.4.0). Deployment evidence is in `artifacts/deployment-1.4.0/`.

## Rollout and acceptance status

1. **Physical Android device:** another active QA task owns the connected phone and `.dev` installation. This task did not interrupt it, reinstall an app, change its reverse ports or clear app data. Native download/pause/process restart, Android source permission, installer cancellation, in-place build upgrade and preserved user data still require device acceptance. Separate debug builds 9 and 10 and the isolated local release server are prepared. Future QA builds use unique version names matching their override code.
2. **Production hosting — completed:** after explicit user approval, the release bucket, migrations 0010/0011, signing secrets, Worker and APK were deployed. The policy is optional, with no lock or device restrictions. No billing plan was changed.
3. **Coordinating shared phone access:** a proposed message to the other task was rejected by automatic approval review because it contained internal workspace/device/network details without explicit sharing authorization. A clarification is pending; no replacement message was sent.

The production rollout is optional. Existing build 8 cannot enforce a new offline restriction retroactively. The remote operator API is implemented; a graphical admin panel remains outside this approved phase.
