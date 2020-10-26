const cors = require("cors");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { default: Axios } = require("axios");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const session = require("express-session");

let rp = require("request-promise");

const CookieJar = rp.jar();
rp = rp.defaults({ jar: CookieJar });

const app = express();
const Router = express.Router();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const config = require("../configs/MysqlConfig");
require("dotenv").config({ path: "./.env" });
const corsConfig = require("../configs/corsConfig");
const { stringify } = require("querystring");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// console.log(config);
const SALTROUND = 10;
app.use(express.json());
app.use(cors(corsConfig.config));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const Connection = mysql.createConnection(config.Config);
Connection.connect();

const axioConfig = {
  withCredentials: true,
};

// Socket Part

const RollData = () => {
  const clientSeed = uuidv4();
  const serverSeed = uuidv4();
  // const nonce = uuidv4();
  const nonce = Math.floor(Math.random() * (100000 - 1 + 1) + 1);

  // Here we use the seeds to calculate the spin (a number ranging from 0 to 14)
  const roll = getRollSpin(serverSeed, clientSeed, nonce);
  // const roll = getRollSpin(serverSeed, clientSeed);
  const rollColour = getRollColour(roll);

  /* Below this line are algorithmic functions which we use to calculate the Spin
==================================================================================
==================================================================================
*/

  function getRollSpinFromHash(hash) {
    const subHash = hash.substr(0, 8);

    const spinNumber = parseInt(subHash, 16);

    return Math.abs(spinNumber) % 15;
  }

  function getRollSpin(serverSeed, clientSeed, nonce) {
    const seed = getCombinedSeed(serverSeed, clientSeed, nonce);
    const hash = crypto.createHmac("sha256", seed).digest("hex");

    return getRollSpinFromHash(hash);
  }

  function getCombinedSeed(serverSeed, clientSeed, nonce) {
    return [serverSeed, clientSeed, nonce].join("-");
  }

  function getRollColour(roll) {
    if (roll === 0) {
      return "Green";
    }
    if (roll <= 7 && roll >= 1) {
      return "Red";
    }
    return "Black";
  }
  const RollData = {
    color: rollColour,
    spinvalue: roll,
    clientseed: clientSeed,
    serverSeed: serverSeed,
    nonce: nonce,
    rolling: false,
  };
  io.emit("roll-data", { rolling: true });
  setTimeout(() => io.emit("roll-data", RollData), 5000);
};

const CrashData = () => {
  var uuid = uuidv4();
  var gameHash = crypto.createHmac("sha256", uuid).digest("hex");
  // var gameHash = "9b9b8b82aed2ff2e5fa4ce56b0f68bdb0f0bef9d5b65e966fb0242f4b41d0b6a";
  /* 
Below this line is the formula which we use to calculate the result
*/

  const INSTANT_CRASH_PERCENTAGE = 10;
  var crashPointFromHash = function (serverSeed) {
    var hash = crypto.createHmac("sha256", serverSeed).digest("hex");

    // Use the most significant 52-bit from the hash to calculate the crash point
    var h = parseInt(hash.slice(0, 52 / 4), 16);

    var e = Math.pow(2, 52);

    const result = (100 * e - h) / (e - h);

    // INSTANT_CRASH_PERCENTAGE of 6.66 will result in modifier of 0.934 = 6.66% house edge with a lowest crashpoint of 1.00x
    const houseEdgeModifier = 1 - INSTANT_CRASH_PERCENTAGE / 100;

    const endResult = Math.max(100, result * houseEdgeModifier);

    return Math.floor(endResult);
  };

  const CrashValue = (crashPointFromHash(gameHash) / 100).toFixed(2);

  const CrashData = {
    crash: CrashValue,
    hash: gameHash,
  };
  io.emit("crash-data", CrashData);
};

setInterval(RollData, 10000);
setInterval(CrashData, 10000);

io.on("connection", (socket) => {
  // console.log(socket.id);
  // console.log("user Connected");

  socket.on("SEND_MESSAGE", function (data) {
    // console.log(data);
    io.emit("RECEIVE_MESSAGE", data);
  });

  socket.on("roll-bet", (rolldata) => {
    console.log(rolldata);
  });
});

// Main Part

// To Get Cookies
function parseCookies(req, res, next) {
  var list = {},
    rc = req.headers.cookie;

  rc &&
    rc.split(";").forEach(function (cookie) {
      var parts = cookie.split("=");
      list[parts.shift().trim()] = decodeURI(parts.join("="));
    });

  res.Cookies = list;
  // console.log(list);
  next();
}

app.get("/verifyLogin", parseCookies, (req, res) => {
  const access_token = res.Cookies.__access_token;

  jwt.verify(access_token, process.env.ACCESS_TOKEN, (err2, value) => {
    if (err2) {
      console.log("error:", err2.message);
      return res.send({ code: 401, msg: "Unauthorized" }).status(401);
    } else {
      res.send({ code: 200, msg: "Success Login" });
    }
  });
});

