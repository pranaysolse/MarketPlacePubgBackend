require('dotenv').config()
const jwt = require('jsonwebtoken')
const express = require('express');
const app = express()
const cors = require('cors');
ypt = require('bcrypt');
const SALTROUND = 10;

// var bodyParser = require('body-parser');
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded());
// // in latest body-parser use like below.
// app.use(bodyParser.urlencoded({ extended: true }));

//redi to store the refresh tokens
const redis = require("redis")
const port = 6379
const redis_client = redis.createClient(port,'localhost')
redis_client.on("error",function(error){
    console.log(error)
})




app.use(express.json())
app.use(cors())
// let refreshTokenArray =[]
function generateAccessToken(user){
   return jwt.sign(user,process.env.ACCESS_TOKEN,{expiresIn:'60s'})
}
// login token
app.post('/login',async (req,res)=>{
    console.log(req.body)
    let name = req.body.name
    let pass = req.body.pass
    console.log("name:", name, "pass: ", pass)



    //authenticate with pass
    
    
    
    //encrypt and test agaist database and then create token
    
    
    
    // console.log("hello")
    // console.log(username)
    user = {name:name};
    const token =  generateAccessToken(user);
    const refreshToken = jwt.sign(user,process.env.REFRESH_TOKEN);
    
    redis_client.set(refreshToken,name,redis.print)
    
    // refreshTokenArray.push(refreshToken);
    
    console.log("both tokens \n" ,{accessToken:token,refreshtoken:refreshToken})
    
    res.send({accessToken:token,refreshtoken:refreshToken});
})



//login logout 
app.delete('/logout',(req,res)=>{
    let refresh_token = req.headers['authorization'].split(' ')[1]
    console.log("refreshtoken:",refresh_token)
    if(refresh_token==null){
        return res.sendStatus(403);
    }
    jwt.verify(refresh_token,process.env.REFRESH_TOKEN,(error,user)=>{
        if (error){
            console.log(error)
            return res.sendStatus(401);
        }
        // console.log(refreshTokenArray)

         redis_client.del(refresh_token,(error,value)=>{
             if (error) console.log("error:", error)
             if (value) console.log("value:", value)
         })
        
        
        })
        res.sendStatus(201)
})


// refresh token
app.post('/refresh',async (req,res)=>{
    let refresh_token = req.headers['authorization'].split(' ')[1]
    if(refresh_token==null){
        return res.sendStatus(403)
    }
    console.log("before");

    // redis_client.get(refresh_token,(element)=>{
        // console.log(element);
        // console.log("redis: deleted from redis")
        // if (element==null){return res.sendStatus(401)}
    // })
    
    // if(!(refreshTokenArray.includes(refresh_token))){
    //     return res.sendStatus(401)
    
    
    // }
    redis_client.get(refresh_token,(error,response)=>{
        if (error){
            return res.sendStatus(401)
        }
        console.log("response: ", response)
        jwt.verify(refresh_token,process.env.REFRESH_TOKEN,(error,value)=>{
            if(error){
                console.log("error:" ,error)
                res.sendStatus(403)
            }
            console.log("value: ",value)
            res.json({
                newToken:generateAccessToken({name:value.name})
            })
    })
    
    })
})

app.listen(4000,()=>console.log("listening on 4000"));