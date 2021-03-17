# Yanjing

KWin script to resize and move windows

## Commands 

`ctrl-shift-meta-a` - Flush the window to the LEFT side of the screen, or
resize it if already flushed.

`ctrl-shift-meta-d` - Flush the window to the RIGHT side of the screen, or
resize it if already flushed.

### Resizing logic

Steps through [Sizes array](./contents/code/main.js), so from 25% of screen,
to 33%, 50%, 66%, and then back around to 25%.

## License

MIT
