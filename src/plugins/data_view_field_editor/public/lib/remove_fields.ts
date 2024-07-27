/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { NotificationsStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DataView, DataViewLazy, UsageCollectionStart } from '../shared_imports';
import { pluginName } from '../constants';

export async function removeFields(
  fieldNames: string[],
  dataView: DataView | DataViewLazy,
  services: {
    dataViews: DataViewsPublicPluginStart;
    usageCollection: UsageCollectionStart;
    notifications: NotificationsStart;
  }
) {
  // removing from dataViewLazy as well to keep in sync
  if (dataView.id && !(dataView instanceof DataViewLazy)) {
    const lazy = await services.dataViews.getDataViewLazy(dataView.id);
    fieldNames.forEach((fieldName) => {
      lazy.removeRuntimeField(fieldName);
    });
  }
  fieldNames.forEach((fieldName) => {
    dataView.removeRuntimeField(fieldName);
  });

  try {
    services.usageCollection.reportUiCounter(pluginName, METRIC_TYPE.COUNT, 'delete_runtime');
    // eslint-disable-next-line no-empty
  } catch {}

  try {
    if (dataView.isPersisted()) {
      await services.dataViews.updateSavedObject(dataView);
    }
  } catch (e) {
    const title = i18n.translate('indexPatternFieldEditor.save.deleteErrorTitle', {
      defaultMessage: 'Failed to save field removal',
    });
    services.notifications.toasts.addError(e, { title });
  }
}
