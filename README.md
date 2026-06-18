# Yanjing

KWin script to resize and move windows. Like Spectacle/Rectangle on mac.

## Installation

Available in the KDE store for

- [Plasma 6](https://store.kde.org/p/2136753/)
- [Plasma 5](https://store.kde.org/p/1492899/)

## Commands

You can customize the shortcuts in

```plain
System Settings > Input & Output - Keyboard > Shortcuts > KWin
```

Defaults:

- Yanjing LEFT - `no default`
  - Vertically maximize, flush the window to the LEFT side of the screen, or
    resize width if already flushed.
- Yanjing CENTER - `no default`
  - Vertically maximize, center window horizontally, or resize width if
    already centered. Centering allows a 2px margin of error.
- Yanjing RIGHT - `no default`
  - Vertically maximize, flush the window to the RIGHT side of the screen,
    or resize width if already flushed.
- Yanjing yMax + LEFT - `Meta+Ctrl+Shift+a`
  - Vertically maximize, flush the window to the LEFT side of the screen, or
    resize width if already flushed.
- Yanjing yMax + CENTER - `Meta+Ctrl+Shift+x` -
  - Vertically maximize, center window horizontally, or resize width if
    already centered. Centering allows a 2px margin of error.
- Yanjing yMax + RIGHT - `Meta+Ctrl+Shift-D`
  - Vertically maximize, flush the window to the RIGHT side of the screen,
    or resize width if already flushed.

### Resizing logic

The window will steps through the [Sizes array](./contents/code/main.js).
It does so in reverse order, so as you "shove" the window against each edge of
the screen or into the center more, it shrinks. It will loop back to the
largest size.

## License

MIT
