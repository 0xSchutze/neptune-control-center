// Linux AppImage sandbox fix - must be set BEFORE requiring electron
if (process.platform === 'linux') {
  process.env.ELECTRON_DISABLE_SANDBOX = '1';
}

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const archiver = require('archiver');
const AdmZip = require('adm-zip');

// Performance Optimizations
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-gpu-rasterization');

// RAM Management (for heavy 3D scenes)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// WebGL and 3D Performance
app.commandLine.appendSwitch('enable-features', 'V8VmFuture,WebUIDarkMode');

// Disable background throttling (so 3D scenes don't freeze when tab is in background)
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Linux sandbox fix - prevents permission errors on AppImage/deb
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}


const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the main window
let mainWindow = null;

// Single instance lock - prevents multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.exit(0); // Use exit() instead of quit() for immediate termination without window flash
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// PORTABLE SOLUTION: For all platforms
let dataDir;

if (isDev) {
  // Development mode: project root directory
  dataDir = path.join(__dirname, '..', '..', 'data');
} else {
  // PRODUCTION: Portable mode - application run directory
  const dataDirName = 'Neptune Control Center_data';

  // Special cases:
  // 1. If AppImage, use AppImage's directory
  if (process.env.APPIMAGE) {
    const appImagePath = process.env.APPIMAGE;
    const appImageDir = path.dirname(appImagePath);
    dataDir = path.join(appImageDir, dataDirName);
  }
  // 2. If Windows exe, use exe's actual directory (not process.cwd which can be System32)
  else if (process.platform === 'win32') {
    const exePath = app.getPath('exe');
    const exeDir = path.dirname(exePath);
    dataDir = path.join(exeDir, dataDirName);
  }
  // 3. Other Linux (non-AppImage) or macOS
  else {
    const execDir = process.cwd();
    dataDir = path.join(execDir, dataDirName);
  }
}

const mediaDir = path.join(dataDir, 'media');

// Create data directories
const initializeDirectories = () => {
  const directories = [
    dataDir,
    mediaDir,
    path.join(dataDir, 'notes'),
    path.join(dataDir, 'snippets'),
    path.join(dataDir, 'goals'),
    path.join(dataDir, 'bounties'),
    path.join(dataDir, 'wallet'),
    path.join(dataDir, 'chats'),
  ];

  for (const dir of directories) {
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  }
};

// Helper functions
const getFilePath = (filename) => {
  return path.join(dataDir, filename);
};

const saveJsonFile = async (filePath, data) => {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: error.message };
  }
};

