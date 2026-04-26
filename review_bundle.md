# Review Bundle

## 0.4.1 Developer Workbench live-test polish review

Task: targeted polish pass after live Home Assistant testing of the 0.4.0 Developer Workbench foundation.

Result: small frontend polish implemented. This is not a new subsystem step and does not change the Core Explorer contract.

Clipboard/copy behavior:

- Clipboard availability is detected once through the browser runtime.
- Copy bundle, copy transcript, and copy payload buttons are disabled when clipboard copy is unavailable.
- The Workbench shows one central non-alarming note: clipboard copy is unavailable in this browser context and Download JSON remains available.
- Download JSON remains enabled because it does not depend on the Clipboard API.
- The UI no longer emits repeated per-click "Clipboard API is unavailable" failures during the same unavailable runtime.

Runtime log noise reduction:

- Repeated consecutive `scope_rendered` events for the same scope are aggregated into one event row with a count and first/last timestamp.
- Fetch start/success/failure, auth block, lifecycle recovery, wrapper recovery, pane changes, and export events remain separate.
- The runtime log remains bounded by the existing fixed-size ring buffer and continues to store compact metadata only.

Icon polish:

- The topbar Workbench toggle now uses a small inline code-style icon instead of plain `</>` text.
- It remains compact, subtle, and admin-only.

Intentionally unchanged:

- Core Explorer / Developer Workbench / Dev Actions split.
- Browser-local persistence only for the Workbench enabled flag.
- Admin-only Workbench access.
- Local-only exports and provenance model.
- Endpoint URLs, auth/admin checks, source readers, scope coverage, read-only behavior, and Dev Actions placeholder contract.

### 0.4.1 validation results

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path(p) for p in ['custom_components/ha_context_explorer_probe/__init__.py','custom_components/ha_context_explorer_probe/api.py','custom_components/ha_context_explorer_probe/logic.py','custom_components/ha_context_explorer_probe/privacy.py','custom_components/ha_context_explorer_probe/config_flow.py','custom_components/ha_context_explorer_probe/const.py','custom_components/ha_context_explorer_probe/workbench.py']]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 7 backend files
```

Manifest JSON:

```powershell
python -m json.tool custom_components\ha_context_explorer_probe\manifest.json
```

Result:

```text
manifest JSON parsed successfully
```

Frontend syntax:

```powershell
& 'C:\Users\daniel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check custom_components\ha_context_explorer_probe\www\app.js
& 'C:\Users\daniel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check custom_components\ha_context_explorer_probe\www\workbench.js
```

Result:

```text
No syntax errors reported.
```

Safety scan:

```powershell
Select-String -Path custom_components\ha_context_explorer_probe\**\* -Pattern 'def post|def put|def patch|def delete|async def post|async def put|async def patch|async def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.async_set\(|\.storage|secrets\.yaml|hassTokens|sessionStorage|Authorization|Bearer|fetch\(' -CaseSensitive:$false
```

Result:

```text
Only the sanitizer's sensitive-key regex contains the literal words authorization/bearer. No service calls, mutation handlers, .storage access, secrets.yaml access, token scraping, sessionStorage, Authorization/Bearer usage, or fetch() calls were found.
```

Workbench polish scan:

```powershell
Select-String -Path custom_components\ha_context_explorer_probe\www\app.js,custom_components\ha_context_explorer_probe\www\styles.css -Pattern 'WORKBENCH_COPY_UNAVAILABLE|detectClipboardAvailability|data-clipboard-action|AGGREGATED_EVENT_TYPES|aggregate_key|workbench-toggle-icon|tool-button:disabled'
```

Result:

```text
Expected clipboard availability handling, disabled copy controls, scope_rendered aggregation hooks, and Workbench toggle icon styling were found.
```

Runtime caveat:

- The changes are statically validated in this sandbox.
- Live Home Assistant should still confirm the disabled-copy state, Download JSON path, and aggregated runtime event display in the actual panel context.

## 0.4.0 Developer Workbench foundation review

Task: `developer-workbench-foundation`

Result: implemented a first Developer Workbench foundation on top of the stable post-0.3.3 state. This is a substantial internal diagnostics/review subsystem, not a finished ultimate developer system and not a new explorer data scope.

Architecture chosen:

- Core Explorer remains the normal HA Context Explorer UI and keeps the existing read-only scopes.
- Developer Workbench is a separate, admin-only, explicitly enableable inspector with Review, Payload, Runtime, Privacy, and Actions panes.
- Dev Actions is represented only as a harmless future capability contract. No write-capable actions are implemented.

Persistence model:

- The only persisted value is the browser-local enabled flag `ha_context_explorer_probe.developer_workbench.enabled`.
- This makes the Workbench survive reloads without adding Home Assistant config writes, `.storage` writes, or a broader settings system.
- Runtime events, payload summaries, transcripts, review bundles, and diagnostics are not persisted.

Normal UI cleanliness:

- The Workbench is disabled by default.
- When disabled, the inspector is not shown and the Core Explorer layout remains the normal product UI.
- The enable control is admin-only and subtle; non-admin users do not get the Workbench surface.
- Desktop uses a right-side inspector; narrow layouts use a drawer/overlay style so the Core Explorer remains usable.

Diagnostics surfaces added:

- Current view/scope, route, loading/fetch/render state, auth block state, last successful load summaries, lifecycle state, and wrapper recovery state.
- Semantic rendered review snapshot of the active view, including sections, cards, rows, badges, notices, warnings, caveats, empty states, truncation, raw-ID effects, ordering/grouping, and prominence/visibility metadata where available.
- Sanitized active-scope payload summary with root fields, collection field presence, and sanitized payload inspection.
- Privacy/masking diagnostics showing mask token counts, backend-owned reason labels, and masked locations without exposing original masked values.
- Fixed-size runtime event ring buffer for mount/recovery/fetch/render/auth/export events.

Export/review formats added:

- Structured `developer_workbench_bundle/v1` JSON for current-view AI/UI review.
- Rendered text transcript generated from the same semantic snapshot.
- Sanitized active payload copy.
- Richer local JSON bundle download.
- Every export includes provenance: `current_live_rendered_state` for live mounted rendered state, or `best_effort_active_view_snapshot` when built from cached active-view state during partial mount/recovery.
- Exports include timestamp, active scope, route summary, raw-ID mode, Workbench enabled state, and lifecycle/auth caveats when present.

AI/UI review value:

- The review snapshot captures user-facing meaning instead of only backend payloads.
- Prominence, tone, visibility, ordering, grouping, notices, caveats, and truncation help later review whether a beginner would understand the page, whether warnings are visible enough, and whether the UI is creating clarity or overload.
- Transcript export gives a readable artifact suitable for chat/issues when screenshots are not enough or not desired.

Privacy/path discipline:

- Workbench metadata is safe and admin-only.
- Payload inspection is sanitized client-side before display/export.
- Runtime log entries are compact metadata only and bounded to a fixed-size ring buffer.
- Log entries do not store full payload copies.
- Sensitive-key names are redacted, absolute-looking paths are masked, and privacy diagnostics report mask tokens/reasons/locations without original masked values.
- No remote upload, Sentry/GitHub submission, or background sending was added.

Deferred intentionally:

- Real Dev Actions and any write-capable developer tooling.
- HACS/update-channel/distribution work.
- New explorer scopes, new backend source readers, parser expansion, graph visualization, screenshots, remote diagnostics, and persistent settings beyond the Workbench enabled flag.
- Live Home Assistant confirmation of narrow layout, export copying, and diagnostic usefulness remains separate from this sandbox pass.

### 0.4.0 validation results

Branch check:

```powershell
Get-Content -Path .git\HEAD
```

Result:

```text
ref: refs/heads/developer-workbench-foundation
```

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path(p) for p in ['custom_components/ha_context_explorer_probe/__init__.py','custom_components/ha_context_explorer_probe/api.py','custom_components/ha_context_explorer_probe/logic.py','custom_components/ha_context_explorer_probe/privacy.py','custom_components/ha_context_explorer_probe/config_flow.py','custom_components/ha_context_explorer_probe/const.py','custom_components/ha_context_explorer_probe/workbench.py']]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 7 backend files
```

