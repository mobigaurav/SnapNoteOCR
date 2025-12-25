SnapNoteOCR is a React Native app that scans documents, performs on‑device OCR, and lets you save or export notes as PDF/TXT.

## Requirements
- Node 20+
- Xcode (for iOS) with CocoaPods
- Android Studio + SDK/NDK, Java 17
- Watchman (recommended on macOS)

## Setup
Install JS deps:
```sh
npm install
```

iOS native deps (first time or after native package changes):
```sh
cd ios
bundle install          # installs CocoaPods via Gemfile
bundle exec pod install
cd ..
```

## Run the app
Start Metro:
```sh
npm start
```

Android (emulator or device):
```sh
npm run android
```

iOS (simulator):
```sh
npm run ios
```

## OCR + export notes
- Scan: open Scan, frame the document, tap Capture, then review/edit text.
- Export: from a note, choose export/share; PDF/TXT are written to the app Documents directory and shared via the system sheet.
- If Android sharing ever fails after installing on a new device, rebuild the app (`./gradlew clean assembleDebug`) so FileProvider picks up the bundled icons/paths.

## Tests and lint
```sh
npm test
npm run lint
```

## GitHub: push this project
If this folder is not yet connected to a remote:
```sh
git remote -v                # see current remotes
git remote remove origin     # only if you need to replace an existing remote
git remote add origin git@github.com:<your-username>/<repo>.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```
If Git is not initialized yet, run `git init` before the above.
