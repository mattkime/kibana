/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UiCounterMetricType } from '@kbn/analytics';
import {
  EuiBadge,
  EuiButton,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiHideFor,
  EuiIcon,
  EuiLink,
  EuiPortal,
  EuiProgress,
  EuiShowFor,
  EuiTitle,
} from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  useExistingFieldsFetcher,
  useQuerySubscriber,
  loadFieldExisting,
} from '@kbn/unified-field-list-plugin/public';
import type { AggregateQuery, EsQueryConfig, Filter, Query } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { VIEW_MODE } from '../../../../../common/constants';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebar } from './discover_sidebar';
import {
  AvailableFields$,
  DataDocuments$,
  RecordRawType,
} from '../../services/discover_data_state_container';
import { calcFieldCounts } from '../../utils/calc_field_counts';
import { FetchStatus } from '../../../types';
import { DISCOVER_TOUR_STEP_ANCHOR_IDS } from '../../../../components/discover_tour';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import {
  discoverSidebarReducer,
  getInitialState,
  DiscoverSidebarReducerActionType,
  DiscoverSidebarReducerStatus,
} from './lib/sidebar_reducer';

const getBuildEsQueryAsync = async () => (await import('@kbn/es-query')).buildEsQuery;

export interface DiscoverSidebarResponsiveProps {
  /**
   * Determines whether add/remove buttons are displayed non only when focused
   */
  alwaysShowActionButtons?: boolean;
  /**
   * the selected columns displayed in the doc table in discover
   */
  columns: string[];
  /**
   * hits fetched from ES, displayed in the doc table
   */
  documents$: DataDocuments$;
  /**
   * Has been toggled closed
   */
  isClosed?: boolean;
  /**
   * Callback function when selecting a field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback function when adding a filter from sidebar
   */
  onAddFilter?: (field: DataViewField | string, value: unknown, type: '+' | '-') => void;
  /**
   * Callback function when changing an data view
   */
  onChangeDataView: (id: string) => void;
  /**
   * Callback function when removing a field
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Currently selected data view
   */
  selectedDataView?: DataView;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  /**
   * Read from the Fields API
   */
  useNewFieldsApi: boolean;
  /**
   * callback to execute on edit runtime field
   */
  onFieldEdited: () => Promise<void>;
  /**
   * callback to execute on create dataview
   */
  onDataViewCreated: (dataView: DataView) => void;
  /**
   * Discover view mode
   */
  viewMode: VIEW_MODE;
  /**
   * list of available fields fetched from ES
   */
  availableFields$: AvailableFields$;
}

/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: Data view selector is visible and a button to trigger a flyout with all elements
 */
