/**
 * Concept-level prerequisites for the Python course.
 *
 * A lesson introduces concepts. A practice question may use a concept only when that concept's lesson
 * is inside the question's unlock (its prerequisite lesson, plus every lesson before that). Module
 * numbers are not enough: a question in M01 can still depend on a lesson the learner has not reached.
 *
 * M01 concepts are fully tagged. Later modules are listed so the same check flags untaught syntax
 * the moment a lesson or question is authored. Finer tags replace the module-level placeholders
 * when that module is written.
 */
import type { PyLessonId } from "./types";

export type PyConcept = {
  id: string;
  /** What a beginner is being taught, in plain language. */
  title: string;
  /** The lesson that introduces it. Questions unlock only at or after this lesson. */
  introducedBy: PyLessonId;
};

export const pyConcepts = [
  { id: "execution-order", title: "A program runs from the first line to the last", introducedBy: "PY-L01-01" },
  { id: "print-call", title: "print() shows a value in the console", introducedBy: "PY-L01-01" },
  { id: "print-text", title: "Text inside quotes can be printed", introducedBy: "PY-L01-01" },
  { id: "print-number", title: "A number can be printed without quotes", introducedBy: "PY-L01-01" },
  { id: "print-blank", title: "print() with nothing inside prints an empty line", introducedBy: "PY-L01-01" },
  { id: "quotes-not-printed", title: "Quotation marks are not part of the printed text", introducedBy: "PY-L01-01" },
  { id: "print-several", title: "One print can show several values, with a space between them", introducedBy: "PY-L01-02" },
  { id: "sep", title: "sep= sets the text printed between values", introducedBy: "PY-L01-02" },
  { id: "end", title: "end= sets the text printed after the last value", introducedBy: "PY-L01-02" },
  { id: "newline-escape", title: "\\n inside quotes starts a new line", introducedBy: "PY-L01-02" },
  { id: "comment", title: "# starts a comment Python ignores", introducedBy: "PY-L01-03" },
  { id: "comment-out", title: "A # at the start of a line switches that line off", introducedBy: "PY-L01-03" },
  { id: "hash-in-text", title: "A # inside quotes is ordinary text", introducedBy: "PY-L01-03" },
  { id: "top-level-indent", title: "A top-level line starts at the left edge", introducedBy: "PY-L01-04" },
  { id: "spaces-in-text", title: "Spaces inside quotes are printed", introducedBy: "PY-L01-04" },
  { id: "syntax-error", title: "A syntax error is found before anything runs", introducedBy: "PY-L01-05" },
  { id: "runtime-error", title: "A runtime error stops the program partway", introducedBy: "PY-L01-05" },
  { id: "unquoted-name", title: "Text without quotes is read as a name", introducedBy: "PY-L01-05" },
  { id: "case-sensitive", title: "Names are case-sensitive", introducedBy: "PY-L01-05" },
  // M02. input() comes after a value has a name: name = input("prompt"), on its own line.
  { id: "assignment", title: "A name stores a value", introducedBy: "PY-L02-01" },
  { id: "reassignment", title: "Storing again replaces the value a name holds", introducedBy: "PY-L02-01" },
  { id: "input", title: "input() reads a typed line into a variable", introducedBy: "PY-L02-01" },
  { id: "whole-number", title: "A whole number stored in a name", introducedBy: "PY-L02-02" },
  { id: "decimal-number", title: "A decimal number stored in a name", introducedBy: "PY-L02-02" },
  { id: "string-value", title: "Text stored in a name", introducedBy: "PY-L02-03" },
  { id: "boolean", title: "True and False", introducedBy: "PY-L02-03" },
  { id: "conversion", title: "int(), float(), and str() convert a value", introducedBy: "PY-L02-04" },
  { id: "none-value", title: "None", introducedBy: "PY-L02-05" },
  { id: "type-call", title: "type() reports the kind of value", introducedBy: "PY-L02-05" },
  // M03. One operator family per lesson. Mixed operators and bitwise wait until the last lesson.
  { id: "arithmetic", title: "+, -, *, /, //, %, and ** compute a number", introducedBy: "PY-L03-01" },
  { id: "comparison", title: "Comparisons produce True or False", introducedBy: "PY-L03-02" },
  { id: "logical", title: "and, or, and not combine True and False", introducedBy: "PY-L03-03" },
  { id: "membership", title: "in checks whether text contains text", introducedBy: "PY-L03-04" },
  { id: "identity", title: "is checks for None", introducedBy: "PY-L03-04" },
  { id: "precedence", title: "*, /, and parentheses decide which operation runs first", introducedBy: "PY-L03-05" },
  { id: "bitwise", title: "Bitwise operators work on whole numbers", introducedBy: "PY-L03-05" },
  // M04. if first. elif/else, nesting, truthiness, then an expression and match.
  { id: "if-statement", title: "if runs the next indented lines only when the test is true", introducedBy: "PY-L04-01" },
  { id: "else-clause", title: "elif and else choose another branch", introducedBy: "PY-L04-02" },
  { id: "nested-condition", title: "An if inside an if", introducedBy: "PY-L04-03" },
  { id: "truthiness", title: "Empty text, 0, and None are false", introducedBy: "PY-L04-04" },
  { id: "conditional-expr", title: "A value chosen with if and else on one line", introducedBy: "PY-L04-05" },
  { id: "match-case", title: "match compares one value with case lines", introducedBy: "PY-L04-05" },
  // M05. for over text first, so loops do not need a list.
  { id: "for-loop", title: "for visits each value, one at a time", introducedBy: "PY-L05-01" },
  { id: "while-loop", title: "while repeats while a test stays true", introducedBy: "PY-L05-02" },
  { id: "range-call", title: "range() counts out numbers", introducedBy: "PY-L05-03" },
  { id: "enumerate-call", title: "enumerate() pairs a position with each character", introducedBy: "PY-L05-03" },
  { id: "break-statement", title: "break leaves the loop", introducedBy: "PY-L05-04" },
  { id: "continue-statement", title: "continue skips to the next pass", introducedBy: "PY-L05-04" },
  { id: "nested-loop", title: "A loop inside a loop", introducedBy: "PY-L05-05" },
  // M06. Brackets on a text pick characters. A list literal is still later.
  { id: "string-index", title: "text[n] picks one character", introducedBy: "PY-L06-01" },
  { id: "len-call", title: "len() counts characters", introducedBy: "PY-L06-01" },
  { id: "string-slice", title: "text[start:end] takes a piece", introducedBy: "PY-L06-02" },
  { id: "string-method", title: "Methods such as strip, upper, and replace", introducedBy: "PY-L06-03" },
  { id: "string-format", title: "An f-string fills braces with values", introducedBy: "PY-L06-04" },
  { id: "unicode-text", title: "A character can be more than a plain English letter", introducedBy: "PY-L06-05" },
  // M07. A list is a bracket of values. A tuple uses parentheses. Indexing text was M06; indexing a list is new.
  { id: "list-literal", title: "Square brackets hold values in order", introducedBy: "PY-L07-01" },
  { id: "tuple-literal", title: "Parentheses with commas hold a tuple: a fixed group of values", introducedBy: "PY-L07-01" },
  { id: "list-index", title: "items[n] and items[start:end] pick from a list", introducedBy: "PY-L07-02" },
  { id: "list-mutate", title: "append and items[n] = change a list", introducedBy: "PY-L07-03" },
  { id: "list-sort", title: "sorted makes a new list in order", introducedBy: "PY-L07-04" },
  { id: "list-copy", title: "copy makes a separate list", introducedBy: "PY-L07-04" },
  { id: "tuple-unpack", title: "a, b = pair stores each value under its own name", introducedBy: "PY-L07-05" },
  // M08. Curly braces are a dictionary when they hold key: value, and a set when they do not.
  { id: "dict-literal", title: "Curly braces hold key: value pairs", introducedBy: "PY-L08-01" },
  { id: "dict-lookup", title: "prices[key] reads the value stored under a key (KeyError when it is missing)", introducedBy: "PY-L08-01" },
  { id: "dict-store", title: "prices[key] = value adds or replaces a pair, and del removes one", introducedBy: "PY-L08-02" },
  { id: "dict-iterate", title: "items() walks each key and its value", introducedBy: "PY-L08-03" },
  { id: "set-literal", title: "Curly braces without colons hold a set", introducedBy: "PY-L08-04" },
  { id: "set-op", title: "intersection and difference compare two sets", introducedBy: "PY-L08-04" },
  { id: "nested-dict", title: "A value in a dictionary can be another dictionary", introducedBy: "PY-L08-05" },
  // M09. def first. Parameters, return, defaults, then a docstring.
  { id: "function-def", title: "def defines a function, and the name calls it", introducedBy: "PY-L09-01" },
  { id: "function-param", title: "A name in the parentheses receives a value", introducedBy: "PY-L09-02" },
  { id: "function-return", title: "return hands a value back to the caller", introducedBy: "PY-L09-03" },
  { id: "function-default", title: "A parameter can have a value for when the caller omits it", introducedBy: "PY-L09-04" },
  { id: "function-scope", title: "A name stored inside a function is not the outer name", introducedBy: "PY-L09-04" },
  { id: "function-doc", title: "A string on the first line of a function is a note, not output", introducedBy: "PY-L09-05" },
  // M10. No new syntax. Each lesson solves one realistic job with everything from M01–M09 together.
  { id: "order-total", title: "Small functions, one per pricing rule, combine into an order total", introducedBy: "PY-L10-01" },
  { id: "movie-summary", title: "One pass over a list of records returns a count, an average and the best record", introducedBy: "PY-L10-02" },
  { id: "weather-report", title: "Ordered readings: skip missing values, compare neighbours by position, total a window", introducedBy: "PY-L10-03" },
  { id: "text-category", title: "Cleaned text checked against keyword lists in priority order gives a category", introducedBy: "PY-L10-04" },
  { id: "mixed-review", title: "A program split into validate, compute and report functions connected by return values", introducedBy: "PY-L10-05" },
  // M11. String algorithms: normalise, split/join, find every match, count (frequencies, anagrams, runs), validate.
  { id: "string-normalize", title: "Normalising (strip, lower, replace, keep allowed characters) makes typed variants compare equal", introducedBy: "PY-L11-01" },
  { id: "string-split", title: "split breaks text into words or fields, and join puts a list of texts back together", introducedBy: "PY-L11-02" },
  { id: "string-find", title: "find returns the position of a piece, or -1; find(piece, start) finds the next one", introducedBy: "PY-L11-03" },
  { id: "value-count", title: "count tells how many times a value appears in a text or a list", introducedBy: "PY-L11-04" },
  { id: "string-check", title: "isdigit, isalpha and isalnum test what every character of a text is made of", introducedBy: "PY-L11-05" },
  // M12. The loops are old. The new idea is the list or dictionary you build.
  { id: "list-filter", title: "A new list can keep only the values that pass a test", introducedBy: "PY-L12-01" },
  { id: "list-map", title: "A new list can hold a changed copy of each value", introducedBy: "PY-L12-02" },
  { id: "dict-group", title: "A dictionary of lists groups values that share a key", introducedBy: "PY-L12-03" },
  { id: "dict-accumulate", title: "A dictionary keeps a running count or total for each key, starting at 0 the first time (+= adds to it)", introducedBy: "PY-L12-03" },
  { id: "dict-index", title: "A dictionary from ID to record finds the matching record with one lookup, so two collections can be joined", introducedBy: "PY-L12-04" },
  { id: "dict-update", title: "update copies pairs from one dictionary into another", introducedBy: "PY-L12-04" },
  { id: "list-unique", title: "A new list can skip values it already holds", introducedBy: "PY-L12-05" },
  // M13. A comprehension builds the collection in one line.
  { id: "list-comp", title: "A list comprehension builds a list in one line", introducedBy: "PY-L13-01" },
  { id: "dict-comp", title: "A dictionary comprehension builds pairs in one line", introducedBy: "PY-L13-02" },
  { id: "set-comp", title: "A set comprehension keeps each value once", introducedBy: "PY-L13-03" },
  { id: "nested-comp", title: "Two for clauses flatten a list of lists", introducedBy: "PY-L13-04" },
  { id: "comp-if", title: "A comprehension can keep only values that pass a test", introducedBy: "PY-L13-05" },
  // M14. enumerate is already known. zip, a sort key, any/all, map/filter, then sum/min/max.
  { id: "zip-call", title: "zip pairs a value from each list, and stops at the shorter list", introducedBy: "PY-L14-01" },
  { id: "sort-key", title: "sorted can order items by a value a function returns", introducedBy: "PY-L14-02" },
  { id: "any-call", title: "any is true when one value passes", introducedBy: "PY-L14-03" },
  { id: "all-call", title: "all is true only when every value passes", introducedBy: "PY-L14-03" },
  { id: "map-call", title: "map builds a new value for every item", introducedBy: "PY-L14-04" },
  { id: "filter-call", title: "filter keeps the items a function accepts", introducedBy: "PY-L14-04" },
  { id: "aggregate-call", title: "sum, min, and max reduce a list to one number", introducedBy: "PY-L14-05" },
  // M15. A star collects arguments. lambda is a function with no def. Then a closure, then recursion.
  { id: "star-args", title: "A starred parameter collects extra positional arguments", introducedBy: "PY-L15-01" },
  { id: "star-kwargs", title: "A double-starred parameter collects named arguments", introducedBy: "PY-L15-01" },
  { id: "keyword-only", title: "A parameter after * must be passed by name", introducedBy: "PY-L15-02" },
  { id: "lambda", title: "lambda is a one-line function with no name of its own", introducedBy: "PY-L15-03" },
  { id: "closure", title: "An inner function remembers a value from the function that built it", introducedBy: "PY-L15-04" },
  { id: "recursion", title: "A function can call itself until a base case", introducedBy: "PY-L15-05" },
  // M16. import arrives here, because Counter and the rest live in other modules.
  { id: "import-module", title: "from and import bring a name in from another module", introducedBy: "PY-L16-01" },
  { id: "counter-call", title: "Counter counts how many times each value appears", introducedBy: "PY-L16-01" },
  { id: "defaultdict-call", title: "defaultdict creates a missing value the first time you use the key", introducedBy: "PY-L16-02" },
  { id: "deque-call", title: "deque can take from the left and add on the right", introducedBy: "PY-L16-03" },
  { id: "groupby-call", title: "groupby walks runs of equal neighbors", introducedBy: "PY-L16-04" },
  { id: "combinations-call", title: "combinations lists every pair, without repeats", introducedBy: "PY-L16-05" },
  // M17. Read deep inside nested data, survive missing keys, walk inner lists, flatten, then copy each level you change.
  { id: "nested-index", title: "A second pair of brackets reads inside the list or dictionary the first pair returned", introducedBy: "PY-L17-01" },
  { id: "nested-lookup", title: "A chain of keys and positions reaches a value deep inside nested data", introducedBy: "PY-L17-01" },
  { id: "dict-get", title: "get returns None or a default for a missing key (a key holding None still gives None)", introducedBy: "PY-L17-02" },
  { id: "walk-nested", title: "An inner loop walks the list stored in each record", introducedBy: "PY-L17-03" },
  { id: "flatten-loop", title: "Flattening builds flat rows from nested records, carrying outer fields down", introducedBy: "PY-L17-04" },
  { id: "nested-copy", title: "copy() copies one level; copy every level you change so the original stays as it was", introducedBy: "PY-L17-05" },
  // M18. A specific except first (ValueError), then the error object and several handlers, else/finally, raise,
  // and a minimal class of your own error. class arrives here; M26 teaches attributes and methods and must not re-introduce class-def.
  { id: "try-except", title: "try runs code that may fail; except handles the error instead of stopping", introducedBy: "PY-L18-01" },
  { id: "except-type", title: "except ValueError catches only that kind of error; others still stop the program", introducedBy: "PY-L18-01" },
  { id: "except-as", title: "except ... as err keeps the error, so its message can be read or reported", introducedBy: "PY-L18-02" },
  { id: "except-many", title: "Several except clauses (or a tuple of types) handle different errors differently", introducedBy: "PY-L18-02" },
  { id: "try-else", title: "else after except runs only when the try block raised nothing", introducedBy: "PY-L18-03" },
  { id: "finally-clause", title: "finally runs whether the try succeeded or failed", introducedBy: "PY-L18-03" },
  { id: "raise-stmt", title: "raise ValueError(\"...\") stops with an error type and a message that says what was wrong", introducedBy: "PY-L18-04" },
  { id: "class-def", title: "class Name(Exception): pass makes your own kind of error (classes in full come in M26)", introducedBy: "PY-L18-05" },
  // M19. open/read/write/close (with an explicit encoding), then append, then with and line-by-line reading, Path, encodings.
  { id: "file-open", title: "open() connects to a text file to read or write it; close() lets it go", introducedBy: "PY-L19-01" },
  { id: "encoding-arg", title: "encoding=\"utf-8\" says how the file's characters are stored as bytes", introducedBy: "PY-L19-01" },
  { id: "file-append", title: "Mode \"w\" starts a file again; mode \"a\" adds to its end", introducedBy: "PY-L19-02" },
  { id: "with-statement", title: "with closes the file when the block ends, even after an error", introducedBy: "PY-L19-03" },
  { id: "file-lines", title: "for line in file reads one line at a time, so a large file never sits in memory", introducedBy: "PY-L19-03" },
  { id: "path-call", title: "Path joins folder and file names and reads, writes or checks files", introducedBy: "PY-L19-04" },
  { id: "path-glob", title: "glob lists the files in a folder whose names match a pattern", introducedBy: "PY-L19-04" },
  { id: "text-bytes", title: "encode and decode turn text into bytes and back; the wrong encoding fails or garbles text", introducedBy: "PY-L19-05" },
  // M20. CSV rows in and out, JSON in and out (and its errors), then one JSON record per line.
  { id: "csv-read", title: "csv.DictReader turns each CSV row into a dictionary of text values", introducedBy: "PY-L20-01" },
  { id: "csv-write", title: "csv.DictWriter (or csv.writer) writes a header and rows, quoting where needed", introducedBy: "PY-L20-02" },
  { id: "json-loads", title: "json.load and json.loads turn JSON into dictionaries, lists, numbers, text, booleans and None", introducedBy: "PY-L20-03" },
  { id: "json-error", title: "json.JSONDecodeError reports text that is not valid JSON", introducedBy: "PY-L20-03" },
  { id: "json-dumps", title: "json.dump and json.dumps write Python values as JSON text", introducedBy: "PY-L20-04" },
  { id: "jsonl-line", title: "JSONL holds one JSON value per line, so records are read and written one at a time", introducedBy: "PY-L20-05" },
  // M21. Parse and format, time zones, durations, exact money, then patterns.
  { id: "strptime-call", title: "strptime reads a date or time from text with a format; strftime writes one", introducedBy: "PY-L21-01" },
  { id: "timezone-call", title: "An aware datetime carries its time zone: timezone.utc or ZoneInfo(\"America/Chicago\")", introducedBy: "PY-L21-02" },
  { id: "zone-convert", title: "astimezone shows the same moment on another zone's clock", introducedBy: "PY-L21-02" },
  { id: "timedelta-call", title: "timedelta is a length of time you can add to or subtract from a date", introducedBy: "PY-L21-03" },
  { id: "date-span", title: "Subtracting two dates or datetimes gives a timedelta (.days, total_seconds())", introducedBy: "PY-L21-03" },
  { id: "decimal-call", title: "Decimal keeps money exact; quantize rounds it to cents with a rule you choose", introducedBy: "PY-L21-04" },
  { id: "regex-call", title: "re.search, re.findall and re.sub match patterns in text; groups pull out the parts", introducedBy: "PY-L21-05" },
  { id: "regex-fullmatch", title: "re.fullmatch checks that a whole text fits a pattern", introducedBy: "PY-L21-05" },
  // M22. import itself arrived in M16. These are the shapes: import styles, your own module, a package, __main__, a missing module.
  { id: "import-alias", title: "import x, from x import y, and as choose how a module's names arrive", introducedBy: "PY-L22-01" },
  { id: "module-file", title: "Any .py file next to your program is a module you can import; its top-level code runs once", introducedBy: "PY-L22-02" },
  { id: "package-import", title: "A folder with __init__.py is a package; dotted imports reach the modules inside", introducedBy: "PY-L22-03" },
  { id: "relative-import", title: "Inside a package, from .module import name imports a neighbouring module", introducedBy: "PY-L22-03" },
  { id: "dunder-main", title: "__name__ == \"__main__\" is true when the file is the program you ran", introducedBy: "PY-L22-04" },
  { id: "module-missing", title: "ModuleNotFoundError: check the module's name, its folder and sys.path", introducedBy: "PY-L22-05" },
  // M23. argparse, pathlib folder listings, environment settings, subprocess behind a replaceable runner, then plan/apply/report.
  { id: "argparse-call", title: "argparse describes a script's arguments (positional, --options, type, choices, flags) and parse_args reads them", introducedBy: "PY-L23-01" },
  { id: "dir-list", title: "iterdir, glob and rglob list a folder's files; name, stem, suffix and stat describe each path", introducedBy: "PY-L23-02" },
  { id: "env-read", title: "os.environ holds the environment's settings as text; optional ones are read with get and a default", introducedBy: "PY-L23-03" },
  { id: "subprocess-run", title: "subprocess.run starts another program (on a computer, not in a browser) and returns a CompletedProcess; pass the runner in so it can be replaced", introducedBy: "PY-L23-04" },
  { id: "file-report", title: "Folder automation builds a plan first (a dry run), then applies it and reports what changed and what was skipped", introducedBy: "PY-L23-05" },
  // M24. Read tracebacks, diagnose with prints and pdb, log with levels, log exceptions with their traceback, then a policy per problem.
  { id: "traceback-call", title: "A traceback is read bottom up; traceback.format_exc and extract_tb keep where a caught error happened", introducedBy: "PY-L24-01" },
  { id: "breakpoint-call", title: "Reproduce, isolate, inspect: labelled prints, repr, and pdb (breakpoint() pauses a program run in a terminal)", introducedBy: "PY-L24-02" },
  { id: "log-call", title: "logging writes messages with a level and a logger name; the program configures it once with basicConfig", introducedBy: "PY-L24-03" },
  { id: "log-warning", title: "Levels from DEBUG to CRITICAL: warning marks a problem the program survived", introducedBy: "PY-L24-03" },
  { id: "exc-name", title: "log.exception (or exc_info=True) keeps the traceback; type(err).__name__ names the kind of error", introducedBy: "PY-L24-04" },
  { id: "error-policy", title: "Each data problem gets a policy: correct and warn, skip and warn, or stop; an error budget stops a mostly broken file", introducedBy: "PY-L24-05" },
  // M25. assert and test functions, unittest.TestCase, a table of cases with subTest, setUp and test doubles, then edge cases.
  { id: "assert-stmt", title: "assert raises AssertionError (with an optional message) when a condition is false", introducedBy: "PY-L25-01" },
  { id: "test-func", title: "A test_ function calls code with known inputs and asserts the expected result", introducedBy: "PY-L25-01" },
  { id: "unittest-case", title: "unittest.TestCase groups test_ methods (self is the test; classes in full come in M26) with assertEqual, assertRaises and friends", introducedBy: "PY-L25-02" },
  { id: "case-pairs", title: "A table of (input, expected) cases runs through one test, with subTest naming each case that fails", introducedBy: "PY-L25-03" },
  { id: "fixture-fn", title: "setUp (or a helper) builds fresh test data for every test, so one test can't spoil another's", introducedBy: "PY-L25-04" },
  { id: "stand-in", title: "A test double (a small fake or unittest.mock.Mock) replaces a slow or outside dependency and records how it was called", introducedBy: "PY-L25-04" },
  { id: "edge-case", title: "Edge cases (empty, one item, boundaries, duplicates, bad input) are where defective code is caught", introducedBy: "PY-L25-05" },
  // M26. class arrived in M18 for errors. Here: a class with __init__, shared objects, validating constructors, methods, class state.
  { id: "plain-class", title: "A class with no base describes a new kind of object; calling it creates one", introducedBy: "PY-L26-01" },
  { id: "attr-assign", title: "obj.name = value stores an attribute on that one object", introducedBy: "PY-L26-01" },
  { id: "init-method", title: "__init__ runs when the class is called and fills in the new object's attributes", introducedBy: "PY-L26-01" },
  { id: "self-name", title: "self is the object a method is working on", introducedBy: "PY-L26-01" },
  { id: "object-identity", title: "Names refer to objects: two names can share one object, and == on a plain class compares identity", introducedBy: "PY-L26-02" },
  { id: "init-validate", title: "A constructor converts and checks its arguments and raises ValueError, so no invalid object exists", introducedBy: "PY-L26-03" },
  { id: "method-def", title: "A method is a function defined in the class that takes self; it can read and change the object", introducedBy: "PY-L26-04" },
  { id: "class-state", title: "A name on the class is shared by every object of that class; assigning through self makes a separate instance attribute", introducedBy: "PY-L26-05" },
  { id: "classmethod-dec", title: "@classmethod receives the class (cls), for alternative constructors such as from_row", introducedBy: "PY-L26-05" },
  // M27. A subclass, overriding with super(), one call on many classes, objects that hold objects, then choosing between them.
  { id: "subclass", title: "class Child(Parent) inherits the parent's attributes and methods; isinstance accepts the child as a parent", introducedBy: "PY-L27-01" },
  { id: "method-override", title: "A subclass method replaces the parent method of the same name", introducedBy: "PY-L27-02" },
  { id: "super-call", title: "super() calls the parent's version, so an override can extend it instead of copying it", introducedBy: "PY-L27-02" },
  { id: "poly-call", title: "The same method call runs a different method on each class, replacing if/elif on the kind of object", introducedBy: "PY-L27-03" },
  { id: "part-attr", title: "An object can hold other objects (order.customer.email) and delegate work to them", introducedBy: "PY-L27-04" },
  { id: "kind-link", title: "Inherit when the child is a kind of the parent; hold a part (composition) when it only needs the part's behaviour", introducedBy: "PY-L27-05" },
  // M28. dataclasses, properties, special methods, type hints, then TypedDict and Protocol.
  { id: "dataclass-dec", title: "@dataclass writes __init__, __repr__ and __eq__ from annotated fields; field(default_factory=...) and __post_init__", introducedBy: "PY-L28-01" },
  { id: "field-ann", title: "name: type annotates a field or variable", introducedBy: "PY-L28-01" },
  { id: "property-dec", title: "@property computes an attribute when it is read; a setter validates assignments", introducedBy: "PY-L28-02" },
  { id: "str-method", title: "__repr__ and __str__ decide how an object is shown to developers and to users", introducedBy: "PY-L28-03" },
  { id: "operator-methods", title: "__eq__, __lt__, __len__ and __contains__ make objects work with ==, sorted, len and in", introducedBy: "PY-L28-03" },
  { id: "return-hint", title: "Type hints (x: int, -> str, list[str], X | None) document types; Python does not check them at run time", introducedBy: "PY-L28-04" },
  { id: "typed-dict", title: "TypedDict names the keys and value types a dictionary should have; at run time it is a plain dict", introducedBy: "PY-L28-05" },
  { id: "protocol-base", title: "Protocol describes the methods an object must have, without being its parent (structural typing)", introducedBy: "PY-L28-05" },
  // M29. Abstract base classes, runtime protocols, mixins and the MRO, descriptors, then dependency injection.
  { id: "abstract-method", title: "An ABC with @abstractmethod can't be instantiated until a subclass supplies every abstract method", introducedBy: "PY-L29-01" },
  { id: "runtime-protocol", title: "@runtime_checkable lets isinstance test a Protocol, checking only that the methods exist", introducedBy: "PY-L29-02" },
  { id: "mixin-class", title: "A mixin is a small class that adds one behaviour through multiple inheritance; the MRO decides lookup order", introducedBy: "PY-L29-03" },
  { id: "descriptor-method", title: "A descriptor's __get__/__set__ (and __set_name__) run when a class attribute is read or written, for reusable validation", introducedBy: "PY-L29-04" },
  { id: "inject-dep", title: "Dependency injection: pass collaborators (clock, rates, storage) into the constructor so they can be replaced", introducedBy: "PY-L29-05" },
  // M30. The files that describe an environment and a project (pyvenv.cfg, pyproject.toml, requirements and installed
  // metadata), then real SQLite: parameterised queries and transactions.
  { id: "venv-mark", title: "A virtual environment is a folder with its own site-packages and a pyvenv.cfg; sys.prefix differs from sys.base_prefix inside one; venv, activate and pip are terminal commands", introducedBy: "PY-L30-01" },
  { id: "pyproject-file", title: "pyproject.toml's [project] table holds name, version, requires-python and dependencies; tomllib reads TOML into dictionaries ([tool.x] holds tool settings)", introducedBy: "PY-L30-02" },
  { id: "dep-list", title: "A requirement names a package and the versions it accepts (>=2.2,<3); versions compare as numbers; importlib.metadata reports what is installed", introducedBy: "PY-L30-03" },
  { id: "sqlite-call", title: "sqlite3.connect opens a database file (or :memory:); execute and executemany run SQL, fetchall and fetchone return rows as tuples", introducedBy: "PY-L30-04" },
  { id: "sql-param", title: "? placeholders pass values separately from the SQL, so quotes in data can't break or change a query", introducedBy: "PY-L30-04" },
  { id: "sql-tx", title: "commit keeps a transaction's writes, rollback undoes them; with conn: commits a block that finishes and rolls back one that raises", introducedBy: "PY-L30-05" },
  // M31. urllib's real client API (Request, opener, HTTPError, URLError) against saved copies of real API responses
  // served by a replay handler, since a browser page has no sockets of its own.
  { id: "http-get", title: "urllib.request sends a Request (method, URL with an encoded query string, headers) through an opener and returns a response with a status, headers and a body of bytes", introducedBy: "PY-L31-01" },
  { id: "response-body", title: "A JSON body is bytes: check the status and Content-Type, then json.loads; a 4xx or 5xx status raises urllib.error.HTTPError, whose code and body explain the failure", introducedBy: "PY-L31-02" },
  { id: "page-walk", title: "A paginated API returns one page per request and a way to ask for the next (page number, offset or cursor); loop until it says there is no more", introducedBy: "PY-L31-03" },
  { id: "retry-stop", title: "timeout= bounds how long a request may wait; retry only temporary failures (timeouts, 429, 5xx) a limited number of times, waiting longer each time", introducedBy: "PY-L31-04" },
  { id: "client-fn", title: "An API client class owns the base URL, headers, timeout and opener, so callers ask for data by name and tests can pass in a replay opener", introducedBy: "PY-L31-05" },
  // M32. The iterator protocol, generator functions, yield from, lazy pipelines, then what laziness costs and saves.
  { id: "iter-method", title: "iter() gets an iterator from an iterable and next() pulls one value until StopIteration; a class with __iter__ and __next__ is an iterator", introducedBy: "PY-L32-01" },
  { id: "yield-expr", title: "A function containing yield returns a generator: its body runs only when the next value is asked for, pausing at each yield", introducedBy: "PY-L32-02" },
  { id: "yield-from", title: "yield from hands on every value of another iterable or generator, so recursive and chained generators stay short", introducedBy: "PY-L32-03" },
  { id: "lazy-pipe", title: "Generator expressions and chained generators form a pipeline that handles one item at a time; islice and takewhile stop early", introducedBy: "PY-L32-04" },
  { id: "lazy-one", title: "A generator holds one item at a time, so memory stays small (tracemalloc measures the peak), but it can be consumed only once", introducedBy: "PY-L32-05" },
  // M33. Decorators (plain, with arguments, wraps), then context managers as classes and with contextlib.
  { id: "decorator-at", title: "A decorator takes a function and returns a replacement, usually a wrapper taking *args and **kwargs; @name above a def applies it", introducedBy: "PY-L33-01" },
  { id: "decorator-call", title: "@name(arg) calls a decorator factory first: the outer function holds the settings and returns the decorator", introducedBy: "PY-L33-02" },
  { id: "wraps-dec", title: "functools.wraps copies the wrapped function's __name__, __doc__ and __wrapped__ onto the wrapper", introducedBy: "PY-L33-03" },
  { id: "enter-method", title: "A class with __enter__ and __exit__ is a context manager: __exit__ always runs, receives any exception, and returns True to suppress it", introducedBy: "PY-L33-04" },
  { id: "context-dec", title: "contextlib.contextmanager turns a generator with one yield inside try/finally into a context manager; suppress and ExitStack cover common cases", introducedBy: "PY-L33-05" },
  // M34. Pure functions, partial, composition, introspection, then registries that pick a function from data.
  { id: "pure-fn", title: "A pure function's result depends only on its arguments and it changes nothing outside itself, so it is easy to test and reuse", introducedBy: "PY-L34-01" },
  { id: "partial-call", title: "functools.partial fixes some arguments of a function and returns a new callable that takes the rest", introducedBy: "PY-L34-02" },
  { id: "compose-call", title: "Composition chains functions so each result is the next one's argument; a pipeline is a list of steps applied in order", introducedBy: "PY-L34-03" },
  { id: "callable-call", title: "Introspection: callable, getattr and hasattr, __name__ and inspect.signature examine objects and functions while the program runs", introducedBy: "PY-L34-04" },
  { id: "register-map", title: "A registry decorator stores functions in a dictionary under a name, so the program can choose which one to call from data", introducedBy: "PY-L34-05" },
  // M35. Counting work as n grows (Big O), binary search and bisect, hashing (sets and dicts), stacks and queues, recursion's costs.
  { id: "op-count", title: "Counting the basic operations (comparisons, lookups) an algorithm makes measures its cost without a stopwatch", introducedBy: "PY-L35-01" },
  { id: "big-o", title: "Big O describes how work grows with the input size n: O(1) stays flat, O(n) doubles when n doubles, O(n²) quadruples", introducedBy: "PY-L35-01" },
  { id: "binary-search", title: "Binary search halves a sorted range at every step, so it needs about log2(n) comparisons instead of n", introducedBy: "PY-L35-02" },
  { id: "bisect-call", title: "bisect_left and bisect_right find where a value belongs in a sorted list; sort once (O(n log n)) to search many times", introducedBy: "PY-L35-02" },
  { id: "hash-lookup", title: "in on a set or dict hashes the value and checks one slot, so it costs about the same for 10 items or a million", introducedBy: "PY-L35-03" },
  { id: "hashable-key", title: "Only hashable (immutable) values can be dict keys or set members: a list raises TypeError, a tuple works", introducedBy: "PY-L35-03" },
  { id: "stack-lifo", title: "A stack (append and pop on a list) hands back the newest item first: undo history, bracket matching, depth-first walks", introducedBy: "PY-L35-04" },
  { id: "queue-fifo", title: "A queue (deque append and popleft) hands back the oldest item first; list.pop(0) shifts every other item, so it is O(n)", introducedBy: "PY-L35-04" },
  { id: "recursion-limit", title: "Every recursive call adds a frame; past sys.getrecursionlimit() frames Python raises RecursionError", introducedBy: "PY-L35-05" },
  { id: "recursion-cost", title: "A recursion that solves the same subproblem again and again does exponential work; a loop or an explicit stack avoids it", introducedBy: "PY-L35-05" },
  // M36. Names and references, shallow and deep copies, cycles and the collector, measuring memory, then CPython's bytecode and the GIL.
  { id: "shared-ref", title: "Names, list slots and parameters refer to objects: two references to one mutable object see each other's changes", introducedBy: "PY-L36-01" },
  { id: "ref-count", title: "CPython frees an object as soon as nothing refers to it any more; del removes a name, not the object", introducedBy: "PY-L36-01" },
  { id: "shallow-copy", title: "copy.copy, list(), a slice and .copy() copy only the outer container; the objects inside are shared", introducedBy: "PY-L36-02" },
  { id: "deep-copy", title: "copy.deepcopy copies every level, keeps an object shared twice shared once, and survives cycles", introducedBy: "PY-L36-02" },
  { id: "gc-collect", title: "Objects in a reference cycle never reach zero references; the cycle collector (gc.collect) finds and frees them", introducedBy: "PY-L36-03" },
  { id: "weak-ref", title: "weakref.ref and weakref.finalize observe an object without keeping it alive", introducedBy: "PY-L36-03" },
  { id: "sizeof-call", title: "sys.getsizeof is shallow: a container's size counts its slots, not the objects it holds", introducedBy: "PY-L36-04" },
  { id: "mem-snapshot", title: "tracemalloc snapshots: take_snapshot, statistics(\"lineno\") and compare_to show which lines allocated the memory", introducedBy: "PY-L36-04" },
  { id: "slots-attr", title: "__slots__ replaces each object's attribute dictionary with fixed slots, so many small objects need less memory", introducedBy: "PY-L36-04" },
  { id: "bytecode-dis", title: "CPython compiles source to bytecode and runs it one instruction at a time; dis shows the instructions", introducedBy: "PY-L36-05" },
  { id: "gil-flag", title: "In standard CPython the GIL lets one thread run bytecode at a time and may switch between instructions, so x += 1 is not atomic; free-threaded builds (3.13+) drop it", introducedBy: "PY-L36-05" },
  // M37. timeit, cProfile and pstats, caches, efficient file I/O, then optimising the algorithm and proving it with counts.
  { id: "timeit-call", title: "timeit runs code many times; repeat takes several rounds, and the minimum per call is the fairest number", introducedBy: "PY-L37-01" },
  { id: "bench-compare", title: "Compare implementations on the same input by the ratio of their per-call times; one run or one machine proves little", introducedBy: "PY-L37-01" },
  { id: "profile-call", title: "cProfile records every call; pstats sorts them by cumulative or own time (ncalls, tottime, cumtime) to find the hotspot", introducedBy: "PY-L37-02" },
  { id: "lru-cache", title: "functools.cache and lru_cache(maxsize) remember results by argument; cache_info counts hits and misses; cache only pure functions with hashable arguments", introducedBy: "PY-L37-03" },
  { id: "stream-io", title: "Efficient I/O: stream a big file line by line, open a file once, and write in batches instead of piece by piece", introducedBy: "PY-L37-04" },
  { id: "fast-lookup", title: "Optimise the algorithm before the details: build an index once, sort once, move work out of loops, and check the results didn't change", introducedBy: "PY-L37-05" },
  // M38. Threads, executors and futures, shared state and locks, processes and pickling, then choosing from measured CPython results.
  { id: "thread-start", title: "threading.Thread(target, args) runs a function alongside the main program; start() begins it and join() waits; threads help work that waits (I/O)", introducedBy: "PY-L38-01" },
  { id: "pool-submit", title: "concurrent.futures executors: submit returns a Future whose result() waits and re-raises; map keeps input order; as_completed yields in finishing order", introducedBy: "PY-L38-02" },
  { id: "thread-lock", title: "Threads can switch between the read and the write of x += 1 and lose updates; a Lock (with lock:) makes the update one step; a Queue hands work over safely", introducedBy: "PY-L38-03" },
  { id: "process-start", title: "Processes run Python on several cores at once, each with its own memory and GIL; arguments and results are pickled; the entry point needs the __main__ guard", introducedBy: "PY-L38-04" },
  { id: "bench-row", title: "Measured on CPython: threads speed up waiting, not CPU work; processes speed up CPU work but pay start-up and pickling costs", introducedBy: "PY-L38-05" },
  // M39. Coroutines and the event loop, tasks, cancellation and timeouts, semaphores, then an async request workflow.
  { id: "async-await", title: "async def makes a coroutine function; await pauses until the awaited work finishes; asyncio.run(main()) runs the event loop", introducedBy: "PY-L39-01" },
  { id: "task-call", title: "create_task schedules a coroutine to run while others wait; gather and TaskGroup wait for several and return results in order", introducedBy: "PY-L39-02" },
  { id: "cancel-call", title: "task.cancel() raises CancelledError at the task's next await; asyncio.timeout and wait_for cancel slow work with TimeoutError; finally cleans up", introducedBy: "PY-L39-03" },
  { id: "sem-gate", title: "asyncio.Semaphore(n) lets at most n tasks inside an async with block at once, limiting how much runs together", introducedBy: "PY-L39-04" },
  { id: "async-fetch", title: "An async client gathers many requests under a semaphore, with a timeout and limited retries each, and reports failures without losing results", introducedBy: "PY-L39-05" },
  // M40. Separating concerns, configuration, dependency boundaries, behaviour-preserving refactoring, then integration tests.
  { id: "split-fn", title: "Separation of concerns: parse, compute and present in separate functions; pure logic in the middle, input and output at the edges", introducedBy: "PY-L40-01" },
  { id: "config-map", title: "Configuration: defaults, a file and environment overrides merged in a fixed order, validated once into an object passed to the code that needs it", introducedBy: "PY-L40-02" },
  { id: "passed-call", title: "Dependency boundaries: the core depends on an interface it defines; adapters (files, databases, networks) implement it, and imports point inward", introducedBy: "PY-L40-03" },
  { id: "helper-fn", title: "Refactoring changes structure, not behaviour: pin the behaviour with tests, then extract functions, replace if/elif chains with a table, remove duplication", introducedBy: "PY-L40-04" },
  { id: "integ-check", title: "An integration test runs several real modules together through the public entry point, faking only the outer edges (a temporary folder, in-memory storage)", introducedBy: "PY-L40-05" },
  // M41–M45 (rebuilt): NumPy arrays, pandas tables and transformations, matplotlib charts, file formats and workflows.
  { id: "np-array", title: "np.array builds an array of one dtype from a list; shape and ndim describe it; np.zeros and np.arange build arrays to fill", introducedBy: "PY-L41-01" },
  { id: "np-dtype", title: "dtype is the kind of value every slot holds (the default integer width is platform-dependent); astype converts and astype(int) truncates; tolist gives plain Python values", introducedBy: "PY-L41-01" },
  { id: "np-reduce", title: "sum, mean, min and max reduce a whole array in one call; NumPy scalars become plain numbers with float() or int()", introducedBy: "PY-L41-01" },
  { id: "np-index", title: "a[row, col], slices with : and boolean masks (values[values > 0]) pick cells, rows, columns and matching values", introducedBy: "PY-L41-02" },
  { id: "np-view", title: "A slice is a view that shares memory with the original; a mask builds a new array; copy() makes an independent one", introducedBy: "PY-L41-02" },
  { id: "np-broadcast", title: "Arithmetic is element by element; broadcasting stretches size-1 dimensions (shapes compared from the right), and [:, None] makes a column", introducedBy: "PY-L41-03" },
  { id: "np-where", title: "Vectorised rules: masks joined with & | ~ (each comparison in parentheses), np.where, np.select, np.diff, np.cumsum, np.abs, np.flatnonzero", introducedBy: "PY-L41-04" },
  { id: "np-stats", title: "axis=0/axis=1 statistics, argmax/argmin positions, median, std and percentiles; np.nan marks gaps and the nan- functions skip them", introducedBy: "PY-L41-05" },
  { id: "pd-frame", title: "A DataFrame is a table of named columns (each a Series) built from records or read_csv (to_csv writes one back); shape, columns and head describe it; column arithmetic is element-wise", introducedBy: "PY-L42-01" },
  { id: "pd-loc", title: "df[[cols]], loc (labels, inclusive slices), iloc (positions) and set_index pick rows and columns; sort_values orders the rows", introducedBy: "PY-L42-02" },
  { id: "pd-filter", title: "A boolean Series inside df[...] keeps rows; combine with & | ~ in parentheses; isin, between and .str methods build the tests", introducedBy: "PY-L42-03" },
  { id: "pd-missing", title: "Empty cells are NaN: isna/notna find them, dropna removes rows, fillna fills them; sum and mean skip NaN", introducedBy: "PY-L42-04" },
  { id: "pd-kind", title: "dtypes shows each column's type; pd.to_numeric(errors=\"coerce\") turns bad text into NaN; read_csv's dtype= keeps codes as text", introducedBy: "PY-L42-05" },
  { id: "pd-group", title: "groupby splits rows by a key and agg/size/sum combine each group; value_counts counts values; reset_index turns the key back into a column", introducedBy: "PY-L43-01" },
  { id: "pd-merge", title: "merge joins two tables on a key (how=inner/left, indicator, validate); duplicate keys multiply rows, so drop_duplicates(subset=key) keeps one row per key first", introducedBy: "PY-L43-02" },
  { id: "pd-pivot", title: "pivot_table spreads one column's values into column headers with an aggregate and fill_value; pivot refuses duplicate entries", introducedBy: "PY-L43-03" },
  { id: "pd-time", title: "to_datetime parses timestamps (errors=\"coerce\" for bad ones); .dt gives parts, differences are Timedeltas, to_period groups by month", introducedBy: "PY-L43-04" },
  { id: "pd-quality", title: "Data quality checks: normalise text, duplicated/drop_duplicates on a key subset, and range rules reported as counts", introducedBy: "PY-L43-05" },
  { id: "mpl-axes", title: "plt.subplots gives a Figure and Axes; ax.bar, ax.plot, set_title and set_xlabel draw on it; the Axes can be inspected (patches, lines, get_title)", introducedBy: "PY-L44-01" },
  { id: "pd-plot", title: "DataFrame.plot and Series.plot draw with matplotlib onto an Axes (kind=, ax=); plt.subplots(nrows, ncols) gives a grid of Axes", introducedBy: "PY-L44-02" },
  { id: "chart-pick", title: "The question picks the chart: line for change over time, bar for comparing categories, scatter for a relationship, histogram for a distribution", introducedBy: "PY-L44-03" },
  { id: "pd-dist", title: "Distributions: histograms (bins and counts), describe and quantile, and the 1.5 x IQR outlier rule", introducedBy: "PY-L44-04" },
  { id: "story-title", title: "A chart that makes a point: sorted bars, one highlighted colour, a title stating the finding computed from the data, labelled values", introducedBy: "PY-L44-05" },
  { id: "arrow-file", title: "Parquet stores typed columns: to_parquet/read_parquet (with pyarrow) keep dtypes a CSV loses, and columns= reads only what is needed", introducedBy: "PY-L45-01" },
  { id: "pd-chunk", title: "read_csv(chunksize=, usecols=) streams a file in pieces; combine partial sums and counts, never averages of averages", introducedBy: "PY-L45-02" },
  { id: "duck-ask", title: "SQL from pandas: read_sql_query with sqlite3 and ? parameters, to_sql, and DuckDB querying a DataFrame or file directly", introducedBy: "PY-L45-03" },
  { id: "repro-run", title: "Reproducible analysis: a seeded np.random.default_rng, explicit parameters, sorted output, and a hash to compare runs", introducedBy: "PY-L45-04" },
  { id: "pd-export", title: "to_csv(index=False), to_json(orient=\"records\") and float_format write results others can read back exactly", introducedBy: "PY-L45-05" },
  // M46–M50: reliable pipelines, security, observability, delivery and the production-readiness capstone.
  { id: "ingest-quarantine", title: "Ingestion reads every line of external data, keeps the records that parse and quarantines each bad line with its line number and reason, so nothing is lost silently", introducedBy: "PY-L46-01" },
  { id: "schema-contract", title: "A schema contract names each field's type and whether it may be missing or empty; validation reports every problem in a record (bool is not an int) instead of crashing later", introducedBy: "PY-L46-02" },
  { id: "once-add", title: "An idempotent step has the same effect when it runs again: key records by a natural ID and upsert, remember processed IDs, and rewrite outputs instead of appending", introducedBy: "PY-L46-03" },
  { id: "checkpoint-file", title: "A checkpoint records how far a run got (an offset and partial totals), saved after the work it describes and written atomically (temporary file, then os.replace)", introducedBy: "PY-L46-04" },
  { id: "resume-run", title: "Recovery resumes from the checkpoint, discards output written after it, and finishes with exactly the result of one clean run", introducedBy: "PY-L46-05" },
  { id: "allow-list", title: "Untrusted input is accepted only when it matches an allow-list (a full pattern, a set of choices, a range); anything else is rejected, not cleaned up", introducedBy: "PY-L47-01" },
  { id: "secret-handling", title: "Secrets come from the environment, never the source code; they are masked in repr and logs, compared with secrets.compare_digest and generated with the secrets module", introducedBy: "PY-L47-02" },
  { id: "sql-identifier", title: "Values travel through ? placeholders, but table and column names can't: an identifier from input is chosen from an allow-list before it goes into the SQL text", introducedBy: "PY-L47-03" },
  { id: "unsafe-load", title: "Loading must never run code: a loader that lets the data choose what to call (evaluating text as Python, serialisers that rebuild any object, class names looked up in globals) obeys whoever wrote the data; read untrusted data with json, allow-list the types it may create and validate its shape", introducedBy: "PY-L47-04" },
  { id: "safe-path", title: "A user-supplied file name is resolved against a base folder and refused unless the result is_relative_to that folder (.. and absolute paths escape it)", introducedBy: "PY-L47-05" },
  { id: "json-log", title: "Structured logging: a logging.Formatter subclass writes each record as one JSON object with fixed fields plus extra= context, so logs can be parsed and filtered", introducedBy: "PY-L48-01" },
  { id: "metric-count", title: "Metrics: counters for outcomes and durations from a monotonic clock, summarised as count, mean and percentiles (p50, p95) rather than only an average", introducedBy: "PY-L48-02" },
  { id: "trace-span", title: "Tracing: one trace id follows a request through every step; each step is a span with its own id, its parent's id, a start and a duration", introducedBy: "PY-L48-03" },
  { id: "backoff-retry", title: "Retries with exponential backoff: retry only transient errors, wait base * 2**attempt (capped, with seeded jitter), stop after the last attempt and re-raise", introducedBy: "PY-L48-04" },
  { id: "log-query", title: "Failure investigation: parse JSON log lines, follow one trace id, group errors by type and find the first failure before the symptoms", introducedBy: "PY-L48-05" },
  { id: "lock-pin", title: "A lock file pins every package to one exact version (often with a hash); comparing it with what is installed finds drift and unpinned dependencies", introducedBy: "PY-L49-01" },
  { id: "dockerfile-lint", title: "A Dockerfile builds an image in layers: a pinned base image, WORKDIR, dependencies before code so the install layer is cached, a non-root USER and one CMD", introducedBy: "PY-L49-02" },
  { id: "ci-gate", title: "CI runs the same commands on every push; the test run's result becomes the exit code, and a non-zero exit fails the build", introducedBy: "PY-L49-03" },
  { id: "typed-config", title: "Deployment settings arrive as text in the environment: convert and check every one at startup (\"false\" is not False), report all problems together, then use a frozen config", introducedBy: "PY-L49-04" },
  { id: "ready-check", title: "A readiness check runs independent checks (settings, database schema version, files) and reports each, so a deploy goes ahead only when all of them pass", introducedBy: "PY-L49-05" },
  { id: "design-review", title: "A design review checks that each module has one job (parse, validate, compute, write) and that the core takes plain data and returns results without touching files", introducedBy: "PY-L50-01" },
  { id: "pipeline-invariant", title: "Pipeline tests check properties as well as outputs: every input row is accounted for, a second run changes nothing, and a resumed run equals a clean one", introducedBy: "PY-L50-02" },
  { id: "hot-path", title: "A performance review measures the whole run, finds the step that dominates, fixes its algorithm and proves the output didn't change", introducedBy: "PY-L50-03" },
  { id: "resilient-run", title: "A resilient pipeline combines the safeguards: bad rows quarantined, transient failures retried, progress checkpointed and every outcome counted", introducedBy: "PY-L50-04" },
  { id: "release-check", title: "A release review gathers the evidence (tests, pinned dependencies, settings, a smoke run) into one go/no-go report with a reason for every failure", introducedBy: "PY-L50-05" },
] as const satisfies readonly PyConcept[];

