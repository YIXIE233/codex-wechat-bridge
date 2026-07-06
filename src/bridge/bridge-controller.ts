import type { CodexRuntime } from "./bridge-types.ts";
import {
  clearLocalClientEndpoint,
  readLocalClientEndpoint,
  writeLocalClientEndpoint,
} from "../codex/local-client-link.ts";
import { hasLocalClientEndpointProvider } from "../codex/runtime-types.ts";

export class BridgeController {
  private endpointInstanceId: string | null = null;
  private readonly runtime: CodexRuntime;
  private readonly cwd: string;

  constructor(runtime: CodexRuntime, cwd: string) {
    this.runtime = runtime;
    this.cwd = cwd;
  }

  syncLocalClientEndpoint(): void {
    if (!hasLocalClientEndpointProvider(this.runtime)) {
      return;
    }

    const endpoint = this.runtime.getLocalClientEndpoint();
    if (!endpoint) {
      this.clearLocalClientEndpoint();
      return;
    }

    const existing = readLocalClientEndpoint(this.cwd);
    const runtimeState = this.runtime.getState();
    const nextEndpoint =
      existing?.instanceId === endpoint.instanceId
        ? {
            ...endpoint,
            companionPid: endpoint.companionPid ?? existing.companionPid,
            companionConnectedAt:
              endpoint.companionConnectedAt ?? existing.companionConnectedAt,
            companionStatus: runtimeState.status,
            companionLastStateAt: new Date().toISOString(),
            companionWorkerPid: runtimeState.pid,
          }
        : {
            ...endpoint,
            companionStatus: runtimeState.status,
            companionLastStateAt: new Date().toISOString(),
            companionWorkerPid: runtimeState.pid,
          };

    this.endpointInstanceId = endpoint.instanceId;
    writeLocalClientEndpoint(nextEndpoint);
  }

  clearLocalClientEndpoint(): void {
    clearLocalClientEndpoint(this.cwd, this.endpointInstanceId ?? undefined);
    this.endpointInstanceId = null;
  }
}