export function DiscoverSidebarResponsive(props: DiscoverSidebarResponsiveProps) {
  const services = useDiscoverServices();
  const { data, dataViews, core } = services;
  const isPlainRecord = useAppStateSelector(
    (state) => getRawRecordType(state.query) === RecordRawType.PLAIN
  );
  const { selectedDataView, onFieldEdited, onDataViewCreated } = props;
  const [fieldFilter, setFieldFilter] = useState(getDefaultFieldFilter());
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [sidebarState, dispatchSidebarStateAction] = useReducer(
    discoverSidebarReducer,
    selectedDataView,
    getInitialState
  );
  const selectedDataViewRef = useRef<DataView | null | undefined>(selectedDataView);
  const showFieldList = sidebarState.status !== DiscoverSidebarReducerStatus.INITIAL;
  // todo verify if is correct
  const useLegacy = services.uiSettings.get<boolean>('lens:useFieldExistenceSampling');

  const querySubscriberResult = useQuerySubscriber({ data });

  const fetchFields = useCallback(async () => {
    console.log('*** fetchFields is firing');
    const existingFieldList = await loadFieldExisting({
      data,
      dataView: sidebarState.dataView!,
      fromDate: querySubscriberResult.fromDate || '',
      toDate: querySubscriberResult.toDate || '',
      // dslQuery: querySubscriberResult.query || {},
      dslQuery: await buildSafeEsQuery(
        sidebarState.dataView!,
        querySubscriberResult.query!,
        querySubscriberResult.filters || [],
        getEsQueryConfig(core.uiSettings)
      ),
      timeFieldName: sidebarState.dataView?.timeFieldName,
      dataViewsService: dataViews,
      uiSettingsClient: core.uiSettings,
    });

    dispatchSidebarStateAction({
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        dataView: selectedDataViewRef.current,
        fieldCounts: existingFieldList.existingFieldNames.reduce((collector, fieldName) => {
          collector[fieldName] = 1;
          return collector;
        }, {} as Record<string, number>),
        isPlainRecord: false,
      },
    });
  }, [
    core.uiSettings,
    data,
    dataViews,
    querySubscriberResult.fromDate,
    querySubscriberResult.query,
    querySubscriberResult.toDate,
    sidebarState.dataView,
    querySubscriberResult.filters,
  ]);

  useEffect(() => {
    const subscription = props.documents$.subscribe((documentState) => {
      console.log('*** documents$ is firing', documentState.recordRawType);
      const isPlainRecordType = documentState.recordRawType === RecordRawType.PLAIN;
      const fieldsFromResults = useLegacy || isPlainRecordType;

      // todo - make this parallel to fetch - what triggers new docs?
      switch (documentState?.fetchStatus) {
        case FetchStatus.UNINITIALIZED:
          dispatchSidebarStateAction({
            type: DiscoverSidebarReducerActionType.RESET,
            payload: {
              dataView: selectedDataViewRef.current,
            },
          });
          break;
        case FetchStatus.LOADING:
          console.log(
            '*** fetchStatus.LOADING is firing ',
            fieldsFromResults,
            useLegacy,
            isPlainRecordType
          );
          if (fieldsFromResults) {
            console.log('*** BOO OLDDDD');
            dispatchSidebarStateAction({
              type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING,
              payload: {
                isPlainRecord: isPlainRecordType,
              },
            });
          } else {
            console.log('*** YES NEEEWWW');
            fetchFields();
          }
          break;
        case FetchStatus.COMPLETE:
          if (fieldsFromResults) {
            dispatchSidebarStateAction({
              type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
              payload: {
                dataView: selectedDataViewRef.current,
                // might simplify this in another PR
                fieldCounts: calcFieldCounts(documentState.result),
                isPlainRecord: isPlainRecordType,
              },
            });
          }
          break;
        case FetchStatus.ERROR:
          dispatchSidebarStateAction({
            type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
            payload: {
              dataView: selectedDataViewRef.current,
              fieldCounts: {},
              isPlainRecord: isPlainRecordType,
            },
          });
          break;
        default:
          break;
      }
    });
    return () => subscription.unsubscribe();
  }, [props.documents$, dispatchSidebarStateAction, selectedDataViewRef, useLegacy, fetchFields]);

  useEffect(() => {
    if (selectedDataView !== selectedDataViewRef.current) {
      dispatchSidebarStateAction({
        type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
        payload: {
          dataView: selectedDataView,
        },
      });
      selectedDataViewRef.current = selectedDataView;
    }
  }, [selectedDataView, dispatchSidebarStateAction, selectedDataViewRef]);

  const isAffectedByGlobalFilter = Boolean(querySubscriberResult.filters?.length);
  // this is doing the work
  const { isProcessing, refetchFieldsExistenceInfo } = useExistingFieldsFetcher({
    disableAutoFetching: true,
    dataViews: !isPlainRecord && sidebarState.dataView ? [sidebarState.dataView] : [],
    query: querySubscriberResult.query,
    filters: querySubscriberResult.filters,
    fromDate: querySubscriberResult.fromDate,
    toDate: querySubscriberResult.toDate,
    services: {
      data,
      dataViews,
      core,
    },
  });

  useEffect(() => {
    if (sidebarState.status === DiscoverSidebarReducerStatus.COMPLETED) {
      // todo
      console.log('*** refetchFieldsExistenceInfo');
      refetchFieldsExistenceInfo();
    }
    // refetching only if status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarState.status]);

  const closeFieldEditor = useRef<() => void | undefined>();
  const closeDataViewEditor = useRef<() => void | undefined>();

  useEffect(() => {
    const cleanup = () => {
      if (closeFieldEditor?.current) {
        closeFieldEditor?.current();
      }
      if (closeDataViewEditor?.current) {
        closeDataViewEditor?.current();
      }
    };
    return () => {
      // Make sure to close the editor when unmounting
      cleanup();
    };
  }, []);

  const setFieldEditorRef = useCallback((ref: () => void | undefined) => {
    closeFieldEditor.current = ref;
  }, []);

  const setDataViewEditorRef = useCallback((ref: () => void | undefined) => {
    closeDataViewEditor.current = ref;
  }, []);

  const closeFlyout = useCallback(() => {
    setIsFlyoutVisible(false);
  }, []);

  const { dataViewFieldEditor, dataViewEditor } = services;
  const { availableFields$ } = props;

  const canEditDataView =
    Boolean(dataViewEditor?.userPermissions.editDataView()) || !selectedDataView?.isPersisted();

  useEffect(() => {
    // For an external embeddable like the Field stats
    // it is useful to know what fields are populated in the docs fetched
    // or what fields are selected by the user

    const availableFields =
      props.columns.length > 0 ? props.columns : Object.keys(sidebarState.fieldCounts || {});
    availableFields$.next({
      fetchStatus: FetchStatus.COMPLETE,
      fields: availableFields,
    });
  }, [selectedDataView, sidebarState.fieldCounts, props.columns, availableFields$]);

  const editField = useMemo(
    () =>
      !isPlainRecord && canEditDataView && selectedDataView
        ? (fieldName?: string) => {
            const ref = dataViewFieldEditor.openEditor({
              ctx: {
                dataView: selectedDataView,
              },
              fieldName,
              onSave: async () => {
                await onFieldEdited();
              },
            });
            if (setFieldEditorRef) {
              setFieldEditorRef(ref);
            }
            if (closeFlyout) {
              closeFlyout();
            }
          }
        : undefined,
    [
      isPlainRecord,
      canEditDataView,
      dataViewFieldEditor,
      selectedDataView,
      setFieldEditorRef,
      closeFlyout,
      onFieldEdited,
    ]
  );

  const createNewDataView = useCallback(() => {
    const ref = dataViewEditor.openEditor({
      onSave: async (dataView) => {
        onDataViewCreated(dataView);
      },
    });
    if (setDataViewEditorRef) {
      setDataViewEditorRef(ref);
    }
    if (closeFlyout) {
      closeFlyout();
    }
  }, [dataViewEditor, setDataViewEditorRef, closeFlyout, onDataViewCreated]);

  if (!selectedDataView) {
    return null;
  }

  return (
    <>
      {!props.isClosed && (
        <EuiHideFor sizes={['xs', 's']}>
          {isProcessing && <EuiProgress size="xs" color="accent" position="absolute" />}
          <DiscoverSidebar
            {...props}
            onFieldEdited={onFieldEdited}
            allFields={sidebarState.allFields}
            fieldFilter={fieldFilter}
            setFieldFilter={setFieldFilter}
            editField={editField}
            createNewDataView={createNewDataView}
            showFieldList={showFieldList}
            isAffectedByGlobalFilter={isAffectedByGlobalFilter}
          />
        </EuiHideFor>
      )}
      <EuiShowFor sizes={['xs', 's']}>
        <div className="dscSidebar__mobile">
          <EuiButton
            contentProps={{
              className: 'dscSidebar__mobileButton',
              id: DISCOVER_TOUR_STEP_ANCHOR_IDS.addFields,
            }}
            fullWidth
            onClick={() => setIsFlyoutVisible(true)}
          >
            <FormattedMessage
              id="discover.fieldChooser.fieldsMobileButtonLabel"
              defaultMessage="Fields"
            />
            <EuiBadge
              className="dscSidebar__mobileBadge"
              color={props.columns[0] === '_source' ? 'default' : 'accent'}
            >
              {props.columns[0] === '_source' ? 0 : props.columns.length}
            </EuiBadge>
          </EuiButton>
        </div>
        {isFlyoutVisible && (
          <EuiPortal>
            <EuiFlyout
              size="s"
              onClose={() => setIsFlyoutVisible(false)}
              aria-labelledby="flyoutTitle"
              ownFocus
            >
              <EuiFlyoutHeader hasBorder>
                <EuiTitle size="s">
                  <h2 id="flyoutTitle">
                    <EuiLink color="text" onClick={() => setIsFlyoutVisible(false)}>
                      <EuiIcon
                        className="eui-alignBaseline"
                        aria-label={i18n.translate('discover.fieldList.flyoutBackIcon', {
                          defaultMessage: 'Back',
                        })}
                        type="arrowLeft"
                      />{' '}
                      <strong>
                        {i18n.translate('discover.fieldList.flyoutHeading', {
                          defaultMessage: 'Field list',
                        })}
                      </strong>
                    </EuiLink>
                  </h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              <DiscoverSidebar
                {...props}
                onFieldEdited={onFieldEdited}
                allFields={sidebarState.allFields}
                fieldFilter={fieldFilter}
                setFieldFilter={setFieldFilter}
                alwaysShowActionButtons={true}
                setFieldEditorRef={setFieldEditorRef}
                closeFlyout={closeFlyout}
                editField={editField}
                createNewDataView={createNewDataView}
                showDataViewPicker={true}
                showFieldList={showFieldList}
                isAffectedByGlobalFilter={isAffectedByGlobalFilter}
              />
            </EuiFlyout>
          </EuiPortal>
        )}
      </EuiShowFor>
    </>
  );
}

// copied from use_existing_fields.ts
// Wrapper around buildEsQuery, handling errors (e.g. because a query can't be parsed) by
// returning a query dsl object not matching anything
async function buildSafeEsQuery(
  dataView: DataView,
  query: Query | AggregateQuery,
  filters: Filter[],
  queryConfig: EsQueryConfig
) {
  const buildEsQuery = await getBuildEsQueryAsync();
  try {
    return buildEsQuery(dataView, query, filters, queryConfig);
  } catch (e) {
    return {
      bool: {
        must_not: {
          match_all: {},
        },
      },
    };
  }
}
