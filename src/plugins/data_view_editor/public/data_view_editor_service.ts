/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounce } from 'lodash';

import {
  DataViewsServicePublic,
  MatchedItem,
  INDEX_PATTERN_TYPE,
  DataViewField,
} from '@kbn/data-views-plugin/public';

import { RollupIndicesCapsResponse, MatchedIndicesSet, TimestampOption } from './types';
import { getMatchedIndices, ensureMinimumTime, extractTimeFields } from './lib';
import { GetFieldsOptions } from './shared_imports';

export class DataViewEditorService {
  constructor(private http: HttpSetup, private dataViews: DataViewsServicePublic) {
    this.rollupCapsResponse = this.getRollupIndexCaps();
  }

  rollupIndicesCapabilities$ = new BehaviorSubject<RollupIndicesCapsResponse>({});
  isLoadingSources$ = new BehaviorSubject<boolean>(false);

  loadingTimestampFields$ = new BehaviorSubject<boolean>(false);
  timestampFieldOptions$ = new Subject<TimestampOption[]>();

  matchedIndices$ = new BehaviorSubject<MatchedIndicesSet>({
    allIndices: [],
    exactMatchedIndices: [],
    partialMatchedIndices: [],
    visibleIndices: [],
  });

  private rollupCapsResponse: Promise<RollupIndicesCapsResponse>;

  private currentLoadingTimestampFields = 0;

  private getRollupIndexCaps = async () => {
    let response: RollupIndicesCapsResponse = {};
    try {
      response = await this.http.get<RollupIndicesCapsResponse>('/api/rollup/indices');
    } catch (e) {
      // Silently swallow failure responses such as expired trials
    }
    this.rollupIndicesCapabilities$.next(response);
    return response;
  };

  private getRollupIndices = (rollupCaps: RollupIndicesCapsResponse) => Object.keys(rollupCaps);

  getIsRollupIndex = async () => {
    const response = await this.rollupCapsResponse;
    return (indexName: string) => this.getRollupIndices(response).includes(indexName);
  };

  loadMatchedIndices = async (
    query: string,
    allowHidden: boolean,
    allSources: MatchedItem[]
  ): Promise<{
    matchedIndicesResult: MatchedIndicesSet;
    exactMatched: MatchedItem[];
    partialMatched: MatchedItem[];
  }> => {
    const indexRequests = [];

    if (query?.endsWith('*')) {
      const exactMatchedQuery = this.debounceGetIndices({
        pattern: query,
        showAllIndices: allowHidden,
      });
      indexRequests.push(exactMatchedQuery);
      // provide default value when not making a request for the partialMatchQuery
      indexRequests.push(Promise.resolve([]));
    } else {
      const exactMatchQuery = this.debounceGetIndices({
        pattern: query,
        showAllIndices: allowHidden,
      });
      const partialMatchQuery = this.debounceGetIndices({
        pattern: `${query}*`,
        showAllIndices: allowHidden,
      });

      indexRequests.push(exactMatchQuery);
      indexRequests.push(partialMatchQuery);
    }

    const [exactMatched, partialMatched] = (await ensureMinimumTime(
      indexRequests
    )) as MatchedItem[][];

    const matchedIndicesResult = getMatchedIndices(
      allSources,
      partialMatched,
      exactMatched,
      allowHidden
    );

    this.matchedIndices$.next(matchedIndicesResult);
    return { matchedIndicesResult, exactMatched, partialMatched };
  };

  loadIndices = async (title: string, allowHidden: boolean) => {
    const allSrcs = await this.debounceGetIndices({
      pattern: '*',
      showAllIndices: allowHidden,
    });

    const matchedSet = await this.loadMatchedIndices(title, allowHidden, allSrcs);

    this.isLoadingSources$.next(false);
    const matchedIndices = getMatchedIndices(
      allSrcs,
      matchedSet.partialMatched,
      matchedSet.exactMatched,
      allowHidden
    );

    this.matchedIndices$.next(matchedIndices);
    return matchedIndices;
  };

  loadDataViewNames = async (dataViewName?: string) => {
    const dataViewListItems = await this.dataViews.getIdsWithTitle(dataViewName ? true : false);
    const dataViewNames = dataViewListItems.map((item) => item.name || item.title);
    return dataViewName ? dataViewNames.filter((v) => v !== dataViewName) : dataViewNames;
  };

  private getIndicesMemory: Record<string, Promise<MatchedItem[]>> = {};
  debounceGetIndices = async (props: { pattern: string; showAllIndices?: boolean | undefined }) => {
    const debouncedRequest = debounce(this.dataViews.getIndices, 60000, {
      leading: true,
    });

    const key = JSON.stringify(props);
    this.getIndicesMemory[key] =
      this.getIndicesMemory[key] ||
      debouncedRequest({ ...props, isRollupIndex: await this.getIsRollupIndex() });
    return await this.getIndicesMemory[key];
  };

  private timeStampOptionsMemory: Record<string, Promise<TimestampOption[]>> = {};
  private getTimestampOptionsForWildcard = async (
    getFieldsOptions: GetFieldsOptions,
    requireTimestampField: boolean
  ) => {
    const fields = await ensureMinimumTime(this.dataViews.getFieldsForWildcard(getFieldsOptions));
    return extractTimeFields(fields as DataViewField[], requireTimestampField);
  };

  private debounceGetTimestampOptionsForWildcard = async (
    getFieldsOptions: GetFieldsOptions,
    requireTimestampField: boolean
  ) => {
    const debouncedRequest = debounce(this.getTimestampOptionsForWildcard, 60000, {
      leading: true,
    });

    const key = JSON.stringify(getFieldsOptions) + requireTimestampField;
    this.timeStampOptionsMemory[key] =
      this.timeStampOptionsMemory[key] || debouncedRequest(getFieldsOptions, requireTimestampField);
    return await this.timeStampOptionsMemory[key];
  };

  loadTimestampFields = async (
    index: string,
    type: INDEX_PATTERN_TYPE,
    requireTimestampField: boolean,
    rollupIndex?: string
  ) => {
    if (this.matchedIndices$.getValue().exactMatchedIndices.length === 0) {
      this.timestampFieldOptions$.next([]);
      return;
    }
    const currentLoadingTimestampFieldsIdx = ++this.currentLoadingTimestampFields;
    this.loadingTimestampFields$.next(true);
    const getFieldsOptions: GetFieldsOptions = {
      pattern: index,
    };
    if (type === INDEX_PATTERN_TYPE.ROLLUP) {
      getFieldsOptions.type = INDEX_PATTERN_TYPE.ROLLUP;
      getFieldsOptions.rollupIndex = rollupIndex;
    }

    const timestampOptions = await this.debounceGetTimestampOptionsForWildcard(
      getFieldsOptions,
      requireTimestampField
    );
    if (currentLoadingTimestampFieldsIdx === this.currentLoadingTimestampFields) {
      this.timestampFieldOptions$.next(timestampOptions);
      this.loadingTimestampFields$.next(false);
    }
  };
}
