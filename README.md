# joi-extender

Extends hapi joi with new top-level validation tests.

__*WARNING: THIS IS COMPLETELY EXPERIMENTAL AND USES MAGIC WHICH PROBABLY WILL BREAK WHEN YOU UPGRADE JOI!*__

But it _does_ work.

Use at your own risk.

## Installation

`npm install joi-extender`

To build jsdoc:

  `npm run build`
  
See `package.json` for other script targets.

## Description 

joi-extender allows you to add your own "top-level" validate-able types to joi by leveraging knowledge
of the internal structure of Joi, which I freely admit is a VBI<sup><small>\*</small></sup>.

In other words, it allows you to add your own base validation types, just like `joi.string()`, as well
as further chain-able tests specific to your new type.

Here's a quick explanation of how you might use it. 

(Please note that this is a very trivial example which I am well aware can be replicated using `joi.string().regex()`.
But if we did that, we wouldn't get to use this module, would we?)

Here's a full example, which I'll pick apart below:

```
var joi=require('joi'),
    extender=require('joi-extender');

// create a new Joi validation function called "fiddle"

extender.addValidator('fiddle',{
  requirements:{
    base:function(val)   { return 'string'===typeof val; },
    isFoo:function(val)  { return val.match(/^foo$/i);   }
  },
  tests:{
    isUpperCase:function(val,args){
      return val.match(/^[A-Z]+$/) ? null : 'badCase';
    }
  },
  errmsgs:{
    'base':'must be a string',
    'isFoo':'must be foo',
    'badCase':'must be uppercase'
  }
});

// register it with joi...

extender.registerType(joi,'fiddle');

// and test it out...

joi.fiddle().required().validate();                        // => {error: '"value" is required'       }
joi.fiddle().required().validate(1);                       // => {error: '"value" must be a string'  }
joi.fiddle().required().validate('foo');                   // => {error: null                        }

joi.fiddle().required().validate('bar');                   // => {error: '"value" must be foo'       }
joi.fiddle().required().isUpperCase().validate('foo');     // => {error: '"value" must be uppercase' }
joi.fiddle().isUpperCase().required().validate('FOO');     // => {error: null                        }


```

__TODO__: expand/finish the explanation below...

First, we need to create a new validator which we will be able to call as `joi.fiddle()`:
    
```
extender.addValidator('fiddle',{
```

Note that the first argument is the name of the validator type we want to create, and is used to 
both add a new property to the joi object and to report errors correctly.

Next, we can add validation tests that will be called when our validator is first invoked. This is
useful if we wish to assure that the value we will be validating is a native JS type, like a string.

These tests should return true if the value we are currently inspecting is correct for our
validation type and are set to keys which are used to return useful error messages.

```
  requirements:{
    // Let's assure we're working with a string:
    base:function(val)   { return 'string'===typeof val; },
    // and that it contains the correct word:
    isFoo:function(val)  { return val.match(/^foo$/i);   }
  },
```

Next, we can add further tests that our new type will react to which are added as properties to our
validator. Tests should return null on success or the key of the appropriate errmsg to display on failure.

```
  tests:{
      isUpperCase:function(val,args){
        return val.match(/[A-Z]/) ? null : 'badCase';
      }
  },
```

Finally, we add useful error messages which will be reported on validation failure.

```
  errmsgs:{
    'base':'must be a string'
  }
  
});
```

Ok, now we have a new validator but Joi has no idea how to use it, so we need to register it with Joi.

```
extender.register(joi,'fiddle');

```

<small><sup>\*</sup> Very Bad Idea.</small>
