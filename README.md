# s3-lucass

Content addressable storage using `lucass` API.

```javascript
const S3 = new require('aws-sdk/clients/s3')
const s3 = new S3()
const store = require('s3-lucass')(s3, 'bucketname')

let hash = await store.set(Buffer.from('asdf'))
let buff = await store.get(hash)
console.log(buff.toString()) // 'asdf'
```