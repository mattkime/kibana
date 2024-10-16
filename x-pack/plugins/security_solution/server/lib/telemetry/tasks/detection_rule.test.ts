/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { taskManagerMock } from '../../../../../task_manager/server/mocks';
import { TaskStatus } from '../../../../../task_manager/server';
import {
  TelemetryDetectionRulesTask,
  TelemetryDetectionRuleListsTaskConstants,
} from './detection_rule';
import {
  createMockTelemetryEventsSender,
  MockDetectionRuleListsTask,
  createMockTelemetryReceiver,
} from '../mocks';

describe('test detection rule exception lists telemetry', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('basic telemetry sanity checks', () => {
    test('detection rule lists task can register', () => {
      const telemetryDiagTask = new TelemetryDetectionRulesTask(
        logger,
        taskManagerMock.createSetup(),
        createMockTelemetryEventsSender(true),
        createMockTelemetryReceiver()
      );

      expect(telemetryDiagTask).toBeInstanceOf(TelemetryDetectionRulesTask);
    });
  });

  test('detection rule task should be registered', () => {
    const mockTaskManager = taskManagerMock.createSetup();
    new TelemetryDetectionRulesTask(
      logger,
      mockTaskManager,
      createMockTelemetryEventsSender(true),
      createMockTelemetryReceiver()
    );

    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
  });

  test('detection rule task should be scheduled', async () => {
    const mockTaskManagerSetup = taskManagerMock.createSetup();
    const telemetryDiagTask = new TelemetryDetectionRulesTask(
      logger,
      mockTaskManagerSetup,
      createMockTelemetryEventsSender(true),
      createMockTelemetryReceiver()
    );

    const mockTaskManagerStart = taskManagerMock.createStart();
    await telemetryDiagTask.start(mockTaskManagerStart);
    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
  });

  test('detection rule task should run', async () => {
    const mockContext = createMockTelemetryEventsSender(true);
    const mockTaskManager = taskManagerMock.createSetup();
    const mockReceiver = createMockTelemetryReceiver();
    const telemetryDiagTask = new MockDetectionRuleListsTask(
      logger,
      mockTaskManager,
      mockContext,
      mockReceiver
    );

    const mockTaskInstance = {
      id: TelemetryDetectionRuleListsTaskConstants.TYPE,
      runAt: new Date(),
      attempts: 0,
      ownerId: '',
      status: TaskStatus.Running,
      startedAt: new Date(),
      scheduledAt: new Date(),
      retryAt: new Date(),
      params: {},
      state: {},
      taskType: TelemetryDetectionRuleListsTaskConstants.TYPE,
    };
    const createTaskRunner =
      mockTaskManager.registerTaskDefinitions.mock.calls[0][0][
        TelemetryDetectionRuleListsTaskConstants.TYPE
      ].createTaskRunner;
    const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
    await taskRunner.run();
    expect(telemetryDiagTask.runTask).toHaveBeenCalled();
  });

  test('detection rule task should not query elastic if telemetry is not opted in', async () => {
    const mockSender = createMockTelemetryEventsSender(false);
    const mockTaskManager = taskManagerMock.createSetup();
    const mockReceiver = createMockTelemetryReceiver();
    new MockDetectionRuleListsTask(logger, mockTaskManager, mockSender, mockReceiver);

    const mockTaskInstance = {
      id: TelemetryDetectionRuleListsTaskConstants.TYPE,
      runAt: new Date(),
      attempts: 0,
      ownerId: '',
      status: TaskStatus.Running,
      startedAt: new Date(),
      scheduledAt: new Date(),
      retryAt: new Date(),
      params: {},
      state: {},
      taskType: TelemetryDetectionRuleListsTaskConstants.TYPE,
    };
    const createTaskRunner =
      mockTaskManager.registerTaskDefinitions.mock.calls[0][0][
        TelemetryDetectionRuleListsTaskConstants.TYPE
      ].createTaskRunner;
    const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
    await taskRunner.run();
    expect(mockReceiver.fetchDiagnosticAlerts).not.toHaveBeenCalled();
  });
});
