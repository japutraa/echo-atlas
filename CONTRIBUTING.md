# Contributing

Contributions are welcome under the terms of the GNU GPL v3.

## Before submitting a pull request

- keep the game functional without a build step
- run `node --check` on every JavaScript file
- test Challenge Mode and Free Mode
- verify Indonesian, English, and German UI states
- preserve keyboard and touch accessibility
- avoid external audio assets unless their licensing is clearly documented

## File responsibilities

- `index.html`: semantic markup
- `css/styles.css`: visual design and responsive layout
- `js/i18n.js`: translations
- `js/areas.js`: musical and visual area configuration
- `js/app.js`: runtime, sound synthesis, and interaction
