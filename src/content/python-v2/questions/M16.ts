/**
 * M16 practice: ten independent problems on the collections and itertools tools of PY-L16-01 … PY-L16-05.
 *
 * Mix: 6 function implementations, 1 data transformation, 2 debugging (a feed built in the wrong order, a priority
 * queue that reverses its urgent jobs), 1 output prediction. Easy: 02, 03, 06, 10. Medium: 12, 16, 19, 20.
 * Hard: 13, 22.
 *
 * Fixtures are small slices of course datasets: Runtime Q&A (D12: answers, scores, tags, users) and Runtime
 * Repository Events (D11: activity, webhooks, CI builds), plus an inline org chart (F00). Function questions are graded
 * by calling the learner's function on the public examples and on hidden inputs (empty, single, ties, boundaries,
 * unsorted input). Results are compared as plain values, so a function that returns a Counter or defaultdict where a
 * dict or list is asked for fails, as it would for a caller. Version 2: every question was replaced; saved progress
 * from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** A Python tuple of plain values. */
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));
/** A dict with int keys (question IDs). */
const byId = (entries: [number, unknown][]) => py.dict(entries.map(([k, v]) => [py.int(k), pv(v)]));

// ---------------------------------------------------------------- fixtures

const answers = [
  { answer_id: 9001, question_id: 101, score: 3 },
  { answer_id: 9002, question_id: 102, score: 5 },
  { answer_id: 9003, question_id: 101, score: 7 },
  { answer_id: 9004, question_id: 101, score: 3 },
];

const feedEvents = ["maya-k pushed 3 commits", "devon-r starred fast-parser", "lena-o opened issue 412", "maya-k pushed 1 commit", "ci-bot released v2.1.0", "devon-r commented on 412"];

const owners = [
  { answer_id: 9101, owner_user_id: 7 },
  { answer_id: 9102, owner_user_id: 12 },
  { answer_id: 9103, owner_user_id: 7 },
  { answer_id: 9104, owner_user_id: 31 },
  { answer_id: 9105, owner_user_id: 7 },
];

const posts = [
  { owner: "maya-k", posted: 1000 },
  { owner: "devon-r", posted: 1030 },
  { owner: "maya-k", posted: 1200 },
  { owner: "devon-r", posted: 1075 },
];

const builds = [
  { date: "2025-03-03", status: "passing" },
  { date: "2025-03-04", status: "passing" },
  { date: "2025-03-05", status: "failing" },
  { date: "2025-03-06", status: "failing" },
  { date: "2025-03-07", status: "passing" },
];

const users = [
  { name: "maya-k", tags: ["python", "pandas", "datetime"] },
  { name: "devon-r", tags: ["rust", "cli"] },
  { name: "lena-o", tags: ["pandas", "python", "numpy"] },
  { name: "sam-t", tags: ["python", "cli"] },
];

const org = [
  { name: "Ada", manager: null },
  { name: "Ben", manager: "Ada" },
  { name: "Cy", manager: "Ada" },
  { name: "Dee", manager: "Ben" },
  { name: "Eve", manager: "Dee" },
];

