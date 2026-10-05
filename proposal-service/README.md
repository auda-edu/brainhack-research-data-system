# Local synthetic proposal API

No dependency installation, credential or account is required. Node 22+:

```powershell
$env:LABHIPPO_DEMO_ONLY = '1'
$env:LABHIPPO_DEMO_IDENTITY = 'reviewer-alpha'
node proposal-service/server.mjs
```

Open `http://127.0.0.1:8789/#proposal-demo`. Default startup identity is the
more limited `writer-alpha`; choose a configured reviewer fixture above for the
complete author/review walkthrough. `LABHIPPO_DEMO_PORT` optionally selects a
1024–65535 port. The CLI requires the explicit flag, binds to 127.0.0.1 only and
never reads Capture/GitHub credentials. No durable store or public deployment is
created. Restart loses objects, history and retry keys.

The page initially uses browser memory with **no demo API probe**. Click **Use
loopback demo API** to switch explicitly. The server selects the fixture identity
at startup; the UI then disables its simulated identity selector. Request role,
user and principal headers never grant permissions. The private Capture client
is disabled on this server; existing standalone Capture submission is unchanged.
To try another server identity, restart the process; state resets.

| Route | Behavior |
| --- | --- |
| GET `/demo-api/v1/status` | Version/demo marker, fixed fixture, memory-only status and per-process CSRF nonce |
| GET `/demo-api/v1/proposals/<encoded ID>` | Full fictional proposal if fixed fixture can access it; denied/unknown returns 404 |
| POST `/demo-api/v1/commands` | Shared strict v1 command with revision precondition and actor-scoped retry key |
| GET `/demo-api/v1/explore` | Allowlisted approved fictional snapshots only |

Writes require the exact page Origin, `application/json` and the status nonce in
`X-Labhippo-Demo-CSRF`; requests exceeding 320 KiB reject. Strict Host and remote
loopback checks, query rejection, no CORS, no-store and nosniff apply. No headers
are credential substitutes; the nonce guards browser origin, not identity.
Unknown routes/versions fail closed. Static files use the existing explicit
Capture allowlist; no server sources, secrets or arbitrary local paths are served.

For the browser-memory walkthrough: load the invented Capture example; Propose;
try Apply decision as Writer (denied); switch simulated identity to Reviewer;
publish; change the Markdown title and Save revision; inspect the retained
approved snapshot; apply a new decision; search Service Explore. Retry last
command creates no additional revision. A stale-write rejection preserves editor
text; Read current proposal refreshes the revision without replacing that text.

The immutable public preview uses only the browser-memory adapter and never
contacts localhost or a private API. Demo routes are excluded from the PWA cache.
Offline static support needs all assets on one origin; the existing mirror's PNG
redirect remains a hosting limitation. See [contracts](../contracts/README.md).