Manifest JSON:

```powershell
python -m json.tool custom_components\ha_context_explorer_probe\manifest.json
```

Result:

```text
manifest JSON parsed successfully
```

Frontend syntax:

```powershell
& 'C:\Users\daniel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check custom_components\ha_context_explorer_probe\www\app.js
& 'C:\Users\daniel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check custom_components\ha_context_explorer_probe\www\workbench.js
```

Result:

```text
No syntax errors reported.
```

Auth/admin and route registration:

```powershell
Select-String -Path custom_components\ha_context_explorer_probe\api.py -Pattern 'requires_auth = True|_require_admin|is_admin|Unauthorized|workbench|def post|def put|def patch|def delete'
```

Result:

```text
The shared ProbeDataView path still sets requires_auth = True, calls _require_admin(), checks is_admin, and registers workbench through the same GET-only view path. No post/put/patch/delete methods were found.
```

Safety scan:

```powershell
Select-String -Path custom_components\ha_context_explorer_probe\**\* -Pattern 'def post|def put|def patch|def delete|async def post|async def put|async def patch|async def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.async_set\(|\.storage|secrets\.yaml|hassTokens|sessionStorage|Authorization|Bearer|fetch\(' -CaseSensitive:$false
```

Result:

```text
Only the sanitizer's sensitive-key regex contains the literal words authorization/bearer. No service calls, mutation handlers, .storage access, secrets.yaml access, token scraping, sessionStorage, Authorization/Bearer usage, or fetch() calls were found.
```

Browser-local persistence review:

```powershell
Select-String -Path custom_components\ha_context_explorer_probe\www\app.js,custom_components\ha_context_explorer_probe\www\workbench.js -Pattern 'localStorage|sessionStorage|WORKBENCH_EVENT_LIMIT|current_live_rendered_state|best_effort_active_view_snapshot'
```

Result:

```text
localStorage is confined to the Workbench enabled flag helper in workbench.js. sessionStorage is not used. Runtime event history is bounded by WORKBENCH_EVENT_LIMIT. Both export provenance values are present.
```

Logic source-reader guard:

```powershell
Select-String -Path custom_components\ha_context_explorer_probe\logic.py -Pattern 'automations.yaml|scripts.yaml|async_add_executor_job|read_text|\.storage|secrets\.yaml|packages|dashboard' -CaseSensitive:$false
```

Result:

```text
The existing logic starter still reads only canonical automations.yaml and scripts.yaml through async_add_executor_job. Packages and dashboards appear only as unsupported source_coverage entries. No .storage or secrets.yaml access was added.
```

Reference-data safety:

```powershell
Select-String -Path custom_components\ha_context_explorer_probe\**\* -Pattern '_local_reference|probe_input' -CaseSensitive:$false
Select-String -Path README.md,CHANGELOG.md,docs\ai\*.md -Pattern 'probe_input' -CaseSensitive:$false
Select-String -Path .gitignore -Pattern '_local_reference'
```

Result:

```text
No implementation file references _local_reference or probe_input. No README/changelog/AI doc references probe_input. .gitignore still lists _local_reference/.
```

Runtime caveat:

- This sandbox cannot run a full Home Assistant frontend session, so desktop/narrow Workbench layout, copy/download behavior, and live diagnostic usefulness still need user runtime confirmation.
- The implementation keeps all diagnostics and exports local to the browser unless a user manually copies or downloads them.

## 0.3.3 empty-wrapper lifecycle recovery review

Task: focused follow-up for the live-observed case where Home Assistant leaves `ha-panel-custom` mounted but empty, with no `ha-context-explorer-probe-panel` child in the active DOM.

Result: code hardened for the newly confirmed empty-wrapper failure mode. Live Home Assistant confirmation is still required before calling the blank-screen issue fully solved.

Why the previous lifecycle fix could still fail:

