import path from 'node:path';
import { col, fk, table } from '../lib/schema.mjs';
import { readExtract } from '../lib/extract.mjs';
import { distinct, nulls, maxShare } from '../lib/contract.mjs';

const DIVISIONS = {
  AL: { East: ['BAL', 'BOS', 'NYA', 'TBA', 'TOR'], Central: ['CHA', 'CLE', 'DET', 'KCA', 'MIN'], West: ['ANA', 'HOU', 'OAK', 'ATH', 'SEA', 'TEX'] },
  NL: { East: ['ATL', 'MIA', 'NYN', 'PHI', 'WAS'], Central: ['CHN', 'CIN', 'MIL', 'PIT', 'SLN'], West: ['ARI', 'COL', 'LAN', 'SDN', 'SFN'] },
};
/** Current club nicknames where the Retrosheet team file carries an older one. */
const NICKNAMES = { TBA: 'Rays' };
const COUNTRY = { England: 'United Kingdom', JAP: 'Japan', 'South Korea': 'South Korea', MEX: 'Mexico', MX: 'Mexico', PR: 'Puerto Rico' };

const tables = [
  table('teams', 'One MLB team. The Athletics appear twice: Oakland (OAK) through 2024, then Sacramento (ATH) in 2025.', [
    col('team_id', 'TEXT', 'Retrosheet team code'),
    col('franchise_id', 'TEXT', 'Franchise code; OAK and ATH share one franchise'),
    col('city', 'TEXT', 'Home city'),
    col('nickname', 'TEXT', 'Club nickname'),
    col('league', 'TEXT', 'AL or NL'),
    col('division', 'TEXT', 'East, Central or West'),
  ]),
  table('venues', 'One ballpark that hosted a game, including neutral and international sites.', [
    col('venue_id', 'TEXT', 'Retrosheet park code'),
    col('venue_name', 'TEXT', 'Park name'),
    col('city', 'TEXT', 'City'),
    col('region', 'TEXT', 'U.S. state code, or country/territory for sites outside the 50 states'),
    col('country', 'TEXT', 'Country or territory'),
  ]),
  table('seasons', 'One MLB season.', [
    col('season', 'INTEGER', 'Season year'),
    col('first_game_date', 'TEXT', 'Opening day (regular season)'),
    col('last_regular_date', 'TEXT', 'Final regular-season date'),
    col('games_per_team', 'INTEGER', 'Scheduled regular-season games per team (60 in 2020)'),
    col('postseason_teams', 'INTEGER', 'Clubs qualifying for the postseason'),
  ]),
  table('games', 'One completed regular-season or postseason game.', [
    col('game_id', 'TEXT', 'Retrosheet game id: home team, date and game number'),
    col('season', 'INTEGER', 'Season'),
    col('game_date', 'TEXT', 'Local game date'),
    col('game_number', 'INTEGER', '0 for a single game, 1 or 2 for doubleheaders'),
    col('game_type', 'TEXT', 'regular, playoff (tiebreaker), wildcard, divisionseries, lcs or worldseries'),
    col('venue_id', 'TEXT', 'Ballpark'),
    col('home_team_id', 'TEXT', 'Home club (last at bat)'),
    col('away_team_id', 'TEXT', 'Visiting club'),
    col('home_score', 'INTEGER', 'Runs scored by the home club'),
    col('away_score', 'INTEGER', 'Runs scored by the visiting club'),
    col('day_night', 'TEXT', 'day or night', true),
    col('attendance', 'INTEGER', 'Paid attendance; NULL when not reported (most 2020 games had no fans)', true),
    col('duration_minutes', 'INTEGER', 'Game time in minutes', true),
  ], {
    foreignKeys: [fk('season', 'seasons'), fk('venue_id', 'venues'), fk('home_team_id', 'teams', 'team_id'), fk('away_team_id', 'teams', 'team_id')],
    indexes: [['game_date'], ['home_team_id'], ['away_team_id']],
  }),
  table('players', 'One player who appeared in a 2025 MLB game.', [
    col('player_id', 'TEXT', 'Retrosheet player id'),
    col('first_name', 'TEXT', 'Given name'),
    col('last_name', 'TEXT', 'Family name'),
    col('bats', 'TEXT', 'L, R or B (switch)', true),
    col('throws', 'TEXT', 'L or R', true),
    col('primary_position', 'TEXT', 'Position with the most 2025 games (P, C, 1B … DH)', true),
    col('birth_date', 'TEXT', 'Date of birth', true),
    col('birth_country', 'TEXT', 'Country of birth', true),
    col('debut_date', 'TEXT', 'MLB debut date', true),
  ]),
  table('player_game_stats', 'One player’s batting stats in one 2025 game. Pitchers usually appear with zero plate appearances.', [
    col('game_id', 'TEXT', 'Game'),
    col('player_id', 'TEXT', 'Batter'),
    col('team_id', 'TEXT', 'Club the player batted for'),
    col('batting_order', 'INTEGER', 'Lineup slot 1–9; NULL for some substitutes', true),
    col('started', 'INTEGER', '1 for the starting player in the lineup slot'),
    col('plate_appearances', 'INTEGER', 'Plate appearances'),
    col('at_bats', 'INTEGER', 'Official at-bats'),
    col('runs', 'INTEGER', 'Runs scored'),
    col('hits', 'INTEGER', 'Hits'),
    col('doubles', 'INTEGER', 'Doubles'),
    col('triples', 'INTEGER', 'Triples'),
    col('home_runs', 'INTEGER', 'Home runs'),
    col('rbi', 'INTEGER', 'Runs batted in'),
    col('walks', 'INTEGER', 'Walks (including intentional)'),
    col('strikeouts', 'INTEGER', 'Strikeouts'),
    col('stolen_bases', 'INTEGER', 'Stolen bases'),
    col('hit_by_pitch', 'INTEGER', 'Times hit by a pitch'),
  ], { primaryKey: ['game_id', 'player_id'], foreignKeys: [fk('game_id', 'games'), fk('player_id', 'players'), fk('team_id', 'teams')], indexes: [['player_id'], ['team_id']] }),
  table('standings', 'One team’s win–loss record at the end of a month (and at season end).', [
    col('season', 'INTEGER', 'Season'),
    col('as_of_date', 'TEXT', 'Snapshot date (inclusive)'),
    col('team_id', 'TEXT', 'Club'),
    col('wins', 'INTEGER', 'Wins to date'),
    col('losses', 'INTEGER', 'Losses to date'),
    col('runs_scored', 'INTEGER', 'Runs scored to date'),
    col('runs_allowed', 'INTEGER', 'Runs allowed to date'),
  ], { primaryKey: ['season', 'as_of_date', 'team_id'], foreignKeys: [fk('season', 'seasons'), fk('team_id', 'teams')] }),
];

