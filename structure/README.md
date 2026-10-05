# Synthetic Structure index

This first Structure/Explore milestone reads only the eight fictional Markdown
examples already published in the template kit. It does not read a private
repository, Capture uploads, or browser storage. It is not a public-record
approval or access-control implementation.

`synthetic-manifest.json` lists every permitted example path and its SHA-256
fingerprint over UTF-8 text normalized to LF line endings, so Windows and Linux
produce the same index. The build refuses changed or unlisted source files, path escapes,
duplicate IDs, unsupported template syntax, invalid dates, missing projects,
and unresolved relationships. Changing an example requires reviewing its
content and updating its manifest fingerprint. Never extend this manifest to
real records. The examples retain their original proposed/internal labels;
their fictional nature, not those labels, permits this demo publication.

```powershell
node structure/build-index.mjs
node structure/build-index.mjs --check
node --test structure/build-index.test.mjs explore-core.test.cjs
```

The deterministic output `data/synthetic-index.js` contains schema version 1,
records, typed relationships, original source paths and content fingerprints.
The manifest pins the source template commit for GitHub source links. There
is no generated timestamp, live GitHub dependency, or credential in the index.
The shared `record-format.js` parser accepts the constrained template subset (quoted scalars, inline
text arrays, block lists and one-level list mappings), not arbitrary YAML.
Metadata is projected from an explicit field list; body Markdown and log rows
remain plain text. Browser rendering uses DOM nodes and `textContent`.

Explore provides case-insensitive word search, project/type filters, stable
record links, incoming/outgoing relationships, source fingerprints, and a
single-column mobile layout. A resource can appear in more than one project.
Record links can be bookmarked; filter URLs retain the query and selections.
The separate [local demo workspace](../LOCAL_DEMO.md) derives explicitly saved
fictional drafts at runtime, without changing this manifest or built-in index.
There is no native Android/iOS binary, offline cache, account system, private
publication pipeline, or role authorization in this milestone.

The local Capture server explicitly serves only the added browser assets and
this README; it still refuses arbitrary files and service source paths.
GitHub Pages production continues to serve `main` until owner-reviewed merges.
An immutable public raw.githack preview may be used for review of the branch;
it needs no account or repository settings and may show a confirmation screen.
It is a free third-party cache without an uptime guarantee, not the production
deployment. See https://raw.githack.com/ for the service's current behavior.
