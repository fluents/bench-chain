const os = require('os')
const {resolve} = require('path')
const {Suite} = require('benchmark')
const exists = require('flipfile/exists')
const write = require('flipfile/write')
const log = require('fliplog')
const fliptime = require('fliptime')
const Fun = require('funwithflags')
const ChainedMap = require('flipchain/ChainedMapExtendable')
const pkg = require('../package.json')
const battery = require('./battery')
const {uniq} = require('./deps')
const Reporter = require('./Report')

const {tillNow, microtime} = fliptime

log.registerCatch()

const {runTimes, graph} = Fun(process.argv.slice(2), {
  default: {
    runTimes: 1,
    graph: false,
  },
  bool: ['graph'],
  camel: true,
  unknown(arg, fun) {
    if (fun.i === 0) fun.argv.runTimes = Number(arg)
  },
})

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
class BenchChain extends ChainedMap {

  /**
   * @param {string} dir directory for the file with the record
   * @param {string} filename filename for benchmark
   */
  constructor(dir, filename) {
    super()
    this.dir = dir
    this.shouldEcho = true
    this.debug = false
    this.initMem = process.memoryUsage()
    this.initMemOs = os.freemem()
    this.filename(filename)
  }

  /**
   * @see BenchChain.testName
   * @return {Object} results, with test name when available
   */
  getResults() {
    if (this.testName !== undefined) {
      if (this.results[this.testName] === undefined) {
        this.results[this.testName] = {}
      }
      return this.results[this.testName]
    }
    return this.results
  }

  /**
   * @param {string} name test name
   * @return {BenchChain} @chainable
   */
  name(name) {
    this.testName = name
    return this
  }

  /**
   * @since 0.2.0
   * @param {string} tags tag current benchmarks with
   * @return {BenchChain} @chainable
   */
  tags(tags) {
    this.tag = tags
    return this
  }

  /**
   * @since 0.2.0
   * @HACK @FIXME
   * @param {string} name test name
   * @param {number} num  timestamp micro or mili or
   * @return {BenchChain} @chainable
   */
  addTime(name, num) {
    const result = {name, num, tag: this.tag}
    const results = this.getResults()
    this.current = result
    this.current.tag = this.tag
    // use results object, or a new object
    if (results !== undefined && results[name] === undefined) {
      results[name] = []
    }
    else if (Array.isArray(results[name]) === false) {
      results[name] = []
    }

    results[name].push(result)
    return this
  }

  /**
   * @protected
   * @desc handles benchmark cycle event
   * @see BenchChain.results, BenchChain.current
   * @param  {Benchmark.Event} event
   * @return {BenchChain} @chainable
   */
  cycle(event) {
    const hz = event.target.hz < 100 ? 2 : 0
    const num = Number(event.target.hz.toFixed(hz))
    // log.quick(event, num, event.target.hz.toFixed(hz))
    // @example "optimized x 42,951 ops/sec ±3.45% (65 runs sampled)"
    const msg = event.target.toString()
    const name = msg.split(' x').shift()
    const sampled = msg.split('% (').pop().split(' runs').shift()
    const variation = msg.split('±').pop().split('%').shift()
    const result = {name, num, sampled, variation, tag: this.tag}
    const results = this.getResults()
    this.current = result
    this.current.tag = this.tag
    // use results object, or a new object
    if (results !== undefined && results[name] === undefined) {
      results[name] = []
    }
    else if (Array.isArray(results[name]) === false) {
      results[name] = []
    }

    results[name].push(result)

    return this
  }

  // --- file ---

  /**
   * @desc   save and load file for the results
   * @param  {String} [filename='./results.json']
   * @return {BenchChain} @chainable
   */
  filename(filename = './results.json') {
    this.rel = filename || './results.json'
    this.abs = resolve(this.dir, this.rel)

    log.green('writing').data({rel: this.rel, abs: this.abs}).echo(this.debug)

    if (exists(this.abs) === false) {
      write(this.abs, '{}')
    }

    this.load()
    return this
  }

  /**
   * @see    BenchChain.results
   * @param  {Boolean} [force=false] force reload
   * @return {BenchChain} @chainable
   */
  load(force = false) {
    if (this.results && force === false) return this

    this.results = require(this.abs) // eslint-disable-line
    log.green('loading').echo(this.debug)

    return this
  }

  /**
   * @desc saves to file
   * @see BenchChain.load, BenchChain.filename
   * @return {BenchChain} @chainable
   */
  save() {
    const now = Date.now()
    const mem = process.memoryUsage()

    log.green('saving').echo(this.debug)

    const results = this.getResults()
    const resultKeys = Object.keys(results)
    resultKeys.forEach(name => {
      const r = results[name][results[name].length - 1] || {}
      r.now = now
      r.mem = mem
      r.tags = this.tag
      r.battery = battery
      r.timesFor = this.timesFor[name]
    })

    // @TODO: fix
    resultKeys.forEach(name => {
      results[name] = results[name].filter(uniq).filter(val => !!val.now)
    })

    // log.quick(this.results)

    write(this.abs, JSON.stringify(this.results, null, 2))

    return this
  }


