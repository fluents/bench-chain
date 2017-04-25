const {resolve} = require('path')
const {Suite} = require('benchmark')
const exists = require('flipfile/exists')
const write = require('flipfile/write')
const log = require('fliplog')

const fliptime = log.fliptime()
const {tillNow} = fliptime

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
 * @TODO use Remember here to progress!
 * @prop {string} dir
 * @prop {boolean} shouldEcho
 * @prop {boolean} debug
 * @prop {Object} initMem memory when started
 * @prop {number} initTimestamp
 * @prop {Object} results
 * @prop {string} rel relative path to results json file
 * @prop {string} abs absolute path to results json file
 * @prop {Object} current current event target object
 */
class Record {

  /**
   * Converts a number to a more readable comma-separated string representation.
   *
   * @static
   * @param {number} number The number to convert.
   * @return {string} The more readable string representation.
   */
  static formatNumber(number) {
    number = String(number).split('.')
    return (
      number[0].replace(/(?=(?:\d{3})+$)(?!\b)/g, ',') +
      (number[1] ? '.' + number[1] : '')
    )
  }

  /**
   * @param  {string} dir directory for the file with the record
   */
  constructor(dir) {
    this.dir = dir
    this.shouldEcho = true
    this.debug = false
    this.initMem = process.memoryUsage()
    this.filename()
  }

  /**
   * @private
   * @desc handles benchmark cycle event
   * @see Record.results, Record.current
   * @param  {Benchmark.Event} event
   * @return {Record} @chainable
   */
  cycle(event) {
    const hz = event.target.hz < 100 ? 2 : 0
    const num = Number(event.target.hz.toFixed(hz))

    // @example "optimized x 42,951 ops/sec ±3.45% (65 runs sampled)"
    const msg = event.target.toString()
    const name = msg.split(' x').shift()
    const sampled = msg.split('% (').pop().split(' runs').shift()
    const variation = msg.split('±').pop().split('%').shift()
    const result = {name, num, sampled, variation}

    this.current = result

    // use results object, or a new object
    if (this.results !== undefined && this.results[name] === undefined) {
      this.results[name] = []
    }
    else if (Array.isArray(this.results[name]) === false) {
      this.results[name] = []
    }

    this.results[name].push(result)

    return this
  }

  // --- file ---

  /**
   * @desc   save and load file for the results
   * @param  {String} [filename='./results.json']
   * @return {Record} @chainable
   */
  filename(filename = './results.json') {
    this.rel = filename
    this.abs = resolve(this.dir, this.rel)

    log.green('writing').data({rel: this.rel, abs: this.abs}).echo(this.debug)

    if (exists(this.abs) === false) {
      write(this.abs, '{}')
    }

    this.load()
    return this
  }

  /**
   * @see    Record.results
   * @param  {Boolean} [force=false] force reload
   * @return {Record} @chainable
   */
  load(force = false) {
    if (this.results && force === false) return this

    this.results = require(this.abs) // eslint-disable-line
    log.green('loading').echo(this.debug)

    return this
  }

  /**
   * @desc saves to file
   * @see Record.load, Record.filename
   * @return {Record} @chainable
   */
  save() {
    const now = Date.now()
    const mem = process.memoryUsage()

    log.green('saving').echo(this.debug)

    Object.keys(this.results).forEach(name => {
      const r = this.results[name][this.results[name].length - 1] || {}
      r.now = now
      r.mem = mem
    })

    write(this.abs, JSON.stringify(this.results, null, 2))

    return this
  }

  // --- echoing helpers ---

