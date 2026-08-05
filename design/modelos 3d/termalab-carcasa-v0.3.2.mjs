// TermaLab enclosure v0.3.2
// Target: NodeMCU ESP32 WROOM-32, 38 pins, USB-C, CP2102.
// Robust solid model generated with Manifold to guarantee closed meshes.

const manifoldModule =
  process.env.TERMALAB_MANIFOLD_MODULE || "manifold-3d";
const { default: Module } = await import(manifoldModule);

const wasm = await Module();
wasm.setup();

const { CrossSection, Manifold } = wasm;

export const P = Object.freeze({
  outerX: 74,
  outerY: 44,
  totalH: 26,
  bottomH: 11.8,
  topH: 14.2,
  wall: 2.4,
  floorT: 2.4,
  topT: 2.4,
  cornerR: 6,
  fit: 0.4,
  lipH: 1.8,
  lipT: 1.2,

  pcbX: 51,
  pcbY: 25,
  pcbT: 1.6,
  pcbClearance: 0.7,
  pcbLeftGap: 4.8,
  pcbSupportH: 6.8,

  usbW: 12.2,
  usbH: 6.2,
  probeD: 9.2,

  bossD: 6.4,
  bossInsetX: 6,
  bossInsetY: 6,
  screwClearanceD: 2.4,
  screwHeadD: 4.6,
  screwHeadDepth: 1.4,
  screwPilotD: 1.8,
  screwPilotDepth: 8,

  circularSegments: 48,
  solidOverlap: 0.3,
});

function unionAll(solids) {
  return Manifold.union(solids);
}

function subtractAll(solid, cutters) {
  return Manifold.difference([solid, ...cutters]);
}

function roundedRectangle2D(sizeX, sizeY, radius) {
  const r = Math.min(radius, sizeX / 2, sizeY / 2);
  const pieces = [
    CrossSection.square([sizeX - 2 * r, sizeY], true),
    CrossSection.square([sizeX, sizeY - 2 * r], true),
  ];

  for (const x of [-sizeX / 2 + r, sizeX / 2 - r]) {
    for (const y of [-sizeY / 2 + r, sizeY / 2 - r]) {
      pieces.push(
        CrossSection.circle(r, P.circularSegments).translate([x, y]),
      );
    }
  }
  return CrossSection.union(pieces);
}

function roundedPrism(size, radius, center) {
  return roundedRectangle2D(size[0], size[1], radius)
    .extrude(size[2])
    .translate([
      center[0],
      center[1],
      center[2] - size[2] / 2,
    ]);
}

function box(size, center) {
  return Manifold.cube(size, true).translate(center);
}

function zCylinder(diameter, height, center, segments = P.circularSegments) {
  return Manifold.cylinder(
    height,
    diameter / 2,
    diameter / 2,
    segments,
    true,
  ).translate(center);
}

function xCylinder(diameter, length, center, segments = P.circularSegments) {
  return Manifold.cylinder(
    length,
    diameter / 2,
    diameter / 2,
    segments,
    true,
  )
    .rotate([0, 90, 0])
    .translate(center);
}

function screwPositions() {
  return [
    [-P.outerX / 2 + P.bossInsetX, -P.outerY / 2 + P.bossInsetY],
    [-P.outerX / 2 + P.bossInsetX, P.outerY / 2 - P.bossInsetY],
    [P.outerX / 2 - P.bossInsetX, -P.outerY / 2 + P.bossInsetY],
    [P.outerX / 2 - P.bossInsetX, P.outerY / 2 - P.bossInsetY],
  ];
}

function roundedSideOpening(center) {
  const depth = P.wall + 4;
  const radius = 2.1;
  const pieces = [
    box(
      [depth, P.usbW - 2 * radius, P.usbH],
      center,
    ),
    box(
      [depth, P.usbW, P.usbH - 2 * radius],
      center,
    ),
  ];

  for (const y of [-P.usbW / 2 + radius, P.usbW / 2 - radius]) {
    for (const z of [-P.usbH / 2 + radius, P.usbH / 2 - radius]) {
      pieces.push(
        xCylinder(
          2 * radius,
          depth,
          [center[0], center[1] + y, center[2] + z],
        ),
      );
    }
  }

  return unionAll(pieces);
}

