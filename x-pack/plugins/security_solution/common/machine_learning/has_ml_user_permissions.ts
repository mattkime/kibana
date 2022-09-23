/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlCapabilitiesResponse } from '@kbn/ml-plugin/common/types/capabilities';

export const hasMlUserPermissions = (capabilities: MlCapabilitiesResponse): boolean =>
  capabilities.capabilities.canGetJobs &&
  capabilities.capabilities.canGetDatafeeds &&
  capabilities.capabilities.canGetCalendars;
