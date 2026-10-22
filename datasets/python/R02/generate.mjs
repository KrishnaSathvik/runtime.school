/**
 * R02 Runtime Films: a fictional film catalogue and its users' ratings and tags, 2015-01-01 to 2025-12-31.
 *
 * Deterministic: the same seed always produces the same rows. Every title, person and user is invented.
 * The shape follows real rating sites: a few films get most ratings (long tail), a few users rate a lot, users
 * have their own generosity and genre tastes, ratings come in half-stars and cluster around 3.5–4, newer films get
 * a burst of ratings at release, films are tagged with free text in inconsistent case and spelling.
 */
import { createRng, ts, ms, DAY, HOUR, MINUTE, round2 } from '../../lib/rng.mjs';

export const R02_SEED = 20260202;
const START = ms('2015-01-01');
const END = ms('2025-12-31 23:59:59');

export const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror', 'Musical', 'Mystery', 'Romance', 'Science Fiction', 'Thriller', 'War', 'Western', 'Biography'];
const GENRE_W = [14, 9, 6, 16, 9, 5, 22, 6, 7, 8, 2, 6, 10, 8, 12, 2, 1, 4];
const LANG = [['en', 68], ['fr', 5], ['es', 5], ['ko', 4], ['ja', 4], ['hi', 4], ['de', 3], ['it', 2], ['zh', 2], ['sv', 1], ['pt', 2]];
const COUNTRY = { en: [['United States', 70], ['United Kingdom', 18], ['Canada', 6], ['Australia', 6]], fr: [['France', 90], ['Canada', 10]], es: [['Spain', 50], ['Mexico', 35], ['Argentina', 15]], ko: [['South Korea', 1]], ja: [['Japan', 1]], hi: [['India', 1]], de: [['Germany', 85], ['Austria', 15]], it: [['Italy', 1]], zh: [['China', 60], ['Taiwan', 40]], sv: [['Sweden', 1]], pt: [['Brazil', 70], ['Portugal', 30]] };

const T1 = ['The', 'A', '', '', '', ''];
const ADJ = ['Silent', 'Last', 'Hidden', 'Broken', 'Golden', 'Midnight', 'Northern', 'Lost', 'Crimson', 'Distant', 'Wild', 'Quiet', 'Burning', 'Paper', 'Glass', 'Iron', 'Electric', 'Summer', 'Winter', 'Secret', 'Little', 'Endless', 'Hollow', 'Bright', 'Restless', 'Second', 'Final', 'Velvet', 'Salt', 'Stolen'];
const NOUN = ['Harbor', 'Garden', 'Signal', 'River', 'Kingdom', 'Letters', 'Machine', 'Orchard', 'Station', 'Frontier', 'Mirror', 'Season', 'Island', 'Engine', 'Promise', 'Tide', 'Echo', 'Lantern', 'Compass', 'Horizon', 'Circus', 'Archive', 'Country', 'Hours', 'Weekend', 'Detective', 'Orbit', 'Crossing', 'Inheritance', 'Bridge', 'Choir', 'Heist', 'Neighbours', 'Satellite', 'Vineyard'];
const OF = ['of Strangers', 'of Glass', 'in the Dark', 'at Dawn', 'of the North', 'for Two', 'Underground', 'on Fire', 'of Small Things', 'Without Names', 'by the Sea', 'in Winter'];
const FIRST = ['Ana', 'Ben', 'Chiara', 'David', 'Elif', 'Farid', 'Greta', 'Hiro', 'Ines', 'Jonas', 'Kemi', 'Lars', 'Mina', 'Nikhil', 'Olga', 'Pablo', 'Quinn', 'Rania', 'Sven', 'Tomas', 'Uma', 'Viktor', 'Wen', 'Yara', 'Zoltan', 'Amelie', 'Bruno', 'Celine', 'Dmitri', 'Esther', 'Felipe', 'Hana', 'Ivo', 'Julia', 'Kofi', 'Leila', 'Marco', 'Noor', 'Oskar', 'Priya'];
const LAST = ['Achterberg', 'Bellucci', 'Carvalho', 'Dubois', 'Eriksen', 'Fontaine', 'Guzman', 'Hartmann', 'Ishikawa', 'Jovanovic', 'Kowalczyk', 'Lindqvist', 'Moreau', 'Nakamura', 'Okonkwo', 'Petrov', 'Quintero', 'Rahman', 'Sandoval', 'Takahashi', 'Ueda', 'Varga', 'Whitfield', 'Xu', 'Yilmaz', 'Zhang', 'Abara', 'Brennan', 'Castellano', 'Delacroix'];
const USER_COUNTRY = [['United States', 40], ['United Kingdom', 9], ['Canada', 6], ['Germany', 6], ['India', 8], ['Brazil', 6], ['France', 5], ['Australia', 4], ['Mexico', 4], ['Japan', 3], ['South Korea', 3], ['Spain', 3], ['Nigeria', 2], ['Sweden', 1]];
const AGE = [['18-24', 22], ['25-34', 33], ['35-44', 20], ['45-54', 12], ['55+', 8], [null, 5]];
/** Free-text tags, with the spellings and cases real users type. */
const TAGS = {
  Action: ['explosions', 'car chase', 'Car Chase', 'fight scenes', 'over the top'], Adventure: ['road trip', 'treasure', 'epic'], Animation: ['beautiful animation', 'pixar-like', 'hand drawn'],
  Comedy: ['funny', 'Funny', 'hilarious', 'dark comedy', 'witty dialogue', 'feel-good'], Crime: ['heist', 'noir', 'twist ending', 'gangsters'], Documentary: ['eye-opening', 'true story', 'based on a true story'],
  Drama: ['slow burn', 'great acting', 'tearjerker', 'family drama', 'great  acting'], Family: ['kids', 'family friendly', 'family-friendly'], Fantasy: ['magic', 'world building', 'worldbuilding', 'dragons'],
  Horror: ['scary', 'jump scares', 'creepy', 'gore'], Musical: ['great soundtrack', 'singing', 'Great Soundtrack'], Mystery: ['whodunit', 'twist ending', 'Twist ending', 'clever'], Romance: ['romantic', 'love story', 'chemistry'],
  'Science Fiction': ['sci-fi', 'scifi', 'Sci-Fi', 'time travel', 'dystopia', 'space'], Thriller: ['suspense', 'tense', 'twist ending', 'plot twist'], War: ['ww2', 'WWII', 'historical'], Western: ['cowboys', 'desert'], Biography: ['biopic', 'true story', 'inspiring'],
};
const ANY_TAGS = ['overrated', 'underrated', 'boring', 'masterpiece', 'rewatchable', 'too long', 'cinematography', 'visually stunning', 'must see', 'meh'];

