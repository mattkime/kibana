/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { BehaviorSubject, Subject, first, firstValueFrom } from 'rxjs';

import {
  DataViewsServicePublic,
  MatchedItem,
  INDEX_PATTERN_TYPE,
  DataViewField,
} from '@kbn/data-views-plugin/public';

import { RollupIndicesCapsResponse, MatchedIndicesSet, TimestampOption } from './types';
import { getMatchedIndices, ensureMinimumTime, extractTimeFields } from './lib';
import { GetFieldsOptions } from './shared_imports';

export const matchedIndiciesDefault = {
  allIndices: [],
  exactMatchedIndices: [],
  partialMatchedIndices: [],
  visibleIndices: [],
};

export interface DataViewEditorServiceConstructorArgs {
  http: HttpSetup;
  dataViews: DataViewsServicePublic;
  initialName?: string;
}

export class DataViewEditorService {
  constructor({ http, dataViews, initialName }: DataViewEditorServiceConstructorArgs) {
    this.http = http;
    this.dataViews = dataViews;

    // fire off a couple of requests that we know we'll need
    this.rollupCapsResponse = this.getRollupIndexCaps();
    this.dataViewNames = this.loadDataViewNames(initialName);

    // alternate value with undefined so validation knows when its getting a fresh value
    this.matchedIndices$.subscribe((matchedIndices) => {
      this.matchedIndicesForProvider$.next(matchedIndices);
      this.matchedIndicesForProvider$.next(undefined);
    });

    // alternate value with undefined so validation knows when its getting a fresh value
    this.rollupIndex$.subscribe((rollupIndex) => {
      this.rollupIndexForProvider$.next(rollupIndex);
      this.rollupIndexForProvider$.next(undefined);
    });
  }

  private http: HttpSetup;
  private dataViews: DataViewsServicePublic;

  // used for data view name validation - no dupes!
  dataViewNames: Promise<string[]>;

  // used for validating rollup data views - must match one and only one data view
  rollupIndicesCapabilities$ = new BehaviorSubject<RollupIndicesCapsResponse>({});
  isLoadingSources$ = new BehaviorSubject<boolean>(false);

  loadingTimestampFields$ = new BehaviorSubject<boolean>(false);
  timestampFieldOptions$ = new Subject<TimestampOption[]>();

  // current matched rollup index
  rollupIndex$ = new BehaviorSubject<string | undefined | null>(undefined);
  // alernates between value and undefined so validation can treat new value as thought its a promise
  rollupIndexForProvider$ = new Subject<string | undefined | null>();

  matchedIndices$ = new BehaviorSubject<MatchedIndicesSet>({
    allIndices: [],
    exactMatchedIndices: [],
    partialMatchedIndices: [],
    visibleIndices: [],
  });

  // alernates between value and undefined so validation can treat new value as thought its a promise
  matchedIndicesForProvider$ = new Subject<MatchedIndicesSet | undefined>();

  private rollupCapsResponse: Promise<RollupIndicesCapsResponse>;

  private currentLoadingTimestampFields = 0;
  private currentLoadingMatchedIndices = 0;

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
    allSources: MatchedItem[],
    type: INDEX_PATTERN_TYPE
  ): Promise<void> => {
    const currentLoadingMatchedIndicesIdx = ++this.currentLoadingMatchedIndices;
    const isRollupIndex = await this.getIsRollupIndex();
    const indexRequests = [];
    let newRollupIndexName: string | undefined | null;

    if (query?.endsWith('*')) {
      const exactMatchedQuery = this.getIndicesCached({
        pattern: query,
        showAllIndices: allowHidden,
      });

      indexRequests.push(exactMatchedQuery);
      // provide default value when not making a request for the partialMatchQuery
      indexRequests.push(Promise.resolve([]));
    } else {
      const exactMatchQuery = this.getIndicesCached({
        pattern: query,
        showAllIndices: allowHidden,
      });
      const partialMatchQuery = this.getIndicesCached({
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

    // verify we're looking at the current result
    if (currentLoadingMatchedIndicesIdx === this.currentLoadingMatchedIndices) {
      if (type === INDEX_PATTERN_TYPE.ROLLUP) {
        const rollupIndices = exactMatched.filter((index) => isRollupIndex(index.name));
        newRollupIndexName = rollupIndices.length === 1 ? rollupIndices[0].name : null;
        this.rollupIndex$.next(newRollupIndexName);
      } else {
        this.rollupIndex$.next(null);
      }

      this.matchedIndices$.next(matchedIndicesResult);
    }
  };

  loadIndices = async (title: string, allowHidden: boolean, type: INDEX_PATTERN_TYPE) => {
    const isRollupIndex = await this.getIsRollupIndex();
    const allSrcs = await this.dataViews.getIndices({
      isRollupIndex,
      pattern: '*',
      showAllIndices: allowHidden,
    });
    await this.loadMatchedIndices(title, allowHidden, allSrcs, type);

    this.isLoadingSources$.next(false);
  };

  private loadDataViewNames = async (initialName?: string) => {
    const dataViewListItems = await this.dataViews.getIdsWithTitle(true);
    const dataViewNames = dataViewListItems.map((item) => item.name || item.title);
    return initialName ? dataViewNames.filter((v) => v !== initialName) : dataViewNames;
  };

  private getIndicesMemory: Record<string, Promise<MatchedItem[]>> = {};

  getIndicesCached = async (props: { pattern: string; showAllIndices?: boolean | undefined }) => {
    const key = JSON.stringify(props);

    this.getIndicesMemory[key] =
      this.getIndicesMemory[key] ||
      this.getIsRollupIndex().then((isRollupIndex) =>
        this.dataViews.getIndices({ ...props, isRollupIndex })
      );

    this.getIndicesMemory[key].catch(() => {
      delete this.getIndicesMemory[key];
    });

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

  private getTimestampOptionsForWildcardCached = async (
    getFieldsOptions: GetFieldsOptions,
    requireTimestampField: boolean
  ) => {
    const key = JSON.stringify(getFieldsOptions) + requireTimestampField;

    const getTimestampOptionsPromise = this.getTimestampOptionsForWildcard(
      getFieldsOptions,
      requireTimestampField
    );
    this.timeStampOptionsMemory[key] =
      this.timeStampOptionsMemory[key] || getTimestampOptionsPromise;

    getTimestampOptionsPromise.catch(() => {
      delete this.timeStampOptionsMemory[key];
    });

    return await getTimestampOptionsPromise;
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

    let timestampOptions: TimestampOption[] = [];
    try {
      timestampOptions = await this.getTimestampOptionsForWildcardCached(
        getFieldsOptions,
        requireTimestampField
      );
    } finally {
      if (currentLoadingTimestampFieldsIdx === this.currentLoadingTimestampFields) {
        this.timestampFieldOptions$.next(timestampOptions);
        this.loadingTimestampFields$.next(false);
      }
    }
  };

  indexPatternValidationProvider = async () => {
    const rollupIndexPromise = firstValueFrom(
      // todo track this guy
      this.rollupIndex$.pipe(first((data) => data !== undefined))
    );

    const matchedIndicesPromise = firstValueFrom(
      this.matchedIndicesForProvider$.pipe(first((data) => data !== undefined))
    );

    // Wait until we have fetched the indices.
    // The result will then be sent to the field validator(s) (when calling await provider(););
    const [rollupIndex, matchedIndices] = await Promise.all([
      rollupIndexPromise,
      matchedIndicesPromise,
    ]);

    return { rollupIndex, matchedIndices: matchedIndices || matchedIndiciesDefault };
  };
}
