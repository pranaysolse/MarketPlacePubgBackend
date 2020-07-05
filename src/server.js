const cors = require("cors");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { default: Axios } = require("axios");

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
    io.emit("chat", chat);
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
  const { pubgid } = req.body;
  const balance = 0;
  const level = 0;
  const xp = 0;
  const uuid = uuidv4();

  Connection.query(
    `select email from user where email=${Connection.escape(email)}`,
    (error, response) => {
      if (error) {
        return res.json(401);
      }

      console.log(response[0]);

      if (response[0] && response[0].email != null) {
        console.log("Email Already Exists");
        return res.status(401).send("Email Already Exists");
      }
      bcrypt.hash(password, SALTROUND, (err, hash) => {
        if (err) {
          console.log("error in hashing: ", err);
          return res.sendStatus(501);
        }

        // let sql =
        // inset all the data into the table got from the register
        Connection.query(
          "insert into user values(?,?,?,?,?,?,?,?)",
          [uuid, username, hash, email, pubgid, balance, level, xp],
          (error2, result) => {
            if (error2) {
              console.log("mysql error : ", error2);
              return res.sendStatus(501);
            }
            console.log(result);

            // For Affiliate

            const Reward = 20;
            const TotalLoginWith = 0;
            const IsUsedPromo = false;

            Connection.query(
              "insert into affiliate values(?,?,?,?,?,?)",
              [uuid, null, Reward, TotalLoginWith, IsUsedPromo, null],
              (error3, result2) => {
                if (error3) {
                  console.log("mysql error : ", error3);
                  return res.sendStatus(501);
                }
              }
            );
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
      // console.log(response[0].uuid);
      // console.log(password, response[0].password);
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

        // res.send(response[0].uuid);

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

app.get("/getuuid/:email", (req, res) => {
  const email = req.params.email;
  // res.send(email);

  const sqlQuery = `select uuid from user where email = ${Connection.escape(
    email
  )}`;
  Connection.query(sqlQuery, async (error, response) => {
    if (error) {
      console.log("mysql error: ", error);
      return res.sendStatus(501);
    }
    // console.log(response[0].uuid);
    res.send(response[0].uuid);
  });
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

// To Get Cookies
function parseCookies(req, res, next) {
  var list = {},
    rc = req.headers.cookie;

  console.log(rc);

  rc &&
    rc.split(";").forEach(function (cookie) {
      var parts = cookie.split("=");
      list[parts.shift().trim()] = decodeURI(parts.join("="));
    });

  res.foundlist = list;
  next();
}

app.get("/userdata", parseCookies, (req, res) => {
  // var cookies = parseCookies(req);

  // console.log(cookies);
  console.log(res.foundlist);

  const refreshToken = res.foundlist.refreshtoken;

  console.log(refreshToken);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN, (err2, value) => {
    if (err2) {
      console.log("error:", err2.message);
      return res.status(401).send(err2.message);
    }
    console.log("value: ", value);

    const uuid = value.uuid;
    // check for the password agaist databse
    const sqlQuery = `select username,email,uuid,balance,level,xp,pubgid from user where uuid = ${Connection.escape(
      uuid
    )}`;
    Connection.query(sqlQuery, async (error, response) => {
      if (error) {
        console.log("mysql error: ", error);
        return res.sendStatus(501);
      }
      console.log(response);
      res.send(response[0]);
    });
  });
});

app.put("/edit/:id", (req, res) => {
  const paramuuid = req.params.id;
  // console.log(paramuuid);
  const changeEmail = req.body.email;
  const changeName = req.body.username;
  // const changeEmail = req.body.email;

  Connection.query(
    `select email from user where email=${Connection.escape(changeEmail)}`,
    (error, response) => {
      if (error) {
        return res.json(401);
      }

      if (response[0] && response[0].email != null) {
        console.log("Email Already Exists");
        return res.status(401).send("Email Already Exists");
      }

      const sqlQuery = `update user set ${
        changeEmail ? `email="${changeEmail}"` : ""
      } ${changeName && changeEmail ? "," : ""} ${
        changeName ? `username="${changeName}"` : ""
      } where uuid = ${Connection.escape(paramuuid)}`;

      Connection.query(sqlQuery, async (error1, response1) => {
        if (error1) {
          console.log("mysql error: ", error1);
          return res.sendStatus(501);
        }
        console.log("OK");
        res.send("Good");
      });
    }
  );
});

app.post("/useReff", (req, res) => {
  const { uuid, loginWith } = req.body;

  console.log(loginWith);
  Connection.query(
    `select code,reward,uuid,totalLoginWith from affiliate where code=${Connection.escape(
      loginWith
    )}`,
    (error, response) => {
      if (error) {
        console.log(error);
        return res.json(401);
      }

      console.log(response[0]);
      if (response.length > 0) {
        Connection.query(
          `select isUsedPromo from affiliate where uuid=${Connection.escape(
            uuid
          )}`,
          (error1, response1) => {
            if (error1) {
              console.log(error1.message);
              return res.json(401);
            }

            if (response1.length > 0) {
              if (response1[0].isUsedPromo == "True") {
                res.status(401).send("Already Redeemed Code");
              } else {
                const sqlQuery = `update affiliate set isUsedPromo="True", isLoggedWith="${loginWith}" where uuid = ${Connection.escape(
                  uuid
                )}`;

                Connection.query(sqlQuery, async (error2, response2) => {
                  if (error2) {
                    console.log("mysql error: ", error2);
                    return res.sendStatus(501);
                  }

                  // Axios To Chnage Balance

                  const senderUUID = response[0].uuid;

                  Connection.query(
                    `update affiliate set totalLoginWith="${
                      parseInt(response[0].totalLoginWith) + 1
                    }" where uuid=${Connection.escape(senderUUID)}`,
                    (error3, response3) => {
                      if (error3) {
                        console.log(error3);
                        return res.json(401);
                      }

                      Axios.post(
                        `http://localhost:5000/changeBalance/${uuid}`,
                        {
                          reward: response[0].reward,
                        }
                      )
                        .then((res) => console.log(res.data))
                        .catch((err) => console.log(err));

                      Axios.post(
                        `http://localhost:5000/changeBalance/${senderUUID}`,
                        {
                          reward: response[0].reward,
                        }
                      )
                        .then((res) => console.log(res.data))
                        .catch((err) => console.log(err));

                      res.send("All Good").status(200);
                    }
                  );
                });
              }
            } else {
              console.log("No User Found");
              res.status(401).send("No User Found");
            }
            // console.log(response1[0]);
          }
        );
      } else {
        console.log("Invalid Code");
        return res.status(401).send("Invalid Code");
      }
      // if (response[0] && response[0].code == null) {
      // console.log("Invalid Code");
      // return res.status(401).send("Invalid Code");
      // }
    }
  );
});

app.post("/changeBalance/:uuid", (req, res) => {
  const uuid = req.params.uuid;
  const { reward } = req.body;

  Connection.query(
    `select balance from user where uuid=${Connection.escape(uuid)}`,
    (error, response) => {
      if (error) {
        console.log(error);
        return res.json(401);
      }

      console.log(response[0]);
      const sqlQuery1 = `update user set balance="${
        parseInt(response[0].balance) + parseInt(reward)
      }" where uuid = ${Connection.escape(uuid)}`;

      Connection.query(sqlQuery1, async (error3, response3) => {
        if (error3) {
          console.log("mysql error: ", error3);
          return res.sendStatus(501);
        }
        res.status(200).send("Balance Changed");
      });
    }
  );
});

app.post("/createReff/:uuid", (req, res) => {
  const uuid = req.params.uuid;
  const { code } = req.body;

  Connection.query(
    `select code from affiliate where code=${Connection.escape(code)}`,
    (error, response) => {
      if (error) {
        console.log(error);
        return res.json(401);
      }

      if (response[0] && response[0].code != null) {
        console.log("Code Already Taken");
        return res.send("Code Already Taken").status(401);
      }

      Connection.query(
        `update affiliate set code="${code}" where uuid=${Connection.escape(
          uuid
        )}`,
        (error1, response1) => {
          if (error1) {
            console.log(code);
            console.log(error1);
            return res.json(401);
          }

          res.send("Code Set").status(200);
        }
      );
    }
  );
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
