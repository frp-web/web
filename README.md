# FRP Web UI

A web UI for the [FRP](https://github.com/fatedier/frp).

## Local Development

1. Copy `.env.example` to `.env.local` and adjust ports or bridge settings if needed.
2. Create `.frp-web/config` and `.frp-web/data` directories (e.g., `mkdir -p .frp-web/{config,data}` on Unix or `New-Item -ItemType Directory -Force .frp-web\config` in PowerShell) so the bridge has a local workspace (already ignored by git).
3. Start the dev server with `pnpm dev`; the backend bridge automatically uses `.frp-web` unless `FRP_BRIDGE_WORKDIR` is set.

The Docker runtime can keep using its own `/config` and `/data` mounts by providing `FRP_BRIDGE_WORKDIR` explicitly, without touching `.frp-web`.
