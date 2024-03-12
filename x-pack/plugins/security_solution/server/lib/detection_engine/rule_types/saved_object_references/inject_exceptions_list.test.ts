/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SavedObjectReference } from '@kbn/core/server';
import { EXCEPTION_LIST_NAMESPACE } from '@kbn/securitysolution-list-constants';

import type { RuleParams } from '../../rule_schema';
import { injectExceptionsReferences } from './inject_exceptions_list';
import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './utils/constants';

describe('inject_exceptions_list', () => {
  type FuncReturn = ReturnType<typeof injectExceptionsReferences>;
  let logger = loggingSystemMock.create().get('security_solution');
  const mockExceptionsList = (): RuleParams['exceptionsList'] => [
    {
      id: '123',
      list_id: '456',
      type: 'detection',
      namespace_type: 'agnostic',
    },
  ];
  const mockSavedObjectReferences = (): SavedObjectReference[] => [
    {
      id: '123',
      name: `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_0`,
      type: EXCEPTION_LIST_NAMESPACE,
    },
  ];

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('returns empty array given an empty array for both "exceptionsList" and "savedObjectReferences"', () => {
    expect(
      injectExceptionsReferences({
        logger,
        exceptionsList: [],
        savedObjectReferences: [],
      })
    ).toEqual<FuncReturn>([]);
  });

  test('returns empty array given undefined', () => {
    expect(
      injectExceptionsReferences({
        logger,
        exceptionsList: undefined as unknown as RuleParams['exceptionsList'],
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual([]);
  });

  test('returns empty array given an empty array for "exceptionsList"', () => {
    expect(
      injectExceptionsReferences({
        logger,
        exceptionsList: [],
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>([]);
  });

  test('returns exceptions list array given an empty array for "savedObjectReferences"', () => {
    expect(
      injectExceptionsReferences({
        logger,
        exceptionsList: mockExceptionsList(),
        savedObjectReferences: [],
      })
    ).toEqual<FuncReturn>(mockExceptionsList());
  });

  test('returns parameters from the saved object if found', () => {
    expect(
      injectExceptionsReferences({
        logger,
        exceptionsList: mockExceptionsList(),
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>(mockExceptionsList());
  });

  test('does not log an error if it returns parameters from the saved object when found', () => {
    injectExceptionsReferences({
      logger,
      exceptionsList: mockExceptionsList(),
      savedObjectReferences: mockSavedObjectReferences(),
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('returns parameters from the saved object if found with a different saved object reference id', () => {
    expect(
      injectExceptionsReferences({
        logger,
        exceptionsList: mockExceptionsList(),
        savedObjectReferences: [{ ...mockSavedObjectReferences()[0], id: '456' }],
      })
    ).toEqual<FuncReturn>([{ ...mockExceptionsList()[0], id: '456' }]);
  });

  test('returns exceptionItem if the saved object reference cannot match as a fall back', () => {
    expect(
      injectExceptionsReferences({
        logger,
        exceptionsList: mockExceptionsList(),
        savedObjectReferences: [{ ...mockSavedObjectReferences()[0], name: 'other-name_0' }],
      })
    ).toEqual<FuncReturn>(mockExceptionsList());
  });

  test('logs an error if the saved object type could not be found', () => {
    injectExceptionsReferences({
      logger,
      exceptionsList: mockExceptionsList(),
      savedObjectReferences: [{ ...mockSavedObjectReferences()[0], name: 'other-name_0' }],
    });
    expect(logger.error).toBeCalledWith(
      'The saved object references were not found for our exception list when we were expecting to find it. Kibana migrations might not have run correctly or someone might have removed the saved object references manually. Returning the last known good exception list which might not work. Value being returned is: {"id":"123","list_id":"456","type":"detection","namespace_type":"agnostic"}'
    );
  });
});
