/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from './with_proc_runner';
import { ProcRunner } from './proc_runner';

it('passes proc runner to a function', async () => {
  await withProcRunner(new ToolingLog(), async (proc) => {
    expect(proc).toBeInstanceOf(ProcRunner);
  });
});

it('calls procRunner.teardown() if function returns synchronously', async () => {
  let teardownSpy;
  await withProcRunner(new ToolingLog(), async (proc) => {
    teardownSpy = jest.spyOn(proc, 'teardown');
  });

  expect(teardownSpy).toHaveBeenCalled();
});

it('calls procRunner.teardown() if function throw synchronous error, and rejects with the error', async () => {
  const error = new Error('foo');
  let teardownSpy;

  await expect(
    withProcRunner(new ToolingLog(), async (proc) => {
      teardownSpy = jest.spyOn(proc, 'teardown');
      throw error;
    })
  ).rejects.toThrowError(error);

  expect(teardownSpy).toHaveBeenCalled();
});

it('waits for promise to resolve before tearing down proc', async () => {
  let teardownSpy;

  await withProcRunner(new ToolingLog(), async (proc) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    teardownSpy = jest.spyOn(proc, 'teardown');
  });

  expect(teardownSpy).not.toBe(undefined);
  expect(teardownSpy).toHaveBeenCalled();
});

it('waits for promise to reject before tearing down proc and rejecting with the error', async () => {
  const error = new Error('foo');
  let teardownSpy;

  await expect(
    withProcRunner(new ToolingLog(), async (proc) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      teardownSpy = jest.spyOn(proc, 'teardown');
      throw error;
    })
  ).rejects.toThrowError(error);

  expect(teardownSpy).not.toBe(undefined);
  expect(teardownSpy).toHaveBeenCalled();
});

it('waits for every RegExp when wait is an array', async () => {
  const firstMarkerPath = Path.join(Os.tmpdir(), `proc-runner-wait-array-first-${process.pid}`);
  const secondMarkerPath = Path.join(Os.tmpdir(), `proc-runner-wait-array-second-${process.pid}`);

  for (const markerPath of [firstMarkerPath, secondMarkerPath]) {
    if (Fs.existsSync(markerPath)) {
      Fs.rmSync(markerPath);
    }
  }

  const wait = async (ms: number) => {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, ms);
    return promise;
  };

  await withProcRunner(new ToolingLog(), async (proc) => {
    const procRun = proc.run('wait-array', {
      cmd: process.execPath,
      args: [
        '-e',
        `const fs = require('fs'); fs.writeFileSync(${JSON.stringify(
          firstMarkerPath
        )}, 'done'); console.log('first'); setTimeout(() => { fs.writeFileSync(${JSON.stringify(
          secondMarkerPath
        )}, 'done'); console.log('second'); }, 1000);`,
      ],
      cwd: process.cwd(),
      wait: [/first/, /second/],
      waitTimeout: 5000,
    });

    while (!Fs.existsSync(firstMarkerPath)) {
      await wait(20);
    }

    expect(Fs.existsSync(secondMarkerPath)).toBe(false);

    await procRun;
    expect(Fs.readFileSync(secondMarkerPath, 'utf8')).toBe('done');
  });
});
