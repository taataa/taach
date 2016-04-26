(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var taach = require('../../../index');
var taaspace = require('taaspace');

var space = new taaspace.Space();
var viewElement = document.getElementById('space');
var view = new taaspace.HTMLSpaceView(space, viewElement);

var taa = new taaspace.Taa('chellah_star.jpg');
var staa = new taaspace.SpaceTaa(space, taa);

staa.translate(staa.atMid(), view.atMid());

var touch = new taach.Touchable(view, staa);
touch.setMode({
  translate: true,
  press: true
});

},{"../../../index":2,"taaspace":50}],2:[function(require,module,exports){
exports.Touchable = require('./lib/Touchable');

},{"./lib/Touchable":3}],3:[function(require,module,exports){
var Emitter = require('component-emitter');
var TransformRecognizer = require('./TransformRecognizer');
var taaspace = require('taaspace');

var pressModeDefaultOptions = {};
var transformModeDefaultOptions = {};

var Touchable = function (spaceView, spaceTransformer) {
  // Make it possible to transform or press a SpaceTransformer by hand.
  // TODO If spaceTransformer is SpaceView, then use inverse.
  Emitter(this);

  this.view = spaceView;
  this.transformer = spaceTransformer;
  this.element = spaceView.getElementBySpaceNode(spaceTransformer);

  this.recognizer = null;
};

Touchable.prototype.setMode = function (modeOptions) {
  // Parameters:
  //   modeOptions:
  //     pivot: a SpacePoint
  //     press: bool
  //     rotation: bool
  //     scale: bool
  //     translation: bool

  // TODO valid modeOptions

  var self = this;
  this.recognizer = new TransformRecognizer(this.element, 'TSR');
  var r = this.recognizer;
  var spacetaa = this.transformer;
  var originalParent = null;
  var originalLocal = null;

  r.on('transformstart', function (event) {
    // Store original parent so we can return spacetaa onto it after gesture.
    originalParent = spacetaa.getParent();
    // Change parent to view => not dependent on how view is transformed.
    // Keep location the same.
    var t = spacetaa.getGlobalTransform();
    spacetaa.setParent(self.view);
    spacetaa.setGlobalTransform(t);
    // Store new local transformation. Gesture modifies it instead
    // of global transform so therefore view location does not affect.
    originalLocal = spacetaa.getLocalTransform();
    // Render in touch order
    //el.style.zIndex = utils.getIncrementalZIndex();
    self.emit('transformstart');
    self.emit('pressstart');
  });
  r.on('transformmove', function (event) {
    // A safety feature to protect from invalid TouchAPI implementations.
    if (originalLocal === null) { return; }
    // Turn to SpaceTransform
    var spaceGesture = new taaspace.SpaceTransform(self.view, event.transform);
    // View might be transformed, therefore we graft a new
    // local transformation. We transform the result.
    var t = originalLocal.switchTo(self.view).transformBy(spaceGesture);
    // Apply to spacetaa
    spacetaa.setLocalTransform(t);
    self.emit('transformmove');
  });
  //r.on('transformcancel', function (event) {
  //  self.emit('transformcancel') if applicable
  //  self.emit('presscancel') if applicable
  //});
  r.on('transformend', function (event) {
    // Drop back to original parent.
    var t = spacetaa.getGlobalTransform();
    spacetaa.setParent(originalParent);
    spacetaa.setGlobalTransform(t);
    // We do not need the initial transformation and parent anymore.
    originalLocal = null;
    originalParent = null;
    self.emit('transformend');
    self.emit('pressend');  // TODO if applicable
  });

};

Touchable.prototype.setModeOff = function () {
  // Turn touchability off
  // TODO only if this.recognizer is not null.
  this.recognizer.off();
  // TODO remove handlers inside transform recognizer as well
};

module.exports = Touchable;

},{"./TransformRecognizer":5,"component-emitter":7,"taaspace":50}],4:[function(require,module,exports){
var Emitter = require('component-emitter');
var nudged = require('nudged');

var TransformModel = function (type, pivot) {
  // Parameters:
  //   type: nudged transformation type string.
  //   pivot: [x, y] in the coordinate system of touch points.
  Emitter(this);

  // For ongoing transformation, remember where the pointers started from
  // and keep track where they are now. We store this information to
  // the pointers variable. It has a property for each current pointer.
  //
  // Example:
  // {
  //   'pointerid': {dx: <domainx>, dy: <domainy>, rx: <rangex>, ry}
  // }
  var pointers = {};
  var numPointers = 0;

  // Cumulated transformation. Like a history.
  var committedTransform = nudged.Transform.IDENTITY;
  // When the history is combined with the ongoing transformation,
  // the result is total transformation.
  var totalTransform = nudged.Transform.IDENTITY;

  // Limit the frequency of fired events
  // TODO should be done outside of the Model.
  var previousMoveDateNow = Date.now();
  var INTERVAL = 33;  // ms

  var commit = function () {
    // Move ongoint transformation to the committed transformation so that
    // the total transformation stays the same.

    // Commit ongoingTransformation. As a result
    // the domain and range of all pointers become equal.
    var id, p, domain, range, t;
    domain = [];
    range = [];
    for (id in pointers) {
      if (pointers.hasOwnProperty(id)) {
        p = pointers[id];
        domain.push([p.dx, p.dy]);
        range.push([p.rx, p.ry]); // copies
        // Move transformation from current pointers;
        // Turn ongoingTransformation to identity.
        p.dx = p.rx;
        p.dy = p.ry;
      }
    }
    // Calculate the transformation to commit and commit it by
    // combining it with the previous transformations. Total transform
    // then becomes identical with the commited ones.
    t = nudged.estimate(type, domain, range, pivot);
    committedTransform = t.multiplyBy(committedTransform);
    totalTransform = committedTransform;
  };

  var updateTransform = function () {
    // Calculate the total transformation from the committed transformation
    // and the points of the ongoing transformation.

    var id, p, domain, range, t;
    domain = [];
    range = [];
    for (id in pointers) {
      if (pointers.hasOwnProperty(id)) {
        p = pointers[id];
        domain.push([p.dx, p.dy]);
        range.push([p.rx, p.ry]);
      }
    }
    // Calculate ongoing transform and combine it with the committed.
    t = nudged.estimate(type, domain, range, pivot);
    totalTransform = t.multiplyBy(committedTransform);
  };

  this.startTouchPoint = function (id, x, y) {
    // Debug
    if (pointers.hasOwnProperty(id)) {
      console.error('Pointer ' + id + ' already exists.');
    }

    // For each new touch.
    commit();
    pointers[id] = { dx: x, dy: y, rx: x, ry: y };
    numPointers += 1;
    updateTransform();
    if (numPointers === 1) {
      // So numPointers was zero.
      // So main gesture starts.
      this.emit('start');
    }
  };

  this.moveTouchPoint = function (id, x, y) {
    // Debug
    if (!pointers.hasOwnProperty(id)) {
      console.error('Pointer ' + id + ' does not exist.');
    }

    // For each moved touch.
    pointers[id].rx = x;
    pointers[id].ry = y;
    updateTransform();
    var now = Date.now();
    if (now - previousMoveDateNow > INTERVAL) {
      this.emit('move', totalTransform);
      previousMoveDateNow = now;
    }
  };

  this.endTouchPoint = function (id) {
    // Debug
    if (!pointers.hasOwnProperty(id)) {
      console.error('Pointer ' + id + ' does not exist.');
    }

    // For each removed touch.
    commit();
    delete pointers[id];
    numPointers -= 1;
    if (numPointers === 0) {
      // So numPointers was one.
      // So high-level gesture ends.
      this.emit('end', totalTransform);
      // Return transforms to identity.
      committedTransform = nudged.Transform.IDENTITY;
      totalTransform = nudged.Transform.IDENTITY;
    }
  };
};


module.exports = TransformModel;

},{"component-emitter":7,"nudged":16}],5:[function(require,module,exports){
var Emitter = require('component-emitter');
var TransformModel = require('./TransformModel');

var TransformRecognizer = function (element, type, pivot) {
  Emitter(this);
  var self = this;

  var model = new TransformModel(type, pivot);

  // Touch support

  var onTouchStart = function (ev) {
    var cts, i;
    cts = ev.changedTouches;
    for (i = 0; i < cts.length; i += 1) {
      model.startTouchPoint(cts[i].identifier, cts[i].pageX, cts[i].pageY);
    }
    ev.preventDefault();
    ev.stopPropagation();
  };
  var onTouchMove = function (ev) {
    var cts, i;
    cts = ev.changedTouches;
    for (i = 0; i < cts.length; i += 1) {
      model.moveTouchPoint(cts[i].identifier, cts[i].pageX, cts[i].pageY);
    }
    ev.preventDefault();
    ev.stopPropagation();
  };
  var onTouchEndTouchCancel = function (ev) {
    var cts, i;
    cts = ev.changedTouches;
    for (i = 0; i < cts.length; i += 1) {
      model.endTouchPoint(cts[i].identifier);
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  element.addEventListener('touchstart', onTouchStart);
  element.addEventListener('touchmove', onTouchMove);
  element.addEventListener('touchend', onTouchEndTouchCancel);
  element.addEventListener('touchcancel', onTouchEndTouchCancel);

  // Mouse support

  var mouseDown = false;

  var onMouseDown = function (ev) {
    if (!mouseDown) {
      mouseDown = true;
      model.startTouchPoint('mouse', ev.pageX, ev.pageY);
      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  var onMouseMove = function (ev) {
    if (mouseDown) {
      model.moveTouchPoint('mouse', ev.pageX, ev.pageY);
      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  var onMouseUp = function (ev) {
    if (mouseDown) {
      mouseDown = false;
      model.endTouchPoint('mouse');
      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  element.addEventListener('mousedown', onMouseDown);
  element.addEventListener('mousemove', onMouseMove);
  element.addEventListener('mouseup', onMouseUp);
  element.addEventListener('mouseout', onMouseUp);

  // We forward the events from the model

  model.on('start', function () {
    self.emit('transformstart');
  });

  model.on('move', function (totalTransformation) {
    self.emit('transformmove', {
      transform: totalTransformation
    });
  });

  model.on('end', function (totalTransformation) {
    self.emit('transformend', {
      transform: totalTransformation
    });
  });

};


module.exports = TransformRecognizer;

},{"./TransformModel":4,"component-emitter":7}],6:[function(require,module,exports){
var hasTransitions = require('has-transitions');
var emitter = require('css-emitter');

function afterTransition(el, callback) {
  if(hasTransitions(el)) {
    return emitter(el).bind(callback);
  }
  return callback.apply(el);
};

afterTransition.once = function(el, callback) {
  afterTransition(el, function fn(){
    callback.apply(el);
    emitter(el).unbind(fn);
  });
};

module.exports = afterTransition;
},{"css-emitter":10,"has-transitions":12}],7:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

if (typeof module !== 'undefined') {
  module.exports = Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],8:[function(require,module,exports){
function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
  return exports;
};

},{}],9:[function(require,module,exports){

/**
 * CSS Easing functions
 */

module.exports = {
    'in':                'ease-in'
  , 'out':               'ease-out'
  , 'in-out':            'ease-in-out'
  , 'snap':              'cubic-bezier(0,1,.5,1)'
  , 'linear':            'cubic-bezier(0.250, 0.250, 0.750, 0.750)'
  , 'ease-in-quad':      'cubic-bezier(0.550, 0.085, 0.680, 0.530)'
  , 'ease-in-cubic':     'cubic-bezier(0.550, 0.055, 0.675, 0.190)'
  , 'ease-in-quart':     'cubic-bezier(0.895, 0.030, 0.685, 0.220)'
  , 'ease-in-quint':     'cubic-bezier(0.755, 0.050, 0.855, 0.060)'
  , 'ease-in-sine':      'cubic-bezier(0.470, 0.000, 0.745, 0.715)'
  , 'ease-in-expo':      'cubic-bezier(0.950, 0.050, 0.795, 0.035)'
  , 'ease-in-circ':      'cubic-bezier(0.600, 0.040, 0.980, 0.335)'
  , 'ease-in-back':      'cubic-bezier(0.600, -0.280, 0.735, 0.045)'
  , 'ease-out-quad':     'cubic-bezier(0.250, 0.460, 0.450, 0.940)'
  , 'ease-out-cubic':    'cubic-bezier(0.215, 0.610, 0.355, 1.000)'
  , 'ease-out-quart':    'cubic-bezier(0.165, 0.840, 0.440, 1.000)'
  , 'ease-out-quint':    'cubic-bezier(0.230, 1.000, 0.320, 1.000)'
  , 'ease-out-sine':     'cubic-bezier(0.390, 0.575, 0.565, 1.000)'
  , 'ease-out-expo':     'cubic-bezier(0.190, 1.000, 0.220, 1.000)'
  , 'ease-out-circ':     'cubic-bezier(0.075, 0.820, 0.165, 1.000)'
  , 'ease-out-back':     'cubic-bezier(0.175, 0.885, 0.320, 1.275)'
  , 'ease-out-quad':     'cubic-bezier(0.455, 0.030, 0.515, 0.955)'
  , 'ease-out-cubic':    'cubic-bezier(0.645, 0.045, 0.355, 1.000)'
  , 'ease-in-out-quart': 'cubic-bezier(0.770, 0.000, 0.175, 1.000)'
  , 'ease-in-out-quint': 'cubic-bezier(0.860, 0.000, 0.070, 1.000)'
  , 'ease-in-out-sine':  'cubic-bezier(0.445, 0.050, 0.550, 0.950)'
  , 'ease-in-out-expo':  'cubic-bezier(1.000, 0.000, 0.000, 1.000)'
  , 'ease-in-out-circ':  'cubic-bezier(0.785, 0.135, 0.150, 0.860)'
  , 'ease-in-out-back':  'cubic-bezier(0.680, -0.550, 0.265, 1.550)'
};

},{}],10:[function(require,module,exports){
/**
 * Module Dependencies
 */

var events = require('event');

// CSS events

var watch = [
  'transitionend'
, 'webkitTransitionEnd'
, 'oTransitionEnd'
, 'MSTransitionEnd'
, 'animationend'
, 'webkitAnimationEnd'
, 'oAnimationEnd'
, 'MSAnimationEnd'
];

/**
 * Expose `CSSnext`
 */

module.exports = CssEmitter;

/**
 * Initialize a new `CssEmitter`
 *
 */

function CssEmitter(element){
  if (!(this instanceof CssEmitter)) return new CssEmitter(element);
  this.el = element;
}

/**
 * Bind CSS events.
 *
 * @api public
 */

CssEmitter.prototype.bind = function(fn){
  for (var i=0; i < watch.length; i++) {
    events.bind(this.el, watch[i], fn);
  }
  return this;
};

/**
 * Unbind CSS events
 * 
 * @api public
 */

CssEmitter.prototype.unbind = function(fn){
  for (var i=0; i < watch.length; i++) {
    events.unbind(this.el, watch[i], fn);
  }
  return this;
};

/**
 * Fire callback only once
 * 
 * @api public
 */

CssEmitter.prototype.once = function(fn){
  var self = this;
  function on(){
    self.unbind(on);
    fn.apply(self.el, arguments);
  }
  self.bind(on);
  return this;
};


},{"event":11}],11:[function(require,module,exports){

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  if (el.addEventListener) {
    el.addEventListener(type, fn, capture);
  } else {
    el.attachEvent('on' + type, fn);
  }
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  if (el.removeEventListener) {
    el.removeEventListener(type, fn, capture);
  } else {
    el.detachEvent('on' + type, fn);
  }
  return fn;
};

},{}],12:[function(require,module,exports){
/**
 * This will store the property that the current
 * browser uses for transitionDuration
 */
var property;

/**
 * The properties we'll check on an element
 * to determine if it actually has transitions
 * We use duration as this is the only property
 * needed to technically have transitions
 * @type {Array}
 */
var types = [
  "transitionDuration",
  "MozTransitionDuration",
  "webkitTransitionDuration"
];

/**
 * Determine the correct property for this browser
 * just once so we done need to check every time
 */
while(types.length) {
  var type = types.shift();
  if(type in document.body.style) {
    property = type;
  }
}

/**
 * Determine if the browser supports transitions or
 * if an element has transitions at all.
 * @param  {Element}  el Optional. Returns browser support if not included
 * @return {Boolean}
 */
function hasTransitions(el){
  if(!property) {
    return false; // No browser support for transitions
  }
  if(!el) {
    return property != null; // We just want to know if browsers support it
  }
  var duration = getComputedStyle(el)[property];
  return duration !== "" && parseFloat(duration) !== 0; // Does this element have transitions?
}

module.exports = hasTransitions;
},{}],13:[function(require,module,exports){

var prop = require('transform-property');

// IE <=8 doesn't have `getComputedStyle`
if (!prop || !window.getComputedStyle) {
  module.exports = false;

} else {
  var map = {
    webkitTransform: '-webkit-transform',
    OTransform: '-o-transform',
    msTransform: '-ms-transform',
    MozTransform: '-moz-transform',
    transform: 'transform'
  };

  // from: https://gist.github.com/lorenzopolidori/3794226
  var el = document.createElement('div');
  el.style[prop] = 'translate3d(1px,1px,1px)';
  document.body.insertBefore(el, null);
  var val = getComputedStyle(el).getPropertyValue(map[prop]);
  document.body.removeChild(el);
  module.exports = null != val && val.length && 'none' != val;
}

},{"transform-property":52}],14:[function(require,module,exports){
module.exports = function loadimages(imgSrcs, then) {
  // Parameters
  //   imgSrcs
  //     array of image source paths OR single source path string.
  //   then(err, imgElements)
  //     Will be called after all the images are loaded. If string was given,
  //     imgElements is an Image instead of array of Images.

  var numberOfImages, stringGiven, thereWasSuccess, thereWasError, imgs;
  var onloadsCalled, onload, onerror;

  if (typeof then !== 'function') {
    throw new Error('callback should be a function: ' + then);
  }

  if (typeof imgSrcs === 'string') {
    numberOfImages = 1;
    stringGiven = true;
    imgSrcs = [imgSrcs]; // Normalize
  } else {
    // Array of images
    numberOfImages = imgSrcs.length;
    stringGiven = false;
  }
  thereWasSuccess = false;
  thereWasError = false;

  imgs = [];

  onloadsCalled = 0;
  onload = function () {
    // Note:
    //   this = Image
    if (!thereWasError) {
      onloadsCalled += 1;
      var isFinalImage = (onloadsCalled === numberOfImages);
      if (isFinalImage) {
        thereWasSuccess = true;
        if (stringGiven) {
          then(null, imgs[0]);
        } else {
          then(null, imgs);
        }
      }
    }
  };

  onerror = function (errMsg) {
    // Note:
    //   this = Image

    // No errors after success.
    if (!thereWasSuccess) {
      thereWasError = true;
      then(errMsg, null);
    }

    // Prevent firing the default event handler
    // https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers.onerror#Parameters
    return true;
  };

  for (i = 0; i < imgSrcs.length; i += 1) {
    imgs.push(new Image());
    imgs[i].onload = onload;
    imgs[i].onerror = onerror;
    imgs[i].src = imgSrcs[i];
  }
};

},{}],15:[function(require,module,exports){
// Patch IE9 and below
try {
  document.createElement('DIV').style.setProperty('opacity', 0, '');
} catch (error) {
  CSSStyleDeclaration.prototype.getProperty = function(a) {
    return this.getAttribute(a);
  };
  
  CSSStyleDeclaration.prototype.setProperty = function(a,b) {
    return this.setAttribute(a, b + '');
  };

  CSSStyleDeclaration.prototype.removeProperty = function(a) {
    return this.removeAttribute(a);
  };
}

/**
 * Module Dependencies.
 */

var Emitter = require('component-emitter');
var query = require('component-query');
var after = require('after-transition');
var has3d = require('has-translate3d');
var ease = require('css-ease');

/**
 * CSS Translate
 */

var translate = has3d
  ? ['translate3d(', ', 0)']
  : ['translate(', ')'];


/**
 * Export `Move`
 */

module.exports = Move;

/**
 * Get computed style.
 */

var style = window.getComputedStyle
  || window.currentStyle;

/**
 * Library version.
 */

Move.version = '0.5.0';

/**
 * Export `ease`
 */

Move.ease = ease;

/**
 * Defaults.
 *
 *   `duration` - default duration of 500ms
 *
 */

Move.defaults = {
  duration: 500
};

/**
 * Default element selection utilized by `move(selector)`.
 *
 * Override to implement your own selection, for example
 * with jQuery one might write:
 *
 *     move.select = function(selector) {
 *       return jQuery(selector).get(0);
 *     };
 *
 * @param {Object|String} selector
 * @return {Element}
 * @api public
 */

Move.select = function(selector){
  if ('string' != typeof selector) return selector;
  return query(selector);
};

/**
 * Initialize a new `Move` with the given `el`.
 *
 * @param {Element} el
 * @api public
 */

function Move(el) {
  if (!(this instanceof Move)) return new Move(el);
  if ('string' == typeof el) el = query(el);
  if (!el) throw new TypeError('Move must be initialized with element or selector');
  this.el = el;
  this._props = {};
  this._rotate = 0;
  this._transitionProps = [];
  this._transforms = [];
  this.duration(Move.defaults.duration)
};


/**
 * Inherit from `EventEmitter.prototype`.
 */

Emitter(Move.prototype);

/**
 * Buffer `transform`.
 *
 * @param {String} transform
 * @return {Move} for chaining
 * @api private
 */

Move.prototype.transform = function(transform){
  this._transforms.push(transform);
  return this;
};

/**
 * Skew `x` and `y`.
 *
 * @param {Number} x
 * @param {Number} y
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.skew = function(x, y){
  return this.transform('skew('
    + x + 'deg, '
    + (y || 0)
    + 'deg)');
};

/**
 * Skew x by `n`.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.skewX = function(n){
  return this.transform('skewX(' + n + 'deg)');
};

/**
 * Skew y by `n`.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.skewY = function(n){
  return this.transform('skewY(' + n + 'deg)');
};

/**
 * Translate `x` and `y` axis.
 *
 * @param {Number|String} x
 * @param {Number|String} y
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.translate =
Move.prototype.to = function(x, y){
  return this.transform(translate.join(''
    + fixUnits(x) + ', '
    + fixUnits(y || 0)));
};

/**
 * Translate on the x axis to `n`.
 *
 * @param {Number|String} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.translateX =
Move.prototype.x = function(n){
  return this.transform('translateX(' + fixUnits(n) + ')');
};

/**
 * Translate on the y axis to `n`.
 *
 * @param {Number|String} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.translateY =
Move.prototype.y = function(n){
  return this.transform('translateY(' + fixUnits(n) + ')');
};

/**
 * Scale the x and y axis by `x`, or
 * individually scale `x` and `y`.
 *
 * @param {Number} x
 * @param {Number} y
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.scale = function(x, y){
  return this.transform('scale('
    + x + ', '
    + (y || x)
    + ')');
};

/**
 * Scale x axis by `n`.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.scaleX = function(n){
  return this.transform('scaleX(' + n + ')')
};

/**
 * Apply a matrix transformation
 *
 * @param {Number} m11 A matrix coefficient
 * @param {Number} m12 A matrix coefficient
 * @param {Number} m21 A matrix coefficient
 * @param {Number} m22 A matrix coefficient
 * @param {Number} m31 A matrix coefficient
 * @param {Number} m32 A matrix coefficient
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.matrix = function(m11, m12, m21, m22, m31, m32){
  return this.transform('matrix(' + [m11,m12,m21,m22,m31,m32].join(',') + ')');
};

/**
 * Scale y axis by `n`.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.scaleY = function(n){
  return this.transform('scaleY(' + n + ')')
};

/**
 * Rotate `n` degrees.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.rotate = function(n){
  return this.transform('rotate(' + n + 'deg)');
};

/**
 * Set transition easing function to to `fn` string.
 *
 * When:
 *
 *   - null "ease" is used
 *   - "in" "ease-in" is used
 *   - "out" "ease-out" is used
 *   - "in-out" "ease-in-out" is used
 *
 * @param {String} fn
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.ease = function(fn){
  fn = ease[fn] || fn || 'ease';
  return this.setVendorProperty('transition-timing-function', fn);
};

/**
 * Set animation properties
 *
 * @param {String} name
 * @param {Object} props
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.animate = function(name, props){
  for (var i in props){
    if (props.hasOwnProperty(i)){
      this.setVendorProperty('animation-' + i, props[i])
    }
  }
  return this.setVendorProperty('animation-name', name);
}

/**
 * Set duration to `n`.
 *
 * @param {Number|String} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.duration = function(n){
  n = this._duration = 'string' == typeof n
    ? parseFloat(n) * 1000
    : n;
  return this.setVendorProperty('transition-duration', n + 'ms');
};

/**
 * Delay the animation by `n`.
 *
 * @param {Number|String} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.delay = function(n){
  n = 'string' == typeof n
    ? parseFloat(n) * 1000
    : n;
  return this.setVendorProperty('transition-delay', n + 'ms');
};

/**
 * Set `prop` to `val`, deferred until `.end()` is invoked.
 *
 * @param {String} prop
 * @param {String} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.setProperty = function(prop, val){
  this._props[prop] = val;
  return this;
};

/**
 * Set a vendor prefixed `prop` with the given `val`.
 *
 * @param {String} prop
 * @param {String} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.setVendorProperty = function(prop, val){
  this.setProperty('-webkit-' + prop, val);
  this.setProperty('-moz-' + prop, val);
  this.setProperty('-ms-' + prop, val);
  this.setProperty('-o-' + prop, val);
  return this;
};

/**
 * Set `prop` to `value`, deferred until `.end()` is invoked
 * and adds the property to the list of transition props.
 *
 * @param {String} prop
 * @param {String} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.set = function(prop, val){
  this.transition(prop);
  this._props[prop] = val;
  return this;
};

/**
 * Increment `prop` by `val`, deferred until `.end()` is invoked
 * and adds the property to the list of transition props.
 *
 * @param {String} prop
 * @param {Number} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.add = function(prop, val){
  if (!style) return;
  var self = this;
  return this.on('start', function(){
    var curr = parseInt(self.current(prop), 10);
    self.set(prop, curr + val + 'px');
  });
};

/**
 * Decrement `prop` by `val`, deferred until `.end()` is invoked
 * and adds the property to the list of transition props.
 *
 * @param {String} prop
 * @param {Number} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.sub = function(prop, val){
  if (!style) return;
  var self = this;
  return this.on('start', function(){
    var curr = parseInt(self.current(prop), 10);
    self.set(prop, curr - val + 'px');
  });
};

/**
 * Get computed or "current" value of `prop`.
 *
 * @param {String} prop
 * @return {String}
 * @api public
 */

Move.prototype.current = function(prop){
  return style(this.el).getPropertyValue(prop);
};

/**
 * Add `prop` to the list of internal transition properties.
 *
 * @param {String} prop
 * @return {Move} for chaining
 * @api private
 */

Move.prototype.transition = function(prop){
  if (!this._transitionProps.indexOf(prop)) return this;
  this._transitionProps.push(prop);
  return this;
};

/**
 * Commit style properties, aka apply them to `el.style`.
 *
 * @return {Move} for chaining
 * @see Move#end()
 * @api private
 */

Move.prototype.applyProperties = function(){
  for (var prop in this._props) {
    this.el.style.setProperty(prop, this._props[prop], '');
  }
  return this;
};

/**
 * Re-select element via `selector`, replacing
 * the current element.
 *
 * @param {String} selector
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.move =
Move.prototype.select = function(selector){
  this.el = Move.select(selector);
  return this;
};

/**
 * Defer the given `fn` until the animation
 * is complete. `fn` may be one of the following:
 *
 *   - a function to invoke
 *   - an instanceof `Move` to call `.end()`
 *   - nothing, to return a clone of this `Move` instance for chaining
 *
 * @param {Function|Move} fn
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.then = function(fn){
  // invoke .end()
  if (fn instanceof Move) {
    this.on('end', function(){
      fn.end();
    });
  // callback
  } else if ('function' == typeof fn) {
    this.on('end', fn);
  // chain
  } else {
    var clone = new Move(this.el);
    clone._transforms = this._transforms.slice(0);
    this.then(clone);
    clone.parent = this;
    return clone;
  }

  return this;
};

/**
 * Pop the move context.
 *
 * @return {Move} parent Move
 * @api public
 */

Move.prototype.pop = function(){
  return this.parent;
};

/**
 * Reset duration.
 *
 * @return {Move}
 * @api public
 */

Move.prototype.reset = function(){
  this.el.style.webkitTransitionDuration =
  this.el.style.mozTransitionDuration =
  this.el.style.msTransitionDuration =
  this.el.style.oTransitionDuration = '';
  return this;
};

/**
 * Start animation, optionally calling `fn` when complete.
 *
 * @param {Function} fn
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.end = function(fn){
  var self = this;

  // emit "start" event
  this.emit('start');

  // transforms
  if (this._transforms.length) {
    this.setVendorProperty('transform', this._transforms.join(' '));
  }

  // transition properties
  this.setVendorProperty('transition-properties', this._transitionProps.join(', '));
  this.applyProperties();

  // callback given
  if (fn) this.then(fn);

  // emit "end" when complete
  after.once(this.el, function(){
    self.reset();
    self.emit('end');
  });

  return this;
};

/**
 * Fix value units
 *
 * @param {Number|String} val
 * @return {String}
 * @api private
 */

function fixUnits(val) {
  return 'string' === typeof val && isNaN(+val) ? val : val + 'px';
}

},{"after-transition":6,"component-emitter":7,"component-query":8,"css-ease":9,"has-translate3d":13}],16:[function(require,module,exports){
/*

*/
exports.Transform = require('./lib/Transform');
exports.estimateT = require('./lib/estimateT');
exports.estimateS = require('./lib/estimateS');
exports.estimateR = require('./lib/estimateR');
exports.estimateTS = require('./lib/estimateTS');
exports.estimateTR = require('./lib/estimateTR');
exports.estimateSR = require('./lib/estimateSR');
exports.estimateTSR = require('./lib/estimateTSR');
exports.version = require('./lib/version');

exports.estimate = function (type, domain, range, pivot) {
  // Parameter
  //   type
  //     string. One of the following: 'T', 'S', 'R', 'TS', 'TR', 'SR', 'TSR'
  //   domain
  //     array of 2d arrays
  //   range
  //     array of 2d arrays
  //   pivot
  //     optional 2d array, does nothing for translation estimators
  var name = 'estimate' + type.toUpperCase();
  if (exports.hasOwnProperty(name)) {
    return exports[name](domain, range, pivot);
  } // else
  throw new Error('Unknown estimator type: ' + type);
};

},{"./lib/Transform":17,"./lib/estimateR":18,"./lib/estimateS":19,"./lib/estimateSR":20,"./lib/estimateT":21,"./lib/estimateTR":22,"./lib/estimateTS":23,"./lib/estimateTSR":24,"./lib/version":25}],17:[function(require,module,exports){

var Transform = function (s, r, tx, ty) {

  // Public, to allow user access
  this.s = s;
  this.r = r;
  this.tx = tx;
  this.ty = ty;

  this.equals = function (t) {
    return (s === t.s && r === t.r && tx === t.tx && ty === t.ty);
  };

  this.transform = function (p) {
    // p
    //   point [x, y] or array of points [[x1,y1], [x2, y2], ...]

    if (typeof p[0] === 'number') {
      // Single point
      return [s * p[0] - r * p[1] + tx, r * p[0] + s * p[1] + ty];
    } // else

    var i, c = [];
    for (i = 0; i < p.length; i += 1) {
      c.push([s * p[i][0] - r * p[i][1] + tx, r * p[i][0] + s * p[i][1] + ty]);
    }
    return c;
  };

  this.getMatrix = function () {
    // Get the transformation matrix in the format common to
    // many APIs, including:
    // - kld-affine
    //
    // Return
    //   object o, having properties a, b, c, d, e, f:
    //   [ s  -r  tx ]   [ o.a  o.c  o.e ]
    //   [ r   s  ty ] = [ o.b  o.d  o.f ]
    //   [ 0   0   1 ]   [  -    -    -  ]
    return { a: s, b: r, c: -r, d: s, e: tx, f: ty };
  };

  this.getRotation = function () {
    // in rads
    return Math.atan2(r, s);
  };

  this.getScale = function () {
    // scale multiplier
    return Math.sqrt(r * r + s * s);
  };

  this.getTranslation = function () {
    return [tx, ty];
  };

  this.inverse = function () {
    // Return inversed transform instance
    // See note 2015-10-26-16-30
    var det = s * s + r * r;
    // Test if singular transformation. These might occur when all the range
    // points are the same, forcing the scale to drop to zero.
    var eps = 0.00000001;
    if (Math.abs(det) < eps) {
      throw new Error('Singular transformations cannot be inversed.');
    }
    var shat = s / det;
    var rhat = -r / det;
    var txhat = (-s * tx - r * ty) / det;
    var tyhat = ( r * tx - s * ty) / det;
    return new Transform(shat, rhat, txhat, tyhat);
  };

  this.translateBy = function (dx, dy) {
    return new Transform(s, r, tx + dx, ty + dy);
  };

  this.scaleBy = function (multiplier, pivot) {
    // Parameter
    //   multiplier
    //   pivot
    //     optional, a [x, y] point
    var m, x, y;
    m = multiplier; // alias
    if (typeof pivot === 'undefined') {
      x = y = 0;
    } else {
      x = pivot[0];
      y = pivot[1];
    }
    return new Transform(m * s, m * r, m * tx + (1-m) * x, m * ty + (1-m) * y);
  };

  this.rotateBy = function (radians, pivot) {
    // Parameter
    //   radians
    //     from positive x to positive y axis
    //   pivot
    //     optional, a [x, y] point
    var co, si, x, y, shat, rhat, txhat, tyhat;
    co = Math.cos(radians);
    si = Math.sin(radians);
    if (typeof pivot === 'undefined') {
      x = y = 0;
    } else {
      x = pivot[0];
      y = pivot[1];
    }
    shat = s * co - r * si;
    rhat = s * si + r * co;
    txhat = (tx - x) * co - (ty - y) * si + x;
    tyhat = (tx - x) * si + (ty - y) * co + y;
    return new Transform(shat, rhat, txhat, tyhat);
  };


  this.multiplyBy = function (transform) {
    // Multiply this transformation matrix A
    // from the right with the given transformation matrix B
    // and return the result AB

    // For reading aid:
    // s -r tx  t.s -r tx
    // r  s ty *  r  s ty
    // 0  0  1    0  0  1
    var t = transform; // alias
    var shat = s * t.s - r * t.r;
    var rhat = s * t.r + r * t.s;
    var txhat = s * t.tx - r * t.ty + tx;
    var tyhat = r * t.tx + s * t.ty + ty;
    return new Transform(shat, rhat, txhat, tyhat);
  };
};

Transform.IDENTITY = new Transform(1, 0, 0, 0);

module.exports = Transform;

},{}],18:[function(require,module,exports){
var Transform = require('./Transform');

module.exports = function (domain, range, pivot) {
  var i, N, D, a0, b0, a, b, c, d, ac, ad, bc, bd, shat, rhat, tx, ty;

  N = Math.min(domain.length, range.length);
  ac = ad = bc = bd = 0;

  if (typeof pivot === 'undefined') {
    a0 = b0 = 0;
  } else {
    a0 = pivot[0];
    b0 = pivot[1];
  }

  for (i = 0; i < N; i += 1) {
    a = domain[i][0] - a0;
    b = domain[i][1] - b0;
    c = range[i][0] - a0;
    d = range[i][1] - b0;
    ac += a * c;
    ad += a * d;
    bc += b * c;
    bd += b * d;
  }

  p = ac + bd;
  q = ad - bc;

  D = Math.sqrt(p * p + q * q);

  if (D === 0) {
    // D === 0
    // <=> q === 0 and p === 0.
    // <=> ad === bc and ac === -bd
    // <=> domain in pivot OR range in pivot OR yet unknown cases
    //     where the angle cannot be determined.
    // D === 0 also if N === 0.
    // Assume identity transform to be the best guess
    return Transform.IDENTITY;
  }

  shat = p / D;
  rhat = q / D;
  tx = a0 - a0 * shat + b0 * rhat;
  ty = b0 - a0 * rhat - b0 * shat;

  return new Transform(shat, rhat, tx, ty);
};

},{"./Transform":17}],19:[function(require,module,exports){
var Transform = require('./Transform');

module.exports = function (domain, range, pivot) {
  var i, N, D, a0, b0, a, b, c, d, ac, bd, aa, bb, shat, tx, ty;

  N = Math.min(domain.length, range.length);
  ac = bd = aa = bb = 0;

  if (typeof pivot === 'undefined') {
    a0 = b0 = 0;
  } else {
    a0 = pivot[0];
    b0 = pivot[1];
  }

  for (i = 0; i < N; i += 1) {
    a = domain[i][0] - a0;
    b = domain[i][1] - b0;
    c = range[i][0] - a0;
    d = range[i][1] - b0;
    ac += a * c;
    bd += b * d;
    aa += a * a;
    bb += b * b;
  }

  D = aa + bb;

  if (D === 0) {
    // All domain points equal the pivot.
    // Identity transform is then only solution.
    // D === 0 also if N === 0.
    // Assume identity transform to be the best guess
    return Transform.IDENTITY;
  }

  // Prevent negative scaling because it would be same as positive scaling
  // and rotation => limit to zero
  shat = Math.max(0, (ac + bd) / D);
  tx = (1 - shat) * a0;
  ty = (1 - shat) * b0;

  return new Transform(shat, 0, tx, ty);
};

},{"./Transform":17}],20:[function(require,module,exports){
var Transform = require('./Transform');

module.exports = function (domain, range, pivot) {
  // Estimate optimal transformation given the domain and the range
  // so that the pivot point remains the same.
  //
  // Use cases
  //   - transform an image that has one corner fixed with a pin.
  //   - allow only scale and rotation by fixing the middle of the object
  //     to transform.
  //
  // Parameters
  //   domain, an array of [x, y] points
  //   range, an array of [x, y] points
  //   pivot, optional
  //     the point [x, y] that must remain constant in the tranformation.
  //     Defaults to origo [0, 0]
  //
  //
  var X, Y, N, s, r, tx, ty;

  // Optional pivot
  if (typeof pivot === 'undefined') {
    pivot = [0, 0];
  }

  // Alias
  X = domain;
  Y = range;

  // Allow arrays of different length but
  // ignore the extra points.
  N = Math.min(X.length, Y.length);

  var v = pivot[0];
  var w = pivot[1];

  var i, a, b, c, d;
  var a2, b2;
  a2 = b2 = 0;
  var ac, bd, bc, ad;
  ac = bd = bc = ad = 0;

  for (i = 0; i < N; i += 1) {
    a = X[i][0] - v;
    b = X[i][1] - w;
    c = Y[i][0] - v;
    d = Y[i][1] - w;
    a2 += a * a;
    b2 += b * b;
    ac += a * c;
    bd += b * d;
    bc += b * c;
    ad += a * d;
  }

  // Denominator = determinant.
  // It becomes zero iff N = 0 or X[i] = [v, w] for every i in [0, n).
  // In other words, iff all the domain points are under the fixed point or
  // there is no domain points.
  var den = a2 + b2;

  var eps = 0.00000001;
  if (Math.abs(den) < eps) {
    // The domain points are under the pivot or there is no domain points.
    // We assume identity transform be the simplest guess. It keeps
    // the domain points under the pivot if there is some.
    return new Transform(1, 0, 0, 0);
  }

  // Estimators
  s = (ac + bd) / den;
  r = (-bc + ad) / den;
  tx =  w * r - v * s + v;
  ty = -v * r - w * s + w;

  return new Transform(s, r, tx, ty);
};

},{"./Transform":17}],21:[function(require,module,exports){
var Transform = require('./Transform');

module.exports = function (domain, range) {
  var i, N, a1, b1, c1, d1, txhat, tyhat;

  N = Math.min(domain.length, range.length);
  a1 = b1 = c1 = d1 = 0;

  if (N < 1) {
    // Assume identity transform be the best guess
    return Transform.IDENTITY;
  }

  for (i = 0; i < N; i += 1) {
    a1 += domain[i][0];
    b1 += domain[i][1];
    c1 += range[i][0];
    d1 += range[i][1];
  }

  txhat = (c1 - a1) / N;
  tyhat = (d1 - b1) / N;

  return new Transform(1, 0, txhat, tyhat);
};

},{"./Transform":17}],22:[function(require,module,exports){
var Transform = require('./Transform');

module.exports = function (domain, range) {
  // Parameters
  //   domain
  //     array of [x, y] 2D arrays
  //   range
  //     array of [x, y] 2D arrays

  // Alias
  var X = domain;
  var Y = range;

  // Allow arrays of different length but
  // ignore the extra points.
  var N = Math.min(X.length, Y.length);

  var i, a, b, c, d, a1, b1, c1, d1, ac, ad, bc, bd;
  a1 = b1 = c1 = d1 = ac = ad = bc = bd = 0;
  for (i = 0; i < N; i += 1) {
    a = X[i][0];
    b = X[i][1];
    c = Y[i][0];
    d = Y[i][1];
    a1 += a;
    b1 += b;
    c1 += c;
    d1 += d;
    ac += a * c;
    ad += a * d;
    bc += b * c;
    bd += b * d;
  }

  // Denominator.
  var v = N * (ad - bc) - a1 * d1 + b1 * c1;
  var w = N * (ac + bd) - a1 * c1 - b1 * d1;
  var D = Math.sqrt(v * v + w * w);

  if (D === 0) {
    // N === 0 => D === 0
    if (N === 0) {
      return new Transform(1, 0, 0, 0);
    } // else
    // D === 0 <=> undecidable
    // We guess the translation to the mean of the range to be the best guess.
    // Here a, b represents the mean of domain points.
    return new Transform(1, 0, (c1 - a1) / N, (d1 - b1) / N);
  }

  // Estimators
  var shat = w / D;
  var rhat = v / D;
  var txhat = (-a1 * shat + b1 * rhat + c1) / N;
  var tyhat = (-a1 * rhat - b1 * shat + d1) / N;

  return new Transform(shat, rhat, txhat, tyhat);
};

},{"./Transform":17}],23:[function(require,module,exports){
var Transform = require('./Transform');

module.exports = function (domain, range) {
  // Parameters
  //   domain
  //     array of [x, y] 2D arrays
  //   range
  //     array of [x, y] 2D arrays

  // Alias
  var X = domain;
  var Y = range;

  // Allow arrays of different length but
  // ignore the extra points.
  var N = Math.min(X.length, Y.length);

  var i, a, b, c, d, a1, b1, c1, d1, a2, b2, ac, bd;
  a1 = b1 = c1 = d1 = a2 = b2 = ac = bd = 0;
  for (i = 0; i < N; i += 1) {
    a = X[i][0];
    b = X[i][1];
    c = Y[i][0];
    d = Y[i][1];
    a1 += a;
    b1 += b;
    c1 += c;
    d1 += d;
    a2 += a * a;
    b2 += b * b;
    ac += a * c;
    bd += b * d;
  }

  // Denominator.
  var N2 = N * N;
  var a12 = a1 * a1;
  var b12 = b1 * b1;
  var p = a2 + b2;
  var q = ac + bd;
  var D = N2 * p - N * (a12 + b12);

  if (D === 0) {
    // N === 0 => D === 0
    if (N === 0) {
      return new Transform(1, 0, 0, 0);
    } // else
    // D === 0 <=> all the domain points are the same
    // We guess the translation to the mean of the range to be the best guess.
    // Here a, b represents the mean of domain points.
    return new Transform(1, 0, (c1 / N) - a, (d1 / N) - b);
  }

  // Estimators
  var shat = (N2 * q - N * (a1 * c1 + b1 * d1)) / D;
  var txhat = (-N * a1 * q + N * c1 * p - b12 * c1 + a1 * b1 * d1) / D;
  var tyhat = (-N * b1 * q + N * d1 * p - a12 * d1 + a1 * b1 * c1) / D;

  return new Transform(shat, 0, txhat, tyhat);
};

},{"./Transform":17}],24:[function(require,module,exports){
var Transform = require('./Transform');

module.exports = function (domain, range) {
  // Parameters
  //   domain
  //     array of [x, y] 2D arrays
  //   range
  //     array of [x, y] 2D arrays
  var X, Y, N, s, r, tx, ty;

  // Alias
  X = domain;
  Y = range;

  // Allow arrays of different length but
  // ignore the extra points.
  N = Math.min(X.length, Y.length);

  // If length is zero, no estimation can be done. We choose the indentity
  // transformation be the best quess.
  if (N === 0) {
    return new Transform(1, 0, 0, 0);
  } // else

  var i, a, b, c, d;
  var a1 = 0;
  var b1 = 0;
  var c1 = 0;
  var d1 = 0;
  var a2 = 0;
  var b2 = 0;
  var ad = 0;
  var bc = 0;
  var ac = 0;
  var bd = 0;
  for (i = 0; i < N; i += 1) {
    a = X[i][0];
    b = X[i][1];
    c = Y[i][0];
    d = Y[i][1];
    a1 += a;
    b1 += b;
    c1 += c;
    d1 += d;
    a2 += a * a;
    b2 += b * b;
    ad += a * d;
    bc += b * c;
    ac += a * c;
    bd += b * d;
  }

  // Denominator.
  // It is zero iff X[i] = X[j] for every i and j in [0, n).
  // In other words, iff all the domain points are the same or there is only one domain point.
  var den = N * a2 + N * b2 - a1 * a1 - b1 * b1;

  var eps = 0.00000001;
  if (-eps < den && den < eps) {
    // The domain points are the same.
    // We guess the translation to the mean of the range to be the best guess.
    // Here a, b represents the mean of domain points.
    return new Transform(1, 0, (c1 / N) - a, (d1 / N) - b);
  }

  // Estimators
  s = (N * (ac + bd) - a1 * c1 - b1 * d1) / den;
  r = (N * (ad - bc) + b1 * c1 - a1 * d1) / den;
  tx = (-a1 * (ac + bd) + b1 * (ad - bc) + a2 * c1 + b2 * c1) / den;
  ty = (-b1 * (ac + bd) - a1 * (ad - bc) + a2 * d1 + b2 * d1) / den;

  return new Transform(s, r, tx, ty);
};

},{"./Transform":17}],25:[function(require,module,exports){
module.exports = '1.0.1';

},{}],26:[function(require,module,exports){
"use strict";

module.exports = SeqId

function SeqId(initial) {
  if (!(this instanceof SeqId)) {
    return new SeqId(initial)
  }
  if (initial == null) {
    initial = (Math.random() - 0.5) * Math.pow(2, 32)
  }
  this._id = initial | 0
}
SeqId.prototype.next = function () {
  this._id = (this._id + 1) | 0
  return this._id
}

},{}],27:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"./lib/Transform":28,"./lib/estimateR":29,"./lib/estimateS":30,"./lib/estimateSR":31,"./lib/estimateT":32,"./lib/estimateTR":33,"./lib/estimateTS":34,"./lib/estimateTSR":35,"./lib/version":36,"dup":16}],28:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],29:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./Transform":28,"dup":18}],30:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./Transform":28,"dup":19}],31:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./Transform":28,"dup":20}],32:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./Transform":28,"dup":21}],33:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"./Transform":28,"dup":22}],34:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./Transform":28,"dup":23}],35:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"./Transform":28,"dup":24}],36:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],37:[function(require,module,exports){
/*

View

*/
var Emitter = require('component-emitter');
var SpaceNode = require('./SpaceNode');
var SpacePlane = require('./SpacePlane');
var SpaceTransformer = require('./SpaceTransformer');
var SpaceRectangle = require('./SpaceRectangle');
var SpaceTaa = require('./SpaceTaa');
var SpaceHTML = require('./SpaceHTML');
var Space = require('./Space');
var move = require('move-js');

