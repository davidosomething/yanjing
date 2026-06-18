// ===========================================================================
// KWin Mocks — Plasma 6.6 three-argument clientArea API
// ===========================================================================

global.print = jest.fn();

global.readConfig = jest.fn().mockImplementation(function (key, defaults) {
  return defaults;
});

global.registerShortcut = jest.fn();

global.KWin = {
  PlacementArea: 0,
  WorkArea: 5,
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

// Screen geometry (global coordinates for primary display)
const SCREEN_GEOMETRY = {
  x: 0,
  y: 0,
  width: SCREEN_FULL_WIDTH,
  height: SCREEN_FULL_HEIGHT,
};

global.workspace = {
  activeWindow: {
    desktopWindow: false,
  },
  activeScreen: {
    geometry: SCREEN_GEOMETRY,
    name: 'eDP-1',
    manufacturer: 'AUO',
    model: 'SomeModel',
    logicalDpi: 96,
    devicePixelRatio: 1,
  },
  currentDesktop: 1,

  /**
   * Two-argument clientArea(option, window) — kwin-rectangle pattern.
   * Returns the PlacementArea (already in global coordinates).
   */
  clientArea: jest
    .fn()
    .mockImplementation(function (option, window) {
      return PLACEMENT_AREA;
    }),
};

// clientArea already returns global coordinates — no screen offset needed.
// BQT confirmed this (lines 178-179 in its main.js are commented out).
const WORK_AREA = PLACEMENT_AREA;

const HALF_SCREEN = WORK_AREA.width / 2;

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
  expect(global.registerShortcut).toHaveBeenCalledTimes(7);
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
  describe('wrap-around at end', () => {
    it.each`
      label               | i
      ${'last index'}     | ${Yanjing.Sizes.length - 1}
      ${'past last'}      | ${Yanjing.Sizes.length}
      ${'way past last'}  | ${Yanjing.Sizes.length + 1}
    `('returns 0 for $label ($i)', ({ i }) => {
      expect(Yanjing.getNextI(i)).toBe(0);
    });
  });

  it.each`
    label      | i    | expected
    ${'first'} | ${0} | ${1}
    ${'second'} | ${1} | ${2}
  `('returns $expected for $label index ($i)', ({ i, expected }) => {
    expect(Yanjing.getNextI(i)).toBe(expected);
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
    // The exact rounding depends on the Plasma version
    expect(Yanjing.getNextWidth(960)).toBeGreaterThan(614);
    expect(Yanjing.getNextWidth(960)).toBeLessThan(617);
  });
});

// ===========================================================================
// cycle
// ===========================================================================

