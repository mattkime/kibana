/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import {
  UseField,
  getFieldValidityAndErrorMessage,
  ValidationConfig,
  FieldConfig,
} from '../../shared_imports';
import { canAppendWildcard } from '../../lib';
import { schema } from '../form_schema';
import {
  MatchedItem,
  RollupIndicesCapsResponse,
  IndexPatternConfig,
  MatchedIndicesSet,
} from '../../types';

interface TitleFieldProps {
  existingIndexPatterns: string[];
  isRollup: boolean;
  matchedIndices: MatchedItem[];
  rollupIndicesCapabilities: RollupIndicesCapsResponse;
  refreshMatchedIndices: (title: string) => Promise<MatchedIndicesSet>;
}

const rollupIndexPatternNoMatchError = {
  message: i18n.translate('indexPatternEditor.rollupIndexPattern.createIndex.noMatchError', {
    defaultMessage: 'Rollup index pattern error: must match one rollup index',
  }),
};

const rollupIndexPatternTooManyMatchesError = {
  message: i18n.translate('indexPatternEditor.rollupIndexPattern.createIndex.tooManyMatchesError', {
    defaultMessage: 'Rollup index pattern error: can only match one rollup index',
  }),
};

const createTitlesNotAllowedValidator = (
  namesNotAllowed: string[]
): ValidationConfig<{}, string, string> => ({
  validator: ({ value }) => {
    if (namesNotAllowed.includes(value)) {
      return {
        message: i18n.translate('indexPatternEditor.indexPatternExists.ValidationErrorMessage', {
          defaultMessage: 'An index pattern with this title already exists.',
        }),
      };
    }
  },
});

interface RollupIndexPatternValidatorArgs {
  rollupIndices: string[];
  matchedIndices: MatchedItem[];
  rollupIndicesCapabilities: Record<string, { error: string }>;
  refreshMatchedIndices: (title: string) => Promise<MatchedIndicesSet>;
}

const rollupIndexPatternValidator = ({
  rollupIndices,
  matchedIndices,
  rollupIndicesCapabilities,
  refreshMatchedIndices,
}: RollupIndexPatternValidatorArgs): ValidationConfig<{}, string, string> => ({
  validator: async ({ value }) => {
    if (!rollupIndices || !rollupIndices.length) {
      return;
    }

    const results = await refreshMatchedIndices(value);

    const rollupIndexMatches = results.exactMatchedIndices.filter((matchedIndex) =>
      rollupIndices.includes(matchedIndex.name)
    );

    if (!rollupIndexMatches.length) {
      return rollupIndexPatternNoMatchError;
    } else if (rollupIndexMatches.length > 1) {
      return rollupIndexPatternTooManyMatchesError;
    }

    const error = rollupIndicesCapabilities[value].error;

    if (error) {
      return {
        message: i18n.translate('indexPatternEditor.rollup.uncaughtError', {
          defaultMessage: 'Rollup index pattern error: {error}',
          values: {
            error,
          },
        }),
      };
    }
  },
});

interface GetTitleConfigArgs {
  namesNotAllowed: string[];
  isRollup: boolean;
  matchedIndices: MatchedItem[];
  rollupIndicesCapabilities: RollupIndicesCapsResponse;
  refreshMatchedIndices: (title: string) => Promise<MatchedIndicesSet>;
}

const getTitleConfig = ({
  namesNotAllowed,
  isRollup,
  matchedIndices,
  rollupIndicesCapabilities,
  refreshMatchedIndices,
}: GetTitleConfigArgs): FieldConfig<string> => {
  const titleFieldConfig = schema.title;

  const validations = [
    ...titleFieldConfig.validations,
    createTitlesNotAllowedValidator(namesNotAllowed),
  ];

  if (isRollup) {
    validations.push(
      rollupIndexPatternValidator({
        rollupIndices: ['test-rollup', 'test-rollup2'],
        matchedIndices,
        rollupIndicesCapabilities,
        refreshMatchedIndices,
      })
    );
  }

  // Add validation to not allow duplicates
  return {
    ...titleFieldConfig!,
    validations,
  };
};

export const TitleField = ({
  existingIndexPatterns,
  isRollup,
  matchedIndices,
  rollupIndicesCapabilities,
  refreshMatchedIndices,
}: TitleFieldProps) => {
  const [appendedWildcard, setAppendedWildcard] = useState<boolean>(false);

  return (
    <UseField<string, IndexPatternConfig>
      path="title"
      config={getTitleConfig({
        namesNotAllowed: existingIndexPatterns,
        isRollup,
        matchedIndices,
        rollupIndicesCapabilities,
        refreshMatchedIndices,
      })}
      componentProps={{
        euiFieldProps: {
          'aria-label': i18n.translate('indexPatternEditor.form.titleAriaLabel', {
            defaultMessage: 'Title field',
          }),
        },
      }}
    >
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <EuiFormRow
            label={field.label}
            labelAppend={field.labelAppend}
            helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
            error={errorMessage}
            isInvalid={isInvalid}
            fullWidth
          >
            <EuiFieldText
              isInvalid={isInvalid}
              value={field.value as string}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                e.persist();
                let query = e.target.value;
                if (query.length === 1 && !appendedWildcard && canAppendWildcard(query)) {
                  query += '*';
                  setAppendedWildcard(true);
                  field.setValue(query);
                  setTimeout(() => e.target.setSelectionRange(1, 1));
                } else {
                  if (['', '*'].includes(query) && appendedWildcard) {
                    query = '';
                    setAppendedWildcard(false);
                  }
                  field.setValue(query);
                }
                // todo
                // setLastTitle(query);
              }}
              isLoading={field.isValidating}
              fullWidth
              data-test-subj="createIndexPatternNameInput"
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
