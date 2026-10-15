import { createHash } from 'node:crypto';
import { col, fk, table } from '../lib/schema.mjs';
import { createRng, ts, ms, DAY, HOUR, MINUTE } from '../lib/rng.mjs';
import { FIRST_NAMES, LAST_NAMES, COMPANY_A, COMPANY_B, COUNTRIES } from '../lib/names.mjs';
import { distinct, maxShare, nulls } from '../lib/contract.mjs';

const SEED = 20257;
const GENERATOR_VERSION = '3.0.0';
const START = ms('2024-01-01 00:00:00');
const END = ms('2025-07-01 00:00:00');
const ORGS = 60;
const LANGUAGES = [['TypeScript', 26], ['Python', 22], ['Go', 12], ['Java', 10], ['Rust', 5], ['Ruby', 5], ['Kotlin', 5], ['Swift', 4], ['C#', 6], ['Terraform', 5]];
const TEAM_WORDS = ['Platform', 'Payments', 'Search', 'Identity', 'Mobile', 'Data', 'Growth', 'Infrastructure', 'Billing', 'Checkout', 'Messaging', 'Observability', 'Security', 'Developer Experience', 'ML', 'Frontend', 'API', 'Storage', 'Notifications', 'Analytics'];
const REPO_WORDS = ['api', 'web', 'worker', 'gateway', 'auth', 'billing', 'search', 'ingest', 'etl', 'mobile', 'infra', 'cli', 'sdk', 'docs', 'design-system', 'scheduler', 'notifier', 'ledger', 'catalog', 'metrics', 'feature-flags', 'config', 'pipeline', 'admin'];
const PR_VERBS = ['Add', 'Fix', 'Refactor', 'Update', 'Remove', 'Improve', 'Bump', 'Migrate', 'Document', 'Speed up'];
const PR_OBJECTS = ['retry logic', 'pagination', 'rate limiter', 'login flow', 'cache invalidation', 'error handling', 'dependency versions', 'CI workflow', 'logging', 'schema migration', 'feature flag', 'API client', 'dashboard query', 'unit tests', 'timeout handling', 'webhook handler'];
// Abbreviated 12-character commit hashes, as Git displays them.
const sha = text => createHash('sha1').update(text).digest('hex').slice(0, 12);

