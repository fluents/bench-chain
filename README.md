# 🏋️⛓ bench-chain

> benchmark recording - averages & graphs.

[![Build Status][travis-image]][travis-url]
[![NPM version][bench-chain-npm-image]][bench-chain-npm-url]
[![MIT License][license-image]][license-url]
[![bench-chain][gitter-badge]][gitter-url]
[![Dependencies][david-deps-img]][david-deps-url]
[![fluents][fluents-image]][fluents-url]

[fluents-image]: https://img.shields.io/badge/⛓-fluent-9659F7.svg
[fluents-url]: https://www.npmjs.com/package/flipchain

[bench-chain-npm-image]: https://img.shields.io/npm/v/bench-chain.svg
[bench-chain-npm-url]: https://npmjs.org/package/bench-chain
[license-image]: http://img.shields.io/badge/license-mit-blue.svg?style=flat
[license-url]: https://spdx.org/licenses/mit
[gitter-badge]: https://img.shields.io/gitter/room/bench-chain/pink.svg
[gitter-url]: https://gitter.im/bench-chain/Lobby

[travis-image]: https://travis-ci.org/${org}/bench-chain.svg?branch=master
[travis-url]: https://travis-ci.org/bench-chain/bench-chain

[david-deps-img]: https://david-dm.org/bench-chain/bench-chain.svg
[david-deps-url]: https://david-dm.org/bench-chain/bench-chain

<img width="1199" alt="screen shot 2017-04-24 at 5 51 21 am" src="https://cloud.githubusercontent.com/assets/4022631/25358171/616dcc44-28f5-11e7-80ab-883ce5a9ae9a.png">

<!--
[![Standard JS Style][standard-image]][standard-url]
[standard-image]: https://img.shields.io/badge/%F0%9F%91%95%20code%20style-standard%2Bes6+-blue.svg
[standard-url]: https://github.com/aretecode/eslint-config-aretecode
-->


## 📦 install
```bash
yarn add bench-chain
npm i bench-chain --save
```

```js
const bench = require('bench-chain')
```

## [🌐 documentation](./docs)
## [🔬 tests](./tests)
## [📘 examples](./examples)

```js
const {resolve} = require('path')
const Bench = require('bench-chain')

const {record, suite} = Bench.suite(__dirname, true)

suite
  .add('1 * 1', () => 1 * 1)
  .add('1 + 1', () => 1 + 1)
  .run()

// true auto calls the following functions:
record.setup(true)

/**
 * suite.on('complete', () => record.echoFastest().save().echoAvgs().echoTrend())
 */
```
