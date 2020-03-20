/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { SharePluginStart } from '../../../../../../../src/plugins/share/public';
import { DASHBOARD_APP_URL_GENERATOR } from '../../../../../../../src/plugins/dashboard/public';
import { VisualizeEmbeddableContract } from '../../../../../../../src/legacy/core_plugins/visualizations/public';
import { ActionContext, CollectConfigProps, Config, FactoryContext } from './types';
import { CollectConfigContainer } from './collect_config';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { DrilldownsDrilldown as Drilldown } from '../../../../../drilldowns/public';
import { txtGoToDashboard } from './i18n';
import { DataPublicPluginStart, esFilters } from '../../../../../../../src/plugins/data/public';

export interface Params {
  getSavedObjectsClient: () => Promise<CoreStart['savedObjects']['client']>;
  getNavigateToApp: () => Promise<CoreStart['application']['navigateToApp']>;
  getGetUrlGenerator: () => Promise<SharePluginStart['urlGenerators']['getUrlGenerator']>;
  getDataPluginActions: () => Promise<DataPublicPluginStart['actions']>;
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, FactoryContext, ActionContext<VisualizeEmbeddableContract>> {
  constructor(protected readonly params: Params) {}

  // TODO: public readonly places = ['dashboard'];

  public readonly id = DASHBOARD_TO_DASHBOARD_DRILLDOWN;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = props => (
    <CollectConfigContainer {...props} deps={this.params} />
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    dashboardId: '',
    useCurrentDashboardDataRange: true,
    useCurrentDashboardFilters: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.dashboardId) return false;
    return true;
  };

  public readonly execute = async (
    config: Config,
    context: ActionContext<VisualizeEmbeddableContract>
  ) => {
    console.log('drilldown execute'); // eslint-disable-line
    const getUrlGenerator = await this.params.getGetUrlGenerator();
    const navigateToApp = await this.params.getNavigateToApp();
    const {
      selectRangeActionGetFilters,
      valueClickActionGetFilters,
    } = await this.params.getDataPluginActions();
    const { timeRange, query, filters } = context.embeddable.getInput();

    // @ts-ignore
    if (context.data.range) {
      // look up by range
      const { restOfFilters, timeRangeFilter } =
        (await selectRangeActionGetFilters({
          timeFieldName: context.timeFieldName,
          data: context.data,
        })) || {};
      console.log('select range action filters', restOfFilters, timeRangeFilter); // eslint-disable-line
      // selectRangeActionGetFilters
    } else {
      const { restOfFilters, timeRangeFilter } = await valueClickActionGetFilters({
        timeFieldName: context.timeFieldName,
        data: context.data,
      });
      console.log('value click action filters', restOfFilters, timeRangeFilter); // eslint-disable-line
    }

    const dashboardPath = await getUrlGenerator(DASHBOARD_APP_URL_GENERATOR).createUrl({
      dashboardId: config.dashboardId,
      query,
      // todo - how to get destination dashboard timerange?
      timeRange: config.useCurrentDashboardDataRange ? timeRange : undefined,
      filters: config.useCurrentDashboardFilters
        ? filters
        : filters?.filter(f => esFilters.isFilterPinned(f)),
    });

    const dashboardHash = dashboardPath.split('#')[1];

    console.log('dashboard hash', dashboardHash); // eslint-disable-line
    await navigateToApp('kibana', {
      path: `#${dashboardHash}`,
    });
  };
}
