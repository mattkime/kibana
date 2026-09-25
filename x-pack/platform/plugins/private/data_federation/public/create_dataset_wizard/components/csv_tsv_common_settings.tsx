/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldNumber, EuiFieldText, EuiFormRow, EuiSelect } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  validateDelimiter,
  validateSkipRows,
  type CreateDatasetFormValues,
  type DatasetBooleanFormValue,
  type DatasetModeFormValue,
} from '../create_dataset_form_state';
import { EncodingSelect } from './encoding_select';
import { FormRowLabelWithInfo } from './form_row_label_with_info';

const MODE_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsModePlaceholder },
  { value: 'quoted', text: createDatasetWizardStrings.settingsModeQuoted },
  { value: 'escaped', text: createDatasetWizardStrings.settingsModeEscaped },
  { value: 'plain', text: createDatasetWizardStrings.settingsModePlain },
];

const HEADER_ROW_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsHeaderRowPlaceholder },
  { value: 'true', text: createDatasetWizardStrings.trueLabel },
  { value: 'false', text: createDatasetWizardStrings.falseLabel },
];

export function CsvTsvCommonSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: delimiterField, fieldState: delimiterState } = useController({
    name: 'settings.delimiter',
    control,
    rules: { validate: validateDelimiter },
  });
  const { field: modeField } = useController({ name: 'settings.mode', control });
  const { field: headerRowField } = useController({ name: 'settings.header_row', control });
  const { field: skipRowsField, fieldState: skipRowsState } = useController({
    name: 'settings.skip_rows',
    control,
    rules: { validate: validateSkipRows },
  });
  const { field: datetimeFormatField } = useController({
    name: 'settings.datetime_format',
    control,
  });
  const { field: nullValueField } = useController({ name: 'settings.null_value', control });

  return (
    <div data-test-subj="createDatasetCsvTsvCommonSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsDelimiterLabel}
            infoText={createDatasetWizardStrings.settingsDelimiterDescription}
          />
        }
        helpText={createDatasetWizardStrings.settingsDelimiterHelp}
        fullWidth
        isInvalid={Boolean(delimiterState.error)}
        error={delimiterState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsDelimiter"
          fullWidth
          maxLength={1}
          isInvalid={Boolean(delimiterState.error)}
          value={delimiterField.value}
          onChange={(e) => delimiterField.onChange(e.target.value)}
          name={delimiterField.name}
          inputRef={delimiterField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsModeLabel}
        helpText={createDatasetWizardStrings.settingsQuoteModeDescription}
        fullWidth
      >
        <EuiSelect
          options={MODE_OPTIONS}
          data-test-subj="createDatasetSettingsMode"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsModeLabel}
          value={modeField.value}
          onChange={(e) => modeField.onChange(e.target.value as DatasetModeFormValue)}
          name={modeField.name}
          inputRef={modeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsHeaderRowLabel}
        helpText={createDatasetWizardStrings.settingsHeaderRowHelp}
        fullWidth
      >
        <EuiSelect
          options={HEADER_ROW_OPTIONS}
          data-test-subj="createDatasetSettingsHeaderRow"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsHeaderRowLabel}
          value={headerRowField.value}
          onChange={(e) => headerRowField.onChange(e.target.value as DatasetBooleanFormValue)}
          name={headerRowField.name}
          inputRef={headerRowField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsSkipRowsLabel}
            infoText={createDatasetWizardStrings.settingsSkipRowsDescription}
          />
        }
        helpText={createDatasetWizardStrings.settingsSkipRowsHelp}
        fullWidth
        isInvalid={Boolean(skipRowsState.error)}
        error={skipRowsState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsSkipRows"
          fullWidth
          min={0}
          max={1000}
          step={1}
          isInvalid={Boolean(skipRowsState.error)}
          value={skipRowsField.value}
          onChange={(e) => skipRowsField.onChange(e.target.value)}
          name={skipRowsField.name}
          inputRef={skipRowsField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
            infoText={createDatasetWizardStrings.settingsDatetimeFormatDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsDatetimeFormatHelpText"
            defaultMessage="If left blank, defaults to {defaultValue}."
            values={{ defaultValue: <EuiCode>ISO-8601</EuiCode> }}
          />
        }
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsDatetimeFormat"
          fullWidth
          placeholder={createDatasetWizardStrings.settingsDatetimeFormatPlaceholder}
          value={datetimeFormatField.value}
          onChange={(e) => datetimeFormatField.onChange(e.target.value)}
          name={datetimeFormatField.name}
          inputRef={datetimeFormatField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsNullValueLabel}
            infoText={
              <FormattedMessage
                id="xpack.dataFederation.createDatasetWizard.additionalSettings.nullValue.descriptionText"
                defaultMessage="Enter the value your files use for missing data. For example: {nullValue} or {naValue}. When set, empty fields are no longer treated as null."
                values={{
                  nullValue: <EuiCode>NULL</EuiCode>,
                  naValue: <EuiCode>NA</EuiCode>,
                }}
              />
            }
          />
        }
        helpText={createDatasetWizardStrings.settingsNullValueHelp}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsNullValue"
          fullWidth
          value={nullValueField.value}
          onChange={(e) => nullValueField.onChange(e.target.value)}
          name={nullValueField.name}
          inputRef={nullValueField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsEncodingLabel}
        helpText={createDatasetWizardStrings.settingsEncodingHelp}
        fullWidth
      >
        <EncodingSelect control={control} />
      </EuiFormRow>
    </div>
  );
}
