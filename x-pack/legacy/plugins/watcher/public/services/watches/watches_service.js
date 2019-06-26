/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { ROUTES } from '../../../common/constants';
import { Watch } from 'plugins/watcher/models/watch';
import { npStart } from 'ui/new_platform';

export class WatchesService {
  constructor() {
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  getWatchList() {
    return npStart.core.http.get('/watches')
      .then(response => response.data.watches)
      .then(watches => watches.map(watch => {
        return Watch.fromUpstreamJson(watch);
      }));
  }

  /**
   * Delete a collection of watches
   *
   * @param watchIds Array of watch IDs
   * @return Promise { numSuccesses, numErrors }
   */
  deleteWatches(watchIds) {
    // $http.delete does not take the request body as the 2nd argument. Instead it expects the 2nd
    // argument to be a request options object, one of which can be the request body (data). We also
    // need to explicitly define the content type of the data.
    const body = {
      watchIds
    };
    return npStart.core.http.post('/watches/delete', { body })
      .then(response => response.data.results);
  }
}