const loadJsonFile = async (filePath) => {
  try {
    if (!fsSync.existsSync(filePath)) {
      return { success: false, error: 'File not found', data: null };
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return { success: true, data };
  } catch (error) {
    console.error('Error loading file:', error);
    return { success: false, error: error.message, data: null };
  }
};

// IPC Handlers
const setupIpcHandlers = () => {
  // Save BasicLogs.json file
  ipcMain.handle('save-file', async (event, filename, data) => {
    try {
      const filePath = getFilePath(filename);
      return await saveJsonFile(filePath, data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Read BasicLogs.json file
  ipcMain.handle('read-file', async (event, filename) => {
    try {
      const filePath = getFilePath(filename);
      const result = await loadJsonFile(filePath);

      // Return empty structure if file not found
      if (!result.success && result.error === 'File not found') {
        return { success: true, data: { dailyLogs: [] } };
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete file
  ipcMain.handle('delete-file', async (event, filename) => {
    try {
      const filePath = getFilePath(filename);
      if (fsSync.existsSync(filePath)) {
        await fs.unlink(filePath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Check if file exists
  ipcMain.handle('file-exists', (event, filename) => {
    const filePath = getFilePath(filename);
    return fsSync.existsSync(filePath);
  });

  ipcMain.handle('save-media', async (event, filename, arrayBuffer) => {
    try {
      const filePath = path.join(mediaDir, filename);

      // Convert ArrayBuffer to Buffer and write to file
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      console.log('[Media] Saved:', filename, `(${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      return { success: true, path: filePath, size: buffer.length };
    } catch (error) {
      console.error('[Media] Save error:', error);
      return { success: false, error: error.message };
    }
  });

  // Read media file and return as base64 data URL
  ipcMain.handle('read-media', async (event, filename) => {
    try {
      const filePath = path.join(mediaDir, filename);

      if (!fsSync.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString('base64');

      // Determine MIME type
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.js': 'text/javascript',
        '.ts': 'text/typescript',
        '.jsx': 'text/javascript',
        '.tsx': 'text/typescript',
        '.json': 'application/json',
        '.py': 'text/x-python',
        '.java': 'text/x-java',
        '.cpp': 'text/x-c++src',
        '.c': 'text/x-csrc',
        '.go': 'text/x-go',
        '.rs': 'text/x-rust',
        '.sol': 'text/x-solidity'
      };

      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      const dataUrl = `data:${mimeType};base64,${base64}`;

      console.log('[Media] Read:', filename, `(${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      return { success: true, dataUrl, mimeType, size: buffer.length };
    } catch (error) {
      console.error('[Media] Read error:', error);
      return { success: false, error: error.message };
    }
  });

  // Read text content from media file
  ipcMain.handle('read-media-text', async (event, filename) => {
    try {
      const filePath = path.join(mediaDir, filename);

      if (!fsSync.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      console.error('[Media] Text read error:', error);
      return { success: false, error: error.message };
    }
  });

  // Helper function to read buffer from file
  ipcMain.handle('read-file-buffer', async (event, filepath) => {
    try {
      const buffer = await fs.readFile(filepath);
      return { success: true, buffer: buffer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Return data path
  ipcMain.handle('get-data-path', () => {
    return dataDir;
  });

  // Read all JSON files in folder
  ipcMain.handle('list-folder', async (event, folderName) => {
    try {
      const folderPath = path.join(dataDir, folderName);

      // Create folder if it doesn't exist and return empty array
      if (!fsSync.existsSync(folderPath)) {
        fsSync.mkdirSync(folderPath, { recursive: true });
        return { success: true, data: [] };
      }

      const files = await fs.readdir(folderPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const items = [];
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(folderPath, file), 'utf-8');
          items.push(JSON.parse(content));
        } catch (err) {
          console.error(`Error reading ${file}:`, err);
        }
      }

      // Sort by ID (newest first)
      items.sort((a, b) => (b.id || 0) - (a.id || 0));

      return { success: true, data: items };
    } catch (error) {
      console.error('[Folder] List error:', error);
      return { success: false, error: error.message, data: [] };
    }
  });

  // Save file to folder
  ipcMain.handle('save-to-folder', async (event, folderName, filename, data) => {
    try {
      const folderPath = path.join(dataDir, folderName);

      // Create folder if it doesn't exist
      if (!fsSync.existsSync(folderPath)) {
        fsSync.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      return { success: true, path: filePath };
    } catch (error) {
      console.error('[Folder] Save error:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete file from folder
  ipcMain.handle('delete-from-folder', async (event, folderName, filename) => {
    try {
      const filePath = path.join(dataDir, folderName, filename);

      if (!fsSync.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('[Folder] Delete error:', error);
      return { success: false, error: error.message };
    }
  });

  // Open data folder in file explorer
  ipcMain.handle('open-data-folder', async () => {
    try {
      // Make sure the folder exists
      if (!fsSync.existsSync(dataDir)) {
        fsSync.mkdirSync(dataDir, { recursive: true });
      }

      // Normalize path for the current platform
      const normalizedPath = path.normalize(dataDir);

      // Use shell.openPath for cross-platform support
      const result = await shell.openPath(normalizedPath);

      // shell.openPath returns empty string on success, error message on failure
      if (result) {
        console.error('Failed to open folder:', result);
        // Fallback for Windows: use explorer.exe directly
        if (process.platform === 'win32') {
          const { exec } = require('child_process');
          exec(`explorer.exe "${normalizedPath}"`);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('open-data-folder error:', error);
      return { success: false, error: error.message };
    }
  });

  // Show specific file/folder in file explorer (highlights it)
  ipcMain.handle('show-item-in-folder', async (event, itemPath) => {
    try {
      if (!itemPath) {
        return { success: false, error: 'No path provided' };
      }

      // Normalize path for the current platform
      const normalizedPath = path.normalize(itemPath);

      // Check if file exists
      if (!fsSync.existsSync(normalizedPath)) {
        // If file doesn't exist, try to open parent folder
        const parentDir = path.dirname(normalizedPath);
        if (fsSync.existsSync(parentDir)) {
          await shell.openPath(parentDir);
          return { success: true };
        }
        return { success: false, error: 'Path does not exist' };
      }

      // Show item in folder (highlights the file)
      shell.showItemInFolder(normalizedPath);
      return { success: true };
    } catch (error) {
      console.error('show-item-in-folder error:', error);
      return { success: false, error: error.message };
    }
  });

  // Folder picker dialog for selecting new data directory (optional)
  ipcMain.handle('select-data-folder', async () => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select data folder'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const newDataDir = result.filePaths[0];

        // Move old data to new directory (basic example)
        // This part can be improved
        return {
          success: true,
          path: newDataDir,
          note: 'This feature is not fully implemented yet. Manual transfer may be required.'
        };
      }

      return { success: false, error: 'No folder selected' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Open external URL in system browser
  ipcMain.handle('open-external-url', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('[URL] Open error:', error);
      return { success: false, error: error.message };
    }
  });

  // NotebookLM Export - Export all data as single JSON
  ipcMain.handle('export-notebooklm', async () => {
    try {
      // Get user's Documents folder
      const documentsPath = app.getPath('documents');
      const exportDir = path.join(documentsPath, 'NeptuneExport');

      // Create export directory if it doesn't exist
      if (!fsSync.existsSync(exportDir)) {
        fsSync.mkdirSync(exportDir, { recursive: true });
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        exportType: 'NotebookLM Progress Export',
        summary: {
          totalLogDays: 0,
          dateRange: '',
          totalStudyHours: 0,
          totalGoals: 0,
          completedGoals: 0,
          totalBounties: 0,
          totalNotes: 0,
          totalSnippets: 0,
          totalEarnings: 0
        },
        dailyLogs: [],
        bounties: [],
        goals: [],
        notes: [],
        snippets: [],
        wallet: null,
        aiReviews: null,
        progress: null,
        achievements: null
      };

      // Read BasicLogs.json (dailyLogs)
      const logsPath = path.join(dataDir, 'BasicLogs.json');
      if (fsSync.existsSync(logsPath)) {
        const logsData = JSON.parse(fsSync.readFileSync(logsPath, 'utf-8'));
        exportData.dailyLogs = logsData.dailyLogs || [];
      }

      // Read bounties folder
      const bountiesDir = path.join(dataDir, 'bounties');
      if (fsSync.existsSync(bountiesDir)) {
        const files = fsSync.readdirSync(bountiesDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fsSync.readFileSync(path.join(bountiesDir, file), 'utf-8'));
          exportData.bounties.push(content);
        }
      }

      // Read goals folder
      const goalsDir = path.join(dataDir, 'goals');
      if (fsSync.existsSync(goalsDir)) {
        const files = fsSync.readdirSync(goalsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fsSync.readFileSync(path.join(goalsDir, file), 'utf-8'));
          exportData.goals.push(content);
        }
      }

      // Read notes folder
      const notesDir = path.join(dataDir, 'notes');
      if (fsSync.existsSync(notesDir)) {
        const files = fsSync.readdirSync(notesDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fsSync.readFileSync(path.join(notesDir, file), 'utf-8'));
          exportData.notes.push(content);
        }
      }

      // Read snippets folder
      const snippetsDir = path.join(dataDir, 'snippets');
      if (fsSync.existsSync(snippetsDir)) {
        const files = fsSync.readdirSync(snippetsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fsSync.readFileSync(path.join(snippetsDir, file), 'utf-8'));
          exportData.snippets.push(content);
        }
      }

      // Read wallet folder
      const walletPath = path.join(dataDir, 'wallet', 'wallet.json');
      if (fsSync.existsSync(walletPath)) {
        exportData.wallet = JSON.parse(fsSync.readFileSync(walletPath, 'utf-8'));
      }

      // Read AIReviews.json
      const aiReviewsPath = path.join(dataDir, 'AIReviews.json');
      if (fsSync.existsSync(aiReviewsPath)) {
        exportData.aiReviews = JSON.parse(fsSync.readFileSync(aiReviewsPath, 'utf-8'));
      }

      // Read progress.json
      const progressPath = path.join(dataDir, 'progress.json');
      if (fsSync.existsSync(progressPath)) {
        exportData.progress = JSON.parse(fsSync.readFileSync(progressPath, 'utf-8'));
      }

      // Read achievements.json
      const achievementsPath = path.join(dataDir, 'achievements.json');
      if (fsSync.existsSync(achievementsPath)) {
        exportData.achievements = JSON.parse(fsSync.readFileSync(achievementsPath, 'utf-8'));
      }

      // Calculate summary
      if (exportData.dailyLogs.length > 0) {
        exportData.summary.totalLogDays = exportData.dailyLogs.length;

        // Date range
        const dates = exportData.dailyLogs.map(log => log.date).sort();
        exportData.summary.dateRange = `${dates[0]} - ${dates[dates.length - 1]}`;

        // Total study hours
        exportData.summary.totalStudyHours = exportData.dailyLogs.reduce(
          (sum, log) => sum + (log.hours || 0), 0
        );
      }

      // Goals stats
      exportData.summary.totalGoals = exportData.goals.length;
      exportData.summary.completedGoals = exportData.goals.filter(g => g.status === 'completed').length;

      // Bounties & others
      exportData.summary.totalBounties = exportData.bounties.length;
      exportData.summary.totalNotes = exportData.notes.length;
      exportData.summary.totalSnippets = exportData.snippets.length;

      // Earnings from progress or wallet
      if (exportData.progress?.earnings) {
        exportData.summary.totalEarnings = exportData.progress.earnings;
      } else if (exportData.wallet?.balance) {
        exportData.summary.totalEarnings = exportData.wallet.balance;
      }

      // Write to export file
      const exportPath = path.join(exportDir, 'neptune_progress.json');
      fsSync.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

      console.log('[Export] NotebookLM export completed:', exportPath);
      return { success: true, path: exportPath };
    } catch (error) {
      console.error('[Export] NotebookLM export error:', error);
      return { success: false, error: error.message };
    }
  });

  // Export for AI Assistant (last 14 days of dailyLogs only)
  ipcMain.handle('export-ai-assistant', async () => {
    try {
      const documentsPath = app.getPath('documents');
      const exportDir = path.join(documentsPath, 'NeptuneExport');

      if (!fsSync.existsSync(exportDir)) {
        fsSync.mkdirSync(exportDir, { recursive: true });
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        exportType: 'AI Assistant Context Export',
        summary: {
          totalLogDays: 0,
          dateRange: '',
          totalStudyHours: 0,
          totalGoals: 0,
          completedGoals: 0,
          totalBounties: 0,
          totalNotes: 0,
          totalSnippets: 0,
          totalEarnings: 0
        },
        dailyLogs: [],
        bounties: [],
        goals: [],
        notes: [],
        snippets: [],
        wallet: null,
        aiReviews: null,
        progress: null,
        achievements: null
      };

      // Read BasicLogs.json (dailyLogs) — ONLY LAST 14 DAYS
      const logsPath = path.join(dataDir, 'BasicLogs.json');
      if (fsSync.existsSync(logsPath)) {
        const logsData = JSON.parse(fsSync.readFileSync(logsPath, 'utf-8'));
        const allLogs = logsData.dailyLogs || [];

        // Filter to last 14 days
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const cutoffDate = fourteenDaysAgo.toISOString().split('T')[0];

        exportData.dailyLogs = allLogs.filter(log => log.date >= cutoffDate);
      }

      // Read bounties folder
      const bountiesDir = path.join(dataDir, 'bounties');
      if (fsSync.existsSync(bountiesDir)) {
        const files = fsSync.readdirSync(bountiesDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fsSync.readFileSync(path.join(bountiesDir, file), 'utf-8'));
          exportData.bounties.push(content);
        }
      }

      // Read goals folder
      const goalsDir = path.join(dataDir, 'goals');
      if (fsSync.existsSync(goalsDir)) {
        const files = fsSync.readdirSync(goalsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fsSync.readFileSync(path.join(goalsDir, file), 'utf-8'));
          exportData.goals.push(content);
        }
      }

      // Read notes folder
      const notesDir = path.join(dataDir, 'notes');
      if (fsSync.existsSync(notesDir)) {
        const files = fsSync.readdirSync(notesDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fsSync.readFileSync(path.join(notesDir, file), 'utf-8'));
          exportData.notes.push(content);
        }
      }

      // Read snippets folder
      const snippetsDir = path.join(dataDir, 'snippets');
      if (fsSync.existsSync(snippetsDir)) {
        const files = fsSync.readdirSync(snippetsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fsSync.readFileSync(path.join(snippetsDir, file), 'utf-8'));
          exportData.snippets.push(content);
        }
      }

      // Read wallet
      const walletPath = path.join(dataDir, 'wallet', 'wallet.json');
      if (fsSync.existsSync(walletPath)) {
        exportData.wallet = JSON.parse(fsSync.readFileSync(walletPath, 'utf-8'));
      }

      // Read AIReviews.json
      const aiReviewsPath = path.join(dataDir, 'AIReviews.json');
      if (fsSync.existsSync(aiReviewsPath)) {
        exportData.aiReviews = JSON.parse(fsSync.readFileSync(aiReviewsPath, 'utf-8'));
      }

      // Read progress.json
      const progressPath = path.join(dataDir, 'progress.json');
      if (fsSync.existsSync(progressPath)) {
        exportData.progress = JSON.parse(fsSync.readFileSync(progressPath, 'utf-8'));
      }

      // Read achievements.json
      const achievementsPath = path.join(dataDir, 'achievements.json');
      if (fsSync.existsSync(achievementsPath)) {
        exportData.achievements = JSON.parse(fsSync.readFileSync(achievementsPath, 'utf-8'));
      }

      // Calculate summary
      if (exportData.dailyLogs.length > 0) {
        exportData.summary.totalLogDays = exportData.dailyLogs.length;
        const dates = exportData.dailyLogs.map(log => log.date).sort();
        exportData.summary.dateRange = `${dates[0]} - ${dates[dates.length - 1]}`;
        exportData.summary.totalStudyHours = exportData.dailyLogs.reduce(
          (sum, log) => sum + (log.hours || 0), 0
        );
      }

      exportData.summary.totalGoals = exportData.goals.length;
      exportData.summary.completedGoals = exportData.goals.filter(g => g.status === 'completed').length;
      exportData.summary.totalBounties = exportData.bounties.length;
      exportData.summary.totalNotes = exportData.notes.length;
      exportData.summary.totalSnippets = exportData.snippets.length;

      if (exportData.progress?.earnings) {
        exportData.summary.totalEarnings = exportData.progress.earnings;
      } else if (exportData.wallet?.balance) {
        exportData.summary.totalEarnings = exportData.wallet.balance;
      }

      // Write to export file
      const exportPath = path.join(exportDir, 'neptune_ai_context.json');
      fsSync.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

      console.log('[Export] AI Assistant export completed:', exportPath);
      return { success: true, path: exportPath };
    } catch (error) {
      console.error('[Export] AI Assistant export error:', error);
      return { success: false, error: error.message };
    }
  });

  // Data Export - Export entire data folder as ZIP file
  ipcMain.handle('export-all-data', async () => {
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export All Data',
        defaultPath: `Neptune_Backup_${new Date().toISOString().split('T')[0]}.zip`,
        filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      // Create ZIP archive
      const output = fsSync.createWriteStream(result.filePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          console.log('[Export] Data exported to ZIP:', result.filePath, `(${archive.pointer()} bytes)`);
          resolve({ success: true, path: result.filePath });
        });

        archive.on('error', (err) => {
          console.error('[Export] Archive error:', err);
          reject({ success: false, error: err.message });
        });

        archive.pipe(output);

        // Add entire data directory to archive
        archive.directory(dataDir, false);

        archive.finalize();
      });
    } catch (error) {
      console.error('[Export] Error:', error);
      return { success: false, error: error.message };
    }
  });

  // Data Import - Import data from ZIP backup file
  ipcMain.handle('import-all-data', async () => {
    try {
      // Show open dialog
      const result = await dialog.showOpenDialog({
        title: 'Import Data Backup',
        filters: [{ name: 'ZIP Files', extensions: ['zip'] }],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths[0]) {
        return { success: false, canceled: true };
      }

      const zipPath = result.filePaths[0];

      // Create backup of current data before overwriting
      const backupPath = path.join(path.dirname(dataDir), `data_backup_${Date.now()}`);
      if (fsSync.existsSync(dataDir)) {
        fsSync.renameSync(dataDir, backupPath);
        console.log(`Backup created: ${backupPath}`);
      }

      // Create fresh data directory
      fsSync.mkdirSync(dataDir, { recursive: true });

      // Extract ZIP to data directory
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(dataDir, true);

      console.log('[Import] Data imported from ZIP');

      // Remove backup on success (optional - keep for safety)
      // fsSync.rmSync(backupPath, { recursive: true, force: true });

      return { success: true, needsRestart: true };
    } catch (error) {
      console.error('[Import] Error:', error);
      return { success: false, error: error.message };
    }
  });

  // Reload app handler
  ipcMain.handle('restart-app', async () => {
    console.log('[App] Reloading...');
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.reload();
    }
  });
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Neptune Control Center',
    autoHideMenuBar: true, // Hide the menu bar for cleaner UI
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // For production build local file access
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png')
  });

  // Maximize and show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  const win = mainWindow; // Keep backward compatibility

  if (isDev) {
    win.loadURL('http://localhost:8080');
    win.webContents.openDevTools();
  } else {
    // Production: Load from dist folder
    // In packaged app, __dirname points to app.asar/electron
    // dist folder is at app.asar/dist
    const distPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('Loading from:', distPath);
    win.loadFile(distPath).catch(err => {
      console.error('Failed to load:', err);
      // Fallback: try resources path
      const fallbackPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
      console.log('Trying fallback:', fallbackPath);
      win.loadFile(fallbackPath);
    });
  }

  // Open external links in system browser instead of Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Check if it's an external URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' }; // Prevent opening in Electron
    }
    return { action: 'allow' }; // Allow internal navigation
  });
}

app.whenReady().then(() => {
  initializeDirectories();
  setupIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});