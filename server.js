let h;
require('dotenv').config()
const jwt = require('jsonwebtoken');
const mysql = require("mysql");
const express = require("express");
const app = express()
const bcrypt = require('bcrypt');
const SALTROUND = 10;
app.use(express.json())
// const cors = require('cors')
// app.use(cors())

// app.get('/', (req,res)=>{
//     res.json({name:"pranay"})
// })
// app.post('/login',(req,res)=>{
//     bcrypt.hash(req.query.password, SALTROUND,function(err,hash){
//             console.log(`name: ${req.query.name}, password: ${req.query.password},hash: ${hash}`)
//             h = hash;
//         }
//     )
//     console.log(req.query);
//     res.json({name:req.query.name,password:req.query.password});
// })
// app.post('/p',async (req,res)=>{
// if(await bcrypt.compare(req.query.password,h)){
//     res.send("logged in");
// }})

let posts = {
    name:'pranay',
    age:'20'
} 

app.post('/refresh',(req,res)=>{
    const rToken = req.body.token;
    console.log(rToken);
    console.log(req.body);
    // console.log(req)
    res.json({rToken:rToken});
})

app.post('/post',authenticateToken,(req,res)=>{
    // const username = req.query.name
    // console.log(username);
    // res.json({name:username});
    res.json({response:"done"})
})

function authenticateToken(req,res,next){
    console.log("hello")
    const authheader = req.headers['authorization']
    console.log(authheader);
    const token = authheader && authheader.split(' ')[1]
    console.log(token)
    if (token== null) return res.sendStatus(401);
    jwt.verify(token,process.env.ACCESS_TOKEN,(error,user)=>{
        if(error){
            res.sendStatus(403)
        }
        console.log("user",user);
        req.user = user;
        next();
    }) 
}



app.listen(3000,()=>{
    console.log("listening on port 3000");
})


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

