Yes. I’d give the agent a **UI/UX implementation contract for every stage type**, so it doesn’t improvise layouts or terminology.

# Runtime SQL Projects — Detailed Stage UI/UX Specification

This document defines how every Project stage must look and behave.

It is the UI/UX source of truth for the Projects implementation.

Do not redesign these flows independently.

---

# 1. Core project experience

Runtime Projects are not lessons and not Practice questions.

The learner should feel:

> I was given a business problem, I understand the data, I investigate it with SQL, I explain what I found, and I deliver a report.

The standard project flow is:

```text
Project Library
    ↓
Project Brief
    ↓
Understand the Data
    ↓
Investigation Stages
    ↓
Review / Synthesis
    ↓
Final Report
```

Supported stage types:

```text
orientation
checkpoint
exploration
build
synthesis
report
```

The shell is shared across all projects.

Difficulty changes the amount of guidance, not the basic UI.

---

# 2. Global project page shell

Every project page should have a compact project header.

Desktop:

```text
← Projects

Airline Reliability Review
Stage 4 of 8 · Airports & routes

                                      [ All stages ]
```

Do not add a permanent project sidebar.

Do not add a permanent schema column.

Do not create a three-column IDE.

The only stage types using split desktop layout are:

```text
checkpoint
exploration
build
```

Orientation, synthesis and report stages are full-width.

---

# 3. Project header

The header remains visible but restrained.

Show:

- Back to Projects
- Project title
- `Stage N of M`
- Current stage title
- `All stages` control

Example:

```text
← Projects

Airline Reliability Review

Stage 4 of 8 · Airports & routes                  All stages
```

Do not show:

- overall percentage
- XP
- badges
- dataset size controls
- unnecessary metadata
- SQL concept names

---

# 4. All Stages control

Clicking `All stages` opens a temporary panel/modal.

Example:

```text
Airline Reliability Review

✓ 1. Project brief
✓ 2. Understand U.S. Flights
✓ 3. Reliability baseline
● 4. Airports & routes
○ 5. Timing patterns
○ 6. Operational priorities
○ 7. Review
○ 8. Report
```

Stage states:

```text
✓ completed
● current
○ not completed
```

Clicking a completed/current available stage navigates to it.

Future locked stages may be shown but disabled when completion order matters.

Do not keep this navigation permanently visible.

---

# 5. Draft behavior

Drafts save automatically as the learner types.

Applies to:

- SQL
- findings
- notes
- report text

Use subtle status text:

```text
Saved
```

or briefly:

```text
Saving…
```

Do not use disruptive toasts for normal autosave.

If save fails:

```text
Couldn’t save changes · Retry
```

Never silently discard drafts.

---

# 6. Stage type: ORIENTATION — Project Brief

Layout:

**Full-width.**

No SQL editor.

No split layout.

The Brief should feel like a concise case assignment.

Desktop structure:

```text
Airline Reliability Review

Beginner · Operations Analyst
Dataset: U.S. Flights

────────────────────────────────────────

Your role

You support an airline operations team.

The situation

Passenger complaints about unreliable travel have increased.
Leadership does not know whether the issue is concentrated in
particular airlines, airports, routes or times of day.

Your task

Identify the strongest drivers of unreliable travel and recommend
where operations should focus first.

Your data

U.S. Flights

Your deliverable

An evidence-backed reliability assessment with clear findings
and an operational recommendation.

────────────────────────────────────────

Recommended preparation

Joins
Aggregation
Dates
Conditional metrics

                                      Begin project →
```

---

# 7. Brief content rules

The Brief must answer exactly:

### Your role
Who is the learner acting as?

### The situation
What business/operational situation created the need for analysis?

### Your task
What decision/problem should be investigated?

### Your data
Which canonical dataset is being used?

### Your deliverable
What does the learner need to produce at the end?

Keep each section concise.

Do not write a giant narrative.

Do not mention:

- expected SQL functions
- solution strategy
- hidden validation
- reference answers

---

# 8. Brief stage completion

Brief is completed when learner clicks:

```text
Begin project →
```

