/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Schema } from '..';
import { K8sEntity } from '.';

export function k8sReplicaSetEntity({
  schema,
  name,
  uid,
  clusterName,
  entityId,
  ...others
}: {
  schema: Schema;
  name: string;
  uid?: string;
  clusterName?: string;
  entityId: string;
  [key: string]: any;
}) {
  if (schema === 'ecs') {
    return new K8sEntity(schema, {
      'entity.definition_id': 'replica_set',
      'entity.type': 'replicaset',
      'kubernetes.replicaset.name': name,
      'kubernetes.namespace': clusterName,
      'entity.id': entityId,
      ...others,
    });
  }

  return new K8sEntity(schema, {
    'entity.definition_id': 'replica_set',
    'entity.type': 'replicaset',
    'k8s.replicaset.name': name,
    'k8s.replicaset.uid': uid,
    'k8s.cluster.name': clusterName,
    'entity.id': entityId,
    ...others,
  });
}
