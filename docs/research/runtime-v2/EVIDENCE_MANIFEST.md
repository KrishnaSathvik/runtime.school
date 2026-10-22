# REA evidence manifest

Captured 2026-10-20 America/Chicago (2026-10-21 UTC). REA 6.7.0; Node 24.11.0. Raw captures remain locally under ignored `tooling/`, because they include third-party page text and transient network metadata. This manifest and selected exact screenshots are the portable research evidence. Raw captures are not included in Git commits. Hashes identify these exact local bytes, not vendor backend implementation.

## sqlbolt-rea.json

- Evidence ID: `ev_c1d3d7551fabc1332d1e201e686621e0a7210a50df2808f027ab06833e7de5ce`
- Raw SHA-256: `7a3944b05468bb553534c9611673d028b9871909d28e16c1b5c6210d84c164ae`
- Operation: `capture_browser_scenario`
- Capture summary: `{"status": "complete", "equality_eligible": true, "missing_sections": [], "truncated_sections": []}`
- Browser and cleanup: `{"mode": "launch", "process_ownership": "provider-owned", "cleanup": "terminated-owned-process", "product": "Chromium", "version": "155.0.8059.85"}`
- Steps: `scenario_start: completed`, `settle: completed`, `query: completed`, `result: completed`

## sqlbolt-corrected-rea.json

- Evidence ID: `ev_54f7975c9a24d81a6e983521da26ca76bc5ef79c0779a78e7b16b6044ffdf2ed`
- Raw SHA-256: `dc17003bc60e88933955d40cf341e15edb7607ea1c94ccd8ac10c1a8342c5b90`
- Operation: `capture_browser_scenario`
- Capture summary: `{"status": "complete", "equality_eligible": true, "missing_sections": [], "truncated_sections": []}`
- Browser and cleanup: `{"mode": "launch", "process_ownership": "provider-owned", "cleanup": "terminated-owned-process", "product": "Chromium", "version": "155.0.8059.85"}`
- Steps: `scenario_start: completed`, `settle: completed`, `select_all: completed`, `query: completed`, `result: completed`, `error_select: completed`, `invalid_query: completed`, `error_result: completed`

## sqlbolt-mobile-rea.json

- Evidence ID: `ev_fbee9eb9f184145a97efa744aad09b3c0d535a2c6ff7e839e5e028cda5f5e23a`
- Raw SHA-256: `6b32ea9cc99fd6b9a1434ba0e9c5adb4f2a79a5adc6152c57a6583788671459c`
- Operation: `capture_browser_scenario`
- Capture summary: `{"status": "complete", "equality_eligible": true, "missing_sections": [], "truncated_sections": []}`
- Browser and cleanup: `{"mode": "launch", "process_ownership": "provider-owned", "cleanup": "terminated-owned-process", "product": "Chromium", "version": "155.0.8059.85"}`
- Steps: `scenario_start: completed`, `settle: completed`, `select_all: completed`, `query: completed`, `result: completed`, `error_select: completed`, `invalid_query: completed`, `error_result: completed`

## sqlbolt-comparison.json

- Evidence ID: `ev_75a21c0e2fa030a6525c219fd8f44898a70e31a55eba5fa0233431497a94de12`
- Raw SHA-256: `fa24cc495ec8b12844e8676ee433c83e55f77ef37113430e43862592020477af`
- Operation: `compare_web_captures`
- Capture summary: `{"overall_status": "changed", "alignment": {"status": "aligned", "aligned_steps": 8, "before_only": [], "after_only": [], "failures": []}}`

## sqlzoo-rea.json

- Evidence ID: `ev_298c1c8e86290f71a4a63c27efc9354e228c2f49439f1830f1e8d52a6d44bdd3`
- Raw SHA-256: `202cf121bd13de8d0aadd0619821672520e96668585da72a98a30c6bb65c7c03`
- Operation: `capture_browser_scenario`
- Capture summary: `{"status": "complete", "equality_eligible": true, "missing_sections": [], "truncated_sections": []}`
- Browser and cleanup: `{"mode": "launch", "process_ownership": "provider-owned", "cleanup": "terminated-owned-process", "product": "Chromium", "version": "155.0.8059.85"}`
- Steps: `scenario_start: completed`, `settle: completed`, `query: completed`, `submit: completed`, `result: completed`, `invalid: completed`, `submit_invalid: completed`, `error: completed`