function pcbCoordinates() {
  const left = -P.outerX / 2 + P.pcbLeftGap;
  const right = left + P.pcbX;
  const bottom = -P.pcbY / 2;
  const top = P.pcbY / 2;
  const boardZ = P.floorT + P.pcbSupportH;
  return { left, right, bottom, top, boardZ };
}

function pcbCradle() {
  const { left, right, bottom, top, boardZ } = pcbCoordinates();
  const locatorT = 1.5;
  const locatorH = 2;
  const railLength = P.pcbX - 10;
  const supportBottom = P.floorT - P.solidOverlap;
  const locatorTop = boardZ + locatorH;
  const locatorTotalH = locatorTop - supportBottom;

  const supports = [];
  for (const x of [left + 8, right - 8]) {
    for (const y of [bottom + 5, top - 5]) {
      supports.push(
        box(
          [5, 3.6, boardZ - supportBottom],
          [x, y, (supportBottom + boardZ) / 2],
        ),
      );
    }
  }

  supports.push(
    box(
      [railLength, locatorT, locatorTotalH],
      [
        (left + right) / 2,
        bottom - P.pcbClearance - locatorT / 2,
        (supportBottom + locatorTop) / 2,
      ],
    ),
    box(
      [railLength, locatorT, locatorTotalH],
      [
        (left + right) / 2,
        top + P.pcbClearance + locatorT / 2,
        (supportBottom + locatorTop) / 2,
      ],
    ),
    box(
      [locatorT, P.pcbY - 6, locatorTotalH],
      [
        right + P.pcbClearance + locatorT / 2,
        0,
        (supportBottom + locatorTop) / 2,
      ],
    ),
  );

  for (const x of [left + 15, right - 15]) {
    supports.push(
      box(
        [3.2, 1.4, 1.4],
        [
          x,
          bottom - P.pcbClearance + 0.2,
          boardZ + locatorH + 0.55,
        ],
      ),
      box(
        [3.2, 1.4, 1.4],
        [
          x,
          top + P.pcbClearance - 0.2,
          boardZ + locatorH + 0.55,
        ],
      ),
    );
  }

  return unionAll(supports);
}

export function bottomShell() {
  const outer = roundedPrism(
    [P.outerX, P.outerY, P.bottomH],
    P.cornerR,
    [0, 0, P.bottomH / 2],
  );
  const cavityH = P.bottomH - P.floorT + 0.5;
  const cavity = roundedPrism(
    [P.outerX - 2 * P.wall, P.outerY - 2 * P.wall, cavityH],
    P.cornerR - P.wall,
    [0, 0, P.floorT + cavityH / 2],
  );
  const shell = outer.subtract(cavity);

  const bossBottom = P.floorT - P.solidOverlap;
  const bossTop = P.bottomH;
  const bosses = screwPositions().map(([x, y]) =>
    zCylinder(
      P.bossD,
      bossTop - bossBottom,
      [x, y, (bossBottom + bossTop) / 2],
    ),
  );

  let solid = unionAll([shell, ...bosses, pcbCradle()]);
  const { boardZ } = pcbCoordinates();
  const usbCenterZ = boardZ + P.pcbT + 1.6;

  const cutters = [
    roundedSideOpening([-P.outerX / 2, 0, usbCenterZ]),
    xCylinder(
      P.probeD,
      P.wall + 4,
      [
        P.outerX / 2,
        0,
        P.floorT + P.probeD / 2 + 0.5,
      ],
      64,
    ),
  ];

  for (const [x, y] of screwPositions()) {
    cutters.push(
      zCylinder(
        P.screwClearanceD,
        P.bottomH + 1,
        [x, y, P.bottomH / 2],
      ),
      zCylinder(
        P.screwHeadD,
        P.screwHeadDepth + 0.4,
        [x, y, P.screwHeadDepth / 2 - 0.05],
      ),
    );
  }

  solid = subtractAll(solid, cutters);
  return solid.simplify(0.001).asOriginal();
}

