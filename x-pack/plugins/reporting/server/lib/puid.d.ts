/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare module 'puid' {
  declare class Puid {
    generate(): string;
  }

  // eslint-disable-next-line import/no-default-export
  export default Puid;
}
