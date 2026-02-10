const fs = require('fs');
const path = require('path');

/**
 * afterPack hook for electron-builder
 * Wraps the Linux executable to automatically add --no-sandbox flag
 */
exports.default = async function (context) {
    // Only modify Linux builds
    if (context.electronPlatformName !== 'linux') {
        return;
    }

    const appOutDir = context.appOutDir;
    const executableName = context.packager.executableName;
    const executablePath = path.join(appOutDir, executableName);

    // Check if executable exists
    if (!fs.existsSync(executablePath)) {
        console.log('[afterPack] Executable not found, skipping wrapper creation');
        return;
    }

    // Rename original binary
    const originalBinaryPath = path.join(appOutDir, `${executableName}.bin`);
    fs.renameSync(executablePath, originalBinaryPath);

    // Create wrapper script that adds --no-sandbox
    const wrapperScript = `#!/bin/bash
# Neptune Control Center launcher
# Automatically adds --no-sandbox flag for AppImage compatibility

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
exec "$SCRIPT_DIR/${executableName}.bin" --no-sandbox "$@"
`;

    fs.writeFileSync(executablePath, wrapperScript, { mode: 0o755 });

    console.log('[afterPack] Created Linux wrapper script with --no-sandbox flag');
};
