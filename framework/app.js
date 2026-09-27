const functions = [
  { id: "projects", title: "Projects", category: "Registry", description: "A starting point for each study and its current state." },
  { id: "lifecycle", title: "Lifecycle & access", category: "Registry", description: "A place to distinguish project status from access level." },
  { id: "decisions", title: "Decision history", category: "Memory", description: "A future record of what changed and why." },
  { id: "provenance", title: "Provenance", category: "Memory", description: "A route from data and code to analysis and outputs." },
  { id: "issues", title: "Known issues", category: "Memory", description: "A place to retain caveats, failures, and open questions." },
  { id: "handover", title: "Handover", category: "Continuity", description: "A reserved space for what a new member needs to restart work." },
  { id: "people", title: "People & governance", category: "Continuity", description: "A future home for owners, roles, and review responsibilities." },
  { id: "connections", title: "Connected tools", category: "Ecosystem", description: "Links to the existing systems that hold data and records." }
];

const scenarios = [
  { id: "pi", title: "Principal investigator", description: "A lab-wide view of project state and stewardship." },
  { id: "manager", title: "Lab manager", description: "A starting point for ownership and handover coordination." },
  { id: "researcher", title: "Researcher", description: "A view of decisions, provenance, and known issues." },
  { id: "student", title: "New lab member", description: "A clear route into a project and its restart point." },
  { id: "collaborator", title: "Collaborator", description: "A reserved space for permitted shared context." }
];

const byId = id => document.getElementById(id);
const pageTitle = "LabHippo — System preview";

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

function renderRoute() {
  const parts = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/").filter(Boolean);
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
    byId("detail-kicker").textContent = `${group} / Concept page`;
    byId("detail-title").textContent = item.title;
    byId("detail-description").textContent = item.description;
    byId("detail-index").textContent = String(index).padStart(2, "0");
    byId("placeholder-code").textContent = `${type.toUpperCase()} ${String(index).padStart(2, "0")}`;
    renderRelated(type, item);
    document.title = `${item.title} — LabHippo preview`;
  } else {
    document.title = pageTitle;
  }
  window.scrollTo(0, 0);
}

renderNavigation();
renderRoute();
window.addEventListener("hashchange", renderRoute);

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
