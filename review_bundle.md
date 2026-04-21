# Review Bundle

## 0.2.2 follow-up review

Task: `resolve-panel-auth-bridge`

Result: native panel auth bridge candidate implemented; live HA behavior still must be confirmed in the user's runtime.

- Replaced iframe built-in panel registration with `panel_custom.async_register_panel`.
- Registered `ha-context-explorer-probe-panel` as a JavaScript module custom element.
- Frontend now uses `hass.callApi("GET", "ha_context_explorer_probe/<scope>")` for protected JSON data.
- Removed the unused `panel.html` request path.
- No token scraping or browser storage auth assumptions were added.
- Real JSON endpoints still set `requires_auth = True`.
- Real JSON endpoints still enforce admin access with `request["hass_user"].is_admin`.
- The frontend keeps the one-shot protected-data failure state if the custom panel auth context is still rejected.
- This local environment does not include Home Assistant, so live Overview/data-tab loading and invalid-auth log behavior could not be verified here.

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

Live HA validation still needs to be run in the user's Home Assistant instance:

- whether Overview now loads real data
- whether the invalid-auth warning disappeared
- whether all protected tabs load

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

Phase 2 implemented HA Context Explorer Probe `0.2.0` as the first real read-only explorer slice. The current corrective version is `0.2.2`.

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
- The panel shell remains boot-compatible, but it does not return real data.
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

### Frontend asset and auth sanity

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

Confirmed `0.2.0` in:

- `custom_components/ha_context_explorer_probe/const.py`
- `custom_components/ha_context_explorer_probe/manifest.json`
- `README.md`
- `CHANGELOG.md`
- `docs/ai/AI_CURRENT_STATE.md`

Historical `0.1.1` and `0.1.0` references remain only in changelog/change-history context.

### Home Assistant runtime caveat

Command:

```powershell
python -c "import importlib.util; print('homeassistant available:', importlib.util.find_spec('homeassistant') is not None)"
```

Result:

```text
homeassistant available: False
```

Full live runtime behavior still needs validation inside Home Assistant, especially iframe auth behavior and current registry object compatibility.
