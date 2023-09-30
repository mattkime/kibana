/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Management', () => {
    loadTestFile(require.resolve('./ingest_pipelines'));
    loadTestFile(require.resolve('./rollups'));
    loadTestFile(require.resolve('./scripted_fields'));
    loadTestFile(require.resolve('./spaces'));
  });
}
