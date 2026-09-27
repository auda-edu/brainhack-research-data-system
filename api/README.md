# Local record-read API prototype

This is a **local development prototype** with invented records. It does not read
`audachang/labhippo-records`, GitHub, browser storage, or any real lab data.
The GitHub Pages framework does not call it. There is no production API deployment.

## Run and test

Node.js 22 or later is recommended. No packages or secrets are needed.

```powershell
node --test api/api.test.mjs
$env:LABHIPPO_DEV_ONLY = '1'
node api/server.mjs
```

The server listens only on `127.0.0.1:8787`. The CLI refuses to start unless
`LABHIPPO_DEV_ONLY=1` is set. Stop it with Ctrl+C.

## Contract

- `GET /api/v1/records?page=1&pageSize=20` returns `{ data, pagination }`.
  `pageSize` is limited to 100.
- `GET /api/v1/records/<id>` returns `{ data }` or a 404. A 404 also hides
  whether a record exists but is inaccessible.
- Errors use `{ "error": { "code": "...", "message": "..." } }`.
- The prototype is read-only. Responses are not cached and no cross-origin
  browser access is enabled.

`canRead(principal, record)` is the central policy. Only `review: "approved"`
records are readable. Approved `public` records are visible to anyone;
approved `lab` records require a server-established identity in the same lab;
approved `restricted` records also require that identity in `readers`.
Unrecognized access/review values are denied. List and detail endpoints both
apply the same rule. Query parameters, browser roles, and headers cannot select
the development identity.

## Production gate

Before this API can serve private records, add a production server with verified
sign-in, a server-managed session, and an identity-to-lab membership source.
Validate the record schema and approval state against the repository, and
return an allowlisted public field set rather than an entire source record.
Review the access rules with the lab; test revocation and cross-lab denial; keep any
GitHub App credentials only on the server. A deployed API must fail closed when
identity or authorization configuration is missing. Never point this development
entry point at private records or publish it as a public service.
