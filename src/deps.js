const padEnd = require('string.prototype.padend')

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

  const end2 = (Math.round(percentage * 10) / 10)
  const end3 = Math.round(((value / other) / 100) * 1000)

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

  const end2 = (Math.round(percentage * 10) / 10)
  const end3 = Math.round(((value / other) / 100) * 1000)

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


module.exports = {uniq, flow, padEnd, calcTimes, calcPercent, flowVals}
