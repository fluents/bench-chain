const Bench = require('../')

const sleep = sleepDuration =>
  new Promise(resolve => setTimeout(resolve, sleepDuration))

Bench
  .init().dir(__dirname).filename('asyncs.json').setup()
  .name('sleepy')
  .tags('v1,v2')

  // can also use .add, and then .runAsync()
  .addAsync('sleep1', async done => {
    await sleep(1000)
    done()
  })
  .addAsync('sleep2', async done => {
    await sleep(2000)
    done()
  })
  .run()
