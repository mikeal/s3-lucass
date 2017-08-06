const multihasher = require('multihasher')
const promisify = require('util').promisify

const propPromise = (inst, prop) => {
  return promisify((...args) => inst[prop](...args))
}

class S3Lucass {
  constructor (s3, bucket, hasher = multihasher('sha256')) {
    this.s3 = s3
    this.bucket = bucket
    this._hasher = hasher
    this._cache = new Set()

    const _headObject = propPromise(s3, 'headObject')
    const _putObject = propPromise(s3, 'putObject')
    this.consistentPut = async (bucket, key, buffer) => {
      try {
        await _headObject({Bucket: bucket, Key: key})
        return // Already been written.
      } catch (e) {
        // All good.
      }
      return _putObject({Bucket: bucket, Key: key, Body: buffer})
    }

    this._getObject = propPromise(s3, 'getObject')

    this._head = async key => {
      try {
        await _headObject({Bucket: bucket, Key: key})
        return true
      } catch (e) {
        return false
      }
    }
  }
  async get (hash) {
    let params = {Bucket: this.bucket, Key: hash}
    let object = await this._getObject(params)
    this._cache.add(hash, true)
    return object.Body
  }
  async set (value, ...args) {
    if (!Buffer.isBuffer(value)) throw new Error('Invalid type.')
    let hash = await this.hash(value, ...args)
    if (this._cache.has(hash)) return hash
    await this.consistentPut(this.bucket, hash, value)
    this._cache.add(hash, true)
    return hash
  }
  async hash (value, ...args) {
    if (!Buffer.isBuffer(value)) throw new Error('Invalid type.')
    return this._hasher(value, ...args)
  }
  async missing (hashes) {
    let diff = Array.from(new Set(hashes.filter(h => !this._cache.has(h))))
    // TODO: headObject the remaining hashes.
    let promises = diff.map(hash => this._head(diff))
    let results = await Promise.all(promises)
    let _missing = diff.filter(hash => !results.shift())
    return _missing
  }
}

module.exports = (...args) => new S3Lucass(...args)
