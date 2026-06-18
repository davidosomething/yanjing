// ===========================================================================
// KWin Mocks — Plasma 6 two-argument clientArea API
// ===========================================================================

global.print = jest.fn();

global.readConfig = jest.fn().mockImplementation(function (key, defaults) {
  return defaults;
});

global.registerShortcut = jest.fn();

global.KWin = {
  PlacementArea: 0,
};

const RIGHT_SIDEBAR_WIDTH = 72;
const SCREEN_FULL_WIDTH = 1920;
const SCREEN_FULL_HEIGHT = 1080;

// PlacementArea as returned by clientArea (already global coordinates)
const PLACEMENT_AREA = {
  x: 64,
  y: 32,
  width: SCREEN_FULL_WIDTH - RIGHT_SIDEBAR_WIDTH,
  height: SCREEN_FULL_HEIGHT - 32 - 32,
};

global.workspace = {
  activeWindow: {
    desktopWindow: false,
  },
  clientArea: jest
    .fn()
    .mockImplementation(function (option, window) {
      return PLACEMENT_AREA;
    }),
};

const WORK_AREA = PLACEMENT_AREA;

// ===========================================================================

require('./main.js');

// ===========================================================================
// Top-level
// ===========================================================================

it('has Yanjing', () => {
  expect(Yanjing).toBeTruthy();
});

it('calls registerShortcut in main', () => {
  Yanjing.main();
  expect(global.registerShortcut).toHaveBeenCalledTimes(21);
});

// ===========================================================================
// sanitizeSizes
// ===========================================================================

describe('sanitizeSizes', () => {
  it('returns array of filtered floats', () => {
    expect(Yanjing.sanitizeSizes('0, 5, 10, x, 111.111, 0, 222.333')).toEqual([
      5, 10, 111.111, 222.333,
    ]);
  });
});

// ===========================================================================
// getWorkAreaRect
// ===========================================================================

describe('getWorkAreaRect', () => {
  it('returns clientArea directly (already global coordinates)', () => {
    const rect = Yanjing.getWorkAreaRect();
    expect(rect).toEqual(WORK_AREA);
  });

  it('calls clientArea with two arguments (option, activeWindow)', () => {
    Yanjing.getWorkAreaRect();
    expect(global.workspace.clientArea).toHaveBeenCalledWith(
      global.KWin.PlacementArea,
      global.workspace.activeWindow,
    );
  });
});

// ===========================================================================
// sizeToWidth
// ===========================================================================

describe('sizeToWidth', () => {
  const HALF_SCREEN = WORK_AREA.width / 2;

  it.each`
    size       | expected
    ${33.333}  | ${615.99384}
    ${50}      | ${HALF_SCREEN}
  `('$size% → $expected px', ({ size, expected }) => {
    expect(Yanjing.sizeToWidth(size)).toBeCloseTo(expected);
  });
});

// ===========================================================================
// widthToSizeIndex
// ===========================================================================

describe('widthToSizeIndex', () => {
  const HALF_SCREEN = WORK_AREA.width / 2;

  it.each`
    width         | expectedSize
    ${640}        | ${33.3333}
    ${HALF_SCREEN} | ${50}
  `('${width}px → nearest size $expectedSize%', ({ width, expectedSize }) => {
    expect(Yanjing.widthToSizeIndex(width)).toBe(
      Yanjing.Sizes.findIndex((s) => s === expectedSize),
    );
  });
});

// ===========================================================================
// getNextI
// ===========================================================================

describe('getNextI', () => {
  const len = 5;

  describe('wrap-around at end', () => {
    it.each`
      label               | i
      ${'last index'}     | ${len - 1}
      ${'past last'}      | ${len}
      ${'way past last'}  | ${len + 1}
    `('returns 0 for $label ($i)', ({ i }) => {
      expect(Yanjing.getNextI(i, len)).toBe(0);
    });
  });

  it.each`
    label      | i    | expected
    ${'first'} | ${0} | ${1}
    ${'second'} | ${1} | ${2}
  `('returns $expected for $label index ($i)', ({ i, expected }) => {
    expect(Yanjing.getNextI(i, len)).toBe(expected);
  });
});

// ===========================================================================
// getNextWidth
// ===========================================================================