- The `0.3.2` recovery lives mostly inside `ha-context-explorer-probe-panel` or depends on `appState.host` still pointing to an active probe element.
- The new runtime evidence shows a stronger failure: `ha-panel-custom` remains on the correct route, but the probe element is not present anywhere in the active DOM.
- If the probe element does not exist, its `connectedCallback()`, `hass` setter, and shell recovery cannot run.

Exact empty-wrapper failure mode addressed:

- `partial-panel-resolver` stays on `ha_context_explorer_probe`.
- `ha-panel-custom` is present and still has `hass`, `panel`, and registered panel metadata for this integration.
- `ha-panel-custom` has no child nodes, no children, and empty `innerHTML`.
- `ha-context-explorer-probe-panel` is registered as a custom element class but missing from the DOM.
- Manually appending the probe child and assigning `hass`, `panel`, `route`, and `narrow` restores the UI.

What changed:

- Added a global route-specific wrapper recovery hook that can run even when the probe element is missing.
- Recovery checks for the active probe route, the `ha-panel-custom` wrapper, registered probe panel metadata, a missing probe child, and an otherwise empty wrapper.
- When those conditions hold, recovery appends one `ha-context-explorer-probe-panel` child and syncs `hass`, `panel`, `route`, and `narrow` from the wrapper.
- Added a mutation-observer based wrapper check plus visibility/page/focus/navigation triggers, debounced to avoid retry loops.
- Added a compact wrapper-level visible fallback if remounting itself fails.
- Kept the existing 0.3.2 panel-internal lifecycle recovery path.
- Bumped the integration/frontend cache version to `0.3.3`.

Duplicate-mount guard:

- Recovery does nothing if a probe child already exists.
- Recovery does nothing if the wrapper is not empty.
- Recovery only considers `ha-panel-custom` wrappers that match the probe panel registration and current route.
- Recovery scheduling is debounced and does not repeatedly call protected JSON endpoints.

### 0.3.3 validation results

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path('custom_components/ha_context_explorer_probe/__init__.py'), pathlib.Path('custom_components/ha_context_explorer_probe/api.py'), pathlib.Path('custom_components/ha_context_explorer_probe/logic.py'), pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'), pathlib.Path('custom_components/ha_context_explorer_probe/config_flow.py'), pathlib.Path('custom_components/ha_context_explorer_probe/const.py')]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 6 backend files
```

Manifest JSON:

```powershell
python -c "import json, pathlib; json.loads(pathlib.Path('custom_components/ha_context_explorer_probe/manifest.json').read_text(encoding='utf-8')); print('manifest JSON OK')"
```

Result:

```text
manifest JSON OK
```

Frontend syntax check:

```powershell
& 'C:\Users\daniel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check custom_components\ha_context_explorer_probe\www\app.js
```

Result:

```text
No syntax errors reported.
```

Safety scan:

```powershell
Get-ChildItem -Path custom_components\ha_context_explorer_probe -Recurse -File | Select-String -Pattern "def post|def put|def patch|def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.async_set\(|\.storage|secrets\.yaml|localStorage|sessionStorage|Authorization|Bearer"
```

Result:

```text
No matches.
```

Auth/admin scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\api.py | Select-String -Pattern "requires_auth = True|_require_admin|is_admin|Unauthorized|ProbeDataView|logic"
```

Result:

```text
JSON views still set requires_auth = True and call _require_admin(); the logic route remains registered through the same ProbeDataView path.
```

Frontend wrapper recovery scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\www\app.js | Select-String -Pattern "ensureProbePanelMounted|findProbePanelCustom|isProbePanelWrapper|isPanelWrapperEmpty|syncProbeElementContext|renderWrapperRecoveryFailure|MutationObserver|hass\.callApi"
```

Result:

```text
The panel frontend contains route-specific empty-wrapper recovery, duplicate-mount guards, context sync from ha-panel-custom, wrapper-level fallback, and the unchanged hass.callApi GET path.
```

Runtime caveat:

- This sandbox cannot reproduce the user's live Home Assistant `ha-panel-custom` empty-wrapper state.
- The code path now directly matches the user's manual recovery experiment, but live runtime confirmation remains required.
- Manual local replacement of backend/Python integration files still typically requires a Home Assistant restart. This is not HACS/update-channel work.

## 0.3.2 lifecycle recovery follow-up review

Task: focused follow-up for the still-observed Home Assistant blank-screen panel state after the first `0.3.1` lifecycle hardening pass.

Result: deeper frontend lifecycle recovery hardening implemented. Live Home Assistant confirmation is still required before calling the blank-screen issue fully solved.

Likely remaining failure mode after `0.3.1`:

- A new or reactivated Home Assistant panel element could receive `hass` updates while global frontend state still pointed at an older host/root, causing the setter to return before adopting the active panel instance.
- A shadow root could remain present while required shell targets were missing or stale; the previous `clearById()` fallback returned a detached dummy element, so render work could complete without throwing and without drawing visible UI.
- Returning from hidden/page-restored/internal-navigation states could leave the element connected but not trigger `connectedCallback()` again, so cached data existed but the shell was not explicitly rebuilt.

What changed:

- The `hass` setter now attempts to recover/adopt the active panel shell instead of returning early on host/root mismatch.
- Shell readiness now checks the versioned shell root, the active shadow host, and required UI targets.
- Missing render targets now trigger shell recovery and then a visible lifecycle fallback if the target still cannot be restored.
- Added visibility return, page restore, focus, hash navigation, and history navigation recovery hooks that rebind/rebuild the shell and render cached data without starting retry loops.
- Added a compact in-panel lifecycle notice/fallback so recovery/failure context is visible inside the panel instead of relying only on browser console output.
- Bumped the integration/frontend cache version to `0.3.2`.

Boundaries kept:

- No endpoint URLs, auth checks, admin-only enforcement, backend data shaping, source readers, source coverage semantics, service calls, mutation handlers, config writes, `.storage` access, secret access, token scraping, persistent preferences, or new explorer scopes changed.
- The existing Home Assistant `hass.callApi("GET", ...)` protected data path remains unchanged.

### 0.3.2 validation results

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path('custom_components/ha_context_explorer_probe/__init__.py'), pathlib.Path('custom_components/ha_context_explorer_probe/api.py'), pathlib.Path('custom_components/ha_context_explorer_probe/logic.py'), pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'), pathlib.Path('custom_components/ha_context_explorer_probe/config_flow.py'), pathlib.Path('custom_components/ha_context_explorer_probe/const.py')]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 6 backend files
```

