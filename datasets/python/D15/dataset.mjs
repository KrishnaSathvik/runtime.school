/**
 * D15 NASA Exoplanet Archive: every confirmed exoplanet in the Planetary Systems Composite Parameters table
 * (pscomppars), recorded via the archive's TAP service (acquire.mjs → extract/planets.json.gz; source.json).
 * One row per planet, in the archive's own column names, with its host star's parameters repeated on every planet
 * row, exactly as the archive publishes them. Missing measurements are real gaps.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonGz } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const col = (name, type, description, nullable = true) => ({ name, type, description, nullable });

const COLUMNS = [
  col('pl_name', 'text', 'Planet name', false), col('hostname', 'text', 'Host star name', false),
  col('sy_snum', 'integer', 'Number of stars in the system'), col('sy_pnum', 'integer', 'Number of known planets in the system'),
  col('discoverymethod', 'text', 'How the planet was found (Transit, Radial Velocity, …)', false), col('disc_year', 'integer', 'Year of discovery'),
  col('disc_facility', 'text', 'Observatory or mission that found it'), col('disc_telescope', 'text', 'Telescope used'),
  col('pl_orbper', 'decimal', 'Orbital period, days'), col('pl_orbsmax', 'decimal', 'Average distance from its star, astronomical units (Earth = 1)'),
  col('pl_rade', 'decimal', 'Planet radius, Earth radii'), col('pl_radj', 'decimal', 'Planet radius, Jupiter radii'),
  col('pl_bmasse', 'decimal', 'Planet mass (or minimum mass), Earth masses'), col('pl_bmassj', 'decimal', 'Planet mass (or minimum mass), Jupiter masses'),
  col('pl_orbeccen', 'decimal', 'Orbital eccentricity (0 = circular)'), col('pl_insol', 'decimal', 'Light received, relative to Earth (Earth = 1)'),
  col('pl_eqt', 'decimal', 'Estimated temperature, kelvin'), col('st_spectype', 'text', 'Host star spectral type'),
  col('st_teff', 'decimal', 'Host star temperature, kelvin'), col('st_rad', 'decimal', 'Host star radius, solar radii'),
  col('st_mass', 'decimal', 'Host star mass, solar masses'), col('st_met', 'decimal', 'Host star metallicity, dex'),
  col('st_age', 'decimal', 'Host star age, billions of years'), col('st_lum', 'decimal', 'Host star luminosity, log10 of the Sun’s'),
  col('ra', 'decimal', 'Right ascension, degrees'), col('dec', 'decimal', 'Declination, degrees'),
  col('sy_dist', 'decimal', 'Distance from Earth, parsecs'), col('sy_vmag', 'decimal', 'Brightness of the system in V band (magnitude; smaller is brighter)'),
];

function generate() {
  const rows = readJsonGz(path.join(dir, 'extract/planets.json.gz'));
  return { planets: rows.map(r => Object.fromEntries(COLUMNS.map(c => [c.name, r[c.name] ?? null]))) };
}

const EDITIONS = { preview: { limit: 25 }, starter: { year: 2024 }, standard: {} };

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  let planets = full.planets;
  if (e.year) planets = planets.filter(p => p.disc_year === e.year);
  if (e.limit) planets = planets.slice(0, e.limit);
  return { planets };
}

function realIssues({ planets }) {
  const first = new Map();
  let inconsistent = 0;
  for (const p of planets) {
    const k = p.hostname;
    if (!first.has(k)) first.set(k, p);
    else if (first.get(k).st_teff !== p.st_teff || first.get(k).st_rad !== p.st_rad) inconsistent++;
  }
  return [
    { id: 'missing_mass', description: 'Planets with no mass estimate', count: planets.filter(p => p.pl_bmasse === null).length },
    { id: 'missing_radius', description: 'Planets with no radius estimate', count: planets.filter(p => p.pl_rade === null).length },
    { id: 'missing_age', description: 'Planets whose host star has no age', count: planets.filter(p => p.st_age === null).length },
    { id: 'host_inconsistent', description: 'Planet rows whose host-star values differ from another planet of the same star', count: inconsistent },
  ];
}

const dataset = {
  id: 'D15',
  title: 'NASA Exoplanet Archive',
  version: 1,
  seed: null,
  description:
    'Every confirmed planet outside the solar system, from NASA’s Exoplanet Archive: how and when it was found, its ' +
    'orbit, size, mass and temperature, and its host star. Many measurements are missing, because they haven’t been made.',
  licence: { name: 'NASA data, no copyright restrictions; acknowledgement requested', status: 'cleared' },
  attribution: 'This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program.',
  source: 'NASA Exoplanet Archive TAP service, table pscomppars (datasets/python/D15/source.json)',
  generator: 'datasets/python/D15/dataset.mjs from datasets/python/D15/extract',
  window: ['1992-01-01', '2026-10-17'],
  tables: { planets: { description: 'One confirmed exoplanet, with facts about the star it orbits.', primaryKey: ['pl_name'], columns: COLUMNS } },
  editions: Object.fromEntries(Object.keys(EDITIONS).map(k => [k, k])),
  parquet: { tables: ['planets'], editions: ['standard'] },
  stress: false,
  generate,
  cutEdition,
  realIssues,
};

export default dataset;
