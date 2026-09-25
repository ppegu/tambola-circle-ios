# Workspace preferences

- Work directly on `main`. Commit and push completed work to `origin/main`; do not create feature branches unless the user explicitly requests one.
- On this Windows machine, keep workspace files, build downloads, temporary files and development caches on D:. Do not install SDKs or write build caches on C:.
- Before shell build/development commands, dot-source `scripts/use-d-drive.ps1`. It routes npm, pip, Gradle, Android, Hugging Face and temporary files to `D:\BuildCache` without relocating credentials.
- Keep downloaded release artifacts under `D:\OnlineTam\artifacts`. When local space is insufficient, use the existing GitHub Actions Android build and download its verified output to D:.
- Preserve signing keys and saved app data. Delete only identified disposable cache directories, after validating their resolved paths and checking for reparse points.
