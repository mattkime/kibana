/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { xpackInfoService } from 'plugins/xpack_main/services/xpack_info';
import { LogstashSecurityService } from './logstash_security_service';

uiModules.get('xpack/logstash')
  .factory('logstashSecurityService', $injector => {
    return new LogstashSecurityService(xpackInfoService($injector));
  });
