const log = require('fliplog')
const {tillNow} = require('fliptime')
const ChainedMap = require('flipchain/ChainedMapExtendable')
const {padEnd, calcTimes, flowVals} = require('./deps')

// const flowmin = flow(Math.floor, Math.min)
// const flowmax = flow(Math.floor, Math.max)
const flowmin = nums => Math.floor(Math.min(...nums))
const flowmax = nums => Math.floor(Math.max(...nums))

/**
 * @TODO
 *  - [ ] deepmerge multi results
 *  - [ ] graph comparisons
 * @type {Class}
 */
module.exports = class Report extends ChainedMap {
  constructor(parent) {
    super(parent)

    this.shouldEcho = parent.shouldEcho
    this.debug = false // parent.debug // || true
    this.dir = parent.dir
    this.testName = parent.testName
    this.tag = parent.tag
    this.current = parent.current
    this.fastest = parent.fastest.bind(parent)
    // this.debug(parent.get('debug'))
  }
  getResults() {
    return this.parent.getResults()
  }

  /**
   * @param  {string} prop map to this property to average with that data
   * @return {Averages} averages
   */
  avgs(prop = 'num') {
    const avgs = {}
    const results = this.getResults()

    log.blue('this.results').data(results).echo(this.debug)

    Object.keys(results).forEach(name => {
      const v = results[name]

      // skip for now
      if (!v[0].timesFor) return

      const t4s = v.map(entry => {
        log
          .data(Object.keys(entry), entry.timesFor)
          .red('ENTRY ' + entry.name)
          .echo(this.debug)
        return entry.timesFor.map(t => t.diff)
      })
      const t4 = [].concat.apply(t4s).pop()
      const avgavg = Math.abs(this.avg(t4))

      const resultsForProp = v.map(result => avgavg)
      const avg = this.avg(resultsForProp)

      log
        .blue('averages')
        .data({name, resultsForProp, avg, avgavg, t4})
        .echo(this.debug)

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


  // --- echoing helpers ---

  /**
   * @private
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
    const results = this.getResults()

    Object.keys(results).forEach(name => {
      // remap
      const timesFor = results[name].map(entry => entry.timesFor.map(t => t.diff))
      // flatten
      let nums1 = ([].concat.apply(timesFor))
      // average
      let nums = nums1.map(numnum => this.avg(numnum))
      // min max
      let min = flowmin(nums)
      let max = flowmax(nums)
      const div = this.getDiv(max)

      // filter anomolies
      nums = nums.filter(nn => {
        const minp = min * 1.1
        const maxp = max / 1.1

        log
          .data({
            nn,
            minp,
            maxp,
            max,
            min,
            passes: (nn >= minp) && (nn <= maxp),
          })
          .echo(false)

        return (nn >= minp) // && (nn <= maxp)
      })

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
   * @return {Record} @chainable
   */
  echoAvgGraphInOne() {
    const avgs = this.avgs()
    const nums = Object.keys(avgs).map(name => Number(avgs[name]))
    const max = Math.floor(Math.max(...nums))
    const min = Math.floor(Math.min(...nums))
    const div = this.getDiv(max) * 10
    const points = Object.keys(avgs).map((name, i) => {
      return [i, Math.floor(avgs[name] / div)]
    })

    // , {max, min, nums, points}
    log
      .blue('averages of: ')
      .data(Object.keys(avgs))
      .echo(this.shouldEcho)

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
    log
      .blue('averages of: ')
      .data(Object.keys(avgs))
      .echo(this.shouldEcho)

    log
      .barStyles({
        color: 'blue',
        maxY: Math.floor(max / div),
        minY: Math.floor(min / div),
        // width: 150,
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

    return this
  }

  /**
   * @desc
   *  uses microtime recordings to go through an average of averages
   *  then compare each result to each other to show how many times
   *  faster/slower they are
   *
   * @return {Record} @chainable
   */
  echoPercent() {
    const avgs = this.avgs()
    const names = Object.keys(avgs)
    const values = Object.values(avgs)
    const pcts = []
    const parts = {
      name: [],
      val: [],
      diff: [],
      word: [],
      compare: [],
      otherVal: [],
    }

    // go through each name
    // then go through each other name to compare
    names.forEach((name, n) => names.forEach((compare, i) => {
      if (compare === name) return
      const value = values[n]
      const other = avgs[compare]

      // calculate the positive and negatives */x/times more/less
      let fixed = calcTimes(value, other)
      let end = fixed
      let end2 = Math.floor(calcTimes(other, value))

      let word = 'faster'
      if (end < 1) {
        word = 'slower'
        end = '-' + end2
      }
      else {
        end = Math.floor(fixed)
      }

      // format
      let vc = log.colored(value + '', 'green.underline')
      let oc = log.colored(other + '', 'green.underline')
      let ec = log.colored(end + 'X', 'bold')
      let wc = log.colored(word, 'italic') + ' than'
      let ns = ([
        log.colored(name.split(' ').shift(), 'cyan'),
        log.colored(compare.split(' ').shift(), 'blue'),
      ])

      vc = `(${vc})`
      oc = `(${oc})`

      const txt = (`${ns[0]} (${vc}) ${ec} ${wc} ${ns[1]} (${oc})`)

      // put the parts into an array to format padding
      const pct = {
        name: ns[0],
        val: vc,
        diff: ec,
        word: wc,
        compare: ns[1],
        otherVal: oc,
      }
      parts.name.push(pct.name)
      parts.val.push(pct.val)
      parts.word.push(pct.word)
      parts.diff.push(pct.diff)
      parts.compare.push(pct.compare)
      parts.otherVal.push(pct.otherVal)
      pcts.push(pct)
    }))


    console.log('\n')
    console.log(log.colored(names[0].split(' ').pop(), 'underline'))

    // padd end for pretty string
    const longests = flowVals(flowmax)(Object.assign({}, parts))
    pcts.forEach(pct => {
      let str = ''
      Object.keys(pct).forEach(k => {
        pct[k] = padEnd(pct[k], longests[k] + 2)
        str += pct[k]
      })
      console.log(str)
    })
    console.log('\n')

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

      log
        .magenta('verbose graph:')
        .verbose(100)
        .data(graphs[name])
        .echo(false)

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
}
