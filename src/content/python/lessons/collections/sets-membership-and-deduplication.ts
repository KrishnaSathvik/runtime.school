import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const strs = (...xs: string[]) => py.list(...xs.map(s));

export const setsMembershipAndDeduplication: PyLesson = {
  slug: "sets-membership-and-deduplication",
  ref: "python:sets-membership-and-deduplication",
  module: "collections",
  number: 4,
  title: "Sets, membership and deduplication",
  level: "beginner",
  summary:
    "Use sets to keep only unique values, check membership quickly, and compare two collections: what's in both, in either, or in one but not the other. And remove duplicates while keeping the original order.",

  sections: [
    {
      label: "a set holds unique values",
      blocks: [
        {
          kind: "p",
          text: "A **set** is an unordered collection with **no duplicates**, written in curly braces: `{\"ana\", \"ben\"}`. `set(items)` builds one from any sequence, dropping repeats, so `len(set(visits))` counts distinct visitors. The empty set is `set()`, because `{}` is an empty dictionary.",
        },
        {
          kind: "p",
          text: "`add(x)` inserts a value (adding one that's already there changes nothing), and `discard(x)` removes it if present. Set items must be immutable: numbers, strings and tuples are fine, lists aren't.",
        },
        {
          kind: "p",
          text: "Sets have **no order** and no positions, so `visitors[0]` is a `TypeError`. Printing a set of words can even show them in a different order from one run to the next. When you need to show or compare a set's contents, use `sorted(the_set)`, which gives a list.",
        },
      ],
    },
    {
      label: "fast membership",
      blocks: [
        {
          kind: "p",
          text: "`x in some_set` is answered almost instantly however big the set is, while `x in some_list` checks items one by one. When you'll test membership many times (in a loop, against a large list of IDs), convert to a set first.",
        },
      ],
    },
    {
      label: "comparing collections",
      blocks: [
        { kind: "code", code: 'a = {"desk", "lamp", "chair"}\nb = {"lamp", "sofa", "desk"}\na & b    # in both:          desk, lamp\na | b    # in either:        chair, desk, lamp, sofa\na - b    # in a but not b:   chair\na ^ b    # in exactly one:   chair, sofa' },
        {
          kind: "p",
          text: "The same operations exist as methods (`a.intersection(b)`, `a.union(b)`, `a.difference(b)`), which also accept lists.",
        },
      ],
    },
    {
      label: "deduplicating and keeping order",
      blocks: [
        {
          kind: "p",
          text: "`set(items)` removes duplicates but loses the order. To keep the **first occurrence** of each value, in order, loop through and keep a set of what you've seen: add an item to the result only if it's not in `seen` yet.",
        },
      ],
    },
  ],

  example: {
    caption: "Distinct visitors, and two stores compared. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'visits = ["ana", "ben", "ana", "cai", "ben", "ana"]\nprint("Visits:", len(visits), "| Distinct visitors:", len(set(visits)))\nprint("Who:", sorted(set(visits)))\n\nstore_a = {"desk", "lamp", "chair"}\nstore_b = {"lamp", "sofa", "desk"}\nprint("Both stores:", sorted(store_a & store_b))\nprint("Only store A:", sorted(store_a - store_b))',
  },

  walkthrough: [
    {
      title: "set() drops duplicates",
      text: "Six visits, three distinct people. `sorted` turns the set into an ordered list for display.",
      code: 'visits = ["ana", "ben", "ana", "cai", "ben", "ana"]\nunique = set(visits)\nprint(len(visits), len(unique), sorted(unique))',
    },
    {
      title: "add and discard",
      text: "Adding an existing value does nothing; discarding a missing one is not an error.",
      code: 'tags = {"sale"}\ntags.add("new")\ntags.add("sale")\ntags.discard("clearance")\nprint(sorted(tags), len(tags))',
    },
    {
      title: "Set operations",
      text: "Each operator gives a new set; `sorted` shows it in a stable order.",
      code: 'a = {"desk", "lamp", "chair"}\nb = {"lamp", "sofa", "desk"}\nprint(sorted(a & b))\nprint(sorted(a | b))\nprint(sorted(a - b), sorted(b - a))',
    },
    {
      title: "Deduplicate, keeping first-seen order",
      text: "`seen` remembers what's been kept; `unique` keeps the order of first appearance.",
      code: 'ids = ["C3", "A1", "C3", "B2", "A1"]\nseen = set()\nunique = []\nfor item in ids:\n    if item not in seen:\n        seen.add(item)\n        unique.append(item)\nprint(unique)',
    },
  ],

  mistakes: [
    {
      title: "Using {} for an empty set",
      text: "`{}` is an empty **dictionary**, which has no `add` method: `AttributeError`.",
      code: "seen = {}\nseen.add(\"ana\")",
      raises: "AttributeError",
      fix: "Write `seen = set()`.",
    },
    {
      title: "Indexing a set",
      text: "Sets have no positions, so `[0]` is a `TypeError`.",
      code: 'visitors = {"ana", "ben"}\nprint(visitors[0])',
      raises: "TypeError",
      fix: "Sort it into a list first if you need positions: `sorted(visitors)[0]`.",
    },
    {
      title: "Expecting set() to keep order",
      text: "Converting to a set and back gives the unique values, but not necessarily in their original order. Here the IDs come back sorted by number, which is not the order they arrived in.",
      code: "ids = [30, 10, 30, 20]\nprint(list(set(ids)))",
      fix: "Use the `seen` pattern when order matters.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Deduplicate customer IDs in order",
      prompt:
        "A feed contains repeated customer IDs. Store each ID once, in the order it **first** appeared, in the list `unique_ids`, and the number of repeats that were dropped in `duplicates`. Print both as shown.",
      expectedOutput: "Unique: ['C3', 'A1', 'B2']\nDuplicates dropped: 2\n",
      looksFor: [
        "`unique_ids` is a list with each ID once, in first-seen order.",
        "`duplicates` is how many entries were dropped.",
        "It works for other feeds, including an empty one.",
      ],
      starter: 'ids = ["C3", "A1", "C3", "B2", "A1"]\n\n# Keep the first occurrence of each ID, in order.\n',
      task: {
        checks: [
          { kind: "variable", id: "unique", name: "unique_ids", expected: strs("C3", "A1", "B2"), tip: "Keep a set of IDs you've already seen, and append an ID to the list only the first time." },
          { kind: "variable", id: "dupes", name: "duplicates", expected: py.int(2) },
          { kind: "output", id: "output", label: "Prints both", expected: "Unique: ['C3', 'A1', 'B2']\nDuplicates dropped: 2\n" },
          { kind: "variant", id: "v-order", set: { ids: strs("Z9", "B2", "Z9", "A1", "B2", "Z9") }, vars: { unique_ids: strs("Z9", "B2", "A1"), duplicates: py.int(3) } },
          { kind: "variant", id: "v-empty", set: { ids: py.list() }, output: "Unique: []\nDuplicates dropped: 0\n" },
        ],
      },
      hints: [
        "seen = set() and unique_ids = [] before the loop.",
        "For each item: if item not in seen, add it to seen and append it to unique_ids.",
        "duplicates = len(ids) - len(unique_ids).",
      ],
      answer: 'ids = ["C3", "A1", "C3", "B2", "A1"]\n\nseen = set()\nunique_ids = []\nfor item in ids:\n    if item not in seen:\n        seen.add(item)\n        unique_ids.append(item)\nduplicates = len(ids) - len(unique_ids)\nprint("Unique:", unique_ids)\nprint("Duplicates dropped:", duplicates)',
      alternatives: ['ids = ["C3", "A1", "C3", "B2", "A1"]\nunique_ids = []\nduplicates = 0\nfor item in ids:\n    if item in unique_ids:\n        duplicates += 1\n    else:\n        unique_ids.append(item)\nprint("Unique:", unique_ids)\nprint("Duplicates dropped:", duplicates)\n'],
      wrong: [
        { code: 'ids = ["C3", "A1", "C3", "B2", "A1"]\nunique_ids = sorted(set(ids))\nduplicates = len(ids) - len(unique_ids)\nprint("Unique:", unique_ids)\nprint("Duplicates dropped:", duplicates)\n', fails: ["unique", "output", "v-order"], why: "sorted, not first-seen order" },
        { code: 'ids = ["C3", "A1", "C3", "B2", "A1"]\nunique_ids = set(ids)\nduplicates = len(ids) - len(unique_ids)\nprint("Unique:", sorted(unique_ids))\nprint("Duplicates dropped:", duplicates)\n', fails: ["unique", "output", "v-order"], why: "a set, not a list" },
      ],
    },
    {
      id: "challenge-2",
      title: "Compare two catalogs",
      prompt:
        "Two stores list their products (with some repeats). Store the products sold by **both** in `in_both`, those only store A sells in `only_a`, and the number of distinct products across both stores in `total_distinct`. `in_both` and `only_a` should be **sorted lists**. Print them as shown.",
      expectedOutput: "Both: ['desk', 'lamp']\nOnly A: ['chair', 'shelf']\nDistinct products: 6\n",
      looksFor: [
        "`in_both` and `only_a` are sorted lists without duplicates.",
        "`total_distinct` counts each product once, across both stores.",
      ],
      starter: 'store_a = ["desk", "lamp", "chair", "lamp", "shelf"]\nstore_b = ["lamp", "sofa", "desk", "rug"]\n\n# Compare the two catalogs with sets.\n',
      task: {
        checks: [
          { kind: "variable", id: "both", name: "in_both", expected: strs("desk", "lamp"), tip: "set(store_a) & set(store_b), then sorted() to make a list." },
          { kind: "variable", id: "only-a", name: "only_a", expected: strs("chair", "shelf") },
          { kind: "variable", id: "distinct", name: "total_distinct", expected: py.int(6), tip: "The union, |, has each product once." },
          { kind: "output", id: "output", label: "Prints all three", expected: "Both: ['desk', 'lamp']\nOnly A: ['chair', 'shelf']\nDistinct products: 6\n" },
          { kind: "variant", id: "v-other", set: { store_a: strs("pen", "pen"), store_b: strs("ink") }, vars: { in_both: py.list(), only_a: strs("pen"), total_distinct: py.int(2) } },
        ],
      },
      hints: [
        "Convert each list once: a = set(store_a), b = set(store_b).",
        "in_both = sorted(a & b) and only_a = sorted(a - b).",
        "total_distinct = len(a | b).",
      ],
      answer: 'store_a = ["desk", "lamp", "chair", "lamp", "shelf"]\nstore_b = ["lamp", "sofa", "desk", "rug"]\n\na = set(store_a)\nb = set(store_b)\nin_both = sorted(a & b)\nonly_a = sorted(a - b)\ntotal_distinct = len(a | b)\nprint("Both:", in_both)\nprint("Only A:", only_a)\nprint("Distinct products:", total_distinct)',
      wrong: [
        { code: 'store_a = ["desk", "lamp", "chair", "lamp", "shelf"]\nstore_b = ["lamp", "sofa", "desk", "rug"]\nin_both = sorted(set(store_a) & set(store_b))\nonly_a = sorted(set(store_a) - set(store_b))\ntotal_distinct = len(store_a) + len(store_b)\nprint("Both:", in_both)\nprint("Only A:", only_a)\nprint("Distinct products:", total_distinct)\n', fails: ["distinct", "output", "v-other"], why: "counts repeats and shared products twice" },
        { code: 'store_a = ["desk", "lamp", "chair", "lamp", "shelf"]\nstore_b = ["lamp", "sofa", "desk", "rug"]\nin_both = sorted(set(store_a) | set(store_b))\nonly_a = sorted(set(store_a) - set(store_b))\ntotal_distinct = len(set(store_a) | set(store_b))\nprint("Both:", in_both)\nprint("Only A:", only_a)\nprint("Distinct products:", total_distinct)\n', fails: ["both", "output", "v-other"], why: "union instead of intersection" },
      ],
    },
  ],

  quiz: [
    {
      id: "len-set",
      prompt: "What does this program print?",
      code: 'letters = set("banana")\nletters.add("a")\nprint(len(letters))',
      options: [
        { text: "`3`", correct: true, why: "The distinct letters of `banana` are b, a and n. Adding another `a` changes nothing." },
        { text: "`7`", why: "A set keeps each value once, so repeated letters collapse." },
        { text: "`4`", why: "`a` is already in the set, so adding it again doesn't add a fourth item." },
        { text: "`1`", why: "`set(\"banana\")` makes a set of the characters, not a set containing one string." },
      ],
    },
    {
      id: "ops",
      prompt: '`a = {1, 2, 3}` and `b = {3, 4}`. What is `a - b`?',
      options: [
        { text: "`{1, 2}`", correct: true, why: "Difference: the items in `a` that aren't in `b`." },
        { text: "`{4}`", why: "That's `b - a`. Difference isn't symmetric." },
        { text: "`{1, 2, 4}`", why: "That's `a ^ b`: items in exactly one of the sets." },
        { text: "`{3}`", why: "That's `a & b`: the items they share." },
      ],
    },
  ],

  outcomes: [
    "Remove duplicates with `set()`, and count distinct values.",
    "Add and discard items, and test membership quickly with `in`.",
    "Compare collections with `&`, `|`, `-` and `^`.",
    "Deduplicate while keeping first-seen order, using a `seen` set.",
  ],
};
