# Original tests feature map

Baseline: `2f1ba83`

| Test file | Test case | Feature signal | Codex-only relevance |
|---|---|---|---|
| `test/bridge/bridge-adapters.codex.test.ts` | treats a clean native panel exit as expected | treats a clean native panel exit as expected | Yes/Partial |
| `test/bridge/bridge-adapters.codex.test.ts` | keeps embedded codex exit code 0 as unexpected | keeps embedded codex exit code 0 as unexpected | Yes/Partial |
| `test/bridge/bridge-adapters.codex.test.ts` | suppresses transport fatal errors while a clean panel exit is in progress | suppresses transport fatal errors while a clean panel exit is in progress | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | persistent bridges stay alive after companion disconnect | persistent bridges stay alive after companion disconnect | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | companion-bound bridges stop after companion disconnect | companion-bound bridges stop after companion disconnect | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | undefined lifecycle keeps the historical persistent behavior | undefined lifecycle keeps the historical persistent behavior | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | companion-bound bridges stop immediately after an expected close | companion-bound bridges stop immediately after an expected close | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | companion-bound bridges wait through a reconnect window after unexpected disconnects | companion-bound bridges wait through a reconnect window after unexpected disconnects | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | persistent bridges fall back to manual reconnect after unexpected disconnects | persistent bridges fall back to manual reconnect after unexpected disconnects | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | daemon-managed companions do not ask users to open a second terminal | daemon-managed companions do not ask users to open a second terminal | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | companion state updates preserve visible companion occupancy | companion state updates preserve visible companion occupancy | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | expected close detection only treats explicit closing reasons as expected | expected close detection only treats explicit closing reasons as expected | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | formats reconnect timeout messages with the grace window | formats reconnect timeout messages with the grace window | Yes/Partial |
| `test/bridge/bridge-adapters.core.test.ts` | buildCompanionHealthPatch persists stopped worker state for auto-heal decisions | buildCompanionHealthPatch persists stopped worker state for auto-heal decisions | Yes/Partial |
| `test/bridge/bridge-adapters.opencode.test.ts` | creates a LocalCompanionProxyAdapter for the bridge-side opencode entry | creates a LocalCompanionProxyAdapter for the bridge-side opencode entry | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | creates an OpenCodeServerAdapter inside the local companion | creates an OpenCodeServerAdapter inside the local companion | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | treats legacy embedded render mode like the bridge-side proxy path | treats legacy embedded render mode like the bridge-side proxy path | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | creates an OpenCodeServerAdapter that accepts initialSharedSessionId option | creates an OpenCodeServerAdapter that accepts initialSharedSessionId option | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | starts in stopped status with correct kind and command | starts in stopped status with correct kind and command | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | preserves profile option when provided | preserves profile option when provided | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | appends extra CLI args only to the visible attach command | appends extra CLI args only to the visible attach command | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | passes the active session and cwd to the native attach client | passes the active session and cwd to the native attach client | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | starts a fresh session when requested by the start launcher | starts a fresh session when requested by the start launcher | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | keeps the latest live session when the persisted shared session is gone | keeps the latest live session when the persisted shared session is gone | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | restores the persisted shared session only when the server can still load it | restores the persisted shared session only when the server can still load it | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores server.connected and server.heartbeat events | ignores server.connected and server.heartbeat events | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores events with non-record properties without crashing | ignores events with non-record properties without crashing | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | starts both local and global sync SSE loops | starts both local and global sync SSE loops | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | syncs the restored shared session into the visible TUI | syncs the restored shared session into the visible TUI | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | selects the visible session before sending the first WeChat prompt | selects the visible session before sending the first WeChat prompt | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | creates a new OpenCode session from a WeChat control command | creates a new OpenCode session from a WeChat control command | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | drives the visible TUI when a local session switch becomes authoritative | drives the visible TUI when a local session switch becomes authoritative | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | completes a WeChat turn after session idle with final reply | completes a WeChat turn after session idle with final reply | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | emits the full visible answer instead of a 500 character tail summary | emits the full visible answer instead of a 500 character tail summary | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores session idle when not in busy status | ignores session idle when not in busy status | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores idle signals from a foreign session | ignores idle signals from a foreign session | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | clears pending permission after session idle | clears pending permission after session idle | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | transitions from idle to busy on running status | transitions from idle to busy on running status | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | transitions from idle to busy on busy status | transitions from idle to busy on busy status | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | does not double-transition when already busy | does not double-transition when already busy | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores non-record properties without crashing | ignores non-record properties without crashing | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | fails the tracked turn for non-abort session errors | fails the tracked turn for non-abort session errors | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | settles aborted turns without emitting task_failed | settles aborted turns without emitting task_failed | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores session.error from a foreign session while the current turn is still active | ignores session.error from a foreign session while the current turn is still active | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | emits approval_required with one-time code | emits approval_required with one-time code | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | extracts title and metadata from permission object | extracts title and metadata from permission object | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores permission events missing required fields | ignores permission events missing required fields | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | works with minimal permission properties | works with minimal permission properties | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | accepts v2 permission.asked events | accepts v2 permission.asked events | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | auto-rejects outbound attachment staging permission events | auto-rejects outbound attachment staging permission events | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | auto-rejects outbound external directory permissions from lowercase metadata paths | auto-rejects outbound external directory permissions from lowercase metadata paths | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | keeps ordinary external directory permissions user-controlled | keeps ordinary external directory permissions user-controlled | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | follows a new local session created during a local turn | follows a new local session created during a local turn | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores bootstrap session.created events until an authoritative local follow signal arrives | ignores bootstrap session.created events until an authoritative local follow signal arrives | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | follows a session.created event after a local new-session command | follows a session.created event after a local new-session command | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | follows a new local session created after startup without a command marker | follows a new local session created after startup without a command marker | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | follows unscoped companion global session.created events after startup | follows unscoped companion global session.created events after startup | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | follows the first unscoped companion session.created after a local new command | follows the first unscoped companion session.created after a local new command | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores session.created with missing session ID | ignores session.created with missing session ID | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores foreign session.updated events once a shared session is established | ignores foreign session.updated events once a shared session is established | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | emits a single local draft notice before submit | emits a single local draft notice before submit | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | mirrors a submitted local prompt as a local turn | mirrors a submitted local prompt as a local turn | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | deduplicates repeated prompt events across SSE streams | deduplicates repeated prompt events across SSE streams | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | clears the buffered local prompt before submit | clears the buffered local prompt before submit | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | tracks local TUI session selections as local session switches | tracks local TUI session selections as local session switches | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | tracks camelCase local TUI session selections | tracks camelCase local TUI session selections | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | tracks /session command executions as local session switches | tracks /session command executions as local session switches | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | local session switches immediately clear a running wechat turn | local session switches immediately clear a running wechat turn | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores sync session.updated events without an explicit local session selection signal | ignores sync session.updated events without an explicit local session selection signal | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores payload-wrapped global sync session updates without an explicit local selection | ignores payload-wrapped global sync session updates without an explicit local selection | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | follows payload-wrapped global events for the current directory | follows payload-wrapped global events for the current directory | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores payload-wrapped global sync session updates from another directory | ignores payload-wrapped global sync session updates from another directory | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores payload-wrapped global events from another directory | ignores payload-wrapped global events from another directory | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | accepts unscoped global TUI prompt events in companion mode | accepts unscoped global TUI prompt events in companion mode | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | forwards text content via delta when busy | forwards text content via delta when busy | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | extracts text from part.text when no delta | extracts text from part.text when no delta | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | accepts v2 message.part.delta events | accepts v2 message.part.delta events | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores message updates when not busy | ignores message updates when not busy | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores reasoning parts | ignores reasoning parts | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores text deltas that belong to known reasoning parts | ignores text deltas that belong to known reasoning parts | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | ignores non-text message.part.delta fields | ignores non-text message.part.delta fields | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | deduplicates accumulated message.part.updated snapshots | deduplicates accumulated message.part.updated snapshots | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | does not duplicate text when a delta is followed by a full snapshot | does not duplicate text when a delta is followed by a full snapshot | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | mirrors local user messages discovered from message events | mirrors local user messages discovered from message events | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | does not include local prompt echoes in the final reply buffer | does not include local prompt echoes in the final reply buffer | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | does not mirror wechat-origin user messages back to WeChat | does not mirror wechat-origin user messages back to WeChat | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | does not classify promptAsync-time WeChat echoes as local OpenCode input | does not classify promptAsync-time WeChat echoes as local OpenCode input | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | emits a single notice for long-running WeChat turns | emits a single notice for long-running WeChat turns | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | transitions to stopped and clears state | transitions to stopped and clears state | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | resolveDefaultAdapterCommand returns opencode for opencode kind | resolveDefaultAdapterCommand returns opencode for opencode kind | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | getLocalCompanionCommandName returns wechat-opencode for opencode | getLocalCompanionCommandName returns wechat-opencode for opencode | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | formats mirrored OpenCode input without Claude/Codex wording | formats mirrored OpenCode input without Claude/Codex wording | Yes/Partial |
| `test/bridge/bridge-adapters.opencode.test.ts` | formats final reply and failure messages by adapter | formats final reply and failure messages by adapter | No unless shared utility behavior |
| `test/bridge/bridge-adapters.opencode.test.ts` | formats OpenCode session resume list with session wording | formats OpenCode session resume list with session wording | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | keeps an explicit executable path unchanged | keeps an explicit executable path unchanged | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | prefers cmd launcher over ps1 on Windows when vendor exe is missing | prefers cmd launcher over ps1 on Windows when vendor exe is missing | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | prefers bundled vendor exe for codex on Windows | prefers bundled vendor exe for codex on Windows | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | prefers the installed package vendor exe before hidden staging directories | prefers the installed package vendor exe before hidden staging directories | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | passes forwarded exec args through the cmd wrapper on Windows | passes forwarded exec args through the cmd wrapper on Windows | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | launches claude.exe directly on Windows | launches claude.exe directly on Windows | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | keeps codex and claude defaults unchanged | keeps codex and claude defaults unchanged | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | keeps the Windows shell default unchanged | keeps the Windows shell default unchanged | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | selects the first available non-Windows shell in priority order | selects the first available non-Windows shell in priority order | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | throws a helpful error when no non-Windows shell is available | throws a helpful error when no non-Windows shell is available | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | passes through the full Windows CLI environment for codex and claude | passes through the full Windows CLI environment for codex and claude | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | passes through the non-Windows CLI environment | passes through the non-Windows CLI environment | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | preserves existing no_proxy values while adding local loopback hosts | preserves existing no_proxy values while adding local loopback hosts | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | enables ConPTY only on Windows builds that support it | enables ConPTY only on Windows builds that support it | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | builds non-Windows PowerShell launch args | builds non-Windows PowerShell launch args | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | builds Windows PowerShell launch args for a long-lived shell session | builds Windows PowerShell launch args for a long-lived shell session | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | builds POSIX shell launch args | builds POSIX shell launch args | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | rejects unsupported shell executables | rejects unsupported shell executables | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | builds a PowerShell profile source command | builds a PowerShell profile source command | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | quotes POSIX shell profile paths safely | quotes POSIX shell profile paths safely | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | builds shell input payloads with a completion sentinel | builds shell input payloads with a completion sentinel | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | supports a custom shell completion marker | supports a custom shell completion marker | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | handles shell output without throwing when a command completes | handles shell output without throwing when a command completes | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | suppresses echoed shell input and waits for a split completion marker | suppresses echoed shell input and waits for a split completion marker | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | strips concatenated PowerShell wrapper noise before forwarding visible output | strips concatenated PowerShell wrapper noise before forwarding visible output | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | rejects interactive shell entry commands before writing to the worker | rejects interactive shell entry commands before writing to the worker | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | accepts PowerShell completion sentinels prefixed by a bare prompt token | accepts PowerShell completion sentinels prefixed by a bare prompt token | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | interrupt settles the active shell command once and ignores late completion output | interrupt settles the active shell command once and ignores late completion output | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | matches the expected cwd and thread id | matches the expected cwd and thread id | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | rejects a session from the same cwd when the source does not match | rejects a session from the same cwd when the source does not match | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | rejects a session that started too far before the bridge session | rejects a session that started too far before the bridge session | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | formats command execution approvals for WeChat | formats command execution approvals for WeChat | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | formats file change approvals for WeChat | formats file change approvals for WeChat | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | detects outbound attachment staging approvals | detects outbound attachment staging approvals | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | formats and resolves Codex request_permissions prompts | formats and resolves Codex request_permissions prompts | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | auto-approves only low-risk Codex approval requests | auto-approves only low-risk Codex approval requests | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | formats Codex request_user_input prompts for WeChat | formats Codex request_user_input prompts for WeChat | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | builds the standard remote tui args | builds the standard remote tui args | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | builds a real codex resume command for panel thread switching | builds a real codex resume command for panel thread switching | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | keeps inline mode for embedded codex rendering | keeps inline mode for embedded codex rendering | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | appends extra codex CLI args after bridge-managed args | appends extra codex CLI args after bridge-managed args | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | rejects extra codex args that would override the bridge remote | rejects extra codex args that would override the bridge remote | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | detects whether the installed help text exposes --no-alt-screen | detects whether the installed help text exposes --no-alt-screen | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | builds Claude companion args without unsupported alt-screen flags | builds Claude companion args without unsupported alt-screen flags | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | keeps --no-alt-screen only when a compatible Claude build exposes it | keeps --no-alt-screen only when a compatible Claude build exposes it | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | appends extra Claude CLI args after bridge-managed settings | appends extra Claude CLI args after bridge-managed settings | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | rejects extra Claude args that would override bridge settings | rejects extra Claude args that would override bridge settings | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | recognizes Claude invalid resume errors | recognizes Claude invalid resume errors | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | keeps Claude runtime session and resume conversation ids separate | keeps Claude runtime session and resume conversation ids separate | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | ignores saved Claude resume ids when start launcher requests a fresh session | ignores saved Claude resume ids when start launcher requests a fresh session | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | marks the Claude workspace trust dialog accepted in Claude config | marks the Claude workspace trust dialog accepted in Claude config | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | creates a Claude project trust entry when the config has no project yet | creates a Claude project trust entry when the config has no project yet | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | submits single-line Claude WeChat input with a delayed final enter | submits single-line Claude WeChat input with a delayed final enter | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | submits generated WeChat attachment guidance as bracketed paste before enter | submits generated WeChat attachment guidance as bracketed paste before enter | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | auto-confirms Claude workspace trust prompt during startup | auto-confirms Claude workspace trust prompt during startup | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | does not auto-confirm Claude workspace trust text during an active WeChat turn | does not auto-confirm Claude workspace trust text during an active WeChat turn | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | suppresses raw Claude PTY output and waits for structured approval hooks | suppresses raw Claude PTY output and waits for structured approval hooks | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | auto-approves low-risk Claude Bash approvals without WeChat prompts | auto-approves low-risk Claude Bash approvals without WeChat prompts | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | auto-approves low-risk Claude read tools without WeChat prompts | auto-approves low-risk Claude read tools without WeChat prompts | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | keeps high-risk Claude approvals actionable through WeChat | keeps high-risk Claude approvals actionable through WeChat | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | keeps structured Claude approvals actionable until they are resolved | keeps structured Claude approvals actionable until they are resolved | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | auto-denies Claude attempts to stage WeChat files in outbound directories | auto-denies Claude attempts to stage WeChat files in outbound directories | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | clears stale Claude remote approvals when the hook request is lost without a terminal fallback | clears stale Claude remote approvals when the hook request is lost without a terminal fallback | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | emits a single notice for long-running Claude WeChat turns | emits a single notice for long-running Claude WeChat turns | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | cancels the pending Claude working notice when a structured approval is requested | cancels the pending Claude working notice when a structured approval is requested | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | cancels the pending Claude working notice once the final reply arrives | cancels the pending Claude working notice once the final reply arrives | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | falls back to the Claude transcript when the Stop hook omits the final reply | falls back to the Claude transcript when the Stop hook omits the final reply | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | completes a Claude compact turn even when SessionStart keeps the same session | completes a Claude compact turn even when SessionStart keeps the same session | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | detects Claude compact completion directly from PTY output | detects Claude compact completion directly from PTY output | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | detects Claude compact failure directly from PTY output | detects Claude compact failure directly from PTY output | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | detects non-403 Claude compact failures without hardcoded login text | detects non-403 Claude compact failures without hardcoded login text | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | ignores duplicate Claude compact failures after the turn is already settled | ignores duplicate Claude compact failures after the turn is already settled | No unless shared utility behavior |
| `test/bridge/bridge-adapters.test.ts` | accepts idle thread status notifications from the local panel | accepts idle thread status notifications from the local panel | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | rejects notLoaded thread status notifications | rejects notLoaded thread status notifications | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | extracts the thread id from thread-started notifications | extracts the thread id from thread-started notifications | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | returns null when the thread payload is missing | returns null when the thread payload is missing | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | skips historical entries before the thread-switch cutoff | skips historical entries before the thread-switch cutoff | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | keeps entries written after the thread-switch cutoff | keeps entries written after the thread-switch cutoff | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | treats missing timestamps as replay while the cutoff is active | treats missing timestamps as replay while the cutoff is active | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | recovers when busy is set without any tracked turn context | recovers when busy is set without any tracked turn context | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | does not recover when a turn is still active or pending | does not recover when a turn is still active or pending | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | auto-completes a settled WeChat turn once final output is available | auto-completes a settled WeChat turn once final output is available | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | does not auto-complete local, incomplete, or still-active turns | does not auto-complete local, incomplete, or still-active turns | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | polls a WeChat session completion while the app-server process is gone | polls a WeChat session completion while the app-server process is gone | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | does not replay historical local session entries on startup | does not replay historical local session entries on startup | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | session task_complete clears the in-memory active turn and returns to idle | session task_complete clears the in-memory active turn and returns to idle | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | sendInput recovers a stale hidden active turn before starting the next WeChat turn | sendInput recovers a stale hidden active turn before starting the next WeChat turn | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | sendInput subscribes the bridge before using a local-followed Codex thread | sendInput subscribes the bridge before using a local-followed Codex thread | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | sendInput keeps working when a local-followed Codex thread is not materialized yet | sendInput keeps working when a local-followed Codex thread is not materialized yet | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | auto-denies Codex attempts to stage WeChat files in outbound directories | auto-denies Codex attempts to stage WeChat files in outbound directories | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | auto-approves low-risk Codex command approvals without WeChat prompts | auto-approves low-risk Codex command approvals without WeChat prompts | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | keeps high-risk Codex command approvals actionable through WeChat | keeps high-risk Codex command approvals actionable through WeChat | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | auto-denies Codex outbound attachment permission requests | auto-denies Codex outbound attachment permission requests | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | auto-approves low-risk Codex permissions with strict auto review | auto-approves low-risk Codex permissions with strict auto review | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | emits high-risk Codex permissions approvals and grants requested permissions on confirm | emits high-risk Codex permissions approvals and grants requested permissions on confirm | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | returns explicit fallback responses for unsupported Codex server tools | returns explicit fallback responses for unsupported Codex server tools | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | emits Codex user input requests and submits answers back to app-server | emits Codex user input requests and submits answers back to app-server | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | clears Codex user input state when the server resolves the request | clears Codex user input state when the server resolves the request | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | mirrors the first local turn after /resume before shared thread follow catches up | mirrors the first local turn after /resume before shared thread follow catches up | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | mirrors the first local turn during startup before any shared thread is established | mirrors the first local turn during startup before any shared thread is established | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | mirrors the first local turn after /resume even when item/started arrives before turn/started | mirrors the first local turn after /resume even when item/started arrives before turn/started | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | announces the startup thread after the local follow candidate settles | announces the startup thread after the local follow candidate settles | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | only announces the latest startup thread candidate when the first one is replaced | only announces the latest startup thread candidate when the first one is replaced | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | finds a recently updated historical thread for the current cwd | finds a recently updated historical thread for the current cwd | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | only accepts trusted CLI or wechat-bridge vscode sessions for recent fallback | only accepts trusted CLI or wechat-bridge vscode sessions for recent fallback | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | returns only final-answer agent messages | returns only final-answer agent messages | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | ignores commentary and non-agent items | ignores commentary and non-agent items | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | extracts plain text user input | extracts plain text user input | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | summarizes non-text inputs for mirrored local prompts | summarizes non-text inputs for mirrored local prompts | Yes/Partial |
| `test/bridge/bridge-adapters.test.ts` | lists the latest saved threads for the current working directory | lists the latest saved threads for the current working directory | Yes/Partial |
| `test/bridge/bridge-controller.test.ts` | does not clear legacy adapter endpoints that are managed by the adapter itself | does not clear legacy adapter endpoints that are managed by the adapter itself | Yes/Partial |
| `test/bridge/bridge-controller.test.ts` | rewrites provider endpoints when the endpoint file was removed | rewrites provider endpoints when the endpoint file was removed | Yes/Partial |
| `test/bridge/bridge-final-reply.test.ts` | sends long visible replies as bounded WeChat text chunks | sends long visible replies as bounded WeChat text chunks | Yes/Partial |
| `test/bridge/bridge-final-reply.test.ts` | stops final reply forwarding after the visible text send fails | stops final reply forwarding after the visible text send fails | Yes/Partial |
| `test/bridge/bridge-final-reply.test.ts` | sends stripped text before attachments in listed order | sends stripped text before attachments in listed order | Yes/Partial |
| `test/bridge/bridge-final-reply.test.ts` | continues after attachment failures and reports the error in text | continues after attachment failures and reports the error in text | Yes/Partial |
| `test/bridge/bridge-final-reply.test.ts` | auto-sends inline local text files as file attachments | auto-sends inline local text files as file attachments | Yes/Partial |
| `test/bridge/bridge-final-reply.test.ts` | keeps source code paths in text instead of auto-sending them as files | keeps source code paths in text instead of auto-sending them as files | Yes/Partial |
| `test/bridge/bridge-final-reply.test.ts` | keeps OpenCode answers when inline reasoning shares the same line | keeps OpenCode answers when inline reasoning shares the same line | No unless shared utility behavior |
| `test/bridge/bridge-final-reply.test.ts` | sends an OpenCode diagnostic when reasoning cleanup leaves no visible reply | sends an OpenCode diagnostic when reasoning cleanup leaves no visible reply | No unless shared utility behavior |
| `test/bridge/bridge-final-reply.test.ts` | sanitizes noisy OpenCode final replies before sending to WeChat | sanitizes noisy OpenCode final replies before sending to WeChat | No unless shared utility behavior |
| `test/bridge/bridge-process-reaper.test.ts` | detects wechat-bridge command lines | detects wechat-bridge command lines | Yes/Partial |
| `test/bridge/bridge-process-reaper.test.ts` | detects wechat-daemon command lines | detects wechat-daemon command lines | Yes/Partial |
| `test/bridge/bridge-process-reaper.test.ts` | matches wechat-daemon command lines for a startup cwd | matches wechat-daemon command lines for a startup cwd | Yes/Partial |
| `test/bridge/bridge-process-reaper.test.ts` | detects opencode serve command lines | detects opencode serve command lines | No unless shared utility behavior |
| `test/bridge/bridge-process-reaper.test.ts` | detects opencode attach command lines | detects opencode attach command lines | No unless shared utility behavior |
| `test/bridge/bridge-process-reaper.test.ts` | parses Windows process probe output and filters non-bridge rows | parses Windows process probe output and filters non-bridge rows | Yes/Partial |
| `test/bridge/bridge-process-reaper.test.ts` | parses POSIX process probe output and ignores the current pid | parses POSIX process probe output and ignores the current pid | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | restores shared sessions only for the same adapter and workspace | restores shared sessions only for the same adapter and workspace | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | normalizeBridgeLockPayload defaults old lock files to persistent lifecycle | normalizeBridgeLockPayload defaults old lock files to persistent lifecycle | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | normalizeBridgeLockPayload accepts opencode locks | normalizeBridgeLockPayload accepts opencode locks | No unless shared utility behavior |
| `test/bridge/bridge-state.test.ts` | shouldAutoReclaimBridgeLock reclaims companion-bound locks when the parent is gone | shouldAutoReclaimBridgeLock reclaims companion-bound locks when the parent is gone | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | shouldAutoReclaimBridgeLock reclaims legacy codex locks when the parent is gone | shouldAutoReclaimBridgeLock reclaims legacy codex locks when the parent is gone | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | shouldAutoReclaimBridgeLock keeps persistent locks even when the parent is gone | shouldAutoReclaimBridgeLock keeps persistent locks even when the parent is gone | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | shouldAutoReclaimBridgeLock keeps companion-bound locks while the parent is still alive | shouldAutoReclaimBridgeLock keeps companion-bound locks while the parent is still alive | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | evaluateBridgeRuntimeOwnership yields to a newer workspace instance | evaluateBridgeRuntimeOwnership yields to a newer workspace instance | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | evaluateBridgeRuntimeOwnership keeps the current live lock owner active | evaluateBridgeRuntimeOwnership keeps the current live lock owner active | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | evaluateBridgeRuntimeOwnership rehydrates a missing lock for the current instance | evaluateBridgeRuntimeOwnership rehydrates a missing lock for the current instance | Yes/Partial |
| `test/bridge/bridge-state.test.ts` | evaluateBridgeRuntimeOwnership yields to a different live lock owner | evaluateBridgeRuntimeOwnership yields to a different live lock owner | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | keeps short text as a single chunk | keeps short text as a single chunk | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | splits long text into bounded chunks preferring newline boundaries | splits long text into bounded chunks preferring newline boundaries | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | hard-splits text without newlines | hard-splits text without newlines | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | parses supported control commands | parses supported control commands | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | returns null for unsupported input | returns null for unsupported input | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | adds Claude-only approval shortcuts while keeping slash commands intact | adds Claude-only approval shortcuts while keeping slash commands intact | No unless shared utility behavior |
| `test/bridge/bridge-utils.test.ts` | does not reinterpret bare approval words without pending approvals | does not reinterpret bare approval words without pending approvals | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | bare approval words work for all adapters when pending | bare approval words work for all adapters when pending | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | creates uppercase confirmation codes | creates uppercase confirmation codes | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | flags destructive commands | flags destructive commands | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | allows low-risk commands | allows low-risk commands | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | rejects common interactive entry commands | rejects common interactive entry commands | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | allows non-interactive scripts and one-shot shell commands | allows non-interactive scripts and one-shot shell commands | No unless shared utility behavior |
| `test/bridge/bridge-utils.test.ts` | recognizes common yes/no prompts | recognizes common yes/no prompts | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | returns null for ordinary output | returns null for ordinary output | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | injects attachment guidance for explicit send-to-WeChat requests | injects attachment guidance for explicit send-to-WeChat requests | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | tells agents to reference source paths instead of staging outbound files | tells agents to reference source paths instead of staging outbound files | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | detects outbound attachment staging writes without blocking read-only commands | detects outbound attachment staging writes without blocking read-only commands | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | injects attachment guidance for short follow-up send commands | injects attachment guidance for short follow-up send commands | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | injects attachment guidance for common Chinese send-file phrasing | injects attachment guidance for common Chinese send-file phrasing | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | skips prompt injection for ordinary non-send requests and existing protocol blocks | skips prompt injection for ordinary non-send requests and existing protocol blocks | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | adds saved inbound attachment paths to the prompt | adds saved inbound attachment paths to the prompt | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | creates a usable prompt for attachment-only messages | creates a usable prompt for attachment-only messages | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | extracts final-answer agent messages from the Codex session log | extracts final-answer agent messages from the Codex session log | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | ignores unrelated JSONL entries | ignores unrelated JSONL entries | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | extracts trailing attachment blocks with multiple local paths | extracts trailing attachment blocks with multiple local paths | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | rejects malformed attachment metadata and leaves the text unchanged | rejects malformed attachment metadata and leaves the text unchanged | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | extracts local files from wrapped maas image URLs when no attachment block is present | extracts local files from wrapped maas image URLs when no attachment block is present | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | extracts inline code paths and keeps the surrounding narration | extracts inline code paths and keeps the surrounding narration | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | keeps multi-dot document names intact when extracting inline attachments | keeps multi-dot document names intact when extracting inline attachments | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | extracts ordinary local text files from inline paths | extracts ordinary local text files from inline paths | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | extracts standalone absolute paths from code fences | extracts standalone absolute paths from code fences | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | does not auto-attach source code paths from ordinary text | does not auto-attach source code paths from ordinary text | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | extracts home-relative desktop paths from ordinary text | extracts home-relative desktop paths from ordinary text | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | keeps explicit attachment blocks authoritative for arbitrary file types | keeps explicit attachment blocks authoritative for arbitrary file types | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | accepts home-relative desktop paths inside attachment blocks | accepts home-relative desktop paths inside attachment blocks | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | flushes by size and keeps a recent summary | flushes by size and keeps a recent summary | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | drops messages older than bridge startup watermark | drops messages older than bridge startup watermark | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | includes shared-thread diagnostics for codex sessions | includes shared-thread diagnostics for codex sessions | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | formats local thread-follow notices for WeChat | formats local thread-follow notices for WeChat | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | formats startup restore notices | formats startup restore notices | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | formats local session fallback notices | formats local session fallback notices | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | renders a numbered list and marks the current thread | renders a numbered list and marks the current thread | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | renders Claude sessions with session wording | renders Claude sessions with session wording | No unless shared utility behavior |
| `test/bridge/bridge-utils.test.ts` | formats mirrored Claude input without Codex wording | formats mirrored Claude input without Codex wording | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | formats final reply and failure messages by adapter | formats final reply and failure messages by adapter | Yes/Partial |
| `test/bridge/bridge-utils.test.ts` | formats Claude approval prompts without a required code | formats Claude approval prompts without a required code | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | parses JSON hook payloads | parses JSON hook payloads | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | returns null for invalid payloads | returns null for invalid payloads | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | registers the expected hook events | registers the expected hook events | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | preserves stdout on Windows so Claude can read remote approval decisions | preserves stdout on Windows so Claude can read remote approval decisions | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | switches Windows batch parsing to UTF-8 before lines that embed paths | switches Windows batch parsing to UTF-8 before lines that embed paths | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | preserves stdout on POSIX so Claude can read remote approval decisions | preserves stdout on POSIX so Claude can read remote approval decisions | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | runs compiled hook entries without TypeScript stripping | runs compiled hook entries without TypeScript stripping | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | formats Bash permission requests | formats Bash permission requests | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | summarizes ExitPlanMode plans instead of dumping raw JSON | summarizes ExitPlanMode plans instead of dumping raw JSON | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | builds an allow decision for remote confirmation | builds an allow decision for remote confirmation | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | builds a deny decision for remote rejection | builds a deny decision for remote rejection | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | uses a custom deny message when provided | uses a custom deny message when provided | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | denies file mutation tools targeting legacy WeChat outbound directories | denies file mutation tools targeting legacy WeChat outbound directories | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | denies write-like Bash commands targeting outbound directories | denies write-like Bash commands targeting outbound directories | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | allows source file references and non-mutating commands | allows source file references and non-mutating commands | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | forwards everything to WeChat when strict approval mode is enabled | forwards everything to WeChat when strict approval mode is enabled | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | auto-approves low-risk Claude Bash searches and listings | auto-approves low-risk Claude Bash searches and listings | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | auto-approves low-risk Claude read tools | auto-approves low-risk Claude read tools | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | keeps high-risk and mutating Claude requests on the approval path | keeps high-risk and mutating Claude requests on the approval path | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | extracts the resume conversation id from a transcript path | extracts the resume conversation id from a transcript path | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | returns null when the transcript path is missing or malformed | returns null when the transcript path is missing or malformed | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | normalizes final replies | normalizes final replies | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | returns the placeholder when the hook omits the final reply | returns the placeholder when the hook omits the final reply | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | returns an empty string when the hook omits the final reply | returns an empty string when the hook omits the final reply | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | extracts the last end-turn assistant text from a Claude transcript | extracts the last end-turn assistant text from a Claude transcript | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | prefers rendered error text when present | prefers rendered error text when present | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | matches recent injected prompts | matches recent injected prompts | No unless shared utility behavior |
| `test/bridge/claude-hooks.test.ts` | ignores stale prompts | ignores stale prompts | No unless shared utility behavior |
| `test/bridge/wechat-bridge.test.ts` | parseCliArgs keeps persistent lifecycle by default | parseCliArgs keeps persistent lifecycle by default | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | parseCliArgs accepts --lifecycle companion_bound | parseCliArgs accepts --lifecycle companion_bound | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | parseCliArgs accepts internal new session startup mode | parseCliArgs accepts internal new session startup mode | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | shouldWatchParentProcess watches attached terminal bridges | shouldWatchParentProcess watches attached terminal bridges | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | shouldWatchParentProcess watches detached companion-bound bridges | shouldWatchParentProcess watches detached companion-bound bridges | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | shouldWatchParentProcess ignores detached persistent bridges | shouldWatchParentProcess ignores detached persistent bridges | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | formatUserFacingBridgeFatalError trims verbose app-server log details | formatUserFacingBridgeFatalError trims verbose app-server log details | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | formatWechatSendFailureLogEntry includes the failed context and recipient | formatWechatSendFailureLogEntry includes the failed context and recipient | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | formats stale WeChat context token failures separately | formats stale WeChat context token failures separately | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | does not retry stale WeChat context token send failures | does not retry stale WeChat context token send failures | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | formats opencode companion disconnects as a cleaner user-facing message | formats opencode companion disconnects as a cleaner user-facing message | No unless shared utility behavior |
| `test/bridge/wechat-bridge.test.ts` | keeps generic inbound bridge errors for other adapters | keeps generic inbound bridge errors for other adapters | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | suppresses noisy OpenCode bridge events from WeChat replies | suppresses noisy OpenCode bridge events from WeChat replies | No unless shared utility behavior |
| `test/bridge/wechat-bridge.test.ts` | keeps non-OpenCode adapters forwarding bridge events | keeps non-OpenCode adapters forwarding bridge events | No unless shared utility behavior |
| `test/bridge/wechat-bridge.test.ts` | defers inbound WeChat text when Codex is busy with a local turn | defers inbound WeChat text when Codex is busy with a local turn | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | does not defer Codex inbound text for WeChat-owned busy turns or commands | does not defer Codex inbound text for WeChat-owned busy turns or commands | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | does not defer non-Codex adapters | does not defer non-Codex adapters | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | only drains the deferred Codex queue when the bridge is truly idle | only drains the deferred Codex queue when the bridge is truly idle | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | formats the deferred Codex queue confirmation for WeChat | formats the deferred Codex queue confirmation for WeChat | Yes/Partial |
| `test/bridge/wechat-bridge.test.ts` | retries deferred Codex drain failures only for transient local-busy conditions | retries deferred Codex drain failures only for transient local-busy conditions | Yes/Partial |
| `test/companion/codex-remote-client.test.ts` | parseCliArgs forwards unknown arguments to codex | parseCliArgs forwards unknown arguments to codex | Yes/Partial |
| `test/companion/codex-remote-client.test.ts` | buildRemoteCodexClientArgs targets the bridge-owned app-server | buildRemoteCodexClientArgs targets the bridge-owned app-server | Yes/Partial |
| `test/companion/codex-remote-client.test.ts` | buildRemoteCodexClientArgs appends forwarded codex args after bridge args | buildRemoteCodexClientArgs appends forwarded codex args after bridge args | Yes/Partial |
| `test/companion/codex-remote-client.test.ts` | buildRemoteCodexClientArgs rejects bridge-owned remote options | buildRemoteCodexClientArgs rejects bridge-owned remote options | Yes/Partial |
| `test/companion/codex-remote-client.test.ts` | buildRemoteCodexClientEnv injects the bridge token into the configured env var | buildRemoteCodexClientEnv injects the bridge token into the configured env var | Yes/Partial |
| `test/companion/local-companion-link.test.ts` | stores separate adapter endpoints for the same workspace | stores separate adapter endpoints for the same workspace | Yes/Partial |
| `test/companion/local-companion-link.test.ts` | clears only the requested adapter endpoint when adapter is provided | clears only the requested adapter endpoint when adapter is provided | Yes/Partial |
| `test/companion/local-companion-link.test.ts` | readLocalCompanionEndpoint preserves visible client occupancy metadata | readLocalCompanionEndpoint preserves visible client occupancy metadata | Yes/Partial |
| `test/companion/local-companion-link.test.ts` | clearLocalCompanionOccupancy removes only visible client and health metadata | clearLocalCompanionOccupancy removes only visible client and health metadata | Yes/Partial |
| `test/companion/local-companion-link.test.ts` | updateLocalCompanionOccupancy stores visible client metadata | updateLocalCompanionOccupancy stores visible client metadata | Yes/Partial |
| `test/companion/local-companion-link.test.ts` | updateLocalCompanionHealth stores the latest visible worker status | updateLocalCompanionHealth stores the latest visible worker status | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | parseCliArgs uses current working directory by default | parseCliArgs uses current working directory by default | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | parseCliArgs parses adapter, cwd, profile, timeout, and forwarded args | parseCliArgs parses adapter, cwd, profile, timeout, and forwarded args | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | buildBackgroundBridgeArgs binds codex background bridge to the launcher lifetime | buildBackgroundBridgeArgs binds codex background bridge to the launcher lifetime | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | buildBackgroundBridgeArgs can launch claude in the background | buildBackgroundBridgeArgs can launch claude in the background | No unless shared utility behavior |
| `test/companion/local-companion-start.test.ts` | buildBackgroundBridgeArgs keeps the OpenCode bridge companion_bound | buildBackgroundBridgeArgs keeps the OpenCode bridge companion_bound | No unless shared utility behavior |
| `test/companion/local-companion-start.test.ts` | buildBackgroundBridgeArgs runs compiled bridge entries without TypeScript stripping | buildBackgroundBridgeArgs runs compiled bridge entries without TypeScript stripping | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | runVisibleClient routes codex through the in-process remote client | runVisibleClient routes codex through the in-process remote client | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | starter checks WeChat credentials in the foreground before opening the client | starter checks WeChat credentials in the foreground before opening the client | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | tryDelegateToDaemon asks a live same-cwd daemon to ensure the requested slot | tryDelegateToDaemon asks a live same-cwd daemon to ensure the requested slot | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | tryDelegateToDaemon rejects daemon cwd mismatches | tryDelegateToDaemon rejects daemon cwd mismatches | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | tryDelegateToDaemon clears stale daemon endpoint and falls back | tryDelegateToDaemon clears stale daemon endpoint and falls back | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | runVisibleClient routes OpenCode through the shared in-process companion | runVisibleClient routes OpenCode through the shared in-process companion | No unless shared utility behavior |
| `test/companion/local-companion-start.test.ts` | runVisibleClient keeps adapter forwarding for local companions | runVisibleClient keeps adapter forwarding for local companions | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | buildBackgroundBridgeArgs keeps the launch cwd stable for codex | buildBackgroundBridgeArgs keeps the launch cwd stable for codex | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | normalizeComparablePath is stable for the same logical cwd | normalizeComparablePath is stable for the same logical cwd | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | isSameWorkspaceCwd matches equivalent directory paths | isSameWorkspaceCwd matches equivalent directory paths | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | same workspace with live visible client is already active | same workspace with live visible client is already active | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | same workspace reopens visible client when bridge is alive but client is gone | same workspace reopens visible client when bridge is alive but client is gone | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | same workspace with no reachable endpoint requests auto-heal restart | same workspace with no reachable endpoint requests auto-heal restart | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | different workspace requests an explicit switch | different workspace requests an explicit switch | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | reclaimable lock starts a replacement bridge | reclaimable lock starts a replacement bridge | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | same workspace with stopped visible worker requests auto-heal restart | same workspace with stopped visible worker requests auto-heal restart | Yes/Partial |
| `test/companion/local-companion-start.test.ts` | same workspace start request replaces Claude when a fresh session is requested | same workspace start request replaces Claude when a fresh session is requested | No unless shared utility behavior |
| `test/companion/local-companion.test.ts` | reconnects only for unexpected bridge disconnects | reconnects only for unexpected bridge disconnects | Yes/Partial |
| `test/companion/local-companion.test.ts` | keeps reconnect retries short for the grace window loop | keeps reconnect retries short for the grace window loop | Yes/Partial |
| `test/companion/opencode-entrypoints.test.ts` | wechat-opencode launches the shared local companion in opencode mode | wechat-opencode launches the shared local companion in opencode mode | No unless shared utility behavior |
| `test/companion/opencode-entrypoints.test.ts` | wechat-bridge-opencode stays a bridge-only entrypoint | wechat-bridge-opencode stays a bridge-only entrypoint | No unless shared utility behavior |
| `test/companion/opencode-entrypoints.test.ts` | wechat-opencode-start keeps the bridge bootstrap flow | wechat-opencode-start keeps the bridge bootstrap flow | No unless shared utility behavior |
| `test/companion/opencode-entrypoints.test.ts` | package scripts route opencode through the shared companion launcher | package scripts route opencode through the shared companion launcher | No unless shared utility behavior |
| `test/daemon/wechat-daemon.test.ts` | parseDaemonSwitchCommand recognizes terminal switch commands | parseDaemonSwitchCommand recognizes terminal switch commands | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | parseDaemonCliArgs binds daemon to cwd and optional initial adapter | parseDaemonCliArgs binds daemon to cwd and optional initial adapter | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | buildVisibleClientLaunchArgs routes codex through the remote client | buildVisibleClientLaunchArgs routes codex through the remote client | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | buildVisibleClientLaunchArgs routes Claude and OpenCode through local companion | buildVisibleClientLaunchArgs routes Claude and OpenCode through local companion | No unless shared utility behavior |
| `test/daemon/wechat-daemon.test.ts` | buildVisibleClientLaunchArgs can request a fresh local companion session | buildVisibleClientLaunchArgs can request a fresh local companion session | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | defaultDaemonSessionStartMode starts Claude and OpenCode fresh | defaultDaemonSessionStartMode starts Claude and OpenCode fresh | No unless shared utility behavior |
| `test/daemon/wechat-daemon.test.ts` | resolveDaemonSessionStartMode avoids restoring stale OpenCode sessions | resolveDaemonSessionStartMode avoids restoring stale OpenCode sessions | No unless shared utility behavior |
| `test/daemon/wechat-daemon.test.ts` | buildWindowsVisibleClientLaunchCommand opens a titled console window | buildWindowsVisibleClientLaunchCommand opens a titled console window | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | formatDaemonStatus lists active adapter and all daemon slots | formatDaemonStatus lists active adapter and all daemon slots | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | formatDaemonSwitchResultDetail reports automatic visible CLI outcomes | formatDaemonSwitchResultDetail reports automatic visible CLI outcomes | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | waitForVisibleClientConnection resolves when the visible companion appears | waitForVisibleClientConnection resolves when the visible companion appears | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | waitForVisibleClientConnection returns false on timeout | waitForVisibleClientConnection returns false on timeout | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupDaemonBeforeStart returns none when no daemon endpoint exists | cleanupDaemonBeforeStart returns none when no daemon endpoint exists | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupDaemonBeforeStart stops same-cwd daemon peers when no endpoint exists | cleanupDaemonBeforeStart stops same-cwd daemon peers when no endpoint exists | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupDaemonBeforeStart clears stale daemon endpoint and workspace endpoints | cleanupDaemonBeforeStart clears stale daemon endpoint and workspace endpoints | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupDaemonBeforeStart gracefully stops a live daemon before startup | cleanupDaemonBeforeStart gracefully stops a live daemon before startup | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupDaemonBeforeStart force-stops daemon endpoints that do not answer IPC | cleanupDaemonBeforeStart force-stops daemon endpoints that do not answer IPC | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupDaemonBeforeStart does not force-stop unverified reused pids | cleanupDaemonBeforeStart does not force-stop unverified reused pids | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupSingleBridgeBeforeDaemon returns none when no lock exists | cleanupSingleBridgeBeforeDaemon returns none when no lock exists | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupSingleBridgeBeforeDaemon clears stale locks and endpoints | cleanupSingleBridgeBeforeDaemon clears stale locks and endpoints | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupSingleBridgeBeforeDaemon stops a live single bridge before daemon startup | cleanupSingleBridgeBeforeDaemon stops a live single bridge before daemon startup | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | cleanupSingleBridgeBeforeDaemon force-stops bridges that ignore SIGTERM | cleanupSingleBridgeBeforeDaemon force-stops bridges that ignore SIGTERM | Yes/Partial |
| `test/daemon/wechat-daemon.test.ts` | package exposes the daemon binary and npm script | package exposes the daemon binary and npm script | Yes/Partial |
| `test/utils/doctor.test.ts` | parseDoctorCliArgs reads injected adapter and cwd | parseDoctorCliArgs reads injected adapter and cwd | Yes/Partial |
| `test/utils/doctor.test.ts` | reports clean runtime state in default Chinese locale | reports clean runtime state in default Chinese locale | Yes/Partial |
| `test/utils/doctor.test.ts` | reports live daemon as a standalone bridge startup blocker | reports live daemon as a standalone bridge startup blocker | Yes/Partial |
| `test/utils/doctor.test.ts` | classifies stale and reclaimable bridge locks | classifies stale and reclaimable bridge locks | Yes/Partial |
| `test/utils/doctor.test.ts` | reports live bridge lock conflict for standalone bridge | reports live bridge lock conflict for standalone bridge | Yes/Partial |
| `test/utils/doctor.test.ts` | reports endpoint reachability and ownership problems | reports endpoint reachability and ownership problems | Yes/Partial |
| `test/utils/doctor.test.ts` | reports daemon startup will stop a live single bridge | reports daemon startup will stop a live single bridge | Yes/Partial |
| `test/utils/doctor.test.ts` | daemon doctor keeps all adapter CLI checks | daemon doctor keeps all adapter CLI checks | Yes/Partial |
| `test/utils/doctor.test.ts` | shell bridge doctor skips Codex, Claude, and OpenCode CLI checks | shell bridge doctor skips Codex, Claude, and OpenCode CLI checks | Yes/Partial |
| `test/utils/doctor.test.ts` | English locale uses English-only doctor labels | English locale uses English-only doctor labels | Yes/Partial |
| `test/utils/doctor.test.ts` | warns when the console code page is non-UTF8 and the data dir has non-ASCII characters | warns when the console code page is non-UTF8 and the data dir has non-ASCII characters | Yes/Partial |
| `test/utils/doctor.test.ts` | warns on large clock skew against the server date | warns on large clock skew against the server date | Yes/Partial |
| `test/utils/doctor.test.ts` | suggests NODE_USE_ENV_PROXY when the server is unreachable behind a proxy | suggests NODE_USE_ENV_PROXY when the server is unreachable behind a proxy | Yes/Partial |
| `test/utils/version-checker.test.ts` | 提取纯数字版本号 | 提取纯数字版本号 | Yes/Partial |
| `test/utils/version-checker.test.ts` | 兼容 v 前缀 | 兼容 v 前缀 | Yes/Partial |
| `test/utils/version-checker.test.ts` | trim 后提取 | trim 后提取 | Yes/Partial |
| `test/utils/version-checker.test.ts` | 从预发布标识中提取主版本号 | 从预发布标识中提取主版本号 | Yes/Partial |
| `test/utils/version-checker.test.ts` | 无版本号返回 null | 无版本号返回 null | Yes/Partial |
| `test/utils/version-checker.test.ts` | 非字符串返回 null | 非字符串返回 null | Yes/Partial |
| `test/utils/version-checker.test.ts` | 大于返回正数 | 大于返回正数 | Yes/Partial |
| `test/utils/version-checker.test.ts` | 小于返回负数 | 小于返回负数 | Yes/Partial |
| `test/utils/version-checker.test.ts` | 相等返回 0 | 相等返回 0 | Yes/Partial |
| `test/utils/version-checker.test.ts` | 主版本号差异优先 | 主版本号差异优先 | Yes/Partial |
| `test/utils/version-checker.test.ts` | npm 命中时直接返回 npm 版本,且不回退 GitHub | npm 命中时直接返回 npm 版本,且不回退 GitHub | Yes/Partial |
| `test/utils/version-checker.test.ts` | npm 失败时回退 GitHub tags 并取最高版本 | npm 失败时回退 GitHub tags 并取最高版本 | Yes/Partial |
| `test/utils/version-checker.test.ts` | GitHub tags 含 v 前缀也能正确解析 | GitHub tags 含 v 前缀也能正确解析 | Yes/Partial |
| `test/utils/version-checker.test.ts` | npm 返回的 version 字段无效时回退 GitHub | npm 返回的 version 字段无效时回退 GitHub | Yes/Partial |
| `test/utils/version-checker.test.ts` | 两个源都失败时返回 null | 两个源都失败时返回 null | Yes/Partial |
| `test/utils/version-checker.test.ts` | 请求超时返回 null 且不挂起 | 请求超时返回 null 且不挂起 | Yes/Partial |
| `test/wechat/channel-config.test.ts` | normalizes a workspace path to an absolute path | normalizes a workspace path to an absolute path | Yes/Partial |
| `test/wechat/channel-config.test.ts` | builds a stable workspace key for the same cwd | builds a stable workspace key for the same cwd | Yes/Partial |
| `test/wechat/channel-config.test.ts` | builds different workspace paths for different cwd values | builds different workspace paths for different cwd values | Yes/Partial |
| `test/wechat/channel-config.test.ts` | uses .cli-bridge as the default user data directory | uses .cli-bridge as the default user data directory | Yes/Partial |
| `test/wechat/channel-config.test.ts` | uses the new data-dir env var when provided | uses the new data-dir env var when provided | Yes/Partial |
| `test/wechat/channel-config.test.ts` | does not use the legacy Claude data-dir env var as the active directory | does not use the legacy Claude data-dir env var as the active directory | No unless shared utility behavior |
| `test/wechat/channel-config.test.ts` | copies legacy data into an empty active data directory | copies legacy data into an empty active data directory | Yes/Partial |
| `test/wechat/channel-config.test.ts` | does not overwrite existing active files or directories | does not overwrite existing active files or directories | Yes/Partial |
| `test/wechat/channel-config.test.ts` | uses the first legacy source that has migratable data | uses the first legacy source that has migratable data | Yes/Partial |
| `test/wechat/setup.test.ts` | requires login when no credentials have been saved | requires login when no credentials have been saved | Yes/Partial |
| `test/wechat/setup.test.ts` | accepts complete credentials for bridge startup | accepts complete credentials for bridge startup | Yes/Partial |
| `test/wechat/setup.test.ts` | requires login when bridge credentials cannot identify the owner | requires login when bridge credentials cannot identify the owner | Yes/Partial |
| `test/wechat/setup.test.ts` | detects expired saved credentials during startup validation | detects expired saved credentials during startup validation | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | uses the default per-media upload limits | uses the default per-media upload limits | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | allows env overrides and ignores invalid values | allows env overrides and ignores invalid values | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | throws a clear error when a file exceeds the configured limit | throws a clear error when a file exceeds the configured limit | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | formats byte sizes consistently | formats byte sizes consistently | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | uses separate inbound download limits | uses separate inbound download limits | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | classifies transient fetch failures as retryable network errors | classifies transient fetch failures as retryable network errors | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | treats HTTP 503 as retryable and HTTP 401 as fatal auth | treats HTTP 503 as retryable and HTTP 401 as fatal auth | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | treats WeChat session timeout as fatal auth instead of retryable network | treats WeChat session timeout as fatal auth instead of retryable network | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | detects expired WeChat sync sessions from app-level responses | detects expired WeChat sync sessions from app-level responses | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | throws on app-level sendmessage failures even when HTTP succeeded | throws on app-level sendmessage failures even when HTTP succeeded | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | classifies sendmessage ret=-2 as stale WeChat context | classifies sendmessage ret=-2 as stale WeChat context | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | does not classify other app-level failures as stale WeChat context | does not classify other app-level failures as stale WeChat context | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | claims each inbound message key only once across processes | claims each inbound message key only once across processes | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | reclaims stale inbound message claims after the TTL expires | reclaims stale inbound message claims after the TTL expires | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | extracts image and file descriptors without requiring text | extracts image and file descriptors without requiring text | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | adds an explicit note when media metadata is missing | adds an explicit note when media metadata is missing | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | builds CDN download URLs from encrypted query params | builds CDN download URLs from encrypted query params | Yes/Partial |
| `test/wechat/wechat-transport.test.ts` | decodes inbound AES keys and decrypts media payloads | decodes inbound AES keys and decrypts media payloads | Yes/Partial |
