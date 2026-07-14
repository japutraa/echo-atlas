# Echo Atlas

[![Play Echo Atlas](https://img.shields.io/badge/PLAY-ECHO%20ATLAS-8fa7d8?style=for-the-badge)](https://japutraa.github.io/echo-atlas/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

**Echo Atlas** is a multilingual ambient listening puzzle and scale explorer created by **Adrian Janitra Putra / [japutraa](https://github.com/japutraa)**.

[Play Echo Atlas in your browser](https://japutraa.github.io/echo-atlas/)

## Overview

Echo Atlas turns musical intervals, scales, and tuning systems into an exploratory browser experience.

The main journey presents a sequence of listening challenges across several tonal environments. Players hear a pattern and reconstruct it by ear. Free Mode opens the complete atlas for unrestricted exploration without correct or incorrect answers.

Every sound is synthesized in real time with the Web Audio API. The project uses no external audio files, runtime libraries, frameworks, or build tools.

## Features

- 24-stage listening challenge
- unrestricted Free Mode
- 12 distinct sound areas
- diatonic, pentatonic, chromatic, traditional, and microtonal scale references
- six abstract Hidden Gardens inspired by modern musical languages
- generative ambient backgrounds with smooth transitions
- individual Ambience and Instrument volume controls
- Bahasa Indonesia, English, and German
- keyboard, pointer, and touch input
- locally stored progress and preferences
- responsive interface for desktop and mobile browsers
- entirely client-side operation

## Musical Areas

The atlas is divided into two groups.

### World Scales

The main challenge explores:

- diatonic major and natural minor
- Hirajōshi-inspired pentatonic material
- Sléndro- and Pélog-inspired synthetic approximations
- Bhairav- and Yaman-inspired interval structures
- twelve-tone equal temperament
- twenty-four-tone equal temperament

These areas are interpretive listening environments rather than authoritative reproductions of any specific musical tradition or tuning practice.

### Hidden Gardens

The Hidden Gardens transform familiar modern musical gestures into restrained ambient sound worlds. Their identities are suggested through interval structure, timbre, rhythm, and spatial character rather than literal genre imitation.

## Controls

| Input | Action |
| --- | --- |
| `1`–`0`, `-`, `=` | Play available tone buttons |
| `Space` or `Enter` | Listen, replay, or continue |
| `M` | Mute or unmute all sound |
| `B` | Switch Ambience between 0% and 50% |
| `[` / `]` | Lower or raise Instrument volume |
| `Escape` | Close the creator easter egg |

All primary controls are also available through the interface.

## Project Structure

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
├── manifest.webmanifest
├── robots.txt
├── sitemap.xml
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

### `index.html`

Contains the semantic structure of the application and references the external stylesheets and scripts.

### `css/styles.css`

Contains the complete visual system, responsive layout, interface states, transitions, and decorative effects.

### `js/i18n.js`

Contains all interface translations and localized descriptions for Indonesian, English, and German.

### `js/areas.js`

Contains area definitions, scales, interval values, note labels, colors, roots, difficulty settings, and sound-profile metadata.

### `js/app.js`

Contains the application runtime, rendering, state persistence, puzzle logic, Web Audio synthesis, generative ambience, and user interaction.

## Running Locally

No installation or compilation step is required.

A local web server is recommended:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

A recent version of Chrome, Firefox, Safari, or Edge is recommended.

Audio begins only after user interaction, in accordance with modern browser autoplay policies.

## Technical Notes

Echo Atlas uses:

- Web Audio API
- CSS custom properties
- `localStorage`
- modern browser JavaScript
- static HTML and CSS

The audio engine creates oscillators, filters, envelopes, convolution reverb, generative background layers, and crossfades directly in the browser.

User progress, language selection, and volume preferences remain on the local device. The application does not require an account or server-side database.

## Accessibility

The interface includes:

- keyboard navigation
- descriptive button labels
- visible focus states
- responsive controls
- independent volume channels
- persistent language selection
- reduced reliance on color alone for game state

Because the central mechanic is auditory, headphones or good speakers are strongly recommended.

## Cultural and Musical Context

Echo Atlas references musical concepts from several traditions. These references are intended as creative and educational listening prompts.

Synthetic approximations such as the Sléndro- and Pélog-inspired areas are not presented as replacements for the diverse tuning systems, performance practices, instruments, or cultural contexts from which those names originate.

## Contributing

Contributions are welcome.

Before submitting changes, please:

- preserve the build-free static architecture
- validate JavaScript syntax
- test Challenge Mode and Free Mode
- verify all three interface languages
- preserve keyboard and touch accessibility
- document any new external assets and their licenses
- treat referenced musical traditions with appropriate care

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for additional guidance.

## Credits

Created, designed, and developed by:

**Adrian Janitra Putra**  
**japutraa**

## License

Echo Atlas is free software licensed under the **GNU General Public License v3.0**.

You may use, study, modify, and redistribute the project under the terms of the GPL. Distributed modified versions must remain available under the same license with their corresponding source code.

See [`LICENSE`](LICENSE) for the complete license text.
