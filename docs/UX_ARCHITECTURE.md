# UX architecture

## Navigation

Primary: Home, Learn, Practice, Projects, Progress  
Explore SQL: Playground, Database Lab, Query Performance, Compare SQL Syntax  
Settings: appearance, nav prefs, shortcuts, import/export

## Lesson flow

Understand → Practice → Review → Complete

## Project flow

Brief → explore data → milestones → validate → export deliverables

## Continuity verified in the learner pass

Home chooses the most recently opened unfinished lesson/project or practice activity and counts independent lesson and bank solves. Track Continue resumes the saved unfinished position before falling back to the first gap. Completed tracks link to unsolved practice.

Reviews persist a versioned cycle session inside the existing local progress store: recall choice, stage, variant, drafts, checks, assistance and completion. Completion and scheduling are atomic, and obsolete cycles cannot award credit. Browser tabs refresh shared saved progress through storage events.

Editing SQL labels displayed results as belonging to the previous query until rerun. On mobile, editor-action focus preserves the action-bar position so tapping Run/Check works on the first tap. Theme remains in Settings; existing Editorial IDE surfaces and navigation are preserved.

Project briefs distinguish saved queries/results/findings from the disposable database environment for each run and milestone. See [learner findings](audit/UX_FINDINGS.md) for evidence and manual limitations.
