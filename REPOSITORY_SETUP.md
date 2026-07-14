# Repository setup

## Repository identity

- Owner: `japutraa`
- Repository: `echo-atlas`
- Source: https://github.com/japutraa/echo-atlas
- Live game: https://japutraa.github.io/echo-atlas/

## First deployment

1. Push all files to the `main` branch.
2. Open **Settings → Pages**.
3. Select **GitHub Actions** as the source.
4. Run or wait for `.github/workflows/deploy-pages.yml`.
5. Visit https://japutraa.github.io/echo-atlas/

## Updating the game

Edit the relevant file:

- interface or layout: `index.html`
- design: `css/styles.css`
- translations: `js/i18n.js`
- scales and areas: `js/areas.js`
- behavior and audio: `js/app.js`

Every push to `main` triggers validation and a new Pages deployment.