Manifest JSON:

```powershell
python -c "import json, pathlib; json.loads(pathlib.Path('custom_components/ha_context_explorer_probe/manifest.json').read_text(encoding='utf-8')); print('manifest JSON OK')"
```

Result:

```text
manifest JSON OK
```

Frontend syntax check:

```powershell
& 'C:\Users\daniel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check custom_components\ha_context_explorer_probe\www\app.js
```

Result:

```text
No syntax errors reported.
```

Safety scan:

```powershell
Get-ChildItem -Path custom_components\ha_context_explorer_probe -Recurse -File | Select-String -Pattern "def post|def put|def patch|def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.async_set\(|\.storage|secrets\.yaml|localStorage|sessionStorage|Authorization|Bearer"
```

Result:

```text
No matches.
```

Auth/admin scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\api.py | Select-String -Pattern "requires_auth = True|_require_admin|is_admin|Unauthorized|ProbeDataView|logic"
```

Result:

```text
JSON views still set requires_auth = True and call _require_admin(); the logic route remains registered through the same ProbeDataView path.
```

Frontend lifecycle scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\www\app.js | Select-String -Pattern "recoverPanelShell|scheduleLifecycleRecovery|visibilitychange|pageshow|focus|popstate|hashchange|lifecycle-notice|Panel target missing|hass\.callApi"
```

Result:

```text
The panel frontend contains active host/root recovery, visibility/page/navigation recovery hooks, lifecycle notice/fallback rendering, strict missing-target recovery, and the unchanged hass.callApi GET path.
```

Logic source-reader scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\logic.py | Select-String -Pattern "automations.yaml|scripts.yaml|async_add_executor_job|read_text|\.storage|secrets\.yaml"
```

Result:

```text
Logic source coverage remains the existing starter slice: canonical automations.yaml and scripts.yaml are read through async_add_executor_job. No .storage or secrets.yaml access was added.
```

Reference-data safety:

```powershell
Get-ChildItem -Path custom_components,docs -Recurse -File | Select-String -Pattern "_local_reference|probe_input"
```

Result:

```text
No implementation file references _local_reference or probe_input. A policy-only _local_reference mention remains in AI project context.
```

Runtime caveat:

- This sandbox cannot reproduce the user's live Home Assistant navigation/remount/visibility-return behavior.
- The code path is hardened against stale host/root state, missing shell targets, and connected-but-not-reconnected panel returns, but live confirmation remains required.
- Manual local replacement of backend/Python integration files still typically requires a Home Assistant restart. This is not HACS/update-channel work.

## 0.3.1 lifecycle bugfix review

Task: `fix-panel-lifecycle-blank-screen`

Result: focused native custom-panel lifecycle hardening implemented.

- Made `connectedCallback()` reentrant so the panel reuses or rebuilds the current shadow-root shell after Home Assistant internal navigation, remount, or reconnect.
- Added `disconnectedCallback()` cleanup for stale global host/root references while preserving cached data, active tab, filters, and the session-only raw-ID toggle state.
- Guarded `customElements.define(...)` with `customElements.get(...)` to avoid duplicate-definition failures if the module is evaluated again.
- Added shell readiness checks and a visible lifecycle fallback message instead of a silent blank panel if restoration fails.
- Added frontend guards so async `hass.callApi` responses that finish while the panel is detached do not write into a stale or missing root.
- Kept all existing scopes, endpoint URLs, authenticated/admin-only checks, GET-only behavior, source readers, source coverage semantics, and read-only constraints unchanged.
- Bumped the integration version to `0.3.1`.

### 0.3.1 validation results

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path('custom_components/ha_context_explorer_probe/__init__.py'), pathlib.Path('custom_components/ha_context_explorer_probe/api.py'), pathlib.Path('custom_components/ha_context_explorer_probe/logic.py'), pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'), pathlib.Path('custom_components/ha_context_explorer_probe/config_flow.py'), pathlib.Path('custom_components/ha_context_explorer_probe/const.py')]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 6 backend files
```

Manifest JSON:

```powershell
python -c "import json, pathlib; json.loads(pathlib.Path('custom_components/ha_context_explorer_probe/manifest.json').read_text(encoding='utf-8')); print('manifest JSON OK')"
```

Result:

```text
manifest JSON OK
```

Frontend syntax check:

```powershell
node --check custom_components\ha_context_explorer_probe\www\app.js
```

Result:

```text
Not completed in this sandbox: node.exe returned Access denied, including when retried with elevated permissions.
```

Safety scan:

```powershell
Get-ChildItem -Path custom_components\ha_context_explorer_probe -Recurse -File | Select-String -Pattern "def post|def put|def patch|def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.async_set\(|\.storage|secrets\.yaml|localStorage|sessionStorage|Authorization|Bearer"
```

Result:

```text
No matches.
```

Auth/admin scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\api.py | Select-String -Pattern "requires_auth = True|_require_admin|is_admin|Unauthorized|ProbeDataView|logic"
```

Result:

```text
JSON views still set requires_auth = True and call _require_admin(); the logic route remains registered through the same ProbeDataView path.
```

Frontend lifecycle scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\www\app.js | Select-String -Pattern "customElements\.get|customElements\.define|connectedCallback|disconnectedCallback|isShellReady|initializeShell|syncShellState|renderLifecycleFailure|hass\.callApi|SCOPES|Show raw identifiers|logic"
```

Result:

```text
The panel module contains guarded custom-element registration, reconnect/remount shell readiness checks, disconnect cleanup, visible lifecycle fallback, hass.callApi loading, all seven scopes, the Logic tab, and the session-only raw-ID toggle.
```

