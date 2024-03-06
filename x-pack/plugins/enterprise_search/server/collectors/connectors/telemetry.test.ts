/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockLogger } from '../../__mocks__';

import { collectConnectorStats } from '@kbn/search-connectors';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';

import { ConnectorStats } from '../../../common/types';

import { registerTelemetryUsageCollector } from './telemetry';

jest.mock('@kbn/search-connectors', () => ({
  collectConnectorStats: jest.fn(),
}));

describe('Connectors Telemetry Usage Collector', () => {
  const makeUsageCollectorStub = jest.fn();
  const registerStub = jest.fn();
  const usageCollectionMock = {
    makeUsageCollector: makeUsageCollectorStub,
    registerCollector: registerStub,
  } as any;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTelemetryUsageCollector', () => {
    it('should make and register the usage collector', () => {
      registerTelemetryUsageCollector(usageCollectionMock, mockLogger);

      expect(registerStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('connectors');
      expect(makeUsageCollectorStub.mock.calls[0][0].isReady()).toBe(true);
    });
  });

  describe('fetchTelemetryMetrics', () => {
    it('should return telemetry data', async () => {
      const connectorStats: ConnectorStats = {
        id: '1',
        isDeleted: false,
      };
      (collectConnectorStats as jest.Mock).mockImplementation(() => [connectorStats]);
      registerTelemetryUsageCollector(usageCollectionMock, mockLogger);
      const telemetryMetrics = await makeUsageCollectorStub.mock.calls[0][0].fetch(
        createCollectorFetchContextMock()
      );

      expect(telemetryMetrics).toEqual({
        connectors: [connectorStats],
      });
    });
    it('should return default telemetry when collectConnectorStats raises error', async () => {
      (collectConnectorStats as jest.Mock).mockImplementation(() => {
        throw new Error();
      });
      registerTelemetryUsageCollector(usageCollectionMock, mockLogger);
      const telemetryMetrics = await makeUsageCollectorStub.mock.calls[0][0].fetch(
        createCollectorFetchContextMock()
      );
      expect(telemetryMetrics).toEqual({
        connectors: [],
      });
    });
  });
});