function lipRing() {
  const overlap = 0.4;
  const ringH = P.lipH + overlap;
  const ringCenterZ = (-P.lipH + overlap) / 2;
  const outerX = P.outerX - 2 * (P.wall + P.fit);
  const outerY = P.outerY - 2 * (P.wall + P.fit);

  const outer = roundedPrism(
    [outerX, outerY, ringH],
    P.cornerR - P.wall,
    [0, 0, ringCenterZ],
  );
  const inner = roundedPrism(
    [outerX - 2 * P.lipT, outerY - 2 * P.lipT, ringH + 0.6],
    Math.max(P.cornerR - P.wall - P.lipT, 0.8),
    [0, 0, ringCenterZ],
  );
  return outer.subtract(inner);
}

function interfaceFlangeRing() {
  const bridgeOverlap = 0.3;
  const flangeH = 0.6;
  const lipOuterX = P.outerX - 2 * (P.wall + P.fit);
  const lipOuterY = P.outerY - 2 * (P.wall + P.fit);
  const outerX = P.outerX - 2 * (P.wall - bridgeOverlap);
  const outerY = P.outerY - 2 * (P.wall - bridgeOverlap);
  const innerX = lipOuterX - 2 * P.lipT;
  const innerY = lipOuterY - 2 * P.lipT;

  const outer = roundedPrism(
    [outerX, outerY, flangeH],
    P.cornerR - P.wall + bridgeOverlap,
    [0, 0, flangeH / 2],
  );
  const inner = roundedPrism(
    [innerX, innerY, flangeH + 0.6],
    Math.max(P.cornerR - P.wall - P.lipT, 0.8),
    [0, 0, flangeH / 2],
  );
  return outer.subtract(inner);
}

export function topShellAssemblyOrientation() {
  const outer = roundedPrism(
    [P.outerX, P.outerY, P.topH],
    P.cornerR,
    [0, 0, P.topH / 2],
  );
  const cavityBottom = -0.4;
  const cavityTop = P.topH - P.topT;
  const cavity = roundedPrism(
    [
      P.outerX - 2 * P.wall,
      P.outerY - 2 * P.wall,
      cavityTop - cavityBottom,
    ],
    P.cornerR - P.wall,
    [0, 0, (cavityBottom + cavityTop) / 2],
  );
  const shell = outer.subtract(cavity);

  const bossTop = cavityTop + P.solidOverlap;
  const bosses = screwPositions().map(([x, y]) =>
    zCylinder(P.bossD, bossTop, [x, y, bossTop / 2]),
  );

  let solid = unionAll([
    shell,
    lipRing(),
    interfaceFlangeRing(),
    ...bosses,
  ]);

  const { boardZ } = pcbCoordinates();
  const usbCenterZ = boardZ + P.pcbT + 1.6 - P.bottomH;
  const cutters = [
    roundedSideOpening([-P.outerX / 2, 0, usbCenterZ]),
  ];

  for (const [x, y] of screwPositions()) {
    cutters.push(
      zCylinder(
        P.screwPilotD,
        P.screwPilotDepth + 0.4,
        [x, y, P.screwPilotDepth / 2 - 0.1],
      ),
    );
  }

  solid = subtractAll(solid, cutters);
  return solid.simplify(0.001).asOriginal();
}

export function topShellPrintOrientation() {
  return topShellAssemblyOrientation()
    .rotate([180, 0, 0])
    .translate([0, 0, P.topH])
    .asOriginal();
}

export function printPlate() {
  const gap = 10;
  const bottom = bottomShell().translate([
    -(P.outerX + gap) / 2,
    0,
    0,
  ]);
  const top = topShellPrintOrientation().translate([
    (P.outerX + gap) / 2,
    0,
    0,
  ]);
  return Manifold.union([bottom, top]).asOriginal();
}

export function modelStats() {
  const bottom = bottomShell();
  const top = topShellPrintOrientation();
  const plate = printPlate();

  return {
    version: "v0.3.2",
    parameters: P,
    bottomBounds: bottom.boundingBox(),
    topPrintBounds: top.boundingBox(),
    plateBounds: plate.boundingBox(),
    bottomVolumeMm3: bottom.volume(),
    topVolumeMm3: top.volume(),
    bottomSurfaceAreaMm2: bottom.surfaceArea(),
    topSurfaceAreaMm2: top.surfaceArea(),
    bottomTriangleCount: bottom.numTri(),
    topTriangleCount: top.numTri(),
    bottomConnectedComponents: bottom.decompose().length,
    topConnectedComponents: top.decompose().length,
    plateConnectedComponents: plate.decompose().length,
  };
}
