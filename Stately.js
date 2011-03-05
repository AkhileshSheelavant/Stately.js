/*
 * Stately.js: A JavaScript based finite-state machine (FSM) engine.
 * 
 * Copyright (c) 2011 Florian Schäfer (florian.schaefer@gmail.com)
 * Dual licensed under the MIT (MIT_LICENSE.txt)
 * and GPL Version 2 (GPL_LICENSE.txt) licenses.
 *
 * Version: 0.9.5
 * 
 */
 
(function(exports){
    
    //helper to indetify options type
    var toString = Object.prototype.toString;
    
    //custom exception for a invalid event
    function InvalidEventError (message) {
        this.message = message;
    }
    
    //inherit from error object
    InvalidEventError.prototype = new Error ();
    
    //custom exception for a invalid state
    function InvalidStateError (message) {
        this.message = message;
    }
    
    //inherit from error object
    InvalidStateError.prototype = new Error ();
    
    //stately constructor
    var Stately = function (states, options) {
        
        //state machine default options
        var stateOptions = {
            onTransition: function () {},
            invalidEventErrors: false
        },
        
        //current state of the machine
        currentState,
        
        //store for states
        statesStore = {},
        
        //the state machine
        stateMachine = {
            
            //evaluates the current state
            getMachineState: function () {
                return currentState.name;
            }
            
        },
        
        //the event decorator factory function
        transition = function (stateName, eventName, nextEvent) {
            
            //the decorator
            return function () {
                
                //flag to indicate event is handled by event chain
                var handled = false;
                
                //if the current state doesn't handle the event
                if (states[stateName] !== currentState) {
                    
                    //let other events in chain handle this state
                    handled = (nextEvent && nextEvent.apply (statesStore, arguments));
                    
                    //if options ask for it and nothing handled this event, throw an invalid event error
                    if (!handled && stateOptions.invalidEventErrors) {
                        throw new Stately.InvalidEventError ('Stately.js: Invalid event: `' + eventName + '` for current state: `' + currentState.name + '`.');
                    }
                    
                    //or just return the state machine
                    return stateMachine;
                }
                
                //run event and transition to next state
                var nextState = statesStore[stateName][eventName].apply (statesStore, arguments),
                
                //store last change
                lastState = currentState;
                
                //if state machine doesn't handle the returned state
                if (!nextState || !nextState.name || !statesStore[nextState.name]) {
                    
                    //throw a invalid state exception
                    throw new Stately.InvalidStateError ('Stately.js: Transitioned into invalid state: `' + statesStore[stateName][eventName] + '`.');
                    
                }
                
                //update current state
                currentState = nextState;
                
                //if changing state
                if (lastState !== nextState) {
                    
                    //notify callback that the state was changed
                    stateOptions.onTransition.call (stateMachine, eventName, lastState.name, nextState.name);
                    
                }
                
                //return the state machine
                return stateMachine;
            };
            
        };
        
        //handle given options
        if (toString.call (options) === '[object Function]') {
            
            //if options is a function use it for state changes
            stateOptions.onTransition = options;
            
        } else if (toString.call (options) === '[object Object]') {
            
            //else extend the default options
            for (var option in options) {
                
                //own properties only
                if (options.hasOwnProperty (option)) {
                    stateOptions[option] = options[option];
                }
                
            }
            
        }
        
        //walk over states
        for (var stateName in states) {
            
            //check own properties
            if (states.hasOwnProperty (stateName)) {
                
                //store states in store
                statesStore[stateName] = states[stateName];
                
                //walk over events
                for (var eventName in statesStore[stateName]) {
                    
                    //check for own properties and function
                    if (statesStore[stateName].hasOwnProperty (eventName) && toString.call (statesStore[stateName][eventName]) === '[object Function]') {
                        
                        //assign decorated events to state machine
                        stateMachine[eventName] = transition (stateName, eventName, stateMachine[eventName]);
                        
                    }
                    
                }
                
                //attach states name to object in store
                statesStore[stateName].name = stateName;
                
                //initial state is the first passed in to stately
                if (!currentState) {
                    
                    //make initial state the current state
                    currentState = statesStore[stateName];
                    
                }
                
            }
            
        }
        
        //notify callback about the initial state
        stateOptions.onTransition.call (stateMachine, undefined, undefined, currentState.name);
        
        //return the new state machine
        return stateMachine;
    };
    
    //factory for new machines
    Stately.machine = function (states, options) {
        return new Stately (states, options);
    };
    
    //export custom exceptions
    Stately.InvalidEventError = InvalidEventError;
    Stately.InvalidStateError = InvalidStateError;
    
    //export stately object
    exports.Stately = Stately;
    
})(window,undefined);