const tables = [
  table('organizations', 'One customer organization on the developer platform.', [
    col('organization_id', 'INTEGER', 'Organization key'),
    col('org_name', 'TEXT', 'Fictional company name'),
    col('plan', 'TEXT', 'free, team or enterprise'),
    col('country', 'TEXT', 'Headquarters country'),
    col('created_at', 'TEXT', 'Signup time (UTC)'),
  ]),
  table('teams', 'One team inside an organization. Teams can nest under other teams.', [
    col('team_id', 'INTEGER', 'Team key'),
    col('organization_id', 'INTEGER', 'Organization'),
    col('team_name', 'TEXT', 'Team name'),
    col('parent_team_id', 'INTEGER', 'Parent team; NULL for top-level teams', true),
  ], { foreignKeys: [fk('organization_id', 'organizations'), fk('parent_team_id', 'teams', 'team_id')], indexes: [['organization_id'], ['parent_team_id']] }),
  table('developers', 'One person with an account in an organization.', [
    col('developer_id', 'INTEGER', 'Developer key'),
    col('organization_id', 'INTEGER', 'Organization'),
    col('team_id', 'INTEGER', 'Primary team; NULL for people not assigned to a team', true),
    col('username', 'TEXT', 'Platform handle'),
    col('display_name', 'TEXT', 'Fictional name'),
    col('role', 'TEXT', 'engineer, senior_engineer, staff_engineer, manager, director, vp or contractor'),
    col('manager_id', 'INTEGER', 'Manager; NULL at the top of an organization', true),
    col('joined_at', 'TEXT', 'Account creation (UTC)'),
    col('left_at', 'TEXT', 'Departure; NULL while active', true),
  ], { foreignKeys: [fk('organization_id', 'organizations'), fk('team_id', 'teams'), fk('manager_id', 'developers', 'developer_id')], indexes: [['organization_id'], ['team_id'], ['manager_id']] }),
  table('repositories', 'One code repository. Forks point to the repository they were copied from.', [
    col('repository_id', 'INTEGER', 'Repository key'),
    col('organization_id', 'INTEGER', 'Owning organization'),
    col('owning_team_id', 'INTEGER', 'Owning team; NULL when ownership is unassigned', true),
    col('repo_name', 'TEXT', 'Repository name'),
    col('primary_language', 'TEXT', 'Dominant language'),
    col('visibility', 'TEXT', 'private, internal or public'),
    col('created_at', 'TEXT', 'Creation time (UTC)'),
    col('archived_at', 'TEXT', 'Archive time; NULL while active', true),
    col('forked_from_repository_id', 'INTEGER', 'Source repository for forks; NULL otherwise', true),
  ], { foreignKeys: [fk('organization_id', 'organizations'), fk('owning_team_id', 'teams', 'team_id'), fk('forked_from_repository_id', 'repositories', 'repository_id')], indexes: [['organization_id'], ['owning_team_id']] }),
  table('pull_requests', 'One pull request.', [
    col('pull_request_id', 'INTEGER', 'Pull request key'),
    col('repository_id', 'INTEGER', 'Repository'),
    col('author_id', 'INTEGER', 'Author'),
    col('title', 'TEXT', 'Title'),
    col('created_at', 'TEXT', 'Opened (UTC)'),
    col('merged_at', 'TEXT', 'Merged; NULL if not merged', true),
    col('closed_at', 'TEXT', 'Closed or merged; NULL while open', true),
    col('state', 'TEXT', 'merged, closed or open'),
    col('additions', 'INTEGER', 'Lines added'),
    col('deletions', 'INTEGER', 'Lines removed'),
  ], { foreignKeys: [fk('repository_id', 'repositories'), fk('author_id', 'developers', 'developer_id')], indexes: [['repository_id'], ['author_id'], ['created_at']] }),
  table('commits', 'One code commit. Each commit can point to the previous commit on its branch.', [
    col('commit_sha', 'TEXT', 'Abbreviated (12-character) commit hash'),
    col('repository_id', 'INTEGER', 'Repository'),
    col('author_id', 'INTEGER', 'Author; NULL for commits by unlinked emails and bots', true),
    col('pull_request_id', 'INTEGER', 'Pull request it belongs to; NULL for direct pushes', true),
    col('parent_sha', 'TEXT', 'Parent commit; NULL for a repository’s first commit', true),
    col('committed_at', 'TEXT', 'Commit time (UTC)'),
    col('message', 'TEXT', 'First line of the commit message'),
    col('additions', 'INTEGER', 'Lines added'),
    col('deletions', 'INTEGER', 'Lines removed'),
  ], { foreignKeys: [fk('repository_id', 'repositories'), fk('author_id', 'developers', 'developer_id'), fk('pull_request_id', 'pull_requests'), fk('parent_sha', 'commits', 'commit_sha')], indexes: [['repository_id', 'committed_at'], ['author_id'], ['pull_request_id'], ['parent_sha']] }),
  table('reviews', 'One review submitted on a pull request.', [
    col('review_id', 'INTEGER', 'Review key'),
    col('pull_request_id', 'INTEGER', 'Pull request'),
    col('reviewer_id', 'INTEGER', 'Reviewer'),
    col('submitted_at', 'TEXT', 'Submitted (UTC)'),
    col('state', 'TEXT', 'approved, changes_requested or commented'),
  ], { foreignKeys: [fk('pull_request_id', 'pull_requests'), fk('reviewer_id', 'developers', 'developer_id')], indexes: [['pull_request_id'], ['reviewer_id']] }),
  table('issues', 'One tracked issue.', [
    col('issue_id', 'INTEGER', 'Issue key'),
    col('repository_id', 'INTEGER', 'Repository'),
    col('opened_by_id', 'INTEGER', 'Reporter'),
    col('assignee_id', 'INTEGER', 'Assignee; NULL when unassigned', true),
    col('issue_type', 'TEXT', 'bug, feature, task or incident_followup'),
    col('priority', 'TEXT', 'p0 (urgent) to p3 (low)'),
    col('created_at', 'TEXT', 'Opened (UTC)'),
    col('closed_at', 'TEXT', 'Closed; NULL while open', true),
    col('linked_pull_request_id', 'INTEGER', 'Pull request that resolved it', true),
  ], { foreignKeys: [fk('repository_id', 'repositories'), fk('opened_by_id', 'developers', 'developer_id'), fk('assignee_id', 'developers', 'developer_id'), fk('linked_pull_request_id', 'pull_requests', 'pull_request_id')], indexes: [['repository_id'], ['assignee_id']] }),
  table('deployments', 'One deployment of a commit to an environment.', [
    col('deployment_id', 'INTEGER', 'Deployment key'),
    col('repository_id', 'INTEGER', 'Repository deployed'),
    col('environment', 'TEXT', 'staging or production'),
    col('commit_sha', 'TEXT', 'Commit deployed'),
    col('triggered_by_id', 'INTEGER', 'Who triggered it; NULL for automated deploys', true),
    col('started_at', 'TEXT', 'Start (UTC)'),
    col('finished_at', 'TEXT', 'Finish; NULL while running', true),
    col('status', 'TEXT', 'success, failed, rolled_back or in_progress'),
  ], { foreignKeys: [fk('repository_id', 'repositories'), fk('commit_sha', 'commits'), fk('triggered_by_id', 'developers', 'developer_id')], indexes: [['repository_id', 'started_at'], ['commit_sha']] }),
  table('incidents', 'One production incident.', [
    col('incident_id', 'INTEGER', 'Incident key'),
    col('repository_id', 'INTEGER', 'Affected service repository'),
    col('deployment_id', 'INTEGER', 'Deployment identified as the cause; NULL when not caused by a deploy', true),
    col('severity', 'TEXT', 'sev1 (critical) to sev4 (minor)'),
    col('opened_at', 'TEXT', 'Detected (UTC)'),
    col('acknowledged_at', 'TEXT', 'First responder acknowledged', true),
    col('resolved_at', 'TEXT', 'Resolved; NULL while open', true),
    col('commander_id', 'INTEGER', 'Incident commander', true),
  ], { foreignKeys: [fk('repository_id', 'repositories'), fk('deployment_id', 'deployments'), fk('commander_id', 'developers', 'developer_id')], indexes: [['repository_id'], ['deployment_id']] }),
];

