const test = require('ava')
const Record = require('../src')
const Report = require('../src/Report')

test('can instantiate', t => {
  const record = new Record(__dirname)
  t.true(record instanceof Record)
})

test('can instantiate report', t => {
  const record = new Record(__dirname)
  const report = new Report(record)
  t.true(report instanceof Report)
})
