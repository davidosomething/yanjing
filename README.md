# Yanjing

KWin script to resize and move windows

## Commands 

`ctrl-shift-meta-a` - Flush the window to the LEFT side of the screen, or
resize it if already flushed.

`ctrl-shift-meta-x` - Center window horizontally or resize it if already
centered. Centering allows a 2px margin of error.

`ctrl-shift-meta-d` - Flush the window to the RIGHT side of the screen, or
resize it if already flushed.

### Resizing logic

The window will steps through the [Sizes array](./contents/code/main.js).
It does so in reverse order, so as you "shove" the window against each edge of
the screen or into the center more, it shrinks. It will loop back to the
largest size.

## License

MIT
