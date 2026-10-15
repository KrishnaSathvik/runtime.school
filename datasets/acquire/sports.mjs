/**
 * Sports extract from Retrosheet (free reuse, including commercial, with the Retrosheet notice).
 *   node datasets/acquire/sports.mjs <downloads-dir>
 *
 * Selection: every MLB regular-season and postseason game, 2016–2025 (All-Star games excluded),
 * and every 2025 player batting line (stattype = value). Players are everyone on a 2025 roster,
 * including pitchers who never batted. Values are kept as published.
 *
 * The information used here was obtained free of charge from and is copyrighted by Retrosheet.
 * Interested parties may contact Retrosheet at "www.retrosheet.org".
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { csvRows } from './csv.mjs';
import { writeExtract } from '../lib/extract.mjs';

const FIRST_SEASON = 2016, LAST_SEASON = 2025;
const dir = process.argv[2];
if (!dir) throw new Error('Usage: node datasets/acquire/sports.mjs <downloads-dir>');
const shas = {};
const zip = name => {
  const bytes = fs.readFileSync(path.join(dir, name));
  shas[name] = createHash('sha256').update(bytes).digest('hex');
  return unzipSync(bytes);
};
function* table(text) {
  let idx = null;
  for (const row of csvRows(text)) {
    if (!idx) { idx = Object.fromEntries(row.map((h, i) => [h, i])); continue; }
    if (row.length < 2) continue;
    yield Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, row[i] ?? '']));
  }
}
const iso = d => (d && d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null);
const int = v => (v === '' || v === undefined ? null : Number(v));

const games = [];
for (const g of table(strFromU8(zip('retrosheet-gameinfo.zip')['gameinfo.csv']))) {
  const season = Number(g.season);
  if (season < FIRST_SEASON || season > LAST_SEASON || g.gametype === 'allstar') continue;
  games.push([g.gid, season, iso(g.date), Number(g.number), g.gametype, g.site, g.hometeam, g.visteam,
    int(g.hruns), int(g.vruns), int(g.innings), g.daynight || null, int(g.attendance) || null, int(g.timeofgame) || null]);
}
games.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] < b[0] ? -1 : 1));
const gameIds = new Set(games.map(g => g[0]));

const season = zip('retrosheet-2025csvs.zip');
const lines = new Map();
for (const b of table(strFromU8(season['2025batting.csv']))) {
  if (b.stattype !== 'value' || !gameIds.has(b.gid)) continue;
  const key = `${b.gid}|${b.id}`;
  const v = [b.b_pa, b.b_ab, b.b_r, b.b_h, b.b_d, b.b_t, b.b_hr, b.b_rbi, b.b_w, b.b_k, b.b_sb, b.b_hbp].map(x => Number(x || 0));
  const prev = lines.get(key);
  if (prev) prev.stats = prev.stats.map((s, i) => s + v[i]); // a player re-entering the lineup in one game
  else lines.set(key, { gid: b.gid, id: b.id, team: b.team, order: int(b.b_lp), started: Number(b.b_seq) === 1 ? 1 : 0, stats: v });
}
const batting = [...lines.values()].map(l => [l.gid, l.id, l.team, l.order, l.started, ...l.stats]);

const POSITIONS = [['g_p', 'P'], ['g_c', 'C'], ['g_1b', '1B'], ['g_2b', '2B'], ['g_3b', '3B'], ['g_ss', 'SS'], ['g_lf', 'LF'], ['g_cf', 'CF'], ['g_rf', 'RF'], ['g_dh', 'DH']];
const roster = new Map();
for (const p of table(strFromU8(season['2025allplayers.csv']))) {
  const r = roster.get(p.id) ?? { id: p.id, first: p.first, last: p.last, bats: p.bat || null, throws: p.throw || null, games: {} };
  for (const [k, pos] of POSITIONS) r.games[pos] = (r.games[pos] ?? 0) + Number(p[k] || 0);
  roster.set(p.id, r);
}
const bio = zip('retrosheet-biodata.zip');
const born = new Map();
for (const p of table(strFromU8(bio['biofile0.csv']))) born.set(p.id, { birth: iso(p.birthdate.replace(/-/g, '')), country: p.birthcountry || null, debut: iso(p.debut_p) ?? iso(p.debut_c) ?? null });
const players = [...roster.values()].sort((a, b) => (a.id < b.id ? -1 : 1)).map(r => {
  const primary = Object.entries(r.games).sort((a, b) => b[1] - a[1])[0];
  const b = born.get(r.id) ?? {};
  return [r.id, r.first, r.last, r.bats, r.throws, primary && primary[1] > 0 ? primary[0] : null, b.birth ?? null, b.country ?? null, b.debut ?? null];
});
const playerIds = new Set(players.map(p => p[0]));
const orphan = batting.filter(b => !playerIds.has(b[1]));
if (orphan.length) throw new Error(`Batting lines without roster rows: ${orphan.length}`);

const usedSites = new Set(games.map(g => g[5])), usedTeams = new Set(games.flatMap(g => [g[6], g[7]]));
const venues = [...table(strFromU8(bio['ballparks0.csv']))].filter(v => usedSites.has(v.site)).map(v => [v.site, v.name.trim(), v.city, v.state]);
const teams = [...table(strFromU8(bio['teams0.csv']))].filter(t => usedTeams.has(t.team)).map(t => [t.team, t.city, t.nickname]);

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '../sports/extract');
writeExtract(path.join(out, 'games.tsv.gz'), ['game_id', 'season', 'game_date', 'game_number', 'game_type', 'venue_id', 'home_team_id', 'away_team_id', 'home_runs', 'away_runs', 'innings', 'day_night', 'attendance', 'duration_minutes'], games);
writeExtract(path.join(out, 'player_game_stats.tsv.gz'), ['game_id', 'player_id', 'team_id', 'batting_order', 'started', 'plate_appearances', 'at_bats', 'runs', 'hits', 'doubles', 'triples', 'home_runs', 'rbi', 'walks', 'strikeouts', 'stolen_bases', 'hit_by_pitch'], batting);
writeExtract(path.join(out, 'players.tsv.gz'), ['player_id', 'first_name', 'last_name', 'bats', 'throws', 'primary_position', 'birth_date', 'birth_country', 'debut_date'], players);
writeExtract(path.join(out, 'venues.tsv.gz'), ['venue_id', 'venue_name', 'city', 'state'], venues);
writeExtract(path.join(out, 'teams.tsv.gz'), ['team_id', 'city', 'nickname'], teams);
fs.writeFileSync(path.join(out, '../source.json'), JSON.stringify({ files: shas, seasons: [FIRST_SEASON, LAST_SEASON], extracted: { games: games.length, player_game_stats: batting.length, players: players.length, venues: venues.length, teams: teams.length } }, null, 2) + '\n');
console.log({ games: games.length, batting: batting.length, players: players.length, venues: venues.length, teams: teams.length });
