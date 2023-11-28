/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../../../lists_and_exception_lists/utils';
import {
  createRule,
  createRuleWithExceptionEntries,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  getAlertsById,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
} from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @ess Rule exception operators for data type float', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/float');
      await esArchiver.load('x-pack/test/functional/es_archives/rule_exceptions/float_as_string');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/float');
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_exceptions/float_as_string');
    });

    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
      await createListsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
    });

    describe('"is" operator', () => {
      it('should find all the float from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
      });

      it('should filter 1 single float if it is set as an exception', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.1', '1.2', '1.3']);
      });

      it('should filter 2 float if both are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.1',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.2', '1.3']);
      });

      it('should filter 3 float if all 3 are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.1',
            },
          ],
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.2',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.3']);
      });

      it('should filter 4 float if all are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.0',
            },
          ],
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.1',
            },
          ],
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.2',
            },
          ],
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match',
              value: '1.3',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'excluded',
              type: 'match',
              value: '500.0', // this value is not in the data set
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'excluded',
              type: 'match',
              value: '1.0',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.0']);
      });

      it('will return 0 results if we exclude two float', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'excluded',
              type: 'match',
              value: '1.0',
            },
          ],
          [
            {
              field: 'float',
              operator: 'excluded',
              type: 'match',
              value: '1.1',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single float if it is set as an exception', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match_any',
              value: ['1.0'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.1', '1.2', '1.3']);
      });

      it('should filter 2 float if both are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.2', '1.3']);
      });

      it('should filter 3 float if all 3 are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1', '1.2'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.3']);
      });

      it('should filter 4 float if all are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'match_any',
              value: ['1.0', '1.1', '1.2', '1.3'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'excluded',
              type: 'match_any',
              value: ['500', '600'], // both these values are not in the data set
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'excluded',
              type: 'match_any',
              value: ['1.0', '1.3'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.0', '1.3']);
      });
    });

    describe('"exists" operator', () => {
      it('will return 0 results if matching against float', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 4 results if matching against float', async () => {
        const rule = getRuleForAlertTesting(['float']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'float',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
        expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
      });
    });

    describe('"is in list" operator', () => {
      describe('working against float values in the data set', () => {
        it('will return 3 results if we have a list that includes 1 float', async () => {
          await importFile(supertest, log, 'float', ['1.0'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 3, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.1', '1.2', '1.3']);
        });

        it('will return 2 results if we have a list that includes 2 float', async () => {
          await importFile(supertest, log, 'float', ['1.0', '1.2'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.1', '1.3']);
        });

        it('will return 0 results if we have a list that includes all float', async () => {
          await importFile(supertest, log, 'float', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql([]);
        });
      });

      describe('working against string values in the data set', () => {
        it('will return 3 results if we have a list that includes 1 float', async () => {
          await importFile(supertest, log, 'float', ['1.0'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 3, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.1', '1.2', '1.3']);
        });

        it('will return 2 results if we have a list that includes 2 float', async () => {
          await importFile(supertest, log, 'float', ['1.0', '1.2'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.1', '1.3']);
        });

        it('will return 0 results if we have a list that includes all float', async () => {
          await importFile(supertest, log, 'float', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql([]);
        });

        it('will return 1 result if we have a list which contains the float range of 1.0-1.2', async () => {
          await importFile(supertest, log, 'float_range', ['1.0-1.2'], 'list_items.txt', [
            '1.0',
            '1.2',
          ]);
          const rule = getRuleForAlertTesting(['float_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float_range',
                },
                operator: 'included',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.3']);
        });
      });
    });

    describe('"is not in list" operator', () => {
      describe('working against float values in the data set', () => {
        it('will return 1 result if we have a list that excludes 1 float', async () => {
          await importFile(supertest, log, 'float', ['1.0'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.0']);
        });

        it('will return 2 results if we have a list that excludes 2 float', async () => {
          await importFile(supertest, log, 'float', ['1.0', '1.2'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.0', '1.2']);
        });

        it('will return 4 results if we have a list that excludes all float', async () => {
          await importFile(supertest, log, 'float', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 4, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
        });
      });

      describe('working against string values in the data set', () => {
        it('will return 1 result if we have a list that excludes 1 float', async () => {
          await importFile(supertest, log, 'float', ['1.0'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.0']);
        });

        it('will return 2 results if we have a list that excludes 2 float', async () => {
          await importFile(supertest, log, 'float', ['1.0', '1.2'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.0', '1.2']);
        });

        it('will return 4 results if we have a list that excludes all float', async () => {
          await importFile(supertest, log, 'float', ['1.0', '1.1', '1.2', '1.3'], 'list_items.txt');
          const rule = getRuleForAlertTesting(['float_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 4, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.0', '1.1', '1.2', '1.3']);
        });

        it('will return 3 results if we have a list which contains the float range of 1.0-1.2', async () => {
          await importFile(supertest, log, 'float_range', ['1.0-1.2'], 'list_items.txt', [
            '1.0',
            '1.2',
          ]);
          const rule = getRuleForAlertTesting(['float_as_string']);
          const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'float',
                list: {
                  id: 'list_items.txt',
                  type: 'float_range',
                },
                operator: 'excluded',
                type: 'list',
              },
            ],
          ]);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 3, [id]);
          const alertsOpen = await getAlertsById(supertest, log, id);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.float).sort();
          expect(hits).to.eql(['1.0', '1.1', '1.2']);
        });
      });
    });
  });
};
