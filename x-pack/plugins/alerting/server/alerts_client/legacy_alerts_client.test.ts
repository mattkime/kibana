/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { AlertInstanceContext, RecoveredActionGroup, RuleNotifyWhen } from '../types';
import { LegacyAlertsClient } from './legacy_alerts_client';
import { createAlertFactory, getPublicAlertFactory } from '../alert/create_alert_factory';
import { Alert } from '../alert/alert';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { getAlertsForNotification, processAlerts } from '../lib';
import { trimRecoveredAlerts } from '../lib/trim_recovered_alerts';
import { logAlerts } from '../task_runner/log_alerts';
import { DEFAULT_FLAPPING_SETTINGS } from '../../common/rules_settings';
import { schema } from '@kbn/config-schema';

const scheduleActions = jest.fn();
const replaceState = jest.fn(() => ({ scheduleActions }));
const mockCreateAlert = jest.fn(() => ({ replaceState, scheduleActions }));
const mockGetRecoveredAlerts = jest.fn().mockReturnValue([]);
const mockSetLimitReached = jest.fn();
const mockCreateAlertFactory = {
  create: mockCreateAlert,
  hasReachedAlertLimit: jest.fn().mockReturnValue(false),
  alertLimit: {
    getValue: jest.fn().mockReturnValue(1000),
    setLimitReached: mockSetLimitReached,
    checkLimitUsage: jest.fn(),
  },
  done: () => ({
    getRecoveredAlerts: mockGetRecoveredAlerts,
  }),
};
jest.mock('../alert/create_alert_factory', () => {
  const original = jest.requireActual('../alert/create_alert_factory');
  return {
    ...original,
    getPublicAlertFactory: jest.fn().mockImplementation(() => {
      return {
        create: mockCreateAlert,
        alertLimit: {
          getValue: jest.fn().mockReturnValue(1000),
          setLimitReached: mockSetLimitReached,
        },
        done: () => ({
          getRecoveredAlerts: mockGetRecoveredAlerts,
        }),
      };
    }),
    createAlertFactory: jest.fn().mockImplementation(() => mockCreateAlertFactory),
  };
});

jest.mock('../lib', () => {
  const original = jest.requireActual('../lib');
  return {
    ...original,
    processAlerts: jest.fn(),
    setFlapping: jest.fn(),
  };
});

jest.mock('../lib/trim_recovered_alerts', () => {
  return {
    trimRecoveredAlerts: jest.fn(),
  };
});

jest.mock('../lib/get_alerts_for_notification', () => {
  return {
    getAlertsForNotification: jest.fn(),
  };
});

jest.mock('../task_runner/log_alerts', () => ({ logAlerts: jest.fn() }));

let logger: ReturnType<typeof loggingSystemMock['createLogger']>;
const alertingEventLogger = alertingEventLoggerMock.create();
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  producer: 'alerts',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  validate: {
    params: schema.any(),
  },
};

const testAlert1 = {
  state: { foo: 'bar' },
  meta: { flapping: false, flappingHistory: [false, false], uuid: 'abc' },
};
const testAlert2 = {
  state: { any: 'value' },
  meta: {
    lastScheduledActions: {
      group: 'default',
      date: new Date(),
    },
    uuid: 'def',
  },
};