Logic source-reader scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\logic.py | Select-String -Pattern "automations.yaml|scripts.yaml|async_add_executor_job|read_text|\.storage|secrets\.yaml"
```

Result:

```text
Logic source coverage remains the existing starter slice: canonical automations.yaml and scripts.yaml are read through async_add_executor_job. No .storage or secrets.yaml access was added.
```

Reference-data safety:

```powershell
Get-ChildItem -Path custom_components,docs -Recurse -File | Select-String -Pattern "_local_reference|probe_input"
```

Result:

```text
No implementation file references _local_reference or probe_input. A policy-only _local_reference mention remains in AI project context.
```

Version alignment:

```powershell
Get-ChildItem -Path custom_components,docs -Recurse -File | Select-String -Pattern "0\.3\.1"
Get-ChildItem -Path . -File | Select-String -Pattern "0\.3\.1"
```

Result:

```text
0.3.1 appears in integration constants, manifest, frontend cache version, README, changelog, review bundle, and AI docs. 0.3.0 and 0.2.x references remain as historical milestone notes.
```

Runtime caveat:

- This sandbox cannot reproduce the user's live Home Assistant navigation/remount behavior.
- The code path was hardened against stale detached roots and duplicate custom-element registration, but live confirmation of the blank-screen fix still depends on the user's Home Assistant runtime.
- Manual local replacement of backend/Python integration files still typically requires a Home Assistant restart. Distribution/update-channel work, such as HACS update visibility, is separate and not part of this task.

## 0.3.0 follow-up review

Task: `add-logic-reference-slice`

Result: first read-only logic/reference starter slice implemented.

- Added authenticated/admin-only `GET /api/ha_context_explorer_probe/logic`.
- Added the `logic` implemented scope and removed it from future/unavailable scopes.
- Added read-only parsing for canonical `automations.yaml` and `scripts.yaml` only.
- Added compact automation, script, and entity usage summaries.
- Added structured `source_coverage` as the primary source-state surface.
- Added distinct source states for parsed/available, missing, unsupported starter source, parse failed, and partially parsed.
- Kept source identifiers compact with basenames such as `automations.yaml` and `scripts.yaml`.
- Added a Logic tab with summary cards, source coverage, automation rows, script rows, entity usage rows, and non-duplicative caveats.
- Existing endpoint auth/admin checks, GET-only behavior, and no-spam frontend auth handling remain intact.
- This is a starter logic/reference slice, not a full Home Assistant logic graph, template parser, or execution tracer.

### 0.3.0 finalize/polish pass

Task: `finalize-logic-0-3-0`

Result: documentation consistency and small Logic tab clarity polish.

- Normalized lower review summary wording so the current branch state is `0.3.0`.
- Kept 0.2.0, 0.2.1, 0.2.2, and 0.2.3 notes as historical records.
- Adjusted README/current-state wording so the implemented scope list includes the Logic starter slice.
- Kept `source_coverage` as the primary structured source-state surface.
- Kept Additional Caveats focused on interpretation limits instead of repeating source coverage states.
- Moved dense Logic raw-ID details into secondary raw identifier lines while preserving label-first rows.
- No backend payload shape, endpoint security, source readers, or scope coverage was expanded in this polish pass.

### 0.3.0 validation results

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path('custom_components/ha_context_explorer_probe/__init__.py'), pathlib.Path('custom_components/ha_context_explorer_probe/api.py'), pathlib.Path('custom_components/ha_context_explorer_probe/logic.py'), pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'), pathlib.Path('custom_components/ha_context_explorer_probe/config_flow.py'), pathlib.Path('custom_components/ha_context_explorer_probe/const.py')]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 6 backend files
```

Manifest JSON:

```powershell
python -c "import json, pathlib; json.loads(pathlib.Path('custom_components/ha_context_explorer_probe/manifest.json').read_text(encoding='utf-8')); print('manifest JSON OK')"
```

Result:

```text
manifest JSON OK
```

Parser availability:

```powershell
python -c "import importlib.util; print('yaml available:', importlib.util.find_spec('yaml') is not None); print('homeassistant available:', importlib.util.find_spec('homeassistant') is not None)"
```

Result:

```text
yaml available: True
homeassistant available: False
```

Safety scan:

```powershell
Get-ChildItem -Recurse -File -Path custom_components\ha_context_explorer_probe | Select-String -Pattern "def post|def put|def patch|def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.async_set\(|\.storage|secrets\.yaml|localStorage|sessionStorage|Authorization|Bearer"
```

Result:

```text
No matches.
```

Auth/admin scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\api.py | Select-String -Pattern "requires_auth = True|_require_admin|is_admin|Unauthorized|logic"
```

Result:

```text
JSON views still set requires_auth = True, call _require_admin(), and include the logic route.
```

Logic source scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\logic.py | Select-String -Pattern "automations.yaml|scripts.yaml|source_coverage|unsupported_starter_slice|path.read_text|async_add_executor_job"
```

Result:

```text
Logic reads only canonical automations.yaml and scripts.yaml through async_add_executor_job. Source coverage uses structured starter-slice statuses.
```

