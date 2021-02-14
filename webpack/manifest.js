const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const manifest = {
  manifest_version: 2,
  name: packageJson.extensionName,
  version: packageJson.version,
  description: packageJson.description,
  options_ui: {
    page: 'options.html',
  },
  browser_action: {
    default_popup: 'popup.html',
  },
  background: {
    scripts: ['background_script.js'],
  },
  permissions: ['storage', '*://api.malsync.moe/*'],
};

const getPageUrls = () => {
  const pagesPath = path.join(__dirname, '..', 'src', 'pages');
  const pageNames = fs
    .readdirSync(pagesPath, { withFileTypes: true })
    .filter((file) => file.isDirectory())
    .map((file) => file.name);

  const pageUrls = pageNames
    .map(
      (pageName) =>
        JSON.parse(
          fs.readFileSync(path.join(pagesPath, pageName, 'metadata.json'))
        ).urls
    )
    .flat();

  return pageUrls;
};

const getPlayerUrls = () => {
  const playersPath = path.join(__dirname, '..', 'src', 'players');
  const playerNames = fs
    .readdirSync(playersPath, { withFileTypes: true })
    .filter((file) => file.isDirectory())
    .map((file) => file.name);

  const playerUrls = playerNames
    .map(
      (playerName) =>
        JSON.parse(
          fs.readFileSync(path.join(playersPath, playerName, 'metadata.json'))
        ).player_urls
    )
    .flat();

  return playerUrls;
};

module.exports = () => {
  const pageUrls = getPageUrls();
  const playerUrls = getPlayerUrls();
  manifest.content_scripts = [
    {
      matches: pageUrls,
      js: ['content_script.js'],
    },
    {
      matches: playerUrls,
      js: ['player_script.js'],
      all_frames: true,
      run_at: 'document_start',
    },
  ];
  manifest.optional_permissions = pageUrls.concat(playerUrls);

  switch (process.env.BROWSER) {
    case 'chromium':
      manifest.options_ui.chrome_style = true;
      manifest.browser_action.chrome_style = true;
      break;
    case 'firefox':
      manifest.options_ui.browser_style = true;
      manifest.browser_action.browser_style = true;
      manifest.browser_specific_settings = {
        gecko: {
          id: '{c67645fa-ad86-4b2f-ab7a-67fc5f3e9f5a}',
        },
      };
      break;
    default:
      break;
  }

  if (process.env.NODE_ENV === 'development') {
    manifest.permissions.push('*://localhost/*');
  }
  return manifest;
};