app.get("/onpageload", (req, res) => {
  const data = {
    uuid: uuidv4(),
    host: "https://pubgtornado.com",
  };

  const refresh_token = jwt.sign(data, process.env.REFRESH_TOKEN, {
    expiresIn: "5m",
  });
  // console.log(refresh_token);
  res.cookie("__refresh_token", refresh_token).send("Set Refresh");
});

app.post("/register", parseCookies, (req, res) => {
  // make middleware for this stuff like crearing the required
  // uuid storing the password in the database
  // validate if user is real aka two step authenticatipons and stuff

  const refresh_token = res.Cookies.__refresh_token;

  console.log(refresh_token);

  const { username } = req.body;
  const { password } = req.body;
  const { email } = req.body;
  const balance = 0;
  const level = 0;
  const xp = 0;
  const uuid = uuidv4();

  jwt.verify(refresh_token, process.env.REFRESH_TOKEN, (err2, value) => {
    if (err2) {
      console.log("error:", err2.message);
      return res.send({ code: 401, msg: "Try Refreshing Page" }).status(401);
    }
    Connection.query(
      `select email from user where email=${Connection.escape(email)}`,
      (error, response) => {
        if (error) {
          return res.json(401);
        }

        console.log(response[0]);

        if (response[0] && response[0].email != null) {
          console.log("Email Already Exists");
          return res
            .send({ code: 401, msg: "Email Already Exists" })
            .status(401);
        }

        Connection.query(
          `select username from user where username=${Connection.escape(
            username
          )}`,
          (error1, response1) => {
            if (error1) {
              return res.json(401);
            }

            console.log(response1[0]);

            if (response1[0] && response1[0].username != null) {
              console.log("Username Already Exists");
              return res
                .send({ code: 401, msg: "Username Already Taken" })
                .status(401);
            }

            bcrypt.hash(password, SALTROUND, (err, hash) => {
              if (err) {
                console.log("error in hashing: ", err);
                return res.sendStatus(501);
              }

              // let sql =
              // inset all the data into the table got from the register
              Connection.query(
                "insert into user values(?,?,?,?,?,?,?)",
                [uuid, username, hash, email, balance, level, xp],
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
                  return res
                    .status(200)
                    .send({ code: 200, msg: "SuccesFully Created User" });
                }
              );
              return null;
            });
            return null;
          }
        );
      }
    );
  });
});

app.get("/verifyMail", async (req, res) => {
  // create reusable transporter object using the default SMTP transport

  console.log(process.env.EmailId, process.env.Password);
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.EmailId,
      pass: process.env.Password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  let MailOptions = {
    from: '"PUBG Team" <pubgtornadoteam@gmail.com>', // sender address
    to: "johelob923@sekris.com", // list of receivers
    subject: "Hello", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  };

  // send mail with defined transport object
  transporter.sendMail(MailOptions, function (err, data) {
    if (err) {
      console.log(err.message);
    } else {
      res.send("Mail Sent!");
    }
  });
});