describe('cycle', () => {
  it('should resize even non-resizable flagged windows (kwin-rectangle pattern)', () => {
    jest.spyOn(Yanjing, 'getNextWidth');
    const win = {
      resizable: false,
      frameGeometry: { x: 100, y: 100, width: 640, height: 480 },
    };
    Yanjing.cycle(win);
    expect(Yanjing.getNextWidth).toHaveBeenCalled();
    Yanjing.getNextWidth.mockRestore();
  });

  it('should try to resize', () => {
    jest.spyOn(Yanjing, 'getNextWidth');
    const win = {
      resizable: true,
      frameGeometry: { x: 100, y: 100, width: 640, height: 480 },
    };
    Yanjing.cycle(win);
    expect(Yanjing.getNextWidth).toHaveBeenCalledTimes(1);
    expect(win.frameGeometry.width).toBeCloseTo(462, 0);
    Yanjing.getNextWidth.mockRestore();
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
// Move (tested via squish to exercise the full move→cycle pipeline)
// ===========================================================================

describe('squish', () => {
  describe('error conditions', () => {
    it('returns ERROR for unknown direction key', () => {
      expect(Yanjing.squish({}, 'nowhere')).toBe(Yanjing.State.ERROR);
    });

    it.each`
      dir              | directionLabel
      ${Yanjing.Dir.Left}   | ${'left'}
      ${Yanjing.Dir.Center} | ${'center'}
      ${Yanjing.Dir.Right}  | ${'right'}
    `('flushes immovable window anyway ($directionLabel) — kwin-rectangle pattern', ({ dir }) => {
      const win = {
        frameGeometry: { x: 100, y: 100, width: 500, height: 400 },
        movable: false,
        setMaximize: jest.fn(),
      };
      expect(Yanjing.squish(win, dir)).toBe(Yanjing.State.DONE);
    });
  });

  describe('flush to edge', () => {
    it.each`
      dir              | directionLabel | startX    | expectedX
      ${Yanjing.Dir.Left}   | ${'left'}     | ${100}    | ${WORK_AREA.x}
      ${Yanjing.Dir.Right}  | ${'right'}    | ${100}    | ${WORK_AREA.x + WORK_AREA.width - 100}
      ${Yanjing.Dir.Center} | ${'center'}   | ${100}    | ${WORK_AREA.x + WORK_AREA.width / 2 - 50}
    `(
      'flushes $directionLabel (startX=$startX, width=100) → x=$expectedX',
      ({ dir, startX }) => {
        const width = 100;
        const win = {
          frameGeometry: { x: startX, y: 100, width, height: 400 },
          movable: true,
        };
        const result = Yanjing.squish(win, dir);
        expect(result).toBe(Yanjing.State.DONE);
        expect(win.frameGeometry.x).toBe(
          dir === Yanjing.Dir.Center
            ? WORK_AREA.x + WORK_AREA.width / 2 - width / 2
            : dir === Yanjing.Dir.Right
              ? WORK_AREA.x + WORK_AREA.width - width
              : WORK_AREA.x,
        );
      },
    );
  });

  describe('already flush → cycles width', () => {
    it.each`
      dir              | directionLabel | winWidth | startX
      ${Yanjing.Dir.Left}   | ${'left'}     | ${500}   | ${WORK_AREA.x}
      ${Yanjing.Dir.Right}  | ${'right'}    | ${500}   | ${WORK_AREA.x + WORK_AREA.width - 500}
    `(
      '$directionLabel: cycles when already flush (width=$winWidth)',
      ({ dir, winWidth, startX }) => {
        const win = {
          frameGeometry: { x: startX, y: 100, width: winWidth, height: 400 },
          movable: true,
          resizable: true,
        };
        const result = Yanjing.squish(win, dir);
        expect(result).toBe(Yanjing.State.DONE);
        // Width changed due to cycle
        expect(win.frameGeometry.width).not.toBe(winWidth);
      },
    );

    it('center: cycles when already centered', () => {
      const winWidth = 120;
      const centeredX = WORK_AREA.x + WORK_AREA.width / 2 - winWidth / 2;
      const win = {
        frameGeometry: { x: centeredX, y: 100, width: winWidth, height: 100 },
        movable: true,
        resizable: true,
      };
      const result = Yanjing.squish(win, Yanjing.Dir.Center);
      // NOOP from moveCenter → cycle → DONE
      expect(win.frameGeometry.width).toBeCloseTo(1386, 0);
      // After cycle, center is re-applied
      expect(win.frameGeometry.x).toBe(
        WORK_AREA.x + WORK_AREA.width / 2 - win.frameGeometry.width / 2,
      );
    });
  });

  describe('spy: cycle called when move returns NOOP', () => {
    it('calls Yanjing.cycle when window is already flush left', () => {
      const cycleSpy = jest.spyOn(Yanjing, 'cycle').mockImplementation(() => 'ok1');
      const win = {
        frameGeometry: { x: WORK_AREA.x, y: 100, width: 500, height: 400 },
        movable: true,
      };
      expect(Yanjing.squish(win, Yanjing.Dir.Left)).toBe('ok1');
      expect(cycleSpy).toHaveBeenCalledTimes(1);
      // Second press also cycles
      expect(Yanjing.squish(win, Yanjing.Dir.Left)).toBe('ok1');
      expect(cycleSpy).toHaveBeenCalledTimes(2);
      cycleSpy.mockRestore();
    });
  });
});

// ===========================================================================
// yMax
// ===========================================================================

describe('yMax', () => {
  describe('error conditions', () => {
    it('returns ERROR for null window', () => {
      expect(Yanjing.yMax(null)).toBe(Yanjing.State.ERROR);
    });

    it('vertically maximizes even non-resizable windows (kwin-rectangle pattern)', () => {
      const win = {
        frameGeometry: { x: 100, y: 100, height: 200, width: 500 },
        resizable: false,
        setMaximize: jest.fn(),
      };
      expect(Yanjing.yMax(win)).toBe(Yanjing.State.DONE);
    });
  });

  it('resizes window to work area height', () => {
    const win = {
      frameGeometry: { x: 100, y: 100, height: 200, width: 500 },
      movable: true,
      resizable: true,
    };
    const result = Yanjing.yMax(win);
    expect(result).toBe(Yanjing.State.DONE);
    expect(win.frameGeometry.y).toBe(WORK_AREA.y);
    expect(win.frameGeometry.height).toBe(WORK_AREA.height);
  });
});

// ===========================================================================
// fauxFullscreen
// ===========================================================================

describe('fauxFullscreen', () => {
  it('returns ERROR for null window', () => {
    expect(Yanjing.fauxFullscreen(null)).toBe(Yanjing.State.ERROR);
  });

  it('fills the work area', () => {
    const win = {
      frameGeometry: { x: 100, y: 100, width: 500, height: 300 },
      movable: true,
      resizable: true,
    };
    const result = Yanjing.fauxFullscreen(win);
    expect(result).toBe(Yanjing.State.DONE);
    expect(win.frameGeometry).toEqual(WORK_AREA);
  });
});