async function rows({ dir }) {
  const ex = (name, numeric) => readExtract(path.join(dir, 'extract', `${name}.tsv.gz`), numeric).rows;
  const rawGames = ex('games', ['season', 'game_number', 'home_runs', 'away_runs', 'innings', 'attendance', 'duration_minutes']);
  const games = rawGames.map(g => [...g.slice(0, 10), ...g.slice(11)]); // scheduled innings is blank before 2020; dropped
  const leagueOf = {};
  for (const [league, divs] of Object.entries(DIVISIONS)) for (const [div, codes] of Object.entries(divs)) for (const c of codes) leagueOf[c] = [league, div];
  const teams = ex('teams', []).map(([id, city, nick]) => {
    if (!leagueOf[id]) throw new Error(`No division for ${id}`);
    return [id, id === 'ATH' ? 'OAK' : id, city, NICKNAMES[id] ?? nick, ...leagueOf[id]];
  });
  const venues = ex('venues', []).map(([id, name, city, region]) => [id, name, city, region, COUNTRY[region] ?? 'United States']);

  const seasons = [];
  for (let s = 2016; s <= 2025; s++) {
    const regular = games.filter(g => g[1] === s && g[4] === 'regular').map(g => g[2]).sort();
    seasons.push([s, regular[0], regular.at(-1), s === 2020 ? 60 : 162, s === 2020 ? 16 : s >= 2022 ? 12 : 10]);
  }

  // Standings: cumulative regular-season record at each month end and on the final regular-season date.
  const standings = [];
  for (const [s, , last] of seasons) {
    const regular = games.filter(g => g[1] === s && g[4] === 'regular');
    const cutoffs = new Set([last]);
    for (const g of regular) {
      const [y, m] = g[2].split('-').map(Number);
      const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      if (end < last) cutoffs.add(end);
    }
    for (const cutoff of [...cutoffs].sort()) {
      const rec = new Map();
      for (const g of regular) {
        if (g[2] > cutoff) continue;
        const [, , , , , , home, away, hr, ar] = g;
        for (const [team, rs, ra] of [[home, hr, ar], [away, ar, hr]]) {
          const r = rec.get(team) ?? [0, 0, 0, 0];
          if (rs > ra) r[0]++; else if (rs < ra) r[1]++;
          r[2] += rs; r[3] += ra;
          rec.set(team, r);
        }
      }
      for (const [team, r] of [...rec].sort((a, b) => (a[0] < b[0] ? -1 : 1))) standings.push([s, cutoff, team, ...r]);
    }
  }
  return {
    teams, venues, seasons, games,
    players: ex('players', []),
    player_game_stats: ex('player_game_stats', ['batting_order', 'started', 'plate_appearances', 'at_bats', 'runs', 'hits', 'doubles', 'triples', 'home_runs', 'rbi', 'walks', 'strikeouts', 'stolen_bases', 'hit_by_pitch']),
    standings,
  };
}

