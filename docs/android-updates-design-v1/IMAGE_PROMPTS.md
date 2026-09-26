# Image generation prompts

Generated with the built-in image generation tool. New design boards used `assets/game-v3/game-hero.png` as brand reference. The first board was refined using the real home screenshot `artifacts/android-qa/51-home-touchup-final.png`.

Images are proposals; versions and sizes are illustrative. Final selected PNGs are stored under `images/` on D:.

## Board 1

```text
Use case: ui-mockup.
Create a high fidelity product design board for Tambola Circle Android app, landscape, very high resolution, 5 large upright phone screens aligned left to right with numbered labels and thin connecting arrows. Title: "Android update journey". Subtitle: "Design proposal • sample version and size". Use the supplied image ONLY as a brand reference for Tambola Circle logo, playful premium board-game feel, rich deep purple #31065b, warm cream #fff7f2, golden yellow buttons. Use restrained small gold stars, rounded Fredoka-like headings, crisp legible UI body typography. Keep functional screens uncluttered, accessible contrast, generous padding; no arbitrary new branding. Pale warm presentation board background.

Screen 1 label "1 • Update available": Existing home screen with small Tambola Circle logo and colorful bingo balls, "Hi, friend!", home buttons "Play online", "My tables", "Offline caller". Immediately below header a cream/gold dismissible update banner: "A new version is ready", "Update" and clear small close X. Footer board note "Optional: keep playing or update later."

Screen 2 label "2 • Update required": Full app gate on purple background, persistent amber banner across top reading "Update required" WITHOUT close icon. Under small logo, friendly gold download shield icon; headline "Update to keep playing"; text "This version is no longer supported."; metadata "Version 1.4.0 • 48 MB"; short release notes "Smoother games" and "Important fixes"; prominent gold button "Download update"; secondary text button "What’s new"; helper "Your saved data stays on this device." There is NO skip, later, close, back-to-home or game navigation. Footer board note "Mandatory: app access stays locked."

Screen 3 label "3 • Downloading": Purple update page, persistent amber "Update required" banner, heading "Downloading update", circular gold down arrow, progress bar 62%, "30 MB of 48 MB", helper "You can retry if the connection drops.", visible "Pause download" control. No dismiss or continue playing. Footer note "Download starts only after a tap."

Screen 4 label "4 • Install update": Purple page persistent amber "Update required" banner, heading "Ready to install", metadata "Version 1.4.0", gold button "Install update"; cream inset small illustrative Android system dialog titled "Tambola Circle" with text "Update this app?" and buttons "Cancel" and "Update". Label the inset "Android system confirmation • appearance varies". Footer note "Allow this installation source if Android asks."

Screen 5 label "5 • Updated": Purple page, soft green check badge, title "You’re up to date", metadata "Version 1.4.0", short copy "Ready for your next game.", gold button "Continue". Footer note "Unlock only after installed build is verified."

At bottom one thin flow line text "Open / resume → check quietly → download on tap → Android approval → verify installed version". Do not invent silent installation, Play Store marks, permanent ID claims, real dates, or realistic interactive controls outside the mockups. All version numbers and sizes are illustrative.
```

## Board 2

```text
Use case: ui-mockup.
Create a high fidelity Tambola Circle Android access-control design board, wide landscape, four large Android phone screens side by side, clear numbered labels. Title "Release and device access guards". Subtitle "Design proposal • remote decisions, clear recovery". Use supplied Tambola Circle brand image ONLY as brand style reference. Match dark purple #31065b backgrounds, cream cards #fff7f2, gold CTA buttons, rounded playful headings, professional readable body text, modest gold trim and a small logo; no cartoon villains, alarms or threatening imagery. Pale warm board canvas. Each screen is a complete app-level gate with NO game navigation, dismiss cross or skip button.

Phone 1 label "A • Release retired": Permanent amber banner "Update required". Heading "This version has retired". Calm copy "Install the latest version to use Tambola Circle again." Metadata "Installed: 1.3.0" and "Available: 1.4.0". Gold button "Download update". Text buttons "What’s new" and "Get help". Note outside phone "The downloaded file alone does not unlock the app."

Phone 2 label "B • Device blocked": small shield/lock icon, headline "Access restricted". Copy "This device cannot use Tambola Circle. Contact support if you think this is a mistake." Cream card "Support reference" and "TC-7K2P9" with "Copy". Gold button "Get help". Secondary "Check again". No "Download to unlock" claim, no raw device ID and no accusatory copy. Outside note "Blocking stays active after an app update."

Phone 3 label "C • App temporarily locked": small maintenance icon, headline "We’ll be back soon". Copy "Tambola Circle is temporarily unavailable. Please try again later." Gold button "Try again". Secondary "Get help". Outside note "Separate remote app-wide maintenance control."

Phone 4 label "D • Access check expired": small connection icon, headline "Connect to continue". Copy "Go online so we can check this app version and device access." Gold button "Try again". Secondary "Get help". Small cream notice "Your saved data is still on this device." Outside note "Proposed: 24-hour offline grace for previously allowed users."

Bottom policy strip clearly legible: "Device block → app lock → release retirement → mandatory update → optional update → allow". Footnote "Known restrictions stay active offline. Android Back may exit the app, but cannot reveal gameplay." These are UI design mockups, not screenshots. Do not add platform PIN or biometric locks.
```

