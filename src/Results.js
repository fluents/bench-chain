/* eslint import/no-dynamic-require: "off" */
const {resolve} = require('path')
const ChainedMap = require('flipchain/ChainedMapExtendable')
const exists = require('flipfile/exists')
const write = require('flipfile/write')
const log = require('fliplog')
const ObjChain = require('obj-chain-core')

/**
 * @TODO: should use obj-chain for the file as well so just a file swap, same api
 */
module.exports = class Results extends ChainedMap {

  /**
   * @param  {BenchChain} parent
   * @param  {boolean} [configStore=false] use configstore
   * @return {Results}
   */
  static init(parent, configStore = false) {
    return new Results(parent, configStore)
  }

  /**
   * @param  {BenchChain} parent
   * @param  {boolean} [configStore=false] use configstore
   */
  constructor(parent, configStore = false) {
    super(parent)

    /* prettier-ignore */

    this
      .extend(['configStore'])
      .configStore(false)

    if (configStore) {
      configStore = new ObjChain({}, ['config'])
      log.quick(configStore)
      // .setup().dot(false)
      this.configStore(configStore)
    }

    /* prettier-enable */

    if (parent && parent.has && parent.has('debug')) {
      this.debug(parent.get('debug'))
    }
    else {
      this.debug(false)
    }
  }

  /**
   * @since 0.4.1
   * @desc gets results from file keyed
   * @param  {string} name suite name
   * @return {Object}      results
   */
  getForName(name) {
    if (name !== undefined) {
      if (this.data[name] === undefined) {
        this.data[name] = {}
      }
      return this.data[name]
    }
    return this.data
  }

  /**
   * @desc resolve file, paths to file
   *       sets abs: absolute path
   *       sets rel: relative path
   * @since 0.4.1
   * @param  {string} dir
   * @param  {string} filename
   * @return {BenchChain} @chainable
   */
  setup(dir, filename) {
    if (filename && !filename.includes('.json') && !filename.includes('.js')) {
      filename = filename + '.json'
    }
    const rel = filename || './results.json'
    const abs = resolve(dir, rel)
    return this.set('abs', abs).set('rel', rel)
  }

  /**
   * @protected
   * @desc   load from file or configstore (still a file but diff)
   * @since  0.2.0
   * @see    BenchChain.results
   * @param  {boolean} [force=false] force reload
   * @return {BenchChain} @chainable
   */
  load(force = false) {
    if (this.data && force === false) return this
    let {abs, configStore} = this.entries()

    if (abs.includes('configstore') && !configStore) {
      configStore = new ObjChain({}, ['config']).setup().dot(false)
      this.configStore(configStore)
      log
        .green('results loaded from configstore: ')
        .json({'(cmd + click)': log.colored(configStore.path, 'underline')})
        .echo()
    }

    // use configstore
    if (configStore) {
      if (!configStore.has(abs)) {
        configStore.set(abs, {})
      }
      // log.quick(configStore.escape(abs))
      this.data = configStore.get(abs) || {}

      return this
    }

    if (exists(abs) === false) write(abs, '{}')

    this.data = require(abs)
    log.green('loading').echo(this.get('debug'))

    return this
  }

  /**
   * @protected
   * @since 0.2.0
   * @desc saves to file or configstore
   * @see BenchChain.load, BenchChain.filename
   * @return {BenchChain} @chainable
   */
  save() {
    log.green('saving').echo(this.get('debug'))
    const {configStore, abs} = this.entries()

    if (configStore) {
      configStore.set(abs, JSON.stringify(this.data))

      log
        .green('results saved to: ')
        .json({'(cmd + click)': log.colored(configStore.path, 'underline')})
        .echo()

      return this
    }

    write(abs, JSON.stringify(this.data))

    return this
  }
}
