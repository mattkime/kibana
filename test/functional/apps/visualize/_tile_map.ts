/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const filterBar = getService('filterBar');
  const browser = getService('browser');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'timePicker',
    'tileMap',
  ]);

  describe('tile map visualize app', function () {
    describe('incomplete config', function describeIndexTests() {
      before(async function () {
        await browser.setWindowSize(1280, 1000);

        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        log.debug('clickTileMap');
        await PageObjects.visualize.clickTileMap();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        // do not configure aggs
      });

      it('should be able to zoom in twice', async () => {
        // should not throw
        await PageObjects.tileMap.clickMapZoomIn();
        await PageObjects.tileMap.clickMapZoomIn();
      });
    });

    describe('complete config', function describeIndexTests() {
      before(async function () {
        await browser.setWindowSize(1280, 1000);

        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        log.debug('clickTileMap');
        await PageObjects.visualize.clickTileMap();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        log.debug('select bucket Geo Coordinates');
        await PageObjects.visEditor.clickBucket('Geo coordinates');
        log.debug('Click aggregation Geohash');
        await PageObjects.visEditor.selectAggregation('Geohash');
        log.debug('Click field geo.coordinates');
        await retry.try(async function tryingForTime() {
          await PageObjects.visEditor.selectField('geo.coordinates');
        });
        await PageObjects.visEditor.clickGo();
      });

      type SampleTableData = Array<string | { lat: number; lon: number }>;

      /**
       * manually compare data due to possible small difference in numbers. This is browser dependent.
       */
      function compareTableData(actual: string[][], expected: SampleTableData[]) {
        log.debug('comparing expected: ', expected);
        log.debug('with actual: ', actual);

        const roundedValues = actual.map((row) => {
          // Parse last element in each row as JSON and floor the lat/long value
          const coords = JSON.parse(row[row.length - 1]);
          return [
            ...row.slice(0, -1),
            {
              lat: Math.floor(parseFloat(coords.lat)),
              lon: Math.floor(parseFloat(coords.lon)),
            },
          ];
        });

        expect(roundedValues).to.eql(expected);
      }

      describe('tile map chart', function indexPatternCreation() {
        it('should have inspector enabled', async function () {
          await inspector.expectIsEnabled();
        });

        it('should show correct tile map data on default zoom level', async function () {
          const expectedTableData = [
            ['-', '9', '5,787', { lat: 37, lon: -104 }],
            ['-', 'd', '5,600', { lat: 37, lon: -82 }],
            ['-', 'c', '1,319', { lat: 47, lon: -110 }],
            ['-', 'b', '999', { lat: 62, lon: -156 }],
            ['-', 'f', '187', { lat: 45, lon: -83 }],
            ['-', '8', '108', { lat: 18, lon: -157 }],
          ];
          // level 1
          await PageObjects.tileMap.clickMapZoomOut();
          // level 0
          await PageObjects.tileMap.clickMapZoomOut();

          await inspector.open();
          await inspector.setTablePageSize(50);
          const actualTableData = await inspector.getTableData();
          await inspector.close();
          compareTableData(actualTableData, expectedTableData);
        });

        it('should not be able to zoom out beyond 0', async function () {
          await PageObjects.tileMap.zoomAllTheWayOut();
          const enabled = await PageObjects.tileMap.getMapZoomOutEnabled();
          expect(enabled).to.be(false);
        });

        it('Fit data bounds should zoom to level 3', async function () {
          const expectedPrecision2DataTable = [
            ['-', 'dr4', '127', { lat: 40, lon: -76 }],
            ['-', 'dr7', '92', { lat: 41, lon: -74 }],
            ['-', '9q5', '91', { lat: 34, lon: -119 }],
            ['-', '9qc', '89', { lat: 38, lon: -122 }],
            ['-', 'drk', '87', { lat: 41, lon: -73 }],
            ['-', 'dps', '82', { lat: 42, lon: -84 }],
            ['-', 'dph', '82', { lat: 40, lon: -84 }],
            ['-', 'dp3', '79', { lat: 41, lon: -88 }],
            ['-', 'dpe', '78', { lat: 42, lon: -86 }],
            ['-', 'dp8', '77', { lat: 43, lon: -90 }],
            ['-', 'dp6', '74', { lat: 41, lon: -87 }],
            ['-', 'djv', '74', { lat: 33, lon: -83 }],
            ['-', '9qh', '74', { lat: 34, lon: -118 }],
            ['-', 'dpq', '73', { lat: 41, lon: -81 }],
            ['-', 'dpp', '73', { lat: 40, lon: -80 }],
            ['-', '9y7', '73', { lat: 35, lon: -97 }],
            ['-', '9vg', '73', { lat: 32, lon: -97 }],
            ['-', 'drs', '71', { lat: 42, lon: -73 }],
            ['-', '9ys', '71', { lat: 37, lon: -95 }],
            ['-', '9yn', '71', { lat: 34, lon: -93 }],
          ];

          await PageObjects.tileMap.clickMapFitDataBounds();
          await inspector.open();
          const data = await inspector.getTableData();
          await inspector.close();
          compareTableData(data, expectedPrecision2DataTable);
        });

        it('Fit data bounds works with pinned filter data', async () => {
          const expectedPrecision2DataTable = [
            ['-', 'f05', '1', { lat: 45, lon: -85 }],
            ['-', 'dpr', '1', { lat: 40, lon: -79 }],
            ['-', '9qh', '1', { lat: 33, lon: -118 }],
          ];

          await filterBar.addFilter('bytes', 'is between', '19980', '19990');
          await filterBar.toggleFilterPinned('bytes');
          await PageObjects.tileMap.zoomAllTheWayOut();
          await PageObjects.tileMap.clickMapFitDataBounds();

          await inspector.open();
          const data = await inspector.getTableData();
          await inspector.close();

          await filterBar.removeAllFilters();
          compareTableData(data, expectedPrecision2DataTable);
        });

        it('Newly saved visualization retains map bounds', async () => {
          const vizName1 = 'Visualization TileMap';

          await PageObjects.tileMap.clickMapZoomIn();
          await PageObjects.tileMap.clickMapZoomIn();

          const mapBounds = await PageObjects.tileMap.getMapBounds();
          await inspector.close();

          await PageObjects.visualize.saveVisualizationExpectSuccess(vizName1);

          const afterSaveMapBounds = await PageObjects.tileMap.getMapBounds();

          await inspector.close();
          // For some reason the values are slightly different, so we can't check that they are equal. But we did
          // have a bug where after the save, there were _no_ map bounds. So this checks for the later case, but
          // until we figure out how to make sure the map center is always the exact same, we can't comparison check.
          expect(mapBounds).to.not.be(undefined);
          expect(afterSaveMapBounds).to.not.be(undefined);
        });
      });

      describe('Only request data around extent of map option', () => {
        it('when checked adds filters to aggregation', async () => {
          const vizName1 = 'Visualization TileMap';
          await PageObjects.visualize.loadSavedVisualization(vizName1);
          await inspector.open();
          await inspector.expectTableHeaders(['Filter', 'Geohash', 'Count', 'Geo Centroid']);
          await inspector.close();
        });

        it('when not checked does not add filters to aggregation', async () => {
          await PageObjects.visEditor.toggleOpenEditor(2);
          await PageObjects.visEditor.setIsFilteredByCollarCheckbox(false);
          await PageObjects.visEditor.clickGo();
          await inspector.open();
          await inspector.expectTableHeaders(['Geohash', 'Count', 'Geo Centroid']);
          await inspector.close();
        });

        after(async () => {
          await PageObjects.visEditor.setIsFilteredByCollarCheckbox(true);
          await PageObjects.visEditor.clickGo();
        });
      });
    });
  });
}
