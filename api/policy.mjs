// Read policy for approved records. The caller supplies a server-established
// principal; request headers, query strings, and browser roles are not identities.
export function canRead(principal, record) {
  if (!record || record.review !== "approved") return false;
  if (record.access === "public") return true;

  const id = principal?.id;
  const labIds = principal?.labIds;
  if (typeof id !== "string" || !Array.isArray(labIds) ||
      typeof record.labId !== "string" || !labIds.includes(record.labId)) return false;

  if (record.access === "lab") return true;
  if (record.access === "restricted") {
    return Array.isArray(record.readers) && record.readers.includes(id);
  }
  return false;
}