app.post("/login", parseCookies, (req, res) => {
  const { email } = req.body;
  const { password } = req.body;
  // console.log(password);
  // check for the password agaist databse

  const refresh_token = res.Cookies.__refresh_token;

  jwt.verify(refresh_token, process.env.REFRESH_TOKEN, (err2, value) => {
    if (err2) {
      console.log("error:", err2.message);
      return res.send({ code: 401, msg: "Try Refreshing Page" }).status(401);
    }
    Connection.query(
      `select email from user where email=${Connection.escape(email)}`,
      (error1, response1) => {
        if (error1) {
          return res.json(401);
        }

        if (response1.length > 0) {
          const sqlQuery = `select uuid,password from user where email = ${Connection.escape(
            email
          )}`;
          Connection.query(sqlQuery, async (error, response) => {
            if (error) {
              console.log("mysql error: ", error);
              return res.sendStatus(501);
            }
            // console.log(response);

            // console.log(response);
            // validate response
            if (response) {
              // console.log(response[0].uuid);
              // console.log(password, response[0].password);
              const validator = await bcrypt.compare(
                password,
                response[0].password
              );

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
                res.send({ code: 401, msg: "Password Not Match" }).status(401);
                console.log("password not match");
              } else {
                console.log("redirecting to authserver");

                // res.send(response[0].uuid);

                res.redirect(307, "http://localhost:4000/login");

                // res.send("passmatch");
              }
            } else {
              res.send({ code: 401, msg: "Email Not Found" }).status(401);
            }

            // res.json({name:req.body.name,password:req.body.password});
            return null;
          });
        } else {
          console.log("Email Does Not Exists");
          return res
            .send({ code: 401, msg: "Email Does Not Exists" })
            .status(401);
        }
      }
    );
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

app.get("/userdata", parseCookies, (req, res) => {
  // var cookies = parseCookies(req);

  // console.log(cookies);

  const access_token = res.Cookies.__access_token;

  jwt.verify(access_token, process.env.ACCESS_TOKEN, (err2, value) => {
    if (err2) {
      console.log("error:", err2.message);
      return res.send({ code: 401, msg: "Try Refreshing Page" }).status(401);
    }
    // console.log("value: ", value);

    const uuid = value.uuid;
    // check for the password agaist databse
    const sqlQuery = `select username,email,uuid,balance,level,xp from user where uuid = ${Connection.escape(
      uuid
    )}`;
    Connection.query(sqlQuery, async (error, response) => {
      if (error) {
        console.log("mysql error: ", error);
        return res.sendStatus(501);
      }
      // console.log(response);
      const userdata = {
        username: response[0].username,
        email: response[0].email,
        uuid: response[0].uuid,
        balance: response[0].balance,
        level: parseInt(parseInt(response[0].xp) / 1000),
        xp: response[0].xp,
      };

      res.send(userdata);
    });
  });
});

app.put("/edit/:id", (req, res) => {
  const paramuuid = req.params.id;
  // console.log(paramuuid);
  const changeEmail = req.body.email;

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

      // const sqlQuery = `update user set ${
      //   changeEmail ? `email="${changeEmail}"` : ""
      // } ${changeName && changeEmail ? "," : ""} ${
      //   changeName ? `username="${changeName}"` : ""
      // } where uuid = ${Connection.escape(paramuuid)}`;

      const sqlQuery = `update user set email="${changeEmail}" where uuid = ${Connection.escape(
        paramuuid
      )}`;

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

app.post("/useReff", parseCookies, (req, res) => {
  const { loginWith } = req.body;

  console.log(loginWith);
  const access_token = res.Cookies.__access_token;

  console.log(access_token);

  jwt.verify(access_token, process.env.ACCESS_TOKEN, (err, value) => {
    if (err) {
      console.log("error:", err.message);
      return res.send({ code: 401, msg: "Try Refreshing Page" }).status(401);
    }
    console.log("value: ", value);

    const uuid = value.uuid;
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
            `select isUsedPromo,code from affiliate where uuid=${Connection.escape(
              uuid
            )}`,
            (error1, response1) => {
              if (error1) {
                console.log(error1.message);
                return res.json(401);
              }

              if (response1.length > 0) {
                if (response1[0].isUsedPromo == "True") {
                  res
                    .send({ code: 401, msg: "Already Redeemed Code" })
                    .status(401);
                } else {
                  if (response1[0].code == loginWith) {
                    res
                      .send({ code: 401, msg: "Cannot Use Own Code" })
                      .status(401);
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

                          // Change Reciever Balance

                          Connection.query(
                            `select balance from user where uuid=${Connection.escape(
                              uuid
                            )}`,
                            (error4, response4) => {
                              if (error4) {
                                console.log(error4);
                                return res.json(401);
                              }
                              const reward = response[0].reward;

                              console.log(response4[0]);
                              const sqlQuery1 = `update user set balance="${
                                parseInt(response4[0].balance) +
                                parseInt(reward)
                              }" where uuid = ${Connection.escape(uuid)}`;

                              Connection.query(
                                sqlQuery1,
                                async (error5, response5) => {
                                  if (error5) {
                                    console.log("mysql error: ", error5);
                                    return res.sendStatus(501);
                                  }

                                  // Change Sender Balance
                                  Connection.query(
                                    `select balance from user where uuid=${Connection.escape(
                                      senderUUID
                                    )}`,
                                    (error6, response6) => {
                                      if (error6) {
                                        console.log(error6);
                                        return res.json(401);
                                      }

                                      console.log(response6[0]);
                                      const sqlQuery2 = `update user set balance="${
                                        parseInt(response6[0].balance) +
                                        parseInt(reward / 2)
                                      }" where uuid = ${Connection.escape(
                                        senderUUID
                                      )}`;

                                      Connection.query(
                                        sqlQuery2,
                                        async (error7, response7) => {
                                          if (error7) {
                                            console.log(
                                              "mysql error: ",
                                              error7
                                            );
                                            return res.sendStatus(501);
                                          }

                                          res.status(200).send({
                                            code: 200,
                                            msg: "Successfully Redeemed Code",
                                          });
                                        }
                                      );
                                    }
                                  );

                                  // res.status(200).send("Balance Changed");
                                }
                              );
                            }
                          );
                        }
                      );
                    });
                  }
                }
              } else {
                console.log("No User Found");
                res
                  .send({
                    code: 401,
                    msg: "No User Found",
                  })
                  .status(401);
              }
              // console.log(response1[0]);
            }
          );
        } else {
          console.log("Invalid Code");
          return res
            .send({
              code: 401,
              msg: "Invalid Code",
            })
            .status(401);
        }
        // if (response[0] && response[0].code == null) {
        // console.log("Invalid Code");
        // return res.status(401).send("Invalid Code");
        // }
      }
    );
  });
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
        return res
          .send({
            code: 401,
            msg: "Code Already Taken",
          })
          .status(401);
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

          res
            .send({
              code: 200,
              msg: "Code Set",
            })
            .status(200);
        }
      );
    }
  );
});

// app.get("/getjwt", (req, res) => {
//   const data = {
//     "appid": "1450015065",
//     "host": "www.midasbuy.com",
//     "ts": 1594013453393,
//   };
//   const refreshToken = jwt.sign(data, "1450015065");

//   res.send(refreshToken);
// });

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
