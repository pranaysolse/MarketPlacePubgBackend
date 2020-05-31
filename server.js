// let h;
require('dotenv').config()
const jwt = require('jsonwebtoken');
const mysql = require("mysql");
const express = require("express");
const app = express()
const bcrypt = require('bcrypt');
const SALTROUND = 10;
const {v4: uuidv4} = require('uuid');
// const axios = require(axios);
app.use(express.json())
const cors = require('cors')
app.use(cors())
const config = require('./MysqlConfig')
console.log(config.Config)
// app.get('/', (req,res)=>{
//     res.json({name:"pranay"})
// })
const Connection = mysql.createConnection(config) 
Connection.connect()
app.post('/register',(req,res)=>{
    // make middleware for this stuff like crearing the required uuid storing the password in the database
    let  name = req.body.name;
    let password = req.body.password;
    // validate if user is real aka two step authenticatipons and stuff
    let uuid = uuidv4()
    // hash the pass
    let hash = bcrypt.hash(password,SALTROUND,function(err, hash){
        if(error){
            console.log("error in hashing: ",error)
            return res.sendStatus(501);
        }
        return hash;
    });
    // inset all the data into the table got from the register 
    Connection.query(`insert into user values(${uuid}, ${name},${hash})`,(error,result,fields)=>{
        if(error){
            console.log("mysql error : ",error);
            return res.sendStatus(501);
        }
        console.log(result);
        return res.sendStatus(200);
    })
    
});
app.post('/login',(req,res)=>{
    let password = req.body.password    
    //check for the password agaist databse
    let hash = bcrypt.hash(req.query.password, SALTROUND,function(err,hash){
            console.log(`name: ${req.query.name}, password: ${req.query.password},hash: ${hash}`)
            return hash;
    })
    response = Connection.query(`select uuid from user where password=${hash}`,function(error,response,fields){
        if(error){
            console.log("mysql error: ",error);
            return res.sendStatus(501);
        }
        return response
    })
    if(response){
        //axios stuff 
        console.log("axios will take response from authserver: logging response: ",response);       
    }
    res.json({name:req.query.name,password:req.query.password});
})
// app.post('/p',async (req,res)=>{
// if(await bcrypt.compare(req.query.password,h)){
//     res.send("logged in");
// }})

// let posts = {
//     name:'pranay',
//     age:'20'
// } 

// app.post('/refresh',(req,res)=>{
//     const rToken = req.body.token;
//     console.log(rToken);
//     console.log(req.body);
//     // console.log(req)
//     res.json({rToken:rToken});
// })

app.post('/post',authenticateToken,(req,res)=>{
    // const username = req.query.name
    // console.log(username);
    // res.json({name:username});
    res.json({response:"done"})
})

function authenticateToken(req,res,next){
    // console.log("hello")
    const authheader = req.headers['authorization']
    // console.log(authheader);
    const token = authheader && authheader.split(' ')[1]
    // console.log(token)
    if (token== null) return res.sendStatus(401);
    jwt.verify(token,process.env.ACCESS_TOKEN,(error,user)=>{
        if(error){
            res.sendStatus(403)
        }
        // console.log("user",user);
        req.user = user;
        next();
    }) 
}






// let connection = mysql.createConnection({
//     host:'localhost',
//     user:'root',
//     password:'root',
//     database:'marketplace'
// });

// connection.connect(function(error){
//     if(error){
//         console.log(error);
//         return ;
//     }
//     console.log("connected to the database");
//     return;
//     });
// let sql = `select * from user`;
// connection.query(sql, (error,results, fields)=>{
//     if (error){
//         console.log(error);
//         return;
//     }
//     console.log(results);
//     // console.log(fields);
// })


// connection.end((err)=>{
//     if (err) {
//         console.log(error);
//     return;
// }
//     console.log("connection end")
//     return ;
// })

app.listen(3000,()=>{
    console.log("listening on port 3000");
})