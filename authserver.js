require('dotenv').config()
const jwt = require('jsonwebtoken')
const express = require('express');
const app = express()
const cookieParser = require('cookie-parser');
const cors = require('cors');
ypt = require('bcrypt');
const SALTROUND = 10;
app.use(cookieParser())
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
    
    res.cookie("refreshtoken",refreshToken,{
        // httpOnly:true
    }).send("send cookie");
    console.log("cookie created succesfully");
})



//login logout 
app.delete('/logout',(req,res)=>{
        const refresh_token = req.cookies.refreshtoken
        console.log("refresh_token: ", refresh_token);
        //write validation logic herer

    // let refresh_token = req.headers['authorization'].split(' ')[1]
    // console.log("refreshtoken:",refresh_token)
    // if(refresh_token==null){
    //     return res.sendStatus(403);
    // }
    // check if cookie exist here please

    // promisify this and then wait for redis server reply and then preoicess next step
    redis_client.get(refresh_token,(error,reply)=>{
        const t = error
        const s = reply
        if (error){
            console.log(error)
           return res.sendStatus(401)
        }
        if(reply==null){
            console.log("401: unautorized")
            return res.sendStatus(401);
        }
        if(reply){
            console.log("reply: ",reply)
    jwt.verify(refresh_token,process.env.REFRESH_TOKEN,(error,user)=>{
        if (error){
            console.log(error)
            return res.sendStatus(401);
        }
        // console.log(refreshTokenArray)

         redis_client.del(refresh_token,(error,value)=>{
             if (error) console.log("error:", error)
             if (value==1) {console.log("value:", value);console.log("deleted")
             return res.sendStatus(201)
            }if(value==0){
                console.log("forbidden");
                return res.sendStatus(403)
            }
         })
        
        
        })
    }
})})


// refresh token
app.post('/refresh',async (req,res)=>{
    console.log("cookies: ",req.cookies)

    // let refresh_token = req.headers['authorization'].split(' ')[1]
    // if(refresh_token==null){
    //     return res.sendStatus(403)
    // }
    // console.log("before");

    // redis_client.get(refresh_token,(element)=>{
        // console.log(element);
        // console.log("redis: deleted from redis")
        // if (element==null){return res.sendStatus(401)}
    // })
    
    // if(!(refreshTokenArray.includes(refresh_token))){
    //     return res.sendStatus(401)
    
    
    // }
    const refresh_token = req.cookies.refreshtoken
    redis_client.get(refresh_token,(error,response)=>{
        if (error){
            return res.sendStatus(401)
        }
        if(response==null){
            return res.sendStatus(401)
        }
        console.log("response: ", response)
        jwt.verify(refresh_token,process.env.REFRESH_TOKEN,(error,value)=>{
            if(error){
                console.log("error:" ,error)
                return res.sendStatus(401)
            }
            console.log("value: ",value)
            return res.json({
                newToken:generateAccessToken({name:value.name})
            })
    })
    
    })
})

app.listen(4000,()=>console.log("listening on 4000"));