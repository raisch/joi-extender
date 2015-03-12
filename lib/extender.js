'use strict';

/*
 * Created by raisch on 3/11/15.
 */

/*jshint node:true, bitwise:true, camelcase:false, curly:true, undef:false, unused:false, eqeqeq:true, shadow:true */

var util = require('util'),
    path = require('path'),
    _ = require('lodash'),
    hoek = require('hoek'),
    joi = require('joi'),
    Any = require(path.join(__dirname, '../node_modules/joi/lib/any')),
    Errors = require(path.join(__dirname, '../node_modules/joi/lib/errors'));

/**
 * @module joiExtender
 */

/**
 * @external Joi
 */

/**
 * Name of the new Joi validation type.
 * @typedef {string} ValidationTypeName
 * @alias module:joiExtender.ValidationTypeName
 */

/**
 * Joi validation type.
 * @name ValidationType
 * @class
 * @alias module:joiExtender.ValidationType
 */

/**
 * Joi-style chainable validation function.
 * @typedef {function} ValidationFunction
 * @alias module:joiExtender.ValidationFunction
 * @augments Joi.Any
 */

/**
 * Error messages.
 * @typedef {object} ValidationErrMsgs
 * @alias module:joiExtender.ValidationErrMsgs
 */

/**
 * Initial tests for new validator.
 * @typedef {object} ValidatorRequirements
 * @alias module:joiExtender.ValidatornRequirements
 */

/**
 * @typedef {object} ValidatorConfigOptions
 * @alias module:joiExtender.ValidatorConfigOptions
 * @property {ValidationErrMsgs} errmsgs
 * @property {ValidatorRequirements} requirements
 */

/**
 * Top-level Joi Validation Type Factory.
 * @alias module:joiExtender.TypeFactory
 * @param {ValidationTypeName} type - name of the new validator
 * @param {ValidatorConfigOptions} [opts] - configuration options
 * @returns {ValidationType}
 */
var TypeFactory = function (type, opts) {
  opts = opts || {};

  var _Proto_ = function () {
    Any.call(this);
    this._type = type;
  };
  hoek.inherits(_Proto_, Any);

  var errmsgs={};

  if (_.isObject(opts.errmsgs)) {
    errmsgs[type] = _Proto_.ErrMsgs = opts.errmsgs;
  }

  if (_.isObject(opts.requirements)) {

    _Proto_.prototype._base = function (value, state, options) {
      var err = null,
          keys = _.keys(opts.requirements);

      options.language = _.merge(errmsgs, options.language);

      for (var i = 0, len = keys.length; i < len; i++) {
        var name = keys[i],
            fn = opts.requirements[name];
        if (_.isFunction(fn) && !fn.call(this, value)) {
          err = Errors.create(type + '.' + name, null, state, options);
          break;
        }
      }
      return {
        value: value,
        errors: err
      };
    };

  }

  /*
   internals.String.prototype.min = function (limit, encoding) {

     Hoek.assert(Hoek.isInteger(limit) && limit >= 0, 'limit must be a positive integer');
     Hoek.assert(!encoding || Buffer.isEncoding(encoding), 'Invalid encoding:', encoding);

     return this._test('min', limit, function (value, state, options) {

       var length = encoding ? Buffer.byteLength(value, encoding) : value.length;
       if (length >= limit) {
       return null;
       }

       return Errors.create('string.min', { limit: limit }, state, options);
     });
   };
   */

  if(_.isObject(opts.tests)){
    var names=_.keys(opts.tests);

    for(var i= 0,len=names.length;i<len;i++){
      var name=names[i],
          tester=opts.tests[name];

      if(_.isFunction(tester)){
        _Proto_.prototype[name]=function(){
          var args= _.flatten(arguments);
          return this._test(name,args,function(value,state,options){
            options.language = _.merge(errmsgs, options.language);
            var result=tester(value,args);
            return result ? Errors.create(type+'.'+result, { args: args }, state, options) : null;
          });
        };
      }
    }
  }

  return _Proto_;
};

/**
 * Creates an instance of a new top-level Joi Validator.
 * @alias module:joiExtender.create
 * @param {ValidationTypeName} type - name of the new validator
 * @param {ValidatorConfigOptions} [opts] - configuration options
 * @returns {ValidationFunction}
 */
var create = function (type, opts) {
  var Type = /** @type {Type} */ TypeFactory(type, opts);
  return /** @type {ValidationFunction} */ new Type();
};

/**
 * Container for known Validators
 * @alias module:joiExtender.Validators
 */
var Validators = {};

/** Constructs and installs a new validator so it can be registered in Joi.
 *
 * @alias module:joiExtender.addValidator
 * @param {ValidationTypeName} name
 * @param {ValidatorConfigOptions} opts
 *
 * @example
 *
 *  var _=require('lodash'),
 *      is_dma=require('is_dma'),
 *      joiExtender=require('joiExtender');
 *
 *  joiExtender.addValidator('dma',{
 *    errmsgs: {
 *      base: 'must be a string',
 *      invalid: 'is not a valid dma'
 *    },
 *    requirements: {
 *      base: _.isString,
 *      invalid: is_dma
 *    }
 *  });
 *
 *  var joi=joiExtender.registerType(require('joi'),'dma'); // register our new validator with Joi
 *
 *  joi.dma().validate('502'); // => true
 *
 */
var addValidator=function(name,opts){
  var ValidationType=TypeFactory(name,opts);
  Validators[name]=new ValidationType();
};

/**
 * Registers a previously installed Validator with Joi.
 * @alias module:joiExtender.registerType
 * @param {Joi} joi - instance of Joi
 * @param {ValidationTypeName} name
 * @returns {Joi}
 */
var registerType = function (joi, name) {
  if(!(_.isString(name) && _.isObject(Validators[name]))){
    throw new Error('cannot find validator for type: '+name);
  }
  joi[name] = function () {
    return Validators[name];
  };
  return joi;
};

/**
 * Install a new test dma validator.
 */
addValidator('dma',{
  errmsgs: {
    base: 'must be a string',
    invalid: 'is not a valid dma',
    badFoo:'is not foo-worthy'
  },
  requirements: {
    base: _.isString,
    invalid: require('is_dma')
  },
  tests:{
    isFoo:function(value,args){
      if('502'===value) return 'badFoo';
    }
  }
});

/**
 * Exports.
 * @type {{create: Function, Factory: Function, registerType: Function, installValidator: Function, Validators: {}}}
 */
module.exports = {
  create: create,
  Factory: TypeFactory,
  registerType: registerType,
  addValidator: addValidator,
  Validators: Validators
};