describe('Legacy Alerts Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  test('initializeExecution() should create alert factory with given alerts', async () => {
    const alertsClient = new LegacyAlertsClient({
      logger,
      ruleType,
    });

    await alertsClient.initializeExecution({
      maxAlerts: 1000,
      ruleLabel: `test: my-test-rule`,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      activeAlertsFromState: {
        '1': testAlert1,
        '2': testAlert2,
      },
      recoveredAlertsFromState: {},
    });

    expect(createAlertFactory).toHaveBeenCalledWith({
      alerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      logger,
      maxAlerts: 1000,
      canSetRecoveryContext: false,
      autoRecoverAlerts: true,
    });
  });

  test('getExecutorServices() should call getPublicAlertFactory on alert factory', async () => {
    const alertsClient = new LegacyAlertsClient({
      logger,
      ruleType,
    });

    await alertsClient.initializeExecution({
      maxAlerts: 1000,
      ruleLabel: `test: my-test-rule`,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      activeAlertsFromState: {
        '1': testAlert1,
        '2': testAlert2,
      },
      recoveredAlertsFromState: {},
    });

    alertsClient.getExecutorServices();
    expect(getPublicAlertFactory).toHaveBeenCalledWith(mockCreateAlertFactory);
  });

  test('checkLimitUsage() should pass through to alert factory function', async () => {
    const alertsClient = new LegacyAlertsClient({
      logger,
      ruleType,
    });

    await alertsClient.initializeExecution({
      maxAlerts: 1000,
      ruleLabel: `test: my-test-rule`,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      activeAlertsFromState: {
        '1': testAlert1,
        '2': testAlert2,
      },
      recoveredAlertsFromState: {},
    });

    alertsClient.checkLimitUsage();
    expect(mockCreateAlertFactory.alertLimit.checkLimitUsage).toHaveBeenCalled();
  });

  test('hasReachedAlertLimit() should pass through to alert factory function', async () => {
    const alertsClient = new LegacyAlertsClient({
      logger,
      ruleType,
    });

    await alertsClient.initializeExecution({
      maxAlerts: 1000,
      ruleLabel: `test: my-test-rule`,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      activeAlertsFromState: {
        '1': testAlert1,
        '2': testAlert2,
      },
      recoveredAlertsFromState: {},
    });

    alertsClient.hasReachedAlertLimit();
    expect(mockCreateAlertFactory.hasReachedAlertLimit).toHaveBeenCalled();
  });

  test('processAndLogAlerts() should call processAlerts, trimRecoveredAlerts, getAlertsForNotification and logAlerts and store results', async () => {
    (processAlerts as jest.Mock).mockReturnValue({
      newAlerts: {},
      activeAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentRecoveredAlerts: {},
      recoveredAlerts: {},
    });
    (trimRecoveredAlerts as jest.Mock).mockReturnValue({
      trimmedAlertsRecovered: {},
      earlyRecoveredAlerts: {},
    });
    (getAlertsForNotification as jest.Mock).mockReturnValue({
      newAlerts: {},
      activeAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentActiveAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      currentRecoveredAlerts: {},
      recoveredAlerts: {},
    });
    const alertsClient = new LegacyAlertsClient({
      logger,
      ruleType,
    });

    await alertsClient.initializeExecution({
      maxAlerts: 1000,
      ruleLabel: `ruleLogPrefix`,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      activeAlertsFromState: {
        '1': testAlert1,
        '2': testAlert2,
      },
      recoveredAlertsFromState: {},
    });

    alertsClient.processAndLogAlerts({
      eventLogger: alertingEventLogger,
      ruleRunMetricsStore,
      shouldLogAlerts: true,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      notifyWhen: RuleNotifyWhen.CHANGE,
      maintenanceWindowIds: ['window-id1', 'window-id2'],
    });

    expect(processAlerts).toHaveBeenCalledWith({
      alerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      existingAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      previouslyRecoveredAlerts: {},
      hasReachedAlertLimit: false,
      alertLimit: 1000,
      autoRecoverAlerts: true,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      maintenanceWindowIds: ['window-id1', 'window-id2'],
    });

    expect(trimRecoveredAlerts).toHaveBeenCalledWith(logger, {}, 1000);

    expect(getAlertsForNotification).toHaveBeenCalledWith(
      {
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      },
      RuleNotifyWhen.CHANGE,
      'default',
      {},
      {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      {},
      {}
    );

    expect(logAlerts).toHaveBeenCalledWith({
      logger,
      alertingEventLogger,
      newAlerts: {},
      activeAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      recoveredAlerts: {},
      ruleLogPrefix: 'ruleLogPrefix',
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(alertsClient.getProcessedAlerts('active')).toEqual({
      '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
      '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
    });
  });
});
