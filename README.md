# ROCKET STORES

ROCKET STORES is a static customer storefront served by Rocket.Api from the Rocket Platform host. It is also compatible with Telegram Web Apps when the operator registers the same public HTTPS storefront URL with a real Telegram bot.

## Features
- Responsive design optimized for Telegram, mobile, and desktop
- Dark mode first with glassmorphism and smooth motion
- Presentation metadata loaded from data/apps.json and authoritative product/version/plan data loaded from the same-origin Rocket.Api
- Live search and category filtering
- Product detail pages and Telegram Web App SDK hooks

## Structure
- index.html: landing page
- details.html: app detail experience
- search.html: search and discovery view
- about.html: brand overview
- contact.html: contact form
- css/: stylesheets
- js/: frontend logic
- data/apps.json: app catalog

## Run locally
Open index.html directly in a browser or serve the folder with any static server.

## Production deployment

Deploy the contents of this folder to the existing `Storefront:RootPath` on the current Rocket Platform host. Rocket.Api serves the files and the API from the same configured HTTPS origin; keep `js/config.js` same-origin unless the approved deployment explicitly requires another public API origin. Do not deploy the Store Web files to a separate public hosting architecture for the production flow.

The repository contains Telegram Web App SDK hooks in `js/telegram.js`. A real bot token, webhook secret, bot registration, and public Mini App URL are operator-supplied external configuration; none belong in these files.