No graded action.

No quiz.

No finding required.

---

# 9. Stage type: ORIENTATION — Understand the Data

Layout:

**Full-width.**

This stage teaches the learner enough about the dataset to work independently.

It is not a SQL challenge.

Example:

```text
Understand U.S. Flights

Before you investigate reliability, understand what the data
actually represents.

U.S. Flights
125K+ scheduled flights · 6 related tables
```

Then show relevant project tables.

---

# 10. Table presentation

Each table should be shown as a compact section/card.

Example:

```text
flights

One row = one scheduled flight

120,438 rows

flight_id             INTEGER        Primary key
flight_date           DATE
airline_id            INTEGER        → airlines.airline_id
origin_airport        TEXT           → airports.airport_code
destination_airport   TEXT           → airports.airport_code
arrival_delay         INTEGER        Nullable
cancelled             BOOLEAN

[ Preview rows ]
```

Do not dump every column if the table contains many irrelevant fields.

Show project-relevant columns first.

Allow:

```text
Show all columns
```

when necessary.

---

# 11. Table preview

`Preview rows` expands or opens a lightweight panel.

Show around:

```text
10–20 rows
```

Example:

| date | airline | origin | destination | arrival_delay | cancelled |
|---|---|---|---|---:|---|
| ... | ... | ... | ... | ... | ... |

This is a preview only.

Do not imply the dataset contains only those rows.

---

# 12. Relationships

After table summaries, show a simple relationship view.

Example:

```text
airlines
   │
   └── flights ─── airports
          │
          └── routes
```

Or clean relationship rows:

```text
flights.airline_id       → airlines.airline_id
flights.origin_airport   → airports.airport_code
flights.destination_airport → airports.airport_code
```

Do not build an overly complicated ERD if it hurts readability.

---

# 13. Important data notes

Show only the quirks relevant to the project.

Example:

```text
Things to know

• One row in flights represents one scheduled flight.
• Cancelled flights may have no arrival delay.
• Negative delay means the flight arrived early.
• Airport traffic volume varies significantly.
```

These notes are critical because they define correct interpretation.

---

# 14. Understand Data completion

Bottom CTA:

```text
Continue to analysis →
```

No SQL required.

No finding required.

---

# 15. Stage type: CHECKPOINT

Checkpoint means:

> Produce a defined analytical result and prove that the result is correct.

Desktop uses a **two-column split layout**.

Not three columns.

Recommended proportions:

```text
Context:   ~35%
Workspace: ~65%
```

Exact width can be tuned during implementation.

---

# 16. Checkpoint desktop layout

```text
┌───────────────────────────────┬──────────────────────────────────────┐
│ AIRPORTS & ROUTES             │ SQL WORKSPACE                        │
│                               │                                      │
│ Which airports deserve        │ SELECT ...                           │
│ operational attention?        │                                      │
│                               │                                      │
│ Why it matters                │                                      │
│ High delay percentages can    │                                      │
│ look dramatic at airports     │                                      │
│ with very little traffic.     │                                      │
│                               │                                      │
│ What to return                │                                      │
│ One row per airport           │                                      │
│                               │                                      │
│ • airport                     │                                      │
│ • flights                     │                                      │
│ • delay_rate                  │                                      │
│ • cancellation_rate           │                                      │
│                               │ [ Run ]                  [ Check ]    │
│ Tables                        │                                      │
│ flights                       │ Results                              │
│ airports                      │ ──────────────────────────────────── │
│                               │                                      │
│ View tables                   │                                      │
│                               │                                      │
│ Need help? Hint               │                                      │
│                               │                                      │
│                               │ What did you learn?                  │
│                               │ [.................................]   │
│                               │                                      │
│                               │                 Save & continue →    │
└───────────────────────────────┴──────────────────────────────────────┘
```

---

# 17. Checkpoint left panel

The context side contains:

### Stage title

Example:

```text
Airports & routes
```

### Business question

Example:

> Which airports deserve operational attention after accounting for both reliability and traffic volume?

### Why it matters

1–3 sentences.

