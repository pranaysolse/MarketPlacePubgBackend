// let h;
require('dotenv').config()
const jwt = require('jsonwebtoken');
const mysql = require("mysql");
const express = require("express");
const app = express()
const bcrypt = require('bcrypt');
const SALTROUND = 10;
const {v4: uuidv4} = require('uuid');
const axios = require('axios');
app.use(express.json())
const cors = require('cors')
app.use(cors())
const config = require('./MysqlConfig')
console.log(config.Config)
console.log(process.env.MYSQL_PASSWORD)
// app.get('/', (req,res)=>{
//     res.json({name:"pranay"})
// })
const Connection = mysql.createConnection(config.Config) 
Connection.connect();

app.post('/register',(req,res)=>{
    // make middleware for this stuff like crearing the required uuid storing the password in the database
    let  name = req.body.name;
    let password = req.body.password;
    // validate if user is real aka two step authenticatipons and stuff
    let email = req.body.email
    let uuid = uuidv4()
    // hash the pass
    bcrypt.hash(password,SALTROUND,function(err, hash){
        if(err){
            console.log("error in hashing: ",error)
            return res.sendStatus(501);
        }
    
        // let sql = 
    // inset all the data into the table got from the register 
        Connection.query(`insert into user values(?,?,?,?)`,[uuid,name,hash,email],(error,result,fields)=>{
        if(error){
            console.log("mysql error : ",error);
            return res.sendStatus(501);
        }
        console.log(result);
        return res.sendStatus(200);
        })
    });
    
});

app.post('/login',(req,res)=>{
    
    let email = req.body.email;
    let password = req.body.password;    
    console.log(password)
    //check for the password agaist databse
    let sql_query = 'select uuid,password from user where email = '+Connection.escape(email);
    Connection.query(sql_query, function(error,response,fields){
        if(error){
            console.log("mysql error: ",error);
            return res.sendStatus(501);
        }
        // validate response
        if(response){
            console.log(response[0].uuid)
            bcrypt.compare(password,response[0].password,function(err,result){
                console.log("compare result: ", result);
                //do stuff here or it wiill be syncronous
                // axios.post('http://localhost:4000/login',{
                //     name:response[0].uuid,
                //     password:response[0].password
                // })
                // .then((response)=>{
                //     console.log("axios response: ",response)
                // })
                // .catch((error)=>{
                //     console.log(error);
                // });console.
                console.log("redirecting to authserver")
                res.redirect(307,"http://localhost:4000/login")

            })
        //axios stuff 
        //fetch heere
        console.log("axios will take response from authserver: logging response: ",response[0].uuid,response[0].password);       
        }
        // res.json({name:req.body.name,password:req.body.password});
    })
    // bcrypt.compare(password,)

    // bcrypt.hash(password, SALTROUND,function(err,hash){
    //     if(err){
    //         console.log("hashing error: ",err);
    //         return res.sendStatus(503);
    //     }
    //     console.log(`name: ${req.body.name}, password: ${password},hash: ${hash}`)
        // let sql_query = 'select uuid from user where email = '+Connection.escape(email)+' and password = '+ Connection.escape(hash);
        // Connection.query(sql_query, function(error,response,fields){
        //     if(error){
        //         console.log("mysql error: ",error);
        //         return res.sendStatus(501);
        //     }
        //     // validate response
        //     if(response){
        //     //axios stuff 
        //     //fetch heere
        //     console.log("axios will take response from authserver: logging response: ",response);       
        //     }
        //     res.json({name:req.body.name,password:req.body.password});
        // })
    // });
});
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


console.log("hellowr")



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
});