/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientPublicToCommon } from './saved_objects_client_wrapper';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { DataViewSavedObjectConflictError } from '../common';

describe('SavedObjectsClientPublicToCommon', () => {
  const soClient = {} as ContentClient;

  test('get saved object - exactMatch', async () => {
    const mockedSavedObject = {
      version: 'abc',
    };
    soClient.get = jest
      .fn()
      .mockResolvedValue({ meta: { outcome: 'exactMatch' }, item: mockedSavedObject });
    const service = new SavedObjectsClientPublicToCommon(soClient);
    const result = await service.get('1');
    expect(result).toStrictEqual(mockedSavedObject);
  });

  test('get saved object - aliasMatch', async () => {
    const mockedSavedObject = {
      version: 'def',
    };
    soClient.get = jest
      .fn()
      .mockResolvedValue({ meta: { outcome: 'aliasMatch' }, item: mockedSavedObject });
    const service = new SavedObjectsClientPublicToCommon(soClient);
    const result = await service.get('1');
    expect(result).toStrictEqual(mockedSavedObject);
  });

  test('get saved object - conflict', async () => {
    const mockedSavedObject = {
      version: 'ghi',
    };

    soClient.get = jest
      .fn()
      .mockResolvedValue({ meta: { outcome: 'conflict' }, item: mockedSavedObject });
    const service = new SavedObjectsClientPublicToCommon(soClient);

    await expect(service.get('1')).rejects.toThrow(DataViewSavedObjectConflictError);
  });
});
