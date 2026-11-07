// Live data from NEA via data.gov.sg (free, no key needed for light use).
// Later, when the Express backend is ready, point fetchToday() at
// `${process.env.EXPO_PUBLIC_API_URL}/today` and keep the same return shape.

import { nearest } from './rules.js';

const BASE = 'https://api-open.data.gov.sg/v2/real-time/api';
const API_KEY = process.env.EXPO_PUBLIC_DATAGOV_API_KEY; // optional, raises the rate limit

async function getData(path) {
  const res = await fetch(BASE + path, {
    headers: API_KEY ? { 'x-api-key': API_KEY } : {},
  });
  if (!res.ok) throw new Error(`data.gov.sg ${path} returned ${res.status}`);
  const body = await res.json();
  if (body.code !== undefined && body.code !== 0) {
    throw new Error(body.errorMsg || `data.gov.sg ${path} failed`);
  }
  return body.data;
}

const loc = (m) => m.labelLocation || m.label_location || {};

// Pure parser, tested in rules.test.js with sample responses.
export function parseConditions(psiData, forecastData, here) {
  const regions = (psiData.regionMetadata || psiData.region_metadata || [])
    .filter((r) => r.name !== 'national')
    .map((r) => ({ name: r.name, ...loc(r) }));
  const region = nearest(here, regions);
  const psiItem = psiData.items[0];
  const psi24 = psiItem.readings.psi_twenty_four_hourly;
  const psi = psi24[region.name] ?? psi24.national;

  const areas = (forecastData.area_metadata || forecastData.areaMetadata || []).map((a) => ({
    name: a.name,
    ...loc(a),
  }));
  const area = nearest(here, areas);
  const fcItem = forecastData.items[0];
  const match = fcItem.forecasts.find((f) => f.area === area.name) || {};
  const forecast =
    typeof match.forecast === 'string' ? match.forecast : match.forecast?.text || 'No forecast';

  return {
    area: area.name,
    region: region.name,
    psi,
    forecast,
    updatedAt: psiItem.updatedTimestamp || psiItem.timestamp,
  };
}

export async function fetchToday(here) {
  const [psiData, forecastData] = await Promise.all([getData('/psi'), getData('/two-hr-forecast')]);
  return parseConditions(psiData, forecastData, here);
}
