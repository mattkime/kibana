/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateCaseUserAction } from '../../../common/api';
import type { UserActionBuilder, UserActionResponse } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

const getLabelTitle = (userAction: UserActionResponse<CreateCaseUserAction>) =>
  `${i18n.CREATE_CASE.toLowerCase()} "${userAction.payload.title}"`;

export const createCaseUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const createCaseUserAction = userAction as UserActionResponse<CreateCaseUserAction>;
    const label = getLabelTitle(createCaseUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
