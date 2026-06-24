# Project Rocky — Visual Design Spec

Target: a **clean engineering-schematic / CAD render** of a reconfigurable quadruped.
NOT a toy. Reference: small white quadruped — chamfered cuboid body, recessed screen with
two green eyes, metallic cylinder hip motors, substantial light leg links, black ball feet.

## 1. Scene
- **Sky:** solid **cyan** (no gradient drama), **fog removed**.
- **Floor:** light neutral studio plane + a subtle technical grid (thin, even) that still
  scrolls under the robot when walking.
- **Lighting:** soft, even, studio "product render" — hemisphere ambient + one soft key
  (gentle shadow) + fill + a low rim. White body must read clean, no harsh hotspots.
- **No drop-shadow on the UI panel.**

## 2. Form / geometry (the big fixes)
- **Body = chamfered cuboid.** A true **chamfer** (flat 45° cut on the edges), *not* a
  rounded fillet, and *not* the tapered trapezium it is now. Chamfer is small. Optionally a
  hair of rounding on the chamfer (very slight).
  - Built with `Shape` (rectangle w/ chamfered corners) → `ExtrudeGeometry`
    `{ bevelEnabled:true, bevelSegments:1, bevelThickness=bevelSize=chamfer }`.
- **Head = chamfered cuboid**, set a little back from the body front.
- **Screen recessed *into* the head surface** — a dark inset panel sitting below a thin
  flush bezel lip (so it looks set-in, not stuck-on). Two rounded green eyes on it (canvas).
- **Motors:** uniform metallic cylinders, **lighter** finish (brushed-aluminium gray, not
  near-black). The hip motors read as the prominent mechanical feature.
- **Thigh + shin:** **thicker**, curved (Spot-like). Cross-section decision below.
- **Feet:** near-black ball.

## 3. "Schematic" treatment
- Solid shaded model in a **white / gray / black** mechanical palette (no orange/yellow).
- Thin **dark edge outlines** on the hard edges of body/head/legs (EdgesGeometry,
  ~30° threshold) to give the precise CAD-drawing read. (Toggle-able — see decision.)

## 4. Palette
| part            | finish |
|-----------------|--------|
| body / head     | white, matte (#eceff2) |
| leg links       | white / light gray |
| motors          | light brushed-aluminium gray, metallic |
| feet            | near-black |
| screen          | dark panel, **green** eyes |
| edge lines      | dark slate gray |

## 5. UI
- Keep the current monochrome shadcn-sharp panel (matches `bi-openarm/console`), **minus the
  box-shadow**.

## 6. Kinematics — unchanged
- Crawl/Trot morph, IK gait, floor-scroll travel, bilateral symmetry — all stay as-is.
  This pass is purely the shell, materials, scene, and lighting.

## Open decisions (need your call)
1. **Leg link cross-section** — flat plate links (like the reference / real robots) vs round
   thick tubes.
2. **Edge outlines** — shaded + CAD edge lines vs clean shaded only.
