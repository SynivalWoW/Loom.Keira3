import { inject, Injectable } from '@angular/core';
import { ElectronService } from './electron.service';

export interface FileFilter {
  name: string;
  extensions: string[];
}

/**
 * Thin wrapper over the Electron main-process native open dialogs
 * (`ipcMain.handle('dialog:openDirectory' | 'dialog:openFile')` in main.ts). Returns the chosen
 * absolute path, or null when cancelled or when not running under Electron (e.g. the web build).
 */
@Injectable({
  providedIn: 'root',
})
export class FileDialogService {
  private readonly electronService = inject(ElectronService);

  async pickDirectory(): Promise<string | null> {
    if (!this.electronService.isElectron()) {
      return null;
    }
    return this.electronService.ipcRenderer.invoke('dialog:openDirectory');
  }

  async pickFile(filters?: FileFilter[]): Promise<string | null> {
    if (!this.electronService.isElectron()) {
      return null;
    }
    return this.electronService.ipcRenderer.invoke('dialog:openFile', filters);
  }
}
