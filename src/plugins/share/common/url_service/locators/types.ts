/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { DependencyList } from 'react';
import {
  MigrateFunction,
  PersistableState,
  PersistableStateService,
  VersionedState,
} from 'src/plugins/kibana_utils/common';
import type { FormatSearchParamsOptions } from './redirect';

/**
 * URL locator registry.
 */
export interface ILocatorClient extends PersistableStateService<LocatorData> {
  /**
   * Create and register a new locator.
   *
   * @param urlGenerator Definition of the new locator.
   */
  create<P extends SerializableRecord>(locatorDefinition: LocatorDefinition<P>): LocatorPublic<P>;

  /**
   * Retrieve a previously registered locator.
   *
   * @param id Unique ID of the locator.
   */
  get<P extends SerializableRecord>(id: string): undefined | LocatorPublic<P>;
}

/**
 * A convenience interface used to define and register a locator.
 */
export interface LocatorDefinition<P extends SerializableRecord>
  extends Partial<PersistableState<P>> {
  /**
   * Unique ID of the locator. Should be constant and unique across Kibana.
   */
  id: string;

  /**
   * Returns a deep link, including location state, which can be used for
   * navigation in Kibana.
   *
   * @param params Parameters from which to generate a Kibana location.
   */
  getLocation(params: P): Promise<KibanaLocation>;
}

/**
 * Public interface of a registered locator.
 */
export interface LocatorPublic<P extends SerializableRecord> extends PersistableState<P> {
  readonly id: string;

  /**
   * Returns a reference to a Kibana client-side location.
   *
   * @param params URL locator parameters.
   */
  getLocation(params: P): Promise<KibanaLocation>;

  /**
   * Returns a URL as a string.
   *
   * @deprecated Use `getRedirectUrl` instead. `getRedirectUrl` will preserve
   * the location state, whereas the `getUrl` just return the URL without
   * the location state.
   *
   * @param params URL locator parameters.
   * @param getUrlParams URL construction parameters.
   */
  getUrl(params: P, getUrlParams?: LocatorGetUrlParams): Promise<string>;

  /**
   * Returns a URL to the redirect endpoint, which will redirect the user to
   * the final destination.
   *
   * @param params URL locator parameters.
   * @param options URL serialization options.
   */
  getRedirectUrl(params: P, options?: FormatSearchParamsOptions): string;

  /**
   * Navigate using the `core.application.navigateToApp()` method to a Kibana
   * location generated by this locator. This method is available only on the
   * browser.
   *
   * @param params URL locator parameters.
   * @param navigationParams Navigation parameters.
   */
  navigate(params: P, navigationParams?: LocatorNavigationParams): Promise<void>;

  /**
   * React hook which returns a URL string given locator parameters. Returns
   * empty string if URL is being loaded or an error happened.
   */
  useUrl: (params: P, getUrlParams?: LocatorGetUrlParams, deps?: DependencyList) => string;
}

/**
 * Parameters used when navigating on client-side using browser history object.
 */
export interface LocatorNavigationParams {
  /**
   * Whether to replace a navigation entry in history queue or push a new entry.
   */
  replace?: boolean;
}

/**
 * Parameters used when constructing a string URL.
 */
export interface LocatorGetUrlParams {
  /**
   * Whether to return an absolute long URL or relative short URL.
   */
  absolute?: boolean;
}

/**
 * This interface represents a location in Kibana to which one can navigate
 * using the `core.application.navigateToApp()` method.
 */
export interface KibanaLocation<S = object> {
  /**
   * Kibana application ID.
   */
  app: string;

  /**
   * A relative URL path within a Kibana application.
   */
  path: string;

  /**
   * A serializable location state object, which the app can use to determine
   * what should be displayed on the screen.
   */
  state: S;
}

/**
 * Represents a serializable state of a locator. Includes locator ID, version
 * and its params.
 */
export interface LocatorData<LocatorParams extends SerializableRecord = SerializableRecord>
  extends VersionedState<LocatorParams>,
    SerializableRecord {
  /**
   * Locator ID.
   */
  id: string;
}

export interface LocatorsMigrationMap {
  [semver: string]: LocatorMigrationFunction;
}

export type LocatorMigrationFunction = MigrateFunction<LocatorData, LocatorData>;
