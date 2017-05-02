const log = require('fliplog')
const fliptime = require('fliptime')
const pkg = require('../package.json')
const BenchChain = require('./BenchChain')

log.registerCatch()

// @TODO every time a bench is added, should register all here, for multi benches
// const suites = {}

BenchChain.Bench = BenchChain
BenchChain.timer = fliptime
BenchChain.log = log
BenchChain.version = pkg.version
module.exports = BenchChain
