# Mac check for the AI assistant relay (temporary — delete after)

## 1. Get the branch and build (unsigned)

```
git fetch && git checkout mcp && git pull
npm install
npm run electron:build:mac:unsigned
```

In the build log, the relay step should download and verify Node for both
`darwin-arm64` and `darwin-x64`.

## 2. Each app has the right Node

```
file dist-electron/mac-arm64/Widgetizer.app/Contents/Resources/relay/node
file dist-electron/mac/Widgetizer.app/Contents/Resources/relay/node
```

First should say **arm64**, second **x86_64**.

## 3. The bundled relay runs on its own Node

```
node scripts/check-relay.mjs --relay dist-electron/mac-arm64/Widgetizer.app/Contents/Resources/relay/widgetizer-mcp.mjs --node dist-electron/mac-arm64/Widgetizer.app/Contents/Resources/relay/node
```

Should list `widgetizer_connect`. (Optional, with Rosetta: same command with the
`mac/` paths instead of `mac-arm64/`.)

## 4. Claude Desktop

1. Open `dist-electron/mac-arm64/Widgetizer.app`, open a site, then Settings →
   AI Assistant → turn on **Allow AI Assistants** → Save.
2. If Claude Desktop has a `widgetizer-dev` entry in its config, remove it and
   restart Claude.
3. Double-click `build/mcpb/widgetizer.mcpb` → Install (an "unverified publisher"
   warning is expected). Leave **Data Folder** empty.
4. New chat: "Which site is open in Widgetizer?"
5. The AI Assistant tab in Widgetizer should show "Connected: …".

## Signed build (later, before a release)

```
npm run electron:build:mac
codesign -dv --entitlements - --verbose=4 dist-electron/mac-arm64/Widgetizer.app/Contents/Resources/relay/node
spctl -a -vv dist-electron/mac-arm64/Widgetizer.app
```

codesign: your Developer ID, `runtime` in flags, `allow-jit`. spctl: accepted,
source Notarized Developer ID.
