/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useMemo } from 'react';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiToolTip,
  type EuiRadioGroupOption,
} from '@elastic/eui';
import { SupportedExportTypes, ShareMenuItemV2 } from '../../../types';
import { type IShareContext } from '../../context';

type ExportProps = Pick<IShareContext, 'isDirty' | 'objectId' | 'objectType' | 'onClose'> & {
  layoutOption?: 'print';
  aggregateReportTypes: ShareMenuItemV2[];
  intl: InjectedIntl;
  publicAPIEnabled: boolean;
};

const ExportContentUi = ({
  isDirty,
  aggregateReportTypes,
  intl,
  onClose,
  publicAPIEnabled,
}: ExportProps) => {
  const [isCreatingExport, setIsCreatingExport] = useState<boolean>(false);
  const [usePrintLayout, setPrintLayout] = useState(false);

  const radioOptions = useMemo(() => {
    return aggregateReportTypes.reduce<EuiRadioGroupOption[]>((acc, { reportType, label }) => {
      if (reportType) {
        acc.push({
          id: reportType,
          label,
          'data-test-subj': `${reportType}-radioOption`,
        });
      }
      return acc;
    }, []);
  }, [aggregateReportTypes]);

  const [selectedRadio, setSelectedRadio] = useState<SupportedExportTypes>(
    radioOptions[0].id as SupportedExportTypes
  );

  const {
    generateExportButton,
    helpText,
    warnings = [],
    renderCopyURLButton,
    generateExport,
    generateExportUrl,
    renderLayoutOptionSwitch,
  } = useMemo(() => {
    return aggregateReportTypes?.find(({ reportType }) => reportType === selectedRadio)!;
  }, [selectedRadio, aggregateReportTypes]);

  const handlePrintLayoutChange = useCallback(
    (evt: EuiSwitchEvent) => {
      setPrintLayout(evt.target.checked);
    },
    [setPrintLayout]
  );

  const getReport = useCallback(async () => {
    try {
      setIsCreatingExport(true);
      await generateExport({ intl, optimizedForPrinting: usePrintLayout });
    } finally {
      setIsCreatingExport(false);
      onClose?.();
    }
  }, [generateExport, intl, usePrintLayout, onClose]);

  const renderLayoutOptionsSwitch = useCallback(() => {
    if (renderLayoutOptionSwitch) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={
                <EuiText size="s" css={{ textWrap: 'nowrap' }}>
                  <FormattedMessage
                    id="share.screenCapturePanelContent.optimizeForPrintingLabel"
                    defaultMessage="For printing"
                  />
                </EuiText>
              }
              checked={usePrintLayout}
              onChange={handlePrintLayoutChange}
              data-test-subj="usePrintLayout"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <FormattedMessage
                  id="share.screenCapturePanelContent.optimizeForPrintingHelpText"
                  defaultMessage="Uses multiple pages, showing at most 2 visualizations per page "
                />
              }
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  }, [usePrintLayout, renderLayoutOptionSwitch, handlePrintLayoutChange]);

  const showCopyURLButton = useCallback(() => {
    if (renderCopyURLButton && publicAPIEnabled) {
      const absoluteUrl = generateExportUrl?.({ intl, optimizedForPrinting: usePrintLayout });
      return (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} css={{ flexGrow: 0 }}>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={absoluteUrl ?? ''}>
              {(copy) => (
                <EuiButtonEmpty
                  iconType="copyClipboard"
                  onClick={copy}
                  data-test-subj="shareReportingCopyURL"
                  data-share-url={absoluteUrl}
                >
                  <FormattedMessage
                    id="share.modalContent.copyUrlButtonLabel"
                    defaultMessage="Copy Post URL"
                  />
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <EuiText size="s">
                  <FormattedMessage
                    id="share.postURLWatcherMessage"
                    defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher."
                  />
                </EuiText>
              }
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  }, [renderCopyURLButton, publicAPIEnabled, usePrintLayout, generateExportUrl, intl]);

  const renderGenerateReportButton = useCallback(() => {
    return (
      <EuiButton
        fill
        color={(isDirty && renderCopyURLButton) || warnings.length > 0 ? 'warning' : 'primary'}
        onClick={getReport}
        data-test-subj="generateReportButton"
        isLoading={isCreatingExport}
      >
        {generateExportButton ?? (
          <FormattedMessage id="share.export.generateButtonLabel" defaultMessage="Export file" />
        )}
      </EuiButton>
    );
  }, [
    generateExportButton,
    getReport,
    isCreatingExport,
    isDirty,
    renderCopyURLButton,
    warnings.length,
  ]);

  const renderRadioOptions = () => {
    if (radioOptions.length > 1) {
      return (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
            <EuiRadioGroup
              options={radioOptions}
              onChange={(id) => setSelectedRadio(id as SupportedExportTypes)}
              name="image reporting radio group"
              idSelected={selectedRadio}
              legend={{
                children: <FormattedMessage id="share.fileType" defaultMessage="File type" />,
              }}
            />
          </EuiFlexGroup>
        </>
      );
    }
  };

  const renderDirtyWarning = () => {
    return (
      renderCopyURLButton &&
      publicAPIEnabled &&
      isDirty && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            color="warning"
            iconType="warning"
            title={
              <FormattedMessage id="share.link.warning.title" defaultMessage="Unsaved changes" />
            }
          >
            <FormattedMessage
              id="share.postURLWatcherMessage.unsavedChanges"
              defaultMessage="URL may change if you upgrade Kibana."
            />
          </EuiCallOut>
        </>
      )
    );
  };

  const renderWarnings = (warning: { title: string; message: string }) => (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut color="warning" iconType="warning" title={warning.title}>
        {warning.message}
      </EuiCallOut>
    </>
  );

  return (
    <>
      <EuiForm>
        <EuiText size="s">
          {helpText ?? (
            <FormattedMessage
              id="share.export.helpText"
              defaultMessage="Select the file type you would like to export for this visualization."
            />
          )}
        </EuiText>
        {renderRadioOptions()}
        {renderDirtyWarning()}
        {warnings.map(renderWarnings)}
        <EuiSpacer size="l" />
      </EuiForm>
      <EuiFlexGroup justifyContent="flexEnd" responsive={false} gutterSize="m">
        {renderLayoutOptionsSwitch()}
        {showCopyURLButton()}
        {renderGenerateReportButton()}
      </EuiFlexGroup>
    </>
  );
};

export const ExportContent = injectI18n(ExportContentUi);
