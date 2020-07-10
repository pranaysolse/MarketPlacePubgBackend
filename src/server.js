const cors = require("cors");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { default: Axios } = require("axios");

let rp = require("request-promise");

const CookieJar = rp.jar();
rp = rp.defaults({ jar: CookieJar });

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const config = require("../configs/MysqlConfig");
require("dotenv").config({ path: "./configs/.env" });
const corsConfig = require("../configs/corsConfig");
const { stringify } = require("querystring");
const { urlencoded } = require("body-parser");

console.log(config);
const SALTROUND = 10;
app.use(express.json());
app.use(cors(corsConfig.config));
const Connection = mysql.createConnection(config.Config);
Connection.connect();

const axioConfig = {
  withCredentials: true,
};

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

app.get("/onpageload", GetMidasCookie, (req, res) => {
  const data = {
    uuid: uuidv4(),
    host: "https://pubgtornado.com",
  };

  const ctoken = res.csrf;

  const refresh_token = jwt.sign(data, process.env.REFRESH_TOKEN, {
    expiresIn: "5m",
  });
  console.log(refresh_token);
  res
    .cookie("__refresh_token", refresh_token)
    .cookie("__ctoken", ctoken)
    .send("Set Refresh,Ctoken Token");
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
  const { pubgid } = req.body;
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
          `select pubgid from user where pubgid=${Connection.escape(pubgid)}`,
          (error1, response1) => {
            if (error1) {
              return res.json(401);
            }

            console.log(response1[0]);

            if (response1[0] && response1[0].pubgid != null) {
              console.log("PubgId Already Exists");
              return res
                .send({ code: 401, msg: "Pubg ID Already Taken" })
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
            console.log(response);

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

                // axios stuff
                // fetch heere
                console.log(
                  "axios will take response from authserver: logging response: ",
                  response[0].uuid,
                  response[0].password
                );
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

async function GetMidasCookie(req, res, next) {
  const result = await rp.get("https://www.midasbuy.com/midasbuy/in/buy/pubgm");

  const Cookies = CookieJar.getCookieString(
    "https://www.midasbuy.com/midasbuy/in/buy/pubgm"
  );

  const SpilltedCookie = Cookies.split("csrf=");

  res.csrf = SpilltedCookie[1];
  // console.log(res.Cookie);
  next();
}

app.get("/getpubgname/:pubgid", parseCookies, async (req, res) => {
  // const Cookies = GetMidasCookie();
  // console.log(res.Cookie);

  const pubgid = req.params.pubgid;

  const ctoken = res.Cookies.__ctoken;

  // console.log(ctoken);

  try {
    const Resp = await Axios.get(
      `https://www.midasbuy.com/interface/getCharac?ctoken=${ctoken}&appid=1450015065&currency_type=INR&country=IN&midasbuyArea=SouthAsia&sc=&from=&task_token=&pf=mds_hkweb_pc-v2-android-midasweb-midasbuy&zoneid=1&_id=0.7596290802339253&shopcode=midasbuy&cgi_extend=&buyType=save&openid=${pubgid}`,
      axioConfig
    );

    const ret = Resp.data.ret;

    if (ret == 2002) {
      const usefullData = {
        ret: ret,
        msg: "Invalid ID",
      };
      res.send(usefullData);
    } else {
      const decoded = decodeURIComponent(Resp.data.info.charac_name);
      const username = decoded;
      const haveRoyalPass = Resp.data.info.pass_is_buy;

      const usefullData = {
        ret,
        username,
        haveRoyalPass,
      };

      // console.log(username);
      res.send(usefullData);
    }
  } catch {
    console.log("Failed To Fetch");

    const usefullData = {
      ret: 2002,
      msg: "Failed To Fetch",
    };
    res.send(usefullData);
  }
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
                res.send("Already Redeemed Code").status(401);
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
              res.send("No User Found").status(401);
            }
            // console.log(response1[0]);
          }
        );
      } else {
        console.log("Invalid Code");
        return res.send("Invalid Code").status(401);
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
