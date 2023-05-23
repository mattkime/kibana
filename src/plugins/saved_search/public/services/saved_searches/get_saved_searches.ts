/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsClientContract } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { injectSearchSourceReferences, parseSearchSourceJSON } from '@kbn/data-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SavedSearchAttributes } from '../../../common';
import type { SavedSearch } from './types';
import { SAVED_SEARCH_TYPE } from './constants';
import { fromSavedSearchAttributes } from './saved_searches_utils';

interface GetSavedSearchDependencies {
  search: DataPublicPluginStart['search'];
  savedObjectsClient: SavedObjectsClientContract;
  spaces?: SpacesApi;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

const getSavedSearchUrlConflictMessage = async (savedSearch: SavedSearch) =>
  i18n.translate('savedSearch.legacyURLConflict.errorMessage', {
    defaultMessage: `This search has the same URL as a legacy alias. Disable the alias to resolve this error : {json}`,
    values: {
      json: savedSearch.sharingSavedObjectProps?.errorJSON,
    },
  });

export const getSavedSearch = async (
  savedSearchId: string,
  { search, savedObjectsClient, spaces, savedObjectsTagging }: GetSavedSearchDependencies
) => {
  const so = await savedObjectsClient.resolve<SavedSearchAttributes>(
    SAVED_SEARCH_TYPE,
    savedSearchId
  );

  if (!so.saved_object || so.saved_object.error) {
    throw new SavedObjectNotFound(SAVED_SEARCH_TYPE, savedSearchId);
  }

  const savedSearch = so.saved_object;

  const parsedSearchSourceJSON = parseSearchSourceJSON(
    savedSearch.attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'
  );

  const searchSourceValues = injectSearchSourceReferences(
    parsedSearchSourceJSON as Parameters<typeof injectSearchSourceReferences>[0],
    savedSearch.references
  );

  const tags = savedObjectsTagging
    ? savedObjectsTagging.ui.getTagIdsFromReferences(savedSearch.references)
    : undefined;

  const returnVal = fromSavedSearchAttributes(
    savedSearchId,
    savedSearch.attributes,
    tags,
    so.saved_object.references,
    await search.searchSource.create(searchSourceValues),
    {
      outcome: so.outcome,
      aliasTargetId: so.alias_target_id,
      aliasPurpose: so.alias_purpose,
      errorJSON:
        so.outcome === 'conflict' && spaces
          ? JSON.stringify({
              targetType: SAVED_SEARCH_TYPE,
              sourceId: savedSearchId,
              targetSpace: (await spaces.getActiveSpace()).id,
            })
          : undefined,
    }
  );

  if (returnVal.sharingSavedObjectProps?.errorJSON) {
    throw new Error(await getSavedSearchUrlConflictMessage(returnVal));
  }

  return returnVal;
};

/**
 * Returns a new saved search
 * Used when e.g. Discover is opened without a saved search id
 * @param search
 */
export const getNewSavedSearch = ({
  search,
}: {
  search: DataPublicPluginStart['search'];
}): SavedSearch => ({
  searchSource: search.searchSource.createEmpty(),
});