Frontend scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\www\app.js | Select-String -Pattern "logic|Source Coverage|source_coverage|SOURCE_STATUS_LABELS|hass.callApi"
```

Result:

```text
Logic tab, source coverage rendering, status labels, and hass.callApi loading path were found.
```

Reference-data safety scan:

```powershell
Get-ChildItem -Recurse -File -Path custom_components\ha_context_explorer_probe | Select-String -Pattern "_local_reference|probe_input"
Get-ChildItem -Recurse -File -Path README.md,CHANGELOG.md,docs | Select-String -Pattern "probe_input"
```

Result:

```text
No implementation file references `_local_reference/` or `probe_input`.
No README, changelog, or AI documentation file references `probe_input`.
```

Validation caveats:

- Local Home Assistant runtime testing was not possible in this sandbox because `homeassistant available: False`.
- JavaScript syntax was reviewed by source inspection; `node --check` could not run because `node.exe` is blocked by the local execution environment, even with escalation.
- Live validation should confirm that the Logic tab loads source coverage and parsed references in the user's Home Assistant runtime.

## 0.2.3 follow-up review

Task: `refine-privacy-display`

Result: privacy-first display refinement implemented for the existing six scopes.

- Added non-breaking display fields beside existing raw identifiers.
- Default UI rendering now prefers user-facing labels for entities, devices, areas, integrations, and relationships.
- Entity rows use `display_name` first; raw `entity_id` is the default primary label only when no friendly or registry-derived label exists.
- Relationship rows now show label-first node summaries by default instead of raw identifier columns.
- Added a session-local `Show raw identifiers` toggle with no saved preference storage.
- Existing raw fields remain available in JSON for compatibility and optional reveal.
- No new scopes were added.
- This reduces default raw identifier exposure but is not full anonymization.

### 0.2.3 validation results

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path('custom_components/ha_context_explorer_probe/__init__.py'), pathlib.Path('custom_components/ha_context_explorer_probe/api.py'), pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'), pathlib.Path('custom_components/ha_context_explorer_probe/config_flow.py'), pathlib.Path('custom_components/ha_context_explorer_probe/const.py')]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 5 backend files
```

Manifest JSON:

```powershell
python -c "import json, pathlib; json.loads(pathlib.Path('custom_components/ha_context_explorer_probe/manifest.json').read_text(encoding='utf-8')); print('manifest JSON OK')"
```

Result:

```text
manifest JSON OK
```

Safety scan:

```powershell
Get-ChildItem -Recurse -File -Path custom_components\ha_context_explorer_probe | Select-String -Pattern "def post|def put|def patch|def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.storage|secrets|hassTokens|localStorage|sessionStorage|Authorization|Bearer"
```

Result:

```text
No matches.
```

Auth/admin scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\api.py | Select-String -Pattern "requires_auth = True|_require_admin|is_admin|Unauthorized"
```

Result:

```text
JSON views still set requires_auth = True and call _require_admin(); _require_admin still checks request["hass_user"].is_admin and raises Unauthorized.
```

Display-field scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\api.py,custom_components\ha_context_explorer_probe\www\app.js | Select-String -Pattern "display_name|device_label|area_label|integration_label|entity_label|showRawIds|raw-id-toggle"
```

Result:

```text
Expected non-breaking label fields and the session-local raw identifier toggle were found.
```

Frontend display review:

- Entity rows use `display_name` before the compact technical entity fallback.
- Entity raw IDs, device IDs, area IDs, and integration domains are rendered as badges only when `showRawIds` is enabled, except when a compact fallback is necessary because no label exists.
- Device, area, and integration lists use display labels by default and keep raw identifiers behind the same session-local toggle.
- Relationship rows use label-first summaries through `displayNode()` and render raw node identifiers only inside the `showRawIds` branch.
- The toggle is held only in JavaScript memory (`appState.showRawIds`) and does not use persistent browser storage.

Version alignment scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\const.py,custom_components\ha_context_explorer_probe\manifest.json,custom_components\ha_context_explorer_probe\www\app.js,README.md,CHANGELOG.md,docs\ai\AI_CURRENT_STATE.md,docs\ai\AI_CHANGE_HISTORY.md,docs\ai\AI_PROJECT_CONTEXT.md,review_bundle.md | Select-String -Pattern "0\.2\.3"
```

Result:

```text
At the time of the 0.2.3 display-refinement review, version-alignment source files and docs referenced 0.2.3. Historical 0.2.0, 0.2.1, and 0.2.2 notes remained intact.
```

Reference-data safety scan:

```powershell
Get-ChildItem -Recurse -File -Path custom_components\ha_context_explorer_probe | Select-String -Pattern "_local_reference|probe_input"
Get-ChildItem -Recurse -File -Path README.md,CHANGELOG.md,docs | Select-String -Pattern "probe_input"
Get-Content -Path .gitignore | Select-String -Pattern "_local_reference"
```

Result:

```text
No implementation file reads or references `_local_reference/` or `probe_input`.
No README, changelog, or AI documentation file references `probe_input`. Policy-only mentions of `_local_reference/` remain in docs.
`.gitignore` still lists `_local_reference/`.
```

Validation caveats:

- JavaScript syntax was reviewed statically by source inspection. `node --check` was not available in this local execution environment.
- Live Home Assistant runtime validation was not repeated in this sandbox for `0.2.3`. The previously confirmed `0.2.2` native panel/auth behavior remains the baseline runtime result; this change only adds display fields and default UI presentation changes.

## 0.2.2 follow-up review

Task: `resolve-panel-auth-bridge`

Result: native panel auth bridge implemented and confirmed working in the user's tested Home Assistant runtime.

- Replaced iframe built-in panel registration with `panel_custom.async_register_panel`.
- Registered `ha-context-explorer-probe-panel` as a JavaScript module custom element.
- Frontend now uses `hass.callApi("GET", "ha_context_explorer_probe/<scope>")` for protected JSON data.
- Removed the unused `panel.html` request path.
- No token scraping or browser storage auth assumptions were added.
- Real JSON endpoints still set `requires_auth = True`.
- Real JSON endpoints still enforce admin access with `request["hass_user"].is_admin`.
- The frontend keeps the one-shot protected-data failure state if the custom panel auth context is still rejected.
- User runtime validation confirms the native panel can access protected JSON data without the previously observed iframe-style auth failure.
- This remains confirmed for the user's tested Home Assistant runtime, not a universal compatibility guarantee across all Home Assistant versions or deployment shapes.

### 0.2.2 local live runtime validation

Confirmed by the user in their Home Assistant runtime on the working branch:

- Native custom panel loads successfully.
- Panel reports `Connected / Admin data endpoint available`.
- Overview loads real counts.
- Entities loads real items.
- Devices loads real items.
- Areas loads real items.
- Integrations loads real items.
- Relationships loads real items.
- The previous iframe-style invalid-auth failure is no longer the active observed behavior in this tested runtime.

Remaining caveat:

- This validation is runtime-real for the user's tested environment, but not yet proven across every Home Assistant version, frontend build mode, or deployment topology.

### 0.2.2 documentation alignment validation

Docs were updated after successful user runtime testing to remove stale provisional-auth-bridge framing.

Confirmed in this documentation pass:

- `review_bundle.md`, `CHANGELOG.md`, `README.md`, and AI docs describe 0.2.2 as working in the user's tested Home Assistant runtime.
- The docs distinguish tested-runtime success from universal compatibility.
- Historical notes for 0.2.0 and 0.2.1 remain intact.
- No source code behavior changes were made for this documentation alignment pass.

### 0.2.2 validation commands

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path('custom_components/ha_context_explorer_probe/__init__.py'), pathlib.Path('custom_components/ha_context_explorer_probe/api.py'), pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'), pathlib.Path('custom_components/ha_context_explorer_probe/config_flow.py'), pathlib.Path('custom_components/ha_context_explorer_probe/const.py')]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 5 backend files
```

