require('dotenv').config()

 exports.Config = {
    host:'localhost',
    user:'root',
    password:`${process.env.MYSQL_PASSWORD}`,
    database:'marketplace'
}
