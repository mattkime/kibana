/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResponse,
} from '@kbn/core/server';
import { RuleAttributes } from '../types';

export interface BulkDisableRulesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  bulkDisableRuleAttributes: Array<SavedObjectsBulkCreateObject<RuleAttributes>>;
  savedObjectsBulkCreateOptions?: SavedObjectsCreateOptions;
}

export const bulkDisableRulesSo = (
  params: BulkDisableRulesSoParams
): Promise<SavedObjectsBulkResponse<RuleAttributes>> => {
  const { savedObjectsClient, bulkDisableRuleAttributes, savedObjectsBulkCreateOptions } = params;

  return savedObjectsClient.bulkCreate<RuleAttributes>(
    bulkDisableRuleAttributes,
    savedObjectsBulkCreateOptions
  );
};
