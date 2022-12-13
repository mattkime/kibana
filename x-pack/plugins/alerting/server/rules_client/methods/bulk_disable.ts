/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import { RawRule } from '../../types';
import { convertRuleIdsToKueryNode } from '../../lib';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import {
  retryIfBulkDisableConflicts,
  buildKueryNodeFilter,
  getAndValidateCommonBulkOptions,
} from '../common';
import {
  getAuthorizationFilter,
  checkAuthorizationAndGetTotal,
  getAlertFromRaw,
  recoverRuleAlerts,
  updateMeta,
} from '../lib';
import { BulkOptions, BulkOperationError, RulesClientContext } from '../types';

export const bulkDisableRules = async (context: RulesClientContext, options: BulkOptions) => {
  const { ids, filter } = getAndValidateCommonBulkOptions(options);

  const kueryNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : buildKueryNodeFilter(filter);
  const authorizationFilter = await getAuthorizationFilter(context, { action: 'DISABLE' });

  const kueryNodeFilterWithAuth =
    authorizationFilter && kueryNodeFilter
      ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
      : kueryNodeFilter;

  const { total } = await checkAuthorizationAndGetTotal(context, {
    filter: kueryNodeFilterWithAuth,
    action: 'DISABLE',
  });

  const { errors, rules, taskIdsToDisable, taskIdsToDelete } = await retryIfBulkDisableConflicts(
    context.logger,
    (filterKueryNode: KueryNode | null) =>
      bulkDisableRulesWithOCC(context, { filter: filterKueryNode }),
    kueryNodeFilterWithAuth
  );

  if (taskIdsToDisable.length > 0) {
    try {
      const resultFromDisablingTasks = await context.taskManager.bulkDisable(taskIdsToDisable);
      if (resultFromDisablingTasks.tasks.length) {
        context.logger.debug(
          `Successfully disabled schedules for underlying tasks: ${resultFromDisablingTasks.tasks
            .map((task) => task.id)
            .join(', ')}`
        );
      }
      if (resultFromDisablingTasks.errors.length) {
        context.logger.error(
          `Failure to disable schedules for underlying tasks: ${resultFromDisablingTasks.errors
            .map((error) => error.task.id)
            .join(', ')}`
        );
      }
    } catch (error) {
      context.logger.error(
        `Failure to disable schedules for underlying tasks: ${taskIdsToDisable.join(
          ', '
        )}. TaskManager bulkDisable failed with Error: ${error.message}`
      );
    }
  }

  const taskIdsFailedToBeDeleted: string[] = [];
  const taskIdsSuccessfullyDeleted: string[] = [];

  if (taskIdsToDelete.length > 0) {
    try {
      const resultFromDeletingTasks = await context.taskManager.bulkRemoveIfExist(taskIdsToDelete);
      resultFromDeletingTasks?.statuses.forEach((status) => {
        if (status.success) {
          taskIdsSuccessfullyDeleted.push(status.id);
        } else {
          taskIdsFailedToBeDeleted.push(status.id);
        }
      });
      if (taskIdsSuccessfullyDeleted.length) {
        context.logger.debug(
          `Successfully deleted schedules for underlying tasks: ${taskIdsSuccessfullyDeleted.join(
            ', '
          )}`
        );
      }
      if (taskIdsFailedToBeDeleted.length) {
        context.logger.error(
          `Failure to delete schedules for underlying tasks: ${taskIdsFailedToBeDeleted.join(', ')}`
        );
      }
    } catch (error) {
      context.logger.error(
        `Failure to delete schedules for underlying tasks: ${taskIdsToDelete.join(
          ', '
        )}. TaskManager bulkRemoveIfExist failed with Error: ${error.message}`
      );
    }
  }

  const updatedRules = rules.map(({ id, attributes, references }) => {
    return getAlertFromRaw(
      context,
      id,
      attributes.alertTypeId as string,
      attributes as RawRule,
      references,
      false
    );
  });

  return { errors, rules: updatedRules, total };
};

const bulkDisableRulesWithOCC = async (
  context: RulesClientContext,
  { filter }: { filter: KueryNode | null }
) => {
  const rulesFinder =
    await context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
      {
        filter,
        type: 'alert',
        perPage: 100,
        ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
      }
    );

  const rulesToDisable: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];
  const errors: BulkOperationError[] = [];
  const ruleNameToRuleIdMapping: Record<string, string> = {};

  for await (const response of rulesFinder.find()) {
    await pMap(response.saved_objects, async (rule) => {
      try {
        if (rule.attributes.enabled === false) return;

        recoverRuleAlerts(context, rule.id, rule.attributes);

        if (rule.attributes.name) {
          ruleNameToRuleIdMapping[rule.id] = rule.attributes.name;
        }

        const username = await context.getUserName();
        const updatedAttributes = updateMeta(context, {
          ...rule.attributes,
          enabled: false,
          scheduledTaskId:
            rule.attributes.scheduledTaskId === rule.id ? rule.attributes.scheduledTaskId : null,
          updatedBy: username,
          updatedAt: new Date().toISOString(),
        });

        rulesToDisable.push({
          ...rule,
          attributes: {
            ...updatedAttributes,
          },
        });

        context.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.DISABLE,
            outcome: 'unknown',
            savedObject: { type: 'alert', id: rule.id },
          })
        );
      } catch (error) {
        errors.push({
          message: error.message,
          rule: {
            id: rule.id,
            name: rule.attributes?.name,
          },
        });
        context.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.DISABLE,
            error,
          })
        );
      }
    });
  }

  const result = await context.unsecuredSavedObjectsClient.bulkCreate(rulesToDisable, {
    overwrite: true,
  });

  const taskIdsToDisable: string[] = [];
  const taskIdsToDelete: string[] = [];
  const disabledRules: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];

  result.saved_objects.forEach((rule) => {
    if (rule.error === undefined) {
      if (rule.attributes.scheduledTaskId) {
        if (rule.attributes.scheduledTaskId !== rule.id) {
          taskIdsToDelete.push(rule.attributes.scheduledTaskId);
        } else {
          taskIdsToDisable.push(rule.attributes.scheduledTaskId);
        }
      }
      disabledRules.push(rule);
    } else {
      errors.push({
        message: rule.error.message ?? 'n/a',
        status: rule.error.statusCode,
        rule: {
          id: rule.id,
          name: ruleNameToRuleIdMapping[rule.id] ?? 'n/a',
        },
      });
    }
  });

  return { errors, rules: disabledRules, taskIdsToDisable, taskIdsToDelete };
};
