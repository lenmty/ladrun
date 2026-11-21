# Sprite sheet analysis

Source PNG files are preserved unchanged. Measurements below use pixel coordinates with origin at the upper-left; rectangles are half-open `[x, y, width, height]`. Both files are RGBA, 2172 × 724 px, with an alpha channel. The sheets are not regular packed sprite sheets: use explicit source rectangles and preserve each frame's bottom alignment rather than assuming equal-sized cells.

## Caleb.png

Visually, one horizontal sequence of seven Caleb poses, left to right:

| Order | State | Approximate source rectangle | Use |
|---:|---|---|---|
| 1 | Idle | `[52, 210, 233, 402]` | Title / ready state |
| 2 | Run 1 | `[359, 222, 240, 390]` | Alternate running frame |
| 3 | Run 2 | `[665, 235, 239, 378]` | Alternate running frame |
| 4 | Jump | `[951, 158, 260, 345]` | Airborne; excludes detached particles below/left |
| 5 | Duck 1 | `[1230, 302, 265, 310]` | Duck animation frame 1 |
| 6 | Duck 2 | `[1520, 332, 261, 280]` | Duck animation frame 2 |
| 7 | Crash | `[1815, 430, 315, 185]` | Collision state; crop excludes the detached punctuation above Caleb |

The sprite silhouettes have noticeably different heights and widths; these are tight visual bounds, rounded to practical pixel coordinates, rather than uniform source cells. The PNG alpha extent overall is `(43, 0)–(2152, 724)`: a few isolated opaque pixels/particles sit outside the main poses (including near the top of Jump and beneath it). Do not use the whole sheet as a frame. For a robust extractor, keep explicit per-pose rectangles and optionally a per-frame alpha crop generated from each rectangle, retaining the original rectangle origin as an anchor offset.

Grounded poses share a bottom baseline at about y=623; Jump is lifted and Crash is lower/lying down. Anchor grounded poses by their visible feet, not by the sprite sheet's full 724 px height. Duck frames have shorter silhouettes, so align their feet to the same ground baseline. Jump's vertical position is controlled by gameplay physics.

## Wanderers.png

Six species in a 3-column × 2-row visual arrangement. Each species has two animation frames side by side. Order is left-to-right on the first row, then left-to-right on the second row:

| Pair | Species | Approximate frame rectangles (frame 1; frame 2) | Category |
|---:|---|---|---|
| 1 | Basalt | `[63, 106, 249, 220]`; `[374, 104, 277, 220]` | Small ground |
| 2 | Patrol | `[721, 143, 321, 206]`; `[1085, 139, 314, 210]` | Small ground |
| 3 | Charybdis Rex | `[1452, 34, 340, 315]`; `[1815, 62, 336, 287]` | Large ground |
| 4 | Petro Golem | `[28, 405, 313, 269]`; `[374, 425, 310, 249]` | Large ground; first frame trimmed to visible feet |
| 5 | Galewings | `[744, 370, 292, 325]`; `[1093, 447, 321, 248]` | Air |
| 6 | Spurtail | `[1467, 404, 313, 256]`; `[1827, 425, 313, 249]` | Air |

The table bounds are tight visual silhouette estimates based on the alpha content; frame-pair spacing is not uniform. Frame pairs animate by alternating the two explicit rectangles while that obstacle is active. Ground creatures should align their bottom silhouette edge to the ground line. Airborne creatures should use an explicit center anchor so the three gameplay heights remain predictable. Dimensions should be scaled uniformly per species/category; retain each creature's aspect ratio.

Patrol's source frame windows include about 15 transparent pixels below the visible feet. In the game configuration, its ground anchor is lowered by 8 logical canvas pixels to place both animation frames on the surface.

Charybdis Rex is also offset 8 logical canvas pixels downward so its small rear feet meet the surface; its front claws may extend below the ground line.

The medium flight band uses a narrower vertical collision region and is positioned to leave a clear lane for ducking, with a second lane above it for a full-height held jump. Crash resets Caleb's vertical position to the ground before drawing the terminal pose.

The global alpha bounding box touches the image edges because several pixels at the outer boundary are opaque; do not interpret that as a full-canvas sprite. There are transparent gutters between most figures. Source is black/transparent behind pixel art; preserve alpha.

## Recommended extraction and rendering

- Load each PNG once; use a small metadata/config object containing source rectangle, anchor, category, animation pair, and collision inset per frame/species.
- Draw source rectangles directly from the original image (canvas `drawImage` source rectangle), or create in-memory cropped canvases after preload. No exported or modified replacement PNG is needed.
- Set canvas `imageSmoothingEnabled = false`; choose integer display scale where the viewport permits, and keep aspect ratio.
- Position by foot/bottom anchors, not by transparent sprite-sheet cells. The visible bounds above should seed later hitboxes, with modest silhouette insets tuned against the displayed pixels.
- For gameplay, use mutually exclusive Caleb states (`idle`, `run`, `jump`, `duck`, `crash`); alternate run/duck frames on a timer and alternate each Wanderer pair while on screen.
- The `Crash` pose is terminal: disable collision checks when entering it; it has no hitbox.
