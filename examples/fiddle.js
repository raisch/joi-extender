/* Created by raisch on 4/25/15. */

/*jshint node:true, bitwise:true, camelcase:false, curly:true, undef:false, unused:false, eqeqeq:true, shadow:true */

'use strict';

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

// register it with joi...

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