Example:

> An airport with severe delays but very little traffic may have less operational impact than a high-volume hub with moderately poor reliability.

### What to return

Explicit expected result grain and columns.

Example:

```text
One row per airport

airport
flights
delay_rate
cancellation_rate
```

### Tables

Only relevant tables:

```text
flights
airports
```

Then:

```text
View tables
```

### Hint

Only if hints are available.

---

# 18. `View tables`

This replaces vague labels like `Data`.

Clicking opens a temporary drawer/modal.

Example:

```text
Tables for this stage

flights
One row = one scheduled flight

flight_id
airline_id
origin_airport
arrival_delay
cancelled
...

[Preview]


airports
One row = one airport

airport_code
airport_name
city
state
...

[Preview]
```

Include relationship information if useful.

Closing the drawer returns to the stage without losing SQL.

---

# 19. Hints

Button:

```text
Hint
```

Do not show all hints immediately.

Progressive reveal.

Example:

### Hint 1

> Decide what one row of the final result represents before joining anything.

### Hint 2

> Reliability and traffic volume need to be calculated at airport grain.

### Hint 3

> Make sure cancelled flights are handled according to the metric definitions.

Do not reveal full SQL on first hint.

---

# 20. Full solution behavior

Do not show an `Answer` button by default.

If the product later allows a solution reveal, use an explicit action such as:

```text
Reveal solution
```

after sufficient attempts/help.

If revealed:

- mark stage as completed with help
- do not treat it identically to an independent solve
- keep this state visible in progress

This behavior can be implemented later.

---

# 21. SQL workspace

The SQL editor should dominate the right side.

Required capabilities:

- syntax highlighting
- Run
- Check
- reset/clear only if existing conventions support it
- autosave
- keyboard shortcut where already supported

Do not clutter toolbar with unrelated controls.

---

# 22. Run

`Run` executes SQL and displays results.

It does not determine correctness.

Possible states:

```text
Run
Running…
```

On SQL error:

```text
SQL error

no such column: ...
```

Keep error close to editor/results.

Do not erase learner SQL.

---

# 23. Results

After Run:

```text
Results · 14 rows
```

Show result table.

Support horizontal scrolling inside results when necessary.

Do not make the whole page horizontally overflow.

If result contains many rows, use existing result virtualization/pagination conventions.

---

# 24. Check

`Check` validates the semantic result.

Do not compare SQL strings.

Validation checks:

- expected columns
- expected grain
- result correctness
- ordering only when required
- stage invariants

Successful state:

```text
✓ Check passed
```

Failed state should be useful:

```text
Not quite

Your result is missing airports with zero qualifying cancellations.
Review how unmatched rows are handled.
```

Do not reveal hidden answer rows.

---

# 25. Finding

A successful query does not complete the checkpoint alone.

After passing:

```text
What did you learn?
```

Provide a small text area.

Prompt should be stage-specific.

Example:

> Which airports stand out, and why?

Learner writes roughly:

```text
1–3 sentences
```

Avoid requiring essays.

---

# 26. Save & Continue

Checkpoint completion requires:

```text
Check passes
+
required finding is written
```

Then:

```text
Save & continue →
```

The saved project state includes:

- SQL
- successful result
- learner finding

Internally this can become project evidence.

Do not call it `Evidence` in normal learner UI.

---

# 27. Stage type: EXPLORATION

Exploration is intentionally less constrained.

The learner investigates an ambiguous business question.

Desktop still uses the **two-column split**.

Example:

```text
LEFT

Retention segments

Some activated users stay while others disappear.
Investigate whether retention differs meaningfully across
customer or behavioral segments.

Suggested tables

users
subscriptions
events

You decide what comparisons are useful.

View tables


RIGHT

SQL editor

[ Run ]

Results

What did you find?

[...................................]

[ Save finding ]
```

---

# 28. Exploration differences from Checkpoint

Exploration usually does **not** have:

- fixed expected columns
- required result grain
- canonical `Check`

The learner may run multiple queries.

They may save useful analyses.

Primary action:

```text
Save finding
```