// Disable animations by default.
move.defaults = { duration: 0 };

var HTMLSpaceView = function (space, htmlContainer) {
  // Test if valid space
  if (!(space instanceof Space)) {
    throw 'Parent of a View must be a Space.';
  }
  // Test if valid dom element
  if (!('tagName' in htmlContainer)) {
    throw 'Container should be a DOM Element';
  }

  Emitter(this);
  SpaceNode(this);
  SpacePlane(this);
  SpaceTransformer(this);
  SpaceRectangle(this);
  var this2 = this;

  this._el = htmlContainer;

  // Two mappings from space taa ids:
  // 1. to HTML elements of the space nodes.
  // 2. to SpaceNode instances
  // Dev decision:
  //   For data structure, dict over list because key search time complexity.
  this._elements = {};
  this._nodes = {};

  (function initSize() {
    var w = this2._el.clientWidth;
    var h = this2._el.clientHeight;
    this2.resize([w, h]);
  }());

  var _hasNodeId = function (nodeid) {
    return this2._elements.hasOwnProperty(nodeid);
  };

  var transformNode = function (htmlElement, spaceNode) {
    // Transform elements because the view orientation.
    // Special handling because now we transform HTMLElements
    // that are parented on view, not space.
    // See 2016-03-05-09 for math.
    var gT = spaceNode.getGlobalTransform().T;
    var T = this2._T.inverse().multiplyBy(gT);
    // Current move.js does not prevent scientific notation reaching CSS
    // which leads to problems with Safari and Opera. Therefore we must
    // prevent the notation here.
    // Of course this will cause error in the presentation.
    // However the error is only in the presentation and thus not a problem.
    var prec = 8;
    var s = T.s.toFixed(prec);
    var r = T.r.toFixed(prec);
    var tx = T.tx.toFixed(prec);
    var ty = T.ty.toFixed(prec);
    move(htmlElement).matrix(s, r,-r, s, tx, ty).end();
  };

  var getViewSpecificId = function (spaceNodeId) {
    // Each rendered element has own ID. The ID differs from
    // the id of space nodes because a space node can become
    // visualized through multiple views.
    return this2.id + '-' + spaceNodeId;
  };


  // Listen the space for new or removed nodes or transformations

  var transformedHandler = function (spaceNode) {
    // Update css transformation.
    // If the node has children, they must also be transformed
    // because the children do not emit transformed by themselves.
    var nodes, i, node, el;
    nodes = spaceNode.getDescendants();
    nodes.push(spaceNode);

    for (i = 0; i < nodes.length; i += 1) {
      node = nodes[i];
      if (_hasNodeId(node.id)) {
        if (node instanceof SpaceTaa) {
          el = this2._elements[node.id];
          transformNode(el, node);
        } else if (node instanceof SpaceHTML) {
          el = this2._elements[node.id];
          transformNode(el, node);
        }
        // Else: no transformable representation for Views.
      }
    }
  };

  var resizedHandler = function (node) {
    var el, wh;
    if (_hasNodeId(node.id)) {
      // Safeguard: if is a SpaceRectangle
      if (node.hasOwnProperty('resize')) {
        wh = node.getSize();
        el = this2._elements[node.id];
        el.style.width = wh[0] + 'px';
        el.style.height = wh[1] + 'px';
      }
    }
  };

  var contentAddedHandler = function (spaceNode, newParent, oldParent) {
    // Parameters:
    //   spaceNode: a SpaceNode i.e. the content unit that was added.
    //   newParent: optional. The new parent of the SpaceNode
    //     Not used for anything for now but probably in the future.
    //   oldParent: optional. The old parent of the SpaceNode.
    //     Not used for anything for now but probably in the future.
    if (typeof oldParent === 'undefined') { oldParent = null; }
    if (typeof newParent === 'undefined') { newParent = null; }

    var node, el, wh;

    // SpaceView, SpaceTaa ...
    node = spaceNode;

    // Ensure the spaceNode is in same space. Otherwise,
    // if view's space has been just changed, a waiting
    // contentAdded event could add spaceNode from the old space.
    if (spaceNode.getRootParent() !== this2.getRootParent()) {
      return;
    }

    if (_hasNodeId(node.id)) {
      // Content is already drawn.
    } else {
      if (node instanceof SpaceTaa) {
        el = new Image(256, 256);
        el.src = node.taa.image.src;
        el.id = getViewSpecificId(node.id);
        el.className = 'taaspace-taa';
        // Show to client
        this2._el.appendChild(el);
        // Make referencable
        this2._elements[node.id] = el;
        this2._nodes[node.id] = node;
        // Make transformation
        transformNode(el, node);
        // Listen to further transformations
        node.on('transformed', transformedHandler);
        node.on('resized', resizedHandler);
      } else if (node instanceof SpaceHTML) {
        // Create container div.
        el = document.createElement('div');
        el.innerHTML = node.html;
        el.id = getViewSpecificId(node.id);
        el.className = 'taaspace-html';
        // Resize, and let taaspace styles do the rest.
        wh = node.getSize();
        el.style.width = wh[0] + 'px';
        el.style.height = wh[1] + 'px';
        // Render
        this2._el.appendChild(el);
        // Make referencable
        this2._elements[node.id] = el;
        this2._nodes[node.id] = node;
        // Make transformation
        transformNode(el, node);
        // Listen to further transformations
        node.on('transformed', transformedHandler);
        node.on('resized', resizedHandler);
      } else if (node instanceof HTMLSpaceView) {
        // No representation for views.
      } else {
        throw new Exception('Unknown SpaceNode subtype; cannot represent');
      }
    }
  };

  var contentRemovedHandler = function (spaceNode, oldParent, newParent) {
    if (typeof oldParent === 'undefined') { oldParent = null; }
    if (typeof newParent === 'undefined') { newParent = null; }

    var sameRoot, el, node;

    node = spaceNode; // Alias

    // Decide sameRoot
    if (oldParent === null || newParent === null) {
      sameRoot = false;
    } else {
      sameRoot = oldParent.getRootParent() === newParent.getRootParent();
    }

    if (sameRoot) {
      // No reason to remove and then add again.
    } else {
      // New parent in different space, so not displayed in this view anymore.
      if (_hasNodeId(node.id)) {
        // Remove HTML element
        el = this2._elements[node.id];
        this2._el.removeChild(el);
        // Remove from memory.
        // JS feature of delete: does not throw if key does not exist
        delete this2._elements[node.id];
        delete this2._nodes[node.id];
        // Remove handlers.
        node.off('transformed', transformedHandler);
        node.off('resized', resizedHandler);
      }
    }

  };

  // View added to new parent.
  this.on('added', function (self, newSpace, oldSpace) {
    var des, i;

    if (oldSpace === newSpace) {
      // Already set up. Do nothing.
      return;
    }

    // Render nodes from the new space.
    des = newSpace.getDescendants();
    for (i = 0; i < des.length; i += 1) {
      contentAddedHandler(des[i]);
    }

    // Start to listen for changes.
    newSpace.on('contentAdded', contentAddedHandler);
    newSpace.on('contentRemoved', contentRemovedHandler);
  });

  // View removed from parent.
  this.on('removed', function (self, oldSpace, newSpace) {
    var des, i;

    if (newSpace === oldSpace) {
      // Already set up. Do nothing.
      return;
    }

    // Stop listening for changes.
    oldSpace.off('contentAdded', contentAddedHandler);
    oldSpace.off('contentRemoved', contentRemovedHandler);

    // Remove all nodes from old space.
    des = oldSpace.getDescendants();
    for (i = 0; i < des.length; i += 1) {
      contentRemovedHandler(des[i]);
    }
  });

  // If the view is transformed, we of course need to retransform everything.
  this.on('transformed', function () {
    var id, element, node;
    for (id in this2._elements) {
      if (this2._elements.hasOwnProperty(id)) {
        element  = this2._elements[id];
        node = this2._nodes[id];
        transformNode(element, node);
      }
    }
  });

  this.getElementBySpaceNode = function (spaceNode) {
    // Get HTML element representation of the space taa.
    // Return null if not found.
    if (_hasNodeId(spaceNode.id)) {
      return this._elements[spaceNode.id];
    }
    return null;
  };

  this.getSpaceNodeByElementId = function (id) {
    // Get space taa by HTML element id
    // Return null if no space taa for such id.
    var i = id.split('-');
    var spaceViewId = i[0];
    var spaceNodeId = i[1];
    if (this.id === spaceViewId) {
      if (_hasNodeId(spaceNodeId)) {
        return this._nodes[spaceNodeId];
      }
    }
    return null;
  };

  this.getRootElement = function () {
    // Return the container HTML element.
    return this._el;
  };

  // Override the setParent so that only a Space
  // is allowed to become the parent.
  var superSetParent = this.setParent;
  this.setParent = function (space) {
    if (!(space instanceof Space)) {
      throw 'A View can only be a child of a Space';
    }
    superSetParent.call(this, space);
  };

  // View ready to be added to Space.
  this.setParent(space);
};

