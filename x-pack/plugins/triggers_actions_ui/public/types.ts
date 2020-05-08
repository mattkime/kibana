/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup, DocLinksStart } from 'kibana/public';
import { ComponentType } from 'react';
import { ActionGroup } from '../../alerting/common';
import { ActionType } from '../../actions/common';
import { TypeRegistry } from './application/type_registry';
import {
  SanitizedAlert as Alert,
  AlertAction,
  AlertTaskState,
  RawAlertInstance,
  AlertingFrameworkHealth,
} from '../../../plugins/alerting/common';
export { Alert, AlertAction, AlertTaskState, RawAlertInstance, AlertingFrameworkHealth };
export { ActionType };

export type ActionTypeIndex = Record<string, ActionType>;
export type AlertTypeIndex = Record<string, AlertType>;
export type ActionTypeRegistryContract<ActionConnector = any, ActionParams = any> = PublicMethodsOf<
  TypeRegistry<ActionTypeModel<ActionConnector, ActionParams>>
>;
export type AlertTypeRegistryContract = PublicMethodsOf<TypeRegistry<AlertTypeModel>>;

export interface ActionConnectorFieldsProps<TActionConnector> {
  action: TActionConnector;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: IErrorObject;
  docLinks: DocLinksStart;
  http?: HttpSetup;
}

export interface ActionParamsProps<TParams> {
  actionParams: TParams;
  index: number;
  editAction: (property: string, value: any, index: number) => void;
  errors: IErrorObject;
  messageVariables?: string[];
  defaultMessage?: string;
}

export interface Pagination {
  index: number;
  size: number;
}

export interface ActionTypeModel<ActionConnector = any, ActionParams = any> {
  id: string;
  iconClass: string;
  selectMessage: string;
  actionTypeTitle?: string;
  validateConnector: (connector: any) => ValidationResult;
  validateParams: (actionParams: any) => ValidationResult;
  actionConnectorFields: React.LazyExoticComponent<
    ComponentType<ActionConnectorFieldsProps<ActionConnector>>
  > | null;
  actionParamsFields: React.LazyExoticComponent<
    ComponentType<ActionParamsProps<ActionParams>>
  > | null;
}

export interface ValidationResult {
  errors: Record<string, any>;
}

export interface ActionConnector {
  secrets: Record<string, any>;
  id: string;
  actionTypeId: string;
  name: string;
  referencedByCount?: number;
  config: Record<string, any>;
  isPreconfigured: boolean;
}

export type ActionConnectorWithoutId = Omit<ActionConnector, 'id'>;

export interface ActionConnectorTableItem extends ActionConnector {
  actionType: ActionType['name'];
}

export interface ActionVariable {
  name: string;
  description: string;
}

export interface ActionVariables {
  context: ActionVariable[];
  state: ActionVariable[];
}

export interface AlertType {
  id: string;
  name: string;
  actionGroups: ActionGroup[];
  actionVariables: ActionVariables;
  defaultActionGroupId: ActionGroup['id'];
}

export type SanitizedAlertType = Omit<AlertType, 'apiKey'>;

export type AlertWithoutId = Omit<Alert, 'id'>;

export interface AlertTableItem extends Alert {
  alertType: AlertType['name'];
  tagsText: string;
}

export interface AlertTypeModel {
  id: string;
  name: string | JSX.Element;
  iconClass: string;
  validate: (alertParams: any) => ValidationResult;
  alertParamsExpression: React.FunctionComponent<any>;
  defaultActionMessage?: string;
}

export interface IErrorObject {
  [key: string]: string | string[] | IErrorObject;
}
