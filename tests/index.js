const test = require('ava')
const Record = require('../src')

test('can instantiate', t => {
  const record = new Record(__dirname)
  t.instanceOf(record, Record)
})
