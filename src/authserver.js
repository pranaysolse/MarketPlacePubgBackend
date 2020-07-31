const redis = require("redis");
// const bcrypt = require('bcrypt');

// console.log(corsConfig.config);
require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");

// const fetch = require("node-fetch");
// const axios = require("axios");

const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
// const Cookie = require('js-cookie');
const corsConfig = require("../configs/corsConfig");
const { default: Axios } = require("axios");

// const SALTROUND = 10;
app.use(cookieParser());
// const cors_option = {
//   origin: true,
//   credentials: true,
// };
// var bodyParser = require('body-parser');
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded());
// // in latest body-parser use like below.
// app.use(bodyParser.urlencoded({ extended: true }));

// redi to store the refresh tokens

const port = 6379;
const redisClient = redis.createClient(port, "localhost");
redisClient.on("error", (error) => {
  console.log(error);
});

redisClient.on("connect", () => {
  console.log("connected");
});

app.use(express.json());
app.use(cors(corsConfig.config));
// let refreshTokenArray =[]
function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "60s" });
}
// login token

app.post("/login", async (req, res) => {
  const { email } = req.body;
  const { password } = req.body;

  // fetch(`http://localhost:5000/getuuid/${email}`, {
  //   method: "GET",
  // }).then((res) => console.log(res));

  const uuidRes = await Axios.get(`http://localhost:5000/getuuid/${email}`);

  const uuid = uuidRes.data;

  const user = { uuid };
  const token = generateAccessToken(user);
  const access_token = jwt.sign(user, process.env.ACCESS_TOKEN);

  redisClient.set(access_token, uuid, redis.print);

  // refreshTokenArray.push(refreshToken);

  res
    .cookie("__access_token", access_token, {
      //  httpOnly:true
    })
    .send({ code: 200, msg: "Login Success" });
});

// login logout
app.delete("/logout", (req, res) => {
  const refreshToken = req.cookies.refreshtoken;
  console.log("refreshToken: ", refreshToken);
  // write validation logic herer

  // let refreshToken = req.headers['authorization'].split(' ')[1]
  // console.log("refreshtoken:",refreshToken)
  // if(refreshToken==null){
  //     return res.sendStatus(403);
  // }
  // check if cookie exist here please

  // promisify this and then wait for redis server reply and then preoicess next step
  redisClient.get(refreshToken, (error, reply) => {
    // const t = error;
    // const s = reply;
    if (error) {
      console.log(error);
      return res.sendStatus(401);
    }
    if (reply == null) {
      console.log("401: unautorized");
      return res.sendStatus(401);
    }
    if (reply) {
      console.log("reply: ", reply);
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN, (err) => {
        if (err) {
          console.log(err);
          return res.sendStatus(401);
        }
        // console.log(refreshTokenArray)

        redisClient.del(refreshToken, (error2, value) => {
          if (error2) console.log("error:", error2);
          if (value === 1) {
            console.log("value:", value);
            console.log("deleted");
            return res.sendStatus(200);
          }
          if (value === 0) {
            console.log("forbidden");
            return res.sendStatus(403);
          }
          return null;
        });
        return null;
      });
    }
    return null;
  });
});

// refresh token
app.post("/refresh", async (req, res) => {
  console.log(req.body);
  console.log(req);
  console.log("cookies: ", req.cookies);

  // let refreshToken = req.headers['authorization'].split(' ')[1]
  // if(refreshToken==null){
  //     return res.sendStatus(403)
  // }
  // console.log("before");

  // redisClient.get(refreshToken,(element)=>{
  // console.log(element);
  // console.log("redis: deleted from redis")
  // if (element==null){return res.sendStatus(401)}
  // })

  // if(!(refreshTokenArray.includes(refreshToken))){
  //     return res.sendStatus(401)

  // }
  const refreshToken = req.cookies.refreshtoken;
  redisClient.get(refreshToken, (error, response) => {
    if (error) {
      return res.sendStatus(401);
    }
    if (response == null) {
      return res.sendStatus(401);
    }
    console.log("response: ", response);
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN, (err2, value) => {
      if (err2) {
        console.log("error:", err2);
        return res.sendStatus(401);
      }
      console.log("value: ", value);
      return res.json({
        newToken: generateAccessToken({ name: value.name }),
      });
    });
    return null;
  });
});

app.listen(4000, () => console.log("listening on 4000"));
