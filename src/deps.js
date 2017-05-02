const padEnd = require('string.prototype.padend')
const os = require('os')

function uniq(value, index, arr) {
  return arr.indexOf(value) === index
}

/**
 * @param  {Function[]} funcs functions to flow left to right
 * @return {Function} passes args through the functions, bound to this
 */
function flow(...funcs) {
  const length = funcs ? funcs.length : 0
  return function flowing(...args) {
    let index = 0
    // eslint-disable-next-line
    let result = length ? funcs[index].apply(this, args) : args[0]
    while (++index < length) {
      // eslint-disable-next-line
      result = funcs[index].call(this, result)
    }
    return result
  }
}

/**
 * Converts a number to a more readable comma-separated string representation.
 *
 * @static
 * @param {number} number The number to convert.
 * @return {string} The more readable string representation.
 */
function formatNumber(number) {
  number = String(number).split('.')
  return (
    number[0].replace(/(?=(?:\d{3})+$)(?!\b)/g, ',') +
    (number[1] ? '.' + number[1] : '')
  )
}

/**
 * @tutorial http://stackoverflow.com/questions/5799055/calculate-percentage-saved-between-two-numbers
 * @param  {number} value
 * @param  {number} other
 * @return {number}
 */
function calcTimes(value, other) {
  const diff = other / value
  const percentage = diff / 100
  const fixed = percentage * 1000

  const end2 = Math.round(percentage * 10) / 10
  const end3 = Math.round(value / other / 100 * 1000)

  const diff2 = value / other
  const percentage2 = diff2 / 100
  const fixed2 = percentage2 * 1000
  // require('fliplog').quick({value, other, diff, fixed, end2, end3, fixed2})
  return diff
}

function calcPercent(value, other) {
  const diff = other / value
  const percentage = diff / 100
  const fixed = percentage * 1000

  const end2 = Math.round(percentage * 10) / 10
  const end3 = Math.round(value / other / 100 * 1000)

  const diff2 = value / other
  const percentage2 = diff2 / 100
  const fixed2 = percentage2 * 1000
  return fixed2.toFixed(2)
}

/**
 * @NOTE mutates obj
 * @param  {Function} cb
 * @return {Function} to call with callback obj
 */
function flowVals(cb) {
  /**
   * @param  {Object} obj
   * @return {Object}
   */
  return function flowCb(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      const val = obj[keys[i]].map(str => str.length)
      obj[keys[i]] = cb(val)
    }
    return obj
  }
}

/**
 * @param  {Array<number>} data
 * @return {number} average
 */
function average(data) {
  const sum = data.reduce((prev, curr) => 0 + prev + curr, 0)
  return Math.floor(sum / data.length)
}

function standardDeviation(values) {
  const avg = average(values)
  const squareDiffs = values.map(value => {
    const diff = value - avg
    const sqrDiff = diff * diff
    return sqrDiff
  })
  const avgSquareDiff = average(squareDiffs)
  const stdDev = Math.sqrt(avgSquareDiff)
  return stdDev
}

/**
 * @private
 * @desc divide by this number for nicer numbers
 * @param  {number} max
 * @return {number}
 */
function getDiv(max) {
  switch (true) {
    case max > 1000:
      return 100
    case max > 10000:
      return 1000
    case max > 100000:
      return 10000
    case max > 1000000:
      return 100000
    case max > 10000000:
      return 1000000
    default:
      return 1
  }
}

// const flowmin = flow(Math.floor, Math.min)
// const flowmax = flow(Math.floor, Math.max)
const flowmin = nums => Math.floor(Math.min(...nums))
const flowmax = nums => Math.floor(Math.max(...nums))

function getCurrentMemory(init = null) {
  return {
    process: process.memoryUsage(),
    os: os.freemem(),
  }
}

const _flatten = require('lodash.flatten')
const flatten = arr => [].concat.apply(arr)
const forown = require('lodash.forown')

const mapown = (obj, cb) => {
  const mapped = []
  forown(obj, (value, key, o) => {
    mapped.push(cb(value, key, o))
  })
  return mapped
}

const mapObjArr = (obj, cb) => {
  const mapped = []
  forown(obj, (value, key, o) => {
    mapped.push(mapown(value, cb))
    // mapped.push(cb(value, key, o))
  })
  return _flatten(mapped)
}

function groupBy(arr, property) {
  return arr.reduce((memo, x) => {
    if (!memo[x[property]]) {
      memo[x[property]] = []
    }
    memo[x[property]].push(x)
    return memo
  }, {})
}

// https://github.com/netcode/node-prettydate/blob/master/index.js
function createHandler(divisor, noun, restOfString) {
  return function(diff) {
    var n = Math.floor(diff / divisor)
    var pluralizedNoun = noun + (n > 1 ? 's' : '')
    return '' + n + ' ' + pluralizedNoun + ' ' + restOfString
  }
}

var formatters = [
  {threshold: -31535999, handler: createHandler(-31536000, 'year', 'from now')},
  {threshold: -2591999, handler: createHandler(-2592000, 'month', 'from now')},
  {threshold: -604799, handler: createHandler(-604800, 'week', 'from now')},
  {threshold: -172799, handler: createHandler(-86400, 'day', 'from now')},
  {
    threshold: -86399,
    handler() {
      return 'tomorrow'
    },
  },
  {threshold: -3599, handler: createHandler(-3600, 'hour', 'from now')},
  {threshold: -59, handler: createHandler(-60, 'minute', 'from now')},
  {threshold: -0.9999, handler: createHandler(-1, 'second', 'from now')},
  {
    threshold: 1,
    handler() {
      return 'just now'
    },
  },
  {threshold: 60, handler: createHandler(1, 'second', 'ago')},
  {threshold: 3600, handler: createHandler(60, 'minute', 'ago')},
  {threshold: 86400, handler: createHandler(3600, 'hour', 'ago')},
  {
    threshold: 172800,
    handler() {
      return 'yesterday'
    },
  },
  {threshold: 604800, handler: createHandler(86400, 'day', 'ago')},
  {threshold: 2592000, handler: createHandler(604800, 'week', 'ago')},
  {threshold: 31536000, handler: createHandler(2592000, 'month', 'ago')},
  {threshold: Infinity, handler: createHandler(31536000, 'year', 'ago')},
]

function prettydate(date) {
  var diff = (new Date().getTime() - date.getTime()) / 1000
  for (var i = 0; i < formatters.length; i++) {
    if (diff < formatters[i].threshold) {
      return formatters[i].handler(diff)
    }
  }
  throw new Error('exhausted all formatter options, none found') // should never be reached
}

const debounce = require('lodash.debounce')

// https://github.com/chalk/ansi-regex/blob/master/index.js
const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g
const replaceAnsi = str => str.replace(ansiRegex, '')

module.exports = {
  replaceAnsi,
  uniq,
  flow,
  padEnd,
  calcTimes,
  calcPercent,
  flowVals,
  average,
  getDiv,
  standardDeviation,
  flowmin,
  flowmax,
  getCurrentMemory,
  flatten,
  forown,
  mapown,
  mapObjArr,
  _flatten,
  groupBy,
  prettydate,
  debounce,
}
