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
  }
  async get (hash) {
    let params = {Bucket: this.bucket, Key: hash}
    let object = await this._getObject(params)
    return object.Body
  }
  async set (value, ...args) {
    if (!Buffer.isBuffer(value)) throw new Error('Invalid type.')
    let hash = await this.hash(value, ...args)
    await this.consistentPut(this.bucket, hash, value)
    return hash
  }
  async hash (value, ...args) {
    if (!Buffer.isBuffer(value)) throw new Error('Invalid type.')
    return this._hasher(value, ...args)
  }
}

module.exports = (...args) => new S3Lucass(...args)
