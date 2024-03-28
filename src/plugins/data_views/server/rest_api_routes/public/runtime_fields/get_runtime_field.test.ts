/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getRuntimeField } from './get_runtime_field';
import { dataViewsService } from '../../../mocks';
import { getUsageCollection } from '../test_utils';
import { DataViewLazy } from '../../../../common';

describe('get runtime field', () => {
  it('call usageCollection', () => {
    const usageCollection = getUsageCollection();

    dataViewsService.getDataViewLazy.mockImplementation(
      async (id: string) =>
        ({
          getFields: jest.fn().mockReturnValueOnce({ getFieldMap: () => ({}) }),
          getRuntimeField: jest.fn().mockReturnValueOnce({}),
          getFieldsByRuntimeFieldName: jest.fn().mockReturnValueOnce({}),
        } as unknown as DataViewLazy)
    );

    getRuntimeField({
      dataViewsService,
      counterName: 'GET /path',
      usageCollection,
      id: 'dataViewId',
      name: 'fieldName',
    });
    expect(usageCollection.incrementCounter).toBeCalledTimes(1);
  });
});
