// Global Electron API type - single definition for entire application
export interface ElectronAPI {
    // File operations
    saveFile?: (filename: string, data: any) => Promise<{ success: boolean; error?: string }>;
    readFile?: (filename: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    deleteFile?: (filename: string) => Promise<{ success: boolean; error?: string }>;
    fileExists?: (filename: string) => Promise<boolean>;

    // Media files
    saveMedia?: (filename: string, arrayBuffer: ArrayBuffer) => Promise<{ success: boolean; error?: string; path?: string }>;
    readMedia?: (filename: string) => Promise<{ success: boolean; dataUrl?: string; mimeType?: string; error?: string }>;
    readMediaText?: (filename: string) => Promise<{ success: boolean; content?: string; error?: string }>;

    // Folder operations
    listFolder?: (folderName: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    saveToFolder?: (folderName: string, filename: string, data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
    deleteFromFolder?: (folderName: string, filename: string) => Promise<{ success: boolean; error?: string }>;

    // Data management
    getDataPath?: () => Promise<string>;
    openDataFolder?: () => Promise<{ success: boolean }>;
    showItemInFolder?: (itemPath: string) => Promise<{ success: boolean; error?: string }>;

    // Open external URLs in system browser
    openExternalUrl?: (url: string) => Promise<{ success: boolean; error?: string }>;

    // Data Export/Import
    exportAllData?: () => Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }>;
    importAllData?: () => Promise<{ success: boolean; canceled?: boolean; needsRestart?: boolean; error?: string }>;
    exportNotebookLM?: () => Promise<{ success: boolean; path?: string; error?: string }>;
    exportAIAssistant?: () => Promise<{ success: boolean; path?: string; error?: string }>;

    // App Control
    restartApp?: () => Promise<void>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
