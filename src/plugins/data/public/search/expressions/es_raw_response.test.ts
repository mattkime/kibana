/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EsRawResponse, esRawResponse } from './es_raw_response';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

describe('esRawResponse', () => {
  describe('converts aggregations to table', () => {
    test('simple aggregation response', () => {
      const response: EsRawResponse = {
        type: 'es_raw_response',
        body: {
          took: 7,
          timed_out: false,
          _shards: {
            total: 7,
            successful: 7,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 1977,
            max_score: 0,
            hits: [],
          },
          aggregations: {
            '2': {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'FEMALE',
                  doc_count: 1033,
                },
                {
                  key: 'MALE',
                  doc_count: 944,
                },
              ],
            },
          },
        },
      };
      const result = esRawResponse.to!.datatable(response, {});
      expect(result).toMatchSnapshot();
    });
  });

  describe('converts raw docs to table', () => {
    test('simple docs response', () => {
      const response: EsRawResponse = {
        type: 'es_raw_response',
        body: {
          took: 5,
          timed_out: false,
          _shards: {
            total: 7,
            successful: 7,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 1977,
            max_score: 0,
            hits: [
              {
                _index: 'kibana_sample_data_ecommerce',
                _id: 'AncqUnMBMY_orZma2mZy',
                _type: 'document',
                _score: 0,
                _source: {
                  category: ["Men's Clothing"],
                  currency: 'EUR',
                  customer_first_name: 'Oliver',
                  customer_full_name: 'Oliver Rios',
                  customer_gender: 'MALE',
                  customer_id: 7,
                  customer_last_name: 'Rios',
                  customer_phone: '',
                  day_of_week: 'Monday',
                  day_of_week_i: 0,
                  email: 'oliver@rios-family.zzz',
                  manufacturer: ['Low Tide Media', 'Elitelligence'],
                  order_date: '2020-07-13T09:27:22+00:00',
                  order_id: 565855,
                  products: [
                    {
                      base_price: 20.99,
                      discount_percentage: 0,
                      quantity: 1,
                      manufacturer: 'Low Tide Media',
                      tax_amount: 0,
                      product_id: 19919,
                      category: "Men's Clothing",
                      sku: 'ZO0417504175',
                      taxless_price: 20.99,
                      unit_discount_amount: 0,
                      min_price: 9.87,
                      _id: 'sold_product_565855_19919',
                      discount_amount: 0,
                      created_on: '2016-12-12T09:27:22+00:00',
                      product_name: 'Shirt - dark blue white',
                      price: 20.99,
                      taxful_price: 20.99,
                      base_unit_price: 20.99,
                    },
                    {
                      base_price: 24.99,
                      discount_percentage: 0,
                      quantity: 1,
                      manufacturer: 'Elitelligence',
                      tax_amount: 0,
                      product_id: 24502,
                      category: "Men's Clothing",
                      sku: 'ZO0535205352',
                      taxless_price: 24.99,
                      unit_discount_amount: 0,
                      min_price: 12.49,
                      _id: 'sold_product_565855_24502',
                      discount_amount: 0,
                      created_on: '2016-12-12T09:27:22+00:00',
                      product_name: 'Slim fit jeans - raw blue',
                      price: 24.99,
                      taxful_price: 24.99,
                      base_unit_price: 24.99,
                    },
                  ],
                  sku: ['ZO0417504175', 'ZO0535205352'],
                  taxful_total_price: 45.98,
                  taxless_total_price: 45.98,
                  total_quantity: 2,
                  total_unique_products: 2,
                  type: 'order',
                  user: 'oliver',
                  geoip: {
                    country_iso_code: 'GB',
                    location: {
                      lon: -0.1,
                      lat: 51.5,
                    },
                    continent_name: 'Europe',
                  },
                  event: {
                    dataset: 'sample_ecommerce',
                  },
                },
                fields: {
                  order_date: ['2020-07-13T09:27:22.000Z'],
                  'products.created_on': ['2016-12-12T09:27:22.000Z', '2016-12-12T09:27:22.000Z'],
                },
              },
              {
                _index: 'kibana_sample_data_ecommerce',
                _id: 'I3cqUnMBMY_orZma2mZy',
                _type: 'document',
                _score: 0,
                _source: {
                  category: ["Men's Clothing"],
                  currency: 'EUR',
                  customer_first_name: 'Boris',
                  customer_full_name: 'Boris Bradley',
                  customer_gender: 'MALE',
                  customer_id: 36,
                  customer_last_name: 'Bradley',
                  customer_phone: '',
                  day_of_week: 'Wednesday',
                  day_of_week_i: 2,
                  email: 'boris@bradley-family.zzz',
                  manufacturer: ['Microlutions', 'Elitelligence'],
                  order_date: '2020-07-15T08:12:29+00:00',
                  order_id: 568397,
                  products: [
                    {
                      base_price: 32.99,
                      discount_percentage: 0,
                      quantity: 1,
                      manufacturer: 'Microlutions',
                      tax_amount: 0,
                      product_id: 24419,
                      category: "Men's Clothing",
                      sku: 'ZO0112101121',
                      taxless_price: 32.99,
                      unit_discount_amount: 0,
                      min_price: 17.48,
                      _id: 'sold_product_568397_24419',
                      discount_amount: 0,
                      created_on: '2016-12-14T08:12:29+00:00',
                      product_name: 'Cargo trousers - oliv',
                      price: 32.99,
                      taxful_price: 32.99,
                      base_unit_price: 32.99,
                    },
                    {
                      base_price: 28.99,
                      discount_percentage: 0,
                      quantity: 1,
                      manufacturer: 'Elitelligence',
                      tax_amount: 0,
                      product_id: 20207,
                      category: "Men's Clothing",
                      sku: 'ZO0530405304',
                      taxless_price: 28.99,
                      unit_discount_amount: 0,
                      min_price: 13.92,
                      _id: 'sold_product_568397_20207',
                      discount_amount: 0,
                      created_on: '2016-12-14T08:12:29+00:00',
                      product_name: 'Trousers - black',
                      price: 28.99,
                      taxful_price: 28.99,
                      base_unit_price: 28.99,
                    },
                  ],
                  sku: ['ZO0112101121', 'ZO0530405304'],
                  taxful_total_price: 61.98,
                  taxless_total_price: 61.98,
                  total_quantity: 2,
                  total_unique_products: 2,
                  type: 'order',
                  user: 'boris',
                  geoip: {
                    country_iso_code: 'GB',
                    location: {
                      lon: -0.1,
                      lat: 51.5,
                    },
                    continent_name: 'Europe',
                  },
                  event: {
                    dataset: 'sample_ecommerce',
                  },
                },
                fields: {
                  order_date: ['2020-07-15T08:12:29.000Z'],
                  'products.created_on': ['2016-12-14T08:12:29.000Z', '2016-12-14T08:12:29.000Z'],
                },
              },
              {
                _index: 'kibana_sample_data_ecommerce',
                _id: 'JHcqUnMBMY_orZma2mZy',
                _score: 0,
                _type: 'document',
                _source: {
                  category: ["Men's Clothing"],
                  currency: 'EUR',
                  customer_first_name: 'Oliver',
                  customer_full_name: 'Oliver Hubbard',
                  customer_gender: 'MALE',
                  customer_id: 7,
                  customer_last_name: 'Hubbard',
                  customer_phone: '',
                  day_of_week: 'Wednesday',
                  day_of_week_i: 2,
                  email: 'oliver@hubbard-family.zzz',
                  manufacturer: ['Spritechnologies', 'Microlutions'],
                  order_date: '2020-07-15T01:26:24+00:00',
                  order_id: 568044,
                  products: [
                    {
                      base_price: 14.99,
                      discount_percentage: 0,
                      quantity: 1,
                      manufacturer: 'Spritechnologies',
                      tax_amount: 0,
                      product_id: 12799,
                      category: "Men's Clothing",
                      sku: 'ZO0630406304',
                      taxless_price: 14.99,
                      unit_discount_amount: 0,
                      min_price: 6.9,
                      _id: 'sold_product_568044_12799',
                      discount_amount: 0,
                      created_on: '2016-12-14T01:26:24+00:00',
                      product_name: 'Undershirt - dark grey multicolor',
                      price: 14.99,
                      taxful_price: 14.99,
                      base_unit_price: 14.99,
                    },
                    {
                      base_price: 16.99,
                      discount_percentage: 0,
                      quantity: 1,
                      manufacturer: 'Microlutions',
                      tax_amount: 0,
                      product_id: 18008,
                      category: "Men's Clothing",
                      sku: 'ZO0120201202',
                      taxless_price: 16.99,
                      unit_discount_amount: 0,
                      min_price: 8.83,
                      _id: 'sold_product_568044_18008',
                      discount_amount: 0,
                      created_on: '2016-12-14T01:26:24+00:00',
                      product_name: 'Long sleeved top - purple',
                      price: 16.99,
                      taxful_price: 16.99,
                      base_unit_price: 16.99,
                    },
                  ],
                  sku: ['ZO0630406304', 'ZO0120201202'],
                  taxful_total_price: 31.98,
                  taxless_total_price: 31.98,
                  total_quantity: 2,
                  total_unique_products: 2,
                  type: 'order',
                  user: 'oliver',
                  geoip: {
                    country_iso_code: 'GB',
                    location: {
                      lon: -0.1,
                      lat: 51.5,
                    },
                    continent_name: 'Europe',
                  },
                  event: {
                    dataset: 'sample_ecommerce',
                  },
                },
                fields: {
                  order_date: ['2020-07-15T01:26:24.000Z'],
                  'products.created_on': ['2016-12-14T01:26:24.000Z', '2016-12-14T01:26:24.000Z'],
                },
              },
              {
                _index: 'kibana_sample_data_ecommerce',
                _id: 'LHcqUnMBMY_orZma2mZy',
                _score: 0,
                _type: 'document',
                _source: {
                  category: ["Women's Shoes", "Women's Clothing"],
                  currency: 'EUR',
                  customer_first_name: 'Wilhemina St.',
                  customer_full_name: 'Wilhemina St. Parker',
                  customer_gender: 'FEMALE',
                  customer_id: 17,
                  customer_last_name: 'Parker',
                  customer_phone: '',
                  day_of_week: 'Friday',
                  day_of_week_i: 4,
                  email: 'wilhemina st.@parker-family.zzz',
                  manufacturer: ['Low Tide Media', 'Tigress Enterprises'],
                  order_date: '2020-07-10T19:55:12+00:00',
                  order_id: 562351,
                  products: [
                    {
                      base_price: 49.99,
                      discount_percentage: 0,
                      quantity: 1,
                      manufacturer: 'Low Tide Media',
                      tax_amount: 0,
                      product_id: 18495,
                      category: "Women's Shoes",
                      sku: 'ZO0376403764',
                      taxless_price: 49.99,
                      unit_discount_amount: 0,
                      min_price: 25,
                      _id: 'sold_product_562351_18495',
                      discount_amount: 0,
                      created_on: '2016-12-09T19:55:12+00:00',
                      product_name: 'Ankle boots - cognac',
                      price: 49.99,
                      taxful_price: 49.99,
                      base_unit_price: 49.99,
                    },
                    {
                      base_price: 28.99,
                      discount_percentage: 0,
                      quantity: 1,
                      manufacturer: 'Tigress Enterprises',
                      tax_amount: 0,
                      product_id: 22598,
                      category: "Women's Clothing",
                      sku: 'ZO0050800508',
                      taxless_price: 28.99,
                      unit_discount_amount: 0,
                      min_price: 14.78,
                      _id: 'sold_product_562351_22598',
                      discount_amount: 0,
                      created_on: '2016-12-09T19:55:12+00:00',
                      product_name: 'Shift dress - black',
                      price: 28.99,
                      taxful_price: 28.99,
                      base_unit_price: 28.99,
                    },
                  ],
                  sku: ['ZO0376403764', 'ZO0050800508'],
                  taxful_total_price: 78.98,
                  taxless_total_price: 78.98,
                  total_quantity: 2,
                  total_unique_products: 2,
                  type: 'order',
                  user: 'wilhemina',
                  geoip: {
                    country_iso_code: 'MC',
                    location: {
                      lon: 7.4,
                      lat: 43.7,
                    },
                    continent_name: 'Europe',
                    city_name: 'Monte Carlo',
                  },
                  event: {
                    dataset: 'sample_ecommerce',
                  },
                },
                fields: {
                  order_date: ['2020-07-10T19:55:12.000Z'],
                  'products.created_on': ['2016-12-09T19:55:12.000Z', '2016-12-09T19:55:12.000Z'],
                },
              },
            ],
          },
        },
      };
      const result = esRawResponse.to!.datatable(response, {});
      expect(result).toMatchSnapshot();
    });
  });

  test('returns aggs if both docs and aggs are present on response', () => {
    const response: EsRawResponse = {
      type: 'es_raw_response',
      body: {
        took: 5,
        timed_out: false,
        _shards: {
          total: 7,
          successful: 7,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 1977,
          max_score: 0,
          hits: [
            {
              _index: 'kibana_sample_data_ecommerce',
              _id: 'AncqUnMBMY_orZma2mZy',
              _type: 'document',
              _score: 0,
              _source: {
                category: ["Men's Clothing"],
                currency: 'EUR',
                customer_first_name: 'Oliver',
                customer_full_name: 'Oliver Rios',
                customer_gender: 'MALE',
                customer_id: 7,
                customer_last_name: 'Rios',
                customer_phone: '',
                day_of_week: 'Monday',
                day_of_week_i: 0,
                email: 'oliver@rios-family.zzz',
                manufacturer: ['Low Tide Media', 'Elitelligence'],
                order_date: '2020-07-13T09:27:22+00:00',
                order_id: 565855,
                products: [
                  {
                    base_price: 20.99,
                    discount_percentage: 0,
                    quantity: 1,
                    manufacturer: 'Low Tide Media',
                    tax_amount: 0,
                    product_id: 19919,
                    category: "Men's Clothing",
                    sku: 'ZO0417504175',
                    taxless_price: 20.99,
                    unit_discount_amount: 0,
                    min_price: 9.87,
                    _id: 'sold_product_565855_19919',
                    discount_amount: 0,
                    created_on: '2016-12-12T09:27:22+00:00',
                    product_name: 'Shirt - dark blue white',
                    price: 20.99,
                    taxful_price: 20.99,
                    base_unit_price: 20.99,
                  },
                  {
                    base_price: 24.99,
                    discount_percentage: 0,
                    quantity: 1,
                    manufacturer: 'Elitelligence',
                    tax_amount: 0,
                    product_id: 24502,
                    category: "Men's Clothing",
                    sku: 'ZO0535205352',
                    taxless_price: 24.99,
                    unit_discount_amount: 0,
                    min_price: 12.49,
                    _id: 'sold_product_565855_24502',
                    discount_amount: 0,
                    created_on: '2016-12-12T09:27:22+00:00',
                    product_name: 'Slim fit jeans - raw blue',
                    price: 24.99,
                    taxful_price: 24.99,
                    base_unit_price: 24.99,
                  },
                ],
                sku: ['ZO0417504175', 'ZO0535205352'],
                taxful_total_price: 45.98,
                taxless_total_price: 45.98,
                total_quantity: 2,
                total_unique_products: 2,
                type: 'order',
                user: 'oliver',
                geoip: {
                  country_iso_code: 'GB',
                  location: {
                    lon: -0.1,
                    lat: 51.5,
                  },
                  continent_name: 'Europe',
                },
                event: {
                  dataset: 'sample_ecommerce',
                },
              },
              fields: {
                order_date: ['2020-07-13T09:27:22.000Z'],
                'products.created_on': ['2016-12-12T09:27:22.000Z', '2016-12-12T09:27:22.000Z'],
              },
            },
            {
              _index: 'kibana_sample_data_ecommerce',
              _id: 'I3cqUnMBMY_orZma2mZy',
              _type: 'document',
              _score: 0,
              _source: {
                category: ["Men's Clothing"],
                currency: 'EUR',
                customer_first_name: 'Boris',
                customer_full_name: 'Boris Bradley',
                customer_gender: 'MALE',
                customer_id: 36,
                customer_last_name: 'Bradley',
                customer_phone: '',
                day_of_week: 'Wednesday',
                day_of_week_i: 2,
                email: 'boris@bradley-family.zzz',
                manufacturer: ['Microlutions', 'Elitelligence'],
                order_date: '2020-07-15T08:12:29+00:00',
                order_id: 568397,
                products: [
                  {
                    base_price: 32.99,
                    discount_percentage: 0,
                    quantity: 1,
                    manufacturer: 'Microlutions',
                    tax_amount: 0,
                    product_id: 24419,
                    category: "Men's Clothing",
                    sku: 'ZO0112101121',
                    taxless_price: 32.99,
                    unit_discount_amount: 0,
                    min_price: 17.48,
                    _id: 'sold_product_568397_24419',
                    discount_amount: 0,
                    created_on: '2016-12-14T08:12:29+00:00',
                    product_name: 'Cargo trousers - oliv',
                    price: 32.99,
                    taxful_price: 32.99,
                    base_unit_price: 32.99,
                  },
                  {
                    base_price: 28.99,
                    discount_percentage: 0,
                    quantity: 1,
                    manufacturer: 'Elitelligence',
                    tax_amount: 0,
                    product_id: 20207,
                    category: "Men's Clothing",
                    sku: 'ZO0530405304',
                    taxless_price: 28.99,
                    unit_discount_amount: 0,
                    min_price: 13.92,
                    _id: 'sold_product_568397_20207',
                    discount_amount: 0,
                    created_on: '2016-12-14T08:12:29+00:00',
                    product_name: 'Trousers - black',
                    price: 28.99,
                    taxful_price: 28.99,
                    base_unit_price: 28.99,
                  },
                ],
                sku: ['ZO0112101121', 'ZO0530405304'],
                taxful_total_price: 61.98,
                taxless_total_price: 61.98,
                total_quantity: 2,
                total_unique_products: 2,
                type: 'order',
                user: 'boris',
                geoip: {
                  country_iso_code: 'GB',
                  location: {
                    lon: -0.1,
                    lat: 51.5,
                  },
                  continent_name: 'Europe',
                },
                event: {
                  dataset: 'sample_ecommerce',
                },
              },
              fields: {
                order_date: ['2020-07-15T08:12:29.000Z'],
                'products.created_on': ['2016-12-14T08:12:29.000Z', '2016-12-14T08:12:29.000Z'],
              },
            },
            {
              _index: 'kibana_sample_data_ecommerce',
              _id: 'JHcqUnMBMY_orZma2mZy',
              _score: 0,
              _type: 'document',
              _source: {
                category: ["Men's Clothing"],
                currency: 'EUR',
                customer_first_name: 'Oliver',
                customer_full_name: 'Oliver Hubbard',
                customer_gender: 'MALE',
                customer_id: 7,
                customer_last_name: 'Hubbard',
                customer_phone: '',
                day_of_week: 'Wednesday',
                day_of_week_i: 2,
                email: 'oliver@hubbard-family.zzz',
                manufacturer: ['Spritechnologies', 'Microlutions'],
                order_date: '2020-07-15T01:26:24+00:00',
                order_id: 568044,
                products: [
                  {
                    base_price: 14.99,
                    discount_percentage: 0,
                    quantity: 1,
                    manufacturer: 'Spritechnologies',
                    tax_amount: 0,
                    product_id: 12799,
                    category: "Men's Clothing",
                    sku: 'ZO0630406304',
                    taxless_price: 14.99,
                    unit_discount_amount: 0,
                    min_price: 6.9,
                    _id: 'sold_product_568044_12799',
                    discount_amount: 0,
                    created_on: '2016-12-14T01:26:24+00:00',
                    product_name: 'Undershirt - dark grey multicolor',
                    price: 14.99,
                    taxful_price: 14.99,
                    base_unit_price: 14.99,
                  },
                  {
                    base_price: 16.99,
                    discount_percentage: 0,
                    quantity: 1,
                    manufacturer: 'Microlutions',
                    tax_amount: 0,
                    product_id: 18008,
                    category: "Men's Clothing",
                    sku: 'ZO0120201202',
                    taxless_price: 16.99,
                    unit_discount_amount: 0,
                    min_price: 8.83,
                    _id: 'sold_product_568044_18008',
                    discount_amount: 0,
                    created_on: '2016-12-14T01:26:24+00:00',
                    product_name: 'Long sleeved top - purple',
                    price: 16.99,
                    taxful_price: 16.99,
                    base_unit_price: 16.99,
                  },
                ],
                sku: ['ZO0630406304', 'ZO0120201202'],
                taxful_total_price: 31.98,
                taxless_total_price: 31.98,
                total_quantity: 2,
                total_unique_products: 2,
                type: 'order',
                user: 'oliver',
                geoip: {
                  country_iso_code: 'GB',
                  location: {
                    lon: -0.1,
                    lat: 51.5,
                  },
                  continent_name: 'Europe',
                },
                event: {
                  dataset: 'sample_ecommerce',
                },
              },
              fields: {
                order_date: ['2020-07-15T01:26:24.000Z'],
                'products.created_on': ['2016-12-14T01:26:24.000Z', '2016-12-14T01:26:24.000Z'],
              },
            },
            {
              _index: 'kibana_sample_data_ecommerce',
              _id: 'LHcqUnMBMY_orZma2mZy',
              _score: 0,
              _type: 'document',
              _source: {
                category: ["Women's Shoes", "Women's Clothing"],
                currency: 'EUR',
                customer_first_name: 'Wilhemina St.',
                customer_full_name: 'Wilhemina St. Parker',
                customer_gender: 'FEMALE',
                customer_id: 17,
                customer_last_name: 'Parker',
                customer_phone: '',
                day_of_week: 'Friday',
                day_of_week_i: 4,
                email: 'wilhemina st.@parker-family.zzz',
                manufacturer: ['Low Tide Media', 'Tigress Enterprises'],
                order_date: '2020-07-10T19:55:12+00:00',
                order_id: 562351,
                products: [
                  {
                    base_price: 49.99,
                    discount_percentage: 0,
                    quantity: 1,
                    manufacturer: 'Low Tide Media',
                    tax_amount: 0,
                    product_id: 18495,
                    category: "Women's Shoes",
                    sku: 'ZO0376403764',
                    taxless_price: 49.99,
                    unit_discount_amount: 0,
                    min_price: 25,
                    _id: 'sold_product_562351_18495',
                    discount_amount: 0,
                    created_on: '2016-12-09T19:55:12+00:00',
                    product_name: 'Ankle boots - cognac',
                    price: 49.99,
                    taxful_price: 49.99,
                    base_unit_price: 49.99,
                  },
                  {
                    base_price: 28.99,
                    discount_percentage: 0,
                    quantity: 1,
                    manufacturer: 'Tigress Enterprises',
                    tax_amount: 0,
                    product_id: 22598,
                    category: "Women's Clothing",
                    sku: 'ZO0050800508',
                    taxless_price: 28.99,
                    unit_discount_amount: 0,
                    min_price: 14.78,
                    _id: 'sold_product_562351_22598',
                    discount_amount: 0,
                    created_on: '2016-12-09T19:55:12+00:00',
                    product_name: 'Shift dress - black',
                    price: 28.99,
                    taxful_price: 28.99,
                    base_unit_price: 28.99,
                  },
                ],
                sku: ['ZO0376403764', 'ZO0050800508'],
                taxful_total_price: 78.98,
                taxless_total_price: 78.98,
                total_quantity: 2,
                total_unique_products: 2,
                type: 'order',
                user: 'wilhemina',
                geoip: {
                  country_iso_code: 'MC',
                  location: {
                    lon: 7.4,
                    lat: 43.7,
                  },
                  continent_name: 'Europe',
                  city_name: 'Monte Carlo',
                },
                event: {
                  dataset: 'sample_ecommerce',
                },
              },
              fields: {
                order_date: ['2020-07-10T19:55:12.000Z'],
                'products.created_on': ['2016-12-09T19:55:12.000Z', '2016-12-09T19:55:12.000Z'],
              },
            },
          ],
        },
        aggregations: {
          '2': {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'FEMALE',
                doc_count: 1033,
              },
              {
                key: 'MALE',
                doc_count: 944,
              },
            ],
          },
        },
      },
    };
    const result = esRawResponse.to!.datatable(response, {});
    expect(result).toMatchSnapshot();
  });
});
