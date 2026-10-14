# Uploaded Python PDFs: source triage

19 received PDFs; **17 distinct byte sequences**, because the Finxter cheat sheet was uploaded three times under different filenames. This is a source audit, not a correctness certification of each example.

## Python_Learning_Pandas_in_10_min__1641235868.pdf

- **Pages:** 26. **Priority:** high. **Role:** pandas historical.
- **Use:** Modernize .ix, append and obsolete APIs; useful topic ordering.
- **Caveat:** official current pandas docs.

## Python_for_Data_Science_1640310352.pdf

- **Pages:** 15. **Priority:** medium. **Role:** Finxter Python cheat sheet.
- **Use:** Concept vocabulary and short demonstrations; avoid promoting trick one-liners as fundamentals.
- **Caveat:** exact copy of two other uploads.

## Python_Tutorial__1753800116.pdf

- **Pages:** 255. **Priority:** high. **Role:** Mustafa Germec 255-page examples.
- **Use:** Strong topic map incl. generators and decorators, but need hand-authored pedagogy.
- **Caveat:** long code-forward not complete learner-ready lessons.

## Python_Cheatsheet_1651673883.pdf

- **Pages:** 60. **Priority:** medium. **Role:** InterviewBit cheat sheet.
- **Use:** Coverage checklist for standard Python; verify incomplete/misleading descriptions.
- **Caveat:** some advice and samples technically incorrect.

## Top_Python_Interview_Questions__1741108013.pdf

- **Pages:** 26. **Priority:** low. **Role:** Bosscoder interview summary.
- **Use:** Ideas for concept checks; do not reuse inaccurate samples.
- **Caveat:** corrupted typography and outdated scikit-learn import.

## Python_Programming_course_fundamental_to_machine_learning_1645462269.pdf

- **Pages:** 54. **Priority:** medium. **Role:** Curtin beginner notebook.
- **Use:** Visual examples for beginner values and collections.
- **Caveat:** garbled extracted text; page images consulted.

## Python_Cheatsheet_�_1644776729.pdf

- **Pages:** 15. **Priority:** low. **Role:** Finxter duplicate.
- **Use:** No new coverage; de-duplicate.
- **Caveat:** byte-identical Finxter PDF.
- **Duplicate of:** `Python_for_Data_Science_1640310352.pdf`.

## Python_hands_on_tutorial__1640277526.pdf

- **Pages:** 207. **Priority:** high. **Role:** A. N. Harrington Hands-on Python.
- **Use:** Exercise sequencing and discover-by-doing pedagogy.
- **Caveat:** CC BY-NC-SA; write original lessons and only cite for methodology.

## Python_Projects__1753362873.pdf

- **Pages:** 224. **Priority:** medium. **Role:** Edcorner 53 projects.
- **Use:** Idea pool for file text processing and CSV automation.
- **Caveat:** many external apps, desktop dependencies or credential workflows.

## Python_Tutorial_for_beginners__1733953067.pdf

- **Pages:** 118. **Priority:** medium. **Role:** Asif Bhat Python notebook.
- **Use:** Large reference of beginner examples and failure types.
- **Caveat:** not a coherent published course as-is.

## Python_cheatsheet_1640365944.pdf

- **Pages:** 15. **Priority:** low. **Role:** Finxter duplicate.
- **Use:** No new coverage; de-duplicate.
- **Caveat:** byte-identical Finxter PDF.
- **Duplicate of:** `Python_for_Data_Science_1640310352.pdf`.

## Python_Cheat_Sheet_1642524685.pdf

- **Pages:** 11. **Priority:** high. **Role:** Frank Andrade multi-library reference.
- **Use:** Modern data tools/topic coverage; check methods against current versions.
- **Caveat:** some out-of-date NumPy, pandas and Selenium usage.

## Programming_in_Python_Repeating_Actions__1645667620.pdf

- **Pages:** 6. **Priority:** medium. **Role:** Loops notebook.
- **Use:** Useful beginner loop scenarios, nesting and iteration mistakes.
- **Caveat:** some notebook inputs rely on input() or sleep; adapt to deterministic fixtures.

## 200_Python_Exercises__1747751980.pdf

- **Pages:** 122. **Priority:** high. **Role:** Milind Mali 200+ questions.
- **Use:** Large independent-practice idea inventory.
- **Caveat:** solutions contain correctness errors; re-specify and test from scratch.

## Python_Cheatsheet__1768841505.pdf

- **Pages:** 20. **Priority:** medium. **Role:** Pooja Pawar essential reference.
- **Use:** Core reference checklist for Python fundamentals.
- **Caveat:** some snippets are prose-like not executable syntax.

## DL_with_python_1765140929.pdf

- **Pages:** 169. **Priority:** low. **Role:** Nikhil Ketkar deep learning book.
- **Use:** Background for future ML subject, not core Python coursework.
- **Caveat:** Theano-era implementations, separate ML roadmap; copyright reserve.

## EDA_in_Python__1768250148.pdf

- **Pages:** 12. **Priority:** high. **Role:** Pooja Pawar EDA reference.
- **Use:** Strong modern applied-data topics: missingness, GroupBy and export.
- **Caveat:** versions not established; verify before authoring executable examples.

## Python__1755001574.pdf

- **Pages:** 95. **Priority:** medium. **Role:** Ben Good How to Python.
- **Use:** Wide topic coverage including CLI, testing, API, ML.
- **Caveat:** uneven code formatting; broad not deep.

## 250_Python_One_Liners_1753362705.pdf

- **Pages:** 290. **Priority:** low. **Role:** Hernando Abella one-liners.
- **Use:** Optional advanced puzzle ideas.
- **Caveat:** brevity often hides edge cases; inconsistent descriptions and answers.

## Specific examples to correct rather than copy

- 2016 pandas 0.17.1 PDF: `.ix`, `.append()` and old indexing patterns; use current pandas 3 docs.
- 200+ exercises PDF: Exercise 22 claimed expected output and shown Python output disagree; Exercise 26 tax rules/code need independent boundary specification.
- InterviewBit: variable naming rules exclude digits after the initial character, which is false; its examples/descriptions require review.
- Edcorner Projects: IMAP credential text files, Selenium ChromeDriver releases, PyGame and microphone projects are not appropriate as default browser exercises.
- One-liner book: multiple examples prioritize compact syntax or have internally inconsistent outputs; never import a solution without running tests.
- Deep learning book: Theano-era material belongs to later ML/DL module research rather than Python Core.

All authored Runtime content must be original and manually validated; do not publish source PDFs or republish substantial passages or exercise sets.
