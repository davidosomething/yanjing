// ===========================================================================
// KWin Mocks
// ===========================================================================

global.print = jest.fn();
global.registerShortcut = jest.fn();

global.KWin = {
  WorkArea: 'WorkArea',
};

const ClientRects = {
  WorkArea: { x: 0, y: 32, width: 1920, height: 1080 - 32 - 32 },
};

global.workspace = {
  workspaceHeight: 1080,
  workspaceWidth: 1920,

  /**
   * Return workspace minus docks!
   */
  clientArea: jest.fn().mockImplementation(function (ClientAreaOption, activeClient) {
    return ClientRects[ClientAreaOption];
  })
};

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

describe('sizeToWidth', () => {
  it(`should return px value against ${global.workspace.workspaceWidth}`, () => {
    expect(Yanjing.sizeToWidth(33.333)).toBeCloseTo(639.9936);
    expect(Yanjing.sizeToWidth(50)).toBeCloseTo(global.workspace.workspaceWidth / 2);
  });
});

describe('widthToSizeIndex', () => {
  it(`should return size index relative to ${global.workspace.workspaceWidth}`, () => {
    expect(Yanjing.widthToSizeIndex(640))
      .toBe(Yanjing.Sizes.findIndex((s) => s === 100/3));
    expect(Yanjing.widthToSizeIndex(global.workspace.workspaceWidth / 2))
      .toBe(Yanjing.Sizes.findIndex((s) => s === 50));
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
    expect(Yanjing.getNextWidth(1440)).toBeCloseTo(1280, 0);
    expect(Yanjing.getNextWidth(1280)).toBeCloseTo(960, 0);
    expect(Yanjing.getNextWidth(960)).toBeCloseTo(640, 0);
    expect(Yanjing.getNextWidth(640)).toBeCloseTo(480, 0);
    expect(Yanjing.getNextWidth(480)).toBeCloseTo(1440, 0);
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
    const client = {
      resizeable: true,
      geometry: { width: 640 }
    };
    Yanjing.cycle(client);
    expect(Yanjing.getNextWidth).toHaveBeenCalledTimes(1);
    expect(client.geometry.width).toBeCloseTo(480, 0);
    Yanjing.getNextWidth.mockRestore();
  });
});

describe('Move', () => {
  describe('Left', () => {
    it(`should return NOOP if already left`, () => {
      const client = {
        geometry: { x: 0 },
      };
      expect(Yanjing.Move[Yanjing.Dirs.Left](client))
        .toBe(Yanjing.States.NOOP);
    });

    it(`should ignore immoveable windows`, () => {
      const client = {
        geometry: { x: 100 },
        moveable: false,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Left](client))
        .toBe(Yanjing.States.ERROR);
    });

    it(`should try to move`, () => {
      const client = {
        geometry: { x: 100 },
        moveable: true,
      };
      const result = Yanjing.Move[Yanjing.Dirs.Left](client);
      expect(result).toBe(Yanjing.States.DONE);
      expect(client.geometry.x).toBe(0);
    });
  });

  describe('Right', () => {
    it(`should return NOOP if already right`, () => {
      const maximizedClient = {
        geometry: { x: 0, width: 1920 },
      };
      expect(Yanjing.Move[Yanjing.Dirs.Right](maximizedClient))
        .toBe(Yanjing.States.NOOP);

      const flushedClient = {
        geometry: { x: 920, width: 1000 },
      };
      expect(Yanjing.Move[Yanjing.Dirs.Right](flushedClient))
        .toBe(Yanjing.States.NOOP);
    });

    it(`should ignore immoveable windows`, () => {
      const client = {
        geometry: { x: 100, width: 100 },
        moveable: false,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Right](client))
        .toBe(Yanjing.States.ERROR);
    });

    it(`should try to move`, () => {
      const client = {
        geometry: { x: 100, width: 100 },
        moveable: true,
      };
      const result = Yanjing.Move[Yanjing.Dirs.Right](client);
      expect(result).toBe(Yanjing.States.DONE);
      expect(client.geometry.x).toBe(1820);
    });
  });

  describe('Center', () => {
    it(`should return NOOP if already center`, () => {
      const maximizedClient = {
        geometry: { x: 0, width: 1920 },
      };
      expect(Yanjing.Move[Yanjing.Dirs.Center](maximizedClient))
        .toBe(Yanjing.States.NOOP);

      const centeredClient = {
        geometry: { x: 900, width: 120 },
      };
      expect(Yanjing.Move[Yanjing.Dirs.Center](centeredClient))
        .toBe(Yanjing.States.NOOP);
    });

    it(`should ignore immoveable windows`, () => {
      const client = {
        geometry: { x: 100, width: 100 },
        moveable: false,
      };
      expect(Yanjing.Move[Yanjing.Dirs.Center](client))
        .toBe(Yanjing.States.ERROR);
    });

    it(`should try to move`, () => {
      const client = {
        geometry: { x: 100, width: 100 },
        moveable: true,
      };
      const result = Yanjing.Move[Yanjing.Dirs.Center](client);
      expect(result).toBe(Yanjing.States.DONE);
      expect(client.geometry.x).toBe(960-(100/2));
    });
  });
});

describe('yMax', () => {
  it('should return ERROR if cannot resize', () => {
    const result1 = Yanjing.yMax(null);
    expect(result1).toBe(Yanjing.States.ERROR);

    const client = {
      geometry: { x: 100, height: 200, width: 500 },
      moveable: true,
    };
    const result2 = Yanjing.yMax(client);
    expect(result2).toBe(Yanjing.States.ERROR);

  });

  it('should resize client to workspace work area height', () => {
    const client = {
      geometry: { x: 100, height: 200, width: 500 },
      moveable: true,
      resizeable: true,
    };
    const result = Yanjing.yMax(client);
    expect(result).toBe(Yanjing.States.DONE);
    expect(client.geometry.y).toBe(ClientRects.WorkArea.y);
    expect(client.geometry.height).toBe(ClientRects.WorkArea.height);
  });
});
