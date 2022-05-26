/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { KbnFieldType, getKbnFieldType } from '@kbn/field-types';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { RuntimeFieldSpec } from '../types';
import type { IFieldType } from './types';
import { FieldSpec, DataView } from '..';
import {
  shortenDottedString,
  isDataViewFieldSubtypeMulti,
  isDataViewFieldSubtypeNested,
  getDataViewFieldSubtypeMulti,
  getDataViewFieldSubtypeNested,
} from './utils';

/**
 *  @public
 * Data view field class
 * */
export class DataViewField implements IFieldType {
  readonly spec: FieldSpec;
  // not writable or serialized
  private readonly kbnFieldType: KbnFieldType;

  constructor(spec: FieldSpec) {
    this.spec = { ...spec, type: spec.name === '_source' ? '_source' : spec.type };

    this.kbnFieldType = getKbnFieldType(spec.type);
  }

  // writable attrs
  /**
   * Count is used for field popularity in discover
   */
  public get count() {
    return this.spec.count || 0;
  }

  /**
   * set count, which is used for field popularity in discover
   */
  public set count(count: number) {
    this.spec.count = count;
  }

  /**
   * Returns runtime field definition or undefined if field is not runtime field
   */

  public get runtimeField() {
    return this.spec.runtimeField;
  }

  /**
   * Sets runtime field definition or unsets if undefined is provided
   */
  public set runtimeField(runtimeField: RuntimeFieldSpec | undefined) {
    this.spec.runtimeField = runtimeField;
  }

  /**
   * Script field code
   */
  public get script() {
    return this.spec.script;
  }

  /**
   * Sets scripted field painless code
   */
  public set script(script) {
    this.spec.script = script;
  }

  /**
   * Script field language
   */
  public get lang() {
    return this.spec.lang;
  }

  /**
   * Sets scripted field langauge
   */
  public set lang(lang) {
    this.spec.lang = lang;
  }

  /**
   * Returns custom label if set, otherwise undefined
   */

  public get customLabel() {
    return this.spec.customLabel;
  }

  /**
   * Sets custom label for field, or unsets if passed undefined
   */
  public set customLabel(customLabel) {
    this.spec.customLabel = customLabel;
  }

  /**
   * Description of field type conflicts across different indices in the same index pattern
   */
  public get conflictDescriptions() {
    return this.spec.conflictDescriptions;
  }

  /**
   * sSts conflict descriptions for field
   */

  public set conflictDescriptions(conflictDescriptions) {
    this.spec.conflictDescriptions = conflictDescriptions;
  }

  // read only attrs

  /**
   * Get field name
   */
  public get name() {
    return this.spec.name;
  }

  /**
   * Gets display name, calcualted based on name, custom label and shortDotsEnable
   */

  public get displayName(): string {
    return this.spec.customLabel
      ? this.spec.customLabel
      : this.spec.shortDotsEnable
      ? shortenDottedString(this.spec.name)
      : this.spec.name;
  }

  /**
   * Gets field type
   */
  public get type() {
    return this.spec.type;
  }

  /**
   * Gets ES types as string array
   */

  public get esTypes() {
    return this.spec.esTypes;
  }

  /**
   * Returns true if scripted field
   */

  public get scripted() {
    return !!this.spec.scripted;
  }

  /**
   * Returns true if field is searchable
   */

  public get searchable() {
    return !!(this.spec.searchable || this.scripted);
  }

  /**
   * Returns true if field is aggregatable
   */

  public get aggregatable() {
    return !!(this.spec.aggregatable || this.scripted);
  }

  /**
   * Returns true if field is available vai doc values
   */

  public get readFromDocValues() {
    return !!(this.spec.readFromDocValues && !this.scripted);
  }

  /**
   * Returns field subtype, multi, nested, or undefined if neither
   */

  public get subType() {
    return this.spec.subType;
  }

  /**
   * Is the field part of the index mapping?
   */
  public get isMapped() {
    return this.spec.isMapped;
  }

  /**
   * Returns true if runtime field defined on data view
   */

  public get isRuntimeField() {
    return !this.isMapped && this.runtimeField !== undefined;
  }

  // not writable, not serialized

  /**
   * Returns true if field is sortable
   */
  public get sortable() {
    return (
      this.name === '_score' ||
      ((this.spec.indexed || this.aggregatable) && this.kbnFieldType.sortable)
    );
  }

  /**
   * Returns true if field is filterable
   */

  public get filterable() {
    return (
      this.name === '_id' ||
      this.scripted ||
      ((this.spec.indexed || this.searchable) && this.kbnFieldType.filterable)
    );
  }

  /**
   * Returns true if field is visualizable
   */

  public get visualizable() {
    const notVisualizableFieldTypes: string[] = [KBN_FIELD_TYPES.UNKNOWN, KBN_FIELD_TYPES.CONFLICT];
    return this.aggregatable && !notVisualizableFieldTypes.includes(this.spec.type);
  }

  /**
   * Returns true if field is subtype nested
   */
  public isSubtypeNested() {
    return isDataViewFieldSubtypeNested(this);
  }

  /**
   * Returns true if field is subtype multi
   */

  public isSubtypeMulti() {
    return isDataViewFieldSubtypeMulti(this);
  }

  /**
   * Returns subtype nested data if exists
   */

  public getSubtypeNested() {
    return getDataViewFieldSubtypeNested(this);
  }

  /**
   * Returns subtype multi data if exists
   */

  public getSubtypeMulti() {
    return getDataViewFieldSubtypeMulti(this);
  }

  /**
   * Deletes count value. Popularity as used by discover
   */

  public deleteCount() {
    delete this.spec.count;
  }

  /**
   *
   * @returns JSON version of field
   */
  public toJSON() {
    return {
      count: this.count,
      script: this.script,
      lang: this.lang,
      conflictDescriptions: this.conflictDescriptions,
      name: this.name,
      type: this.type,
      esTypes: this.esTypes,
      scripted: this.scripted,
      searchable: this.searchable,
      aggregatable: this.aggregatable,
      readFromDocValues: this.readFromDocValues,
      subType: this.subType,
      customLabel: this.customLabel,
    };
  }

  /**
   * Get field in serialized form - fieldspec
   * @param param0 provide a method to get a field formatter
   * @returns field in serialized form - field spec
   */
  public toSpec({
    getFormatterForField,
  }: {
    getFormatterForField?: DataView['getFormatterForField'];
  } = {}): FieldSpec {
    return {
      count: this.count,
      script: this.script,
      lang: this.lang,
      conflictDescriptions: this.conflictDescriptions,
      name: this.name,
      type: this.type,
      esTypes: this.esTypes,
      scripted: this.scripted,
      searchable: this.searchable,
      aggregatable: this.aggregatable,
      readFromDocValues: this.readFromDocValues,
      subType: this.subType,
      format: getFormatterForField ? getFormatterForField(this).toJSON() : undefined,
      customLabel: this.customLabel,
      shortDotsEnable: this.spec.shortDotsEnable,
      runtimeField: this.runtimeField,
      isMapped: this.isMapped,
    };
  }

  /**
   * Returns true if composite runtime field
   */

  public isRuntimeCompositeSubField() {
    return this.runtimeField?.type === 'composite';
  }
}

/**
 * @deprecated Use DataViewField instead. All index pattern interfaces were renamed.
 */
export class IndexPatternField extends DataViewField {}