## leetcode-rea.json

- Evidence ID: `ev_46b1e38de0cef81254952cebb03b0811a99302e5f5a45df076e182a7605d0199`
- Raw SHA-256: `3b2055c8a8f9971ca4c62c0ac020705e4448cedbc6a57b6b0abdd01e65138fae`
- Operation: `capture_browser_scenario`
- Capture summary: `{"status": "incomplete", "equality_eligible": false, "missing_sections": ["accessibility", "action", "dom", "events", "screenshot", "url"], "truncated_sections": []}`
- Browser and cleanup: `{"mode": "launch", "process_ownership": "provider-owned", "cleanup": "terminated-owned-process", "product": "Chromium", "version": "155.0.8059.85"}`
- Steps: `scenario_start: completed`, `settle: completed`, `run: failed`, `feedback: cancelled`

## jupyterlite-rea.json

- Evidence ID: `ev_e4b2d81174d536ea043ef14c2a4f2faac9d46cc0b156b196a5c567280e951117`
- Raw SHA-256: `62ac096c0d54fee1431be8a4bcdc6b63319d52452b836eceb8eb7afc01e407eb`
- Operation: `capture_browser_scenario`
- Capture summary: `{"status": "complete", "equality_eligible": true, "missing_sections": [], "truncated_sections": []}`
- Browser and cleanup: `{"mode": "launch", "process_ownership": "provider-owned", "cleanup": "terminated-owned-process", "product": "Chromium", "version": "155.0.8059.85"}`
- Steps: `scenario_start: completed`, `settle: completed`, `notebook: completed`, `editor: completed`, `code: completed`, `execute: completed`, `result: completed`

## jupyterlite-settled-rea.json

- Evidence ID: `ev_58ff6a3f89eb30ed3c361c928c748fe7318aa59da20cc4985eface510cfbb6eb`
- Raw SHA-256: `49d7548e87fdea7611a2638e5516a2309379b53322ea51d34c7b6e32c00572c3`
- Operation: `capture_browser_scenario`
- Capture summary: `{"status": "complete", "equality_eligible": true, "missing_sections": [], "truncated_sections": []}`
- Browser and cleanup: `{"mode": "launch", "process_ownership": "provider-owned", "cleanup": "terminated-owned-process", "product": "Chromium", "version": "155.0.8059.85"}`
- Steps: `scenario_start: completed`, `settle: completed`, `notebook: completed`, `editor: completed`, `kernel_settle: completed`, `code: completed`, `editor_settle: completed`, `execute: completed`, `result: completed`

## Portable screenshot integrity

| File | SHA-256 |
| --- | --- |
| [jupyterlite-error.png](jupyterlite-error.png) | `c13c33f98fc41110e0474f791c06346b58e60dbf5387c1760bc4c64933ffa311` |
| [jupyterlite-mobile.png](jupyterlite-mobile.png) | `fbbf70e8db178adcd9ad9badbe350083e9a5ee4280579137f2dcb4645ba12788` |
| [jupyterlite-rea.png](jupyterlite-rea.png) | `2fc4fc951b9284f38a89bc3ca39ce7df4a9c5d37aa288e52adaf416a1114e9d9` |
| [sqlbolt-corrected-rea.png](sqlbolt-corrected-rea.png) | `c5a60b6123712bdcc026b48a6ed503581c82b44044b976b318ed8169699fc88b` |
| [sqlbolt-error.png](sqlbolt-error.png) | `08ba72bb8d636f3a614826db791f11dd7c42dd6e960052d88be10426c1c474f8` |
| [sqlbolt-mobile-rea.png](sqlbolt-mobile-rea.png) | `3da13caa881e890f63c326cd3c9edd17caf16501bf3c14e79c3692ece1b6ed9a` |
| [sqlbolt-mobile.png](sqlbolt-mobile.png) | `b82722534a99aafdc0a9bab0bccaf06b52f0cd0b5c01591c9eb1a89265025677` |
| [sqlzoo-rea.png](sqlzoo-rea.png) | `d9e9765ccd7d65957566a9a723c147be336834d435913360ac4e6c122b97db59` |

