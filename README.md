# Project Rocky

An open-source quadruped that carries its own intelligence — all sensing, compute, and power
onboard, nothing offloaded to a phone or a server. A deliberately modular base for experimenting
with locomotion and agentic robot behavior in the home.

This repo is the project's one-page site, with an interactive three.js viewer of the robot.

**Live:** https://pbshgthm.github.io/rocky/

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:60643
```

## Build

```bash
pnpm build      # static output in dist/
pnpm preview
```

## Layout

```
index.html      one-page site
view.html       full-screen viewer
src/robot.js    the three.js scene — rig, gait, lighting, controls
public/models/  GLB assets the viewer loads
```

Deployed to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.