export type PyConceptId = (typeof pyConcepts)[number]["id"];

const byId = new Map(pyConcepts.map((c) => [c.id, c]));

export function conceptIntroducedBy(id: string): PyLessonId | undefined {
  return byId.get(id as PyConceptId)?.introducedBy;
}

/** Drop string contents so a # or keyword inside quotes is not read as code. */
function bareCode(code: string): string {
  return code
    .replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, '""')
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""')
    .replace(/#.*$/gm, "");
}

function stringContents(code: string): string[] {
  const out: string[] = [];
  const re = /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g;
  for (const m of code.matchAll(re)) out.push(m[0].slice(1, -1));
  return out;
}

const KEYWORD: [RegExp, PyConceptId][] = [
  [/\bdef\b/, "function-def"],
  [/\breturn\b/, "function-return"],
  [/\blambda\b/, "lambda"],
  [/\b(try|except)\b/, "try-except"],
  [/\bfinally\b/, "finally-clause"],
  [/\braise\b/, "raise-stmt"],
  [/\bwith\b/, "with-statement"],
  [/\bimport\b/, "import-module"],
  [/\bclass\b/, "class-def"],
  [/\byield\b/, "yield-expr"],
  [/\b(async|await)\b/, "async-await"],
  [/\b(True|False)\b/, "boolean"],
  [/\bNone\b/, "none-value"],
  [/\binput\s*\(/, "input"],
  [/\bPrint\s*\(/, "case-sensitive"],
];

/**
 * Concepts a program actually uses, as far as a pattern can see.
 * Explanations such as "quotes are not printed" are declared by the lesson; they have no token to find.
 */
export function conceptsUsedInCode(code: string): PyConceptId[] {
  const found = new Set<PyConceptId>();
  const add = (id: PyConceptId) => found.add(id);
  // unittest.TestCase arrives in M25, before classes in full (M26-M27). Inside a TestCase class, `self` and the
  // test methods are the shape unittest asks for: tagged unittest-case, not as methods, self or a subclass.
  const masked = maskTestCases(code);
  if (masked !== code) add("unittest-case");
  code = masked;
  const bare = bareCode(code);
  const strings = stringContents(code);

  const noStrings = code.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g, '""');
  if (/\bprint\s*\(/.test(bare)) add("print-call");
  if (/print\(\s*\)/.test(bare)) add("print-blank");
  if (/print\([^)\n]*,/.test(bare)) add("print-several");
  if (/print\([^)\n]*["']/.test(code)) add("print-text");
  if (/print\(\s*-?\d/.test(bare)) add("print-number");
  if (/\bsep\s*=/.test(bare)) add("sep");
  if (/\bend\s*=/.test(bare)) add("end");
  if (strings.some((s) => s.includes("\\n"))) add("newline-escape");
  if (strings.some((s) => s.includes("#"))) add("hash-in-text");
  // Two or more leading spaces: indented output. A single space in sep= or end= is formatting, not this.
  if (strings.some((s) => /^\s{2,}/.test(s))) add("spaces-in-text");
  if (/(^|\n)[ \t]+\S/.test(bare)) add("top-level-indent");
  if (/#/.test(noStrings)) add("comment");
  if (/(^|\n)\s*#/.test(noStrings)) add("comment-out");
  if (/print\(\s*[A-Za-z_]\w*\s*\)/.test(bare)) add("unquoted-name");
  const assigned: string[] = [];
  for (const m of bare.matchAll(/(?<![.\w])(?!sep\b)(?!end\b)([A-Za-z_]\w*)\s*=(?!=)/g)) assigned.push(m[1]);
  if (assigned.length) add("assignment");
  if (assigned.some((n, i) => assigned.indexOf(n) !== i)) add("reassignment");
  if (/\b(int|float|str)\s*\(/.test(bare)) add("conversion");
  if (/\btype\s*\(/.test(bare)) add("type-call");
  if (usesArithmetic(bare)) add("arithmetic");
  if (usesComparison(bare)) add("comparison");
  if (/\b(and|or|not)\b/.test(bare)) add("logical");
  if (/\bin\b/.test(bare)) add("membership");
  if (/\bis\b/.test(bare)) add("identity");
  if (usesPrecedence(bare)) add("precedence");
  if (/<<|>>|(?<!&)&(?!&)|(?<!\|)\|(?!\|)|(?<!\^)\^(?!\^)|~/.test(bare)) add("bitwise");
  tagLines(bare, add);
  if (/\brange\s*\(/.test(bare)) add("range-call");
  if (/\benumerate\s*\(/.test(bare)) add("enumerate-call");
  if (/\blen\s*\(/.test(bare)) add("len-call");
  if (/\.(lower|upper|strip|replace|startswith|endswith|title|capitalize)\s*\(/.test(bare)) add("string-method");
  if (/(^|[^\w])f""/.test(bare) || /\.format\s*\(/.test(bare)) add("string-format");
  if (/\b(ord|chr)\s*\(/.test(bare) || strings.some((s) => /[^\x00-\x7F]/.test(s))) add("unicode-text");
  for (const m of bare.matchAll(/(?:[A-Za-z_]\w*|\)|"")\s*\[([^\]\n]*)\]/g)) {
    if (m[1].includes(":")) add("string-slice");
    else add("string-index");
  }
  tagCollections(code, bare, add);
  for (const [re, id] of KEYWORD) if (re.test(bare)) add(id);
  // A .py path and breakpoint() may live in a string. The string is the file or the recorded command, not a call.
  if (code.includes(".py")) add("module-file");
  if (code.includes("breakpoint(")) add("breakpoint-call");
  if (code.includes("pyvenv.cfg") || /\bsys\.base_prefix\b/.test(bare)) add("venv-mark");
  if (code.includes("pyproject.toml") || /\btomllib\b/.test(bare)) add("pyproject-file");
  if (/\bimportlib\.metadata\b|\bfrom\s+importlib\s+import\s+metadata\b|\bPackageNotFoundError\b/.test(bare)) add("dep-list");
  return [...found];
}

/**
 * Rewrites each `class X(unittest.TestCase):` block so its methods read as plain functions: the header loses its
 * base, and `self.` / the `self` parameter disappear inside the block. Code without a TestCase is returned unchanged.
 */
function maskTestCases(code: string): string {
  const lines = code.split("\n");
  let inside = -1;
  let changed = false;
  const out = lines.map((line) => {
    const indent = line.match(/^\s*/)![0].length;
    if (inside >= 0 && line.trim() && indent <= inside) inside = -1;
    const head = line.match(/^(\s*)class\s+(\w+)\s*\(\s*(?:unittest\.)?TestCase\s*\)\s*:/);
    if (head) {
      inside = head[1].length;
      changed = true;
      return `${head[1]}class ${head[2]}(Exception):`;
    }
    if (inside < 0) return line;
    return line.replace(/\(\s*self\s*,\s*/g, "(").replace(/\(\s*self\s*\)/g, "()").replace(/\bself\./g, "");
  });
  return changed ? out.join("\n") : code;
}

/** + - * / // % ** outside strings. A minus that is part of a negative number is not subtraction. */
function usesArithmetic(bare: string): boolean {
  return bare.split("\n").some((line) => {
    const t = line
      .replace(/==|!=|<=|>=|<<|>>/g, " ")
      .replace(/(^|[=([\s,+*/%])\s*-(?=\d|[A-Za-z_(])/g, "$1 ");
    return /\*\*|\/\/|%|\*|\/|\+|(?<=\S)\s-\s(?=\S)/.test(t);
  });
}

function usesComparison(bare: string): boolean {
  const t = bare.replace(/<<|>>|->/g, " ");
  return /==|!=|<=|>=|<(?!=)|>(?!=)/.test(t);
}

/** if / for lines, after strings and comments are gone. An if inside a for is not a nested condition. */
function tagLines(bare: string, add: (id: PyConceptId) => void) {
  const ifOpen: number[] = [];
  const loopOpen: number[] = [];
  for (const line of bare.split("\n")) {
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    while (ifOpen.length && indent <= ifOpen[ifOpen.length - 1]) ifOpen.pop();
    while (loopOpen.length && indent <= loopOpen[loopOpen.length - 1]) loopOpen.pop();
    const t = line.trim();
    if (/^if\b/.test(t)) {
      add("if-statement");
      if (ifOpen.length) add("nested-condition");
      ifOpen.push(indent);
      if (isBareTest(t)) add("truthiness");
    } else if (/^elif\b/.test(t)) {
      add("else-clause");
      if (isBareTest(t)) add("truthiness");
    } else if (/^else\b/.test(t)) {
      add("else-clause");
    }
    if (/\bif\b/.test(t) && /\belse\b/.test(t) && !/^(if|elif)\b/.test(t)) add("conditional-expr");
    if (/^(match|case)\b/.test(t)) add("match-case");
    if (/^for\b/.test(t)) {
      add("for-loop");
      if (loopOpen.length) add("nested-loop");
      loopOpen.push(indent);
    } else if (/^while\b/.test(t)) {
      add("while-loop");
      if (loopOpen.length) add("nested-loop");
      loopOpen.push(indent);
      if (isBareTest(t)) add("truthiness");
    }
    if (/^break\b/.test(t)) add("break-statement");
    if (/^continue\b/.test(t)) add("continue-statement");
  }
}

/** Lists, tuples, dicts, sets, and functions. A bracket after a name is indexing, not a new list. */
function tagCollections(code: string, bare: string, add: (id: PyConceptId) => void) {
  const listLiteral = /(?:^|[=(:,\n])\s*\[/.test(bare);
  if (listLiteral) add("list-literal");
  if (/=\s*\([^)\n]*,[^)\n]*\)/.test(bare)) add("tuple-literal");
  if (/\.append\s*\(|\.pop\s*\(/.test(bare) || /[A-Za-z_]\w*\s*\[[^\]\n]*\]\s*=(?!=)/.test(bare)) add("list-mutate");
  if (/\bsorted\s*\(|\.sort\s*\(/.test(bare)) add("list-sort");
  if (/\.copy\s*\(/.test(bare)) add("list-copy");
  if (/^\s*[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)+\s*=(?!=)/m.test(bare)) add("tuple-unpack");
  if (listLiteral && /(?:[A-Za-z_]\w*|\)|"")\s*\[[^\]\n]*\]/.test(bare)) add("list-index");
  if (/\{[^{}]*:/.test(bare) || /\{\s*\}/.test(bare)) add("dict-literal");
  if (/\{[^{}:]*[^\s{}:][^{}:]*\}/.test(bare)) add("set-literal");
  if (/\{[^{}]*\{/.test(bare)) add("nested-dict");
  if (/(?:[A-Za-z_]\w*|\])\s*\[\s*""\s*\]/.test(bare)) add("dict-lookup");
  if (/\.(items|keys|values)\s*\(/.test(bare)) add("dict-iterate");
  if (/\.(union|intersection|difference)\s*\(/.test(bare)) add("set-op");
  if (/\.split\s*\(/.test(bare)) add("string-split");
  if (/\.find\s*\(/.test(bare)) add("string-find");
  if (/\.count\s*\(/.test(bare)) add("value-count");
  if (/\.(isdigit|isalpha|isalnum)\s*\(/.test(bare)) add("string-check");
  if (/\.update\s*\(/.test(bare)) add("dict-update");
  if (/\.get\s*\(/.test(bare)) add("dict-get");
  if (/\]\s*\[\s*\d/.test(bare)) add("nested-index");
  tagCalls(bare, add);
  tagComps(bare, add);
  if (code.includes('"""') || code.includes("'''")) add("function-doc");
  if (/\bdef\s+\w+\s*\(\s*\w/.test(bare)) add("function-param");
  if (/\bdef\b[^\n]*=/.test(bare)) add("function-default");
}

/** Built-ins and argument stars. A * with spaces around it is multiplication, not a parameter. */
function tagCalls(bare: string, add: (id: PyConceptId) => void) {
  if (/\bzip\s*\(/.test(bare)) add("zip-call");
  if (/\bsorted\s*\([^)\n]*\bkey\s*=/.test(bare)) add("sort-key");
  if (/\bany\s*\(/.test(bare)) add("any-call");
  if (/\ball\s*\(/.test(bare)) add("all-call");
  if (/\bmap\s*\(/.test(bare)) add("map-call");
  if (/\bfilter\s*\(/.test(bare)) add("filter-call");
  if (/\b(?:sum|min|max)\s*\(/.test(bare)) add("aggregate-call");
  if (/(?<!\*)\*[A-Za-z_]/.test(bare)) add("star-args");
  if (/\*\*[A-Za-z_]/.test(bare)) add("star-kwargs");
  if (/\*\s*,/.test(bare)) add("keyword-only");
  if (/\bCounter\s*\(/.test(bare)) add("counter-call");
  if (/\bdefaultdict\s*\(/.test(bare)) add("defaultdict-call");
  if (/\bdeque\s*\(/.test(bare)) add("deque-call");
  if (/(?<!\.)\bgroupby\s*\(/.test(bare)) add("groupby-call");
  if (/\bcombinations\s*\(/.test(bare)) add("combinations-call");
  if (/\bexcept\s+[A-Za-z_]/.test(bare)) add("except-type");
  if (/\bopen\s*\(/.test(bare)) add("file-open");
  if (/\bPath\s*\(/.test(bare)) add("path-call");
  if (/\bencoding\s*=/.test(bare)) add("encoding-arg");
  if (/\bDictReader\s*\(/.test(bare)) add("csv-read");
  if (/\.writer\s*\(/.test(bare)) add("csv-write");
  if (/\bjson\.loads\s*\(/.test(bare)) add("json-loads");
  if (/\bjson\.dumps\s*\(/.test(bare)) add("json-dumps");
  if (/\bstrptime\s*\(/.test(bare)) add("strptime-call");
  if (/\btimezone\s*\(/.test(bare)) add("timezone-call");
  if (/\btimedelta\s*\(/.test(bare)) add("timedelta-call");
  if (/\bDecimal\s*\(/.test(bare)) add("decimal-call");
  if (/\bre\.(?:search|findall)\s*\(/.test(bare)) add("regex-call");
  if (/\bimport\b[^\n]*\bas\b/.test(bare)) add("import-alias");
  if (/\bfrom\s+\w+\.\w+\s+import\b/.test(bare)) add("package-import");
  if (/__name__\s*==/.test(bare)) add("dunder-main");
  if (/\bModuleNotFoundError\b/.test(bare)) add("module-missing");
  if (/\bArgumentParser\s*\(/.test(bare) || /\badd_argument\s*\(/.test(bare)) add("argparse-call");
  if (/\.iterdir\s*\(/.test(bare)) add("dir-list");
  if (/os\.environ/.test(bare)) add("env-read");
  if (/subprocess\.run\s*\(/.test(bare)) add("subprocess-run");
  if (/traceback\.format_exc\s*\(/.test(bare)) add("traceback-call");
  if (/logging\.(?:info|basicConfig)\s*\(/.test(bare)) add("log-call");
  if (/logging\.warning\s*\(/.test(bare)) add("log-warning");
  if (/type\s*\([^)\n]*\)\.__name__/.test(bare)) add("exc-name");
  if (/\bassert\b/.test(bare)) add("assert-stmt");
  if (/\bdef\s+test_/.test(bare)) add("test-func");
  if (/\bclass\s+[A-Za-z_]\w*\s*:/.test(bare)) add("plain-class");
  if (/\bclass\s+[A-Za-z_]\w*\s*\(\s*(?!Exception\b)[A-Za-z_]/.test(bare)) add("subclass");
  if (/\b[A-Za-z_]\w*\.[A-Za-z_]\w*\s*=(?!=)/.test(bare)) add("attr-assign");
  if (/__init__/.test(bare)) add("init-method");
  if (/\bself\b/.test(bare)) add("self-name");
  if (/\bdef\s+(?!__init__\b)\w+\s*\(\s*self\b/.test(bare)) add("method-def");
  if (/\b[A-Za-z_]\w*(?:\.[A-Za-z_]\w*){2}\b(?!\s*\()/.test(bare)) add("part-attr");
  if (/@dataclass\b/.test(bare)) add("dataclass-dec");
  if (/:\s*(?:int|str)\b(?!\s*\()/.test(bare)) add("field-ann");
  if (/@property\b/.test(bare)) add("property-dec");
  if (/__str__/.test(bare)) add("str-method");
  if (/->/.test(bare)) add("return-hint");
  if (/\bTypedDict\b/.test(bare)) add("typed-dict");
  if (/\bProtocol\b/.test(bare)) add("protocol-base");
  if (/\babstractmethod\b/.test(bare)) add("abstract-method");
  if (/\bruntime_checkable\b/.test(bare)) add("runtime-protocol");
  if (/\bclass\s+\w*Mixin\b/.test(bare)) add("mixin-class");
  if (/__(?:get|set)__/.test(bare)) add("descriptor-method");
  if (/\bsqlite3\b/.test(bare)) add("sqlite-call");
  if (/\.(?:commit|rollback)\s*\(/.test(bare)) add("sql-tx");
  if (/\burlopen\s*\(|\bbuild_opener\s*\(|\bRequest\s*\(|\burlencode\s*\(/.test(bare)) add("http-get");
  if (/\bHTTPError\b/.test(bare)) add("response-body");
  if (/__(?:iter|next)__/.test(bare)) add("iter-method");
  if (/\byield\s+from\b/.test(bare)) add("yield-from");
  if (/@(?!dataclass\b|property\b|abstractmethod\b|runtime_checkable\b|classmethod\b|staticmethod\b|\w+\.(?:setter|deleter)\b)[A-Za-z_]/.test(bare)) add("decorator-at");
  if (/@(?!dataclass\b)[A-Za-z_]\w*\s*\(/.test(bare)) add("decorator-call");
  if (/@classmethod\b/.test(bare)) add("classmethod-dec");
  if (/\bsuper\s*\(\s*\)/.test(bare)) add("super-call");
  if (/\bwraps\s*\(/.test(bare)) add("wraps-dec");
  if (/__(?:enter|exit)__/.test(bare)) add("enter-method");
  if (/\bcontextmanager\b/.test(bare)) add("context-dec");
  if (/\bpartial\s*\(/.test(bare)) add("partial-call");
  if (/\bcallable\s*\(/.test(bare)) add("callable-call");
  // M35–M40: the API each lesson introduces (conceptual ideas such as Big O or the GIL have no token to find).
  if (/\bbisect(?:_left|_right)?\s*\(|\binsort\s*\(/.test(bare)) add("bisect-call");
  if (/\bRecursionError\b|\bgetrecursionlimit\s*\(/.test(bare)) add("recursion-limit");
  if (/\bcopy\.copy\s*\(/.test(bare)) add("shallow-copy");
  if (/\bdeepcopy\s*\(/.test(bare)) add("deep-copy");
  if (/\bgc\.collect\s*\(/.test(bare)) add("gc-collect");
  if (/\bweakref\b/.test(bare)) add("weak-ref");
  if (/\bgetsizeof\s*\(/.test(bare)) add("sizeof-call");
  if (/\btake_snapshot\s*\(/.test(bare)) add("mem-snapshot");
  if (/__slots__/.test(bare)) add("slots-attr");
  if (/\bdis\.\w+/.test(bare)) add("bytecode-dis");
  if (/\btimeit\b/.test(bare)) add("timeit-call");
  if (/\bcProfile\b|\bpstats\b/.test(bare)) add("profile-call");
  if (/\blru_cache\b|@cache\b|\bcache_info\s*\(/.test(bare)) add("lru-cache");
  if (/\bThread\s*\(/.test(bare)) add("thread-start");
  if (/\b(?:Thread|Process)PoolExecutor\b|\bas_completed\s*\(|\bFuture\b/.test(bare)) add("pool-submit");
  if (/\bLock\s*\(/.test(bare)) add("thread-lock");
  if (/\bProcess\s*\(|\bmultiprocessing\b|\bProcessPoolExecutor\b/.test(bare)) add("process-start");
  if (/\bcreate_task\s*\(|\bgather\s*\(|\bTaskGroup\b/.test(bare)) add("task-call");
  if (/\.cancel\s*\(|\bCancelledError\b|\bwait_for\s*\(|\basyncio\.timeout\s*\(/.test(bare)) add("cancel-call");
  if (/\bSemaphore\s*\(/.test(bare)) add("sem-gate");
  // M41–M45: the API each lesson introduces. Broadcasting rules and chart choice have no token of their own.
  if (/\bnp\.(?:array|asarray|zeros|ones|arange)\s*\(|\.(?:shape|ndim)\b/.test(bare)) add("np-array");
  if (/\.dtype\b|\.astype\s*\(|\.tolist\s*\(/.test(bare)) add("np-dtype");
  if (/\.(?:sum|mean|min|max)\s*\(/.test(bare)) add("np-reduce");
  if (/\b(\w+)\[[^\]\n]*\b\1\b\s*(?:[<>]=?|[!=]=)|\w\[[^\]\n]*:[^\]\n]*,|\w\[\s*-?\d+\s*,\s*-?\d+\s*\]/.test(bare)) add("np-index");
  if (/\[\s*:\s*,\s*None\s*\]|\.reshape\s*\(/.test(bare)) add("np-broadcast");
  if (/\bnp\.(?:where|select|clip|diff|cumsum|abs|flatnonzero|logical_and)\s*\(|\.cumsum\s*\(/.test(bare)) add("np-where");
  if (/\baxis\s*=|\bnp\.(?:median|std|percentile|nanmean|nanmedian|nanmax|nanmin|nansum|nanpercentile|isnan)\s*\(|\.(?:argmax|argmin|std)\s*\(|\bnp\.nan\b/.test(bare)) add("np-stats");
  if (/\bpd\.(?:DataFrame|Series|read_csv)\s*\(|\.head\s*\(|\.columns\b(?!\s*\()|\.to_csv\s*\(/.test(bare)) add("pd-frame");
  if (/\.i?loc\s*\[|\.set_index\s*\(|\.sort_values\s*\(/.test(bare)) add("pd-loc");
  if (/\b(\w+)\[\s*\(*\s*~?\s*\1\s*\[|\.isin\s*\(|\.between\s*\(|\.str\.\w+\s*\(/.test(bare)) add("pd-filter");
  if (/\.(?:isna|notna|dropna|fillna|isnull|notnull)\s*\(/.test(bare)) add("pd-missing");
  if (/\bpd\.to_numeric\s*\(|\.dtypes\b|\bdtype\s*=\s*\{/.test(bare)) add("pd-kind");
  if (/\.groupby\s*\(|\.agg\s*\(|\.value_counts\s*\(|\.reset_index\s*\(/.test(bare)) add("pd-group");
  if (/\.merge\s*\(|\bpd\.concat\s*\(|\.drop_duplicates\s*\(/.test(bare)) add("pd-merge");
  if (/\.pivot(?:_table)?\s*\(|\bpd\.(?:pivot_table|crosstab)\s*\(|\.unstack\s*\(/.test(bare)) add("pd-pivot");
  if (/\bto_datetime\s*\(|\.dt\.\w+|\.to_period\s*\(|\.resample\s*\(/.test(bare)) add("pd-time");
  if (/\.duplicated\s*\(/.test(bare)) add("pd-quality");
  if (/\bplt\.subplots\s*\(|\bmatplotlib\b|\.set_(?:title|xlabel|ylabel)\s*\(/.test(bare)) add("mpl-axes");
  if (/\.plot\.\w+\s*\(|\.plot\s*\([^)\n]*\bkind\s*=/.test(bare)) add("pd-plot");
  if (/\bnp\.histogram\s*\(|\.quantile\s*\(|\.boxplot\s*\(/.test(bare)) add("pd-dist");
  if (/\.annotate\s*\(|\.bar_label\s*\(|\.axhline\s*\(|\.set_color\s*\(/.test(bare)) add("story-title");
  if (/\bread_parquet\b|\.to_parquet\s*\(|\bpyarrow\b/.test(bare)) add("arrow-file");
  if (/chunksize\s*=|\busecols\s*=/.test(bare)) add("pd-chunk");
  if (/\bduckdb\b|\bread_sql(?:_query)?\s*\(|\.to_sql\s*\(/.test(bare)) add("duck-ask");
  if (/\bdefault_rng\s*\(|\bhashlib\b/.test(bare)) add("repro-run");
  if (/\.to_json\s*\([^)\n]*\borient\s*=|\bread_json\s*\(|\bfloat_format\s*=/.test(bare)) add("pd-export");
  // M46–M50: only APIs that belong to one lesson. Ideas such as idempotency or a checkpoint have no token of their own.
  if (/\bobject_hook\s*=/.test(bare)) add("unsafe-load");
  if (/\bcompare_digest\s*\(|\bsecrets\.token_\w+\s*\(/.test(bare)) add("secret-handling");
  if (/\.is_relative_to\s*\(/.test(bare)) add("safe-path");
  if (/\bclass\s+\w+\s*\(\s*logging\.Formatter\s*\)/.test(bare)) add("json-log");
}

/**
 * A filter `if` comes after the first `for`. A conditional expression (`a if test else b`) also contains `if`, but
 * it is followed by `else`, so `[x if x > 0 else 0 for x in xs]` chooses a value rather than filtering.
 */
function filtersInComp(body: string): boolean {
  const tail = body.slice(Math.max(0, body.search(/\bfor\b/)));
  return /\bif\b(?![\s\S]*\belse\b)/.test(tail);
}

/** A for inside brackets or braces is a comprehension, not a for statement. */
function tagComps(bare: string, add: (id: PyConceptId) => void) {
  for (const m of bare.matchAll(/\[[^\[\]\n]*\]/g)) {
    const body = m[0];
    if (!/\bfor\b/.test(body)) continue;
    add("list-comp");
    if ((body.match(/\bfor\b/g) ?? []).length >= 2) add("nested-comp");
    if (filtersInComp(body)) add("comp-if");
  }
  for (const m of bare.matchAll(/\{[^{}\n]*\}/g)) {
    const body = m[0];
    if (!/\bfor\b/.test(body)) continue;
    if (body.includes(":")) add("dict-comp");
    else add("set-comp");
    if (filtersInComp(body)) add("comp-if");
  }
}

/** `if name:` and `while name:` treat the value itself as true or false. A comparison does not. */
function isBareTest(line: string): boolean {
  const m = line.match(/^(?:if|elif|while)\s+(.+):/);
  if (!m) return false;
  return !/==|!=|<=|>=|<|>|\bis\b|\bin\b|\band\b|\bor\b|\bnot\b/.test(m[1]);
}

/** * or / combined with + or -, or parentheses around an operation. print(2 + 3) is not this. */
function usesPrecedence(bare: string): boolean {
  return bare.split("\n").some((line) => {
    const group = /(?<![.\w])\([^()\n]*[+\-*/%][^()\n]*\)/.test(line);
    const t = line.replace(/<<|>>/g, " ");
    const add = /\+|(?<=\S)\s-\s(?=\S)/.test(t);
    const mul = /\*\*|\/\/|%|(?<!\*)\*(?!\*)|(?<!\/)\/(?!\/)/.test(t);
    return group || (add && mul);
  });
}

/** `...` is a real Python value (Ellipsis). Beginners meet it only if a lesson teaches it. None does in M01. */
export function usesEllipsis(code: string): boolean {
  return /(^|[^\w.])\.\.\.(?!\.)/.test(bareCode(code));
}

const SUBSTANTIAL = (line: string) => {
  const t = line.trim();
  return t.length >= 12 && !t.startsWith("#");
};

/**
 * The last hint may name the missing idea. It may not contain the lines the learner still has to write.
 * Returns the leaked lines, or an empty list when the hint is safe.
 */
export function hintLeaksSolution(hint: string, answer: string, starter: string): string[] {
  const blob = hint.replace(/`/g, "");
  const given = new Set(starter.split("\n").map((l) => l.trim()));
  return answer
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => SUBSTANTIAL(l) && !given.has(l) && blob.includes(l));
}

export type ConceptItem = {
  id: string;
  /** Lesson ids the learner must already have finished. A lesson lists the previous lesson. */
  prerequisites: readonly string[];
  requires: readonly string[];
  /** Concepts this item introduces. Questions introduce none. */
  teaches?: readonly string[];
  /** Learner-visible programs: examples, starters, answers, concept-check programs. */
  code: readonly string[];
};

export type ConceptCourse = {
  /** Lesson ids in course order. */
  lessonOrder: readonly string[];
  lessons: readonly ConceptItem[];
  questions: readonly ConceptItem[];
};

function orderIndex(order: readonly string[], id: string): number {
  const i = order.indexOf(id);
  return i === -1 ? Infinity : i;
}

/** Lessons finished when `prerequisites` are done: those lessons and everything earlier in the course. */
export function lessonsUnlockedBy(order: readonly string[], prerequisites: readonly string[]): Set<string> {
  const unlocked = new Set<string>();
  let max = -1;
  for (const p of prerequisites) max = Math.max(max, orderIndex(order, p));
  order.forEach((id, i) => {
    if (i <= max) unlocked.add(id);
  });
  return unlocked;
}

/** Concepts whose introducing lesson is in `unlocked`, whether or not that lesson is authored yet. */
function conceptsAvailable(unlocked: ReadonlySet<string>): Set<string> {
  const taught = new Set<string>();
  for (const c of pyConcepts) if (unlocked.has(c.introducedBy)) taught.add(c.id);
  return taught;
}

/**
 * Walk the course as a beginner: start from nothing, take lessons in order, and flag any concept,
 * call, or language quirk that shows up before the lesson that explains it.
 * Returns human-readable problems. Empty means the authored items agree with the catalog.
 */
export function beginnerProblems(course: ConceptCourse): string[] {
  const problems: string[] = [];
  const knownIds = new Set<string>(pyConcepts.map((c) => c.id));
  const order = course.lessonOrder;

  for (const c of pyConcepts) {
    if (!order.includes(c.introducedBy)) problems.push(`concept ${c.id} points at unknown lesson ${c.introducedBy}`);
  }

  const authored = new Set(course.lessons.map((l) => l.id));
  for (const lesson of course.lessons) {
    const earlier = new Set(order.filter((id) => orderIndex(order, id) < orderIndex(order, lesson.id)));
    const available = conceptsAvailable(earlier);
    for (const id of lesson.teaches ?? []) {
      if (!knownIds.has(id)) problems.push(`${lesson.id} teaches unknown concept ${id}`);
      const intro = conceptIntroducedBy(id);
      if (intro && intro !== lesson.id) problems.push(`${lesson.id} teaches ${id}, which is introduced by ${intro}`);
    }
    for (const c of pyConcepts) {
      if (c.introducedBy === lesson.id && !(lesson.teaches ?? []).includes(c.id)) {
        problems.push(`${lesson.id} introduces ${c.id} in the catalog but does not teach it`);
      }
    }
    for (const id of lesson.requires) {
      if (!knownIds.has(id)) problems.push(`${lesson.id} requires unknown concept ${id}`);
      else if (!available.has(id)) problems.push(`${lesson.id} requires ${id} before it has been taught`);
    }
    const taughtHere = new Set(lesson.teaches ?? []);
    for (const code of lesson.code) {
      if (usesEllipsis(code)) problems.push(`${lesson.id} uses ... (Ellipsis), which no lesson explains`);
      for (const id of conceptsUsedInCode(code)) {
        if (taughtHere.has(id)) continue;
        if (!lesson.requires.includes(id)) problems.push(`${lesson.id} uses ${id} without listing it in requires`);
        else if (!available.has(id)) problems.push(`${lesson.id} requires ${id} before it has been taught`);
      }
    }
  }

  for (const q of course.questions) {
    const unlocked = lessonsUnlockedBy(order, q.prerequisites);
    const available = conceptsAvailable(unlocked);
    // A question aimed at a lesson that is not authored yet cannot be checked against taught concepts.
    const unlockKnown = q.prerequisites.every((id) => authored.has(id) || !authored.size);
    if (!q.prerequisites.some((id) => authored.has(id))) continue;
    for (const id of q.requires) {
      if (!knownIds.has(id)) problems.push(`${q.id} requires unknown concept ${id}`);
      else if (unlockKnown && !available.has(id)) problems.push(`${q.id} requires ${id}, but its unlock does not include ${conceptIntroducedBy(id)}`);
    }
    for (const code of q.code) {
      if (usesEllipsis(code)) problems.push(`${q.id} uses ... (Ellipsis), which no lesson explains`);
      for (const id of conceptsUsedInCode(code)) {
        if (!q.requires.includes(id)) problems.push(`${q.id} uses ${id} without listing it in requires`);
        else if (!available.has(id)) problems.push(`${q.id} requires ${id}, but its unlock does not include ${conceptIntroducedBy(id)}`);
      }
    }
  }
  return problems;
}
