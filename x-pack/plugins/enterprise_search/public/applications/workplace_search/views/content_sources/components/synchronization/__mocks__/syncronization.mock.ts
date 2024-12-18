/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { SyncJobType, DayOfWeek } from '../../../../../types';

export const blockedWindow = {
  jobType: 'incremental' as SyncJobType,
  day: 'sunday' as DayOfWeek,
  start: moment().set('hour', 11).set('minutes', 0),
  end: moment().set('hour', 13).set('minutes', 0),
};
