const redis = require("redis")
const port = 6379
const redis_client = redis.createClient(port,'localhost')
redis_client.on("error",function(error){
    console.log(error)
})

redis_client.set('key',"pranay",console.log)
redis_client.get('key',console.log)
redis_client.get('s',(error,reply)=>{
    if(error){
        return console.log(error);
    }
    if(reply==null){
    console.log("reply",reply)
    }
})    