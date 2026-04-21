# Review Bundle

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
Current-version source files and docs reference 0.2.3. Historical 0.2.0, 0.2.1, and 0.2.2 notes remain intact.
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

## Scope

Phase 2 implemented HA Context Explorer Probe `0.2.0` as the first real read-only explorer slice. The current corrective/display-refinement version is `0.2.3`.

Implemented real data scopes:

- overview
- entities
- devices
- areas
- integrations
- relationships

Not implemented in this phase:

- floors
- labels
- dashboards
- deep YAML or logic graphing
- write settings or saved preferences
- mutation features

## Safety review

Result: pass with live-runtime caveat.

- Real data routes are registered as `GET` handlers only.
- JSON data endpoints set `requires_auth = True`.
- JSON data endpoints explicitly require `request["hass_user"].is_admin`.
- The native custom panel loads real data through Home Assistant's frontend auth context in the user's tested runtime.
- No service calls were added.
- No service registration was added.
- No POST / PUT / PATCH / DELETE handlers were added.
- No Home Assistant config writes were added.
- No `.storage` reads or writes were added.
- No secret access was added.
- No restart or supervisor controls were added.

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

Current version alignment is covered by the newer 0.2.3 review section above. Historical `0.1.1`, `0.1.0`, and prior corrective-version references remain only in changelog/change-history/review context.

### Historical Home Assistant runtime caveat

Command:

```powershell
python -c "import importlib.util; print('homeassistant available:', importlib.util.find_spec('homeassistant') is not None)"
```

Result:

```text
homeassistant available: False
```

This was the 0.2.0 local-sandbox caveat before live runtime testing and before the native custom panel bridge. Current 0.2.2 behavior is confirmed working in the user's tested Home Assistant runtime for the implemented scopes, while universal compatibility across all HA environments remains unproven.
