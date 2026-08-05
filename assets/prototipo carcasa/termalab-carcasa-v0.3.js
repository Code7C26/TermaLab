// TermaLab enclosure v0.3.1
// Target: NodeMCU ESP32 WROOM-32, 38 pins, USB-C, CP2102.
// Published board dimensions: approximately 51 x 25 mm.
// Revision 0.3.1 fuses all supports and lid lips into manifold solids.

const {
  booleans: { subtract, union },
  extrusions: { extrudeLinear },
  measurements: { measureArea, measureBoundingBox, measureVolume },
  primitives: { cuboid, cylinder, roundedRectangle },
  transforms: { rotateX, rotateY, rotateZ, translate },
} = require("@jscad/modeling");

const P = Object.freeze({
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
  pinDrop: 5.8,

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
});

const roundedBox = (size, radius, center = [0, 0, 0]) =>
  translate(
    [center[0], center[1], center[2] - size[2] / 2],
    extrudeLinear(
      { height: size[2] },
      roundedRectangle({
        size: [size[0], size[1]],
        roundRadius: radius,
        segments: 48,
      }),
    ),
  );

const box = (size, center) => cuboid({ size, center });

const zCylinder = (diameter, height, center, segments = 48) =>
  cylinder({
    radius: diameter / 2,
    height,
    center,
    segments,
  });

function screwPositions() {
  return [
    [-P.outerX / 2 + P.bossInsetX, -P.outerY / 2 + P.bossInsetY],
    [-P.outerX / 2 + P.bossInsetX, P.outerY / 2 - P.bossInsetY],
    [P.outerX / 2 - P.bossInsetX, -P.outerY / 2 + P.bossInsetY],
    [P.outerX / 2 - P.bossInsetX, P.outerY / 2 - P.bossInsetY],
  ];
}

function usbCutout(centerZ) {
  const depth = P.wall + 4;
  const profile = roundedRectangle({
    size: [P.usbW, P.usbH],
    roundRadius: 2.6,
    segments: 48,
  });
  const local = translate(
    [0, 0, -depth / 2],
    extrudeLinear({ height: depth }, profile),
  );
  return translate(
    [-P.outerX / 2, 0, centerZ],
    rotateZ(Math.PI / 2, rotateX(Math.PI / 2, local)),
  );
}

