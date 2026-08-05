// TermaLab enclosure v0.2
// Target board: Starware SKU 2968
// ESP32 WROOM-32, 30 pins, USB Type-C, CH340
// Published board size: approximately 51.5 x 28.5 mm
// Measure the purchased board before the final print.

$fn = 72;

part = "preview"; // "preview", "assembly", "bottom", or "top"

// Enclosure
outer_x = 76;
outer_y = 46;
total_h = 26;
bottom_h = 11.5;
top_h = total_h - bottom_h;

wall = 2.4;
floor_t = 2.4;
top_t = 2.4;
corner_r = 7;
fit_clearance = 0.35;

// Starware ESP32 WROOM-32 30-pin Type-C (SKU 2968)
pcb_x = 51.5;
pcb_y = 28.5;
pcb_t = 1.6;
pcb_xy_clearance = 0.60;
pcb_x0 = (outer_x - pcb_x) / 2;
pcb_y0 = (outer_y - pcb_y) / 2;

// The board shown by the seller includes downward-facing pin headers.
// The raised supports leave about 6 mm below the PCB for the pins.
pcb_support_z = 6.5;
pcb_bottom_z = floor_t + pcb_support_z;
header_pin_drop = 5.8;

// USB-C cutout. The opening is intentionally larger than the metal shell.
usb_open_w = 12.0;
usb_open_h = 6.0;
usb_open_r = usb_open_h / 2;
usb_center_z = pcb_bottom_z + pcb_t + 1.6;

// Sensor cable gland on the end opposite the USB-C port.
probe_hole_d = 8.5;
probe_center_z = floor_t + probe_hole_d / 2 + 0.5;

// Fasteners
boss_d = 6.8;
screw_clearance_d = 2.3;
screw_pilot_d = 1.8;
boss_inset = 7.2;

module rounded_box(size, radius) {
  x = size[0];
  y = size[1];
  z = size[2];

  hull() {
    for (px = [radius, x - radius])
      for (py = [radius, y - radius])
        translate([px, py, 0])
          cylinder(h = z, r = radius);
  }
}

module rounded_ring(size, radius, thickness, height) {
  difference() {
    rounded_box([size[0], size[1], height], radius);
    translate([thickness, thickness, -0.1])
      rounded_box(
        [size[0] - 2 * thickness, size[1] - 2 * thickness, height + 0.2],
        max(radius - thickness, 0.8)
      );
  }
}

module screw_positions() {
  for (px = [boss_inset, outer_x - boss_inset])
    for (py = [boss_inset, outer_y - boss_inset])
      translate([px, py, 0])
        children();
}

// Horizontal stadium-shaped opening through the wall at x = 0.
module usb_c_cutout(z_center) {
  y_center = outer_y / 2;
  center_offset = usb_open_w / 2 - usb_open_r;

  hull() {
    for (py = [y_center - center_offset, y_center + center_offset])
      translate([-1, py, z_center])
        rotate([0, 90, 0])
          cylinder(h = wall + 2, r = usb_open_r);
  }
}

module probe_cutout() {
  translate([
    outer_x - wall - 1,
    outer_y / 2,
    probe_center_z
  ])
    rotate([0, 90, 0])
      cylinder(h = wall + 2, d = probe_hole_d);
}

module pcb_cradle() {
  locator_w = 1.5;
  locator_h = 2.1;
  pad_x = 5.0;
  pad_y = 3.8;

  cradle_x0 = pcb_x0 - pcb_xy_clearance;
  cradle_y0 = pcb_y0 - pcb_xy_clearance;
  cradle_x = pcb_x + 2 * pcb_xy_clearance;
  cradle_y = pcb_y + 2 * pcb_xy_clearance;

  // Four pads lift the PCB so its downward-facing pins clear the floor.
  for (px = [
    pcb_x0 + 5.5,
    pcb_x0 + pcb_x - 5.5 - pad_x
  ])
    for (py = [
      pcb_y0 + 4.2,
      pcb_y0 + pcb_y - 4.2 - pad_y
    ])
      translate([px, py, floor_t])
        cube([pad_x, pad_y, pcb_support_z]);

  // Side locators guide the long edges without occupying the pin area.
  translate([
    cradle_x0 + 5,
    cradle_y0 - locator_w,
    pcb_bottom_z
  ])
    cube([cradle_x - 10, locator_w, locator_h]);

  translate([
    cradle_x0 + 5,
    cradle_y0 + cradle_y,
    pcb_bottom_z
  ])
    cube([cradle_x - 10, locator_w, locator_h]);

