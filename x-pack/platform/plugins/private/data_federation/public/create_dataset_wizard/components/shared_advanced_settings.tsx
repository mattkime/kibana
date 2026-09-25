/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldNumber, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  validateMaxErrorRatio,
  validateMaxErrors,
  type CreateDatasetFormValues,
} from '../create_dataset_form_state';
import { ErrorModeSelect } from './error_mode_select';
import { FormRowLabelWithInfo } from './form_row_label_with_info';
import { FileExclusionsSelect } from './file_exclusions_select';
import { PartitionDetectionSelect } from './partition_detection_select';

const fileExclusionsHelp = (
  <FormattedMessage
    id="xpack.dataFederation.createDatasetForm.settingsFileExclusionsHelpText"
    defaultMessage="Files matching these patterns are excluded."
  />
);

export function SharedAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: partitionPathField } = useController({
    name: 'settings.partition_path',
    control,
  });
  const { field: errorModeField } = useController({ name: 'settings.error_mode', control });
  const { field: maxErrorsField, fieldState: maxErrorsState } = useController({
    name: 'settings.max_errors',
    control,
    rules: { validate: validateMaxErrors },
  });
  const { field: maxErrorRatioField, fieldState: maxErrorRatioState } = useController({
    name: 'settings.max_error_ratio',
    control,
    rules: { validate: validateMaxErrorRatio },
  });

  return (
    <div data-test-subj="createDatasetSharedAdvancedSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsFileExclusionsLabel}
            infoText={createDatasetWizardStrings.settingsFileExclusionsDescription}
          />
        }
        helpText={fileExclusionsHelp}
        fullWidth
      >
        <FileExclusionsSelect control={control} />
      </EuiFormRow>

      <EuiFormRow label={createDatasetWizardStrings.settingsPartitionDetectionLabel} fullWidth>
        <PartitionDetectionSelect control={control} />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsPartitionPathLabel}
            infoText={createDatasetWizardStrings.settingsPartitionPathDescription}
          />
        }
        helpText={createDatasetWizardStrings.settingsPartitionPathHelp}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsPartitionPath"
          fullWidth
          placeholder={createDatasetWizardStrings.settingsPartitionPathPlaceholder}
          value={partitionPathField.value}
          onChange={(e) => partitionPathField.onChange(e.target.value)}
          name={partitionPathField.name}
          inputRef={partitionPathField.ref}
        />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsErrorModeLabel}
            infoText={createDatasetWizardStrings.settingsErrorModeDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsErrorModeHelpText"
            defaultMessage="Defaults to {failFast} when no option is selected."
            values={{
              failFast: <strong>{createDatasetWizardStrings.settingsErrorModeFailFast}</strong>,
            }}
          />
        }
        fullWidth
      >
        <ErrorModeSelect
          value={errorModeField.value}
          onChange={errorModeField.onChange}
          onBlur={errorModeField.onBlur}
        />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsMaxErrorsLabel}
            infoText={createDatasetWizardStrings.settingsMaxErrorsDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsMaxErrorsHelpText"
            defaultMessage="If left blank, there is no limit."
          />
        }
        fullWidth
        isInvalid={Boolean(maxErrorsState.error)}
        error={maxErrorsState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxErrors"
          fullWidth
          min={0}
          step={1}
          isInvalid={Boolean(maxErrorsState.error)}
          value={maxErrorsField.value}
          onChange={(e) => maxErrorsField.onChange(e.target.value)}
          name={maxErrorsField.name}
          inputRef={maxErrorsField.ref}
        />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsMaxErrorRatioLabel}
            infoText={createDatasetWizardStrings.settingsMaxErrorRatioDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsMaxErrorRatioHelpText"
            defaultMessage="If left blank, defaults to {defaultValue}."
            values={{
              defaultValue: <EuiCode>0.0</EuiCode>,
            }}
          />
        }
        fullWidth
        isInvalid={Boolean(maxErrorRatioState.error)}
        error={maxErrorRatioState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxErrorRatio"
          fullWidth
          min={0}
          max={1}
          step={0.01}
          placeholder={createDatasetWizardStrings.settingsMaxErrorRatioPlaceholder}
          isInvalid={Boolean(maxErrorRatioState.error)}
          value={maxErrorRatioField.value}
          onChange={(e) => maxErrorRatioField.onChange(e.target.value)}
          name={maxErrorRatioField.name}
          inputRef={maxErrorRatioField.ref}
        />
      </EuiFormRow>
    </div>
  );
}
