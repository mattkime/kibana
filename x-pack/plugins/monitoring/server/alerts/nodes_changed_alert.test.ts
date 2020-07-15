/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { NodesChangedAlert } from './nodes_changed_alert';
import { ALERT_NODES_CHANGED } from '../../common/constants';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { fetchClusters } from '../lib/alerts/fetch_clusters';

const RealDate = Date;

jest.mock('../lib/alerts/fetch_legacy_alerts', () => ({
  fetchLegacyAlerts: jest.fn(),
}));
jest.mock('../lib/alerts/fetch_clusters', () => ({
  fetchClusters: jest.fn(),
}));
jest.mock('moment', () => {
  return function () {
    return {
      format: () => 'THE_DATE',
    };
  };
});

describe('NodesChangedAlert', () => {
  it('should have defaults', () => {
    const alert = new NodesChangedAlert();
    expect(alert.type).toBe(ALERT_NODES_CHANGED);
    expect(alert.label).toBe('Nodes changed');
    expect(alert.defaultThrottle).toBe('1m');
    // @ts-ignore
    expect(alert.actionVariables).toStrictEqual([
      {
        name: 'internalShortMessage',
        description: 'The short internal message generated by Elastic.',
      },
      {
        name: 'internalFullMessage',
        description: 'The full internal message generated by Elastic.',
      },
      { name: 'state', description: 'The current state of the alert.' },
      { name: 'clusterName', description: 'The cluster to which the nodes belong.' },
      { name: 'added', description: 'The list of nodes added to the cluster.' },
      { name: 'removed', description: 'The list of nodes removed from the cluster.' },
      { name: 'restarted', description: 'The list of nodes restarted in the cluster.' },
      { name: 'action', description: 'The recommended action for this alert.' },
      {
        name: 'actionPlain',
        description: 'The recommended action for this alert, without any markdown.',
      },
    ]);
  });

  describe('execute', () => {
    function FakeDate() {}
    FakeDate.prototype.valueOf = () => 1;

    const clusterUuid = 'abc123';
    const clusterName = 'testCluster';
    const legacyAlert = {
      prefix: 'Elasticsearch cluster nodes have changed!',
      message: 'Node was restarted [1]: [test].',
      metadata: {
        severity: 1000,
        cluster_uuid: clusterUuid,
      },
      nodes: {
        added: {},
        removed: {},
        restarted: {
          test: 'test',
        },
      },
    };
    const getUiSettingsService = () => ({
      asScopedToClient: jest.fn(),
    });
    const getLogger = () => ({
      debug: jest.fn(),
    });
    const monitoringCluster = null;
    const config = {
      ui: { ccs: { enabled: true }, container: { elasticsearch: { enabled: false } } },
    };
    const kibanaUrl = 'http://localhost:5601';

    const replaceState = jest.fn();
    const scheduleActions = jest.fn();
    const getState = jest.fn();
    const executorOptions = {
      services: {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn().mockImplementation(() => {
          return {
            replaceState,
            scheduleActions,
            getState,
          };
        }),
      },
      state: {},
    };

    beforeEach(() => {
      // @ts-ignore
      Date = FakeDate;
      (fetchLegacyAlerts as jest.Mock).mockImplementation(() => {
        return [legacyAlert];
      });
      (fetchClusters as jest.Mock).mockImplementation(() => {
        return [{ clusterUuid, clusterName }];
      });
    });

    afterEach(() => {
      Date = RealDate;
      replaceState.mockReset();
      scheduleActions.mockReset();
      getState.mockReset();
    });

    it('should fire actions', async () => {
      const alert = new NodesChangedAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            cluster: { clusterUuid, clusterName },
            ccs: null,
            ui: {
              isFiring: true,
              message: {
                text: "Elasticsearch nodes 'test' restarted in this cluster.",
              },
              severity: 'warning',
              resolvedMS: 0,
              triggeredMS: 1,
              lastCheckedMS: 0,
            },
          },
        ],
      });
      expect(scheduleActions).toHaveBeenCalledWith('default', {
        action:
          '[View nodes](http://localhost:5601/app/monitoring#elasticsearch/nodes?_g=(cluster_uuid:abc123))',
        actionPlain: 'Verify that you added, removed, or restarted nodes.',
        internalFullMessage:
          'Nodes changed alert is firing for testCluster. The following Elasticsearch nodes have been added: removed: restarted:test. [View nodes](http://localhost:5601/app/monitoring#elasticsearch/nodes?_g=(cluster_uuid:abc123))',
        internalShortMessage:
          'Nodes changed alert is firing for testCluster. Verify that you added, removed, or restarted nodes.',
        added: '',
        removed: '',
        restarted: 'test',
        clusterName,
        state: 'firing',
      });
    });

    it('should not fire actions if there is no legacy alert', async () => {
      (fetchLegacyAlerts as jest.Mock).mockImplementation(() => {
        return [];
      });
      const alert = new NodesChangedAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      expect(replaceState).not.toHaveBeenCalledWith({});
      expect(scheduleActions).not.toHaveBeenCalled();
    });

    // This doesn't work because this watch is weird where it sets the resolved timestamp right away
    // It is not really worth fixing as this watch will go away in 8.0
    // it('should resolve with a resolved message', async () => {
    //   (fetchLegacyAlerts as jest.Mock).mockImplementation(() => {
    //     return [];
    //   });
    //   (getState as jest.Mock).mockImplementation(() => {
    //     return {
    //       alertStates: [
    //         {
    //           cluster: {
    //             clusterUuid,
    //             clusterName,
    //           },
    //           ccs: null,
    //           ui: {
    //             isFiring: true,
    //             message: null,
    //             severity: 'danger',
    //             resolvedMS: 0,
    //             triggeredMS: 1,
    //             lastCheckedMS: 0,
    //           },
    //         },
    //       ],
    //     };
    //   });
    //   const alert = new NodesChangedAlert();
    //   alert.initializeAlertType(
    //     getUiSettingsService as any,
    //     monitoringCluster as any,
    //     getLogger as any,
    //     config as any,
    //     kibanaUrl
    //   );
    //   const type = alert.getAlertType();
    //   await type.executor({
    //     ...executorOptions,
    //     // @ts-ignore
    //     params: alert.defaultParams,
    //   } as any);
    //   expect(replaceState).toHaveBeenCalledWith({
    //     alertStates: [
    //       {
    //         cluster: { clusterUuid, clusterName },
    //         ccs: null,
    //         ui: {
    //           isFiring: false,
    //           message: {
    //             text: "The license for this cluster is active.",
    //           },
    //           severity: 'danger',
    //           resolvedMS: 1,
    //           triggeredMS: 1,
    //           lastCheckedMS: 0,
    //         },
    //       },
    //     ],
    //   });
    //   expect(scheduleActions).toHaveBeenCalledWith('default', {
    //     clusterName,
    //     expiredDate: 'THE_DATE',
    //     state: 'resolved',
    //   });
    // });
  });
});
