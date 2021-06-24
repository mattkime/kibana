/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import {
  IndexPatternSpec,
  Form,
  UseField,
  useForm,
  TextField,
  useFormData,
  ToggleField,
  useKibana,
} from '../shared_imports';

import {
  ensureMinimumTime,
  getIndices,
  extractTimeFields,
  getMatchedIndices,
  MatchedIndicesSet,
} from '../lib';
import { AdvancedParametersSection } from './field_editor/advanced_parameters_section';
import { FlyoutPanels } from './flyout_panels';

import { MatchedItem, ResolveIndexResponseItemAlias, IndexPatternEditorContext } from '../types';

import { IndexPatternCreationConfig } from '../service';
import {
  LoadingIndices,
  StatusMessage,
  IndicesList,
  EmptyIndexPatternPrompt,
  EmptyState,
  TimestampField,
  TypeField,
  TitleField,
  schema,
  geti18nTexts,
} from '.';

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (indexPatternSpec: IndexPatternSpec) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  existingIndexPatterns: string[];
  defaultTypeIsRollup?: boolean;
  requireTimestampField?: boolean;
}

export interface IndexPatternConfig {
  title: string;
  timestampField?: EuiComboBoxOptionOption<string>;
  allowHidden: boolean;
  id?: string;
  type: string;
}
export interface TimestampOption {
  display: string;
  fieldName?: string;
}

export interface FormInternal extends Omit<IndexPatternConfig, 'timestampField'> {
  timestampField?: TimestampOption;
}