module.exports = HTMLSpaceView;

},{"./Space":38,"./SpaceHTML":39,"./SpaceNode":40,"./SpacePlane":42,"./SpaceRectangle":44,"./SpaceTaa":45,"./SpaceTransformer":47,"component-emitter":7,"move-js":15}],38:[function(require,module,exports){
/*
Emits
  contentAdded
  contentRemoved
    not thrown if the content to remove did not exist in the first place.
  contentTransformed
*/
var Emitter = require('component-emitter');
var SpaceNode = require('./SpaceNode');
var SpacePlane = require('./SpacePlane');

var Space = function () {
  Emitter(this);
  SpaceNode(this);
  SpacePlane(this);
  // Space has constant identity transformation _T

  // Remove possibility to add to parent.
  this.setParent = function () {
    throw new Error('Space cannot have a parent.');
  };
  this.remove = function () {
    // Silent, already removed. Otherwise would throw the error in setParent
  };
};

module.exports = Space;

},{"./SpaceNode":40,"./SpacePlane":42,"component-emitter":7}],39:[function(require,module,exports){
/*
# SpaceElement

A HTMLElement [1] in the space.

[1] https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
*/

var Emitter = require('component-emitter');
var SpaceNode = require('./SpaceNode');
var SpacePlane = require('./SpacePlane');
var SpaceTransformer = require('./SpaceTransformer');
var SpaceRectangle = require('./SpaceRectangle');

var SpaceHTML = function (parent, html) {
  // Parameters:
  //   parent:
  //     a SpaceNode
  //   html:
  //     a string, containing html
  Emitter(this);
  SpaceNode(this);
  SpacePlane(this);
  SpaceTransformer(this);
  SpaceRectangle(this);

  this.html = html;
  this.resize([256, 256]);  // Initial element size.

  this.getHTML = function () {
    return this.html;
  };

  // Ready
  this.setParent(parent);
};

module.exports = SpaceHTML;

},{"./SpaceNode":40,"./SpacePlane":42,"./SpaceRectangle":44,"./SpaceTransformer":47,"component-emitter":7}],40:[function(require,module,exports){
/*
API v3.0.0

Emits
  contentAdded
  contentRemoved
    not thrown if the content to remove did not exist in the first place.
*/
var Emitter = require('component-emitter');

// Unique ID generator. Unique over session.
// Usage: seqid.next()
// Return: int
var seqid = require('seqid')(0);

var SpaceNode = function (emitter) {
  // Parameters
  //   emitter, an Emitter.

  // Each node has an id. That is used by the parent nodes and in views.
  emitter.id = seqid.next().toString();

  // Nodes with null parent are root nodes i.e. spaces.
  // SpaceNode#remove sets _parent to null.
  emitter._parent = null;

  // Dict over list because key search time complexity
  emitter._children = {};

  // We need to store built handlers bound to children
  // to be able to remove the handlers when child is removed.
  emitter._addedHandlers = {};
  emitter._removedHandlers = {};

  emitter.getChildren = function () {
    // Return child SpaceNodes in a list.
    // Does not include the children of the children.
    var id, arr, obj;
    arr = [];
    obj = this._children;
    for (id in obj) {
      arr.push(obj[id]);
    }
    return arr;
  };

  emitter.getDescendants = function () {
    // All descendants in a list, including the children.
    var i, children, child, arr;
    arr = [];
    children = this.getChildren();
    for (i = 0; i < children.length; i += 1) {
      child = children[i];
      arr = arr.concat(child, child.getDescendants());
    }
    return arr;
  };

  emitter.getParent = function () {
    return this._parent;
  };

  emitter.getRootParent = function () {
    // Get the predecessor without parents in recursive manner.
    if (this._parent === null) {
      return this;
    }  // else
    return this._parent.getRootParent();
  };

  emitter.hasChild = function (spaceNode) {
    // Return
    //   true if spaceNode is a child of this.
    return spaceNode._parent === this;
  };

  emitter.hasDescendant = function (spaceNode) {
    // Return
    //   true if spaceNode is a descendant of this.
    var p = spaceNode._parent;
    while (p !== null && p !== this) {
      p = p._parent;
    }
    if (p === null) {
      return false;
    }  // else
    return true;
  };

  emitter.remove = function () {
    // Remove this space node from its parent.
    // Return: see setParent
    return this.setParent(null);
  };

  emitter.setParent = function (newParent) {
    // Add to new parent.

    // Dev note about cyclic relationship detection:
    //   A
    //   |
    //  / \
    // B   C
    //
    // Different cases. The emitter relationship status changes...
    //   from root to root:
    //     no worries about cyclic structures
    //   from root to child:
    //     If the new parent is a descendant of the emitter, problems.
    //     If the new parent the emitter itself, problems.
    //   from child to root:
    //     Loses parenthood. No cyclic worries.
    //   from child to child:
    //     If the new parent is a descendant of the emitter, problems.
    //     If the new parent the emitter itself, problems.
    // If new parent has the emitter as descendant already...
    //   then no worries because emitter would only create a new branch.

    var oldParent = this._parent;

    if (oldParent === null) {
      if (newParent === null) {
        // From root to root.
        // Do nothing
      } else {
        // From root to child.
        // Prevent cycles.
        if (this === newParent || this.hasDescendant(newParent)) {
          throw new Error('Cyclic parent-child relationships are forbidden.');
        }
        this._parent = newParent;
        this._parent._addChild(this);
        this.emit('added', this, this._parent, null);
        newParent.emit('contentAdded', this, this._parent, null);
      }
    } else {
      if (newParent === null) {
        // From child to root.
        this._parent = null;  // Becomes new root node.
        oldParent._removeChild(this);
        this.emit('removed', this, oldParent, null);
        oldParent.emit('contentRemoved', this, oldParent, null);
      } else {
        // From child to child.
        // Prevent cycles.
        if (this === newParent || this.hasDescendant(newParent)) {
          throw new Error('Cyclic parent-child relationships are forbidden.');
        }
        this._parent = newParent;
        oldParent._removeChild(this);
        newParent._addChild(this);
        this.emit('removed', this, oldParent, newParent);
        this.emit('added', this, newParent, oldParent);
        // With both oldParent and newParent, SpaceView is able to
        // decide whether to keep same HTMLElement or recreate it.
        oldParent.emit('contentRemoved', this, oldParent, newParent);
        newParent.emit('contentAdded', this, newParent, oldParent);
      }
    }

  };

  emitter._addChild = function (child) {
    // To be called from child.setParent().
    // If called from anywhere else, ensure cyclic relationships are detected.
    //
    // Parameters
    //   child, A SpaceNode
    //
    // Return
    //   undefined
    //
    // Dev. note:
    //   Previously this was called from the SpaceNode constructor.
    //   However, because SpaceNode upgrade is done before other
    //   upgrades, the child would not be ready to be added to parent.

    var sc = child; // alias
    var self = this;

    this._children[sc.id] = sc;

    // Start to listen if child has beed added, removed or transformed
    var addedHandler = function (a, b, c) {
      self.emit('contentAdded', a, b, c);
    };
    var removedHandler = function (a, b, c) {
      self.emit('contentRemoved', a, b, c);
    };
    // added and removed events are not listened because
    // for after successfully made add or remove,
    // contentAdded and contentRemoved are fired in setParent.
    sc.on('contentAdded', addedHandler);
    sc.on('contentRemoved', removedHandler);
    this._addedHandlers[sc.id] = addedHandler;
    this._removedHandlers[sc.id] = removedHandler;
  };

  emitter._removeChild = function (child) {
    // To be called from SpaceNode#remove
    // Precondition: child in space
    var sc, h;

    sc = child; // alias
    delete this._children[sc.id];

    // Remove handlers
    h = this._addedHandlers[sc.id];
    delete this._addedHandlers[sc.id];
    sc.off('contentAdded', h);

    h = this._removedHandlers[sc.id];
    delete this._removedHandlers[sc.id];
    sc.off('contentRemoved', h);
  };
};

module.exports = SpaceNode;

},{"component-emitter":7,"seqid":26}],41:[function(require,module,exports){
// API v3.0.0
//
// SpacePixel
// A simple rectangular object in space with size 1x1
// Created for testing purposes.

var Emitter = require('component-emitter');
var SpaceNode = require('./SpaceNode');
var SpacePlane = require('./SpacePlane');
var SpaceTransformer = require('./SpaceTransformer');
var SpaceRectangle = require('./SpaceRectangle');

var SpacePixel = function (parent) {
  // A 1x1 rectangle
  //
  // Parameters:
  //   parent
  //     a SpaceNode
  Emitter(this);
  SpaceNode(this);
  SpacePlane(this);
  SpaceTransformer(this);
  SpaceRectangle(this);

  this.resize([1, 1]);
  this.setParent(parent);
};

module.exports = SpacePixel;

},{"./SpaceNode":40,"./SpacePlane":42,"./SpaceRectangle":44,"./SpaceTransformer":47,"component-emitter":7}],42:[function(require,module,exports){
/*
SpacePlane
API v3.0.0

A SpacePlane represents a coordinate system. It does not include
methods to transform the system. SpacePlane and SpaceTransformer are separated
because we want to have planes that cannot be transformed, as the Space.

*/

var nudged = require('nudged');
var SpacePoint = require('./SpacePoint');
var SpaceTransform = require('./SpaceTransform');

var at = function (xy) {
  // Return
  //   A SpacePoint at (x,y) on the plane.
  if (xy.length !== 2) {  // DEBUG TODO remove this
    throw 'Invalid point, use array [x, y]';
  }
  return new SpacePoint(this, xy);  // Note: this === spaceNode
};

var SpacePlane = function (spaceNode) {
  // Parameters
  //   spaceNode
  //     A SpaceNode to monkey patch to SpacePlane

  // Coordinate transformation.
  // The transformation from the plane to the parent (space).
  // See 2016-03-05-09
  // Let:
  //   x_space, a point in space
  //   x_plane, a point on the plane.
  //   T, the coordinate transformation of the plane
  // Then:
  //   x_space = T * x_plane
  //
  // For Space, it is obviously the identity transform:
  //   x_space = T * x_space
  spaceNode._T = nudged.Transform.IDENTITY; // identity transformation

  spaceNode.at = at;

  spaceNode.getLocalTransform = function () {
    // Local coordinate transform from plane to parent,
    // represented as SpaceTransform on the plane.
    //
    // Return
    //   SpaceTransform
    //
    // Note:
    //   return transformation from plane to parent, i.e.
    //     xy_parent = T * xy_plane
    // Needed when we want to store transformer's position for later use.
    if (this._parent === null) {
      return new SpaceTransform(this);
    } // else
    return new SpaceTransform(this, this._T);
    // An alternative would have been to graft to the parent's coords:
    //   return new SpaceTransform(this._parent, this._T);
    // This is kind of equivalent because:
    //   this_T_on_plane = this_T * this_T * inv(this_T) = this_T
    // However, it is more natural if getLocalTransform is represented on
    // the local coord system.
  };

  spaceNode.getGlobalTransform = function () {
    // Return:
    //   SpaceTransform
    //     Transformation from the plane to root.
    //     Represented on the root.
    //
    // Dev note:
    //   Local transformations go like:
    //     xy_parent = T_plane * xy_plane
    //     xy_parent_parent = T_parent * xy_parent
    //     ...
    //     xy_root = T_parent_parent..._parent * xy_parent_parent..._parent
    //   Therefore global transformation is:
    //     xy_root = T_parent_..._parent * ... * T_parent * T_plane * xy_plane
    var T, plane;

    if (this._parent === null) {
      // We must mock the space. Otherwise, if we put self to
      // SpaceTransform as reference, SpaceTransform constructor
      // will ask for self.getGlobalTransform and thus we end up
      // in a endless loop.
      plane = { _T: nudged.Transform.IDENTITY };
      return new SpaceTransform(plane);  // We are root, thus identity
    } // else

    T = this._T;
    plane = this._parent;
    while (plane._parent !== null) {
      T = plane._T.multiplyBy(T);
      plane = plane._parent;
    }

    // plane._parent === null, hence plane is the root.
    return new SpaceTransform(plane, T);
  };

  spaceNode.resetTransform = function () {
    // Become space. Called e.g. when plane is removed from parent.
    this._T = nudged.Transform.IDENTITY;
  };

};

module.exports = SpacePlane;

},{"./SpacePoint":43,"./SpaceTransform":46,"nudged":27}],43:[function(require,module,exports){
// API v3.0.0

var nudged = require('nudged');

var SpacePoint = function (reference, xy) {
  // Example
  //   var p = taaspace.SpacePoint(taa, [x, y]);
  //
  // Parameter
  //   reference
  //     a SpaceNode, SpacePoint, or SpaceTransform
  //       an item in space, enabling coord projections.
  //   xy
  //     [x, y] array. Optional, defaults to [0,0]

  if (typeof xy === 'undefined') { xy = [0, 0]; }
  this.xy = xy;

  // The SpacePlane's transformation the xy are on.
  // Design note: at first, the references were SpacePlanes and not
  // transformations. But because a SpacePlane can move or be removed,
  // we chose only the transformation to be remembered.
  // Design note: later we found it would be convenient for debugging
  // to know where the point came from, which led to this._origin.
  // After that we found that in toSpace method, we would need reference
  // to space, although we only have implicit reference to its coords.
  // Therefore this._origin was dropped.

  if (reference.hasOwnProperty('getGlobalTransform')) {
    // Is a SpacePlane
    this._T = reference.getGlobalTransform().T;
  } else {
    // Is a SpacePoint
    this._T = reference._T;
  }
};

var proto = SpacePoint.prototype;

proto.equals = function (point) {
  return (this.xy[0] === point.xy[0] &&
    this.xy[1] === point.xy[1] &&
    this._T.equals(point._T));
};

proto.offset = function (dx, dy) {
  // Create a new point nearby.
  //
  // Parameter
  //   dx
  //     Movement towards positive x
  //   dy
  //     ...
  var xy = [this.xy[0] + dx, this.xy[1] + dy];
  return new SpacePoint(this, xy);
};

proto.polarOffset = function (radius, radians) {
  // Create a new point moved by the polar coordinates
  var x = this.xy[0] + radius * Math.cos(radians);
  var y = this.xy[1] + radius * Math.sin(radians);
  return new SpacePoint(this, [x, y]);
};

proto.to = function (target) {
  // Create a new SpacePoint at same location but on a
  // different SpacePlane.
  //
  // Parameter
  //   target, a SpacePlane or null.
  //
  // Implementation note (See 2016-03-05-09):
  //
  // First, compute coord. transf. B from the current plane
  // to the space:
  //   x_space = B * x_plane  <=>  x_plane = inv(B) * x_space
  //   B = plane._T
  // Second, let A be coord. transf. from the space to the target plane:
  //   x_target = A * x_space
  //   A = inv(target._T)
  // Therefore combined coord. transf. C from the curr. plane to the target:
  //   x_target = C * x_plane
  //   <=> A * x_space = C * inv(B) * x_space
  //   <=> A = C * inv(B)
  //   <=> C = AB
  //   <=> C = inv(target._T) * plane._T
  //

  if (target === null) {
    // target is the root node (space)
    return this.toSpace();
  }

  // Target's global transformation. This._T is already global.
  var target_gT;
  if (target.hasOwnProperty('_T')) {
    // SpacePoint or SpaceTransform
    target_gT = target._T;
  } else if ('getGlobalTransform' in target) {
    // SpacePlane
    target_gT = target.getGlobalTransform().T;
  } else {
    throw new Error('Cannot convert SpacePoint to: ' + target);
  }

  if (target_gT.equals(this._T)) {
    return this;
  } // else
  var C = target_gT.inverse().multiplyBy(this._T);
  var xy_target = C.transform(this.xy);
  return new SpacePoint(target, xy_target);
};

proto.toSpace = function () {
  // Create a new SpacePoint at same location but represented on space coords.
  //
  // Implementation note:
  //   We already have coord. transf. from the current plane to the space:
  //     plane._T
  var xySpace = this._T.transform(this.xy);
  var spaceMock = { '_T': nudged.Transform.IDENTITY };
  return new SpacePoint(spaceMock, xySpace);
};

proto.transformBy = function (tr) {
  // Create a new SpacePoint by SpaceTransform.
  //
  // Parameter
  //   tr
  //     a SpaceTransform
  var t = tr.to(this);
  var xy_hat = t.T.transform(this.xy);
  return new SpacePoint(this, xy_hat);
};


SpacePoint.normalize = function (points, plane) {
  // Convert all the space points onto same plane.
  //
  // Arguments:
  //   points, array of SpacePoints
  //   plane, a SpacePlane onto normalize. null = space
  // Return:
  //   array of SpacePoints
  var i, p, normalized;
  normalized = [];
  for (i = 0; i < points.length; i += 1) {
    p = points[i];
    normalized.push(p.to(plane));
  }
  return normalized;
};

SpacePoint.toXY = function (points) {
  // Convert SpacePoints to [[x1,y1], [x2,y2], ...]
  var i, xys;
  xys = [];
  for (i = 0; i < points.length; i += 1) {
    xys.push(points[i].xy);
  }
  return xys;
};

SpacePoint.normalizeXY = function (points, plane) {
  // Convert all the space points onto same plane and
  // represent the as xy list: [[x1,y1], [x2,y2], ...].
  //
  // Arguments:
  //   points, array of SpacePoints
  //   plane, a SpacePlane onto normalize. null = space
  // Return:
  //   array of [x,y] points
  var i, p, normalized;
  normalized = [];
  for (i = 0; i < points.length; i += 1) {
    p = points[i];
    normalized.push(p.to(plane).xy);
  }
  return normalized;
};


module.exports = SpacePoint;

},{"nudged":27}],44:[function(require,module,exports){
// API v3.0.0

var SpacePoint = require('./SpacePoint');

var SpaceRectangle = function (spaceTransformer) {

  var t = spaceTransformer;  // Alias

  // Rectangles have size.
  // In its own coordinates, rectangle's right bottom corner
  // is located at [width, height].
  // By default transformation, width 1 and height 1 equal to 1 space unit.
  var width = 1;
  var height = 1;

  t.atNorm = function (xy) {
    // Return a SpacePoint by coordinates normalized about the size.
    // atNorm([1,0]) returns the point at the right upper corner.
    return new SpacePoint(t, [width * xy[0], height * xy[1]]);
  };

  t.atMid = function () {
    return new SpacePoint(t, [width / 2, height / 2]);
  };

  t.atMidN = function () {
    return new SpacePoint(t, [width / 2, 0]);
  };

  t.atMidW = function () {
    return new SpacePoint(t, [0, height / 2]);
  };

  t.atMidE = function () {
    return new SpacePoint(t, [width, height / 2]);
  };

  t.atMidS = function () {
    return new SpacePoint(t, [width / 2, height]);
  };

  t.atNW = function () {
    return new SpacePoint(t, [0, 0]);
  };

  t.atNE = function () {
    return new SpacePoint(t, [width, 0]);
  };

  t.atSW = function () {
    return new SpacePoint(t, [0, height]);
  };

  t.atSE = function () {
    return new SpacePoint(t, [width, height]);
  };

  t.getSize = function () {
    return [width, height];
  };

  t.resize = function (dimensions) {
    // Parameter
    //   dimensions, [width, height]
    width = dimensions[0];
    height = dimensions[1];

    this.emit('resized', t);
  };

};

module.exports = SpaceRectangle;

},{"./SpacePoint":43}],45:[function(require,module,exports){
// API v3.0.0

var Emitter = require('component-emitter');
var SpaceNode = require('./SpaceNode');
var SpacePlane = require('./SpacePlane');
var SpaceTransformer = require('./SpaceTransformer');
var SpaceRectangle = require('./SpaceRectangle');

var SpaceTaa = function (parent, taa) {
  // Parameters:
  //   parent
  //     a SpaceNode
  //   taa
  //     a Taa
  Emitter(this);
  SpaceNode(this);
  SpacePlane(this);
  SpaceTransformer(this);
  SpaceRectangle(this);

  this.taa = taa;
  this.resize([256, 256]);  // Size of taa.

  this.setParent(parent);
};

module.exports = SpaceTaa;

},{"./SpaceNode":40,"./SpacePlane":42,"./SpaceRectangle":44,"./SpaceTransformer":47,"component-emitter":7}],46:[function(require,module,exports){
/*
Similarly as a point can be represented in multiple coordinate systems,
so can a transformation. To prevent users from figuring out how transformations
are converted to other representations, we have SpaceTransform.

The API is similar to SpacePoint. However, instead of offset methods, we have
a set of similarity transformation methods.
*/
var Transform = require('./Transform');
var SpacePoint = require('./SpacePoint');
var nudged = require('nudged');

var SpaceTransform = function (reference, T) {
  // Immutable i.e. new instances are returned.
  //
  // Example
  //   var t = taaspace.SpaceTransform(taa, taaspace.Transform.IDENTITY);
  //
  // Parameter
  //   reference
  //     a SpacePlane, SpacePoint, or SpaceTransform
  //       an item in space, enabling coord projections.
  //   T
  //     Optional. A taaspace.Transform. Default to identity transform.

  // DEBUG
  if (!reference.hasOwnProperty('_T')) throw 'invalid reference';
  if (T && !T.hasOwnProperty('tx')) throw 'invalid transform';

  // A transformation on the plane.
  if (typeof T === 'undefined') { T = Transform.IDENTITY; }
  this.T = T;

  // The coordinate transformation of the plane.
  if (reference.hasOwnProperty('getGlobalTransform')) {
    // Is a SpacePlane
    this._T = reference.getGlobalTransform().T;
  } else {
    // Is a SpacePoint or SpaceTransform
    this._T = reference._T;
  }
};

var proto = SpaceTransform.prototype;

proto.switchTo = function (newReference) {
  // Combine the transformation to a new coordinate system.
  // Return new SpaceTransform.
  return new SpaceTransform(newReference, this.T);
};

proto.equals = function (st) {
  // Parameters:
  //   st: a SpaceTransform
  return (this.T.equals(st.T) && this._T.equals(st._T));
};

proto.inverse = function () {
  // Return inversed transformation on the same plane.
  return new SpaceTransform(this, this.T.inverse());
};

proto.to = function (target) {
  // Convert the transform onto the target coordinate plane.
  //
  // Parameters:
  //   target: a SpacePlane, SpacePoint, or SpaceTransform
  //
  // Return:
  //   new SpaceTransform
  var targetGT, this2target, tOnTarget;

  if (target === null) {
    // target is the root node (space)
    return this.toSpace();
  }

  // Target's global transformation. This._T is already global.
  if (target.hasOwnProperty('_T')) {
    targetGT = target._T;
  } else if ('getGlobalTransform' in target) {
    targetGT = target.getGlobalTransform().T;
  } else {
    throw new Error('Cannot convert SpaceTransform to: ' + target);
  }

  // Avoid unnecessary, probably rounding errors inducing computation.
  if (targetGT.equals(this._T)) {
    return this;
  } // else

  // The transformation on the target plane equals to:
  // 1) convert from target to current
  // 2) execute the transformation
  // 3) convert back to target.
  // Fortunately we can combine these steps into a one transformation matrix.
  // Let us first compute conversion from this to target and remember that:
  //   x_space = T_plane * x_plane
  this2target = targetGT.inverse().multiplyBy(this._T);
  tOnTarget = this2target.multiplyBy(this.T.multiplyBy(this2target.inverse()));
  return new SpaceTransform(target, tOnTarget);
};

proto.toSpace = function () {
  // Convert the transform onto the space coordinate plane.
  // Return a new SpaceTransform.
  //
  // Implementation note:
  //   We already have coord. transf. from the current plane to the space:
  //     this._T

  // To simulate the transformation on space:
  // 1) convert from space to the plane: this._T.inverse()
  // 2) apply the transformation
  // 3) convert from plane back to the space: this._T
  var tOnSpace = this._T.multiplyBy(this.T.multiplyBy(this._T.inverse()));
  var spaceMock = { '_T': Transform.IDENTITY };
  return new SpaceTransform(spaceMock, tOnSpace);
};

proto.transformBy = function (spaceTransform) {
  // Transform the image of this by given SpaceTransform.
  var t = spaceTransform.to(this).T;
  var nt = t.multiplyBy(this.T);
  return new SpaceTransform(this, nt);
};

proto.translate = function (domain, range) {
  // Move transform image horizontally and vertically by example.
  //
  // Translate the plane so that after the translation, the domain points
  // would be as close to given range points as possible.
  //
  // Parameters:
  //   domain: array of SpacePoints
  //   range: array of SpacePoints
  var st = SpaceTransform.estimate(this, 'T', domain, range);
  return new SpaceTransform(this, st.T.multiplyBy(this.T));
};

proto.scale = function (pivot, multiplierOrDomain, range) {
  // Parameters:
  //   pivot: a SpacePoint
  //   multiplier: the scale factor, > 0
  //  OR
  //   pivot: a SpacePoint
  //   domain: array of SpacePoints
  //   range: array of SpacePoints
  var useMultiplier, normPivot, domain, t, st;

  useMultiplier = (typeof range === 'undefined');

  if (useMultiplier) {
    normPivot = pivot.to(this);
    // Multiplier does not depend on plane.
    t = this.T.scaleBy(multiplierOrDomain, normPivot.xy);
    return new SpaceTransform(this, t);
  } else {
    domain = multiplierOrDomain;
    st = SpaceTransform.estimate(this, 'S', domain, range, pivot);
    // Combine it with the current transformation
    t = st.T.multiplyBy(this.T);
    return new SpaceTransform(this, t);
  }
};

proto.rotate = function (pivot, radiansOrDomain, range) {
  // Parameters:
  //   pivot: a SpacePoint
  //   radians: rotation angle
  //  OR
  //   pivot: a SpacePoint
  //   domain: array of SpacePoints
  //   range: array of SpacePoints
  var useRadians, normPivot, domain, t, st;

  useRadians = (typeof range === 'undefined');

  if (useRadians) {
    normPivot = pivot.to(this);
    // Radians do not depend on plane.
    t = this.T.rotateBy(radiansOrDomain, normPivot.xy);
    return new SpaceTransform(this, t);
  } else {
    domain = radiansOrDomain;
    st = SpaceTransform.estimate(this, 'R', domain, range, pivot);
    // Combine it with the current transformation
    t = st.T.multiplyBy(this.T);
    return new SpaceTransform(this, t);
  }
};

proto.translateScale = function (domain, range) {
  // Parameters:
  //   domain: array of SpacePoints
  //   range: array of SpacePoints
  var st = SpaceTransform.estimate(this, 'TS', domain, range);
  return new SpaceTransform(this, st.T.multiplyBy(this.T));
};

proto.translateRotate = function (domain, range) {
  // Parameters:
  //   domain: array of SpacePoints
  //   range: array of SpacePoints
  var st = SpaceTransform.estimate(this, 'TR', domain, range);
  return new SpaceTransform(this, st.T.multiplyBy(this.T));
};

proto.scaleRotate = function (pivot, domain, range) {
  // Parameters:
  //   pivot: SpacePoint
  //   domain: array of SpacePoints
  //   range: array of SpacePoints
  var st = SpaceTransform.estimate(this, 'SR', domain, range, pivot);
  return new SpaceTransform(this, st.T.multiplyBy(this.T));
};

proto.translateScaleRotate = function (domain, range) {
  // Parameters:
  //   domain: array of SpacePoints
  //   range: array of SpacePoints
  var st = SpaceTransform.estimate(this, 'TSR', domain, range);
  return new SpaceTransform(this, st.T.multiplyBy(this.T));
};

SpaceTransform.estimate = function (plane, type, domain, range, pivot) {
  // Estimate SpaceTransform.
  //
  // Parameters:
  //   plane: SpacePlane, the plane of the returned SpaceTransform
  //   types: transformation type.
  //     Available types: T,S,R,TS,TR,SR,TSR (see nudged for further details)
  //   domain: array of SpacePoints
  //   range: array of SpacePoints
  //   pivot: SpacePoint, optional pivot, used with types S,R,SR

  var normPivot;
  if (typeof pivot !== 'undefined') {
    normPivot = SpacePoint.normalizeXY([pivot])[0];
  }

  // Allow single points
  if (domain.hasOwnProperty('_T')) { domain = [domain]; }
  if (range.hasOwnProperty('_T')) { range = [range]; }

  // Convert all SpacePoints onto the plane and to arrays
  var normDomain = SpacePoint.normalizeXY(domain, plane);
  var normRange = SpacePoint.normalizeXY(range, plane);

  // Then compute optimal transformation on the plane
  var T = nudged.estimate(type, normDomain, normRange, normPivot);
  return new SpaceTransform(plane, T);
};

module.exports = SpaceTransform;

},{"./SpacePoint":43,"./Transform":49,"nudged":27}],47:[function(require,module,exports){
// API v3.0.0
var nudged = require('nudged');
var Transform = require('./Transform');
var SpacePoint = require('./SpacePoint');
var SpaceTransform = require('./SpaceTransform');


var SpaceTransformer = function (plane) {
  // Upgrades SpacePlane to SpaceTransformer
  //
  // Parameters
  //   plane
  //     a SpacePlane

  plane.setLocalTransform = function (spaceTransform) {
    // Transform the plane so that it would be equivalent to
    // transform plane from initial position by the SpaceTransform.
    //
    // This method is needed when we whan to restore stored position,
    // maybe after modification.

    // If we are root, cannot set.
    if (this._parent === null) { return; }

    this._T = spaceTransform.to(this._parent).T;
    this.emit('transformed', this);
  };

  plane.setGlobalTransform = function (spaceTransform) {
    // Set local transform so that the global transform becomes equal to
    // the given SpaceTransform.
    //
    // Dev note:
    //   Given T is coord. transf. from the plane to root (space).
    //   So is this._T.
    //   current_glob_trans = parent_glob_trans * this_T
    //   new_glob_trans = parent_glob_trans * X
    //   <=> X = inv(parent_glob_trans) * new_glob_trans

    // If we are root, cannot set.
    if (this._parent === null) { return; }

    var parent_gt = this._parent.getGlobalTransform().T;
    var new_gt = spaceTransform.toSpace().T;
    this._T = parent_gt.inverse().multiplyBy(new_gt);
    this.emit('transformed', this);
  };

  plane.transformBy = function (spaceTransform) {
    // Apply a SpaceTransform to the node.
    // Root nodes cannot be transformed.

    if (this._parent === null) {
      // We are root, cannot set.
      return;
    }
    // Convert on parent plane so we can multiply.
    var normST = spaceTransform.to(this._parent);
    this._T = normST.T.multiplyBy(this._T);
    this.emit('transformed', this);
  };

  plane.translate = function (domain, range) {
    // Move plane horizontally and vertically by example.
    //
    // Translate the plane so that after the translation, the domain points
    // would be as close to given range points as possible.
    //
    // Parameters: see SpaceTransform.prototype.translate
    var st = SpaceTransform.estimate(this, 'T', domain, range);
    this.transformBy(st);
  };

  plane.scale = function (pivot, multiplierOrDomain, range) {
    // Parameters: see SpaceTransform.prototype.scale
    var st = new SpaceTransform(this).scale(pivot, multiplierOrDomain, range);
    this.transformBy(st);
  };

  plane.rotate = function (pivot, radiansOrDomain, range) {
    // Parameters: see SpaceTransform.prototype.rotate
    var st = new SpaceTransform(this).rotate(pivot, radiansOrDomain, range);
    this.transformBy(st);
  };

  plane.translateScale = function (domain, range) {
    // Parameters: see SpaceTransform.prototype.translateScale
    var st = SpaceTransform.estimate(this, 'TS', domain, range);
    this.transformBy(st);
  };

  plane.translateRotate = function (domain, range) {
    // Parameters: see SpaceTransform.prototype.translateRotate
    var st = SpaceTransform.estimate(this, 'TR', domain, range);
    this.transformBy(st);
  };

  plane.scaleRotate = function (pivot, domain, range) {
    // Parameters: see SpaceTransform.prototype.scaleRotate
    var st = SpaceTransform.estimate(this, 'SR', domain, range, pivot);
    this.transformBy(st);
  };

  plane.translateScaleRotate = function (domain, range) {
    // Parameters: see SpaceTransform.prototype.translateScaleRotate
    var st = SpaceTransform.estimate(this, 'TSR', domain, range);
    this.transformBy(st);
  };

  // plane.translateAndScaleToFit, not sure if necessary for now

  plane.on('removed', function (self, oldParent, newParent) {
    // Maintain global location.
    // Why? To make it easy to attach to view temporarily.
    // On the other hand, same relative location would be convenient
    // when moving subelements from group to another.
    // Would it be easier to do explicitly:
    //   gt = taa.getGlobalTransform()
    //   taa.setParent(foo)
    //   taa.setGlobalTransform(gt)
    // Yes it would. Therefore, do not maintain global location!

    if (typeof oldParent === 'undefined') { oldParent = null; }
    if (typeof newParent === 'undefined') { newParent = null; }

    if (newParent === null) {
      // Root nodes cannot move.
      self.resetTransform();
    } else {
      // Assert: removed from null parent?
      if (oldParent === null) {
        throw new Error('Cannot remove from null parent');
      }
    }

    // Reparenting probably changes the global transform.
    this.emit('transformed', self);
  });
};

module.exports = SpaceTransformer;

},{"./SpacePoint":43,"./SpaceTransform":46,"./Transform":49,"nudged":27}],48:[function(require,module,exports){
// API v0.6.0
var Emitter = require('component-emitter');
var loadimages = require('loadimages');

var NOOP = function () {};

var Taa = function (imgSrc, onLoaded) {
  // Parameters
  //   imgSrc
  //   onLoaded(err, taa)
  //     optional, function (taa)
  Emitter(this);
  var this2 = this;

  // onLoaded is optional
  if (typeof onLoaded !== 'function') {
    onLoaded = NOOP;
  }

  // This object will be replaced by a real Image object but before that
  // src is needed in SpaceView.
  this.image = { src: imgSrc };

  // If the image is cached, the 'load' event of Image element is
  // fired instantly when calling loadimages. If we did not care
  // about this, the on('loaded', fn) listeners would experience
  // different execution order depending whether the images was
  // cached or not.
  var notCached = false;

  loadimages(imgSrc, function (err, image) {
    var emiterr, emittaa;
    if (err) {
      emiterr = err;
      emittaa = null;
    } else {
      this2.image = image;
      emiterr = null;
      emittaa = this2;
    }

    if (notCached) {
      this2.emit('loaded', emiterr, emittaa);
      onLoaded(emiterr, emittaa);
    } else {
      // Postpone emitting of the loaded event
      setTimeout(function () {
        this2.emit('loaded', emiterr, emittaa);
        onLoaded(emiterr, emittaa);
      }, 0);
    }
  });

  notCached = true;
};

module.exports = Taa;

},{"component-emitter":7,"loadimages":14}],49:[function(require,module,exports){
// API v3.0.0

var nudged = require('nudged');

module.exports = nudged.Transform;

},{"nudged":27}],50:[function(require,module,exports){
// API v3.0.0

exports.SpacePoint = require('./SpacePoint');
exports.Transform = require('./Transform');
exports.SpaceTransform = require('./SpaceTransform');
exports.Taa = require('./Taa');
exports.SpaceTaa = require('./SpaceTaa');
exports.SpaceHTML = require('./SpaceHTML');
exports.SpacePixel = require('./SpacePixel');
exports.Space = require('./Space');
exports.HTMLSpaceView = require('./HTMLSpaceView');

exports.version = require('./version');

},{"./HTMLSpaceView":37,"./Space":38,"./SpaceHTML":39,"./SpacePixel":41,"./SpacePoint":43,"./SpaceTaa":45,"./SpaceTransform":46,"./Taa":48,"./Transform":49,"./version":51}],51:[function(require,module,exports){
module.exports = '3.0.2';

},{}],52:[function(require,module,exports){

var styles = [
  'webkitTransform',
  'MozTransform',
  'msTransform',
  'OTransform',
  'transform'
];

var el = document.createElement('p');
var style;

for (var i = 0; i < styles.length; i++) {
  style = styles[i];
  if (null != el.style[style]) {
    module.exports = style;
    break;
  }
}

},{}]},{},[1]);
