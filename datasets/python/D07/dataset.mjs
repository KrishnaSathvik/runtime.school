/**
 * D07 NOAA daily weather (GHCN-Daily via the NCEI access API), real observations 2022–2024, U.S. government
 * work (public domain). Python reuses the pinned extract the SQL weather dataset already commits
 * (datasets/weather/extract, provenance in datasets/weather/source.json): nothing is re-downloaded, and
 * nothing is injected. Gaps are real: a station that didn't report a measurement leaves it empty.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readExtract } from '../../lib/extract.mjs';
import { hash32 } from '../../lib/rng.mjs';

const EXTRACT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../weather/extract');
const col = (name, type, description, nullable = false) => ({ name, type, description, nullable });

function generate() {
  const read = (name, numeric) => {
    const { columns, rows } = readExtract(path.join(EXTRACT, `${name}.tsv.gz`), numeric);
    return rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
  };
  const cities = read('cities', ['city_id', 'latitude', 'longitude', 'land_area_sq_mi']);
  const stations = read('stations', ['city_id', 'is_primary', 'latitude', 'longitude', 'elevation_m']);
  const daily_weather = read('daily_weather', ['tmax_c', 'tmin_c', 'precipitation_mm', 'precip_trace', 'snowfall_mm', 'snow_depth_mm', 'avg_wind_speed_ms', 'peak_gust_ms']);
  return { cities, stations, daily_weather };
}

/** Editions by station and date window; whole station histories within the window, so nothing dangles. */
const EDITIONS = {
  preview: { stations: 1, from: '2024-01-01', to: '2024-01-15' },
  starter: { stations: 3, from: '2024-01-01', to: '2024-04-30' },
  standard: { stations: 20, from: '2024-01-01', to: '2024-12-31' },
  full: { stations: Infinity, from: '0000', to: '9999' },
};

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  // Primary stations with the most reported days in the window, in a stable hashed order among equals.
  const inWindow = full.daily_weather.filter(d => d.observation_date >= e.from && d.observation_date <= e.to);
  const days = new Map();
  for (const d of inWindow) days.set(d.station_id, (days.get(d.station_id) ?? 0) + 1);
  const pick = full.stations
    .filter(s => e.stations === Infinity || (s.is_primary === 1 && (days.get(s.station_id) ?? 0) > 0))
    .sort((a, b) => (days.get(b.station_id) ?? 0) - (days.get(a.station_id) ?? 0) || hash32(`${edition}|${a.station_id}`) - hash32(`${edition}|${b.station_id}`))
    .slice(0, e.stations === Infinity ? undefined : e.stations);
  const ids = new Set(pick.map(s => s.station_id));
  const cityIds = new Set(pick.map(s => s.city_id));
  return {
    cities: full.cities.filter(c => cityIds.has(c.city_id)),
    stations: full.stations.filter(s => ids.has(s.station_id)),
    daily_weather: inWindow.filter(d => ids.has(d.station_id)),
  };
}

const dataset = {
  id: 'D07',
  title: 'NOAA Daily Weather',
  version: 1,
  seed: null,
  description:
    'Real daily weather observations from 100 U.S. airport weather stations, 2022–2024: temperatures, precipitation, ' +
    'snow and wind, from NOAA’s Global Historical Climatology Network (GHCN-Daily). Gaps are real: when a station ' +
    'didn’t report a measurement, it’s empty.',
  licence: { name: 'U.S. government work (public domain); credit NOAA NCEI', status: 'cleared' },
  source: 'NOAA NCEI GHCN-Daily, daily-summaries via https://www.ncei.noaa.gov/access/services/data/v1, retrieved 2026-10-15 (datasets/weather/source.json)',
  generator: 'datasets/python/D07/dataset.mjs from datasets/weather/extract',
  window: ['2022-01-01', '2024-12-31'],
  tables: {
    cities: {
      description: 'A city with weather coverage.',
      primaryKey: ['city_id'],
      columns: [col('city_id', 'integer', 'City ID'), col('city_name', 'text', 'City name'), col('state_code', 'text', 'Two-letter state'), col('latitude', 'decimal', 'Latitude'), col('longitude', 'decimal', 'Longitude'), col('land_area_sq_mi', 'decimal', 'Land area, square miles')],
    },
    stations: {
      description: 'A weather station, usually at an airport. A city can have more than one.',
      primaryKey: ['station_id'],
      foreignKeys: [{ column: 'city_id', references: 'cities.city_id' }],
      columns: [
        col('station_id', 'text', 'Weather station ID'), col('station_name', 'text', 'Station name'), col('city_id', 'integer', 'City the station represents'),
        col('is_primary', 'integer', '1 for the station nearest the city centre'), col('latitude', 'decimal', 'Latitude'), col('longitude', 'decimal', 'Longitude'), col('elevation_m', 'decimal', 'Elevation, metres'),
      ],
    },
    daily_weather: {
      description: 'One day at one station. A day the station didn’t report has no row.',
      primaryKey: ['station_id', 'observation_date'],
      foreignKeys: [{ column: 'station_id', references: 'stations.station_id' }],
      columns: [
        col('station_id', 'text', 'Station'), col('observation_date', 'date', 'Local observation date'),
        col('tmax_c', 'decimal', 'Maximum temperature, °C', true), col('tmin_c', 'decimal', 'Minimum temperature, °C', true),
        col('precipitation_mm', 'decimal', 'Precipitation, mm (0 with precip_trace = 1 means a trace)', true), col('precip_trace', 'integer', '1 when precipitation was too small to measure'),
        col('snowfall_mm', 'decimal', 'Snowfall, mm; often not reported', true), col('snow_depth_mm', 'decimal', 'Snow depth, mm; often not reported', true),
        col('avg_wind_speed_ms', 'decimal', 'Average wind speed, m/s', true), col('peak_gust_ms', 'decimal', 'Fastest 2-minute wind, m/s', true),
      ],
    },
  },
  parquet: { tables: ['daily_weather'] },
  editions: Object.fromEntries(Object.keys(EDITIONS).map(k => [k, k])),
  stress: false,
  generate,
  cutEdition,
};

export default dataset;
