/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup } from '@kbn/core/server';
import { SavedQueryRouteHandlerContext } from './route_handler_context';
import { SavedQueryRestResponse } from './route_types';

const SAVED_QUERY_PATH = '/api/saved_query';
const SAVED_QUERY_ID_CONFIG = schema.object({
  id: schema.string(),
});
const SAVED_QUERY_ATTRS_CONFIG = schema.object({
  title: schema.string(),
  description: schema.string(),
  query: schema.object({
    query: schema.oneOf([schema.string(), schema.object({}, { unknowns: 'allow' })]),
    language: schema.string(),
  }),
  filters: schema.maybe(schema.arrayOf(schema.any())),
  timefilter: schema.maybe(schema.any()),
});

const responseCreateSchema = schema.object({
  id: schema.string(),
  attributes: SAVED_QUERY_ATTRS_CONFIG,
});

const access = 'internal';
const version = '1';

export function registerSavedQueryRoutes({ http }: CoreSetup): void {
  const router = http.createRouter<SavedQueryRouteHandlerContext>();

  router.versioned.post({ path: `${SAVED_QUERY_PATH}/_create`, access }).addVersion(
    {
      version,
      validate: {
        request: {
          body: SAVED_QUERY_ATTRS_CONFIG,
        },
        response: {
          200: {
            body: responseCreateSchema,
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        const savedQuery = await context.savedQuery;
        const body: SavedQueryRestResponse = await savedQuery.create(request.body);
        return response.ok({ body });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.versioned.put({ path: `${SAVED_QUERY_PATH}/{id}`, access }).addVersion(
    {
      version,
      validate: {
        request: {
          params: SAVED_QUERY_ID_CONFIG,
          body: SAVED_QUERY_ATTRS_CONFIG,
        },
        response: {
          200: {
            body: responseCreateSchema,
          },
        },
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      try {
        const savedQuery = await context.savedQuery;
        const body: SavedQueryRestResponse = await savedQuery.update(id, request.body);
        return response.ok({ body });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.versioned.get({ path: `${SAVED_QUERY_PATH}/{id}`, access }).addVersion(
    {
      version,
      validate: {
        request: {
          params: SAVED_QUERY_ID_CONFIG,
        },
        response: {
          200: {
            body: responseCreateSchema,
          },
        },
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      try {
        const savedQuery = await context.savedQuery;
        const body: SavedQueryRestResponse = await savedQuery.get(id);
        return response.ok({ body });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.versioned.get({ path: `${SAVED_QUERY_PATH}/_count`, access }).addVersion(
    {
      version,
      validate: {
        request: {},
        response: {
          200: {
            body: schema.number(),
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        const savedQuery = await context.savedQuery;
        const count: number = await savedQuery.count();
        return response.ok({ body: `${count}` });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.versioned.post({ path: `${SAVED_QUERY_PATH}/_find`, access }).addVersion(
    {
      version,
      validate: {
        request: {
          body: schema.object({
            search: schema.string({ defaultValue: '' }),
            perPage: schema.number({ defaultValue: 50 }),
            page: schema.number({ defaultValue: 1 }),
          }),
        },
        response: {
          200: {
            body: schema.object({
              total: schema.number(),
              queries: schema.arrayOf(responseCreateSchema),
            }),
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        const savedQuery = await context.savedQuery;
        const body: { total: number; savedQueries: SavedQueryRestResponse[] } =
          await savedQuery.find(request.body);
        return response.ok({ body });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.versioned.post({ path: `${SAVED_QUERY_PATH}/_all`, access }).addVersion(
    {
      version,
      validate: {
        request: {},
        response: {
          200: {
            body: schema.object({
              total: schema.number(),
              queries: schema.arrayOf(responseCreateSchema),
            }),
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        const savedQuery = await context.savedQuery;
        const body: { total: number; savedQueries: SavedQueryRestResponse[] } =
          await savedQuery.getAll();
        return response.ok({ body });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.versioned.delete({ path: `${SAVED_QUERY_PATH}/{id}`, access }).addVersion(
    {
      version,
      validate: {
        request: {
          params: SAVED_QUERY_ID_CONFIG,
        },
        response: {
          200: {
            body: schema.never(),
          },
        },
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      try {
        const savedQuery = await context.savedQuery;
        await savedQuery.delete(id);
        return response.ok();
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );
}
