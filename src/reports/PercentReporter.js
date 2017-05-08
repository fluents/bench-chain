// %%% %%%%%%%%%%%%%%% %%%
// %%%  percent calcs  %%%
// %%% %%%%%%%%%%%%%%% %%%

const log = require('fliplog')
const Table = require('cli-table2')
let {
  padEnd,
  calcTimes,
  flowVals,
  calcPercent,
  flowmax,
  forown,
  replaceAnsi,
} = require('../deps')

/**
 * @see Reporter.avgs
 * @see Reporter.asyncMode
 */
module.exports = class PercentReporter {
  constructor(parent) {
    this.asyncMode = parent.asyncMode
    this.suiteName = parent.parent.get('suiteName')
    this.avgs = parent.avgs.bind(parent)
  }

  /**
   * @see https://github.com/aretecode/bench-chain/issues/2
   * @protected
   * @TODO clean
   * @desc compares two numbers,
   *       calculates times & percent,
   *       adjusts wording based on results
   *       calculate the positive and negatives * / x / times more/less
   * @since 0.4.1
   * @param  {number} value
   * @param  {number} other
   * @return {Object} {end, fixed, percent, word}
   */
  calculatePercent(value, other) {
    let fixed = calcTimes(value, other)
    let end = fixed
    let end2 = Math.floor(calcTimes(other, value))
    let percent = calcPercent(other, value)
    let word = 'faster'

    // @TODO needs fixing
    // const lt = end2 === -1 || end2 === 0
    // const usep = (end2 === 1 || lt) && false
    // if (usep) {
    //   end = percent + '%'
    //   if (lt) word = 'slower'
    //   // if (lt && !this.asyncMode) word = 'faster (ops/s)'
    //   // else if (!this.asyncMode) word = 'slower (ops/s)'
    // } else
    if (end < 1) {
      word = 'slower'
      end = '-' + end2 + 'X'
      // if (this.asyncMode) {
      //   word = 'faster (ops/s)'
      //   end = end2 + 'X'
      // }
    }
    else {
      //  (ops/s)
      if (!this.asyncMode) word = 'slower'
      end = Math.floor(fixed) + 'X'
    }

    if (!this.asyncMode) {
      if (end.includes('-')) end = end.replace('-', '')
      else end = '-' + end
    }

    const endIsNeg = end.includes('-') === true
    if (end.replace('-', '') === '1X') {
      end = percent + '%'
      end = end.replace('-', '')
      word = endIsNeg ? 'slower' : 'faster'
    }

    return {end, fixed, percent, word}
  }

  /**
   * @TODO needs cleaning
   *
   * @since 0.3.0
   * @desc
   *  uses microtime recordings & benchmarkjs data
   *  to go through an average of averages
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

    // add each part in so we know the lengths of each to padd
    const addPart = part => {
      parts.name.push(part.name)
      parts.val.push(part.val)
      parts.word.push(part.word)
      parts.diff.push(part.diff)
      parts.compare.push(part.compare)
      parts.otherVal.push(part.otherVal)
      pcts.push(part)
    }

    // go through each name
    // then go through each other name to compare
    names.forEach((name, n) =>
      names.forEach((compare, i) => {
        if (compare === name) return

        const value = values[n]
        const other = avgs[compare]
        const {end, word} = this.calculatePercent(value, other)

        // format
        let vc = log.colored(value + '', 'green.underline')
        let oc = log.colored(other + '', 'green.underline')
        let ec = log.colored(end, 'bold')
        let wc = log.colored(word, 'italic') + '  than'
        let ns = [log.colored(name, 'cyan'), log.colored(compare, 'blue')]

        // wrap strings
        vc = `(${vc})`
        oc = `(${oc})`

        // put the parts into an array to format padding
        addPart({
          name: ns[0],
          val: vc,
          diff: ec,
          word: wc,
          compare: ns[1],
          otherVal: oc,
        })
      })
    )

    return this.echoPaddedAverages(pcts, names, parts).echoAvgTable(pcts, names)
  }

  /**
   * @protected
   * @since 0.4.1
   * @param  {Array} pcts paddedColoredParts
   * @param  {Array<string>} names testnames
   * @param  {Array<Object>} parts array of parts before padding and coloring
   * @return {Reporter} @chainable
   */
  echoPaddedAverages(pcts, names, parts) {
    console.log('\n')
    let suiteName = this.suiteName

    if (suiteName.includes('/')) {
      suiteName = suiteName.split('/').pop()
    }
    if (suiteName.includes('.json')) {
      suiteName = suiteName.split('.json').shift()
    }

    log.bold(suiteName).echo()

    if (names[0]) {
      console.log('🏆  ' + log.colored(names[0].split(' ').pop(), 'underline'))
    }

    // padd end for pretty string
    const longests = flowVals(flowmax)(Object.assign({}, parts))
    pcts.forEach(pct => {
      let str = ''
      forown(pct, (v, k) => {
        if (k === 'msg') return

        // pad first
        v = v.padEnd(longests[k] + 2)

        // because these emoji have different lengths in chars
        // but not terminal size so we replace here
        if (v.includes('faster')) {
          v = v.replace(/(faster)/g, '🏎️') // 🏎️ ⚡
        }
        else if (v.includes('slower')) {
          v = v.replace(/(slower)/g, '🐌')
        }
        v = v.replace(/(than)/g, log.colored(' than', 'dim'))

        str += v
      })
      console.log(str)
    })
    console.log('\n')

    return this
  }

  /**
   * @protected
   * @since 0.4.1
   * @param  {Array} pcts paddedColoredParts
   * @param  {Array<string>} names testnames
   * @return {Reporter} @chainable
   */
  echoAvgTable(pcts, names) {
    const avgLong = this.avgs()
    const table = new Table({head: pcts.map(p => p.name)})

    const rows = pcts.map((p, i) => {
      const strippedName = replaceAnsi(p.name)
      if (!avgLong[strippedName]) {
        log.red('could not average it out' + p.name).echo()
        // log.quick({avgLong, names, strippedName, i, p})
        return ''
      }

      return avgLong[strippedName]
    })

    table.push(rows)
    console.log(table.toString())
    return this
  }
}
