/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreSetup } from 'src/core/public';
import { DateFormat } from './converters/date';
import { FieldFormatsRegistry, baseFormatters } from '../../common';

export class FieldFormatsService {
  private readonly fieldFormatsRegistry: FieldFormatsRegistry = new FieldFormatsRegistry();

  public setup(core: CoreSetup) {
    core.uiSettings.getUpdate$().subscribe(({ key, newValue }) => {
      if (key === 'format:defaultTypeMap') {
        this.fieldFormatsRegistry.parseDefaultTypeMap(newValue);
      }
    });

    const getConfig = core.uiSettings.get.bind(core.uiSettings);

    this.fieldFormatsRegistry.init(
      getConfig,
      {
        parsedUrl: {
          origin: window.location.origin,
          pathname: window.location.pathname,
          basePath: core.http.basePath.get(),
        },
      },
      [DateFormat, ...baseFormatters]
    );

    return this.fieldFormatsRegistry as FieldFormatsSetup;
  }

  public start() {
    return this.fieldFormatsRegistry as FieldFormatsStart;
  }
}

/** @public */
export type FieldFormatsSetup = Pick<FieldFormatsRegistry, 'register'>;

/** @public */
export type FieldFormatsStart = Omit<FieldFormatsRegistry, 'init' & 'register'>;
