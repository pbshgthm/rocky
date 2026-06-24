import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const D2R = THREE.MathUtils.degToRad;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ----------------------------------------------------------------------
   Mount the robot scene into `container`. One instance per page (the
   one-pager embed and the full-page viewer are separate documents).
   opts: { dog:boolean=true, walk:boolean=false, autoRotate:boolean=false }
   Controls bind by element id if present (seg-dog / seg-crab / walk /
   spin / reset), so a page only needs to provide the controls it wants.
---------------------------------------------------------------------- */
export function initRobot(container, opts = {}) {
  /* --------------------------------------------------------------------
     Renderer / scene / camera
  -------------------------------------------------------------------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefe9dd); // warm off-white to match the editorial page
  scene.fog = new THREE.Fog(0xefe9dd, 12, 42);  // keep the whole robot clear; let only the distant floor + grid dissolve

  const camera = new THREE.PerspectiveCamera(45, 1, 0.7, 130); // tight near/far -> good depth precision (no z-fighting jitter)
  // aim at the robot's vertical center (~2.0) and frame with comfortable margin; opts can override per mount
  const CAM_HOME = new THREE.Vector3(...(opts.camPos || [5.0, 2.8, 5.7]));
  const TARGET = new THREE.Vector3(...(opts.camTarget || [0, 2.0, 0]));
  camera.position.copy(CAM_HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.copy(TARGET);
  controls.minDistance = 3;
  controls.maxDistance = 52;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.autoRotateSpeed = 1.2;

  // size to the container (not the window) so the scene works both bounded and full-page
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();

  /* --------------------------------------------------------------------
     Lighting
  -------------------------------------------------------------------- */
  scene.add(new THREE.HemisphereLight(0xeaf3fb, 0xeef0f2, 0.65));
  const keyL = new THREE.DirectionalLight(0xfff6ec, 1.15);
  keyL.position.set(8, 15, 9);
  keyL.castShadow = true;
  keyL.shadow.mapSize.set(2048, 2048);
  keyL.shadow.radius = 4;
  keyL.shadow.camera.near = 1;
  keyL.shadow.camera.far = 52;
  keyL.shadow.camera.left = -15; keyL.shadow.camera.right = 15;
  keyL.shadow.camera.top = 15; keyL.shadow.camera.bottom = -15;
  keyL.shadow.bias = -0.0004;
  scene.add(keyL);
  const fillL = new THREE.DirectionalLight(0xe3eef8, 0.5); fillL.position.set(-10, 6, -4); scene.add(fillL);
  const rimL = new THREE.DirectionalLight(0xffffff, 0.5); rimL.position.set(-3, 9, -13); scene.add(rimL);

  /* --------------------------------------------------------------------
     Ground (white) + gray grid
  -------------------------------------------------------------------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: 0xf7f2ea, roughness: 0.95, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const GRID_CELL = 1;
  const grid = new THREE.GridHelper(300, 300, 0x4d525a, 0x717783); // large -> reads as infinite; dark grey lines
  grid.position.y = 0.003;
  grid.material.transparent = true;
  grid.material.opacity = 0.58;
  scene.add(grid);

  /* --------------------------------------------------------------------
     Materials
  -------------------------------------------------------------------- */
  const matSeg   = new THREE.MeshStandardMaterial({ color: 0xf2a35a, roughness: 0.55, metalness: 0.05 }); // legs — orange
  const matAxle  = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.4, metalness: 0.7 });   // bolts / bore
  const matFoot  = new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: 0.55, metalness: 0.25 }); // feet
  const matPlate = new THREE.MeshStandardMaterial({ color: 0xf3d05f, roughness: 0.5, metalness: 0.1 });   // base plate — yellow
  const matOLED  = new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.35, metalness: 0.3 });  // OLED bezel
  const matNeck  = new THREE.MeshStandardMaterial({ color: 0xd7dde4, roughness: 0.45, metalness: 0.4 });  // brackets / neck
  const matMotor = new THREE.MeshStandardMaterial({ color: 0x595e66, roughness: 0.45, metalness: 0.6 });  // DAMIAO motors — dark gray
  const matHorn  = new THREE.MeshStandardMaterial({ color: 0xb9c0c9, roughness: 0.35, metalness: 0.8 });  // coupling disks
  const matXL    = new THREE.MeshStandardMaterial({ color: 0x4b4f57, roughness: 0.45, metalness: 0.55 }); // XL330 head servos — dark gray
  const matBracket = new THREE.MeshStandardMaterial({ color: 0xc2c8d0, roughness: 0.4, metalness: 0.65 }); // leg coupling brackets — silver
  const matBattery = new THREE.MeshStandardMaterial({ color: 0x3a6fd0, roughness: 0.5, metalness: 0.3 }); // battery — blue
  const matShelf = new THREE.MeshStandardMaterial({ color: 0xb7bec7, roughness: 0.6, metalness: 0.3 });   // internal mount tray
  const matPCBg  = new THREE.MeshStandardMaterial({ color: 0x29a65a, roughness: 0.55, metalness: 0.2 });  // PCB green
  const matBuck  = new THREE.MeshStandardMaterial({ color: 0x3173d8, roughness: 0.45, metalness: 0.5 });  // buck / transformer blue
  const matPCBd  = new THREE.MeshStandardMaterial({ color: 0x333845, roughness: 0.5, metalness: 0.3 });   // dark board (not black)
  const matPCBr  = new THREE.MeshStandardMaterial({ color: 0xc24a3a, roughness: 0.55, metalness: 0.2 });  // PCB red
  const matPCBp  = new THREE.MeshStandardMaterial({ color: 0x7a52c0, roughness: 0.55, metalness: 0.2 });  // PCB purple
  const matConn  = new THREE.MeshStandardMaterial({ color: 0xe0b53a, roughness: 0.5, metalness: 0.3 });   // XT90 yellow
  const matSwitch= new THREE.MeshStandardMaterial({ color: 0xcc4040, roughness: 0.5, metalness: 0.2 });   // switch red
  const matSpeaker = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.7, metalness: 0.2 });
  const matShellBody = new THREE.MeshPhysicalMaterial({
    color: 0x7fb0d8, metalness: 0, roughness: 0.4, transparent: true, opacity: 0.26, // body — translucent blue
    clearcoat: 0.4, side: THREE.DoubleSide, depthWrite: false,
  });
  const matShellHead = new THREE.MeshPhysicalMaterial({
    color: 0x8fd0c4, metalness: 0, roughness: 0.4, transparent: true, opacity: 0.26, // head — translucent teal
    clearcoat: 0.4, side: THREE.DoubleSide, depthWrite: false,
  });

  /* --------------------------------------------------------------------
     Geometry helpers
  -------------------------------------------------------------------- */
  function chamferRect(w, h, c) {
    const a = w / 2, b = h / 2;
    const s = new THREE.Shape();
    s.moveTo(-a + c, -b); s.lineTo(a - c, -b); s.lineTo(a, -b + c); s.lineTo(a, b - c);
    s.lineTo(a - c, b); s.lineTo(-a + c, b); s.lineTo(-a, b - c); s.lineTo(-a, -b + c);
    s.closePath();
    return s;
  }
  // curved limb bone: chamfered cross-section swept along a bowed path
  function makeLink(len, bow, s, cw, ch, c, mat) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0), new THREE.Vector3((s * len) / 2, bow, 0), new THREE.Vector3(s * len, 0, 0)
    );
    const geo = new THREE.ExtrudeGeometry(chamferRect(cw, ch, c), { extrudePath: curve, steps: 30, bevelEnabled: false });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  }
  function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; }
  function cyl(r, h, mat, seg = 28) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.castShadow = true; return m; }

  // a recognizable PCB module: board + chip/heatsink + header pins (+ optional pot/connector),
  // so the electronics read as real components rather than plain boxes.
  function pcbModule(w, d, h, boardMat, opts = {}) {
    const g = new THREE.Group();
    const t = 0.03, baseY = t / 2;
    g.add(box(w, t, d, boardMat));
    if (opts.heatsink) { const hs = box(w * 0.5, h, d * 0.55, matAxle); hs.position.y = baseY + h / 2; g.add(hs); }
    else { const chip = box(w * 0.36, h * 0.7, d * 0.36, matPCBd); chip.position.y = baseY + h * 0.35; g.add(chip); }
    const pins = box(w * 0.86, 0.04, 0.05, matAxle); pins.position.set(0, baseY + 0.02, d / 2 - 0.05); g.add(pins);
    if (opts.pot)  { const p = cyl(0.04, 0.05, matConn, 10); p.position.set(w / 2 - 0.08, baseY + 0.025, -d / 2 + 0.08); g.add(p); }
    if (opts.conn) { const c = box(0.14, 0.07, 0.1, matConn); c.position.set(-w / 2 + 0.1, baseY + 0.035, -d / 2 + 0.07); g.add(c); }
    g.children.forEach((m) => { m.castShadow = true; });
    return g;
  }

  // DAMIAO output coupling disk — large flat disk + center bore + 6-bolt circle.
  // Default axis = Y (disk face in X-Z plane); axis 'Z' faces ±Z.
  function makeCouplingDisk(axis) {
    const g = new THREE.Group();
    const R = 0.2, T = 0.055, BC = 0.135;
    const disk = cyl(R, T, matHorn); g.add(disk);
    const bore = cyl(0.062, T * 1.25, matAxle, 20); g.add(bore);            // center bore hub
    for (let i = 0; i < 6; i++) {                                           // bolt circle
      const a = (i / 6) * Math.PI * 2;
      const b = cyl(0.02, T * 1.5, matAxle, 10);
      b.position.set(Math.cos(a) * BC, 0, Math.sin(a) * BC);
      g.add(b);
    }
    if (axis === "Z") g.rotation.x = Math.PI / 2;
    return g;
  }

  // L-bracket coupler: a rounded disk that mates (overlaps) the motor horn, plus a short arm
  // bent 90° so the segment bolts on clear of the motor body. Built for a horn facing +Z.
  function makeCoupler(clear, mat) {
    const g = new THREE.Group();
    const R = 0.2, T = 0.05;
    const disk = cyl(R, T, mat); disk.rotation.x = Math.PI / 2; disk.position.z = T / 2; g.add(disk);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = cyl(0.02, T * 1.4, matAxle, 8); b.rotation.x = Math.PI / 2;
      b.position.set(Math.cos(a) * 0.135, Math.sin(a) * 0.135, T / 2); g.add(b);
    }
    const arm = box(0.3, 0.3, clear, mat); arm.position.z = T + clear / 2; g.add(arm);
    g.children.forEach((m) => { m.castShadow = true; });
    return g;
  }

  // L-bracket for a pitch joint: bolts to the +Z output horn, runs radially out along the horn face,
  // then bends 90° back IN to the centerline (z=0) where the bone attaches. Add to the rotating joint
  // group (origin = joint center, horn face at z = MH). Bone attaches at (s*reach, 0, 0).
  function lBracket(s, reach, MH, mat, face = 1) {
    const g = new THREE.Group();
    const T = 0.05, W = 0.26;                       // taller plate
    const fz = face * (MH + 0.03);   // sit just OUTSIDE the motor face (avoid z-fighting with it)
    const disk = cyl(0.18, T, mat); disk.rotation.x = Math.PI / 2; disk.position.z = fz; g.add(disk);   // disc on the horn face
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = cyl(0.016, T * 1.3, matAxle, 8); b.rotation.x = Math.PI / 2;
      b.position.set(Math.cos(a) * 0.115, Math.sin(a) * 0.115, fz); g.add(b);
    }
    const armA = box(reach, W, T, mat); armA.position.set(s * reach / 2, 0, fz); g.add(armA);              // radial plate, coplanar with the disc (connected)
    const armB = box(T, W, Math.abs(fz), mat); armB.position.set(s * reach, 0, fz / 2); g.add(armB);       // 90° bend, down to the centerline
    const endDisc = cyl(0.14, 0.07, mat); endDisc.rotation.z = Math.PI / 2; endDisc.position.set(s * reach, 0, 0); g.add(endDisc); // disc where the segment bolts on
    g.children.forEach((m) => { m.castShadow = true; });
    return g;
  }
  // even grid-line texture (transparent between lines) -> reads as a mesh panel
  function gridTex(lineHex) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d");
    x.strokeStyle = "#" + lineHex.toString(16).padStart(6, "0");
    x.lineWidth = 2.5;
    x.strokeRect(0, 0, 128, 128);   // thin lines; cell count set by repeat
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // translucent rounded shell volume + an evenly-spaced grid-line mesh overlay
  function shell(w, h, d, r = 0.08, mat = matShellBody, lineHex = 0x4a7fb0) {
    const g = new THREE.Group();
    const solid = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);
    solid.renderOrder = 3; g.add(solid);
    const tex = gridTex(lineHex);
    tex.repeat.set(Math.max(2, Math.round(w / 0.3)), Math.max(2, Math.round(h / 0.3))); // ~0.3u cells (finer grid, thin lines)
    const gridM = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 4, r),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.7, depthWrite: false })
    );
    gridM.renderOrder = 4; g.add(gridM);
    return g;
  }

  /* --------------------------------------------------------------------
     Scale + layout constants   (1 unit = 100 mm)
  -------------------------------------------------------------------- */
  const SCALE = 0.01;
  const BODY_W = 2.0, BODY_D = 2.2;          // base-plate footprint
  const HALF_W = BODY_W / 2, HALF_D = BODY_D / 2;
  const MOUNT_Y = -0.7;                      // plate top = yaw-motor bottoms
  const PLATE_T = 0.08;
  const SHELL_W = 2.0, SHELL_D = 2.2, SHELL_H = 1.1;     // full-plate enclosure box
  const DECK_Y = MOUNT_Y + SHELL_H;          // box lid (head mounts here)

  const MOTOR_H = 0.46;                        // DAMIAO height (57x46x57mm -> 0.46u)
  const HIP_DROP = 0.55;                        // longer yaw->hip joint so the two motors clear each other
  const HIP_LOCAL_Y = MOUNT_Y - MOTOR_H - HIP_DROP; // yaw motor hangs under the plate, so the hip is below by MOTOR_H + drop

  /* leg / gait constants (kinematics unchanged) */
  const Lf = 1.3, Lt = 1.5;                // femur / tibia (sized to the body)
  const FOOT = Lt;
  const FOOT_R = 0.16;                       // foot balls
  const BOW_F = -0.12, BOW_T = -0.1;       // gentle bow on the (short) links
  const CRAB = { splay: 42, r: 1.3, d: 0.6 };  // Crawl: low, sprawled crab (feet out) — unchanged feel
  const DOG  = { az: -90, r: 0.3, d: 1.5 };    // feet under the yaw joints, body sat low
  const GAIT = {
    dog:  { cps: 1.15, duty: 0.60, lift: 0.70, step: 1.0 },
    crab: { cps: 1.40, duty: 0.55, lift: 0.50, swing: 26 },
  };
  GAIT.dog.floor = GAIT.dog.step * GAIT.dog.cps / GAIT.dog.duty;
  GAIT.crab.floor = CRAB.r * Math.cos(D2R(CRAB.splay)) * D2R(GAIT.crab.swing) * GAIT.crab.cps / GAIT.crab.duty;
  const corners = [
    { s:  1, fz:  1, front: true  }, { s: -1, fz:  1, front: true  },
    { s:  1, fz: -1, front: false }, { s: -1, fz: -1, front: false },
  ];
  function gaitCycle(u, duty) {
    if (u < duty) { const s = u / duty; return { stride: 0.5 - s, lift: 0 }; }
    const s = (u - duty) / (1 - duty);
    return { stride: -0.5 + s, lift: Math.sin(s * Math.PI) };
  }
  function solveLeg(r, d) {
    const D = clamp(Math.hypot(r, d), Math.abs(FOOT - Lf) + 0.02, Lf + FOOT - 0.02);
    const c2 = clamp((D * D - Lf * Lf - FOOT * FOOT) / (2 * Lf * FOOT), -1, 1);
    const Kk = Math.acos(c2);
    const Pp = Math.atan2(d, r) - Math.atan2(FOOT * Math.sin(Kk), Lf + FOOT * Math.cos(Kk));
    return { Pp, Kk };
  }

  /* head tunables */
  const HEAD = { baseZ: 0.72, panH: 0.34, neckH: 0.46 };

  /* --------------------------------------------------------------------
     OLED "face"
  -------------------------------------------------------------------- */
  const FW = 420, FH = 248;
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = FW; faceCanvas.height = FH;
  const fx = faceCanvas.getContext("2d");
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function drawFace(open) {
    fx.clearRect(0, 0, FW, FH);
    fx.fillStyle = "#05080a"; fx.fillRect(0, 0, FW, FH);
    const ew = 72, ehMax = 124, cy = FH * 0.52, eh = Math.max(ew, ehMax * open);
    fx.fillStyle = "#36e05a"; fx.shadowColor = "#36e05a"; fx.shadowBlur = 26;
    roundRect(fx, FW * 0.5 - 62 - ew / 2, cy - eh / 2, ew, eh, ew / 2); fx.fill();
    roundRect(fx, FW * 0.5 + 62 - ew / 2, cy - eh / 2, ew, eh, ew / 2); fx.fill();
    fx.shadowBlur = 0;
    faceTex.needsUpdate = true;
  }
  drawFace(1);

  /* --------------------------------------------------------------------
     Asset loading + prep
  -------------------------------------------------------------------- */
  const robot = new THREE.Group();
  scene.add(robot);
  const BASE = import.meta.env.BASE_URL;
  const loader = new GLTFLoader();
  const loadGlb = (n) => loader.loadAsync(`${BASE}models/${n}.glb`).then((g) => g.scene);

  function prep(tpl, { rotX = 0, rotY = 0, rotZ = 0, anchor = "center" } = {}) {
    const obj = tpl.clone(true);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    obj.scale.setScalar(SCALE);
    obj.rotation.set(rotX, rotY, rotZ);
    const bb = new THREE.Box3().setFromObject(obj);
    const c = bb.getCenter(new THREE.Vector3());
    const ay = anchor === "bottom" ? bb.min.y : anchor === "top" ? bb.max.y : c.y;
    obj.position.sub(new THREE.Vector3(c.x, ay, c.z));
    const g = new THREE.Group();
    g.add(obj);
    g.userData.size = bb.getSize(new THREE.Vector3());
    return g;
  }

  const legs = [];
  let headPan = null, headTilt = null;

  async function build() {
    const [motorTpl, camTpl, xlTpl, devkitTpl, battTpl, micTpl, ampTpl, buck5Tpl] = await Promise.all([
      loadGlb("damiao-motor"), loadGlb("orbbec-gemini-336"), loadGlb("xl330"), loadGlb("jetson-orin-devkit"),
      loadGlb("battery-5000"), loadGlb("respeaker-v2"), loadGlb("max98357a"), loadGlb("dcdc-5v"),
    ]);
    motorTpl.traverse((o) => { if (o.isMesh) o.material = matMotor; });
    battTpl.traverse((o) => { if (o.isMesh) o.material = matBattery; });
    xlTpl.traverse((o) => { if (o.isMesh) o.material = matXL; });

    /* base plate (yellow) */
    const plate = box(BODY_W, PLATE_T, BODY_D, matPlate);
    plate.position.y = MOUNT_Y - PLATE_T / 2;
    robot.add(plate);

    buildBodyInternals(battTpl, buck5Tpl);
    buildTopDeck(devkitTpl, micTpl, ampTpl);
    buildRearPower();

    /* transparent body shell over it all */
    const bodyShell = shell(SHELL_W, SHELL_H, SHELL_D, 0.1);
    bodyShell.position.set(0, MOUNT_Y + SHELL_H / 2, 0);
    robot.add(bodyShell);

    corners.forEach((c) => buildLeg(c, motorTpl));
    buildHead(xlTpl, camTpl);
  }

  /* ---- inside the body: 2 batteries low + power tray above ---- */
  function buildBodyInternals(battTpl, buck5Tpl) {
    // two 6S 5000mAh packs lying flat along the body length (Z), side by side on the plate
    // bottom rack: battery + charger + transformer only, centered between the corner leg motors
    for (const sx of [-1, 1]) {
      const b = prep(battTpl, { rotX: -Math.PI / 2, rotZ: Math.PI / 2, anchor: "bottom" }); // lie flat, length along Z
      b.position.set(sx * 0.34, MOUNT_Y, -0.15);   // two packs centered
      robot.add(b);
    }
    const fy = MOUNT_Y + 0.03;
    const charger = pcbModule(0.66, 0.4, 0.07, matPCBg, { conn: true });                charger.position.set(-0.58, fy, 0.82); robot.add(charger); // charger / BMS
    const buck5   = prep(buck5Tpl, { rotX: -Math.PI / 2, anchor: "bottom" });            buck5.position.set(0, fy, 0.82);       robot.add(buck5);   // 5V buck (real CAD)
    const xfmr    = pcbModule(0.66, 0.4, 0.16, matBuck, { heatsink: true, pot: true });   xfmr.position.set(0.58, fy, 0.82);     robot.add(xfmr);   // transformer / DC-DC
    // first-rack shelf above the power layer
    const shelf = box(1.9, 0.03, 2.1, matShelf); shelf.position.set(0, MOUNT_Y + 0.52, 0); robot.add(shelf);
  }

  /* ---- on top of the shell: Jetson + mic array + speaker ---- */
  function buildTopDeck(devkitTpl, micTpl, ampTpl) {
    // first rack: the four units each in their own corner; head pan motor sits front-center (in buildHead)
    const cy = MOUNT_Y + 0.54;
    const jetson = prep(devkitTpl, { rotX: -Math.PI / 2, anchor: "bottom" }); jetson.position.set(-0.34, cy, -0.55); robot.add(jetson); // compute — back-left
    const teensy = pcbModule(0.6, 0.2, 0.05, matPCBg, { conn: true }); teensy.position.set(0.62, cy, -0.62); robot.add(teensy);         // microcontroller — back-right
    const mic = prep(micTpl, { rotX: -Math.PI / 2, anchor: "bottom" }); mic.position.set(-0.62, cy, 0.62); robot.add(mic);              // mic array — front-left
    const spkBody = cyl(0.2, 0.18, matSpeaker); spkBody.position.set(0.62, cy + 0.09, 0.62); robot.add(spkBody);                       // speaker — front-right
    const spkCone = cyl(0.17, 0.04, matPCBd);   spkCone.position.set(0.62, cy + 0.185, 0.62); robot.add(spkCone);
    const amp = prep(ampTpl, { anchor: "bottom" }); amp.position.set(0.62, cy, -0.18); robot.add(amp);                                 // MAX98357A amp (with speaker side)
  }

  /* ---- rear face: charge port + master switch ---- */
  function buildRearPower() {
    const zr = -SHELL_D / 2 - 0.02;
    // XT90 charge port (yellow connector block with a recessed slot)
    const port = box(0.26, 0.18, 0.14, matConn); port.position.set(-0.3, MOUNT_Y + 0.32, zr); robot.add(port);
    const slot = box(0.16, 0.1, 0.04, matPCBd);   slot.position.set(-0.3, MOUNT_Y + 0.32, zr - 0.07); robot.add(slot);
    // master toggle switch (base + lever)
    const swBase = box(0.18, 0.14, 0.1, matPCBd);    swBase.position.set(0.28, MOUNT_Y + 0.32, zr); robot.add(swBase);
    const lever  = box(0.05, 0.12, 0.05, matSwitch); lever.position.set(0.28, MOUNT_Y + 0.4, zr); lever.rotation.x = -0.4; robot.add(lever);
  }

  /* --------------------------------------------------------------------
     Leg — three DAMIAO joints, each captured between bolt-circle coupling
     disks; the bones bolt flat onto the rotating output disk.
  -------------------------------------------------------------------- */
  function buildLeg(c, motorTpl) {
    const { s, fz } = c;
    const MH = 0.23, BR = 0.46;                   // motor half-thickness; L-bracket reach (longer = more clearance off the motor)
    const mount = new THREE.Group();
    mount.position.set(s * HALF_W, MOUNT_Y, fz * HALF_D);
    robot.add(mount);

    // ===== YAW (axis Y): motor hangs UNDER the plate, horn DOWN; bracket drops straight down to the hip =====
    const yawHousing = prep(motorTpl, { rotX: Math.PI, anchor: "top" }); // base at plate, body hangs down, horn at bottom
    mount.add(yawHousing);
    const hornY = -MOTOR_H;
    const yaw = new THREE.Group(); mount.add(yaw);                       // rotates about Y (abduction / splay)
    const yawDisk = makeCouplingDisk("Y"); yawDisk.position.y = hornY - 0.03; yaw.add(yawDisk);   // rounded coupler just below the bottom horn
    const drop = box(0.22, HIP_DROP, 0.42, matBracket); drop.position.set(0, hornY - HIP_DROP / 2, 0); yaw.add(drop);

    // ===== HIP (axis Z): femur on the CENTER LINE; L-bracket bolts to the horn and bends in to the centerline =====
    const hipY = hornY - HIP_DROP;
    const hipHousing = prep(motorTpl, { rotX: Math.PI / 2, anchor: "center" });
    hipHousing.position.set(0, hipY, 0); yaw.add(hipHousing);
    const hipBackDisk = makeCouplingDisk("Z"); hipBackDisk.position.set(0, hipY, -(MH + 0.03)); yaw.add(hipBackDisk); // back-face disk (fixed)
    const hip = new THREE.Group(); hip.position.set(0, hipY, 0); yaw.add(hip);   // rotates about Z
    hip.add(lBracket(s, BR, MH, matBracket, 1));                                 // OUTPUT L-bracket -> femur
    const femur = makeLink(Lf - BR - 0.3, BOW_F, s, 0.26, 0.32, 0.06, matSeg); femur.position.x = s * BR; hip.add(femur); // centerline, bracket -> knee edge

    // ===== KNEE (axis Z): tibia on the CENTER LINE; same L-bracket scheme =====
    const kneeHousing = prep(motorTpl, { rotX: Math.PI / 2, anchor: "center" });
    kneeHousing.position.set(s * Lf, 0, 0); hip.add(kneeHousing);
    const kneeBackDisk = makeCouplingDisk("Z"); kneeBackDisk.position.set(s * Lf, 0, -(MH + 0.03)); hip.add(kneeBackDisk);
    const knee = new THREE.Group(); knee.position.set(s * Lf, 0, 0); hip.add(knee);  // rotates about Z
    knee.add(lBracket(s, BR, MH, matBracket, 1));                                // OUTPUT L-bracket -> tibia
    const kneeBack = lBracket(-s, BR, MH, matBracket, -1); kneeBack.position.set(s * Lf, 0, 0); hip.add(kneeBack); // INPUT L-bracket on the back face -> femur
    const tibia = makeLink(Lt - BR, BOW_T, s, 0.22, 0.28, 0.05, matSeg); tibia.position.x = s * BR; knee.add(tibia); // centerline -> foot

    const foot = new THREE.Mesh(new THREE.SphereGeometry(FOOT_R, 28, 28), matFoot);
    foot.position.set(s * Lt, 0, 0);
    foot.castShadow = true;
    knee.add(foot);

    const phaseDog = (((c.front ? 0 : 1) + (s > 0 ? 0 : 1)) % 2) * 0.5;
    const phaseCrab = s > 0 ? (c.front ? 0 : 0.25) : (c.front ? 0.75 : 0.5);
    legs.push({ s, fz, front: c.front, yaw, hip, knee, phaseDog, phaseCrab });
  }

  /* --------------------------------------------------------------------
     Head — pan servo on the deck, neck, tilt servo, transparent head shell
     with a forward OLED display and the camera below it.
  -------------------------------------------------------------------- */
  function buildHead(xlTpl, camTpl) {
    const plateY = MOUNT_Y + 0.54;   // electronics first-rack plate (pan motor lives here, inside the box)
    const root = new THREE.Group();
    root.position.set(0, plateY, 0.62);   // neck toward the front of the body
    robot.add(root);

    // pan motor (XL330) standing on the electronics plate — vertical axis, inside the box
    const panServo = prep(xlTpl, { rotX: -Math.PI / 2, anchor: "bottom" });
    root.add(panServo);
    const panH = panServo.userData.size.y;
    headPan = new THREE.Group();
    headPan.position.y = panH;
    root.add(headPan);

    // neck shaft: rises from the pan motor up through the box lid and pops out (a little neck shows the pan)
    const shaftLen = (DECK_Y - (plateY + panH)) + 0.5;
    const shaft = cyl(0.08, shaftLen, matBracket);
    shaft.position.y = shaftLen / 2;
    headPan.add(shaft);

    // tilt motor (XL330) at the top of the shaft — the head tilts up/down on it (no separate neck)
    const tiltServo = prep(xlTpl, { rotY: Math.PI / 2, anchor: "center" });
    tiltServo.position.y = shaftLen;
    headPan.add(tiltServo);
    headTilt = new THREE.Group();
    headTilt.position.y = shaftLen;
    headPan.add(headTilt);

    // head: shell + camera + OLED, mounted directly on the tilt motor
    const HW = 0.98, HH = 0.74, HD = 0.46;
    const hShell = shell(HW, HH, HD, 0.07, matShellHead, 0x2f9d8c);
    hShell.position.set(0, 0.08, 0.04);
    headTilt.add(hShell);

    const cam = prep(camTpl, { anchor: "center" });
    cam.position.set(0, -0.1, 0.3);
    headTilt.add(cam);

    // OLED display — above the camera on the front face
    const dispW = 0.82, dispH = 0.34;
    const bezel = box(dispW + 0.08, dispH + 0.08, 0.04, matOLED);
    bezel.position.set(0, 0.26, HD / 2 + 0.06);
    headTilt.add(bezel);
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(dispW, dispH),
      new THREE.MeshBasicMaterial({ map: faceTex, transparent: true })
    );
    display.position.set(0, 0.26, HD / 2 + 0.11);
    headTilt.add(display);
  }

  /* --------------------------------------------------------------------
     UI — controls bind by id if present (a page provides only what it wants)
  -------------------------------------------------------------------- */
  const state = { dog: opts.dog ?? true, gait: !!opts.walk };
  const $ = (id) => document.getElementById(id);
  const segDog = $("seg-dog"), segCrab = $("seg-crab");
  function setMode(dog) { state.dog = dog; segDog && segDog.classList.toggle("active", dog); segCrab && segCrab.classList.toggle("active", !dog); }
  if (segDog) segDog.onclick = () => setMode(true);
  if (segCrab) segCrab.onclick = () => setMode(false);
  setMode(state.dog); // sync the segmented control to the default mode
  const walkEl = $("walk"); if (walkEl) { walkEl.checked = state.gait; walkEl.onchange = (e) => (state.gait = e.target.checked); }
  controls.autoRotate = !!opts.autoRotate;
  const spinEl = $("spin"); if (spinEl) { spinEl.checked = controls.autoRotate; spinEl.onchange = (e) => (controls.autoRotate = e.target.checked); }
  const resetEl = $("reset");
  if (resetEl) resetEl.onclick = () => { camera.position.copy(CAM_HOME); controls.target.copy(TARGET); controls.update(); };

  /* --------------------------------------------------------------------
     Animation — driven by setAnimationLoop so it can pause off-screen
  -------------------------------------------------------------------- */
  const clock = new THREE.Clock();
  let postureT = 0, gaitT = 0, travel = 0, elapsed = 0, lastBlink = 1;

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05); // cap so a resume after pausing doesn't jump the gait
    elapsed += dt;

    const bc = elapsed % 3.8;
    const open = bc > 3.6 ? Math.abs(Math.cos(((bc - 3.6) / 0.2) * Math.PI)) : 1;
    if (Math.abs(open - lastBlink) > 0.04) { drawFace(open); lastBlink = open; }

    const headAmp = state.gait ? 1.6 : 1;   // pan/tilt swing more while walking
    if (headPan) headPan.rotation.y = Math.sin(elapsed * 0.6) * 0.5 * headAmp;
    if (headTilt) headTilt.rotation.x = Math.sin(elapsed * 0.45) * 0.2 * headAmp;

    postureT += ((state.dog ? 1 : 0) - postureT) * Math.min(1, dt * 4);
    const g = state.dog ? GAIT.dog : GAIT.crab;
    if (state.gait) { gaitT += dt; travel += dt * g.floor; }

    const rBase = lerp(CRAB.r, DOG.r, postureT);
    const dBase = lerp(CRAB.d, DOG.d, postureT);
    const cyc = gaitT * g.cps;
    const bob = state.gait ? Math.sin(cyc * 4 * Math.PI) * 0.04 : 0;
    robot.position.y = dBase + FOOT_R - HIP_LOCAL_Y + bob;
    robot.rotation.z = state.gait && !state.dog ? Math.sin(cyc * 2 * Math.PI) * 0.05 : 0;
    robot.rotation.x = state.gait && state.dog ? Math.sin(cyc * 4 * Math.PI) * 0.022 : 0;

    grid.position.set(0, 0.003, -(travel % GRID_CELL));

    for (const leg of legs) {
      let az = lerp((leg.front ? 1 : -1) * CRAB.splay, DOG.az, postureT);
      let r = rBase, d = dBase;
      if (state.gait) {
        const u = (cyc + (state.dog ? leg.phaseDog : leg.phaseCrab)) % 1;
        const cc = gaitCycle(u, g.duty);
        d -= cc.lift * g.lift;
        if (state.dog) r -= cc.stride * g.step; else az += cc.stride * g.swing;
      }
      const { Pp, Kk } = solveLeg(r, d);
      leg.yaw.rotation.y = -leg.s * D2R(az);
      leg.hip.rotation.z = -leg.s * Pp;
      leg.knee.rotation.z = -leg.s * Kk;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  /* --------------------------------------------------------------------
     Run loop only while built AND on-screen (saves the GPU off-screen)
  -------------------------------------------------------------------- */
  let built = false, onscreen = false, running = false;
  function refresh() {
    const want = built && onscreen;
    if (want && !running) { running = true; clock.start(); renderer.setAnimationLoop(animate); }
    else if (!want && running) { running = false; renderer.setAnimationLoop(null); }
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  const io = new IntersectionObserver((es) => { onscreen = es[0].isIntersecting; refresh(); }, { threshold: 0.01 });
  io.observe(container);

  build().then(() => { built = true; refresh(); });
}
