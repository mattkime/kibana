/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import type { GroupTableItem, TableItemAction } from '@kbn/aiops-log-rate-analysis/state';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { TableActionButton } from './table_action_button';
import { getTableItemAsKQL } from './get_table_item_as_kql';
import { useFilterQueryUpdates } from '../../hooks/use_filters_query';

const viewInDiscoverMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.linksMenu.viewInDiscover',
  {
    defaultMessage: 'View in Discover',
  }
);

export const useViewInDiscoverAction = (dataViewId?: string): TableItemAction => {
  const { application, share, data } = useAiopsAppContext();

  const discoverLocator = useMemo(
    () => share?.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share?.url.locators]
  );

  // We cannot rely on the time range from AiOps App context because it is not always in sync with the time range used for analysis.
  // E.g. In the case of an embeddable inside cases, the time range is fixed and not coming from the time picker.
  const { timeRange } = useFilterQueryUpdates();

  const discoverUrlError = useMemo(() => {
    if (!application.capabilities.discover?.show) {
      const discoverNotEnabled = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTable.discoverNotEnabledErrorMessage',
        {
          defaultMessage: 'Discover is not enabled',
        }
      );

      return discoverNotEnabled;
    }
    if (!discoverLocator) {
      const discoverLocatorMissing = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTable.discoverLocatorMissingErrorMessage',
        {
          defaultMessage: 'No locator for Discover detected',
        }
      );

      return discoverLocatorMissing;
    }
    if (!dataViewId) {
      const autoGeneratedDiscoverLinkError = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTable.autoGeneratedDiscoverLinkErrorMessage',
        {
          defaultMessage: 'Unable to link to Discover; no data view exists for this index',
        }
      );

      return autoGeneratedDiscoverLinkError;
    }
  }, [application.capabilities.discover?.show, dataViewId, discoverLocator]);

  const generateDiscoverUrl = async (groupTableItem: GroupTableItem | SignificantItem) => {
    if (discoverLocator !== undefined) {
      const url = await discoverLocator.getRedirectUrl({
        indexPatternId: dataViewId,
        timeRange,
        filters: data.query.filterManager.getFilters(),
        query: {
          language: SEARCH_QUERY_LANGUAGE.KUERY,
          query: getTableItemAsKQL(groupTableItem),
        },
      });

      return url;
    }
  };

  return {
    render: (tableItem: SignificantItem | GroupTableItem) => {
      const tooltipText = discoverUrlError ? discoverUrlError : viewInDiscoverMessage;

      const clickHandler = async () => {
        const openInDiscoverUrl = await generateDiscoverUrl(tableItem);
        if (typeof openInDiscoverUrl === 'string') {
          await application.navigateToUrl(openInDiscoverUrl);
        }
      };

      return (
        <TableActionButton
          dataTestSubjPostfix="Discover"
          iconType="discoverApp"
          isDisabled={discoverUrlError !== undefined}
          label={viewInDiscoverMessage}
          tooltipText={tooltipText}
          onClick={clickHandler}
        />
      );
    },
  };
};
