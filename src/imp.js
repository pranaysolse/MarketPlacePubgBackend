// Steam Part

passport.use(
  new SteamStrategy(
    {
      returnURL: "http://localhost:5000/auth/steam/return",
      realm: "http://localhost:5000/",
      apiKey: process.env.SteamApiKey,
    },
    (identifier, profile, done) => {
      return done(null, profile);
    }
  )
);

app.use(
  session({
    key: "session_id",
    secret: "Ritik",
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 259200000,
    },
  })
);

passport.serializeUser((user, done) => {
  done(null, user._json);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.use(passport.initialize());
app.use(passport.session());

app.get("/auth/steam/", passport.authenticate("steam"));

app.get(
  "/auth/steam/return",
  passport.authenticate("steam"),
  parseCookies,
  function (req, res) {
    // Successful authentication, redirect home.

    const access_token = res.Cookies.__access_token;

    jwt.verify(access_token, process.env.ACCESS_TOKEN, (err, value) => {
      if (err) {
        console.log("error:", err.message);
        return res.send({ code: 401, msg: "Unauthorized" }).status(401);
      } else {
        // console.log(value);
        // console.log(req.user._json);
        try {
          const uuid = value.uuid;
          const {
            steamid,
            personaname,
            profileurl,
            avatar,
            avatarmedium,
            avatarfull,
            avatarhash,
            realname,
            loccountrycode,
          } = req.user._json;

          // Checking For Already Logged In Or Not
          Connection.query(
            `select steamLogin,username from user where uuid=${Connection.escape(
              uuid
            )}`,
            (error, response) => {
              if (error) {
                return res.json(401);
              }
              if (response.length > 0) {
                // console.log(response);

                if (response[0].steamLogin === 0) {
                  const username = response[0].username;

                  Connection.query(
                    `insert into steaminfo values(?,?,?,?,?,?,?,?,?,?,?)`,
                    [
                      steamid,
                      personaname,
                      profileurl,
                      avatar,
                      avatarmedium,
                      avatarfull,
                      avatarhash,
                      realname,
                      loccountrycode,
                      uuid,
                      username,
                    ],
                    (error1, response1) => {
                      if (error1) {
                        return res.json(401);
                      }
                      Connection.query(
                        `update user set steamLogin = 1 where uuid=${Connection.escape(
                          uuid
                        )}`,
                        (error3, response3) => {
                          if (error3) {
                            return res.json(401);
                          }
                          res.redirect(
                            "http://localhost:3000/Home/Deposit/Steam"
                          );
                        }
                      );
                    }
                  );
                } else {
                  console.log(response);
                  res.send({ code: 401, msg: "Already Logged In" });
                }
              } else {
                res.send({ code: 401, msg: "Unauthorized" });
              }
            }
          );
        } catch (err2) {
          console.log(err2);
        }
      }
    });
  }
);

app.get("/getinventory", (req, res) => {
  const appid = 730;
  const steamid = "76561198354692664";
});

app.get("/checkSteam", parseCookies, (req, res) => {
  const access_token = res.Cookies.__access_token;

  jwt.verify(access_token, process.env.ACCESS_TOKEN, (err, value) => {
    if (err) {
      console.log("error:", err.message);
      return res.send({ code: 401, msg: "Unauthorized" }).status(401);
    } else {
      // Check For Login
      try {
        const uuid = value.uuid;
        Connection.query(
          `select steamLogin from user where uuid=${Connection.escape(uuid)}`,
          (error, response) => {
            if (error) {
              return res.json(401);
            }
            if (response.length > 0) {
              // console.log(response);

              if (response[0].steamLogin === 0) {
                res.send({ code: 200, msg: "Steam Not Logged In", islogin: 0 });
              } else {
                Connection.query(
                  `select * from steaminfo where uuid=${Connection.escape(
                    uuid
                  )}`,
                  (error1, response1) => {
                    if (error1) {
                      return res.json(401);
                    }
                    if (response1.length > 0) {
                      // console.log(response);
                      res.send({
                        code: 200,
                        msg: "Steam Logged In",
                        islogin: 1,
                        steamDatas: response1[0],
                      });
                    }
                  }
                );
              }
            }
          }
        );
      } catch (err) {
        console.log(err);
      }
    }
  });
});

// MidasBuy Cookie Theft

async function GetMidasCookie(req, res, next) {
  try {
    const result = await rp.get(
      "https://www.midasbuy.com/midasbuy/ot/buy/pubgm"
    );

    const Cookies = CookieJar.getCookieString(
      "https://www.midasbuy.com/midasbuy/ot/buy/pubgm"
    );

    const SpilltedCookie = Cookies.split("csrf=");

    res.csrf = SpilltedCookie[1];
    console.log("Cookies ",res.Cookie);
    next();
  } catch (err) {
    console.log(err);
  }
}

app.get("/onpageload2", GetMidasCookie, (req, res) => {
  const ctoken = res.csrf;
  // console.log(refresh_token);
  res.cookie("__ctoken", ctoken).send("Ctoken Token");
});

// Get Pubg Name By ID

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
  
      if (ret === 2002) {
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