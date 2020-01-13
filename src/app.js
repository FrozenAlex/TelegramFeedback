// Import configs
require('dotenv').config()

// Import koa
const Koa = require('koa')
const cors = require('@koa/cors');
const Router= require('koa-router')
const bodyParser= require('koa-bodyparser')
const fs = require('fs')

// Import telegraf
const Telegraf = require('telegraf') 


// Temporary configs
const botToken = process.env.BOT_TOKEN || ""
const appURI = process.env.APP_URL || "" 
const port = process.env.PORT || 8080
const webhookPath = process.env.WEBHOOK_PATH 
const adminID = process.env.ADMIN_ID 

var app = new Koa();
app.use(cors());
app.use(bodyParser());

// Set up telegraf
const bot = new Telegraf(botToken)
bot.start((ctx) => {
    ctx.reply('Welcome to my bot!\n Your ID is '+ ctx.from.id+'\n Your Chat ID '+ ctx.chat.id)
})
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))


var router = new Router();

router.get('/', async (ctx, next) => {

    ctx.response.type = 'html';
    ctx.response.body = fs.createReadStream('./public/index.html');
    ctx.status = 200
});

router.post('/', async (ctx, next) => {

    if(ctx.request.body.message){
        let currentDate = new Date();
        bot.telegram.sendMessage(adminID, `
${ctx.request.body.message}
${ctx.request.body.name || "Anonimous"} ${(currentDate.toLocaleDateString("ru",
    { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
    ))}/ ${currentDate.toLocaleTimeString("ru")}
        `)
        ctx.response.type = 'html';
        ctx.response.body = fs.createReadStream('./public/index.html');
        ctx.status = 200
    }
    ctx.status = 404
});


router.post('/'+ webhookPath, async (ctx, next) => {
    await bot.handleUpdate(ctx.request.body, ctx.response)
    ctx.status = 200
});


bot.launch()


// Set webhook if you don't need anything else
if (appURI !== "") {
    console.log(`Setting webhook with address ${appURI+webhookPath}`)
    bot.telegram.setWebhook(appURI+webhookPath)
}

// setup
app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(require('koa-static')("./public", {maxAge:60*60*24, gzip: true}))
  .listen(port)

console.log(`App is listening on port ${port}`)

  