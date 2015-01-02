import Ember from "ember";
import PreventGhostClicks from "ember-mobiletouch/utils/prevent-ghost-clicks";

//These settings can be overwritten by adding ENV.hammer in environment.js
var hammerEvents = {
  fastclick : {fastclick : 'fastClick' },
  pan : { pan : 'pan', panstart : 'panStart', panmove : 'panMove', panend : 'panEnd', pancancel : 'panCancel', panleft : 'panLeft', panright : 'panRight', panup : 'panUp', pandown : 'panDown' },
  pinch : { pinch : 'pinch', pinchstart : 'pinchStart', pinchmove : 'pinchMove', pinchend : 'pinchEnd', pinchcancel : 'pinchCancel', pinchin : 'pinchIn', pinchout : 'pinchOut' },
  press : { press : 'press', pressup : 'pressUp' },
  rotate : { rotate : 'rotate', rotatestart : 'rotateStart', rotatemove : 'rotateMove', rotateend : 'rotateEnd', rotatecancel : 'rotateCancel' },
  swipe : { swipe : 'swipe', swipeleft : 'swipeLeft', swiperight : 'swipeRight', swipeup : 'swipeUp', swipedown : 'swipeDown' },
  tap : { tap : 'tap' }
  },

  defaultConfig = {
    use : ['fastclick', 'pan', 'pinch', 'press', 'rotate', 'swipe', 'tap'],
    fastclick : false,
    options : {
      domEvents : true,
      swipeVelocity : 0.3,
      swipeThreshold : 25
    },
    events: {
      keydown     : 'keyDown',
      keyup       : 'keyUp',
      keypress    : 'keyPress',
      contextmenu : 'contextMenu',
      mousemove   : 'mouseMove',
      focusin     : 'focusIn',
      focusout    : 'focusOut',
      mouseenter  : 'mouseEnter',
      mouseleave  : 'mouseLeave',
      submit      : 'submit',
      input       : 'input',
      change      : 'change',
      dragstart   : 'dragStart',
      drag        : 'drag',
      dragenter   : 'dragEnter',
      dragleave   : 'dragLeave',
      dragover    : 'dragOver',
      drop        : 'drop',
      dragend     : 'dragEnd'
    }
  };

export default Ember.Mixin.create({

  /**
   *
   *
   */
  _hammerInstance : null,
  _hammerOptions : null,

  _initializeHammer : function () {
    var element = Ember.$(this.get('rootElement'))[0],
      options = this.get('_hammerOptions');

    Ember.assert('Application has no rootElement', element);
    Ember.assert('hammer.options.domEvents MUST be true!', options.domEvents);
    Ember.assert('hammer.options.tap MUST be true!', options.tap);

    this.set('_hammerInstance', new Hammer(element, options));

    //prevent default behavior on links
    document.body.addEventListener('click', function (e) {
      e = e || window.event;
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    PreventGhostClicks.add(element);

  },

  destroy : function () {
    var hammer = this.get('_hammerInstance'),
        element = Ember.$(this.get('rootElement'))[0];

    if (hammer) {
      hammer.destroy();
    }
    this.set('_hammerInstance', null);
    PreventGhostClicks.remove(element);

    this._super();
  },

  /**
   * placeholder, will be in before 2.0
   */
  useMultiTouch : true,

  /**
   * placeholder, will be in before 2.0
   */
  multiSwipeWithAlt : true,

  setup : function (addedEvents, rootElement) {

    //set up events hash
    var mobileSettings = this.get('_mobileTouchConfig') || {},
      events = mobileSettings.events || defaultConfig.events,
      gestures = mobileSettings.use || defaultConfig.use,
      alwaysTapOnPress = mobileSettings.alwaysTapOnPress || false;

    Ember.Logger.debug('use gestures', gestures);
    gestures.forEach(function (category) {
      Ember.Logger.debug('merging', hammerEvents[category]);
      Ember.merge(events, hammerEvents[category] || {});
      defaultConfig.options[category] = true;
    });
    this.set('events', events);



    Ember.Logger.debug('Adding events', events);
    //setup rootElement and initial events
    this._super(addedEvents, rootElement);



    //setup hammer
    this.set('_hammerOptions', Ember.$.extend({}, defaultConfig.options, mobileSettings.options || {}));
    this._initializeHammer();


  },


  __executeGestureWithFilters : function (eventName, event, view, context) {

    Ember.Logger.debug('Checking Filters for Event: ' + eventName + ' on ' + view.get('elementId'));

    var shouldFilter = view.get('hammerAllow') || view.get('hammerExclude'),
      element,
      ret;

    if (context) {

      element = shouldFilter ? view._filterTouchableElements.call(view, event.target) : false;
      if (shouldFilter && !element) {
        Ember.Logger.debug('(eventManager) Event Found but element filtered.');
        return false;
      }
      ret = Ember.run(context, context[eventName], event, view);
      Ember.Logger.debug('(eventManager) Run Event Result: ' + eventName, ret);
      return false;
    }

    if (view.has(eventName)) {

      element = shouldFilter ? view._filterTouchableElements.call(view, event.target) : false;
      if (shouldFilter && !element) {
        Ember.Logger.debug('Event Found but element filtered.');
        return false;
      }

      ret = Ember.run.join(view, view.handleEvent, eventName, event);
      Ember.Logger.debug('Run Event Result: ' + eventName, ret);
      return false;

    }

    Ember.Logger.debug('No Filter or Function, Bubbling Event: ' + eventName);
    return true; //keep bubbling

  },


  _dispatchEvent: function(object, event, eventName, view) {
    Ember.Logger.debug('Dispatching Event: ' + eventName);
    var result = true;

    var handler = object[eventName];
    if (Ember.typeOf(handler) === 'function') {
      result = this.__executeGestureWithFilters(eventName, event, view, object);
      // Do not preventDefault in eventManagers.
      event.stopPropagation();
    }
    else {
      result = this._bubbleEvent(view, event, eventName);
    }

    return result;
  },

  _bubbleEvent: function(view, event, eventName) {
    Ember.Logger.debug('Bubbling Event: ' + eventName);
    return this.__executeGestureWithFilters(eventName, event, view);
  }

});