Manifest JSON:

```powershell
python -c "import json, pathlib; json.loads(pathlib.Path('custom_components/ha_context_explorer_probe/manifest.json').read_text(encoding='utf-8')); print('manifest JSON OK')"
```

Result:

```text
manifest JSON OK
```

Safety scan:

```powershell
Get-ChildItem -Recurse -File -Path custom_components\ha_context_explorer_probe | Select-String -Pattern "def post|def put|def patch|def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.storage|secrets|hassTokens|localStorage|sessionStorage|Authorization|Bearer"
```

Result:

```text
No matches.
```

Panel/auth bridge scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\__init__.py,custom_components\ha_context_explorer_probe\www\app.js | Select-String -Pattern "panel_custom|async_register_panel|embed_iframe=False|hass.callApi|fetch\(|localStorage|sessionStorage|hassTokens|Authorization|Bearer"
```

Result:

```text
Found panel_custom registration, embed_iframe=False, and hass.callApi.
No fetch(), localStorage, sessionStorage, hassTokens, Authorization, or Bearer matches.
```

JavaScript module parse:

```powershell
node --check custom_components\ha_context_explorer_probe\www\app.js
```

Result:

```text
Not completed in this sandbox. node.exe is blocked by the local execution environment even when escalation is requested.
```

Home Assistant runtime:

```powershell
python -c "import importlib.util; print('homeassistant available:', importlib.util.find_spec('homeassistant') is not None)"
```

Result:

```text
homeassistant available: False
```

Live HA validation status:

- User runtime testing confirms Overview loads real data.
- User runtime testing confirms all implemented protected tabs load real data.
- User runtime testing confirms the previous invalid-auth failure is no longer the current observed outcome.
- This sandbox still cannot independently run Home Assistant because `homeassistant available: False`.

## 0.2.1 follow-up review

Task: `fix-panel-io-auth`

Result: partial auth-path fix with endpoint security preserved.

- Blocking request-handler file I/O was removed from the panel HTML view.
- `panel.html` is loaded and version-prepared during setup through `hass.async_add_executor_job`.
- The panel request handler now serves cached HTML from memory.
- Real JSON endpoints still set `requires_auth = True`.
- Real JSON endpoints still enforce admin access with `request["hass_user"].is_admin`.
- Frontend same-origin fetch remains minimal and does not scrape browser storage or hard-code token keys.
- On 401/403, the frontend records one global protected-data failure, marks all views unavailable, and avoids further protected endpoint requests during that page session.
- This does not prove that iframe auth is fully resolved in every Home Assistant runtime. If the current iframe context still cannot authenticate same-origin JSON fetches, the UI now fails quietly and honestly while preserving endpoint auth.

### 0.2.1 validation commands

Backend syntax:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path('custom_components/ha_context_explorer_probe/__init__.py'), pathlib.Path('custom_components/ha_context_explorer_probe/api.py'), pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'), pathlib.Path('custom_components/ha_context_explorer_probe/config_flow.py'), pathlib.Path('custom_components/ha_context_explorer_probe/const.py')]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 5 backend files
```

Manifest JSON:

```powershell
python -c "import json, pathlib; json.loads(pathlib.Path('custom_components/ha_context_explorer_probe/manifest.json').read_text(encoding='utf-8')); print('manifest JSON OK')"
```

Result:

```text
manifest JSON OK
```

Safety scan:

```powershell
Get-ChildItem -Recurse -File -Path custom_components\ha_context_explorer_probe | Select-String -Pattern "def post|def put|def patch|def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.storage|secrets|hassTokens|localStorage|sessionStorage|Authorization|Bearer"
```

Result:

```text
No matches.
```

