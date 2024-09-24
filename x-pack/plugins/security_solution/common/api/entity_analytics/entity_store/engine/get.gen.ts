/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Get Entity Engine
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import { EntityType, EngineDescriptor } from '../common.gen';

export type GetEntityEngineRequestParams = z.infer<typeof GetEntityEngineRequestParams>;
export const GetEntityEngineRequestParams = z.object({
  /**
   * The entity type of the engine (either 'user' or 'host').
   */
  entityType: EntityType,
});
export type GetEntityEngineRequestParamsInput = z.input<typeof GetEntityEngineRequestParams>;

export type GetEntityEngineResponse = z.infer<typeof GetEntityEngineResponse>;
export const GetEntityEngineResponse = EngineDescriptor;