describe('getNextWidth', () => {
  it.each`
    currentWidth | expected   | precision
    ${1440}      | ${1231}    | ${0}
    ${1280}      | ${924}     | ${0}
    ${640}       | ${462}     | ${0}
    ${480}       | ${1386}    | ${0}
  `('$currentWidth px → ~$expected px', ({ currentWidth, expected, precision }) => {
    expect(Yanjing.getNextWidth(currentWidth)).toBeCloseTo(expected, precision);
  });

  it('rounds middling widths consistently', () => {
    expect(Yanjing.getNextWidth(960)).toBeGreaterThan(614);
    expect(Yanjing.getNextWidth(960)).toBeLessThan(617);
  });
});

// ===========================================================================
// unmax
// ===========================================================================

describe('unmax', () => {
  it('calls setMaximize(false, false)', () => {
    const setMaximize = jest.fn();
    Yanjing.unmax({ setMaximize });
    expect(setMaximize).toHaveBeenCalledWith(false, false);
  });

  it('does nothing if setMaximize is not a function', () => {
    expect(() => Yanjing.unmax({})).not.toThrow();
  });
});

// ===========================================================================
// applyTransforms
// ===========================================================================

describe('applyTransforms', () => {
  const base = { x: 10, y: 20, width: 100, height: 200 };

  it('returns base unchanged with no transforms', () => {
    expect(Yanjing.applyTransforms(base, [])).toEqual(base);
  });

  it('returns base unchanged with null transforms', () => {
    expect(Yanjing.applyTransforms(base, [null, null])).toEqual(base);
  });

  it('applies partial x transform', () => {
    expect(Yanjing.applyTransforms(base, [{ x: 50 }])).toEqual({
      x: 50, y: 20, width: 100, height: 200,
    });
  });

  it('later transforms override earlier ones', () => {
    expect(Yanjing.applyTransforms(base, [{ x: 50 }, { x: 99 }])).toEqual({
      x: 99, y: 20, width: 100, height: 200,
    });
  });

  it('applies multiple properties across transforms', () => {
    expect(Yanjing.applyTransforms(base, [
      { y: 0, height: 300 },
      { x: 0 },
    ])).toEqual({
      x: 0, y: 0, width: 100, height: 300,
    });
  });

  it('does not mutate the base object', () => {
    const copy = { ...base };
    Yanjing.applyTransforms(base, [{ x: 999 }]);
    expect(base).toEqual(copy);
  });
});

// ===========================================================================
// Move transforms
// ===========================================================================

describe('getMoveLeftTransform', () => {
  it('returns null if already flush left', () => {
    expect(Yanjing.getMoveLeftTransform(
      { x: WORK_AREA.x, y: 0, width: 500, height: 400 },
      WORK_AREA,
    )).toBeNull();
  });

  it('returns x transform if not flush', () => {
    expect(Yanjing.getMoveLeftTransform(
      { x: 200, y: 0, width: 500, height: 400 },
      WORK_AREA,
    )).toEqual({ x: WORK_AREA.x });
  });
});

describe('getMoveRightTransform', () => {
  it('returns null if already flush right', () => {
    const geo = { x: WORK_AREA.x + WORK_AREA.width - 500, y: 0, width: 500, height: 400 };
    expect(Yanjing.getMoveRightTransform(geo, WORK_AREA)).toBeNull();
  });

  it('returns x transform if not flush', () => {
    const geo = { x: 100, y: 0, width: 500, height: 400 };
    expect(Yanjing.getMoveRightTransform(geo, WORK_AREA)).toEqual({
      x: WORK_AREA.x + WORK_AREA.width - 500,
    });
  });
});

describe('getMoveCenterTransform', () => {
  it('returns null if already centered', () => {
    const width = 120;
    const centeredX = WORK_AREA.x + WORK_AREA.width / 2 - width / 2;
    expect(Yanjing.getMoveCenterTransform(
      { x: centeredX, y: 0, width, height: 400 },
      WORK_AREA,
    )).toBeNull();
  });

  it('returns x transform if not centered', () => {
    const geo = { x: 100, y: 0, width: 200, height: 400 };
    const result = Yanjing.getMoveCenterTransform(geo, WORK_AREA);
    expect(result).not.toBeNull();
    expect(result.x).toBe(WORK_AREA.x + WORK_AREA.width / 2 - 100);
  });
});

// ===========================================================================
// getCycleTransform
// ===========================================================================

describe('getCycleTransform', () => {
  it('returns width transform for next size', () => {
    const geo = { x: 100, y: 100, width: 640, height: 480 };
    const result = Yanjing.getCycleTransform(geo);
    expect(result).not.toBeNull();
    expect(result.width).toBeCloseTo(462, 0);
  });
});

// ===========================================================================
// getYMaxTransform
// ===========================================================================

