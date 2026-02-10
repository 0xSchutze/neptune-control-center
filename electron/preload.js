const { ipcRenderer } = require('electron');

window.electronAPI = {
  // File operations
  saveFile: (filename, data) => ipcRenderer.invoke('save-file', filename, data),
  readFile: (filename) => ipcRenderer.invoke('read-file', filename),
  deleteFile: (filename) => ipcRenderer.invoke('delete-file', filename),
  fileExists: (filename) => ipcRenderer.invoke('file-exists', filename),

  // Media files - as ArrayBuffer
  saveMedia: (filename, arrayBuffer) => ipcRenderer.invoke('save-media', filename, arrayBuffer),

  // Read media files - as base64 data URL
  readMedia: (filename) => ipcRenderer.invoke('read-media', filename),

  // Read media text content
  readMediaText: (filename) => ipcRenderer.invoke('read-media-text', filename),

  // Folder operations (notes, snippets, goals, bounties, wallet)
  listFolder: (folderName) => ipcRenderer.invoke('list-folder', folderName),
  saveToFolder: (folderName, filename, data) => ipcRenderer.invoke('save-to-folder', folderName, filename, data),
  deleteFromFolder: (folderName, filename) => ipcRenderer.invoke('delete-from-folder', folderName, filename),

  // Data management
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  showItemInFolder: (itemPath) => ipcRenderer.invoke('show-item-in-folder', itemPath),

  // Open external URLs in system browser
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),

  // Data Export/Import
  exportAllData: () => ipcRenderer.invoke('export-all-data'),
  importAllData: () => ipcRenderer.invoke('import-all-data'),
  exportNotebookLM: () => ipcRenderer.invoke('export-notebooklm'),

  // App Control
  restartApp: () => ipcRenderer.invoke('restart-app')
};