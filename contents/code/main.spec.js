// ===========================================================================
// KWin Mocks
// ===========================================================================

global.print = jest.fn(); //.mockImplementation((str) => console.error(str));

global.readConfig = jest.fn().mockImplementation(function (key, defaults) {
  return defaults;
});

global.registerShortcut = jest.fn();

global.KWin = {
  WorkArea: 'WorkArea',
};

const RIGHT_SIDEBAR_WIDTH = 72;
const SCREEN_LEFT = 64;
const SCREEN_WIDTH = 1920 - RIGHT_SIDEBAR_WIDTH;

const ClientRects = {
  WorkArea: {
    x: SCREEN_LEFT,
    y: 32,
    width: SCREEN_WIDTH,
    height: 1080 - 32 - 32,
  },
};

global.workspace = {
  /**
   * Return workspace minus docks!
   */
  clientArea: jest
    .fn()
    .mockImplementation(function (ClientAreaOption, activeWindow) {
      return ClientRects[ClientAreaOption];
    }),
};

const HALF_SCREEN = global.workspace.clientArea('WorkArea').width / 2;

// ===========================================================================

require('./main.js');

// ===========================================================================

it('has Yanjing', () => {
  expect(Yanjing).toBeTruthy();
});

it('calls registerShortcut in main', () => {
  Yanjing.main();
  expect(global.registerShortcut).toHaveBeenCalledTimes(6);
});

describe('sanitizeSizes', () => {
  it('returns array of filtered floats', () => {
    expect(Yanjing.sanitizeSizes('0, 5, 10, x, 111.111, 0, 222.333')).toEqual([
      5, 10, 111.111, 222.333,
    ]);
  });
});

describe('sizeToWidth', () => {
  it(`should return px value against work area width`, () => {
    expect(Yanjing.sizeToWidth(33.333)).toBeCloseTo(615.99384);
    expect(Yanjing.sizeToWidth(50)).toBeCloseTo(HALF_SCREEN);
  });
});

describe('widthToSizeIndex', () => {
  it(`should return size index relative to ${global.workspace.workspaceWidth}`, () => {
    expect(Yanjing.widthToSizeIndex(640)).toBe(
      Yanjing.Sizes.findIndex((s) => s === 33.3333),
    );
    expect(Yanjing.widthToSizeIndex(HALF_SCREEN)).toBe(
      Yanjing.Sizes.findIndex((s) => s === 50),
    );
  });
});

describe('getNextI', () => {
  it(`should cycle index`, () => {
    expect(Yanjing.getNextI(Yanjing.Sizes.length - 1)).toBe(0);
    expect(Yanjing.getNextI(Yanjing.Sizes.length)).toBe(0);
    expect(Yanjing.getNextI(Yanjing.Sizes.length + 1)).toBe(0);

    expect(Yanjing.getNextI(0)).toBe(1);
    expect(Yanjing.getNextI(1)).toBe(2);
  });
});

describe('getNextWidth', () => {
  it(`should cycle width`, () => {
    expect(Yanjing.getNextWidth(1440)).toBeCloseTo(1231, 0);
    expect(Yanjing.getNextWidth(1280)).toBeCloseTo(924, 0);

    // The rounding depends on plasma version
    expect(Yanjing.getNextWidth(960)).toBeGreaterThan(614);
    expect(Yanjing.getNextWidth(960)).toBeLessThan(617);

    expect(Yanjing.getNextWidth(640)).toBeCloseTo(462, 0);
    expect(Yanjing.getNextWidth(480)).toBeCloseTo(1386, 0);
  });
});

describe('cycle', () => {
  it(`should ignore non-resizeable windows`, () => {
    jest.spyOn(Yanjing, 'getNextWidth');
    Yanjing.cycle({ resizeable: false });
    expect(Yanjing.getNextWidth).not.toHaveBeenCalled();
    Yanjing.getNextWidth.mockRestore();
  });

  it(`should try to resize`, () => {
    jest.spyOn(Yanjing, 'getNextWidth');
    const win = {
      resizeable: true,
      frameGeometry: { width: 640 },
    };
    Yanjing.cycle(win);
    expect(Yanjing.getNextWidth).toHaveBeenCalledTimes(1);
    expect(win.frameGeometry.width).toBeCloseTo(462, 0);
    Yanjing.getNextWidth.mockRestore();
  });
});

