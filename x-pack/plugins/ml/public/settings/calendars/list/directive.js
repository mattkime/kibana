/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';
import React from 'react';
import ReactDOM from 'react-dom';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { initPromise } from '../../../util/promise';
import { getCalendarManagementBreadcrumbs } from '../../breadcrumbs';

import uiRoutes from 'ui/routes';

const template = `
  <ml-nav-menu name="settings" />
  <div class="mlCalendarManagement">
    <ml-calendars-list />
  </div>
`;

uiRoutes
  .when('/settings/calendars_list', {
    template,
    k7Breadcrumbs: getCalendarManagementBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
      initPromise: initPromise(false)
    }
  });


import { CalendarsList } from './calendars_list';

module.directive('mlCalendarsList', function () {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link: function (scope, element) {
      const props = {
        canCreateCalendar: checkPermission('canCreateCalendar'),
        canDeleteCalendar: checkPermission('canDeleteCalendar'),
      };

      ReactDOM.render(
        React.createElement(CalendarsList, props),
        element[0]
      );
    }
  };
});
