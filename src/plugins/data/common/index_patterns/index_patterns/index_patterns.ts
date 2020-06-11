/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  SavedObjectsClientContract,
  SimpleSavedObject,
  IUiSettingsClient,
  HttpStart,
  CoreStart,
} from 'src/core/public';

import { createIndexPatternCache } from '.';
import { IndexPattern } from './index_pattern';
import { IndexPatternsApiClient, GetFieldsOptions } from '.';
import {
  createEnsureDefaultIndexPattern,
  EnsureDefaultIndexPattern,
} from './ensure_default_index_pattern';
import {
  getIndexPatternFieldListCreator,
  CreateIndexPatternFieldList,
  Field,
  FieldSpec,
} from '../fields';
import { IndexPatternSpec } from './types';
import { OnNotification, OnError } from '../types';
import { FieldFormatsStartCommon } from '../../field_formats';

const indexPatternCache = createIndexPatternCache();

type IndexPatternCachedFieldType = 'id' | 'title';

export interface IndexPatternSavedObjectAttrs {
  title: string;
}

export class IndexPatternsService {
  private config: IUiSettingsClient;
  private savedObjectsClient: SavedObjectsClientContract;
  private savedObjectsCache?: Array<SimpleSavedObject<IndexPatternSavedObjectAttrs>> | null;
  private apiClient: IndexPatternsApiClient;
  private fieldFormats: FieldFormatsStartCommon;
  private onNotification: OnNotification;
  private onError: OnError;
  ensureDefaultIndexPattern: EnsureDefaultIndexPattern;
  createFieldList: CreateIndexPatternFieldList;
  createField: (
    indexPattern: IndexPattern,
    spec: FieldSpec | Field,
    shortDotsEnable: boolean
  ) => Field;

  constructor(
    uiSettings: CoreStart['uiSettings'],
    savedObjectsClient: SavedObjectsClientContract,
    http: HttpStart,
    fieldFormats: FieldFormatsStartCommon,
    onNotification: OnNotification,
    onError: OnError,
    onRedirectNoIndexPattern: () => void
  ) {
    this.apiClient = new IndexPatternsApiClient(http);
    this.config = uiSettings;
    this.savedObjectsClient = savedObjectsClient;
    this.fieldFormats = fieldFormats;
    this.onNotification = onNotification;
    this.onError = onError;
    this.ensureDefaultIndexPattern = createEnsureDefaultIndexPattern(
      uiSettings,
      onRedirectNoIndexPattern
    );
    this.createFieldList = getIndexPatternFieldListCreator({
      fieldFormats,
      onNotification,
    });
    this.createField = (indexPattern, spec, shortDotsEnable) => {
      return new Field(indexPattern, spec, shortDotsEnable, {
        fieldFormats,
        onNotification,
      });
    };
  }

  private async refreshSavedObjectsCache() {
    this.savedObjectsCache = (
      await this.savedObjectsClient.find<IndexPatternSavedObjectAttrs>({
        type: 'index-pattern',
        fields: ['title'],
        perPage: 10000,
      })
    ).savedObjects;
  }

  getIds = async (refresh: boolean = false) => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj) => obj?.id);
  };

  getTitles = async (refresh: boolean = false): Promise<string[]> => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj) => obj?.attributes?.title);
  };

  getFields = async (fields: IndexPatternCachedFieldType[], refresh: boolean = false) => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj: Record<string, any>) => {
      const result: Partial<Record<IndexPatternCachedFieldType, string>> = {};
      fields.forEach(
        (f: IndexPatternCachedFieldType) => (result[f] = obj[f] || obj?.attributes?.[f])
      );
      return result;
    });
  };

  getFieldsForTimePattern = (options: GetFieldsOptions = {}) => {
    return this.apiClient.getFieldsForTimePattern(options);
  };

  getFieldsForWildcard = (options: GetFieldsOptions = {}) => {
    return this.apiClient.getFieldsForWildcard(options);
  };

  clearCache = (id?: string) => {
    this.savedObjectsCache = null;
    if (id) {
      indexPatternCache.clear(id);
    } else {
      indexPatternCache.clearAll();
    }
  };
  getCache = async () => {
    if (!this.savedObjectsCache) {
      await this.refreshSavedObjectsCache();
    }
    return this.savedObjectsCache;
  };

  getDefault = async () => {
    const defaultIndexPatternId = this.config.get('defaultIndex');
    if (defaultIndexPatternId) {
      return await this.get(defaultIndexPatternId);
    }

    return null;
  };

  get = async (id: string): Promise<IndexPattern> => {
    const cache = indexPatternCache.get(id);
    if (cache) {
      return cache;
    }

    const indexPattern = await this.make(id);

    return indexPatternCache.set(id, indexPattern);
  };

  deserializeIndexPattern(str: string) {
    const obj = JSON.parse(str) as IndexPatternSpec;
    const indexPattern = new IndexPattern(
      obj.id,
      (cfg: any) => this.config.get(cfg),
      this.savedObjectsClient,
      this.apiClient,
      indexPatternCache,
      this.fieldFormats,
      this.onNotification,
      this.onError
    );

    indexPattern.initFromObject(obj);
    return indexPattern;
  }

  make = async (id?: string): Promise<IndexPattern> => {
    const indexPattern = new IndexPattern(
      id,
      (cfg: any) => this.config.get(cfg),
      this.savedObjectsClient,
      this.apiClient,
      indexPatternCache,
      this.fieldFormats,
      this.onNotification,
      this.onError
    );
    // console.log('original', indexPattern);

    await indexPattern.init();

    /*
    const str = indexPattern.serialize();
    // console.log('serialized!', str);

    const cloned = this.deserializeIndexPattern(str);
    console.log('deserialized', cloned);
    */

    return indexPattern;
  };
}

export type IndexPatternsContract = PublicMethodsOf<IndexPatternsService>;
