// Source rectangles and silhouette-relative hitboxes from SPRITE_ANALYSIS.md.
// Rectangles are [x, y, width, height] in the unchanged source PNGs.
window.SPRITE_CONFIG = {
  caleb: {
    image: 'Caleb.png',
    frames: {
      idle: { rect: [52, 210, 233, 402], hit: [0.14, 0.04, 0.76, 0.94] },
      run1: { rect: [359, 222, 240, 390], hit: [0.13, 0.05, 0.78, 0.92] },
      run2: { rect: [665, 235, 239, 378], hit: [0.13, 0.06, 0.78, 0.91] },
      jump: { rect: [951, 158, 260, 345], hit: [0.10, 0.06, 0.82, 0.88] },
      duck1: { rect: [1230, 302, 265, 310], hit: [0.08, 0.10, 0.86, 0.86] },
      duck2: { rect: [1520, 332, 261, 280], hit: [0.08, 0.10, 0.86, 0.86] },
      crash: { rect: [1815, 430, 315, 185], hit: null },
    },
    scale: 0.21,
  },
  wanderers: {
    image: 'Wanderers.png',
    types: {
      basalt: { category: 'small', frames: [[63,106,249,220],[374,104,277,220]], hit: [0.08,0.14,0.84,0.80], scale: 0.34 },
      patrol: { category: 'small', frames: [[721,143,321,206],[1085,139,314,210]], hit: [0.06,0.16,0.88,0.78], scale: 0.31, groundOffset: 8 },
      charybdisRex: { category: 'large', frames: [[1452,34,340,315],[1815,62,336,287]], hit: [0.05,0.12,0.90,0.84], scale: 0.30, groundOffset: 8 },
      petroGolem: { category: 'large', frames: [[28,405,313,269],[374,425,310,249]], hit: [0.06,0.10,0.88,0.86], scale: 0.31 },
      galewings: { category: 'air', frames: [[744,370,292,325],[1093,447,321,248]], hit: [0.05,0.10,0.90,0.82], scale: 0.28 },
      spurtail: { category: 'air', frames: [[1467,404,313,256],[1827,425,313,249]], hit: [0.05,0.10,0.90,0.82], scale: 0.29 },
    },
  },
};