## Scenario inputs

These are the actual input declarations, retained here for reproducibility. The browser executable path is host-specific. No accounts or secrets were supplied.

### sqlbolt-corrected-scenario.json

```json
{
  "browser": {
    "mode": "launch",
    "executable_path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  },
  "start_url": {
    "url": "https://sqlbolt.com/lesson/select_queries_introduction"
  },
  "actions": [
    {
      "step_id": "settle",
      "action": "wait_for_timeout",
      "duration_ms": 1500
    },
    {
      "step_id": "select_all",
      "action": "press",
      "locator": {
        "kind": "css",
        "selector": "textarea.ace_text-input"
      },
      "key": "Meta+A",
      "timeout_ms": 10000
    },
    {
      "step_id": "query",
      "action": "fill",
      "locator": {
        "kind": "css",
        "selector": "textarea.ace_text-input"
      },
      "value": {
        "source": "literal",
        "value": "SELECT title FROM movies;"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "result",
      "action": "wait_for_timeout",
      "duration_ms": 1500
    },
    {
      "step_id": "error_select",
      "action": "press",
      "locator": {
        "kind": "css",
        "selector": "textarea.ace_text-input"
      },
      "key": "Meta+A",
      "timeout_ms": 10000
    },
    {
      "step_id": "invalid_query",
      "action": "fill",
      "locator": {
        "kind": "css",
        "selector": "textarea.ace_text-input"
      },
      "value": {
        "source": "literal",
        "value": "SELECT missing_column FROM movies;"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "error_result",
      "action": "wait_for_timeout",
      "duration_ms": 1800
    }
  ],
  "capture": {
    "after_each_step": [
      "accessibility",
      "url"
    ],
    "at_end": [
      "screenshot",
      "dom",
      "accessibility",
      "url"
    ],
    "events": [
      "network"
    ],
    "network": {
      "response_body": false
    }
  }
}
```

### sqlbolt-mobile-scenario.json

```json
{
  "browser": {
    "mode": "launch",
    "executable_path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  },
  "start_url": {
    "url": "https://sqlbolt.com/lesson/select_queries_introduction"
  },
  "actions": [
    {
      "step_id": "settle",
      "action": "wait_for_timeout",
      "duration_ms": 1500
    },
    {
      "step_id": "select_all",
      "action": "press",
      "locator": {
        "kind": "css",
        "selector": "textarea.ace_text-input"
      },
      "key": "Meta+A",
      "timeout_ms": 10000
    },
    {
      "step_id": "query",
      "action": "fill",
      "locator": {
        "kind": "css",
        "selector": "textarea.ace_text-input"
      },
      "value": {
        "source": "literal",
        "value": "SELECT title FROM movies;"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "result",
      "action": "wait_for_timeout",
      "duration_ms": 1500
    },
    {
      "step_id": "error_select",
      "action": "press",
      "locator": {
        "kind": "css",
        "selector": "textarea.ace_text-input"
      },
      "key": "Meta+A",
      "timeout_ms": 10000
    },
    {
      "step_id": "invalid_query",
      "action": "fill",
      "locator": {
        "kind": "css",
        "selector": "textarea.ace_text-input"
      },
      "value": {
        "source": "literal",
        "value": "SELECT missing_column FROM movies;"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "error_result",
      "action": "wait_for_timeout",
      "duration_ms": 1800
    }
  ],
  "capture": {
    "after_each_step": [
      "accessibility",
      "url"
    ],
    "at_end": [
      "screenshot",
      "dom",
      "accessibility",
      "url"
    ],
    "events": [
      "network"
    ],
    "network": {
      "response_body": false
    }
  },
  "environment": {
    "viewport": {
      "width": 390,
      "height": 844
    }
  }
}
```

### sqlzoo-scenario.json

