/**
 * D15 NASA Exoplanet Archive: the Planetary Systems Composite Parameters table (one row per confirmed planet),
 * via the archive's TAP service. Run: node datasets/python/D15/acquire.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getText, today, writeJsonGz, writeSource } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const COLUMNS = [
  'pl_name', 'hostname', 'sy_snum', 'sy_pnum', 'discoverymethod', 'disc_year', 'disc_facility', 'disc_telescope',
  'pl_orbper', 'pl_orbsmax', 'pl_rade', 'pl_radj', 'pl_bmasse', 'pl_bmassj', 'pl_orbeccen', 'pl_insol', 'pl_eqt',
  'st_spectype', 'st_teff', 'st_rad', 'st_mass', 'st_met', 'st_age', 'st_lum', 'ra', 'dec', 'sy_dist', 'sy_vmag',
];
const query = `select ${COLUMNS.join(',')} from pscomppars order by pl_name`;
const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=json`;
const rows = JSON.parse(await getText(url));
writeJsonGz(path.join(dir, 'extract/planets.json.gz'), rows);
writeSource(dir, {
  publisher: 'NASA Exoplanet Archive (NASA Exoplanet Science Institute, Caltech/IPAC)',
  service: 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync',
  query,
  retrieved: today(),
  licence: 'NASA data, no copyright restrictions; acknowledgement requested (https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html)',
  attribution: 'This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program.',
  changes: 'Selected 28 columns of the pscomppars table. Values are unchanged.',
  rows: rows.length,
});
console.log('D15 planets', rows.length);