/** Prerequisite tags shared by most questions: an imported tool inside a function over lists and dictionaries. */
const fnBase = ["import-module", "function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "dict-literal", "dict-lookup", "string-index", "for-loop", "membership", "if-statement", "print-call", "unquoted-name", "top-level-indent"] as const;

export const m16Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q16-02",
    version: 2,
    slug: "answers-best-first",
    title: "Each question's answers, best first",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "defaultdict-call", "list-mutate", "dict-iterate", "lambda", "sort-key", "list-sort", "list-comp", "arithmetic", "boolean"],
    prompt: "A Q&A page shows the answers to each question with the highest score first. Write `answers_by_question(answers)`: return a plain dictionary from each question ID to the IDs of its answers, highest score first. Answers with the same score stay in the order they were posted (their order in the list).",
    spec: [
      ["Function", "`answers_by_question(answers)`"],
      ["answers", "a list of dictionaries with `answer_id`, `question_id` and `score` (scores can be negative)"],
      ["Returns", "a plain `dict` of question ID → list of answer IDs, highest score first"],
    ],
    hiddenKinds: ["answers with equal scores", "negative scores", "a single answer", "no answers"],
    hints: [
      "First collect each question's answers together: a `defaultdict(list)` keyed by question ID.",
      "Then order each group by score, highest first. Python's sort keeps equal scores in their original order.",
      "Keep only the answer IDs, and hand back a plain dictionary.",
    ],
    explanation: "Grouping with `defaultdict(list)` puts each answer under its question without a setup line. Sorting each group with `key=lambda a: -a[\"score\"]` (or `reverse=True`) puts the best first, and because Python's sort is stable, answers with equal scores keep their posting order. Sorting every answer first and then grouping works too. Returning the groups unsorted, sorting by answer ID, or returning the defaultdict itself all fail.",
    code: {
      starter: src`
from collections import defaultdict

def answers_by_question(answers):
    return {}

answers = [
    {"answer_id": 9001, "question_id": 101, "score": 3},
    {"answer_id": 9002, "question_id": 102, "score": 5},
    {"answer_id": 9003, "question_id": 101, "score": 7},
    {"answer_id": 9004, "question_id": 101, "score": 3},
]
print(answers_by_question(answers))
`,
      answer: src`
from collections import defaultdict

def answers_by_question(answers):
    grouped = defaultdict(list)
    for answer in answers:
        grouped[answer["question_id"]].append(answer)
    best_first = {}
    for question_id, group in grouped.items():
        ranked = sorted(group, key=lambda a: -a["score"])
        best_first[question_id] = [a["answer_id"] for a in ranked]
    return best_first

answers = [
    {"answer_id": 9001, "question_id": 101, "score": 3},
    {"answer_id": 9002, "question_id": 102, "score": 5},
    {"answer_id": 9003, "question_id": 101, "score": 7},
    {"answer_id": 9004, "question_id": 101, "score": 3},
]
print(answers_by_question(answers))
`,
      alternatives: [
        src`
from collections import defaultdict

def answers_by_question(answers):
    grouped = defaultdict(list)
    for answer in sorted(answers, key=lambda a: a["score"], reverse=True):
        grouped[answer["question_id"]].append(answer["answer_id"])
    return dict(grouped)
`,
      ],
      wrong: [
        {
          code: src`
from collections import defaultdict

def answers_by_question(answers):
    grouped = defaultdict(list)
    for answer in answers:
        grouped[answer["question_id"]].append(answer["answer_id"])
    return dict(grouped)
`,
          fails: ["returns"],
          why: "the answers stay in posting order instead of best first",
        },
        {
          code: src`
from collections import defaultdict

def answers_by_question(answers):
    grouped = defaultdict(list)
    for answer in sorted(answers, key=lambda a: a["score"], reverse=True):
        grouped[answer["question_id"]].append(answer["answer_id"])
    return grouped
`,
          fails: ["returns"],
          why: "it returns the defaultdict itself instead of a plain dictionary",
        },
        {
          code: src`
from collections import defaultdict

def answers_by_question(answers):
    grouped = defaultdict(list)
    for answer in sorted(answers, key=lambda a: a["score"]):
        grouped[answer["question_id"]].append(answer["answer_id"])
    return dict(grouped)
`,
          fails: ["returns"],
          why: "ascending order puts the lowest score first",
        },
      ],
      task: {
        checks: [
          fn("returns", "answers_by_question", [
            example([answers], byId([[101, [9003, 9001, 9004]], [102, [9002]]])),
            example([[{ answer_id: 1, question_id: 5, score: 0 }, { answer_id: 2, question_id: 5, score: 2 }]], byId([[5, [2, 1]]])),
            example([[]], {}),
            hiddenCase("answers with equal scores", [[{ answer_id: 30, question_id: 1, score: 4 }, { answer_id: 10, question_id: 1, score: 4 }, { answer_id: 20, question_id: 1, score: 4 }]], byId([[1, [30, 10, 20]]])),
            hiddenCase("negative scores", [[{ answer_id: 1, question_id: 9, score: -2 }, { answer_id: 2, question_id: 9, score: -1 }, { answer_id: 3, question_id: 8, score: -5 }]], byId([[9, [2, 1]], [8, [3]]])),
            hiddenCase("a single answer", [[{ answer_id: 77, question_id: 3, score: 1 }]], byId([[3, [77]]])),
          ], { label: "answers_by_question() groups answers, best score first" }),
        ],
      },
    },
  },
  {
    id: "PY-Q16-03",
    version: 2,
    slug: "newest-activity-first",
    title: "The activity feed shows the oldest events",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "deque-call", "function-default", "print-several", "print-text", "while-loop", "truthiness", "list-mutate"],
    prompt: "A repository page shows an activity feed: the newest `limit` events, **newest first**. `activity_feed` keeps the right number of events, but it lists them oldest first. Fix it.",
    spec: [
      ["Function", "`activity_feed(events, limit=4)`"],
      ["events", "a list of event descriptions, oldest first"],
      ["Returns", "a list of at most `limit` events: the newest ones, newest first"],
    ],
    hiddenKinds: ["exactly as many events as the limit", "a limit of one", "no events", "the same event twice"],
    hints: [
      "Run the starter: which end of the deque do new events go on, and which end does the list start from?",
      "A deque can add on either end. With `maxlen`, adding on one end drops an item from the **other** end.",
      "Add each new event on the left, so the newest is first and the oldest falls off the right.",
    ],
    explanation: "`append` adds each event on the right, so `list(feed)` starts with the oldest of the kept events. With `appendleft`, the newest event is always at the front, and because the deque has a `maxlen`, a full feed drops its oldest event from the right end. Removing the `maxlen` keeps every event; walking the events in reverse with `append` keeps the **oldest** four; sorting the text has nothing to do with time.",
    code: {
      starter: src`
from collections import deque

def activity_feed(events, limit=4):
    feed = deque(maxlen=limit)
    for event in events:
        feed.append(event)
    return list(feed)

events = ["maya-k pushed 3 commits", "devon-r starred fast-parser", "lena-o opened issue 412", "maya-k pushed 1 commit", "ci-bot released v2.1.0", "devon-r commented on 412"]
for line in activity_feed(events):
    print(line)
`,
      answer: src`
from collections import deque

def activity_feed(events, limit=4):
    feed = deque(maxlen=limit)
    for event in events:
        feed.appendleft(event)
    return list(feed)

events = ["maya-k pushed 3 commits", "devon-r starred fast-parser", "lena-o opened issue 412", "maya-k pushed 1 commit", "ci-bot released v2.1.0", "devon-r commented on 412"]
for line in activity_feed(events):
    print(line)
`,
      alternatives: [
        src`
from collections import deque

def activity_feed(events, limit=4):
    feed = deque(maxlen=limit)
    for event in events:
        feed.append(event)
    newest_first = []
    while feed:
        newest_first.append(feed.pop())
    return newest_first
`,
      ],
      wrong: [
        {
          code: src`
from collections import deque

def activity_feed(events, limit=4):
    feed = deque()
    for event in events:
        feed.appendleft(event)
    return list(feed)
`,
          fails: ["returns"],
          why: "without `maxlen` every event is kept, not just the newest few",
        },
        {
          code: src`
from collections import deque

def activity_feed(events, limit=4):
    feed = deque(maxlen=limit)
    for event in events[::-1]:
        feed.append(event)
    return list(feed)
`,
          fails: ["returns"],
          why: "walking backwards and appending keeps the **oldest** events, because the newest fall off first",
        },
      ],
      task: {
        checks: [
          fn("returns", "activity_feed", [
            example([feedEvents], ["devon-r commented on 412", "ci-bot released v2.1.0", "maya-k pushed 1 commit", "lena-o opened issue 412"]),
            example([feedEvents], ["devon-r commented on 412", "ci-bot released v2.1.0"], { kwargs: { limit: 2 } }),
            example([["first push"]], ["first push"]),
            hiddenCase("exactly as many events as the limit", [["a", "b", "c", "d"]], ["d", "c", "b", "a"]),
            hiddenCase("a limit of one", [["old", "new"]], ["new"], { kwargs: { limit: 1 } }),
            hiddenCase("no events", [[]], []),
            hiddenCase("the same event twice", [["fork", "star", "star"], 3], ["star", "star", "fork"]),
          ], { label: "activity_feed() lists the newest events first" }),
        ],
      },
    },
  },
  {
    id: "PY-Q16-06",
    version: 2,
    slug: "answers-per-user",
    title: "How many answers has each user written?",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "counter-call", "list-comp", "print-several", "arithmetic", "list-mutate"],
    prompt: "A moderator dashboard asks for the number of answers written by a list of users, in the order it asks for them. Some of those users haven't answered anything. Write `answer_counts(answers, user_ids)`.",
    spec: [
      ["Function", "`answer_counts(answers, user_ids)`"],
      ["answers", "a list of dictionaries with `answer_id` and `owner_user_id`"],
      ["user_ids", "the users to report on, in order (a user may be asked for twice)"],
      ["Returns", "a list with one count per entry of `user_ids`; 0 for a user with no answers"],
    ],
    hiddenKinds: ["a user with no answers", "the same user asked for twice", "no answers at all", "no users asked for"],
    hints: [
      "Count the answers per owner once, before looking at the requested users.",
      "A Counter gives 0 for an owner it never saw, so no `if` is needed.",
      "Build the result by walking `user_ids`, so the counts come out in the order they were asked for.",
    ],
    explanation: "`Counter(answer[\"owner_user_id\"] for answer in answers)` counts every owner in one pass. Reading `counts[user_id]` for each requested user gives the counts in the requested order, with 0 for users who never answered. Returning `list(counts.values())` ignores which users were asked for, and a plain dictionary lookup raises KeyError for a user with no answers.",
    code: {
      starter: src`
from collections import Counter

def answer_counts(answers, user_ids):
    return []

answers = [
    {"answer_id": 9101, "owner_user_id": 7},
    {"answer_id": 9102, "owner_user_id": 12},
    {"answer_id": 9103, "owner_user_id": 7},
    {"answer_id": 9104, "owner_user_id": 31},
    {"answer_id": 9105, "owner_user_id": 7},
]
print(answer_counts(answers, [7, 31, 99]))
`,
      answer: src`
from collections import Counter

def answer_counts(answers, user_ids):
    counts = Counter(answer["owner_user_id"] for answer in answers)
    return [counts[user_id] for user_id in user_ids]

answers = [
    {"answer_id": 9101, "owner_user_id": 7},
    {"answer_id": 9102, "owner_user_id": 12},
    {"answer_id": 9103, "owner_user_id": 7},
    {"answer_id": 9104, "owner_user_id": 31},
    {"answer_id": 9105, "owner_user_id": 7},
]
print(answer_counts(answers, [7, 31, 99]))
`,
      alternatives: [
        src`
from collections import Counter

def answer_counts(answers, user_ids):
    counts = Counter()
    for answer in answers:
        counts[answer["owner_user_id"]] += 1
    result = []
    for user_id in user_ids:
        result.append(counts[user_id])
    return result
`,
      ],
      wrong: [
        {
          code: src`
from collections import Counter

def answer_counts(answers, user_ids):
    counts = Counter(answer["owner_user_id"] for answer in answers)
    return list(counts.values())
`,
          fails: ["returns"],
          why: "it lists every owner's count, ignoring which users were asked for",
        },
        {
          code: src`
def answer_counts(answers, user_ids):
    counts = {}
    for answer in answers:
        owner = answer["owner_user_id"]
        if owner not in counts:
            counts[owner] = 0
        counts[owner] += 1
    return [counts[user_id] for user_id in user_ids]
`,
          fails: ["returns"],
          why: "a plain dictionary raises KeyError for a user with no answers",
        },
      ],
      task: {
        checks: [
          fn("returns", "answer_counts", [
            example([owners, [7, 31, 99]], [3, 1, 0]),
            example([owners, [12]], [1]),
            example([owners, [31, 7]], [1, 3]),
            hiddenCase("a user with no answers", [owners, [5]], [0]),
            hiddenCase("the same user asked for twice", [owners, [7, 12, 7]], [3, 1, 3]),
            hiddenCase("no answers at all", [[], [7, 12]], [0, 0]),
            hiddenCase("no users asked for", [owners, []], []),
          ], { label: "answer_counts() reports each requested user's answers" }),
        ],
      },
    },
  },
  {
    id: "PY-Q16-10",
    version: 2,
    slug: "answers-posted-too-fast",
    title: "Answers posted too fast",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "combinations-call", "tuple-unpack", "arithmetic", "comparison", "logical", "boolean", "print-several", "nested-condition", "any-call"],
    prompt: "A spam filter flags a user who posts two answers within a short time of each other. Write `has_burst(posts, gap)`: return `True` if any two posts by the **same** user were made less than `gap` seconds apart, otherwise `False`. The posts are not in time order.",
    spec: [
      ["Function", "`has_burst(posts, gap)`"],
      ["posts", "a list of dictionaries with `owner` and `posted` (a time in seconds)"],
      ["Returns", "`True` or `False`"],
      ["Rules", "exactly `gap` seconds apart is fine; posts by different users never count; the earlier post may come later in the list"],
    ],
    hiddenKinds: ["two posts exactly the gap apart", "a close pair that is not next to each other in the list", "close posts by different users", "fewer than two posts"],
    hints: [
      "Every pair of posts has to be compared, so walk every pair once.",
      "A pair only matters when both posts have the same owner.",
      "The later post may come first in the list, so the difference can be negative: check it in both directions.",
    ],
    explanation: "`combinations(posts, 2)` visits every pair of posts once. A pair is a burst when the owners match and the times differ by less than `gap` in either direction, which `a - b < gap and b - a < gap` checks without caring which post is later. Comparing only neighbours in the list misses a close pair that isn't adjacent, because the list isn't sorted by time; ignoring the owner flags two different users; and `<=` flags posts exactly `gap` apart.",
    code: {
      starter: src`
from itertools import combinations

def has_burst(posts, gap):
    return False

posts = [
    {"owner": "maya-k", "posted": 1000},
    {"owner": "devon-r", "posted": 1030},
    {"owner": "maya-k", "posted": 1200},
    {"owner": "devon-r", "posted": 1075},
]
print(has_burst(posts, 60), has_burst(posts, 30))
`,
      answer: src`
from itertools import combinations

def has_burst(posts, gap):
    for a, b in combinations(posts, 2):
        if a["owner"] == b["owner"]:
            difference = a["posted"] - b["posted"]
            if difference < gap and -difference < gap:
                return True
    return False

posts = [
    {"owner": "maya-k", "posted": 1000},
    {"owner": "devon-r", "posted": 1030},
    {"owner": "maya-k", "posted": 1200},
    {"owner": "devon-r", "posted": 1075},
]
print(has_burst(posts, 60), has_burst(posts, 30))
`,
      alternatives: [
        src`
from itertools import combinations

def too_close(a, b, gap):
    return a["owner"] == b["owner"] and a["posted"] - b["posted"] < gap and b["posted"] - a["posted"] < gap

def has_burst(posts, gap):
    return any(too_close(a, b, gap) for a, b in combinations(posts, 2))
`,
      ],
      wrong: [
        {
          code: src`
def has_burst(posts, gap):
    for i in range(len(posts) - 1):
        a = posts[i]
        b = posts[i + 1]
        if a["owner"] == b["owner"] and a["posted"] - b["posted"] < gap and b["posted"] - a["posted"] < gap:
            return True
    return False
`,
          fails: ["returns"],
          why: "only posts next to each other in the list are compared, and the list isn't in time order",
        },
        {
          code: src`
from itertools import combinations

def has_burst(posts, gap):
    for a, b in combinations(posts, 2):
        if a["posted"] - b["posted"] < gap and b["posted"] - a["posted"] < gap:
            return True
    return False
`,
          fails: ["returns"],
          why: "the owner is never compared, so two different users posting close together are flagged",
        },
        {
          code: src`
from itertools import combinations

def has_burst(posts, gap):
    for a, b in combinations(posts, 2):
        if a["owner"] == b["owner"] and a["posted"] - b["posted"] <= gap and b["posted"] - a["posted"] <= gap:
            return True
    return False
`,
          fails: ["returns"],
          why: "`<=` flags two posts exactly `gap` seconds apart",
        },
      ],
      task: {
        checks: [
          fn("returns", "has_burst", [
            example([posts, 60], true),
            example([posts, 30], false),
            example([[{ owner: "lena-o", posted: 50 }], 600], false),
            hiddenCase("two posts exactly the gap apart", [[{ owner: "a", posted: 100 }, { owner: "a", posted: 160 }], 60], false),
            hiddenCase("a close pair that is not next to each other in the list", [[{ owner: "a", posted: 500 }, { owner: "b", posted: 900 }, { owner: "a", posted: 20 }, { owner: "a", posted: 510 }], 60], true),
            hiddenCase("close posts by different users", [[{ owner: "a", posted: 10 }, { owner: "b", posted: 11 }, { owner: "c", posted: 12 }], 60], false),
            hiddenCase("fewer than two posts", [[], 60], false),
          ], { label: "has_burst() finds two close posts by one user" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q16-12",
    version: 2,
    slug: "looking-creates-the-key",
    title: "Looking at a defaultdict",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["import-module", "defaultdict-call", "assignment", "list-mutate", "dict-lookup", "string-index", "membership", "if-statement", "truthiness", "list-sort", "len-call", "print-call", "print-several", "print-text", "top-level-indent", "unquoted-name"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`in` asks whether a key is there without creating it. Which of the two `if` lines only **asks**?",
      "Reading `views[\"search\"]` on a defaultdict creates the key with a new empty list. What is an empty list in an `if`?",
      "Count the keys at the end, then count the visitors stored under `home`.",
    ],
    explanation: "`\"cart\" in views` only checks, so nothing is created and nothing printed. `views[\"search\"]` is a read of a missing key, which makes the defaultdict store a new empty list under `search`; an empty list is false, so that message isn't printed either, but the key now exists. So there are two keys, `home` and `search`, and `home` holds two entries because `maya-k` was appended twice.",
    predict: {
      program: src`
from collections import defaultdict

views = defaultdict(list)
views["home"].append("maya-k")
if "cart" in views:
    print("cart seen")
if views["search"]:
    print("search seen")
views["home"].append("maya-k")
print(len(views), sorted(views), len(views["home"]))
`,
      output: "2 ['home', 'search'] 2\n",
      wrongPredictions: [
        "1 ['home'] 2",
        "2 ['home', 'search'] 1",
        "3 ['cart', 'home', 'search'] 2",
        "search seen\n2 ['home', 'search'] 2",
      ],
    },
  },
  {
    id: "PY-Q16-16",
    version: 2,
    slug: "top-tags-with-ties",
    title: "Top tags, keeping the ties",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 14,
    requires: [...fnBase, "counter-call", "list-comp", "comp-if", "comparison", "logical", "truthiness", "aggregate-call", "arithmetic", "tuple-literal", "print-several", "len-call", "precedence", "else-clause", "break-statement", "list-mutate", "tuple-unpack", "reassignment", "none-value"],
    prompt: "A weekly report lists the most used tags. `most_common(n)` cuts the list at exactly `n`, which is unfair when the tag in `n`th place is tied with others. Write `top_with_ties(tags, n)`: return every tag whose count is **at least** the count of the tag in `n`th place, as `(tag, count)` pairs, most used first.",
    spec: [
      ["Function", "`top_with_ties(tags, n)`"],
      ["tags", "a list of tag texts, one entry per use"],
      ["Returns", "a list of `(tag, count)` tuples, highest count first; equal counts keep the order the tags were first seen"],
      ["Rules", "`n` larger than the number of distinct tags returns them all; `n` of 0 or no tags returns `[]`"],
    ],
    hiddenKinds: ["several tags tied at the cut-off", "n larger than the number of tags", "n of zero", "no tags", "a single tag"],
    hints: [
      "Rank every tag first: `most_common()` with no number gives them all, highest first.",
      "The cut-off is the count of the tag in position `n`, remembering that positions start at 0.",
      "Keep every ranked pair whose count reaches the cut-off. Handle `n` of 0, no tags, and `n` past the end before reading a position.",
    ],
    explanation: "`Counter(tags).most_common()` ranks every tag, highest count first, ties in first-seen order. The `n`th tag sits at index `n - 1` (or the last index when `n` is larger than the list), and its count is the cut-off; every pair with a count at least that high is kept, so tags tied with the last place come along. `most_common(n)` drops tied tags; reading index `n` instead of `n - 1` sets the cut-off one place too low.",
    code: {
      starter: src`
from collections import Counter

def top_with_ties(tags, n):
    return Counter(tags).most_common(n)

tags = ["pandas", "python", "pandas", "numpy", "python", "sqlite", "regex", "numpy"]
print(top_with_ties(tags, 2))
`,
      answer: src`
from collections import Counter

def top_with_ties(tags, n):
    ranked = Counter(tags).most_common()
    if n <= 0 or not ranked:
        return []
    last_tag, cutoff = ranked[min(n, len(ranked)) - 1]
    return [pair for pair in ranked if pair[1] >= cutoff]

tags = ["pandas", "python", "pandas", "numpy", "python", "sqlite", "regex", "numpy"]
print(top_with_ties(tags, 2))
`,
      alternatives: [
        src`
from collections import Counter

def top_with_ties(tags, n):
    ranked = Counter(tags).most_common()
    kept = []
    last_count = None
    for tag, count in ranked:
        if len(kept) < n or count == last_count:
            kept.append((tag, count))
            last_count = count
        else:
            break
    return kept
`,
      ],
      wrong: [
        {
          code: src`
from collections import Counter

def top_with_ties(tags, n):
    return Counter(tags).most_common(n)
`,
          fails: ["returns"],
          why: "`most_common(n)` stops at exactly `n` and drops the tags tied with the last place",
        },
        {
          code: src`
from collections import Counter

def top_with_ties(tags, n):
    ranked = Counter(tags).most_common()
    if n <= 0 or not ranked:
        return []
    last_tag, cutoff = ranked[min(n, len(ranked) - 1)]
    return [pair for pair in ranked if pair[1] >= cutoff]
`,
          fails: ["returns"],
          why: "the cut-off is read one place too far down, so tags below the `n`th place sneak in",
        },
      ],
      task: {
        checks: [
          fn("returns", "top_with_ties", [
            example([["pandas", "python", "pandas", "numpy", "python", "sqlite", "regex", "numpy"], 2], [tup("pandas", 2), tup("python", 2), tup("numpy", 2)]),
            example([["pandas", "python", "pandas", "numpy", "python", "sqlite", "regex", "numpy"], 4], [tup("pandas", 2), tup("python", 2), tup("numpy", 2), tup("sqlite", 1), tup("regex", 1)]),
            example([["cli", "cli", "cli", "rust"], 1], [tup("cli", 3)]),
            hiddenCase("several tags tied at the cut-off", [["a", "a", "a", "b", "b", "c", "c", "d", "d", "e"], 2], [tup("a", 3), tup("b", 2), tup("c", 2), tup("d", 2)]),
            hiddenCase("n larger than the number of tags", [["x", "y", "x"], 10], [tup("x", 2), tup("y", 1)]),
            hiddenCase("n of zero", [["x", "y"], 0], []),
            hiddenCase("no tags", [[], 3], []),
            hiddenCase("a single tag", [["datetime"], 1], [tup("datetime", 1)]),
          ], { label: "top_with_ties() keeps every tag tied at the cut-off" }),
        ],
      },
    },
  },
  {
    id: "PY-Q16-19",
    version: 2,
    slug: "build-status-periods",
    title: "Passing and failing periods of a build",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "groupby-call", "lambda", "list-mutate", "tuple-literal", "print-several", "precedence", "comparison", "logical", "else-clause", "reassignment", "identity", "none-value"],
    prompt: "A repository's nightly build is either `passing` or `failing`. The status page summarises the history as periods: *passing from March 3 to March 4, failing from March 5 to March 6…*. Write `build_periods(builds)`: return one `(status, first_date, last_date)` tuple per run of consecutive builds with the same status.",
    spec: [
      ["Function", "`build_periods(builds)`"],
      ["builds", "a list of dictionaries with `date` (`YYYY-MM-DD`) and `status`, already in date order"],
      ["Returns", "a list of `(status, first_date, last_date)` tuples in date order; a one-day period has the same first and last date"],
    ],
    hiddenKinds: ["a single build", "the same status every day", "the status changing every day", "no builds"],
    hints: [
      "Neighbouring builds with the same status form one period: that is what groupby finds, with a key that reads the status.",
      "Don't sort: the periods are about time, and the builds are already in date order.",
      "Turn each run into a list, so you can read the date of its first and its last build.",
    ],
    explanation: "`groupby(builds, key=lambda b: b[\"status\"])` yields each run of consecutive builds with the same status. Turning the run into a list gives its first and last build, whose dates bound the period. Sorting by status first would merge separate failing periods into one; grouping the dictionaries without a key compares whole records, so every day becomes its own period; and reading only the first build's date loses where the period ends.",
    code: {
      starter: src`
from itertools import groupby

def build_periods(builds):
    return []

builds = [
    {"date": "2025-03-03", "status": "passing"},
    {"date": "2025-03-04", "status": "passing"},
    {"date": "2025-03-05", "status": "failing"},
    {"date": "2025-03-06", "status": "failing"},
    {"date": "2025-03-07", "status": "passing"},
]
for period in build_periods(builds):
    print(period)
`,
      answer: src`
from itertools import groupby

def build_periods(builds):
    periods = []
    for status, run in groupby(builds, key=lambda b: b["status"]):
        days = list(run)
        periods.append((status, days[0]["date"], days[-1]["date"]))
    return periods

builds = [
    {"date": "2025-03-03", "status": "passing"},
    {"date": "2025-03-04", "status": "passing"},
    {"date": "2025-03-05", "status": "failing"},
    {"date": "2025-03-06", "status": "failing"},
    {"date": "2025-03-07", "status": "passing"},
]
for period in build_periods(builds):
    print(period)
`,
      alternatives: [
        src`
def build_periods(builds):
    periods = []
    current = None
    for build in builds:
        if current is not None and current[0] == build["status"]:
            current = (current[0], current[1], build["date"])
        else:
            if current is not None:
                periods.append(current)
            current = (build["status"], build["date"], build["date"])
    if current is not None:
        periods.append(current)
    return periods
`,
      ],
      wrong: [
        {
          code: src`
from itertools import groupby

def build_periods(builds):
    periods = []
    ordered = sorted(builds, key=lambda b: b["status"])
    for status, run in groupby(ordered, key=lambda b: b["status"]):
        days = list(run)
        periods.append((status, days[0]["date"], days[-1]["date"]))
    return periods
`,
          fails: ["returns"],
          why: "sorting by status merges separate periods with the same status",
        },
        {
          code: src`
from itertools import groupby

def build_periods(builds):
    periods = []
    for build, run in groupby(builds):
        days = list(run)
        periods.append((build["status"], days[0]["date"], days[-1]["date"]))
    return periods
`,
          fails: ["returns"],
          why: "without a key, whole records are compared, and no two days' records are equal",
        },
        {
          code: src`
from itertools import groupby

def build_periods(builds):
    periods = []
    for status, run in groupby(builds, key=lambda b: b["status"]):
        first = list(run)[0]
        periods.append((status, first["date"], first["date"]))
    return periods
`,
          fails: ["returns"],
          why: "only the first build of each run is read, so every period seems to last one day",
        },
      ],
      task: {
        checks: [
          fn("returns", "build_periods", [
            example([builds], [tup("passing", "2025-03-03", "2025-03-04"), tup("failing", "2025-03-05", "2025-03-06"), tup("passing", "2025-03-07", "2025-03-07")]),
            example([[{ date: "2025-03-10", status: "failing" }, { date: "2025-03-11", status: "passing" }]], [tup("failing", "2025-03-10", "2025-03-10"), tup("passing", "2025-03-11", "2025-03-11")]),
            example([[]], []),
            hiddenCase("a single build", [[{ date: "2025-03-01", status: "passing" }]], [tup("passing", "2025-03-01", "2025-03-01")]),
            hiddenCase("the same status every day", [[{ date: "2025-03-01", status: "failing" }, { date: "2025-03-02", status: "failing" }, { date: "2025-03-03", status: "failing" }]], [tup("failing", "2025-03-01", "2025-03-03")]),
            hiddenCase("the status changing every day", [[{ date: "d1", status: "passing" }, { date: "d2", status: "failing" }, { date: "d3", status: "passing" }, { date: "d4", status: "failing" }]], [tup("passing", "d1", "d1"), tup("failing", "d2", "d2"), tup("passing", "d3", "d3"), tup("failing", "d4", "d4")]),
          ], { label: "build_periods() turns runs of equal statuses into periods" }),
        ],
      },
    },
  },
  {
    id: "PY-Q16-20",
    version: 2,
    slug: "most-similar-users",
    title: "The two users with the most in common",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 14,
    requires: [...fnBase, "combinations-call", "tuple-unpack", "tuple-literal", "set-op", "len-call", "comparison", "none-value", "reassignment", "print-several", "arithmetic", "logical", "aggregate-call", "lambda"],
    prompt: "A Q&A site introduces users who answer questions on the same topics. Write `most_similar_pair(users)`: return the names of the two users who share the most **distinct** tags, as a `(name, name)` tuple in the order `combinations` produces pairs. If several pairs share the same number, return the first of them. Return `None` when there are fewer than two users or no pair shares any tag.",
    spec: [
      ["Function", "`most_similar_pair(users)`"],
      ["users", "a list of dictionaries with `name` and `tags` (a list of texts; a user's list may repeat a tag)"],
      ["Returns", "a `(name, name)` tuple, or `None`"],
    ],
    hiddenKinds: ["two pairs sharing the same number of tags", "a tag repeated in one user's list", "no shared tags at all", "a single user"],
    hints: [
      "Every pair of users has to be compared: walk them with `combinations`.",
      "Count **distinct** shared tags: turn each list into a set and take the intersection.",
      "Keep the best pair so far, and replace it only when a pair shares strictly more, so the first of a tie wins and a score of 0 never does.",
    ],
    explanation: "Each pair from `combinations(users, 2)` is scored by `len(set(a_tags).intersection(b_tags))`, the number of distinct tags they share. The best pair is replaced only on a strictly higher score, starting from 0, so ties keep the earliest pair and a best score of 0 leaves the answer as `None`. Counting shared tags from the lists themselves counts a repeated tag twice; `>=` lets a later tied pair win; starting the best score below 0 returns a pair that shares nothing.",
    code: {
      starter: src`
from itertools import combinations

def most_similar_pair(users):
    return None

users = [
    {"name": "maya-k", "tags": ["python", "pandas", "datetime"]},
    {"name": "devon-r", "tags": ["rust", "cli"]},
    {"name": "lena-o", "tags": ["pandas", "python", "numpy"]},
    {"name": "sam-t", "tags": ["python", "cli"]},
]
print(most_similar_pair(users))
`,
      answer: src`
from itertools import combinations

def most_similar_pair(users):
    best = None
    best_shared = 0
    for a, b in combinations(users, 2):
        shared = len(set(a["tags"]).intersection(b["tags"]))
        if shared > best_shared:
            best = (a["name"], b["name"])
            best_shared = shared
    return best

users = [
    {"name": "maya-k", "tags": ["python", "pandas", "datetime"]},
    {"name": "devon-r", "tags": ["rust", "cli"]},
    {"name": "lena-o", "tags": ["pandas", "python", "numpy"]},
    {"name": "sam-t", "tags": ["python", "cli"]},
]
print(most_similar_pair(users))
`,
      alternatives: [
        src`
from itertools import combinations

def shared_tags(a, b):
    count = 0
    for tag in set(a["tags"]):
        if tag in b["tags"]:
            count += 1
    return count

def most_similar_pair(users):
    pairs = list(combinations(users, 2))
    if not pairs:
        return None
    best = max(pairs, key=lambda pair: shared_tags(pair[0], pair[1]))
    if shared_tags(best[0], best[1]) == 0:
        return None
    return (best[0]["name"], best[1]["name"])
`,
      ],
      wrong: [
        {
          code: src`
from itertools import combinations

def most_similar_pair(users):
    best = None
    best_shared = 0
    for a, b in combinations(users, 2):
        shared = len([tag for tag in a["tags"] if tag in b["tags"]])
        if shared > best_shared:
            best = (a["name"], b["name"])
            best_shared = shared
    return best
`,
          fails: ["returns"],
          why: "a tag repeated in one user's list is counted more than once",
        },
        {
          code: src`
from itertools import combinations

def most_similar_pair(users):
    best = None
    best_shared = 0
    for a, b in combinations(users, 2):
        shared = len(set(a["tags"]).intersection(b["tags"]))
        if shared >= best_shared and shared > 0:
            best = (a["name"], b["name"])
            best_shared = shared
    return best
`,
          fails: ["returns"],
          why: "`>=` lets a later pair with the same score replace the first one",
        },
        {
          code: src`
from itertools import combinations

def most_similar_pair(users):
    best = None
    best_shared = -1
    for a, b in combinations(users, 2):
        shared = len(set(a["tags"]).intersection(b["tags"]))
        if shared > best_shared:
            best = (a["name"], b["name"])
            best_shared = shared
    return best
`,
          fails: ["returns"],
          why: "starting below 0 returns a pair even when nobody shares a tag",
        },
      ],
      task: {
        checks: [
          fn("returns", "most_similar_pair", [
            example([users], tup("maya-k", "lena-o")),
            example([users.slice(1, 4)], tup("devon-r", "sam-t")),
            example([users.slice(0, 1)], null),
            hiddenCase("two pairs sharing the same number of tags", [[{ name: "a", tags: ["x", "y"] }, { name: "b", tags: ["x", "z"] }, { name: "c", tags: ["z", "y"] }]], tup("a", "b")),
            hiddenCase("a tag repeated in one user's list", [[{ name: "p", tags: ["sql", "sql", "sql"] }, { name: "q", tags: ["sql", "go"] }, { name: "r", tags: ["go", "rust"] }, { name: "s", tags: ["rust", "go"] }]], tup("r", "s")),
            hiddenCase("no shared tags at all", [[{ name: "a", tags: ["x"] }, { name: "b", tags: ["y"] }, { name: "c", tags: [] }]], null),
            hiddenCase("a single user", [[{ name: "solo", tags: ["python"] }]], null),
          ], { label: "most_similar_pair() finds the pair sharing the most distinct tags" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q16-13",
    version: 2,
    slug: "urgent-deliveries-out-of-order",
    title: "Urgent deliveries go out in the wrong order",
    format: "debugging",
    difficulty: "hard",
    minutes: 15,
    requires: [...fnBase, "deque-call", "list-mutate", "else-clause", "comparison", "truthiness", "boolean", "logical", "print-several", "print-text", "nested-condition", "nested-loop", "break-statement"],
    prompt: "A webhook sender queues deliveries and sends one each time it gets a `send` event. Security alerts are **urgent**: every urgent delivery must go before every normal one, but urgent deliveries among themselves, and normal ones among themselves, must keep the order they were added. `send_order` jumps urgent deliveries to the front with `appendleft`, and when two urgent ones are waiting, they go out in reverse. Fix it.",
    spec: [
      ["Function", "`send_order(events)`"],
      ["events", "a list of events: `[\"add\", name, urgent]` adds a delivery (`urgent` is True or False); `[\"send\"]` sends the next delivery, or does nothing if none is waiting"],
      ["Returns", "the names in the order they were sent"],
      ["Keep", "the function name and what it returns"],
    ],
    hiddenKinds: ["several urgent deliveries waiting at once", "an urgent delivery added while normal ones wait", "send with nothing waiting", "only normal deliveries", "no events"],
    hints: [
      "Add two urgent deliveries, then send twice. Which end of the deque does each one land on?",
      "One queue can't keep two orders at once. Keep urgent and normal deliveries in separate queues, each first-in-first-out.",
      "On `send`, take from the urgent queue if it has anything waiting, otherwise from the normal queue.",
    ],
    explanation: "`appendleft` puts each new urgent delivery in front of the earlier urgent ones, so they leave newest first. Keeping two first-in-first-out deques (append on the right, `popleft` on send) preserves the order within each kind, and checking the urgent queue first gives urgent deliveries priority. Popping the urgent queue from the right reverses them again; checking the normal queue first loses the priority; and forgetting the empty check crashes on a `send` with nothing waiting.",
    code: {
      starter: src`
from collections import deque

def send_order(events):
    queue = deque()
    sent = []
    for event in events:
        if event[0] == "add":
            if event[2]:
                queue.appendleft(event[1])
            else:
                queue.append(event[1])
        elif queue:
            sent.append(queue.popleft())
    return sent

events = [
    ["add", "push-hook-1", False],
    ["add", "alert-token-leak", True],
    ["add", "alert-new-admin", True],
    ["send"],
    ["send"],
    ["send"],
]
print(send_order(events))
`,
      answer: src`
from collections import deque

def send_order(events):
    urgent = deque()
    normal = deque()
    sent = []
    for event in events:
        if event[0] == "add":
            if event[2]:
                urgent.append(event[1])
            else:
                normal.append(event[1])
        elif urgent:
            sent.append(urgent.popleft())
        elif normal:
            sent.append(normal.popleft())
    return sent

events = [
    ["add", "push-hook-1", False],
    ["add", "alert-token-leak", True],
    ["add", "alert-new-admin", True],
    ["send"],
    ["send"],
    ["send"],
]
print(send_order(events))
`,
      alternatives: [
        src`
from collections import deque

def send_order(events):
    queues = {True: deque(), False: deque()}
    sent = []
    for event in events:
        if event[0] == "add":
            queues[event[2]].append(event[1])
        else:
            for kind in [True, False]:
                if queues[kind]:
                    sent.append(queues[kind].popleft())
                    break
    return sent
`,
      ],
      wrong: [
        {
          code: src`
from collections import deque

def send_order(events):
    urgent = deque()
    normal = deque()
    sent = []
    for event in events:
        if event[0] == "add":
            if event[2]:
                urgent.append(event[1])
            else:
                normal.append(event[1])
        elif urgent:
            sent.append(urgent.pop())
        elif normal:
            sent.append(normal.popleft())
    return sent
`,
          fails: ["returns"],
          why: "urgent deliveries are taken from the right, so they still go out newest first",
        },
        {
          code: src`
from collections import deque

def send_order(events):
    urgent = deque()
    normal = deque()
    sent = []
    for event in events:
        if event[0] == "add":
            if event[2]:
                urgent.append(event[1])
            else:
                normal.append(event[1])
        elif normal:
            sent.append(normal.popleft())
        elif urgent:
            sent.append(urgent.popleft())
    return sent
`,
          fails: ["returns"],
          why: "the normal queue is checked first, so urgent deliveries lose their priority",
        },
        {
          code: src`
from collections import deque

def send_order(events):
    urgent = deque()
    normal = deque()
    sent = []
    for event in events:
        if event[0] == "add":
            if event[2]:
                urgent.append(event[1])
            else:
                normal.append(event[1])
        elif urgent:
            sent.append(urgent.popleft())
        else:
            sent.append(normal.popleft())
    return sent
`,
          fails: ["returns"],
          why: "a `send` with nothing waiting raises IndexError instead of doing nothing",
        },
      ],
      task: {
        checks: [
          fn("returns", "send_order", [
            example([[["add", "push-hook-1", false], ["add", "alert-token-leak", true], ["add", "alert-new-admin", true], ["send"], ["send"], ["send"]]], ["alert-token-leak", "alert-new-admin", "push-hook-1"]),
            example([[["add", "a", false], ["send"], ["add", "b", true], ["add", "c", false], ["send"], ["send"]]], ["a", "b", "c"]),
            example([[["add", "x", false], ["add", "y", false]]], []),
            hiddenCase("several urgent deliveries waiting at once", [[["add", "u1", true], ["add", "u2", true], ["add", "u3", true], ["send"], ["send"], ["send"]]], ["u1", "u2", "u3"]),
            hiddenCase("an urgent delivery added while normal ones wait", [[["add", "n1", false], ["add", "n2", false], ["send"], ["add", "u1", true], ["send"], ["send"]]], ["n1", "u1", "n2"]),
            hiddenCase("send with nothing waiting", [[["send"], ["add", "n1", false], ["send"], ["send"]]], ["n1"]),
            hiddenCase("only normal deliveries", [[["add", "n1", false], ["add", "n2", false], ["send"], ["send"]]], ["n1", "n2"]),
            hiddenCase("no events", [[]], []),
          ], { label: "send_order() sends urgent deliveries first, each kind in order" }),
        ],
      },
    },
  },
  {
    id: "PY-Q16-22",
    version: 2,
    slug: "everyone-below-each-manager",
    title: "How many people work under each manager?",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: [...fnBase, "defaultdict-call", "recursion", "closure", "list-mutate", "identity", "none-value", "arithmetic", "reassignment", "dict-comp", "print-several", "logical", "aggregate-call"],
    prompt: "An org chart is stored as a flat list: each person names their manager (`None` for someone at the top). For a headcount report, write `team_sizes(employees)`: return a plain dictionary giving, for **every** person, how many people work under them directly or indirectly. The list is in no particular order: a person can appear before their manager.",
    spec: [
      ["Function", "`team_sizes(employees)`"],
      ["employees", "a list of dictionaries with `name` and `manager` (a name, or `None`)"],
      ["Returns", "a plain `dict` of name → number of people below them; 0 for someone with no reports"],
      ["Example", "Ada manages Ben and Cy, Ben manages Dee, Dee manages Eve → Ada 4, Ben 2, Cy 0, Dee 1, Eve 0"],
    ],
    hiddenKinds: ["a person listed before their manager", "two separate teams", "a long chain of managers", "a single person", "nobody"],
    hints: [
      "First turn the flat list into the shape you need: a `defaultdict(list)` from each manager to their direct reports.",
      "The number below a person is, for each direct report, that report plus everyone below **them**: the same question one level down.",
      "Answer that question for every person in the list, including those with no reports, and return a plain dictionary.",
    ],
    explanation: "Building `reports = defaultdict(list)` from manager to direct reports turns the flat list into a tree, whatever order the rows come in. A recursive `size(name)` adds, for each direct report, 1 for that person plus `size(report)`; someone with no reports has an empty list, so the loop doesn't run and the answer is 0. Asking for every name in the list gives everyone an entry. Counting only direct reports misses the levels below; adding 1 for the person themselves counts them in their own team; and building the result from `reports` alone leaves out everyone who manages nobody.",
    code: {
      starter: src`
from collections import defaultdict

def team_sizes(employees):
    return {}

employees = [
    {"name": "Ada", "manager": None},
    {"name": "Ben", "manager": "Ada"},
    {"name": "Cy", "manager": "Ada"},
    {"name": "Dee", "manager": "Ben"},
    {"name": "Eve", "manager": "Dee"},
]
print(team_sizes(employees))
`,
      answer: src`
from collections import defaultdict

def team_sizes(employees):
    reports = defaultdict(list)
    for person in employees:
        if person["manager"] is not None:
            reports[person["manager"]].append(person["name"])

    def below(name):
        total = 0
        for report in reports[name]:
            total += 1 + below(report)
        return total

    return {person["name"]: below(person["name"]) for person in employees}

employees = [
    {"name": "Ada", "manager": None},
    {"name": "Ben", "manager": "Ada"},
    {"name": "Cy", "manager": "Ada"},
    {"name": "Dee", "manager": "Ben"},
    {"name": "Eve", "manager": "Dee"},
]
print(team_sizes(employees))
`,
      alternatives: [
        src`
from collections import defaultdict

def count_below(name, reports):
    return sum(1 + count_below(report, reports) for report in reports[name])

def team_sizes(employees):
    reports = defaultdict(list)
    for person in employees:
        if person["manager"] is not None:
            reports[person["manager"]].append(person["name"])
    sizes = {}
    for person in employees:
        sizes[person["name"]] = count_below(person["name"], reports)
    return sizes
`,
      ],
      wrong: [
        {
          code: src`
from collections import defaultdict

def team_sizes(employees):
    reports = defaultdict(list)
    for person in employees:
        if person["manager"] is not None:
            reports[person["manager"]].append(person["name"])
    return {person["name"]: len(reports[person["name"]]) for person in employees}
`,
          fails: ["returns"],
          why: "only direct reports are counted, not the people below them",
        },
        {
          code: src`
from collections import defaultdict

def team_sizes(employees):
    reports = defaultdict(list)
    for person in employees:
        if person["manager"] is not None:
            reports[person["manager"]].append(person["name"])

    def below(name):
        total = 1
        for report in reports[name]:
            total += below(report)
        return total

    return {person["name"]: below(person["name"]) for person in employees}
`,
          fails: ["returns"],
          why: "each person is counted in their own team, so everyone is one too high",
        },
        {
          code: src`
from collections import defaultdict

def team_sizes(employees):
    reports = defaultdict(list)
    for person in employees:
        if person["manager"] is not None:
            reports[person["manager"]].append(person["name"])

    def below(name):
        total = 0
        for report in reports[name]:
            total += 1 + below(report)
        return total

    return {name: below(name) for name in list(reports)}
`,
          fails: ["returns"],
          why: "only managers get an entry; people with no reports are left out",
        },
      ],
      task: {
        checks: [
          fn("returns", "team_sizes", [
            example([org], { Ada: 4, Ben: 2, Cy: 0, Dee: 1, Eve: 0 }),
            example([[{ name: "Kai", manager: null }, { name: "Lu", manager: "Kai" }]], { Kai: 1, Lu: 0 }),
            example([[]], {}),
            hiddenCase("a person listed before their manager", [[{ name: "Eve", manager: "Dee" }, { name: "Dee", manager: "Ada" }, { name: "Ada", manager: null }]], { Eve: 0, Dee: 1, Ada: 2 }),
            hiddenCase("two separate teams", [[{ name: "A", manager: null }, { name: "B", manager: null }, { name: "a1", manager: "A" }, { name: "b1", manager: "B" }, { name: "b2", manager: "B" }]], { A: 1, B: 2, a1: 0, b1: 0, b2: 0 }),
            hiddenCase("a long chain of managers", [[{ name: "p1", manager: null }, { name: "p2", manager: "p1" }, { name: "p3", manager: "p2" }, { name: "p4", manager: "p3" }, { name: "p5", manager: "p4" }, { name: "p6", manager: "p5" }]], { p1: 5, p2: 4, p3: 3, p4: 2, p5: 1, p6: 0 }),
            hiddenCase("a single person", [[{ name: "Solo", manager: null }]], { Solo: 0 }),
          ], { label: "team_sizes() counts everyone below each person" }),
        ],
      },
    },
  },
];
