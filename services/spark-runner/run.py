"""Command line for the local Spark runner. Prints one JSON result.

    python3 services/spark-runner/run.py run   PS-Q0046 path/to/solution.py
    python3 services/spark-runner/run.py check PS-Q0046 path/to/solution.py
    python3 services/spark-runner/run.py build-expected PS-Q0046
    python3 services/spark-runner/run.py build-lesson PS-L010
    python3 services/spark-runner/run.py playground PS-D01 path/to/script.py
    python3 services/spark-runner/run.py project-run   PS-P01 path/to/pipeline.py
    python3 services/spark-runner/run.py project-check PS-P01 path/to/pipeline.py

Ctrl-C or SIGTERM cancels the job: the container and every process in it are killed and removed.
"""

import json
import signal
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from runner import api  # noqa: E402

cancel = threading.Event()
for sig in (signal.SIGINT, signal.SIGTERM):
    signal.signal(sig, lambda *_: cancel.set())


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[0] == "build-lesson":
        print(json.dumps(api.build_lesson(argv[1]), indent=1))
        return 0
    if len(argv) >= 2 and argv[0] == "build-expected":
        print(json.dumps(api.build_expected(argv[1]), indent=1))
        return 0
    if len(argv) == 3 and argv[0] == "playground":
        print(json.dumps(api.playground(argv[1], Path(argv[2]).read_text(), cancel), indent=1))
        return 0
    if len(argv) == 3 and argv[0] in ("project-run", "project-check"):
        fn = api.run_project if argv[0] == "project-run" else api.check_project
        print(json.dumps(fn(argv[1], Path(argv[2]).read_text(), cancel), indent=1))
        return 0
    if len(argv) != 3 or argv[0] not in ("run", "check"):
        print(__doc__, file=sys.stderr)
        return 2
    mode, item, path = argv
    code = Path(path).read_text()
    result = (api.run if mode == "run" else api.check)(item, code, cancel)
    print(json.dumps(result, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
