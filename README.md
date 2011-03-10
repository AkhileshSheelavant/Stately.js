![Stately.js Logo](https://github.com/fschaefer/Stately.js/raw/master/misc/Stately.js.png)

## What is it?

Stately.js is a JavaScript based finite-state machine (FSM) or finite-state automaton engine inspired by phred's [stately](http://github.com/phred/stately).

## Usage

### Creating a new machine

A new state machine can be created with either the new operator:

    var machine = new Stately(statesObject, [options]);

or the factory method:

    var machine = Stately.machine(statesObject, [options]);

Both will return a new `stateMachine` object, with all events from all states attached to it. The machine will immediately transition (with event `undefined`, from  state `undefined`) into the initial state (the first attached `stateObject`). Beside the events the `stateMachine` object has a `getMachineState()` function, returning the current name of the machines state. 

The `statesObject` is an object  with `stateObject` objects attached as properties.
The property names of the `statesObject` are the `states` of the machine. The attached `stateObject` objects model the machines states with the property names as `events` and the connected functions as `actions`:

    var machine = Stately.machine({
        'STATE0': {
            event: function action() {
                ...
            }
        },
        'STATE1': {
            event: function action() {
                ...
            }
        },
        'STATE2':{
            event: function action() {
                ...
            },
            anotherEvent: function action() {
                ...
            }
        }
    });

If different states use the same event identifier (function name), the `events` are chained up and the machine handles calling the correct `action` for the current state (if the `event` is handled in the current state). If the event is not handled in the current state, it is ignored or throws an `Stately.InvalidEventError` when the appropriate option is set.

### Options

There are two options that can be passed into the optional `options` object:

One is the `onTransition` callback, to attach a function that gets called when the machine transitioned into another state:

    Stately.machine({ ... }, {
        onTransition:  function (event, oldState, newState) {
            ...
        }
    });

`event` - The event that triggered the transition.
`oldState` - The old state the machine is transitioned from.
`newState` - The new state the machine is transitioned into.

If no other settings are needed you can feed in the `callback` directly, instead of the `options` object:

    Stately.machine({ ... },  function (event, oldState, newState) {
        ...
    });

The other option is `invalidEventErrors`, which defaults to `false`. If set to `true` the machine throws a `Stately.InvalidEventError` exception, if an event is called that is not available in the current machine state:

    Stately.machine({ ... }, {
        invalidEventErrors: true
    });

### Transitions

There are several ways a `action` can transition the machine into another state. The simplest form is returning the desired next state from an action. Therefore, `this` refers to the (internal) `stateStore` inside an `action` to access the other states of the machine:

    ...
    
    'STATE1': {
        doSomething: function () {
            
            ...
            
            //transition from STATE1 to STATE2
            return this.STATE2;
        }
    }
    
    ...

If a action should not transition the machine into another state, just omit the return value (or return the current state).

Sometimes it is desired to return a value from an action. In this case the return value must be an array with two elements. The first element is the next state the machine should transition into, and the second element the return value:

    ...
    
    'STATE1': {
        doSomething: function () {
            
            ...
            
            //transition from STATE1 to STATE2 and return a string
            return [this.STATE2, 'this is a return value'];
        }
    }
    
    ...

For asynchronous actions there is `getMachineState()` and  `setMachineState(nextState)` accessible through the `this` reference of an action:

    ...
    
    'STATE1': {
        doSomething: function () {
            var self = this;
            
            setTimeout(function () {
                
                ...
                
                self.setMachineState(self.STATE2);
            }, 5000);
            
            ...
            
        }
    }
    
    ...

Because `this` refers to the `stateStore`, it is possible to call anothers state action (note: this won't trigger the `onTransition` callback):

    ...
    
    'STATE1': {
        doSomething: function () {
            
            ...
            
            this.STATE2.doSomethingDifferent.call(this);
            
            ...
            
            return this.STATE3.doSomethingCompletelyDifferent.call(this);
        }
    }
    
    ...

## Examples

### Door

    var door = Stately.machine({
        'OPEN': {
            close: function () {
                return this.CLOSED;
            }
        },
        'CLOSED': {
            open: function () {
                return this.OPEN;
            },
            lock: function () {
                return this.LOCKED;
            }
        },
        'LOCKED': {
            unlock: function () {
                return this.CLOSED;
            },
            break: function () {
                return this.BROKEN;
            }
        },
        'BROKEN': {
            fix: function () {
                this.fixed = (this.fixed === undefined ? 1 : ++this.fixed);
                return this.fixed < 3 ? this.OPEN : this.BROKEN;
            }
        }
    });
    
    //the initial state of the door is open(it's the first state object)
    console.log(door.getMachineState() === 'OPEN');        // true;
    
    //close and lock the door
    door.close().lock();
    console.log(door.getMachineState() === 'LOCKED');      // true;
    
    //try to open it
    door.open();
    console.log(door.getMachineState() === 'OPEN');        // false;
    
    //unlock, open, lock(is ignored because it fails), close, and lock
    door.unlock().open().lock().close().lock();
    console.log(door.getMachineState() === 'LOCKED');      // true;
    
    //the door is still locked, break it
    door.break();
    console.log(door.getMachineState() === 'BROKEN');      // true;
    
    //fix opens the door, close it, lock it, break it again
    door.fix().close().lock().break();
    console.log(door.getMachineState() === 'BROKEN');      // true;
    
    //and again fix opens the door, close it, lock it, break it
    door.fix().close().lock().break();
    console.log(door.getMachineState() === 'BROKEN');      // true;
    
    //fixing is limited, the door stays broken
    door.fix();
    console.log(door.getMachineState() === 'OPEN');        // false;
    console.log(door.getMachineState() === 'BROKEN');      // true;

### Radio

    var radio = Stately.machine({
        'STOPPED': {
            play: function () {
                return this.PLAYING;
            }
        },
        'PLAYING': {
            stop: function () {
                return this.STOPPED;
            },
            pause: function () {
                return this.PAUSED;
            }
        },
        'PAUSED': {
            play: function () {
                return this.PLAYING;
            },
            stop: function () {
                return this.STOPPED;
            }
        }
    }, function (event, oldState, newState) {
        
        var transition = oldState + ' => ' + newState;
        
        switch (transition) {
            /*
            ...
            case 'STOPPED => PLAYING':
            case 'PLAYING => PAUSED':
            ...
            */
            default:
                console.log(transition);
                break;
        }
    });
    
    radio.play().pause().play().pause().stop();
    //undefined => STOPPED
    //STOPPED => PLAYING
    //PLAYING => PAUSED
    //PAUSED => PLAYING
    //PLAYING => PAUSED
    //PAUSED => STOPPED