const dataset = {
  id: 'sports',
  version: '3.0.0',
  name: 'Sports',
  domain: 'Professional baseball',
  kind: 'real',
  description: 'Ten seasons of Major League Baseball results (2016–2025) with every 2025 player batting line, rosters, ballparks and month-end standings.',
  source: {
    publisher: 'Retrosheet',
    url: 'https://www.retrosheet.org/downloads/csvdownloads.html',
    release: 'Retrosheet CSV downloads: gameinfo (1897–2025), 2025 season files, biographical files',
    license: 'Retrosheet notice: free use including commercial products, provided the Retrosheet statement appears prominently',
    licenseUrl: 'https://www.retrosheet.org/notice.txt',
    commercialReuse: 'permitted',
    attribution: 'The information used here was obtained free of charge from and is copyrighted by Retrosheet. Interested parties may contact Retrosheet at "www.retrosheet.org".',
    retrieved: '2026-10-14',
    transformations: [
      'Regular-season and postseason games 2016–2025; All-Star games excluded.',
      '2025 batting lines with stattype = value; a player re-entering one game is summed to one line.',
      'Players are all 2025 roster entries; primary position is the position with the most 2025 games.',
      'League and division assignments, the Rays nickname and venue countries added by Runtime.',
      'Seasons and month-end standings derived from game results.',
    ],
  },
  reproduction: { command: 'node datasets/acquire/download.mjs <dir> sports && node datasets/acquire/sports.mjs <dir> && node datasets/build.mjs sports', implementation: 'datasets/acquire/sports.mjs, datasets/sports/dataset.mjs', notes: 'Committed extracts in datasets/sports/extract are the build input.' },
  coverage: { start: '2016-04-03', end: '2025-11-01', grain: 'game; player batting line (2025)' },
  tables,
  edgeCases: [
    'A relocated franchise with two team codes (OAK → ATH)',
    'The shortened 60-game 2020 season played mostly without fans (NULL attendance)',
    'Doubleheaders on the same date',
    'Neutral and international sites (London, Tokyo, Seoul, Mexico City, Field of Dreams)',
    'Pitchers with batting lines of zero plate appearances',
    'Ties in wins, runs and player totals',
    'Substitutes without a recorded lineup slot',
  ],
  qualityNotes: [
    'Player batting lines cover 2025 only; game results cover ten seasons.',
    'Standings are cumulative to each snapshot date; differences between snapshots give monthly records.',
    'A team appears in two rows per game in player_game_stats joins only through its own players.',
  ],
  concepts: ['RANK', 'DENSE_RANK', 'Top-N per group', 'streaks', 'rolling form', 'percentiles', 'NTILE', 'median', 'histograms'],
  rows,
  mutation: `
UPDATE games SET home_score = home_score + 1 WHERE game_id IN (SELECT game_id FROM games WHERE season = 2025 AND game_type = 'regular' AND home_score + 1 = away_score ORDER BY game_id LIMIT 40);
UPDATE player_game_stats SET hits = hits + 1, at_bats = at_bats + 1, plate_appearances = plate_appearances + 1 WHERE rowid % 157 = 0;
UPDATE player_game_stats SET home_runs = home_runs + 2 WHERE player_id = (SELECT player_id FROM player_game_stats GROUP BY player_id ORDER BY SUM(home_runs) DESC, player_id LIMIT 1 OFFSET 2);
DELETE FROM games WHERE game_id IN (SELECT game_id FROM games WHERE season = 2019 AND game_type = 'regular' ORDER BY game_id LIMIT 25);
INSERT INTO players VALUES ('runtx001', 'Test', 'Prospect', 'R', 'R', 'SS', '2004-05-05', 'USA', NULL);
UPDATE standings SET wins = wins + 1 WHERE season = 2025 AND as_of_date = (SELECT MAX(as_of_date) FROM standings WHERE season = 2025) AND team_id = 'SEA';
UPDATE games SET attendance = attendance + 2500 WHERE season = 2025 AND game_type = 'regular' AND game_id IN (SELECT game_id FROM games WHERE season = 2025 AND game_type = 'regular' ORDER BY game_id LIMIT 60);
UPDATE games SET attendance = NULL WHERE game_id IN (SELECT game_id FROM games WHERE season = 2025 AND game_type = 'regular' AND attendance IS NOT NULL ORDER BY game_id DESC LIMIT 15);
UPDATE player_game_stats SET home_runs = home_runs + 1 WHERE (game_id, player_id) IN (SELECT s.game_id, s.player_id FROM player_game_stats s JOIN games g USING (game_id) WHERE g.season = 2025 AND g.game_type = 'regular' AND s.home_runs = 0 AND s.plate_appearances > 3 ORDER BY s.game_id, s.player_id LIMIT 80);
`,
  contract: {
    totalRows: [60000, 100000],
    minRows: { teams: 30, venues: 30, seasons: 10, games: 20000, players: 1200, player_game_stats: 50000, standings: 1500 },
    checks: [
      { name: 'seasons with games', sql: distinct('games', 'season'), equals: 10 },
      { name: '2020 short season games', sql: "SELECT COUNT(*) FROM games WHERE season = 2020 AND game_type = 'regular'", max: 1000 },
      { name: 'doubleheader games', sql: 'SELECT COUNT(*) FROM games WHERE game_number > 0', min: 500 },
      { name: 'postseason games', sql: "SELECT COUNT(*) FROM games WHERE game_type <> 'regular'", min: 300 },
      { name: 'games without attendance', sql: nulls('games', 'attendance'), min: 500 },
      { name: 'international or neutral venues', sql: "SELECT COUNT(*) FROM venues WHERE country <> 'United States'", min: 4 },
      { name: 'relocated franchise codes', sql: "SELECT COUNT(*) FROM teams WHERE franchise_id = 'OAK'", equals: 2 },
      { name: 'players who never batted (zero plate appearances)', sql: 'SELECT COUNT(*) FROM (SELECT player_id FROM player_game_stats GROUP BY player_id HAVING SUM(plate_appearances) = 0)', min: 300 },
      { name: 'largest player share of lines', sql: maxShare('player_game_stats', 'player_id'), max: 0.01 },
      { name: 'season-end standings rows', sql: 'SELECT COUNT(*) FROM standings s JOIN seasons x ON x.season = s.season AND s.as_of_date = x.last_regular_date', equals: 300 },
      { name: 'players tied on 2025 home runs', sql: 'SELECT COUNT(*) FROM (SELECT SUM(home_runs) AS hr FROM player_game_stats GROUP BY player_id) GROUP BY hr HAVING COUNT(*) > 1 ORDER BY 1 DESC LIMIT 1', min: 2 },
    ],
  },
};

export default dataset;
