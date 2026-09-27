import { createApiServer } from "./http.mjs";
import { syntheticRecords, developmentPrincipal } from "./fixtures.mjs";

// No deployed API mode exists yet. This entry point only serves invented data
// on loopback and refuses to start unless development mode is explicit.
if (process.env.LABHIPPO_DEV_ONLY !== "1") {
  console.error("Set LABHIPPO_DEV_ONLY=1 to run the local synthetic-data API.");
  process.exitCode = 1;
} else {
  const port = process.env.LABHIPPO_DEV_PORT === undefined
    ? 8787 : Number(process.env.LABHIPPO_DEV_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error("LABHIPPO_DEV_PORT must be an integer from 1024 to 65535.");
    process.exitCode = 1;
  } else {
    createApiServer({ records: syntheticRecords, principal: developmentPrincipal })
      .listen(port, "127.0.0.1", () => {
        console.log(`Synthetic LabHippo API: http://127.0.0.1:${port}/api/v1/records`);
      });
  }
}
