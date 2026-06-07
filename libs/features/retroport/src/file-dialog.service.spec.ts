import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ElectronService } from '@keira/shared/common-services';
import { vi } from 'vitest';

import { FileDialogService } from './file-dialog.service';

describe('FileDialogService', () => {
  const invoke = vi.fn();
  const isElectron = vi.fn<() => unknown>();
  let service: FileDialogService;

  beforeEach(() => {
    invoke.mockReset();
    isElectron.mockReset().mockReturnValue('renderer');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ElectronService, useValue: { isElectron, ipcRenderer: { invoke } } },
        FileDialogService,
      ],
    });
    service = TestBed.inject(FileDialogService);
  });

  it('invokes the native directory picker and returns the chosen path', async () => {
    invoke.mockResolvedValue('/abs/To Convert/Druid/Cat');
    await expect(service.pickDirectory()).resolves.toBe('/abs/To Convert/Druid/Cat');
    expect(invoke).toHaveBeenCalledWith('dialog:openDirectory');
  });

  it('returns null when not running under Electron', async () => {
    isElectron.mockReturnValue(undefined);
    await expect(service.pickDirectory()).resolves.toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });
});