When saving, Runtime stores:

- current SQL
- current result snapshot
- finding

The learner can continue investigating before moving on.

---

# 29. Exploration save behavior

After saving:

```text
✓ Finding saved
```

Allow another query.

Example:

```text
Saved findings for this stage: 2
```

Optionally provide:

```text
View saved findings
```

Do not label this simply `Evidence`.

---

# 30. Completing exploration

Requirements vary by project.

Example:

```text
At least 1 saved finding required
```

or:

```text
At least 2 saved findings required
```

Then enable:

```text
Continue →
```

Advanced projects may require more than one saved analysis.

---

# 31. Stage type: BUILD

Used mainly in the Trusted Retail Warehouse project.

Desktop uses two-column split.

Left:

- engineering requirement
- target object/state
- constraints
- relevant source tables

Right:

- writable SQL editor
- execute
- validation
- resulting schema/state

Example:

```text
BUILD STAGING

Create a clean staging table for raw sales.

Requirements

• valid customer id
• valid product id
• parsed order date
• numeric quantity
• numeric sales amount
• preserve source row id

Source

raw_sales

Expected result

A reusable staging table at one row per accepted source row.


SQL WORKSPACE

CREATE TABLE ...

[ Execute ]          [ Validate ]

Database changes
stg_sales created
12,481 rows

✓ Validation passed

What decisions did you make?
[...................................]

Save & continue →
```

---

# 32. Build validation

Do not only validate returned SELECT results.

Validate database state:

- required table exists
- expected columns
- types/constraints where relevant
- row-level expectations
- idempotency where required
- data-quality invariants

Build stages may modify only the isolated project database/workspace.

Never mutate shared canonical source assets.

---

# 33. Stage type: SYNTHESIS

Full-width.

No SQL editor by default.

Purpose:

> Connect completed analysis into conclusions before writing the final report.

Example:

```text
Review your analysis

You completed 6 investigations.

────────────────────────────────

Reliability baseline

Your finding:
Cancellation is concentrated among...

[ View query ] [ View result ]


Airports & routes

Your finding:
High-volume hubs...

[ View query ] [ View result ]


Timing patterns

Your finding:
Evening departures...

[ View query ] [ View result ]

────────────────────────────────

What are the 2–3 most important conclusions?

[................................................]

What should the team prioritize?

[................................................]

                                  Continue to report →
```

---

# 34. Synthesis behavior by level

### Beginner

Synthesis may be light.

Could simply ask:

> Which 2–3 findings matter most?

### Intermediate

Require:

- main conclusions
- recommendation direction

### Advanced

Require stronger reasoning:

- key conclusion
- magnitude/business impact
- uncertainty or limitation
- priority/action

---

# 35. Stage type: REPORT

Full-width.

Do not use split workspace.

This is the final deliverable.

The report is structured, but visually simple.

Example:

```text
Final report

Airline Reliability Review


Executive summary
[................................................]


Key findings

Your saved findings are available below.

1. [ selected finding ]
2. [ selected finding ]
3. [ selected finding ]

[ Add/remove findings ]


Recommendation
[................................................]


Limitations
[................................................]


[ Preview report ]

[ Export Markdown ]
```

---

# 36. Report fields by level

## Beginner

Use:

```text
Key findings & recommendation
Limitations
```

or at most:

```text
Summary
Recommendation
Limitations
```

## Intermediate

Use:

```text
Executive summary
Key findings
Recommendation
Limitations
```

## Advanced analytical projects

Use:

```text
Executive summary
Key findings
Priority actions
Limitations
```

## Trusted Retail Warehouse

Use:

```text
Engineering summary
Architecture / build decisions
Validation results
Operational handoff
Known limitations
```

---

# 37. Report should reuse saved findings

Do not make learner rewrite everything.

Saved stage findings should appear as selectable material.

Example:

```text
Include in report

☑ Airline performance
☑ Airport reliability
☐ Timing analysis
☑ Route reliability
```

Learner can edit final wording separately.

---

# 38. Report export

Current target:

```text
Export Markdown
```