Panel I/O scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\__init__.py | Select-String -Pattern "async_add_executor_job|read_text|async def get"
```

Result:

```text
read_text is confined to _load_panel_html, and setup calls hass.async_add_executor_job(_load_panel_html, ...).
ProbePanelView.get returns cached HTML from memory.
```

Auth no-spam scan:

```powershell
Get-Content -Path custom_components\ha_context_explorer_probe\www\app.js | Select-String -Pattern "authBlocked|blockProtectedData|isAuthError|fetch"
```

Result:

```text
app.js keeps one authBlocked state, handles 401/403 through blockProtectedData(), and skips later fetches while authBlocked is set.
No localStorage/sessionStorage/hassTokens/Authorization/Bearer references were found.
```

Reference-data safety scan:

```powershell
Get-ChildItem -Recurse -File -Path . | Where-Object { $_.FullName -notlike '*\_local_reference\*' -and $_.FullName -notlike '*\.git\*' } | Select-String -Pattern "<known local snapshot markers>"
```

Result:

```text
No matches.
```

## Current Scope Summary

Phase 2 implemented HA Context Explorer `0.2.0` as the first real read-only explorer slice. Version `0.4.1` is the current branch state: it keeps the `0.3.0` logic/reference starter slice, includes the `0.3.1` through `0.3.3` native-panel lifecycle and empty-wrapper recovery hardening, adds the first `0.4.0` Developer Workbench foundation, and applies a small live-test polish pass for Workbench copy/runtime-log usability on top of the 0.2.x foundation.

Implemented real data scopes:

- overview
- entities
- devices
- areas
- integrations
- relationships
- logic

Still not implemented:

- floors
- labels
- dashboards
- packages and include-based logic layouts
- storage-only editor internals
- full template dependency coverage
- deep YAML or logic graphing
- graph visualization or execution tracing
- write settings or saved preferences
- mutation features
- real Dev Actions or write-capable developer tools
- remote diagnostic upload or background sending

## Safety review

Result: pass with live-runtime caveat.

- Real data routes are registered as `GET` handlers only.
- JSON data endpoints set `requires_auth = True`.
- JSON data endpoints explicitly require `request["hass_user"].is_admin`.
- The native custom panel loads the originally implemented protected scopes through Home Assistant's frontend auth context in the user's tested runtime.
- The 0.3.0 logic slice is implemented as a protected read-only endpoint with source coverage honesty.
- The 0.4.x Workbench endpoint is protected and returns safe metadata only.
- No service calls were added.
- No service registration was added.
- No POST / PUT / PATCH / DELETE handlers were added.
- No Home Assistant config writes were added.
- No `.storage` reads or writes were added.
- No secret access was added.
- No restart or supervisor controls were added.
- No write-capable Dev Actions were added.

## Privacy review

Result: pass with documented limitation.

- User-visible strings are shaped through best-effort masking.
- Masking covers obvious IPv4-like values, MAC-like values, and Wi-Fi / SSID / BSSID contexts where safely detectable.
- Numeric measurement values are preserved.
- Docs state that masking is best-effort and not guaranteed anonymization.
- No persistent privacy preference writing was added.

## Reference-data review

Result: pass with local git tooling caveat.

- `_local_reference/` remains listed in `.gitignore`.
- No implementation file reads from `_local_reference/`.
- No reference data was copied into repository source files or docs.
- Static scan outside `_local_reference/` found no copied local snapshot markers such as local instance name, location coordinates, HA version snapshot, registry filenames, or config allowlist keys.
- Local `git` was not available on PATH, so `git status` could not be used. No commit was made during this task.

## Validation commands

### Backend syntax

Command:

```powershell
python -c "import ast, pathlib; files=[pathlib.Path('custom_components/ha_context_explorer_probe/__init__.py'), pathlib.Path('custom_components/ha_context_explorer_probe/api.py'), pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'), pathlib.Path('custom_components/ha_context_explorer_probe/config_flow.py'), pathlib.Path('custom_components/ha_context_explorer_probe/const.py')]; [ast.parse(path.read_text(encoding='utf-8'), filename=str(path)) for path in files]; print('AST syntax OK for', len(files), 'backend files')"
```

Result:

```text
AST syntax OK for 5 backend files
```

### Manifest JSON

Command:

```powershell
python -c "import json, pathlib; json.loads(pathlib.Path('custom_components/ha_context_explorer_probe/manifest.json').read_text(encoding='utf-8')); print('manifest JSON OK')"
```

Result:

```text
manifest JSON OK
```

### Privacy helper sanity

Command:

```powershell
python -c "import importlib.util, pathlib; path=pathlib.Path('custom_components/ha_context_explorer_probe/privacy.py'); spec=importlib.util.spec_from_file_location('privacy_probe', path); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); assert mod.mask_value('192.168.1.10') == '[masked-ipv4]'; assert mod.mask_value('aa:bb:cc:dd:ee:ff') == '[masked-mac]'; assert mod.mask_value('HomeNetwork', 'ssid') == '[masked-wifi]'; assert mod.mask_value(23.4, 'temperature') == 23.4; print('Privacy helper sanity OK')"
```

Result:

```text
Privacy helper sanity OK
```

### Safety scan

Command:

```powershell
Get-ChildItem -Recurse -File -Path custom_components\ha_context_explorer_probe | Select-String -Pattern "def post|def put|def patch|def delete|hass\.services\.async_call|async_register_service|register_admin_service|\.storage|secrets|hassTokens|localStorage|sessionStorage|Authorization|Bearer"
```

Result:

```text
No matches.
```

### Historical 0.2.0 frontend asset and auth sanity

This section records the original 0.2.0 validation at the time it was performed. It is superseded for current runtime behavior by the 0.2.2 native custom panel validation above.

Commands confirmed:

- `panel.html` references `styles.css` and `app.js`.
- `panel.html` contains views for overview, entities, devices, areas, integrations, and relationships.
- `app.js` uses same-origin fetch:

```javascript
fetch(`${API_BASE}/${scope}`, { credentials: "same-origin" })
```

- `app.js` contains explicit 401 and 403 display handling.
- `app.js` does not reference `localStorage`, `sessionStorage`, `hassTokens`, `Authorization`, or `Bearer`.

### Version alignment

At the time of the original Phase-2 review, `0.2.0` was confirmed in:

- `custom_components/ha_context_explorer_probe/const.py`
- `custom_components/ha_context_explorer_probe/manifest.json`
- `README.md`
- `CHANGELOG.md`
- `docs/ai/AI_CURRENT_STATE.md`

Current version alignment is covered by the newer 0.4.1 review section above. Historical `0.1.1`, `0.1.0`, and prior corrective-version references remain only in changelog/change-history/review context.

### Historical Home Assistant runtime caveat

Command:

```powershell
python -c "import importlib.util; print('homeassistant available:', importlib.util.find_spec('homeassistant') is not None)"
```

Result:

```text
homeassistant available: False
```

This was the 0.2.0 local-sandbox caveat before live runtime testing and before the native custom panel bridge. The native panel bridge behavior was confirmed working in the user's tested Home Assistant runtime for the 0.2.2 implemented scopes, while universal compatibility across all HA environments, live 0.3.0 logic-slice behavior, and live 0.3.3 lifecycle behavior remain unproven in this sandbox.