describe('Move', () => {
  describe('Left', () => {
    it(`should return NOOP if already left`, () => {
      const win = {
        frameGeometry: { x: SCREEN_LEFT },
        moveable: true,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Left](win)).toBe(Yanjing.States.NOOP);
    });

    it(`should ignore immoveable windows`, () => {
      const win = {
        frameGeometry: { x: 100 },
        moveable: false,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Left](win)).toBe(Yanjing.States.ERROR);
    });

    it(`should try to move`, () => {
      const win = {
        frameGeometry: { x: 100 },
        moveable: true,
      };
      const result = Yanjing.Move[Yanjing.Dirs.Left](win);
      expect(result).toBe(Yanjing.States.DONE);
      expect(win.frameGeometry.x).toBe(SCREEN_LEFT);
    });
  });

  describe('Right', () => {
    it(`should return NOOP if already right`, () => {
      const maximizedWin = {
        frameGeometry: {
          x: SCREEN_LEFT,
          width: SCREEN_WIDTH,
        },
        moveable: true,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Right](maximizedWin)).toBe(
        Yanjing.States.NOOP,
      );

      const flushedWin = {
        frameGeometry: { x: 912, width: 1000 },
        moveable: true,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Right](flushedWin)).toBe(
        Yanjing.States.NOOP,
      );
    });

    it(`should ignore immoveable windows`, () => {
      const win = {
        frameGeometry: { x: 100, width: 100 },
        moveable: false,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Right](win)).toBe(Yanjing.States.ERROR);
    });

    it(`should try to move`, () => {
      const win = {
        frameGeometry: { x: 100, width: 100 },
        moveable: true,
      };
      const result = Yanjing.Move[Yanjing.Dirs.Right](win);
      expect(result).toBe(Yanjing.States.DONE);
      expect(win.frameGeometry.x).toBe(1812);
    });
  });

  describe('Center', () => {
    it(`should return NOOP if already center`, () => {
      const maximizedWin = {
        frameGeometry: { x: SCREEN_LEFT, width: SCREEN_WIDTH },
        moveable: true,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Center](maximizedWin)).toBe(
        Yanjing.States.NOOP,
      );

      const centeredWin = {
        frameGeometry: {
          x: SCREEN_LEFT + SCREEN_WIDTH / 2 - 120 / 2,
          width: 120,
        },
        moveable: true,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Center](centeredWin)).toBe(
        Yanjing.States.NOOP,
      );
    });

    it(`should ignore immoveable windows`, () => {
      const win = {
        frameGeometry: { x: 100, width: 100 },
        moveable: false,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Center](win)).toBe(Yanjing.States.ERROR);
    });

    it(`should try to move`, () => {
      const win = {
        frameGeometry: { x: 100, width: 100 },
        moveable: true,
      };
      const result = Yanjing.Move[Yanjing.Dirs.Center](win);
      expect(result).toBe(Yanjing.States.DONE);
      expect(win.frameGeometry.x).toBe(
        SCREEN_LEFT + SCREEN_WIDTH / 2 - 100 / 2,
      );
    });
  });
});

describe('yMax', () => {
  it('should return ERROR if cannot resize', () => {
    const result1 = Yanjing.yMax(null);
    expect(result1).toBe(Yanjing.States.ERROR);

    const win = {
      frameGeometry: { x: 100, height: 200, width: 500 },
      moveable: true,
    };
    const result2 = Yanjing.yMax(win);
    expect(result2).toBe(Yanjing.States.ERROR);
  });

  it('should resize win to workspace work area height', () => {
    const win = {
      frameGeometry: { x: 100, height: 200, width: 500 },
      moveable: true,
      resizeable: true,
    };
    const result = Yanjing.yMax(win);
    expect(result).toBe(Yanjing.States.DONE);
    expect(win.frameGeometry.y).toBe(ClientRects.WorkArea.y);
    expect(win.frameGeometry.height).toBe(ClientRects.WorkArea.height);
  });
});

describe('squish', () => {
  it('should return ERROR if unknown key', () => {
    expect(Yanjing.squish(null, 'nowhere')).toBe(Yanjing.States.ERROR);
  });

  it('should return ERROR if unable to move', () => {
    const win = {
      moveable: false,
    };
    expect(Yanjing.squish(win, Yanjing.Dirs.Left)).toBe(Yanjing.States.ERROR);
  });

  it('should cycle if did not move', () => {
    const win = {
      frameGeometry: { x: SCREEN_LEFT },
      moveable: true,
    };
    Yanjing.cycle = jest.fn().mockImplementation(() => 'ok1');
    expect(Yanjing.squish(win, Yanjing.Dirs.Left)).toBe('ok1');
    expect(Yanjing.cycle).toHaveBeenCalledTimes(1);
    expect(Yanjing.squish(win, Yanjing.Dirs.Left)).toBe('ok1');
    expect(Yanjing.cycle).toHaveBeenCalledTimes(2);
    Yanjing.cycle.mockRestore();
  });
});
