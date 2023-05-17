/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import type { SavedSearchAttributes } from '../../../common';
import { fromSavedSearchAttributes as fromSavedSearchAttributesCommon } from '../../../common';
import type { SavedSearch } from './types';

export { getSavedSearchUrl, getSavedSearchFullPathUrl } from '../../../common';

export const fromSavedSearchAttributes = (
  id: string,
  attributes: SavedSearchAttributes,
  tags: string[] | undefined,
  searchSource: SavedSearch['searchSource'],
  sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps']
): SavedSearch => ({
  ...fromSavedSearchAttributesCommon(id, attributes, tags, searchSource),
  sharingSavedObjectProps,
});

export const toSavedSearchAttributes = (
  savedSearch: SavedSearch,
  searchSourceJSON: string
): SavedSearchAttributes => ({
  kibanaSavedObjectMeta: { searchSourceJSON },
  title: savedSearch.title ?? '',
  sort: savedSearch.sort ?? [],
  columns: savedSearch.columns ?? [],
  description: savedSearch.description ?? '',
  grid: savedSearch.grid ?? {},
  hideChart: savedSearch.hideChart ?? false,
  viewMode: savedSearch.viewMode,
  hideAggregatedPreview: savedSearch.hideAggregatedPreview,
  rowHeight: savedSearch.rowHeight,
  isTextBasedQuery: savedSearch.isTextBasedQuery ?? false,
  usesAdHocDataView: savedSearch.usesAdHocDataView,
  timeRestore: savedSearch.timeRestore ?? false,
  timeRange: savedSearch.timeRange ? pick(savedSearch.timeRange, ['from', 'to']) : undefined,
  refreshInterval: savedSearch.refreshInterval,
  rowsPerPage: savedSearch.rowsPerPage,
  breakdownField: savedSearch.breakdownField,
});