  // End stop at the antenna end. The USB-C end remains open.
  translate([
    cradle_x0 + cradle_x,
    cradle_y0 + 3,
    pcb_bottom_z
  ])
    cube([locator_w, cradle_y - 6, locator_h]);

  // Retaining tabs. Trim them after the first fit test if necessary.
  for (px = [pcb_x0 + 12, pcb_x0 + pcb_x - 15]) {
    translate([
      px,
      cradle_y0 - 1.0,
      pcb_bottom_z + locator_h
    ])
      cube([3, 1.0, 1.5]);

    translate([
      px,
      cradle_y0 + cradle_y,
      pcb_bottom_z + locator_h
    ])
      cube([3, 1.0, 1.5]);
  }
}

module bottom_shell() {
  difference() {
    union() {
      difference() {
        rounded_box([outer_x, outer_y, bottom_h], corner_r);

        translate([wall, wall, floor_t])
          rounded_box(
            [
              outer_x - 2 * wall,
              outer_y - 2 * wall,
              bottom_h - floor_t + 0.2
            ],
            corner_r - wall
          );

        usb_c_cutout(usb_center_z);
        probe_cutout();
      }

      screw_positions()
        translate([0, 0, floor_t])
          cylinder(h = bottom_h - floor_t, d = boss_d);

      pcb_cradle();
    }

    // Clearance holes for screws inserted from the underside.
    screw_positions()
      translate([0, 0, -0.1])
        cylinder(h = bottom_h + 0.2, d = screw_clearance_d);
  }
}

module top_shell() {
  lip_h = 1.8;
  lip_x = outer_x - 2 * (wall + fit_clearance);
  lip_y = outer_y - 2 * (wall + fit_clearance);
  local_usb_center_z = usb_center_z - bottom_h;

  difference() {
    union() {
      difference() {
        rounded_box([outer_x, outer_y, top_h], corner_r);

        translate([wall, wall, -0.1])
          rounded_box(
            [
              outer_x - 2 * wall,
              outer_y - 2 * wall,
              top_h - top_t + 0.1
            ],
            corner_r - wall
          );
      }

      translate([wall + fit_clearance, wall + fit_clearance, -lip_h])
        rounded_ring(
          [lip_x, lip_y],
          corner_r - wall,
          1.2,
          lip_h
        );

      screw_positions()
        cylinder(h = top_h - top_t, d = boss_d);
    }

    // Upper half of the USB-C opening crosses the enclosure seam.
    usb_c_cutout(local_usb_center_z);

    // Pilot holes for four M2 self-tapping screws.
    screw_positions()
      translate([0, 0, -0.1])
        cylinder(h = top_h - top_t + 0.2, d = screw_pilot_d);
  }
}

module reference_board() {
  // PCB
  color([0.06, 0.12, 0.11, 0.78])
    translate([pcb_x0, pcb_y0, pcb_bottom_z])
      cube([pcb_x, pcb_y, pcb_t]);

  // ESP32 metal can and antenna keep-out volume
  color([0.68, 0.70, 0.68, 0.9])
    translate([
      pcb_x0 + pcb_x - 25,
      pcb_y0 + 4.2,
      pcb_bottom_z + pcb_t
    ])
      cube([18, 20, 3.2]);

  // USB-C connector
  color([0.72, 0.74, 0.75, 0.95])
    translate([
      pcb_x0 - 2.0,
      outer_y / 2 - 4.5,
      pcb_bottom_z + pcb_t
    ])
      cube([7.2, 9.0, 3.2]);

  // Two 15-pin header rows and their downward-facing pins
  for (py = [pcb_y0 + 1.1, pcb_y0 + pcb_y - 1.1])
    for (i = [0 : 14])
      color([0.76, 0.61, 0.26, 0.9])
        translate([
          pcb_x0 + 4.0 + i * ((pcb_x - 8.0) / 14),
          py,
          pcb_bottom_z - header_pin_drop
        ])
          cylinder(h = header_pin_drop, d = 0.65);
}

module assembled_preview() {
  color([0.91, 0.88, 0.82, 0.92])
    bottom_shell();

  reference_board();

  translate([0, 0, bottom_h])
    color([0.96, 0.94, 0.89, 0.55])
      top_shell();
}

module print_preview() {
  color([0.91, 0.88, 0.82])
    bottom_shell();

  reference_board();

  translate([outer_x + 12, 0, 0])
    color([0.96, 0.94, 0.89])
      top_shell();
}

if (part == "bottom") {
  bottom_shell();
} else if (part == "top") {
  top_shell();
} else if (part == "assembly") {
  assembled_preview();
} else {
  print_preview();
}
