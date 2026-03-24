const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`\n🔐 Notarizing ${appPath}...`);
  console.log(`   Apple ID: ${process.env.APPLE_ID}`);
  console.log(`   Team ID: ${process.env.APPLE_TEAM_ID}`);
  console.log(`   Password set: ${!!process.env.APPLE_APP_SPECIFIC_PASSWORD}`);
  console.log(`   This may take 5-30 minutes. Please wait...\n`);

  const start = Date.now();

  try {
    await notarize({
      tool: "notarytool",
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });

    const mins = ((Date.now() - start) / 60000).toFixed(1);
    console.log(`\n✅ Notarization complete! (${mins} min)\n`);
  } catch (err) {
    const mins = ((Date.now() - start) / 60000).toFixed(1);
    console.error(`\n❌ Notarization failed after ${mins} min:`);
    console.error(err.message || err);
    throw err;
  }
};
