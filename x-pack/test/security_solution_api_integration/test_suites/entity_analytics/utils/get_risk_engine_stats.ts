/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type { RiskEngineMetrics } from '@kbn/security-solution-plugin/server/usage/risk_engine/types';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';

import { getStatsUrl } from '../../detections_response/utils/get_stats_url';
import { getRiskEngineMetricsFromBody } from './get_risk_engine_metrics_from_body';

/**
 * Gets the stats from the stats endpoint.
 * @param supertest The supertest agent.
 * @returns The detection metrics
 */
export const getRiskEngineStats = async (
  supertest: SuperTest.Agent,
  log: ToolingLog
): Promise<RiskEngineMetrics> => {
  const response = await supertest
    .post(getStatsUrl())
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '2')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({ unencrypted: true, refreshCache: true });
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting the stats for risk engine. CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }

  return getRiskEngineMetricsFromBody(response.body);
};
