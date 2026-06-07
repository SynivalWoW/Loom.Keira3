import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ElectronService } from '@keira/shared/common-services';
import { vi } from 'vitest';

import { OrchestratorBridgeService } from './orchestrator-bridge.service';

/** A fake child_process whose stream/lifecycle callbacks can be driven from the test. */
function makeFakeChild() {
  const stdout: Record<string, (chunk: Buffer) => void> = {};
  const stderr: Record<string, (chunk: Buffer) => void> = {};
  const lifecycle: Record<string, (arg: unknown) => void> = {};

  const child = {
    stdout: {
      on: (event: string, cb: (chunk: Buffer) => void) => {
        stdout[event] = cb;
      },
    },
    stderr: {
      on: (event: string, cb: (chunk: Buffer) => void) => {
        stderr[event] = cb;
      },
    },
    on: (event: string, cb: (arg: unknown) => void) => {
      lifecycle[event] = cb;
    },
  };

  return {
    child,
    emitStdout: (data: string) => stdout['data'](Buffer.from(data)),
    emitStderr: (data: string) => stderr['data'](Buffer.from(data)),
    emitClose: (code: number) => lifecycle['close'](code),
    emitError: (error: Error) => lifecycle['error'](error),
  };
}

describe('OrchestratorBridgeService', () => {
  const spawn = vi.fn();
  const isElectron = vi.fn<() => unknown>();
  let service: OrchestratorBridgeService;

  beforeEach(() => {
    spawn.mockReset();
    isElectron.mockReset().mockReturnValue('renderer');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ElectronService, useValue: { isElectron, childProcess: { spawn } } },
        OrchestratorBridgeService,
      ],
    });
    service = TestBed.inject(OrchestratorBridgeService);
  });

  it('resolves with parsed JSON and streams stdout on success', async () => {
    const fake = makeFakeChild();
    spawn.mockReturnValue(fake.child);
    const logs: string[] = [];

    const promise = service.runOrchestrator(['loom_orchestrator.py', '/out', '{}'], (line) => logs.push(line));
    fake.emitStdout('{"status": "ok", "display_id": 5}');
    fake.emitClose(0);

    const result = await promise;
    expect(result.status).toBe('ok');
    expect(result.display_id).toBe(5);
    expect(spawn).toHaveBeenCalledWith('python', ['loom_orchestrator.py', '/out', '{}']);
    expect(logs.join('')).toContain('ok');
  });

  it('runForModel maps script path + folder + mapping into the python args', async () => {
    const fake = makeFakeChild();
    spawn.mockReturnValue(fake.child);

    const mapping = { internal_name: 'Cat', target_folder: 'Druid' };
    const promise = service.runForModel('/ml/loom_orchestrator.py', '/out/Druid/Cat', mapping, () => undefined);
    fake.emitStdout('{"status":"ok","display_id":80040}');
    fake.emitClose(0);

    const result = await promise;
    expect(result.display_id).toBe(80040);
    expect(spawn).toHaveBeenCalledWith('python', ['/ml/loom_orchestrator.py', '/out/Druid/Cat', JSON.stringify(mapping)]);
  });

  it('runForModel appends --gen-dbc and --display-id when requested', async () => {
    const fake = makeFakeChild();
    spawn.mockReturnValue(fake.child);

    const mapping = { internal_name: 'Cat' };
    const promise = service.runForModel('s.py', '/out', mapping, () => undefined, { genDbc: true, displayId: 80040 });
    fake.emitStdout('{"status":"ok"}');
    fake.emitClose(0);

    await promise;
    expect(spawn).toHaveBeenCalledWith('python', ['s.py', '/out', JSON.stringify(mapping), '--gen-dbc', '--display-id', '80040']);
  });

  it('runForModel appends --convert and --converter when requested', async () => {
    const fake = makeFakeChild();
    spawn.mockReturnValue(fake.child);

    const mapping = { internal_name: 'Cat' };
    const promise = service.runForModel('s.py', '/out', mapping, () => undefined, { convert: true, converterPath: '/c/conv.exe' });
    fake.emitStdout('{"status":"ok"}');
    fake.emitClose(0);

    await promise;
    expect(spawn).toHaveBeenCalledWith('python', ['s.py', '/out', JSON.stringify(mapping), '--convert', '--converter', '/c/conv.exe']);
  });

  it('prefixes streamed stderr', async () => {
    const fake = makeFakeChild();
    spawn.mockReturnValue(fake.child);
    const logs: string[] = [];

    const promise = service.runOrchestrator([], (line) => logs.push(line));
    fake.emitStderr('warn!');
    fake.emitStdout('{"success": true}');
    fake.emitClose(0);

    await promise;
    expect(logs.some((line) => line.includes('[stderr] warn!'))).toBe(true);
  });

  it('rejects on a non-zero exit code', async () => {
    const fake = makeFakeChild();
    spawn.mockReturnValue(fake.child);

    const promise = service.runOrchestrator([], () => undefined);
    fake.emitClose(1);

    await expect(promise).rejects.toThrow(/exited with code 1/);
  });

  it('rejects when stdout is not valid JSON', async () => {
    const fake = makeFakeChild();
    spawn.mockReturnValue(fake.child);

    const promise = service.runOrchestrator([], () => undefined);
    fake.emitStdout('not-json');
    fake.emitClose(0);

    await expect(promise).rejects.toThrow(/Failed to parse/);
  });

  it('rejects when the child emits an error', async () => {
    const fake = makeFakeChild();
    spawn.mockReturnValue(fake.child);

    const promise = service.runOrchestrator([], () => undefined);
    fake.emitError(new Error('spawn fail'));

    await expect(promise).rejects.toThrow(/spawn fail/);
  });

  it('rejects when not running under Electron', async () => {
    isElectron.mockReturnValue(undefined);
    await expect(service.runOrchestrator([], () => undefined)).rejects.toThrow(/requires Electron/);
    expect(spawn).not.toHaveBeenCalled();
  });
});