  /**
   * @see BenchChain.suite
   * @return {Array<string>} test case name
   */
  fastest() {
    return this.suite.filter('fastest').map('name')
  }

  // --- suite ---

  /**
   * @TODO improve this factory
   * @see BenchChain.suite, BenchChain.setup, BenchChain.constructor, BenchChain.filename
   * @param  {string} dir
   * @param  {Boolean} [auto=false]
   * @param  {String} [filename='./results.json']
   * @return {Object} {suite, record}
   */
  static suite(dir, auto = false, filename = './results.json') {
    const record = new BenchChain(dir, filename)
    const suite = record.suite(auto)

    record.setup()

    return {record, suite}
  }

  /**
   * @see BenchChain.setup
   * @param  {Boolean} [auto=false]
   * @return {Benchmark.Suite}
   */
  suite(auto = false) {
    this.suite = new Suite()

    return this.suite
  }

  /**
   * @param  {Boolean} [auto=true] automatically sets up echoing and saving
   * @param  {Boolean} [cycles=true] capture cycles
   * @return {BenchChain} @chainable
   */
  setup(auto = true, cycles = true) {
    if (cycles === true) {
      const cycle = this.cycle.bind(this)
      this.suite.on('cycle', event => {
        cycle(event)
      })
    }
    if (auto) {
      this.suite.on('complete', () => {
        this.save().echo()
      })
    }

    return this
  }

  // --- operations / bench helpers when not using suite / ---

  /**
   * @desc add benchmark case
   * @param {string}   name
   * @param {Function} fn
   * @return {BenchChain} @chainable
   */
  add(name, fn) {
    this.set('async', false)
    this.suite.add(name, fn)
    return this
  }

  /**
   * @param  {boolean} [asyncs=true]
   * @return {BenchChain} @chainable
   */
  asyncMode(asyncs = true) {
    return this.set('async', asyncs)
  }

  /**
   * @since 0.2.0
   * @protected
   * @desc should return empty calls to see baseline
   *       empty bench to get more raw overhead
   *
   * @see BenchChain.addAsync
   * @param  {string}   name test name
   * @param  {Function} fn function to call deferred
   * @return {BenchChain}   @chainable
   */
  hijackAsync(name, fn) {
    return async cb => {
      // console.log(name)
      // return cb.resolve()
      const times = {
        start: microtime.now(),
        end: null,
      }
      const hjResolve = (arg) => {
        times.end = microtime.now()
        times.diff = times.end - times.start
        return cb.resolve(arg)
      }
      const hjReject = (arg) => {
        times.end = microtime.now()
        times.diff = times.end - times.start
        return cb.reject(arg)
      }
      hjResolve.reject = hjReject
      hjResolve.resolve = hjResolve

      this.timesFor = this.timesFor || {}
      this.timesFor[name] = this.timesFor[name] || []
      this.timesFor[name].push(times)

      return await fn(hjResolve, hjReject)
    }
  }

  /**
   * @since 0.2.0
   * @desc add benchmark case (with defer)
   * @param {string}   name
   * @param {Function} fn
   * @return {BenchChain} @chainable
   */
  addAsync(name, fn) {
    this.set('async', true)
    this.suite.add(name, {
      defer: true,
      fn: this.hijackAsync(name, fn),
    })
    return this
  }

  /**
   * @desc calls setup, runs suite
   * @return {BenchChain} @chainable
   */
  run(...args) {
    this.setup()
    if (graph === true) {
      return this.echo()
    }
    this.suite.run({async: this.get('async')})
    return this
  }

  /**
   * @see BenchChain.run
   * @param {boolean} async
   * @return {BenchChain} @chainable
   */
  runAsync() {
    return this.set('async', true).run()
  }

  /**
   * @desc runs the suite test x times
   * @param  {Number} [times=null] defaults to 1, allows first arg to be number of runs
   * @return {BenchChain} @chainable
   */
  runTimes(times = null) {
    // this.shouldEcho = false
    if (times === null) times = runTimes

    for (let i = 0; i < times; i++) {
      // this.suite.resetSuite()
      // if (i === times) this.shouldEcho = true
      this.suite.run({async: this.get('async')})
    }

    return this
  }

  /**
   * @since 0.2.0
   * @desc instantiates Reporter, does echoing of numbers
   * @return {BenchChain} @chainable
   */
  echo() {
    this.load()

    const reporter = new Reporter(this)
    reporter.echoFastest()
    reporter.echoAvgGraph()
    reporter.echoAvgs()
    reporter.echoTrend()
    reporter.echoPercent()

    return this
  }
}

BenchChain.version = pkg.version
module.exports = BenchChain