  /**
   * @desc divide by this number for nicer numbers
   * @param  {number} max
   * @return {number}
   */
  getDiv(max) {
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

  /**
   * @see this.getDiv
   *
   * @desc go through results,
   *       get max and min,
   *       pretty print numbers
   *
   * @return {Object<points, max, min>} trend graph data
   */
  trend() {
    const trend = {}
    const results = this.results

    Object.keys(results).forEach(name => {
      let nums = results[name].map(v => Number(v.num))
      let min = flow(Math.floor, Math.min)(...nums)
      let max = flow(Math.floor, Math.max)(...nums)
      const div = this.getDiv(max)

      log.data({max, min, div}).text('trendy').echo(this.debug)

      max = max / div
      min = min / div

      // into graph points
      const points = nums
        .map((r, i) => {
          if (Math.floor(r / (div || 1)) === 0) return 0
          return [i, Math.floor(r / (div || 1))]
        })
        .filter(r => r !== 0)

      // into graph points from date
      const datePoints = nums
        .map((r, i) => {
          let key = i
          const {ms, s, m, h, d, y} = tillNow(results[name].now)
          key = i

          if (m === 0) return 0
          return [key, m]
        })
        .filter(r => r !== 0)

      trend[name] = {points, datePoints, max, min}
    })

    // log.cyan('all trend data').verbose(100).data(trend).echo(this.debug)

    return trend
  }

  /**
   * @param  {string} prop map to this property to average with that data
   * @return {Averages} averages
   */
  avgs(prop = 'num') {
    this.load()

    const avgs = {}

    log.blue('this.results').data(this.results).echo(this.debug)

    Object.keys(this.results).forEach(name => {
      const resultsForProp = this.results[name].map(result => {
        return Number(result[prop])
      })
      const avg = this.avg(resultsForProp)

      log.blue('averages').data({name, resultsForProp, avg}).echo(this.debug)

      avgs[name] = avg
    })

    return avgs
  }

  /**
   * @param  {Array<number>} data
   * @return {number} average
   */
  avg(data) {
    const sum = data.reduce((prev, curr) => 0 + prev + curr, 0)
    return Math.floor(sum / data.length)
  }

  /**
   * @see Record.suite
   * @return {Array<string>} test case name
   */
  fastest() {
    return this.suite.filter('fastest').map('name')
  }

  // --- echo ---

  /**
   * @see Record.avgs
   * @TODO transform data to trim
   * @return {Record} @chainable
   */
  echoAvgs() {
    log.json(this.avgs()).bold('averages:\n').echo(this.shouldEcho || true)
    return this
  }

  /**
   * @since 0.0.2
   * @see Record.avgs
   * @TODO transform data to trim
   * @return {Record} @chainable
   */
  echoAvgGraph() {
    const avgs = this.avgs()
    const nums = Object.keys(avgs).map(name => Number(avgs[name]))
    const max = Math.floor(Math.max(...nums))
    const min = Math.floor(Math.min(...nums))
    const div = this.getDiv(max) * 10
    const points = Object.keys(avgs).map((name, i) => {
      return [i, Math.floor(avgs[name] / div)]
    })

    // , {max, min, nums, points}
    log.blue('averages of: ').data(Object.keys(avgs)).echo(this.shouldEcho)

    log
      .barStyles({
        color: 'blue',
        // width: 150,
        maxY: Math.floor(max / div),
        minY: Math.floor(min / div),
        // height: 100,
        // yFractions: 0,
        // xFractions: 0,
        caption: 'averages of all:',
      })
      .bar(points)
      .echo(this.shouldEcho)

    return this
  }

  /**
   * @see Record.fastest
   * @return {Record} @chainable
   */
  echoFastest() {
    log
      .verbose(this.fastest().shift())
      .underline('Fastest is ')
      .echo(this.shouldEcho)

    // log.bold('================').echo(this.shouldEcho)

    return this
  }

  /**
   * @see Record.trend
   * @return {Record} @chainable
   */
  echoTrend() {
    const graphs = this.trend()

    Object.keys(graphs).forEach(name => {
      console.log('\n')
      const {points, datePoints, max, min} = graphs[name]

      // log
      //   .magenta('verbose graph:')
      //   .verbose(100)
      //   .data(graphs[name])
      //   .echo(this.shouldDebug)

      log
        .barStyles({
          color: 'green',
          width: 150,
          height: 10,
          maxY: max,
          yFractions: 0,
          caption: name,
        })
        .bar(points)
        .echo(this.shouldEcho)

      log
        .barStyles({
          color: 'yellow',
          width: 150,
          height: 10,
          yFractions: 0,
          caption: name + ' over time' + log.colored(' (minutes):', 'dim'),
        })
        .bar(datePoints)
        .echo(false)
      // .echo(this.shouldEcho)
    })

    return this
  }

  // --- suite ---

  /**
   * @see Record.suite, Record.setup, Record.constructor
   * @param  {string} dir
   * @param  {Boolean} [auto=false]
   * @return {Object} {suite, record}
   */
  static suite(dir, auto = false) {
    const record = new Record(dir)
    const suite = record.suite(auto)

    record.setup()

    return {record, suite}
  }

  /**
   * @see Record.setup
   * @param  {Boolean} [auto=false]
   * @return {Benchmark.Suite}
   */
  suite(auto = false) {
    this.suite = new Suite()

    return this.suite
  }

  /**
   * @param  {Boolean} [auto=true] automatically sets up echoing and saving
   * @return {Record} @chainable
   */
  setup(auto = true) {
    const cycle = this.cycle.bind(this)
    this.suite.on('cycle', event => {
      cycle(event)
    })

    if (auto) {
      this.suite.on('complete', () =>
        // .echoAvgGraph()
        this.echoFastest().save().echoAvgs().echoTrend()
      )
    }

    return this
  }
  // --- operations / bench helpers when not using suite / ---

  /**
   * @desc add benchmark case
   * @param {string}   name
   * @param {Function} cb
   * @return {Record} @chainable
   */
  add(name, cb) {
    this.suite.add(name, cb)
    return this
  }

  /**
   * @desc calls setup, runs suite
   * @param {boolean} async
   * @return {Record} @chainable
   */
  run(async = false) {
    this.setup()
    this.suite.run({async})
    return this
  }

  /**
   * @see Record.run
   * @param {boolean} async
   * @return {Record} @chainable
   */
  runAsync() {
    return this.run(true)
  }

  /**
   * @desc runs the suite test x times
   * @param  {Number} [times=10]
   * @return {Record} @chainable
   */
  runTimes(times = 10) {
    // this.shouldEcho = false

    for (let i = 0; i < times; i++) {
      // if (i === times) this.shouldEcho = true
      this.suite.run({async: false})
    }

    return this
  }
}

Record.version = '0.0.5'
module.exports = Record
