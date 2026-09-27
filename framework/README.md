# LabHippo system preview

Open `index.html` in a browser to view the navigable concept page. It uses plain HTML, CSS, and JavaScript and needs no build step or account.

## What is included

- Overview page with a proposed system map
- Function dropdown and links for projects, lifecycle and access, decisions, provenance, known issues, handover, people and governance, and connected tools
- User-scenario dropdown and links for principal investigator, lab manager, researcher, new lab member, and collaborator
- A consistent empty page shell for every destination
- Responsive layout, keyboard-accessible links and dropdowns, and a skip link

All names and descriptions are provisional. The preview contains no forms, live data, accounts, permissions, or implemented workflows.

## Where to extend it

- Edit the `functions` and `scenarios` arrays near the top of `app.js` to change the navigation and page labels.
- Replace the reserved workspace in `index.html` and the corresponding route rendering in `app.js` when real processes are defined.
- Adjust colors, type, and layout in `styles.css`.
