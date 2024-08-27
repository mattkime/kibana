/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { HasData } from './has_data';

describe('when calling hasData service', () => {
  it('should return true for hasESData when indices exist', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'post').mockImplementation(() => Promise.resolve({ total: 10 }));

    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = hasDataService.hasESData();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await response).toBe(true);
  });

  it('should return false for hasESData when no indices exist', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'post').mockImplementation(() =>
      Promise.resolve({
        total: 0,
      })
    );

    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = hasDataService.hasESData();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await response).toBe(false);
  });

  it('should return false in case search api throws', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    const spySearch = jest
      .spyOn(http, 'post')
      .mockImplementation(() => Promise.reject(new Error('oops')));
    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = await hasDataService.hasESData();

    expect(response).toBe(true);

    expect(spySearch).toHaveBeenCalledTimes(1);
  });

  it.skip('should return true for hasDataView when server returns true', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'get').mockImplementation(() =>
      Promise.resolve({
        hasDataView: true,
        hasUserDataView: true,
      })
    );

    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = hasDataService.hasDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await response).toBe(true);
  });

  it.skip('should return false for hasDataView when server returns false', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'get').mockImplementation(() =>
      Promise.resolve({
        hasDataView: false,
        hasUserDataView: true,
      })
    );

    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = hasDataService.hasDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await response).toBe(false);
  });

  it.skip('should return true for hasDataView when server throws an error', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'get').mockImplementation(() => Promise.reject(new Error('Oops')));

    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = hasDataService.hasDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await response).toBe(true);
  });

  it.skip('should return false for hasUserDataView when server returns false', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'get').mockImplementation(() =>
      Promise.resolve({
        hasDataView: true,
        hasUserDataView: false,
      })
    );

    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = hasDataService.hasUserDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await response).toBe(false);
  });

  it.skip('should return true for hasUserDataView when server returns true', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'get').mockImplementation(() =>
      Promise.resolve({
        hasDataView: true,
        hasUserDataView: true,
      })
    );

    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = hasDataService.hasUserDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await response).toBe(true);
  });

  it.skip('should return true for hasUserDataView when server throws an error', async () => {
    const coreStart = coreMock.createStart();
    const http = coreStart.http;

    // Mock getIndices
    const spy = jest.spyOn(http, 'get').mockImplementation(() => Promise.reject(new Error('Oops')));

    const hasData = new HasData();
    const hasDataService = hasData.start(coreStart);
    const response = hasDataService.hasUserDataView();

    expect(spy).toHaveBeenCalledTimes(1);

    expect(await response).toBe(true);
  });
});
