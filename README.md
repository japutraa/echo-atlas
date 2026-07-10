# Echo Atlas

[![Play Echo Atlas](https://img.shields.io/badge/PLAY-ECHO%20ATLAS-8fa7d8?style=for-the-badge)](https://japutraa.github.io/echo-atlas/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-222?style=for-the-badge&logo=github)](https://japutraa.github.io/echo-atlas/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/japutraa/echo-atlas/blob/main/LICENSE)

**Play directly in your browser:**  
## [japutraa.github.io/echo-atlas](https://japutraa.github.io/echo-atlas/)

**Echo Atlas** is a multilingual browser-based listening puzzle and free-play scale explorer created by **Adrian Janitra Putra / [japutraa](https://github.com/japutraa)**.

It combines generative ambient sound, music-memory challenges, traditional and microtonal scale references, poetic genre homages, and a meditative visual interface.

## Features

- Challenge Mode with 24 stages
- Free Mode with every area unlocked
- 12 listening areas
- Traditional, diatonic, chromatic, and microtonal scales
- Six abstract Hidden Gardens inspired by modern musical languages
- Generative ambient background sound with crossfades
- Separate Ambience and Instrument volume controls
- Bahasa Indonesia, English, and German
- Local progress, language, and volume persistence
- Keyboard controls
- No external libraries or audio files
- Fully self-contained Web Audio implementation

## Run locally

No installation or build step is required.

### Open directly

Open `index.html` in a modern browser.

Some browsers apply stricter audio or storage rules to local `file://` pages. For the most reliable result, use a small local web server.

### Python local server

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Live version

The public browser version is available at:

### [https://japutraa.github.io/echo-atlas/](https://japutraa.github.io/echo-atlas/)

The source repository is available at:

### [https://github.com/japutraa/echo-atlas](https://github.com/japutraa/echo-atlas)

## Publish with GitHub Pages

This repository includes a GitHub Actions workflow that deploys the site automatically.

1. Create the repository as `japutraa/echo-atlas`.
2. Upload or push the contents of this folder to the `main` branch.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **GitHub Actions**.
5. Wait for the `Deploy Echo Atlas to GitHub Pages` workflow to finish.

The game will then be available at:

```text
https://japutraa.github.io/echo-atlas/
```

## Keyboard controls

| Key | Action |
| --- | --- |
| `1`–`0`, `-`, `=` | Play tone buttons |
| `Space` or `Enter` | Listen / continue |
| `M` | Mute or unmute all sound |
| `B` | Toggle generative ambience |
| `[` / `]` | Lower / raise instrument volume |
| `Escape` | Close the creator easter egg |

## Project structure

```text
echo-atlas/
├── index.html
├── manifest.webmanifest
├── assets/
│   └── favicon.svg
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── .gitignore
├── .nojekyll
└── .github/
    └── ISSUE_TEMPLATE/
        ├── bug_report.md
        └── feature_request.md
```

The complete game logic, styling, interface, translations, synthesis, and progression system are contained in `index.html`.

## Browser support

A recent version of Chrome, Edge, Firefox, or Safari is recommended. The game uses:

- Web Audio API
- CSS custom properties
- `localStorage`
- modern JavaScript

Audio starts only after a user interaction, as required by modern browsers.

## Credits

Designed and created by **Adrian Janitra Putra**  
Published as **japutraa**

## Recommended GitHub About settings

Use these values in the repository's **About** section:

- **Description:** `A multilingual ambient listening puzzle and scale explorer built with the Web Audio API.`
- **Website:** `https://japutraa.github.io/echo-atlas/`
- **Topics:** `web-audio`, `music-game`, `ambient`, `microtonal`, `music-theory`, `browser-game`, `generative-music`, `javascript`, `multilingual`, `github-pages`

## License

Copyright © 2026 Adrian Janitra Putra.

Echo Atlas is free software licensed under the **GNU General Public License v3.0**.

You may use, study, modify, and redistribute the project under the conditions of the GPL. Modified and redistributed versions must remain available under the same license, together with their corresponding source code.

See [`LICENSE`](LICENSE).
