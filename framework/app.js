const functions = [
  { id: "projects", title: "Projects", category: "Registry", description: "Search the study registry and see each project's current state." },
  { id: "lifecycle", title: "Lifecycle & access", category: "Registry", description: "Compare project work state with its separate access label." },
  { id: "decisions", title: "Decision history", category: "Memory", description: "Trace choices, reasons, alternatives, and the log that captured them." },
  { id: "provenance", title: "Provenance", category: "Memory", description: "Follow recorded data, code, runs, and outputs for a project." },
  { id: "issues", title: "Known issues", category: "Memory", description: "Review open and resolved problems with their conditions and remedies." },
  { id: "handover", title: "Handover", category: "Continuity", description: "See the current restart point and what is missing." },
  { id: "people", title: "People & governance", category: "Continuity", description: "See recorded owners, reviewers, authors, and review gaps." },
  { id: "connections", title: "Connected tools", category: "Ecosystem", description: "Inspect recorded tool references and proposed connection points." }
];

const scenarios = [
  { id: "researcher", title: "Researcher", description: "Launch a project, then keep its lab log current each day there is progress." },
  { id: "pi", title: "Principal investigator", description: "A lab-wide view of project state, attention flags and recent decisions." },
  { id: "manager", title: "Lab manager", description: "Ownership, restart readiness and logging cadence across projects." },
  { id: "student", title: "New lab member", description: "A restart guide for each project, built from its launch record and logs." },
  { id: "collaborator", title: "Collaborator", description: "Only the projects and records marked public." }
];

const byId = id => document.getElementById(id);
const pageTitle = "LabHippo — Interactive system demo";

function linkFor(type, item) {
  return `#/${type}/${item.id}`;
}

function createLink(type, item, className, content) {
  const link = document.createElement("a");
  link.className = className;
  link.href = linkFor(type, item);
  link.innerHTML = content;
  return link;
}

function renderNavigation() {
  const functionsMenu = byId("functions-menu");
  const scenariosMenu = byId("scenarios-menu");
  functionsMenu.innerHTML = '<span class="menu-heading">EXPLORE BY FUNCTION</span>';
  scenariosMenu.innerHTML = '<span class="menu-heading">EXPLORE BY ROLE</span>';

  functions.forEach(item => functionsMenu.append(createLink("function", item, "menu-link", `<span>${item.title}</span><small>${item.category}</small>`)));
  scenarios.forEach(item => scenariosMenu.append(createLink("scenario", item, "menu-link", `<span>${item.title}</span><small>Scenario</small>`)));

  const grid = byId("module-grid");
  functions.forEach((item, index) => {
    const number = String(index + 1).padStart(2, "0");
    grid.append(createLink("function", item, "module-card", `<div class="card-top"><span>${number} / ${item.category.toUpperCase()}</span><span class="card-arrow" aria-hidden="true">↗</span></div><div><h3>${item.title}</h3><p>${item.description}</p></div>`));
  });

  const list = byId("scenario-list");
  scenarios.forEach((item, index) => {
    const number = String(index + 1).padStart(2, "0");
    list.append(createLink("scenario", item, "scenario-row", `<span class="scenario-number">${number}</span><span class="scenario-name">${item.title}</span><span class="scenario-description">${item.description}</span><span class="scenario-arrow" aria-hidden="true">↗</span>`));
  });
}

function renderRelated(type, current) {
  const container = byId("related-links");
  container.replaceChildren();
  const items = type === "function" ? functions : scenarios;
  const options = items.filter(item => item.id !== current.id).slice(0, 4);
  options.forEach(item => container.append(createLink(type, item, "related-link", `<span>${item.title}</span><span aria-hidden="true">↗</span>`)));
  const otherType = type === "function" ? "scenario" : "function";
  const other = otherType === "function" ? functions[0] : scenarios[0];
  container.append(createLink(otherType, other, "related-link related-other", `<span>Explore ${otherType === "function" ? "functions" : "user scenarios"}</span><span aria-hidden="true">→</span>`));
}

function closeMenus() {
  document.querySelectorAll(".nav-menu[open]").forEach(menu => { menu.open = false; });
}

// Researcher forms are never re-rendered from outside, so typed text is not lost.
function isEditing(parts) {
  return parts[0] === "scenario" && parts[1] === "researcher" && (parts[2] === "launch" || parts[4] === "log");
}

function routeParts() {
  return decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/").filter(Boolean);
}

function renderWorkspace(type, item, parts) {
  const workspace = byId("workspace");
  let render = null;
  if (type === "scenario" && item.id === "researcher" && window.LabhippoResearcher) render = root => window.LabhippoResearcher.render(root, parts.slice(2));
  else if (type === "scenario" && window.LabhippoRoles && window.LabhippoRoles.has(item.id)) render = root => window.LabhippoRoles.render(root, item.id, parts.slice(2));
  else if (type === "function" && window.LabhippoFunctions && window.LabhippoFunctions.has(item.id)) render = root => window.LabhippoFunctions.render(root, item.id);
  workspace.hidden = !render;
  byId("placeholder-panel").hidden = Boolean(render);
  if (render) render(workspace);
  else workspace.replaceChildren();
}

function renderRoute(event) {
  const parts = routeParts();
  const type = parts[0];
  const item = type === "function" ? functions.find(entry => entry.id === parts[1]) : type === "scenario" ? scenarios.find(entry => entry.id === parts[1]) : null;
  const showDetail = Boolean(item);
  byId("home-view").hidden = showDetail;
  byId("detail-view").hidden = !showDetail;
  closeMenus();

  if (showDetail) {
    const group = type === "function" ? "Functions" : "User scenarios";
    const index = (type === "function" ? functions : scenarios).indexOf(item) + 1;
    byId("breadcrumb-group").textContent = group;
    byId("breadcrumb-current").textContent = item.title;
    byId("detail-kicker").textContent = `${group} / Interactive demo`;
    byId("detail-title").textContent = item.title;
    byId("detail-description").textContent = item.description;
    byId("detail-index").textContent = String(index).padStart(2, "0");
    byId("placeholder-code").textContent = `${type.toUpperCase()} ${String(index).padStart(2, "0")}`;
    renderRelated(type, item);
    renderWorkspace(type, item, parts);
    document.title = `${item.title} — LabHippo demo`;
  } else {
    document.title = pageTitle;
  }
  if (event !== false) window.scrollTo(0, 0);
}

renderNavigation();
renderRoute();
window.addEventListener("hashchange", renderRoute);
// Another tab saved records: refresh the open view in place unless a form is being edited.
if (window.LabhippoStore) window.LabhippoStore.subscribe(() => { if (!isEditing(routeParts())) renderRoute(false); });

document.addEventListener("click", event => {
  if (event.target.closest(".menu-link")) closeMenus();
  if (!event.target.closest(".nav-menu")) closeMenus();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMenus();
});
document.querySelector(".skip-link").addEventListener("click", event => {
  event.preventDefault();
  byId("main").focus();
  byId("main").scrollIntoView();
});
document.querySelectorAll(".nav-menu").forEach(menu => {
  menu.addEventListener("toggle", () => {
    if (menu.open) document.querySelectorAll(".nav-menu").forEach(other => { if (other !== menu) other.open = false; });
  });
});