const IndexPatternEditorFlyoutContentComponent = ({
  onSave,
  onCancel,
  defaultTypeIsRollup,
  requireTimestampField = false,
}: Props) => {
  const {
    services: { http, indexPatternService, uiSettings, indexPatternCreateService },
  } = useKibana<IndexPatternEditorContext>();

  const i18nTexts = geti18nTexts();

  // return type, interal type
  const { form } = useForm<IndexPatternConfig, FormInternal>({
    defaultValue: { type: defaultTypeIsRollup ? 'rollup' : 'default' },
    schema,
    // todo use isValid?
    onSubmit: async (formData, isValid) => {
      if (!isValid) {
        return;
      }
      // todo show errors
      indexPatternCreationType.checkIndicesForErrors(matchedIndices.exactMatchedIndices);

      await onSave({
        title: formData.title,
        timeFieldName: formData.timestampField?.value,
        id: formData.id,
        ...indexPatternCreationType.getIndexPatternMappings(),
      });
    },
  });

  const [{ title, allowHidden, type, timestampField }] = useFormData<FormInternal>({ form });
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(true);

  const [lastTitle, setLastTitle] = useState('');
  const [timestampFieldOptions, setTimestampFieldOptions] = useState<TimestampOption[]>([]);
  const [isLoadingTimestampFields, setIsLoadingTimestampFields] = useState<boolean>(false);
  const [isLoadingMatchedIndices, setIsLoadingMatchedIndices] = useState<boolean>(false);
  const [allSources, setAllSources] = useState<MatchedItem[]>([]);
  const [remoteClustersExist, setRemoteClustersExist] = useState<boolean>(false);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);
  const [goToForm, setGoToForm] = useState<boolean>(false);
  const [existingIndexPatterns, setExistingIndexPatterns] = useState<string[]>([]);
  const [matchedIndices, setMatchedIndices] = useState<MatchedIndicesSet>({
    allIndices: [],
    exactMatchedIndices: [],
    partialMatchedIndices: [],
    visibleIndices: [],
  });
  const [
    indexPatternCreationType,
    setIndexPatternCreationType,
  ] = useState<IndexPatternCreationConfig>(indexPatternCreateService.creation.getType('default'));

  const removeAliases = (item: MatchedItem) =>
    !((item as unknown) as ResolveIndexResponseItemAlias).indices;

  // load all data sources
  const loadSources = useCallback(() => {
    getIndices(http, () => [], '*', allowHidden).then((dataSources) => {
      setAllSources(dataSources);
      setIsLoadingSources(false);
    });
    getIndices(http, () => [], '*:*', false).then((dataSources) =>
      setRemoteClustersExist(!!dataSources.filter(removeAliases).length)
    );
  }, [http, allowHidden]);

  // loading list of index patterns
  useEffect(() => {
    let isMounted = true;
    loadSources();
    const getTitles = async () => {
      const indexPatternTitles = await indexPatternService.getTitles();
      if (isMounted) {
        setExistingIndexPatterns(indexPatternTitles);
        setIsLoadingIndexPatterns(false);
      }
    };
    getTitles();
    return () => {
      isMounted = false;
    };
  }, [http, indexPatternService, loadSources]);

  // updates index pattern creation type based on selection
  useEffect(() => {
    const updatedCreationType = indexPatternCreateService.creation.getType(type);
    setIndexPatternCreationType(updatedCreationType);
    if (type === 'rollup') {
      form.setFieldValue('allowHidden', false);
    }
  }, [type, indexPatternCreateService.creation, form]);

  // fetches indices and timestamp options
  useEffect(() => {
    const fetchIndices = async (query: string = '') => {
      setIsLoadingMatchedIndices(true);
      const indexRequests = [];

      if (query?.endsWith('*')) {
        const exactMatchedQuery = getIndices(
          http,
          (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
          query,
          allowHidden
        );
        indexRequests.push(exactMatchedQuery);
        indexRequests.push(Promise.resolve([]));
      } else {
        const exactMatchQuery = getIndices(
          http,
          (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
          query,
          allowHidden
        );
        const partialMatchQuery = getIndices(
          http,
          (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
          `${query}*`,
          allowHidden
        );

        indexRequests.push(exactMatchQuery);
        indexRequests.push(partialMatchQuery);
      }

      const [exactMatched, partialMatched] = (await ensureMinimumTime(
        indexRequests
      )) as MatchedItem[][];

      if (query !== lastTitle) {
        return;
      }

      const isValidResult =
        !!title?.length && !existingIndexPatterns.includes(title) && exactMatched.length > 0;

      const matchedIndicesResult = getMatchedIndices(
        allSources,
        partialMatched,
        exactMatched,
        allowHidden
      );

      setMatchedIndices(matchedIndicesResult);
      setIsLoadingMatchedIndices(false);

      if (isValidResult) {
        setIsLoadingTimestampFields(true);
        const fields = await ensureMinimumTime(
          indexPatternService.getFieldsForWildcard({
            pattern: query,
            ...indexPatternCreationType.getFetchForWildcardOptions(),
          })
        );
        const timeFields = extractTimeFields(fields, requireTimestampField);
        setIsLoadingTimestampFields(false);
        setTimestampFieldOptions(timeFields);
      } else {
        setTimestampFieldOptions([]);
      }
    };

    setLastTitle(title);
    fetchIndices(title);
  }, [
    title,
    existingIndexPatterns,
    http,
    indexPatternService,
    allowHidden,
    lastTitle,
    indexPatternCreationType,
    allSources,
    requireTimestampField,
  ]);

  // todo
  if (isLoadingSources || isLoadingIndexPatterns) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const hasDataIndices = allSources.some(({ name }: MatchedItem) => !name.startsWith('.'));

  if (!existingIndexPatterns.length && !goToForm) {
    if (!hasDataIndices && !remoteClustersExist) {
      // load data
      return (
        <EmptyState
          onRefresh={loadSources}
          closeFlyout={onCancel}
          createAnyway={() => setGoToForm(true)}
        />
      );
    } else {
      // first time
      return <EmptyIndexPatternPrompt goToCreate={() => setGoToForm(true)} />;
    }
  }

  const showIndexPatternTypeSelect = () =>
    uiSettings.isDeclared('rollups:enableIndexPatterns') &&
    uiSettings.get('rollups:enableIndexPatterns');

  const indexPatternTypeSelect = showIndexPatternTypeSelect() ? (
    <EuiFlexGroup>
      <EuiFlexItem>
        <TypeField />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <></>
  );

  const renderIndexList = () => {
    if (isLoadingSources) {
      return <></>;
    }

    const indicesToList = title?.length ? matchedIndices.visibleIndices : matchedIndices.allIndices;
    return (
      <IndicesList
        data-test-subj="createIndexPatternStep1IndicesList"
        query={title || ''}
        indices={indicesToList}
      />
    );
  };

  const renderStatusMessage = (matched: {
    allIndices: MatchedItem[];
    exactMatchedIndices: MatchedItem[];
    partialMatchedIndices: MatchedItem[];
  }) => {
    if (isLoadingSources) {
      return null;
    }

    return (
      <StatusMessage
        matchedIndices={matched}
        showSystemIndices={indexPatternCreationType.getShowSystemIndices()}
        isIncludingSystemIndices={allowHidden}
        query={title || ''}
      />
    );
  };

  // needed to trigger validation without touching advanced options
  if (title && timestampField) {
    form.validate();
  }

  // move into render fn
  const disableSubmit =
    !form.isValid ||
    !matchedIndices.exactMatchedIndices.length ||
    // todo display errors
    !!indexPatternCreationType.checkIndicesForErrors(matchedIndices.exactMatchedIndices) ||
    (!!timestampFieldOptions.length && timestampField === undefined);

  const previewPanelContent = isLoadingIndexPatterns ? (
    <LoadingIndices />
  ) : (
    <>
      {renderStatusMessage(matchedIndices)}
      <EuiSpacer />
      {renderIndexList()}
    </>
  );

  // todo try to move within component
  const selectTimestampHelp = timestampFieldOptions.length ? i18nTexts.timestampFieldHelp : '';

  const timestampNoFieldsHelp =
    timestampFieldOptions.length === 0 &&
    !existingIndexPatterns.includes(title || '') &&
    !isLoadingMatchedIndices &&
    !isLoadingTimestampFields &&
    matchedIndices.exactMatchedIndices.length
      ? i18nTexts.noTimestampOptionText
      : '';
  //

  return (
    <>
      <FlyoutPanels.Group flyoutClassName={'indexPatternEditorFlyout'} maxWidth={1180}>
        <FlyoutPanels.Item>
          {/*
          possibly break out into own component
        */}
          {/* <EuiFlyoutHeader> */}
          <EuiTitle data-test-subj="flyoutTitle">
            <h2>Create index pattern</h2>
          </EuiTitle>
          {/* </EuiFlyoutHeader> */}
          <Form form={form} className="indexPatternEditor__form">
            {indexPatternTypeSelect}
            <EuiFlexGroup>
              {/* Name */}
              <EuiFlexItem>
                <TitleField existingIndexPatterns={existingIndexPatterns} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem>
                <TimestampField
                  options={timestampFieldOptions}
                  isLoadingOptions={isLoadingTimestampFields}
                  helpText={timestampNoFieldsHelp || selectTimestampHelp}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <AdvancedParametersSection>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <UseField<boolean, IndexPatternConfig>
                    path={'allowHidden'}
                    component={ToggleField}
                    data-test-subj="allowHiddenField"
                    componentProps={{
                      euiFieldProps: {
                        'aria-label': i18nTexts.allowHiddenAriaLabel,
                      },
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <UseField<string, IndexPatternConfig>
                    path={'id'}
                    component={TextField}
                    data-test-subj="savedObjectIdField"
                    componentProps={{
                      euiFieldProps: {
                        'aria-label': i18nTexts.customIndexPatternIdLabel,
                      },
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </AdvancedParametersSection>
          </Form>
          {/* </EuiFlyoutBody> */}
          {/* modal */}
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  flush="left"
                  onClick={onCancel}
                  data-test-subj="closeFlyoutButton"
                >
                  {i18nTexts.closeButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  onClick={() => form.submit()}
                  data-test-subj="saveIndexPatternButton"
                  fill
                  disabled={disableSubmit}
                >
                  {i18nTexts.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </FlyoutPanels.Item>
        <FlyoutPanels.Item>{previewPanelContent}</FlyoutPanels.Item>
      </FlyoutPanels.Group>
    </>
  );
};

export const IndexPatternEditorFlyoutContent = React.memo(IndexPatternEditorFlyoutContentComponent);