```json
{
  "browser": {
    "mode": "launch",
    "executable_path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  },
  "start_url": {
    "url": "https://sqlzoo.net/wiki/SELECT_basics"
  },
  "actions": [
    {
      "step_id": "settle",
      "action": "wait_for_timeout",
      "duration_ms": 1000
    },
    {
      "step_id": "query",
      "action": "fill",
      "locator": {
        "kind": "css",
        "selector": "#txtar_1"
      },
      "value": {
        "source": "literal",
        "value": "SELECT population FROM world WHERE name = 'Germany'"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "submit",
      "action": "click",
      "locator": {
        "kind": "css",
        "selector": "button:has-text(\"Submit SQL\") >> nth=0"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "result",
      "action": "wait_for_timeout",
      "duration_ms": 2500
    },
    {
      "step_id": "invalid",
      "action": "fill",
      "locator": {
        "kind": "css",
        "selector": "#txtar_1"
      },
      "value": {
        "source": "literal",
        "value": "SELECT missing_column FROM world"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "submit_invalid",
      "action": "click",
      "locator": {
        "kind": "css",
        "selector": "button:has-text(\"Submit SQL\") >> nth=0"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "error",
      "action": "wait_for_timeout",
      "duration_ms": 2500
    }
  ],
  "capture": {
    "after_each_step": [
      "accessibility",
      "url"
    ],
    "at_end": [
      "screenshot",
      "dom",
      "accessibility",
      "url"
    ],
    "events": [
      "network"
    ],
    "network": {
      "response_body": false
    }
  }
}
```

### leetcode-scenario.json

```json
{
  "browser": {
    "mode": "launch",
    "executable_path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  },
  "start_url": {
    "url": "https://leetcode.com/problems/two-sum/description/"
  },
  "actions": [
    {
      "step_id": "settle",
      "action": "wait_for_timeout",
      "duration_ms": 3500
    },
    {
      "step_id": "run",
      "action": "click",
      "locator": {
        "kind": "css",
        "selector": "[aria-label=\"Run\"]"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "feedback",
      "action": "wait_for_timeout",
      "duration_ms": 2000
    }
  ],
  "capture": {
    "after_each_step": [
      "accessibility",
      "url"
    ],
    "at_end": [
      "screenshot",
      "dom",
      "accessibility",
      "url"
    ],
    "events": [
      "network"
    ],
    "network": {
      "response_body": false
    }
  }
}
```

### jupyterlite-settled-scenario.json

```json
{
  "browser": {
    "mode": "launch",
    "executable_path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  },
  "start_url": {
    "url": "https://jupyterlite.github.io/demo/lab/index.html"
  },
  "actions": [
    {
      "step_id": "settle",
      "action": "wait_for_timeout",
      "duration_ms": 3000
    },
    {
      "step_id": "notebook",
      "action": "click",
      "locator": {
        "kind": "css",
        "selector": "[role=\"button\"]:has-text(\"Python (Pyodide)\") >> nth=0"
      },
      "timeout_ms": 15000
    },
    {
      "step_id": "editor",
      "action": "wait_for",
      "locator": {
        "kind": "css",
        "selector": "[contenteditable=\"true\"]"
      },
      "state": "visible",
      "timeout_ms": 15000
    },
    {
      "step_id": "kernel_settle",
      "action": "wait_for_timeout",
      "duration_ms": 6000
    },
    {
      "step_id": "code",
      "action": "fill",
      "locator": {
        "kind": "css",
        "selector": "[contenteditable=\"true\"]"
      },
      "value": {
        "source": "literal",
        "value": "print(2 + 3)"
      },
      "timeout_ms": 10000
    },
    {
      "step_id": "editor_settle",
      "action": "wait_for_timeout",
      "duration_ms": 1000
    },
    {
      "step_id": "execute",
      "action": "press",
      "locator": {
        "kind": "css",
        "selector": "[contenteditable=\"true\"]"
      },
      "key": "Shift+Enter",
      "timeout_ms": 10000
    },
    {
      "step_id": "result",
      "action": "wait_for_timeout",
      "duration_ms": 10000
    }
  ],
  "capture": {
    "after_each_step": [
      "accessibility",
      "url"
    ],
    "at_end": [
      "screenshot",
      "dom",
      "accessibility",
      "url"
    ],
    "events": [
      "network"
    ],
    "network": {
      "response_body": false
    }
  },
  "environment": {
    "service_workers": "allow"
  }
}
```
