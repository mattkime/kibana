/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { DataViewFieldBase, IFieldSubTypeNested, IFieldSubTypeMulti } from './es_query';

/** @internal */
export function getTimeZoneFromSettings(dateFormatTZ: string) {
  const detectedTimezone = moment.tz.guess();

  return dateFormatTZ === 'Browser' ? detectedTimezone : dateFormatTZ;
}

interface AnythingWithSubtype {
  subType?: DataViewFieldBase['subType'];
}

type ObjectWithSubtype = DataViewFieldBase | AnythingWithSubtype;

export function isDataViewFieldSubtypeNested(field: ObjectWithSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeNested;
  return !!subTypeNested?.nested?.path;
}

export function getDataViewFieldSubtypeNested(field: ObjectWithSubtype) {
  return isDataViewFieldSubtypeNested(field) ? (field.subType as IFieldSubTypeNested) : undefined;
}

export function isDataViewFieldSubtypeMulti(field: ObjectWithSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeMulti;
  return !!subTypeNested?.multi?.parent;
}

export function getDataViewFieldSubtypeMulti(field: ObjectWithSubtype) {
  return isDataViewFieldSubtypeMulti(field) ? (field.subType as IFieldSubTypeMulti) : undefined;
}
