# Echo Atlas

[![Play Echo Atlas](https://img.shields.io/badge/PLAY-ECHO%20ATLAS-8fa7d8?style=for-the-badge)](https://japutraa.github.io/echo-atlas/)
[![Deploy to GitHub Pages](https://github.com/japutraa/echo-atlas/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/japutraa/echo-atlas/actions/workflows/deploy-pages.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/japutraa/echo-atlas/blob/main/LICENSE)

## [Play directly in your browser](https://japutraa.github.io/echo-atlas/)

**Echo Atlas** is a multilingual ambient listening puzzle and scale explorer created by **Adrian Janitra Putra / [japutraa](https://github.com/japutraa)**.

The project uses the Web Audio API to synthesize every instrument, drone, ambience layer, transition, and feedback sound directly in the browser.

## Features

- 24-stage Challenge Mode
- Free Mode with all 12 areas unlocked
- traditional, diatonic, chromatic, and microtonal scale references
- six abstract Hidden Gardens
- generative ambient backgrounds with crossfades
- separate Ambience and Instrument volume controls
- Bahasa Indonesia, English, and German
- persistent progress and settings through `localStorage`
- keyboard, pointer, and touch controls
- no third-party runtime libraries
- no external audio files

## Repository structure

```text
echo-atlas/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── i18n.js
│   ├── areas.js
│   └── app.js
├── assets/
│   └── favicon.svg
├── .github/
│   ├── workflows/
│   │   ├── deploy-pages.yml
│   │   └── validate.yml
│   └── ISSUE_TEMPLATE/
├── manifest.webmanifest
├── robots.txt
├── sitemap.xml
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── REPOSITORY_SETUP.md
├── LICENSE
├── .editorconfig
├── .gitignore
└── .nojekyll
```

### JavaScript modules

- `js/i18n.js` contains all interface translations and localized descriptions.
- `js/areas.js` contains scale definitions, area metadata, colors, roots, and challenge settings.
- `js/app.js` contains rendering, interaction, persistence, puzzle logic, Web Audio synthesis, and generative ambience.

The files are classic browser scripts rather than bundled ES modules, so the game still works on simple static hosting without a build step.

## Run locally

A local server is recommended because browser audio and storage behavior can differ when opening a page through `file://`.

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## Deployment

The repository includes `.github/workflows/deploy-pages.yml`. The workflow stages only the public runtime files into a temporary `dist/` directory before deployment.

After pushing to `main`:

1. Open **Settings → Pages**.
2. Select **GitHub Actions** as the publishing source.
3. Open the **Actions** tab.
4. Confirm that **Deploy Echo Atlas to GitHub Pages** completes successfully.

The deployed game will be available at:

```text
https://japutraa.github.io/echo-atlas/
```

## Keyboard controls

| Key | Action |
| --- | --- |
| `1`–`0`, `-`, `=` | Play tone buttons |
| `Space` or `Enter` | Listen or continue |
| `M` | Mute or unmute all sound |
| `B` | Switch Ambience between 0% and 50% |
| `[` / `]` | Lower or raise Instrument volume |
| `Escape` | Close the creator easter egg |

## GitHub About

**Description**

```text
A multilingual ambient listening puzzle and scale explorer built with the Web Audio API.
```

**Website**

```text
https://japutraa.github.io/echo-atlas/
```

**Suggested topics**

```text
web-audio music-game ambient microtonal music-theory browser-game
generative-music javascript multilingual github-pages
```

## License

Copyright © 2026 Adrian Janitra Putra.

Echo Atlas is licensed under the **GNU General Public License v3.0**. See [`LICENSE`](LICENSE).
