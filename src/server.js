const cors = require("cors");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const config = require("../configs/MysqlConfig");
require("dotenv").config({ path: "./configs/.env" });
const corsConfig = require("../configs/corsConfig");

console.log(config);
const SALTROUND = 10;
app.use(express.json());
app.use(cors(corsConfig.config));
const Connection = mysql.createConnection(config.Config);
Connection.connect();

io.on("connection", (socket) => {
  console.log("User Connected");

  io.emit("some", "Something");

  socket.on("chat", (chat) => {
    console.log("Chat", chat);
    io.emit("chatmsg", chat);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnect");
  });
});

app.post("/register", (req, res) => {
  // make middleware for this stuff like crearing the required
  // uuid storing the password in the database
  // validate if user is real aka two step authenticatipons and stuff
  const { username } = req.body;
  const { password } = req.body;
  const { email } = req.body;
  const uuid = uuidv4();

  Connection.query(
    `select email from user where email=${Connection.escape(email)}`,
    (error, response) => {
      if (error) {
        return res.json(401);
      }

      if (response[0] && response[0].email != null) {
        console.log("Email Already Exists");
        return res.sendStatus(401);
      }
      bcrypt.hash(password, SALTROUND, (err, hash) => {
        if (err) {
          console.log("error in hashing: ", err);
          return res.sendStatus(501);
        }

        // let sql =
        // inset all the data into the table got from the register
        Connection.query(
          "insert into user values(?,?,?,?)",
          [uuid, username, hash, email],
          (error2, result) => {
            if (error2) {
              console.log("mysql error : ", error2);
              return res.sendStatus(501);
            }
            console.log(result);
            return res.status(200).send("SuccesFully Created User");
          }
        );
        return null;
      });
      return null;
    }
  );
});

app.post("/login", (req, res) => {
  const { email } = req.body;
  const { password } = req.body;
  // console.log(password);
  // check for the password agaist databse
  const sqlQuery = `select uuid,password from user where email = ${Connection.escape(
    email
  )}`;
  Connection.query(sqlQuery, async (error, response) => {
    if (error) {
      console.log("mysql error: ", error);
      return res.sendStatus(501);
    }
    console.log(response);

    // console.log(response);
    // validate response
    if (response) {
      console.log(response[0].uuid);
      console.log(password, response[0].password);
      const validator = await bcrypt.compare(password, response[0].password);

      console.log(validator);
      // do stuff here or it wiill be syncronous
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

      if (!validator) {
        res.status(401).send("Password Not Match");
        console.log("password not match");
      } else {
        console.log("redirecting to authserver");
        res.redirect(307, "http://localhost:4000/login");
        // res.send("passmatch");

        // axios stuff
        // fetch heere
        console.log(
          "axios will take response from authserver: logging response: ",
          response[0].uuid,
          response[0].password
        );
      }
    } else {
      res.status(401).send("Email Not Found");
    }

    // res.json({name:req.body.name,password:req.body.password});
    return null;
  });
  // bcrypt.compare(password,)

  // bcrypt.hash(password, SALTROUND,function(err,hash){
  //     if(err){
  //         console.log("hashing error: ",err);
  //         return res.sendStatus(503);
  //     }
  //     console.log(`name: ${req.body.name}, password: ${password},hash: ${hash}`)
  // let sqlQuery = 'select uuid from user where email = '+Connection.escape(email)+'
  // and password = '+ Connection.escape(hash);
  // Connection.query(sqlQuery, function(error,response,fields){
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

function authenticateToken(req, res, next) {
  // console.log("hello")
  const authheader = req.headers.authorization;
  // console.log(authheader);
  const token = authheader && authheader.split(" ")[1];
  // console.log(token)
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, user) => {
    if (error) {
      res.sendStatus(403);
    }
    // console.log("user",user);
    req.user = user;
    next();
  });
  return null;
}

app.post("/post", authenticateToken, (req, res) => {
  // const username = req.query.name
  // console.log(username);
  // res.json({name:username});
  res.json({ response: "done" });
});

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

http.listen(5000, () => {
  console.log("listening on port 5000");
});