describe('getYMaxTransform', () => {
  it('returns y and height transform', () => {
    const result = Yanjing.getYMaxTransform(
      { x: 100, y: 100, width: 500, height: 200 },
      WORK_AREA,
    );
    expect(result).toEqual({
      y: WORK_AREA.y,
      height: WORK_AREA.height,
    });
  });
});

// ===========================================================================
// getFauxFullscreenTransform
// ===========================================================================

describe('getFauxFullscreenTransform', () => {
  it('returns full work area transform', () => {
    expect(Yanjing.getFauxFullscreenTransform(WORK_AREA)).toEqual({
      x: WORK_AREA.x,
      y: WORK_AREA.y,
      width: WORK_AREA.width,
      height: WORK_AREA.height,
    });
  });
});

// ===========================================================================
// getSquishTransform
// ===========================================================================

describe('getSquishTransform', () => {
  const geo = { x: 200, y: 100, width: 500, height: 400 };

  it('returns move transform when not flush left', () => {
    const result = Yanjing.getSquishTransform(geo, WORK_AREA, Yanjing.Dir.Left);
    expect(result).toEqual({ x: WORK_AREA.x });
  });

  it('returns move transform when not flush right', () => {
    const result = Yanjing.getSquishTransform(geo, WORK_AREA, Yanjing.Dir.Right);
    expect(result).not.toBeNull();
    expect(result.x).toBe(WORK_AREA.x + WORK_AREA.width - 500);
  });

  it('returns cycle+reposition when already flush left', () => {
    const flushGeo = { x: WORK_AREA.x, y: 100, width: 500, height: 400 };
    const result = Yanjing.getSquishTransform(flushGeo, WORK_AREA, Yanjing.Dir.Left);
    expect(result).not.toBeNull();
    expect(result.width).toBeCloseTo(1386, 0);
    // Left: no reposition, so x should not be in result
    expect(result.x).toBeUndefined();
  });

  it('returns cycle+reposition when already flush right', () => {
    const flushGeo = { x: WORK_AREA.x + WORK_AREA.width - 500, y: 100, width: 500, height: 400 };
    const result = Yanjing.getSquishTransform(flushGeo, WORK_AREA, Yanjing.Dir.Right);
    expect(result).not.toBeNull();
    // Should have both width (cycle) and x (re-flush right after resize)
    expect(typeof result.width).toBe('number');
    expect(typeof result.x).toBe('number');
  });

  it('returns null for unknown direction', () => {
    expect(Yanjing.getSquishTransform(geo, WORK_AREA, 'nowhere')).toBeNull();
  });
});

// ===========================================================================
// sizeToHeight / heightToSizeIndex / getNextHeight
// ===========================================================================

describe('sizeToHeight', () => {
  it('converts percentage to pixels', () => {
    expect(Yanjing.sizeToHeight(50)).toBeCloseTo(WORK_AREA.height / 2);
    expect(Yanjing.sizeToHeight(100)).toBeCloseTo(WORK_AREA.height);
  });
});

describe('heightToSizeIndex', () => {
  it('finds nearest height size index', () => {
    const idx = Yanjing.heightToSizeIndex(WORK_AREA.height / 2);
    expect(Yanjing.HeightSizes[idx]).toBe(50);
  });
});

describe('getNextHeight', () => {
  it('cycles to next height', () => {
    const halfHeight = WORK_AREA.height / 2;
    const next = Yanjing.getNextHeight(halfHeight);
    expect(next).toBeGreaterThan(0);
    expect(next).not.toBeCloseTo(halfHeight, 0);
  });
});

// ===========================================================================
// getGridTransform
// ===========================================================================

describe('getGridTransform', () => {
  it('places window in top-left cell of 2x2 grid', () => {
    const result = Yanjing.getGridTransform({}, WORK_AREA, 0, 0, 1, 1, 2, 2);
    expect(result.x).toBe(WORK_AREA.x);
    expect(result.y).toBe(WORK_AREA.y);
    expect(result.width).toBeCloseTo(WORK_AREA.width / 2);
    expect(result.height).toBeCloseTo(WORK_AREA.height / 2);
  });

  it('places window in bottom-right cell of 2x2 grid', () => {
    const result = Yanjing.getGridTransform({}, WORK_AREA, 1, 1, 1, 1, 2, 2);
    expect(result.x).toBeCloseTo(WORK_AREA.x + WORK_AREA.width / 2);
    expect(result.y).toBeCloseTo(WORK_AREA.y + WORK_AREA.height / 2);
  });

  it('places window in center cell of 3x3 grid', () => {
    const result = Yanjing.getGridTransform({}, WORK_AREA, 1, 1, 1, 1, 3, 3);
    expect(result.x).toBeCloseTo(WORK_AREA.x + WORK_AREA.width / 3);
    expect(result.y).toBeCloseTo(WORK_AREA.y + WORK_AREA.height / 3);
    expect(result.width).toBeCloseTo(WORK_AREA.width / 3);
    expect(result.height).toBeCloseTo(WORK_AREA.height / 3);
  });
});

