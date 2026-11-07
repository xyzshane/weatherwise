// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, psiBand, rank, isWet } from './rules.js';
import { parseConditions } from './api.js';
import { PLACES } from '../data/places.js';

const TAMPINES = { latitude: 1.3496, longitude: 103.9568 };

// Trimmed to the shape of data.gov.sg's v2 responses.
const psiSample = {
  regionMetadata: [
    { name: 'west', labelLocation: { latitude: 1.35735, longitude: 103.7 } },
    { name: 'national', labelLocation: { latitude: 0, longitude: 0 } },
    { name: 'east', labelLocation: { latitude: 1.35735, longitude: 103.94 } },
    { name: 'central', labelLocation: { latitude: 1.35735, longitude: 103.82 } },
    { name: 'south', labelLocation: { latitude: 1.29587, longitude: 103.82 } },
    { name: 'north', labelLocation: { latitude: 1.41803, longitude: 103.82 } },
  ],
  items: [
    {
      date: '2026-11-07',
      updatedTimestamp: '2026-11-07T15:00:00+08:00',
      timestamp: '2026-11-07T15:00:00+08:00',
      readings: {
        psi_twenty_four_hourly: { west: 60, east: 128, central: 70, south: 55, north: 64, national: 128 },
      },
    },
  ],
};

const forecastSample = {
  area_metadata: [
    { name: 'Tampines', label_location: { latitude: 1.345, longitude: 103.944 } },
    { name: 'City', label_location: { latitude: 1.292, longitude: 103.844 } },
  ],
  items: [
    {
      update_timestamp: '2026-11-07T15:05:00+08:00',
      timestamp: '2026-11-07T15:00:00+08:00',
      forecasts: [
        { area: 'Tampines', forecast: 'Partly Cloudy (Day)' },
        { area: 'City', forecast: 'Thundery Showers' },
      ],
    },
  ],
};

test('parses the nearest region and area', () => {
  const c = parseConditions(psiSample, forecastSample, TAMPINES);
  assert.equal(c.region, 'east');
  assert.equal(c.psi, 128);
  assert.equal(c.area, 'Tampines');
  assert.equal(c.forecast, 'Partly Cloudy (Day)');
});

test('PSI bands follow NEA', () => {
  assert.equal(psiBand(50), 'Good');
  assert.equal(psiBand(101), 'Unhealthy');
  assert.equal(psiBand(301), 'Hazardous');
});

test('haze sends you indoors', () => {
  const d = decide({ psi: 128, forecast: 'Partly Cloudy (Day)', area: 'Tampines' });
  assert.equal(d.mode, 'indoor');
  assert.equal(d.cause, 'haze');
  const picks = rank(PLACES, d, TAMPINES);
  assert.equal(picks.length, 3);
  assert.ok(picks.every((p) => p.setting === 'indoor'));
  assert.equal(picks[0].id, 'our-tampines-hub'); // closest indoor place
  assert.ok(picks.every((p) => p.reason));
});

test('rain sends you indoors even with clean air', () => {
  assert.ok(isWet('Thundery Showers'));
  const d = decide({ psi: 40, forecast: 'Light Rain', area: 'City' });
  assert.equal(d.mode, 'indoor');
  assert.equal(d.cause, 'rain');
});

test('clear day picks outdoor places', () => {
  const d = decide({ psi: 35, forecast: 'Fair (Day)', area: 'Tampines' });
  assert.equal(d.mode, 'outdoor');
  assert.ok(rank(PLACES, d, TAMPINES).every((p) => p.setting === 'outdoor'));
});

test('moderate air puts outdoor first', () => {
  const d = decide({ psi: 75, forecast: 'Cloudy', area: 'Tampines' });
  assert.equal(d.mode, 'either');
  assert.equal(rank(PLACES, d, TAMPINES)[0].setting, 'outdoor');
});
