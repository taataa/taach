# taach

[![NPM Version](https://badge.fury.io/js/taach.svg)](https://www.npmjs.com/package/taach)

Taach is a [direct manipulation](https://www.nngroup.com/articles/direct-manipulation/) library for [Taaspace](https://github.com/taataa/taaspace), a zoomable user interface lib for JavaScript. Taach recognizes mouse and touch gestures on Taaspace elements and makes the elements react in a natural, paper-like way.

Taach's simplistic interaction design is based on usability research and ensures good design principles:
- **No double tap** or triple+ tap gestures. They are hard for users to discover. Instead, updated the interface after each single tap in a way that tells user that another tap is needed.
- **No hold.** It is hard for users to discover. Use single tap or multiple subsequent single taps with progressive visual feedback instead. [1]
- **No info about number of fingers.** Fingers easily touch the screen by accident and cause unexpected behavior if UI behavior depends on number of fingers. [1]
- **Respect each finger equally.** If only two fingers are respected in transformations such as scaling then movement of additional fingers do not affect at all which is not the way how objects behave in the physical world familiar to users. [2]

Additional design decisions:
- **No hover** even for mouse. We treat mouse as a single finger. Simpler for developers.

[1] [Microsoft touch design guidelines](https://msdn.microsoft.com/en-us/windows/uwp/input-and-devices/guidelines-for-user-interaction)<br />
[2] Palen, 2016, [Advanced algorithms for manipulating 2D objects on touch screens](http://dspace.cc.tut.fi/dpub/handle/123456789/24173).



## Install

    $ npm install taach


## Tutorial

Let us begin with a simple Taaspace application:

    > var space = new taaspace.Space()
    > var view = new taaspace.SpaceViewHTML(space)
    > view.mount(document.getElementById('space'))
    > var hello = new taaspace.SpaceHTML(space, '<h1>Hello</h1>')

Our goal is to make `hello` movable and rotatable. For that we create a touch manager:

    > var tou = new taach.Touchable(view, hello)

The manager does two things. First, it recognizes the gestures made on the HTML representation of `hello`. Second, it manipulates `hello` according to the gesture. Note that only the gestures on the given `view` are recognized. This allows unique interface behavior within each view. On the other hand, the consequences are visible also on other views of the same space.

The manager does not recognize anything yet. We need to activate it first by calling `start`. Also, we specify *the mode* of interaction which means the type of interaction we would like to allow.

    > tou.start({
        translate: true,
        rotate: true
      })

The main properties of the mode are `translate`, `rotate`, `scale`, and `tap`. They all are `false` by default. There is also a `pivot` property which is a bit special. The `pivot` takes in an `IVector` and restricts the rotation and scaling to happen only around it.

The mode can be changed even during an ongoing gesture with `restart` method. The following disables the translation and rotation but instead allows scaling around the middle of the `hello`.

    > tou.restart({
        scale: true,
        pivot: hello.atMid()
      })

The workings of the manager can be deactivated by calling `stop` method. An inactive manager does not recognize gestures or modify `hello`. After `stop`, you can activate the manager by calling `start` or `restart` with a mode, or just reuse the stopped mode by calling `resume`.

    > tou.stop()
    > tou.resume()

An active manager emits events about the recognized gestures. You can bind to these events in your code. One of such events is `tap` which is fired after short click-like gestures if `tap: true`. Each event is accompanied with an event object and can be listened in the following manner:

    > tou.on('transformend', function (ev) {
        console.log(ev.duration)
      })

This tutorial covered the most about Taach's API. The details about the methods and events can be found in the API Reference below.



## API Reference

### taach.Touchable(view, plane)

A manager that maps pointer events on a HTML representation to a transformations and applies the transformation to the given `taaspace.SpacePlane` instance.

**Construction:**

    > var tou = new taach.Touchable(view, plane);

**Parameters:**

- *view:* an instance of `taaspace.SpaceViewHTML`. Only the gestures made on this view will be listened and recognized.
- *plane:* an instance of `taaspace.SpacePlane` such as `SpaceHTML`, `SpacePixel`, `SpaceGroup`, or `SpaceViewHTML`. Only the gestures made on the HTML representation of the instance are listened and recognized. The instance reacts to the manipulations as specified by the mode.

**Properties:**

- *view:* the given `SpaceViewHTML`
- *plane:* the given `SpacePlane`
- *element:* the [HTMLElement](https://developer.mozilla.org/en/docs/Web/API/HTMLElement) that receives the original pointer events.
- *mode:* the current mode object.

**Methods:**

- *start(mode):* activates the manager in the given mode. If no mode is given, the default mode is used. Can be called on already active manager to update the mode.
- *restart(mode):* alias of `start(mode)` but can make the code more readable when updating the mode of an already active manager.
- *stop():* deactivates the manager. An inactive manager fires no events and listens no gestures.
- *resume():* starts the manager with the last known mode.

**Mode:**

The mode object defines the allowed types of manipulation. Some types are not possible together so a type can override another. The full list of the mode properties and their conflicts is given below.

- *translate:* set `true` to allow horizontal and vertical movement. Default is `false`. If `pivot` is specified the value of `translate` has no effect.
- *rotate:* set `true` to allow rotation. If `translate: false` and `pivot` is not specified the rotation is allowed only around the center of the transformer. Default is `false`.
- *scale:* set `true` to allow scaling. If `translate: false` and `pivot` is not specified the scaling is allowed only around the center of the transformer. Default is `false`.
- *pivot:* set to a `taaspace.IVector` to specify a pivot for rotation and scaling. If `pivot` is specified the value of `translate` has no effect. Default is `null`.
- *tap:* set to `true` to allow emitting of `tap` event. Default is `false`.
- *tapMaxTravel:*  Default is 20.

The default mode is accessible at `taach.Touchable.DEFAULT_MODE`.

**Events:**

The manager emits the following events:

- *transformstart:* fired at the beginning of the gesture when the first pointer lands on the element.
- *transformmove:* fired when a pointer on the element moves so that the transformation changes.
- *transformend:* fired when the last pointer is lifted off from the element.
- *tap:* fired if all the following statements are true: 1) mode has `tap: true`, 2) last finger or other pointer was lifted from the element, and 3) pointers did not move during the gesture more in average than what is allowed by a threshold value. The default threshold of `20` can be overridden by an additional mode property `tapMaxTravel`.

The events are fired with an event object. The event object has the following properties:

- *distance:* a number. An average manhattan distance in screen pixels that a pointer has traveled after `transformstart`.
- *duration:* a number. Milliseconds from the `transformstart`
- *element:* a HTMLElement. The source of the original pointer events.
- *plane:* a taaspace.SpacePlane. The SpacePlane instance of the HTMLElement.

### taach.version

The semantic version string. Identical to the version string in package.json.

    > taach.version
    '1.2.3'


## For developers

### Architecture

Dependency tree:

- taach
  - version
  - Touchable
    - Manager
      - taaspace
      - nudged
      - Recognizer


### Example applications

Build an example app:

    $ npm run build:ex:<appname>

Play with the apps on devices in the same local network, by starting a local static file server. It will give you a QR code of the URL to the examples.

    $ npm start

## License

[MIT](LICENSE)