function probeCutout() {
  const hole = cylinder({
    radius: P.probeD / 2,
    height: P.wall + 4,
    center: [0, 0, 0],
    segments: 64,
  });
  return translate(
    [P.outerX / 2, 0, P.floorT + P.probeD / 2 + 0.5],
    rotateY(Math.PI / 2, hole),
  );
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
  const padX = 5;
  const padY = 3.6;
  const padZ = P.pcbSupportH;
  const locatorT = 1.5;
  const locatorH = 2.0;
  const locatorTotalH = P.pcbSupportH + locatorH;
  const railLength = P.pcbX - 10;

  const pads = [];
  for (const x of [left + 8, right - 8]) {
    for (const y of [bottom + 5, top - 5]) {
      pads.push(
        box(
          [padX, padY, padZ],
          [x, y, P.floorT + padZ / 2],
        ),
      );
    }
  }

  const rails = [
    box(
      [railLength, locatorT, locatorTotalH],
      [
        (left + right) / 2,
        bottom - P.pcbClearance - locatorT / 2,
        P.floorT + locatorTotalH / 2,
      ],
    ),
    box(
      [railLength, locatorT, locatorTotalH],
      [
        (left + right) / 2,
        top + P.pcbClearance + locatorT / 2,
        P.floorT + locatorTotalH / 2,
      ],
    ),
    box(
      [locatorT, P.pcbY - 6, locatorTotalH],
      [
        right + P.pcbClearance + locatorT / 2,
        0,
        P.floorT + locatorTotalH / 2,
      ],
    ),
  ];

  // Small printable retaining nubs above the long edges.
  const tabs = [];
  for (const x of [left + 15, right - 15]) {
    tabs.push(
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

  return union(...pads, ...rails, ...tabs);
}

function bottomShell() {
  const outer = roundedBox(
    [P.outerX, P.outerY, P.bottomH],
    P.cornerR,
    [0, 0, P.bottomH / 2],
  );

  const cavityH = P.bottomH - P.floorT + 0.4;
  const cavity = roundedBox(
    [P.outerX - 2 * P.wall, P.outerY - 2 * P.wall, cavityH],
    P.cornerR - P.wall,
    [0, 0, P.floorT + cavityH / 2],
  );

  const bossH = P.bottomH - P.floorT;
  const bosses = screwPositions().map(([x, y]) =>
    zCylinder(
      P.bossD,
      bossH,
      [x, y, P.floorT + bossH / 2],
    ),
  );

  let solid = union(subtract(outer, cavity), ...bosses, pcbCradle());

  const { boardZ } = pcbCoordinates();
  const usbCenterZ = boardZ + P.pcbT + 1.6;
  const screwHoles = screwPositions().map(([x, y]) =>
    zCylinder(
      P.screwClearanceD,
      P.bottomH + 0.4,
      [x, y, P.bottomH / 2],
    ),
  );
  const headRecesses = screwPositions().map(([x, y]) =>
    zCylinder(
      P.screwHeadD,
      P.screwHeadDepth + 0.2,
      [x, y, P.screwHeadDepth / 2 - 0.05],
    ),
  );

  solid = subtract(
    solid,
    usbCutout(usbCenterZ),
    probeCutout(),
    ...screwHoles,
    ...headRecesses,
  );

  return solid;
}

function lipRing() {
  const overlap = 0.4;
  const ringH = P.lipH + overlap;
  const ringCenterZ = (-P.lipH + overlap) / 2;
  const outerX = P.outerX - 2 * (P.wall + P.fit);
  const outerY = P.outerY - 2 * (P.wall + P.fit);
  const outer = roundedBox(
    [outerX, outerY, ringH],
    P.cornerR - P.wall,
    [0, 0, ringCenterZ],
  );
  const inner = roundedBox(
    [
      outerX - 2 * P.lipT,
      outerY - 2 * P.lipT,
      ringH + 0.4,
    ],
    Math.max(P.cornerR - P.wall - P.lipT, 0.8),
    [0, 0, ringCenterZ],
  );
  return subtract(outer, inner);
}

function interfaceFlangeRing() {
  // Horizontal flange that physically joins the inset lip to the lid wall.
  // The slight overlap removes coplanar-only contacts that slicers can flag.
  const bridgeOverlap = 0.3;
  const flangeH = 0.6;
  const lipOuterX = P.outerX - 2 * (P.wall + P.fit);
  const lipOuterY = P.outerY - 2 * (P.wall + P.fit);
  const outerX = P.outerX - 2 * (P.wall - bridgeOverlap);
  const outerY = P.outerY - 2 * (P.wall - bridgeOverlap);
  const innerX = lipOuterX - 2 * P.lipT;
  const innerY = lipOuterY - 2 * P.lipT;

  const outer = roundedBox(
    [outerX, outerY, flangeH],
    P.cornerR - P.wall + bridgeOverlap,
    [0, 0, flangeH / 2],
  );
  const inner = roundedBox(
    [innerX, innerY, flangeH + 0.4],
    Math.max(P.cornerR - P.wall - P.lipT, 0.8),
    [0, 0, flangeH / 2],
  );
  return subtract(outer, inner);
}

function topShellAssemblyOrientation() {
  const outer = roundedBox(
    [P.outerX, P.outerY, P.topH],
    P.cornerR,
    [0, 0, P.topH / 2],
  );

  const cavityH = P.topH - P.topT + 0.4;
  const cavity = roundedBox(
    [P.outerX - 2 * P.wall, P.outerY - 2 * P.wall, cavityH],
    P.cornerR - P.wall,
    [0, 0, cavityH / 2 - 0.2],
  );

  const bossH = P.topH - P.topT;
  const bosses = screwPositions().map(([x, y]) =>
    zCylinder(P.bossD, bossH, [x, y, bossH / 2]),
  );

  let solid = union(
    subtract(outer, cavity),
    lipRing(),
    interfaceFlangeRing(),
    ...bosses,
  );

  const { boardZ } = pcbCoordinates();
  const usbCenterZ = boardZ + P.pcbT + 1.6 - P.bottomH;
  const pilotHoles = screwPositions().map(([x, y]) =>
    zCylinder(
      P.screwPilotD,
      P.screwPilotDepth + 0.2,
      [x, y, P.screwPilotDepth / 2 - 0.05],
    ),
  );

  solid = subtract(solid, usbCutout(usbCenterZ), ...pilotHoles);
  return solid;
}

function topShellPrintOrientation() {
  // Closed exterior face on the bed; open side and lip point upward.
  return translate(
    [0, 0, P.topH],
    rotateX(Math.PI, topShellAssemblyOrientation()),
  );
}

function printPlate() {
  const gap = 10;
  const bottom = translate(
    [-(P.outerX + gap) / 2, 0, 0],
    bottomShell(),
  );
  const top = translate(
    [(P.outerX + gap) / 2, 0, 0],
    topShellPrintOrientation(),
  );
  return union(bottom, top);
}

function boardReference() {
  const { left, right, boardZ } = pcbCoordinates();
  const pcb = box(
    [P.pcbX, P.pcbY, P.pcbT],
    [(left + right) / 2, 0, boardZ + P.pcbT / 2],
  );
  const connector = box(
    [7.4, 9.2, 3.2],
    [left + 1.7, 0, boardZ + P.pcbT + 1.6],
  );
  return union(pcb, connector);
}

function assemblyPreview() {
  const top = translate(
    [0, 0, P.bottomH],
    topShellAssemblyOrientation(),
  );
  return [bottomShell(), boardReference(), top];
}

function getParameterDefinitions() {
  return [
    {
      name: "part",
      type: "choice",
      caption: "Part",
      values: ["plate", "bottom", "top", "assembly"],
      captions: ["Print plate", "Bottom", "Top", "Assembly preview"],
      initial: "plate",
    },
  ];
}

function main(params = {}) {
  const part = params.part || "plate";
  if (part === "bottom") return bottomShell();
  if (part === "top") return topShellPrintOrientation();
  if (part === "assembly") return assemblyPreview();
  return printPlate();
}

function modelStats() {
  const bottom = bottomShell();
  const top = topShellPrintOrientation();
  const plate = printPlate();
  return {
    parameters: P,
    bottomBounds: measureBoundingBox(bottom),
    topPrintBounds: measureBoundingBox(top),
    plateBounds: measureBoundingBox(plate),
    bottomVolumeMm3: measureVolume(bottom),
    topVolumeMm3: measureVolume(top),
    bottomSurfaceAreaMm2: measureArea(bottom),
    topSurfaceAreaMm2: measureArea(top),
    bottomPolygonCount: bottom.polygons.length,
    topPolygonCount: top.polygons.length,
  };
}

module.exports = {
  main,
  getParameterDefinitions,
  bottomShell,
  topShellAssemblyOrientation,
  topShellPrintOrientation,
  printPlate,
  modelStats,
};
