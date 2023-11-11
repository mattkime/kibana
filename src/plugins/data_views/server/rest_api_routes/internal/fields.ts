/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHash } from 'crypto';
import { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { IRouter, RequestHandler, StartServicesAccessor, KibanaRequest } from '@kbn/core/server';
// import { FullValidationConfig } from '@kbn/core-http-server';
import { unwrapEtag } from '../../../common/utils';
import { IndexPatternsFetcher } from '../../fetcher';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import type { FieldDescriptorRestResponse } from '../route_types';
import { FIELDS_PATH as path } from '../../../common/constants';

/**
 * Accepts one of the following:
 * 1. An array of field names
 * 2. A JSON-stringified array of field names
 * 3. A single field name (not comma-separated)
 * @returns an array of field names
 * @param fields
 */
export const parseFields = (fields: string | string[]): string[] => {
  if (Array.isArray(fields)) return fields;
  try {
    return JSON.parse(fields);
  } catch (e) {
    if (!fields.includes(',')) return [fields];
    throw new Error(
      'metaFields should be an array of field names, a JSON-stringified array of field names, or a single field name'
    );
  }
};

type IBody = { index_filter?: estypes.QueryDslQueryContainer } | undefined;
interface IQuery {
  pattern: string;
  meta_fields: string | string[];
  type?: string;
  rollup_index?: string;
  allow_no_index?: boolean;
  include_unmapped?: boolean;
  fields?: string[];
}

const querySchema = schema.object({
  pattern: schema.string(),
  meta_fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
    defaultValue: [],
  }),
  type: schema.maybe(schema.string()),
  rollup_index: schema.maybe(schema.string()),
  allow_no_index: schema.maybe(schema.boolean()),
  include_unmapped: schema.maybe(schema.boolean()),
  fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
});

/**
const fieldSubTypeSchema = schema.object({
  multi: schema.maybe(schema.object({ parent: schema.string() })),
  nested: schema.maybe(schema.object({ path: schema.string() })),
});

/*
const FieldDescriptorSchema = schema.object({
  aggregatable: schema.boolean(),
  name: schema.string(),
  readFromDocValues: schema.boolean(),
  searchable: schema.boolean(),
  type: schema.string(),
  esTypes: schema.maybe(schema.arrayOf(schema.string())),
  subType: fieldSubTypeSchema,
  metadata_field: schema.maybe(schema.boolean()),
  fixedInterval: schema.maybe(schema.arrayOf(schema.string())),
  timeZone: schema.maybe(schema.arrayOf(schema.string())),
  timeSeriesMetric: schema.maybe(
    schema.oneOf([
      schema.literal('histogram'),
      schema.literal('summary'),
      schema.literal('counter'),
      schema.literal('gauge'),
      schema.literal('position'),
    ])
  ),
  timeSeriesDimension: schema.maybe(schema.boolean()),
  conflictDescriptions: schema.maybe(
    schema.recordOf(schema.string(), schema.arrayOf(schema.string()))
  ),
});

/*
const validate: FullValidationConfig<any, any, any> = {
  request: {
    query: querySchema,
  },
  response: {
    200: {
      body: schema.object({
        fields: schema.arrayOf(FieldDescriptorSchema),
        indices: schema.arrayOf(schema.string()),
      }),
    },
  },
};
*/

function calculateHash(srcBuffer: Buffer) {
  const hash = createHash('sha1');
  hash.update(srcBuffer);
  return hash.digest('hex');
}

const handler: (
  isRollupsEnabled: () => boolean,
  getUserId: () => (kibanaRequest: KibanaRequest) => Promise<string | undefined>
) => RequestHandler<{}, IQuery, IBody> =
  (isRollupsEnabled, getUserId) => async (context, request, response) => {
    const core = await context.core;
    const uiSettings = core.uiSettings.client;
    const { asCurrentUser } = core.elasticsearch.client;
    const indexPatterns = new IndexPatternsFetcher(asCurrentUser, undefined, isRollupsEnabled());
    const {
      pattern,
      meta_fields: metaFields,
      type,
      rollup_index: rollupIndex,
      allow_no_index: allowNoIndex,
      include_unmapped: includeUnmapped,
    } = request.query;

    let parsedFields: string[] = [];
    let parsedMetaFields: string[] = [];
    try {
      parsedMetaFields = parseFields(metaFields);
      parsedFields = parseFields(request.query.fields ?? []);
    } catch (error) {
      return response.badRequest();
    }

    try {
      const { fields, indices } = await indexPatterns.getFieldsForWildcard({
        pattern,
        metaFields: parsedMetaFields,
        type,
        rollupIndex,
        fieldCapsOptions: {
          allow_no_indices: allowNoIndex || false,
          includeUnmapped,
        },
        ...(parsedFields.length > 0 ? { fields: parsedFields } : {}),
      });

      const body: { fields: FieldDescriptorRestResponse[]; indices: string[] } = {
        fields,
        indices,
      };

      const etag = calculateHash(Buffer.from(JSON.stringify(body)));

      const headers: Record<string, string> = {
        'content-type': 'application/json',
        etag,
        vary: 'accept-encoding, user-hash',
        'user-hash': (await getUserId()(request)) || '',
      };

      // todo examine how long this takes
      const cacheMaxAge = await uiSettings.get<number>('data_views:cache_max_age');

      if (cacheMaxAge) {
        const stale = 365 * 24 * 60 * 60 - cacheMaxAge;
        headers[
          'cache-control'
        ] = `private, max-age=${cacheMaxAge}, stale-while-revalidate=${stale}`;
      }

      const ifNoneMatch = request.headers['if-none-match'];
      const ifNoneMatchString = Array.isArray(ifNoneMatch) ? ifNoneMatch[0] : ifNoneMatch;

      if (ifNoneMatchString) {
        const requestHash = unwrapEtag(ifNoneMatchString);
        if (etag === requestHash) {
          return response.notModified({ headers });
        }
      }

      return response.ok({
        body,
        headers,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        !!error?.isBoom &&
        !!error?.output?.payload &&
        typeof error?.output?.payload === 'object'
      ) {
        const payload = error?.output?.payload;
        return response.notFound({
          body: {
            message: payload.message,
            attributes: payload,
          },
        });
      } else {
        return response.notFound();
      }
    }
  };

export const registerFields = async (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  isRollupsEnabled: () => boolean,
  getUserId: () => (request: KibanaRequest) => Promise<string | undefined>
) => {
  router.get({ path, validate: { query: querySchema } }, handler(isRollupsEnabled, getUserId));
};