Do not implement PDF in this phase.

Export should contain:

```text
Project title
Role
Dataset
Executive summary
Findings
Recommendations
Limitations
Relevant SQL / evidence references where appropriate
```

Keep export readable outside Runtime.

---

# 39. Notes

Learners may need personal scratch notes.

Do not show a permanent Notes panel.

If notes are supported:

```text
Notes
```

opens a temporary modal/drawer.

Notes are:

- project-private
- autosaved
- not automatically included in report

Notes are optional.

If notes do not materially improve the v1 experience, defer them.

---

# 40. Saved findings

Use learner-facing wording:

```text
Saved findings
```

not:

```text
Evidence
```

A saved finding contains:

- stage name
- SQL
- result snapshot
- written finding

UI example:

```text
Saved findings

Airport reliability

ORD combines high traffic with...
Saved from Stage 4

[ View query ]
[ View result ]
```

---

# 41. Stale saved finding behavior

If learner changes SQL after a saved finding:

Do not immediately destroy the saved finding.

If the saved result no longer corresponds to current SQL, mark:

```text
Saved from an earlier query
```

or:

```text
Needs refresh
```

Allow:

```text
Update saved finding
```

Internally this is stale evidence.

Learner-facing copy should remain understandable.

---

# 42. Desktop responsive behavior

For:

```text
checkpoint
exploration
build
```

desktop is split.

Use breakpoint based on available workspace width.

Likely around:

```text
>= 1024 px → split
< 1024 px  → stacked
```

Exact breakpoint should be validated visually.

---

# 43. Mobile layout

Mobile is always single-column.

Example checkpoint:

```text
← Projects

Airline Reliability Review

Stage 4 of 8
Airports & routes


Which airports deserve operational attention?

Why it matters
...

What to return
...

Tables
flights · airports

View tables

Hint


SQL editor

[ Run ] [ Check ]


Results
...


What did you learn?

[....................]


Save & continue →
```

Do not horizontally compress the desktop split.

---

# 44. Mobile table viewing

`View tables` should open a full-screen sheet.

Example:

```text
← Airports & routes

Tables

flights
One row = one scheduled flight

...

Preview rows

...

airports
...
```

Closing returns to exact stage/editor state.

---

# 45. Mobile results

Results must scroll inside their own container.

Do not cause whole-page horizontal overflow.

For wide tables:

```text
horizontal result-table scroll
```

is acceptable.

---

# 46. Beginner scaffolding

Beginner checkpoints should usually include:

### Why it matters
Always.

### What to return
Explicit.

### Metric definitions
When ambiguous.

### Expected grain
Explicit.

### Relevant tables
Explicit.

### Hints
2–3 progressive hints.

Do not name SQL functions unless the business requirement itself uses SQL terminology.

---

# 47. Intermediate scaffolding

Intermediate stages include:

- business question
- useful context
- relevant tables when needed
- metric definitions when required for correctness

But may omit:

- exact output columns on exploration stages
- explicit grain when learner should determine it
- detailed hints

Typically 1–2 hints maximum.

---

# 48. Advanced scaffolding

Advanced stages should look more like requirements from a real stakeholder.

Example:

> Produce a defensible set of unresolved financial exceptions after accounting for settlements, reversals, refunds and chargebacks.

May provide:

- lifecycle rules
- business definitions
- constraints

But not:

- detailed query steps
- suggested SQL structure
- expected exact query sequence

Hints may be absent.

---

# 49. Metric definitions

When business metrics have multiple possible meanings, define them explicitly.

Examples:

### Flight cancellation rate

```text
cancelled scheduled flights / scheduled flights
```

### Arrival delay

Do not convert cancelled flights with unknown arrival time into zero delay.

### Retail net revenue

Specify whether returns/cancellations reduce revenue.

### SaaS activation

Define exact qualifying events/window.

### Retention

Define exact return period.

### Finance unresolved transaction

Define lifecycle states that count as unresolved.

These definitions belong in project context, not hidden grader logic only.

---

# 50. Error states

## Dataset load failure

Show:

```text
Couldn’t load U.S. Flights.

Retry
```

Do not silently switch datasets.

---

## SQL error

Keep query intact.

Show error next to workspace.

---

## Check failure

Explain conceptual issue when possible.

Do not expose reference SQL.

---

## Autosave failure

Show persistent retry state until resolved.

---

# 51. Empty states

Before first Run:

```text
Run your query to see results.
```

Before finding is available:

Do not show an empty giant text box prematurely if checkpoint has not passed.

After Check passes, reveal/emphasize finding field.

For exploration, finding input can remain visible because interpretation is part of the workflow.

---

# 52. Continue behavior

Use one consistent primary CTA:

```text
Save & continue →
```

or:

```text
Continue →
```

Rules:

### Orientation
Continue available immediately after orientation action.

### Checkpoint
Available after:
- validation passes
- required finding completed

### Exploration
Available after minimum saved findings requirement.

### Build
Available after state validation + required reflection.

### Synthesis
Available after required synthesis text.

### Report
Completion action after required report fields.

---

# 53. Project completion

Do not mark project complete merely because SQL stages passed.

Completion requires:

- required checkpoint validations
- required exploration findings
- required synthesis
- required report

Final state:

```text
Project complete

Airline Reliability Review

You completed the investigation and produced a final report.

[ View report ]
[ Export Markdown ]
[ Back to Projects ]
```

---

# 54. Project Library card state

Project cards should show simple status.

Not started:

```text
Airline Reliability Review
Beginner · U.S. Flights

Find where unreliable travel is coming from.

Start →
```

In progress:

```text
Airline Reliability Review
Beginner · U.S. Flights

Stage 4 of 8 · Airports & routes

Continue →
```

Complete:

```text
Airline Reliability Review
Beginner · U.S. Flights

Completed

View project →
```

No excessive badges.

---

# 55. Visual style

Projects should feel:

- serious
- calm
- spacious
- investigative

Avoid:

- dashboard card overload
- gamification
- huge gradients
- excessive icons
- permanent utility rails
- three-column IDE styling
- overly dense schema views

The SQL editor can feel technical.

The rest should feel like a modern analytical workspace.

---

# 56. Stage UI summary

| Stage | Desktop | Mobile | SQL | Validation | Writing |
|---|---|---|---|---|---|
| Brief | Full-width | Full-width | No | None | No |
| Understand data | Full-width | Full-width | No | None | No |
| Checkpoint | 2-column | Stacked | Yes | Semantic Check | Finding |
| Exploration | 2-column | Stacked | Yes | Save findings | Finding |
| Build | 2-column | Stacked | Yes/write | DB state validation | Reflection |
| Synthesis | Full-width | Full-width | Usually no | Required text | Conclusions |
| Report | Full-width | Full-width | No | Required fields | Final deliverable |

---

# 57. Final learner-facing vocabulary

Prefer:

```text
Project brief
Understand the data
Tables
Preview rows
Hint
Run
Check
Results
Finding
Saved findings
View query
View result
Save & continue
Review
Report
Export Markdown
```

Avoid exposing internal product terms such as:

```text
evidence object
dataset edition
reference query
validation invariant
stage payload
artifact state
```

---

# 58. Hard UX rules

1. No permanent three-column project layout.
2. Desktop checkpoint/exploration/build stages use only two columns.
3. Mobile always stacks.
4. Brief/data/synthesis/report stay full-width.
5. No learner-facing `Evidence` button.
6. Use `Saved findings` when previous analyses need to be reviewed.
7. Use `View tables`, not vague `Data`.
8. Full solution is not a normal primary action.
9. Projects do not name SQL functions in business questions.
10. Findings matter as much as successful SQL checks.
11. Saved drafts survive navigation and refresh.
12. Same canonical dataset identity is used throughout the project.
13. Projects never ask the learner to select dataset size.
14. Project UX must remain visibly different from Practice.
15. The final report should naturally emerge from work already completed rather than forcing the learner to rewrite everything.

This is detailed enough for the agent to implement each stage without inventing UX behavior.