# joi-extender

Extends hapi joi with new top-level validation tests.

[![npm version](https://badge.fury.io/js/joi-extender.svg)](http://badge.fury.io/js/joi-extender)
[![Build Status](https://travis-ci.org/raisch/joi-extender.svg?branch=master)](https://travis-ci.org/raisch/joi-extender)
[![Dependencies Status](https://david-dm.org/raisch/joi-extender.svg)](https://david-dm.org/raisch/joi-extender)
[![DevDependencies Status](https://david-dm.org/raisch/joi-extender/dev-status.svg)](https://david-dm.org/raisch/joi-extender#info=devDependencies)

[![NPM](https://nodei.co/npm/joi-extender.png)](https://nodei.co/npm/joi-extender/)
[![NPM](https://nodei.co/npm-dl/joi-extender.png)](https://nodei.co/npm-dl/joi-extender/)

__NOTE:__ This module relies upon and leverages special knowledge of Joi's internal structure which _may_ change in the future and while I freely admit that this is usually a "VBI<sup><small>\*</small></sup>", every effort will be made to assure it continues to work as Joi is updated.

## Installation

`npm install joi-extender`

To build jsdoc:

  `npm run build`
  
See `package.json` for other script targets.

## Description 

__joi-extender__ allows you to add your own "top-level" validate-able types to Joi as well as new "chainable" methods specific to the new type.

In other words, it allows you to add your own base validation types, just like `joi.string()`, as well
as further chain-able tests specific to the newly created type, like `joi.string().regex()`.

## Example - from /examples/fiddle.js

Here's a full example, which I'll pick apart below:

(Note that while this is a very trivial example that can be easily replicated using existing joi types and validations, if we did that, we wouldn't get to use this module, would we? For a real-world example, see `test/extender.js` which defines a new `joi.dma()` type using [is_dma](http://github.com/raisch/is_dma).)

```javascript

var util = require('util'),
    joi = require('joi'),
    extender = require('../lib/extender'); // require('joi-extender');

var MIN_LEN = 1,   // minimum acceptable length
    MAX_LEN = 100; // maximum acceptable length

extender.addValidator('fiddle', {

  requirements: {

    base: function (val) {
      return 'string' === typeof val;
    },

    len: function (val) {
      return val.length >= MIN_LEN && val.length <= MAX_LEN;
    }

  },

  tests: {

    isUpperCase: function (val, args) {
      return val.match(/^[A-Z]+$/) ? null : 'uppercase';
    },

    range: function (val, args) {
      if (!(Array.isArray(args) && args.length === 2)) {
        throw new Error('joi.fiddle().range() requires two numeric arguments');
      }
      if(!('number' === typeof args[0] && 'number' === typeof args[1])) {
        throw new Error('joi.fiddle().range() requires two numeric arguments');
      }

      return val.length >= args[0] && val.length <= args[1] ? null : 'range';
    },

    disallow: function (val, args) {
      if (!(Array.isArray(args) && 'string' === typeof args[0])) {
        throw new Error('joi.fiddle().disallow() requires one string argument');
      }
      return val === args[0] ? 'disallowed' : null;
    }

  },

  errmsgs: {

    'base': 'must be a string',

    'len': 'must be >= ' + MIN_LEN + ' and <= ' + MAX_LEN + ' chars in length',

    'range': '{{key}} "{{value}}" must be between {{args.0}} and {{args.1}} chars in length',

    'uppercase': 'must be uppercase',

    'disallowed': '"{{value}}" is not an allowed value for "{{key}}"'

  }

});

extender.registerType(joi, 'fiddle');

// ======================================

// and test it out...

function printResult(val) {
  var err = val.error ? val.error.toString() : 'no error';
  //console.log(util.inspect(val,{depth:null}));
  console.log(err);
}

var result;

result = joi.fiddle().required().validate();
printResult(result);
// => {error: '"value" is required', value: undefined }


result = joi.fiddle().validate(1);
printResult(result);
// => {error: '"value" must be a string', value: 1 }

result = joi.fiddle().validate('');
printResult(result);
// => {error:'"value" must be >= 1 and <= 100 chars in length', value: '' }

result = joi.fiddle().label('range value').range(10, 20).validate('1');
printResult(result);
// => {error:'range value "1" must be between 10 and 20 chars in length', value: '1' }

result = joi.fiddle().validate('bar');
printResult(result);
// => {error: null, value: 'bar' }

result = joi.fiddle().disallow('bar').label('name').validate('bar');
printResult(result);
// => {error: '"bar" is not an allowed value for "name"', value: 'bar' }

result = joi.fiddle().required().isUpperCase().validate('foo');
printResult(result);
// => {error: '"value" must be uppercase', value: 'foo' }

result = joi.validate('FOO', joi.fiddle().isUpperCase().disallow('BAR').required());
printResult(result);
// => {error: null, value: 'FOO' }

```

So, how does this work?

First, we need to create a new validator which we will be able to call as `joi.fiddle()`:
    
```
// create a new Joi validation "top-level" validation function called "fiddle"
extender.addValidator('fiddle',{
```

Note that the first argument is the name of the validator type we want to create, and is used to add a new property to the joi object and to report errors correctly.

Next, we can add "requirements" tests that will all be called when our validator is first invoked. Tests defined here should return true if the value passes validation and will report the error defined below under the same key as the test. (See `errmsgs` below.)

One possible use for these tests would be to assure the value is a native JS type, such as a String.

```javascript
  requirements:{
  
    // Let's assure we're working with a string:
    base:function(val)   { 
      return 'string'===typeof val; 
    },
    
    // and that it's the right size:
    length:function(val) {
      return val.length >= MIN_LEN && val.length <= MAX_LEN;
    }
    
  },
```

Next, we can add further optional validation tests that become our new "chainables" and are specific to our new validation type, like `.required()` or `.length(limit)`. These tests should return `null` on success or the key of the appropriate errmsg to display on failure as defined below.

```javascript

  tests: {

    // tests whether the value is composed of only uppercase letters
    //     if the test fails, return 'uppercase' to access the error message defined below
    isUpperCase: function (val, args) {
      return val.match(/^[A-Z]+$/) ? null : 'uppercase';
    },

    // tests whether the value is within an expected range
    //     if the test fails, return 'range'
    range: function (val, args) {
      if (!(Array.isArray(args) && args.length === 2)) {
        throw new Error('joi.fiddle().range() requires two numeric arguments');
      }
      if(!('number' === typeof args[0] && 'number' === typeof args[1])) {
        throw new Error('joi.fiddle().range() requires two numeric arguments');
      }

      return val.length >= args[0] && val.length <= args[1] ? null : 'range';
    },

    // tests whether the value is not allowed
    //     if the test fails, return 'not_allowed' to access the error message defined below
    disallow: function (val, args) {
      if (!(Array.isArray(args) && 'string' === typeof args[0])) {
        throw new Error('joi.fiddle().disallow() requires one string argument');
      }
      return val === args[0] ? 'disallowed' : null;
    }

  },

```

Finally, we add useful error messages which will be reported on validation failure.

```javascript
  errmsgs: {

    'base': 'must be a string',

    'len': 'must be >= ' + MIN_LEN + ' and <= ' + MAX_LEN + ' chars in length',

    'range': '{{key}} "{{value}}" must be between {{args.0}} and {{args.1}} chars in length',

    'uppercase': 'must be uppercase',

    'disallowed': '"{{value}}" is not an allowed value for "{{key}}"'

  }
  
});
```

Ok, now we have a new validator but Joi has no idea how to use it, so we need to register it with Joi.

```javascript
extender.register(joi,'fiddle');

```

Now, we can use `joi.fiddle()` with `.isUpperCase()`, `range(n:number,m:number)` and `.disallow(target:string)` in our validations.

* * * *

<small><sup>\*</sup> Very Bad Idea.</small>
