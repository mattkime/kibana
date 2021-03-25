/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test/jest';
import { RestoreSnapshot } from '../../../public/application/sections/restore_snapshot';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: ['/add_policy'],
    componentRoutePath: '/add_policy',
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<RestoreSnapshotFormTestSubject>(
  WithAppDependencies(RestoreSnapshot),
  testBedConfig
);

const setupActions = (testBed: TestBed<RestoreSnapshotFormTestSubject>) => {
  const { find, component, form } = testBed;
  return {
    findDataStreamCallout() {
      return find('dataStreamWarningCallOut');
    },

    toggleGlobalState() {
      act(() => {
        form.toggleEuiSwitch('includeGlobalStateSwitch');
      });

      component.update();
    },
  };
};

type Actions = ReturnType<typeof setupActions>;

export type RestoreSnapshotTestBed = TestBed<RestoreSnapshotFormTestSubject> & {
  actions: Actions;
};

export const setup = async (): Promise<RestoreSnapshotTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: setupActions(testBed),
  };
};

export type RestoreSnapshotFormTestSubject =
  | 'snapshotRestoreStepLogistics'
  | 'includeGlobalStateSwitch'
  | 'systemIndicesInfoCallOut'
  | 'dataStreamWarningCallOut';
