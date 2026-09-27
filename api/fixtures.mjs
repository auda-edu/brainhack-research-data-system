// Invented examples only. Never replace this module with private repository data
// until production authentication, authorization review, and hosting are ready.
export const syntheticRecords = [
  {
    id: "demo-public", labId: "demo-lab", review: "approved", access: "public",
    title: "Open methods example", summary: "Synthetic public project summary."
  },
  {
    id: "demo-lab", labId: "demo-lab", review: "approved", access: "lab",
    title: "Lab methods example", summary: "Synthetic lab-only summary."
  },
  {
    id: "demo-restricted", labId: "demo-lab", review: "approved", access: "restricted",
    readers: ["demo-researcher"], title: "Restricted example",
    summary: "Synthetic record for explicit reader testing."
  },
  {
    id: "demo-proposed", labId: "demo-lab", review: "proposed", access: "public",
    title: "Unapproved example", summary: "Synthetic proposal that must stay hidden."
  }
];

export const developmentPrincipal = {
  id: "demo-researcher", labIds: ["demo-lab"]
};