## Board 3

```text
Use case: ui-mockup.
Create a polished responsive web design board for Tambola Circle official Android APK download and update pages. Wide landscape, high resolution. Title "One trusted link to download and share". Subtitle "Design proposal • paths and release details are illustrative". Use provided brand image ONLY as logo/style reference: deep purple #31065b, luminous warm gold, cream #fff7f2, rounded friendly headings with clear sober body text; colorful bingo balls only as small tasteful brand art. Warm pale presentation board background.

Composition: left half large desktop browser mockup showing "/download/android" in generic address bar (NO invented real domain), right half two tall mobile browser page mockups labeled "Release details" and "Install help". All text large enough to read.
Desktop: purple nav small Tambola Circle logo, links "Download", "Release notes", "Install help". Cream content panel and purple hero with small brand art. Main title "Tambola Circle for Android". Subhead "Your people. Your game." Badge "Latest stable". Metadata "Version 1.4.0 • 48 MB" and small "Sample release". Gold CTA "Download APK". Secondary outlined button "Copy download link". Supporting copy "Already installed? Update over your existing app to keep your saved data." Lower panel "Install in 3 steps" with 1 "Download the APK", 2 "Allow this source when Android asks", 3 "Confirm Update or Install". Small link "Trouble installing?" Footer link "APK details and checksum".
First mobile browser /releases/android/1.4.0 : title "What’s new", version "1.4.0", badge "Latest stable", clean release notes "Smoother games", "Important fixes". Gold "Download APK" button; secondary "Share this release". Expandable row "File details & SHA-256". Lower cream notice "An older release may require an update." Do not expose a made-up checksum.
Second mobile /help/install-android : title "Install your update". Three numbered illustrated steps with generic tiny Android permission and installer panels, clearly labeled "Android screens may vary". Visible text "1. Download from this page", "2. Allow this installation source", "3. Return and tap Update". Purple helper card "Keep your saved data" and copy "Install over the current app. Do not uninstall it first." Bottom outlined "Back to download".
Bottom strip "Stable link: /download/android    Release link: /releases/android/{version}    Help: /help/install-android". An actual scannable QR code is not needed; don't draw any QR code. No Play Store or iOS buttons, no admin controls. No live domain, publication date or claims of a deployed website.
```

## Board 1 targeted refinement

```text
Edit the first image (the five-phone Android update board). The second image is an existing real home screen reference ONLY. Preserve screens 2, 3, 4 and 5 exactly, including their text, layout, colors and all labels. Make only these targeted corrections:
1. In phone 1, restore the existing home style shown in image 2: purple full background, avatar greeting and coin chip at top, existing Tambola Circle hero, gold Play online button, purple My tables button, cream Offline caller button, and exactly the three footer actions Coins / How to play / Settings. Fit a compact cream dismissible "A new version is ready" banner with Update button and small X below greeting and above the hero. Scale hero to fit. Do not add Home/Games/Friends/More tabs or a white home background.
2. Replace the arrow between optional screen 1 and mandatory screen 2 with a small label "OR" to show these are alternate entry states. Keep arrows from mandatory update to download, install and success.
3. Remove ALL handwritten decorative slogans at board corners and in success screen, including Play Together Always, Same fun A better game, More Good Games Ahead, Play Together Bigger Smiles. Keep professional functional copy and modest gold stars. Do not otherwise change the composition or invent new text.
Preserve title and subtitle indicating sample version and size.
```