function generate() {
  const rng = createRng(SEED);
  const orgs = [], teams = [], devs = [], repos = [], prs = [], commits = [], reviews = [], issues = [], deployments = [], incidents = [];
  for (let o = 0; o < ORGS; o++) {
    const r = rng.fork(`org:${o}`);
    const orgId = o + 1;
    const size = Math.round(r.lognormal(32, 0.8));
    const plan = size > 80 ? 'enterprise' : size > 20 ? r.weighted([['team', 70], ['enterprise', 30]]) : r.weighted([['free', 50], ['team', 50]]);
    const created = START - r.int(30, 1500) * DAY;
    orgs.push([orgId, `${r.pick(COMPANY_A)} ${r.pick(COMPANY_B)}`, plan, r.weighted(COUNTRIES), ts(created)]);
    // Team tree: a few top-level groups, sub-teams beneath them.
    const tops = [], orgTeams = [];
    const topCount = Math.max(1, Math.min(5, Math.round(size / 25)));
    const words = r.shuffle(TEAM_WORDS);
    let w = 0;
    for (let k = 0; k < topCount; k++) { const id = teams.length + 1; teams.push([id, orgId, `${words[w++ % words.length]}`, null]); tops.push(id); orgTeams.push({ id, depth: 0 }); }
    const subCount = Math.max(0, Math.round(size / 9) - topCount);
    for (let k = 0; k < subCount; k++) {
      const parentPool = orgTeams.filter(t => t.depth < 3);
      const parent = r.pick(parentPool);
      const id = teams.length + 1;
      teams.push([id, orgId, `${words[w++ % words.length]}${w > words.length ? ' ' + Math.ceil(w / words.length) : ''}`, parent.id]);
      orgTeams.push({ id, depth: parent.depth + 1 });
    }
    // People: a management chain (vp → directors → managers → engineers).
    const people = [];
    const hire = (role, team, manager, joined) => {
      const id = devs.length + 1;
      const first = r.pick(FIRST_NAMES), last = r.pick(LAST_NAMES);
      const left = joined < END - 60 * DAY && r.chance(role === 'contractor' ? 0.35 : 0.1) ? joined + Math.floor(r.float(0.2, 1) * (END - joined - 30 * DAY)) : null;
      devs.push([id, orgId, team, `${first[0].toLowerCase()}${last.toLowerCase()}${id % 97}`, `${first} ${last}`, role, manager, ts(joined), left ? ts(left) : null]);
      const p = { id, team, role, joined, left, skill: r.lognormal(1, 0.5) };
      people.push(p);
      return p;
    };
    const vp = hire('vp', null, null, created + r.int(0, 30) * DAY);
    const directors = tops.map(t => hire('director', t, vp.id, created + r.int(10, 200) * DAY));
    const managerOf = new Map();
    for (const t of orgTeams) {
      const top = (() => { let id = t.id; while (teams[id - 1][3] !== null) id = teams[id - 1][3]; return id; })();
      const director = directors[tops.indexOf(top)];
      if (t.depth === 0) { managerOf.set(t.id, director); continue; }
      managerOf.set(t.id, hire('manager', t.id, director.id, created + r.int(30, 600) * DAY));
    }
    const ics = Math.max(0, size - people.length);
    for (let k = 0; k < ics; k++) {
      const t = r.pick(orgTeams);
      const role = r.weighted([['engineer', 45], ['senior_engineer', 30], ['staff_engineer', 8], ['contractor', 10], ['engineer', 7]]);
      const joined = Math.min(END - 5 * DAY, created + Math.floor(r.next() * (END - created)));
      const unassigned = r.chance(0.03);
      hire(role, unassigned ? null : t.id, unassigned ? vp.id : managerOf.get(t.id).id, joined);
    }
    // Repositories per team; some forks of other repositories in the org.
    const orgRepos = [];
    for (const t of orgTeams) {
      const n = r.poisson(1.6);
      for (let k = 0; k < n; k++) {
        const id = repos.length + 1;
        const fork = orgRepos.length > 2 && r.chance(0.07) ? r.pick(orgRepos) : null;
        const createdAt = Math.max(created, START - r.int(0, 900) * DAY);
        const archived = r.chance(0.08) ? START + r.int(30, 500) * DAY : null;
        repos.push([id, orgId, r.chance(0.04) ? null : t.id, fork ? `${repos[fork.id - 1][3]}-fork` : `${r.pick(REPO_WORDS)}-${r.pick(REPO_WORDS)}`, r.weighted(LANGUAGES), r.weighted([['private', 70], ['internal', 22], ['public', 8]]), ts(createdAt), archived && archived < END ? ts(archived) : null, fork ? fork.id : null]);
        orgRepos.push({ id, team: t.id, archived, activity: r.lognormal(1, 0.9), created: createdAt, head: null, merged: [] });
      }
    }
    // Development activity over the window.
    const teamMembers = id => people.filter(p => p.team === id && !['vp', 'director'].includes(p.role));
    for (const repo of orgRepos) {
      const members = teamMembers(repo.team);
      const pool = members.length ? members : people;
      const until = Math.min(END, repo.archived ?? END);
      // Initial commit before the window anchors the parent chain.
      const root = sha(`root:${repo.id}`);
      commits.push([root, repo.id, r.pick(pool).id, null, null, ts(Math.min(repo.created, START - DAY)), 'Initial commit', r.int(50, 4000), 0]);
      repo.head = root;
      const rate = 1.05 * repo.activity; // pull requests per month
      for (let t = Math.max(START, repo.created) + r.exponential(30 / rate) * DAY; t < until; t += r.exponential(30 / rate) * DAY) {
        const active = pool.filter(p => p.joined <= t && (!p.left || p.left > t));
        if (!active.length) continue;
        const author = r.weighted(active.map(p => [p, p.skill]));
        const prId = prs.length + 1;
        const size2 = Math.round(r.lognormal(80, 1.2));
        const opened = t;
        // Reviews: first response time grows with team load; changes requested sometimes.
        const reviewers = r.shuffle(active.filter(p => p !== author)).slice(0, r.weighted([[0, 6], [1, 55], [2, 32], [3, 7]]));
        let cursor = opened;
        let approved = false;
        for (const rv of reviewers) {
          cursor += Math.round(r.lognormal(5, 1.1) * HOUR);
          const state = r.weighted([['approved', 62], ['changes_requested', 20], ['commented', 18]]);
          if (cursor < END) reviews.push([0, prId, rv.id, ts(cursor), state]);
          if (state === 'approved') approved = true;
          if (state === 'changes_requested' && r.chance(0.7)) { cursor += Math.round(r.lognormal(10, 1) * HOUR); if (cursor < END) reviews.push([0, prId, rv.id, ts(cursor), 'approved']); approved = true; }
        }
        const fate = r.next();
        let merged = null, closed = null, state = 'open';
        const decided = cursor + Math.round(r.lognormal(4, 1) * HOUR);
        if (decided < until) {
          if ((approved || !reviewers.length) && fate < 0.86) { merged = decided; closed = decided; state = 'merged'; }
          else if (fate < 0.95 || reviewers.length) { closed = decided + r.int(1, 30) * DAY; state = closed < END ? 'closed' : 'open'; if (state === 'open') closed = null; }
        }
        prs.push([prId, repo.id, author.id, `${r.pick(PR_VERBS)} ${r.pick(PR_OBJECTS)}`, ts(opened), merged ? ts(merged) : null, closed ? ts(closed) : null, state, size2, Math.round(size2 * r.float(0.1, 0.9))]);
        // Commits on the PR branch; merged PRs advance the default branch head.
        const n = 1 + r.poisson(1.6);
        let parent = repo.head, ct = opened - r.int(1, 48) * HOUR;
        for (let k = 0; k < n; k++) {
          ct += r.int(5, 600) * MINUTE;
          const c = sha(`${repo.id}:${prId}:${k}`);
          const bot = r.chance(0.02);
          commits.push([c, repo.id, bot || r.chance(0.015) ? null : (k > 0 && r.chance(0.1) && reviewers.length ? reviewers[0].id : author.id), prId, parent, ts(Math.min(ct, END - MINUTE)), bot ? 'chore(deps): bump dependencies' : `${r.pick(PR_VERBS)} ${r.pick(PR_OBJECTS)}`, Math.round(size2 / n), Math.round(size2 / n * r.float(0.1, 0.8))]);
          parent = c;
        }
        if (merged) { repo.head = parent; repo.merged.push([prId, merged]); }
        // Direct pushes to the default branch happen occasionally.
        if (r.chance(0.08)) { const c = sha(`${repo.id}:push:${prId}`); commits.push([c, repo.id, author.id, null, repo.head, ts(Math.min(END - MINUTE, opened + r.int(1, 72) * HOUR)), 'Hotfix: revert config', r.int(1, 20), r.int(1, 20)]); repo.head = c; }
        // Deploy merged changes: staging then production.
        if (merged && r.chance(0.55) && merged < END - HOUR) {
          const auto = r.chance(0.5);
          for (const env of ['staging', 'production']) {
            if (env === 'production' && !r.chance(0.75)) break;
            const start = merged + (env === 'staging' ? r.int(5, 120) : r.int(150, 2000)) * MINUTE;
            if (start >= END) break;
            const dur = r.int(3, 40) * MINUTE;
            const roll = r.next();
            const status = start + dur >= END ? 'in_progress' : roll < 0.07 ? 'failed' : roll < 0.1 ? 'rolled_back' : 'success';
            const id = deployments.length + 1;
            deployments.push([id, repo.id, env, repo.head, auto ? null : r.pick(active).id, ts(start), status === 'in_progress' ? null : ts(start + dur), status]);
            if (status === 'failed') break;
            if (env === 'production' && (status === 'rolled_back' || r.chance(0.012))) {
              const opened2 = start + dur + r.int(2, 90) * MINUTE;
              if (opened2 < END) {
                const sev = r.weighted([['sev1', 8], ['sev2', 22], ['sev3', 45], ['sev4', 25]]);
                const ack = opened2 + r.int(1, sev === 'sev1' ? 10 : 45) * MINUTE;
                const res = ack + Math.round(r.lognormal(sev === 'sev1' ? 90 : 180, 0.9) * MINUTE);
                incidents.push([0, repo.id, id, sev, ts(opened2), ack < END ? ts(ack) : null, res < END ? ts(res) : null, r.chance(0.9) ? r.pick(active).id : null]);
              }
            }
          }
        }
      }
      // Issues: bugs, features and follow-ups; many linked to merged PRs.
      const issueRate = 0.55 * repo.activity;
      for (let t = Math.max(START, repo.created) + r.exponential(30 / issueRate) * DAY; t < until; t += r.exponential(30 / issueRate) * DAY) {
        const active = pool.filter(p => p.joined <= t && (!p.left || p.left > t));
        if (!active.length) continue;
        const type = r.weighted([['bug', 40], ['feature', 30], ['task', 25], ['incident_followup', 5]]);
        const priority = type === 'incident_followup' ? r.pick(['p0', 'p1']) : r.weighted([['p0', 3], ['p1', 15], ['p2', 50], ['p3', 32]]);
        const close = r.chance(0.72) ? t + Math.round(r.lognormal(priority === 'p0' ? 1.5 : priority === 'p1' ? 6 : 20, 1.1) * DAY) : null;
        const linked = close && r.chance(0.55) ? repo.merged.filter(([, m]) => m <= close && m >= t).at(-1)?.[0] ?? null : null;
        issues.push([0, repo.id, r.pick(active).id, r.chance(0.85) ? r.pick(active).id : null, type, priority, ts(t), close && close < END ? ts(close) : null, close && close < END ? linked : null]);
      }
    }
    // Incidents not caused by a deployment.
    for (let k = 0, n = r.poisson(orgRepos.length * 0.25); k < n && orgRepos.length; k++) {
      const repo = r.pick(orgRepos);
      const opened = START + r.int(1, 540) * DAY + r.int(0, 23) * HOUR;
      if (opened >= END) continue;
      const sev = r.weighted([['sev1', 5], ['sev2', 20], ['sev3', 45], ['sev4', 30]]);
      const ack = opened + r.int(1, 60) * MINUTE;
      const res = ack + Math.round(r.lognormal(240, 1) * MINUTE);
      incidents.push([0, repo.id, null, sev, ts(opened), r.chance(0.97) && ack < END ? ts(ack) : null, res < END ? ts(res) : null, r.chance(0.85) ? r.pick(people).id : null]);
    }
  }
  reviews.sort((a, b) => (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : a[1] - b[1]));
  reviews.forEach((v, i) => { v[0] = i + 1; });
  issues.sort((a, b) => (a[6] < b[6] ? -1 : a[6] > b[6] ? 1 : a[1] - b[1]));
  issues.forEach((v, i) => { v[0] = i + 1; });
  incidents.sort((a, b) => (a[4] < b[4] ? -1 : a[4] > b[4] ? 1 : a[1] - b[1]));
  incidents.forEach((v, i) => { v[0] = i + 1; });
  return { organizations: orgs, teams, developers: devs, repositories: repos, pull_requests: prs, commits, reviews, issues, deployments, incidents };
}

