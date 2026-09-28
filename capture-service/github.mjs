import capture from "../capture-core.js";

const API = "https://api.github.com";
const REPO_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH_NAME = /^(?!\/)(?!.*\.\.)(?!.*\/$)[A-Za-z0-9_./-]+$/;

export class SubmissionError extends Error {
  constructor(code, message, status = 400, details = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function createGitHubClient({ token, repo, baseBranch = "main", fetchImpl = fetch }) {
  if (!REPO_NAME.test(repo || "") || repo.toLowerCase() === "audachang/brainhack-research-data-system") {
    throw new Error("Configure one private records repository, not the public demo repository.");
  }
  if (!BRANCH_NAME.test(baseBranch) || baseBranch.startsWith("labhippo/capture/")) {
    throw new Error("Configure a valid base branch.");
  }
  const prefix = `/repos/${repo}`;
  const submissions = new Map();

  async function request(method, endpoint, body, allow404 = false) {
    if (!token) throw new SubmissionError("NOT_CONFIGURED", "GitHub credentials are not configured.", 503);
    let response;
    try {
      response = await fetchImpl(`${API}${endpoint}`, {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "labhippo-capture-local",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch {
      throw new SubmissionError("GITHUB_UNAVAILABLE", "GitHub could not be reached.", 502);
    }
    if (response.status === 404 && allow404) return { status: 404, data: null };
    if (!response.ok) {
      const code = response.status === 401 || response.status === 403 ? "GITHUB_ACCESS_DENIED" : "GITHUB_REJECTED";
      throw new SubmissionError(code, `GitHub rejected the request (${response.status}). Check repository access and app permissions.`, 502);
    }
    return { status: response.status, data: await response.json() };
  }

  async function verifyDestination() {
    const result = await request("GET", prefix, undefined, true);
    if (result.status === 404) throw new SubmissionError("REPO_NOT_FOUND", "The configured private repository is unavailable.", 503);
    if (result.data.private !== true || result.data.full_name?.toLowerCase() !== repo.toLowerCase()) {
      throw new SubmissionError("REPO_NOT_PRIVATE", "The configured destination is not the expected private repository.", 503);
    }
    return { repo: result.data.full_name, branch: baseBranch, private: true };
  }

  async function submit({ path, markdown, submissionId }) {
    try { capture.validateSubmission(path, markdown); }
    catch (error) { throw new SubmissionError("INVALID_RECORD", error.message, 422); }
    if (typeof submissionId !== "string" || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
      throw new SubmissionError("INVALID_SUBMISSION_ID", "A valid submission ID is required.");
    }
    if (submissions.has(submissionId)) return submissions.get(submissionId);
    const operation = submitOnce({ path, markdown, submissionId });
    submissions.set(submissionId, operation);
    try { return await operation; }
    catch (error) { submissions.delete(submissionId); throw error; }
  }

  async function submitOnce({ path, markdown, submissionId }) {
    await verifyDestination();
    const branch = `labhippo/capture/${submissionId}`;
    const prior = await request("GET", `${prefix}/git/ref/heads/${branch}`, undefined, true);
    if (prior.status !== 404) {
      throw new SubmissionError("SUBMISSION_ALREADY_STARTED", "This submission branch already exists. Inspect it before retrying.", 409,
        { repo, branch, path });
    }
    const baseRef = await request("GET", `${prefix}/git/ref/heads/${baseBranch}`, undefined, true);
    if (!baseRef.data?.object?.sha) throw new SubmissionError("BASE_BRANCH_MISSING", "The configured base branch was not found.", 503);
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const existing = await request("GET", `${prefix}/contents/${encodedPath}?ref=${encodeURIComponent(baseBranch)}`, undefined, true);
    if (existing.status !== 404) throw new SubmissionError("FILE_EXISTS", "That path already exists on the base branch. Choose a new path.", 409);

    // A submission only changes its own branch; merging remains a separate review action.
    let branchCreated = false;
    try {
      await request("POST", `${prefix}/git/refs`, { ref: `refs/heads/${branch}`, sha: baseRef.data.object.sha });
      branchCreated = true;
      await request("PUT", `${prefix}/contents/${encodedPath}`, {
        message: `Capture proposed ${path}`,
        content: Buffer.from(markdown, "utf8").toString("base64"),
        branch
      });
      const pr = await request("POST", `${prefix}/pulls`, {
        title: `Capture proposed ${path}`,
        body: "New proposed Markdown record from the local LabHippo Capture service. Review the content, source references, classification, and destination before merge. No approval or publication is implied.",
        head: branch, base: baseBranch, draft: true
      });
      if (!Number.isInteger(pr.data?.number) || !/^https:\/\/github\.com\//.test(pr.data?.html_url || "")) {
        throw new SubmissionError("INVALID_PR_RESPONSE", "GitHub returned an unexpected pull-request response.", 502);
      }
      return { state: "draft_pull_request", repo, branch, path, pullRequestNumber: pr.data.number, pullRequestUrl: pr.data.html_url };
    } catch (error) {
      if (branchCreated && error instanceof SubmissionError) {
        error.details = { branch, path, repo, message: "The branch may exist. Inspect it before retrying." };
      }
      throw error;
    }
  }

  return { verifyDestination, submit };
}
