/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTrustedAppsFilter } from '.';

describe('getTrustedAppsFilter', () => {
  test('it returns filter to search for "exception-list" namespace trusted apps', () => {
    const filter = getTrustedAppsFilter(true, ['exception-list']);

    expect(filter).toEqual('(exception-list.attributes.list_id: endpoint_trusted_apps*)');
  });

  test('it returns filter to search for "exception-list" and "agnostic" namespace trusted apps', () => {
    const filter = getTrustedAppsFilter(true, ['exception-list', 'exception-list-agnostic']);

    expect(filter).toEqual(
      '(exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
    );
  });

  test('it returns filter to exclude "exception-list" namespace trusted apps', () => {
    const filter = getTrustedAppsFilter(false, ['exception-list']);

    expect(filter).toEqual('(not exception-list.attributes.list_id: endpoint_trusted_apps*)');
  });

  test('it returns filter to exclude "exception-list" and "agnostic" namespace trusted apps', () => {
    const filter = getTrustedAppsFilter(false, ['exception-list', 'exception-list-agnostic']);

    expect(filter).toEqual(
      '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
    );
  });
});