const dataset = {
  id: 'developer',
  version: '3.0.0',
  name: 'Developer Platform',
  domain: 'Software engineering',
  kind: 'synthetic',
  description: 'Eighteen months of activity on a fictional code-hosting platform: organizations, nested teams, developers and managers, repositories and forks, pull requests, reviews, commits, issues, deployments and incidents.',
  source: {
    publisher: 'Runtime',
    url: 'https://github.com/KrishnaSathvik/runtime.school',
    release: `Runtime developer-platform generator ${GENERATOR_VERSION}, seed ${SEED}`,
    license: 'Runtime-owned synthetic data',
    licenseUrl: 'https://github.com/KrishnaSathvik/runtime.school',
    commercialReuse: 'permitted',
    attribution: 'Synthetic data generated by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'Organizations have nested teams (up to four levels) and a management chain from VP to engineers.',
      'Repository activity drives pull requests; reviewers come from the owning team; merged PRs advance the commit chain and can be deployed.',
      'Rolled-back production deployments can open incidents; other incidents have no deployment cause.',
    ],
  },
  reproduction: { command: 'node datasets/build.mjs developer', implementation: 'datasets/developer/dataset.mjs', seed: SEED, notes: `Generator version ${GENERATOR_VERSION}; deterministic for a given seed.` },
  coverage: { start: '2024-01-01', end: '2025-06-30', grain: 'commit; pull request; deployment' },
  tables,
  edgeCases: [
    'Team hierarchy up to four levels; management chains of different depth',
    'Developers with no team; repositories with no owning team',
    'Forks referencing their source repository',
    'Commits with no linked author (bots, unlinked emails) and direct pushes without a PR',
    'Pull requests with no reviews, several reviews, or changes requested then approved',
    'Open pull requests and issues at the end of the data',
    'Failed and rolled-back deployments; incidents with and without a deployment cause',
    'Developers who left during the period',
  ],
  qualityNotes: [
    'Review time is measured from pull_requests.created_at to the first review’s submitted_at.',
    'A developer can author and review in the same repository but never reviews their own pull request.',
    'Deployment frequency and change failure rate are computed on production deployments.',
  ],
  concepts: ['recursive CTEs', 'hierarchies', 'self joins', 'UNION', 'INTERSECT/EXCEPT', 'relational division', 'graph-like relationships', 'symmetric pairs', 'DDL'],
  rows: () => generate(),
  mutation: `
DELETE FROM reviews WHERE review_id % 89 = 0;
UPDATE pull_requests SET merged_at = NULL, state = 'closed' WHERE pull_request_id % 101 = 0 AND state = 'merged';
UPDATE deployments SET status = 'failed' WHERE deployment_id % 67 = 0 AND status = 'success';
UPDATE developers SET manager_id = NULL WHERE developer_id = (SELECT MIN(developer_id) FROM developers WHERE role = 'manager');
INSERT INTO teams VALUES ((SELECT MAX(team_id) + 1 FROM teams), 1, 'Runtime Test Team', (SELECT MAX(team_id) FROM teams WHERE organization_id = 1));
UPDATE issues SET closed_at = NULL, linked_pull_request_id = NULL WHERE issue_id % 53 = 0;
UPDATE incidents SET resolved_at = NULL WHERE incident_id % 11 = 0;
UPDATE developers SET joined_at = '2025-01-01 00:00:00' WHERE developer_id = (SELECT MAX(developer_id) FROM developers WHERE joined_at >= '2024-12-01' AND joined_at < '2025-01-01' AND role = 'engineer');
INSERT INTO developers VALUES ((SELECT MAX(developer_id) + 1 FROM developers), 1, NULL, 'rtnew01', 'Robin New', 'engineer', (SELECT developer_id FROM developers WHERE organization_id = 1 AND manager_id IS NULL), '2024-12-31 22:00:00', NULL);
UPDATE developers SET team_id = NULL WHERE developer_id = (SELECT MIN(developer_id) FROM developers WHERE organization_id = 1 AND team_id IS NOT NULL AND role = 'engineer');
INSERT INTO pull_requests SELECT (SELECT MAX(pull_request_id) + 1 FROM pull_requests), repository_id, author_id, 'Add runtime probe', '2025-06-29 10:00:00', NULL, NULL, 'open', 10, 2 FROM pull_requests WHERE pull_request_id = 1;
INSERT INTO teams VALUES ((SELECT MAX(team_id) + 1 FROM teams), 2, 'Runtime Probe Squad', (SELECT MAX(team_id) FROM teams WHERE organization_id = 2 AND parent_team_id IS NOT NULL));
UPDATE developers SET manager_id = (SELECT developer_id FROM developers WHERE organization_id = 2 AND manager_id IS NULL) WHERE developer_id = (SELECT MAX(developer_id) FROM developers WHERE organization_id = 2 AND role = 'engineer');
`,
  contract: {
    totalRows: [75000, 125000],
    minRows: { organizations: 50, teams: 200, developers: 2000, repositories: 400, pull_requests: 10000, commits: 25000, reviews: 10000, issues: 5000, deployments: 3000, incidents: 200 },
    checks: [
      { name: 'months with pull requests', sql: "SELECT COUNT(DISTINCT substr(created_at, 1, 7)) FROM pull_requests", equals: 18 },
      { name: 'largest repository share of PRs', sql: maxShare('pull_requests', 'repository_id'), max: 0.04 },
      { name: 'team hierarchy depth ≥ 3', sql: 'WITH RECURSIVE d(team_id, depth) AS (SELECT team_id, 1 FROM teams WHERE parent_team_id IS NULL UNION ALL SELECT t.team_id, d.depth + 1 FROM teams t JOIN d ON t.parent_team_id = d.team_id) SELECT MAX(depth) FROM d', min: 3 },
      { name: 'management chain depth ≥ 4', sql: 'WITH RECURSIVE m(developer_id, depth) AS (SELECT developer_id, 1 FROM developers WHERE manager_id IS NULL UNION ALL SELECT d.developer_id, m.depth + 1 FROM developers d JOIN m ON d.manager_id = m.developer_id) SELECT MAX(depth) FROM m', min: 4 },
      { name: 'forks', sql: 'SELECT COUNT(forked_from_repository_id) FROM repositories', min: 10 },
      { name: 'commits without author', sql: nulls('commits', 'author_id'), min: 200 },
      { name: 'direct pushes', sql: nulls('commits', 'pull_request_id'), min: 500 },
      { name: 'PRs without reviews', sql: 'SELECT COUNT(*) FROM pull_requests p WHERE NOT EXISTS (SELECT 1 FROM reviews r WHERE r.pull_request_id = p.pull_request_id)', min: 300 },
      { name: 'self-reviews', sql: 'SELECT COUNT(*) FROM reviews r JOIN pull_requests p USING (pull_request_id) WHERE r.reviewer_id = p.author_id', equals: 0 },
      { name: 'mutual reviewer pairs', sql: 'SELECT COUNT(*) FROM (SELECT DISTINCT p.author_id AS a, r.reviewer_id AS b FROM reviews r JOIN pull_requests p USING (pull_request_id)) x WHERE x.a < x.b AND EXISTS (SELECT 1 FROM reviews r2 JOIN pull_requests p2 USING (pull_request_id) WHERE p2.author_id = x.b AND r2.reviewer_id = x.a)', min: 500 },
      { name: 'deployment statuses', sql: distinct('deployments', 'status'), min: 3 },
      { name: 'incidents caused by deployments', sql: 'SELECT COUNT(deployment_id) FROM incidents', min: 30 },
      { name: 'incidents without deployment cause', sql: nulls('incidents', 'deployment_id'), min: 50 },
      { name: 'developers who left', sql: 'SELECT COUNT(left_at) FROM developers', min: 100 },
      { name: 'unassigned developers', sql: nulls('developers', 'team_id'), min: 20 },
    ],
  },
};

export default dataset;
