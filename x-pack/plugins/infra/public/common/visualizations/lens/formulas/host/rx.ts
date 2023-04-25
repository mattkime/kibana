/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensChartConfig } from '../../../types';
import { getFilters } from './utils';

export const rx: LensChartConfig = {
  title: 'Network Inbound (RX)',
  formula: {
    formula:
      "average(host.network.ingress.bytes) * 8 / (max(metricset.period, kql='host.network.ingress.bytes: *') / 1000)",
    format: {
      id: 'bits',
      params: {
        decimals: 1,
      },
    },
  },
  getFilters,
};