/** Prefix-sum weighted picker. */
function picker(items, weights) {
  const sums = [];
  let s = 0;
  for (const w of weights) sums.push((s += w));
  return r => {
    const x = r * s;
    let lo = 0, hi = sums.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sums[mid] > x) hi = mid; else lo = mid + 1; }
    return items[lo];
  };
}

const halfStar = x => Math.min(5, Math.max(0.5, Math.round(x * 2) / 2));

export function generateFilms(seed = R02_SEED, { movies: nMovies = 5000, users: nUsers = 8000 } = {}) {
  const rng = createRng(seed);

  // ---- people and movies ----
  const peopleRng = rng.fork('people');
  const directors = Array.from({ length: 900 }, () => `${peopleRng.pick(FIRST)} ${peopleRng.pick(LAST)}`);
  const mRng = rng.fork('movies');
  const titles = new Set();
  const movies = [], movieGenres = [];
  for (let id = 1; movies.length < nMovies; id++) {
    const style = mRng.int(0, 5);
    let title = style === 0 ? `${mRng.pick(ADJ)} ${mRng.pick(NOUN)}` : style === 1 ? `The ${mRng.pick(NOUN)} ${mRng.pick(OF)}` : style === 2 ? `${mRng.pick(T1)} ${mRng.pick(ADJ)} ${mRng.pick(NOUN)}`.trim() : style === 3 ? `${mRng.pick(NOUN)}` : style === 4 ? `${mRng.pick(ADJ)} ${mRng.pick(NOUN)} ${mRng.pick(OF)}` : `${mRng.pick(NOUN)} ${mRng.int(2, 3) === 2 ? 'II' : 'III'}`;
    // Remakes reuse a title with a different year, as real catalogues do.
    const year = Math.round(Math.min(2025, Math.max(1950, 2025 - mRng.exponential(11))));
    const key = `${title}|${year}`;
    if (titles.has(key)) continue;
    titles.add(key);
    const lang = mRng.weighted(LANG);
    const genres = new Set([mRng.weighted(GENRES.map((g, i) => [g, GENRE_W[i]]))]);
    while (genres.size < 3 && mRng.chance(genres.size === 1 ? 0.6 : 0.3)) genres.add(mRng.weighted(GENRES.map((g, i) => [g, GENRE_W[i]])));
    const g = [...genres];
    const doc = g.includes('Documentary'), anim = g.includes('Animation');
    const runtime = mRng.chance(0.02) ? null : Math.round(Math.max(62, mRng.normal(doc ? 92 : anim ? 94 : 108, 17)));
    const big = !doc && mRng.chance(lang === 'en' ? 0.35 : 0.12);
    const budget = mRng.chance(big ? 0.85 : 0.35) ? Math.round(mRng.lognormal(big ? 60e6 : 8e6, 0.9) / 1e5) * 1e5 : null;
    const revenue = budget !== null && mRng.chance(0.85) ? Math.round(budget * mRng.lognormal(1.6, 1.1) / 1e5) * 1e5 : null;
    // Hidden quality and popularity drive ratings; popularity is heavy-tailed and favours recent, English, big films.
    const quality = mRng.normal(0, 0.55) + (doc ? 0.25 : 0) + (g.includes('Horror') ? -0.2 : 0);
    const pop = mRng.lognormal(1, 1.25) * (big ? 3 : 1) * (lang === 'en' ? 1.6 : 1) * (year >= 2015 ? 1.8 : year >= 2000 ? 1 : 0.5);
    const releasedAt = ms(`${year}-01-01`) + mRng.int(0, 364) * DAY;
    movies.push({
      movie_id: id, title, release_year: year, release_date: ts(releasedAt).slice(0, 10), runtime_min: runtime, original_language: lang,
      country: mRng.weighted(COUNTRY[lang]), director: mRng.pick(directors), budget_usd: budget, revenue_usd: revenue,
      _q: quality, _pop: pop, _g: g, _rel: releasedAt,
    });
    for (const name of g) movieGenres.push({ movie_id: id, genre_id: GENRES.indexOf(name) + 1 });
  }

  // ---- users ----
  const uRng = rng.fork('users');
  const users = [];
  for (let id = 1; id <= nUsers; id++) {
    const joined = START + Math.floor(uRng.next() ** 0.8 * (END - START - 30 * DAY));
    const likes = new Set([uRng.weighted(GENRES.map((g, i) => [g, GENRE_W[i]])), uRng.weighted(GENRES.map((g, i) => [g, GENRE_W[i]]))]);
    users.push({
      user_id: id, joined_at: ts(joined + uRng.int(0, 86399) * 1000), country: uRng.weighted(USER_COUNTRY), age_band: uRng.weighted(AGE),
      _bias: uRng.normal(0, 0.45), _act: uRng.chance(0.08) ? 0 : Math.min(400, uRng.lognormal(18, 1.25)), _likes: likes, _joined: joined, _tagger: uRng.chance(0.12),
    });
  }

  // ---- ratings and tags ----
  const rRng = rng.fork('ratings');
  const pick = picker(movies, movies.map(m => m._pop));
  const ratings = [], tags = [];
  for (const u of users) {
    const n = Math.round(u._act);
    const seen = new Set();
    for (let k = 0, tries = 0; k < n && tries < n * 4; tries++) {
      const m = pick(rRng.next());
      if (seen.has(m.movie_id)) continue;
      const earliest = Math.max(u._joined, m._rel);
      if (earliest >= END) continue;
      seen.add(m.movie_id);
      k++;
      const like = m._g.some(g => u._likes.has(g)) ? 0.35 : -0.1;
      const value = halfStar(3.55 + m._q + u._bias + like + rRng.normal(0, 0.7));
      // New films are rated soon after release; old ones whenever the user gets to them.
      const gap = m._rel > u._joined ? rRng.exponential(60) * DAY : rRng.next() * (END - earliest);
      const at = Math.min(END - HOUR, earliest + gap + rRng.int(0, 86399) * 1000);
      ratings.push({ user_id: u.user_id, movie_id: m.movie_id, rating: value, rated_at: ts(at) });
      if (u._tagger && rRng.chance(0.25)) {
        const pool = rRng.chance(0.75) ? TAGS[rRng.pick(m._g)] : ANY_TAGS;
        tags.push({ user_id: u.user_id, movie_id: m.movie_id, tag: rRng.pick(pool), tagged_at: ts(at + rRng.int(0, 600) * 1000) });
      }
    }
  }
  ratings.sort((a, b) => (a.rated_at < b.rated_at ? -1 : a.rated_at > b.rated_at ? 1 : a.user_id - b.user_id || a.movie_id - b.movie_id));
  tags.sort((a, b) => (a.tagged_at < b.tagged_at ? -1 : a.tagged_at > b.tagged_at ? 1 : a.user_id - b.user_id || a.movie_id - b.movie_id));
  // A user tags a film with a tag once.
  const tagSeen = new Set();
  const uniqTags = tags.filter(t => { const k = `${t.user_id}|${t.movie_id}|${t.tag}`; if (tagSeen.has(k)) return false; tagSeen.add(k); return true; });

  const strip = o => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));
  return {
    movies: movies.map(strip),
    genres: GENRES.map((name, i) => ({ genre_id: i + 1, name })),
    movie_genres: movieGenres,
    users: users.map(strip),
    ratings,
    tags: uniqTags,
  };
}

export { round2, MINUTE };