// ===========================================================================
// getGridSquishTransform
// ===========================================================================

describe('getGridSquishTransform', () => {
  it('returns grid transform when not in cell', () => {
    const geo = { x: 999, y: 999, width: 100, height: 100 };
    const result = Yanjing.getGridSquishTransform(geo, WORK_AREA, 0, 0, 2, 2);
    expect(result.x).toBe(WORK_AREA.x);
    expect(result.y).toBe(WORK_AREA.y);
    expect(result.width).toBeCloseTo(WORK_AREA.width / 2);
    expect(result.height).toBeCloseTo(WORK_AREA.height / 2);
  });

  it('returns cycle-height transform when already in cell (same row)', () => {
    const cellW = WORK_AREA.width / 2;
    const cellH = WORK_AREA.height / 2;
    // Top row, top edge matches — should cycle
    const geo = { x: WORK_AREA.x, y: WORK_AREA.y, width: cellW, height: cellH };
    const result = Yanjing.getGridSquishTransform(geo, WORK_AREA, 0, 0, 2, 2);
    expect(typeof result.height).toBe('number');
    expect(result.x).toBeUndefined();
    expect(result.width).toBeUndefined();
  });

  it('returns grid transform when in different row (same column)', () => {
    const cellW = WORK_AREA.width / 2;
    // In bottom row but targeting top row — should snap, not cycle
    const geo = {
      x: WORK_AREA.x,
      y: WORK_AREA.y + WORK_AREA.height / 2,
      width: cellW,
      height: WORK_AREA.height / 2,
    };
    const result = Yanjing.getGridSquishTransform(geo, WORK_AREA, 0, 0, 2, 2);
    // Should be the full grid transform (snap to top-left)
    expect(result.x).toBe(WORK_AREA.x);
    expect(result.y).toBe(WORK_AREA.y);
  });
});

// ===========================================================================
// getVerticalAnchor
// ===========================================================================

describe('getVerticalAnchor', () => {
  it('returns top when near top edge', () => {
    const geo = { x: 100, y: WORK_AREA.y, width: 500, height: 400 };
    expect(Yanjing.getVerticalAnchor(geo, WORK_AREA)).toBe('top');
  });

  it('returns bottom when near bottom edge', () => {
    const geo = {
      x: 100,
      y: WORK_AREA.y + WORK_AREA.height - 400,
      width: 500,
      height: 400,
    };
    expect(Yanjing.getVerticalAnchor(geo, WORK_AREA)).toBe('bottom');
  });

  it('returns middle when not near either edge', () => {
    const geo = { x: 100, y: WORK_AREA.y + 300, width: 500, height: 400 };
    expect(Yanjing.getVerticalAnchor(geo, WORK_AREA)).toBe('middle');
  });
});

// ===========================================================================
// getVerticalCycleTransform
// ===========================================================================

describe('getVerticalCycleTransform', () => {
  it('top-anchored: preserves y, changes height', () => {
    const geo = { x: 100, y: WORK_AREA.y, width: 500, height: 400 };
    const result = Yanjing.getVerticalCycleTransform(geo, WORK_AREA);
    expect(result.y).toBeUndefined();
    expect(typeof result.height).toBe('number');
    expect(result.height).not.toBe(400);
  });

  it('bottom-anchored: adjusts y, changes height', () => {
    const geo = {
      x: 100,
      y: WORK_AREA.y + WORK_AREA.height - 400,
      width: 500,
      height: 400,
    };
    const result = Yanjing.getVerticalCycleTransform(geo, WORK_AREA);
    expect(typeof result.y).toBe('number');
    expect(typeof result.height).toBe('number');
  });

  it('middle-anchored: adjusts both y and height', () => {
    const geo = { x: 100, y: WORK_AREA.y + 300, width: 500, height: 400 };
    const result = Yanjing.getVerticalCycleTransform(geo, WORK_AREA);
    expect(typeof result.y).toBe('number');
    expect(typeof result.height).toBe('number');
  });
});
