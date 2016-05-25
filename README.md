# taach

[![npm version](https://badge.fury.io/js/taach.svg)](https://www.npmjs.com/package/taach)

Touch input gesture library for [Taaspace](https://github.com/taataa/taaspace), a zoomable user interface lib for JavaScript.

Taach's simplistic interaction design is based on usability research and ensures good design principles:
- **No double tap** or triple+ tap gestures. They are hard for users to discover. Instead, updated the interface after each single tap in a way that tells user that another tap is needed.
- **No hold.** It is hard for users to discover. Use single tap or multiple subsequent single taps with progressive visual feedback instead. [1]
- **No info about number of fingers.** Fingers easily touch the screen by accident and cause unexpected behavior if UI behavior depends on number of fingers. [1]
- **Respect each finger equally.** If only two fingers are respected in transformations such as scaling then movement of additional fingers do not affect at all which is not the way how objects behave in the physical world familiar to users. [2]

Additional design decisions:
- **No hover** even for mouse. We treat mouse as a single finger. Simpler for developers.

[1] [Microsoft touch design guidelines](https://msdn.microsoft.com/en-us/windows/uwp/input-and-devices/guidelines-for-user-interaction)
[2] Palen, 2016, Advanced algorithms for manipulating 2D objects on touch screens.

## Install

    $ npm install taach

## Documentation

### taach.Touchable

Create:

    var tou = new taach.Touchable(spaceView, spaceTaa);

Methods:

- start(mode)
- restart(mode)
- stop()
- resume()

Events:

- transformstart
- transformmove
- transformend
- pressstart
- pressend
- tap: a pressend where travel distance is below a threshold

See [wiki](https://github.com/taataa/taach/wiki) for docs.


## License

[MIT](LICENSE)
