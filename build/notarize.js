// macOS notarization script for electron-builder
// Set APPLE_ID and APPLE_APP_PASSWORD environment variables before building

const { notarize } = require('@electron/notarize');

module.exports = async function(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  // Only notarize if credentials are provided
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_PASSWORD) {
    console.log('Skipping notarization: APPLE_ID and APPLE_APP_PASSWORD not set');
    return;
  }

  console.log(`Notarizing ${appName}...`);

  try {
    await notarize({
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    console.log('Notarization complete!');
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};
