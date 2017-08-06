const spec = require('lucass/lib/test-basics')
const mkdirp = require('mkdirp')
const os = require('os')
const path = require('path')
let dir = path.join(os.tmpdir(), Math.random().toString())
mkdirp.sync(dir)

var AWSMock = require('mock-aws-s3')
AWSMock.config.basePath = dir
var s3 = AWSMock.S3()
const createStore = require('../')

// monkey patch mock library to have a proper error object.
s3._getObject = s3.getObject
s3.getObject = (params, cb) => {
  s3._getObject(params, (err, data) => {
    if (err) {
      err = new Error('Not found.')
    }
    cb(err, data)
  })
}

spec('s3', createStore(s3, 'ledger.test'))

const test = require('tap').test

test('s3: missing API', async t => {
  t.plan(2)
  let store = createStore(s3, 'ledger.test')
  let key = await store.set(Buffer.from('asdf'))
  t.same(await store.missing(['asdf']), ['asdf'])
  t.same(await store.missing([key]), [])
})

test('s3: missing API w/o', async t => {
  t.plan(2)
  let store = createStore(s3, 'ledger.test')
  let key = await store.set(Buffer.from('asdfaksdflkasjdfklajsldfkj'))
  store._cache = new Set()
  t.same(await store.missing(['asdf']), ['asdf'])
  t.same(await store.missing([key]), [])
})
