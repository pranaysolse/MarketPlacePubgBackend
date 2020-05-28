const redis = require("redis")
const port = 6379
const redis_client = redis.createClient(port,'localhost')
redis_client.on("error",function(error){
    console.log(error)
})
let s =redis_client.get('key',redis.print)
// redis_client.set("key", "value", redis.print)
console.log(s)

// console.log(redis_client.get("key",  redis.print))