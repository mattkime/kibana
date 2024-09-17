/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { ScopedHistory } from '@kbn/core/public';

import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexPatternManagmentContext } from '../../../../../types';

interface HeaderProps extends RouteComponentProps {
  indexPatternId: string;
  history: ScopedHistory;
}

export const Header = withRouter(({ indexPatternId, history }: HeaderProps) => {
  const { dataViews, docLinks } = useKibana<IndexPatternManagmentContext>().services;
  const links = docLinks?.links;
  const userEditPermission = dataViews.getCanSaveSync();
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiText size="s">
          <p>
            <FormattedMessage
              tagName="span"
              id="indexPatternManagement.editIndexPattern.scriptedLabel"
              defaultMessage="Scripted fields can be used in visualizations and displayed in documents. However, they cannot be searched."
            />
            <br />
            <EuiIcon type="warning" color="warning" style={{ marginRight: '4px' }} />
            <FormattedMessage
              id="indexPatternManagement.editIndexPattern.deprecation"
              tagName="span"
              defaultMessage="Scripted fields are deprecated. Use {runtimeDocs} instead."
              values={{
                runtimeDocs: (
                  <EuiLink target="_blank" href={links.runtimeFields.overview}>
                    <FormattedMessage
                      id="indexPatternManagement.header.runtimeLink"
                      defaultMessage="runtime fields"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>

      {userEditPermission && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Scripted field creation is disabled, add a runtime field instead.">
            <EuiButton
              data-test-subj="addScriptedFieldLink"
              {...reactRouterNavigate(history, `patterns/${indexPatternId}/create-field/`)}
              isDisabled={true}
            >
              <FormattedMessage
                id="indexPatternManagement.editIndexPattern.scripted.addFieldButton"
                defaultMessage="Add scripted field"
              />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
