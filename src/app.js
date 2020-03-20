// Import configs
require("dotenv").config()

// Import koa
const path = require("path")
const Koa = require("koa")
const mkdirp = require("mkdirp")
const cors = require("@koa/cors")
const Router = require("koa-router")
const bodyParser = require("koa-body")({
  multipart: true,
  formidable: {
    uploadDir: path.join(__dirname, "..", process.env.TEMP_DIR || "tmp"),
    keepExtensions: true,
    multiples: true,
  },
  formLimit: "50mb",
  urlencoded: true,
})
const fs = require("fs")
const pug = require("pug")
const Message = require("./message.js")
const Error = require("./Errors.js")

//Make dir if not exists
mkdirp(path.join(__dirname, "..", process.env.TEMP_DIR || "tmp"))

// Import telegraf
const Telegraf = require("telegraf")

// Temporary configs
const botToken = process.env.BOT_TOKEN || ""
const appURI = process.env.APP_URL || ""
const port = process.env.PORT || 8080
const webhookPath = process.env.WEBHOOK_PATH
const adminID = process.env.ADMIN_ID

var app = new Koa()
app.use(cors())
app.use(bodyParser)

// Set up telegraf
const bot = new Telegraf(botToken)
bot.start(ctx => {
  ctx.reply(
    "Welcome to my bot!\n Your ID is " + ctx.from.id + "\n Your Chat ID " + ctx.chat.id
  )
})
bot.help(ctx => ctx.reply("Send me a sticker"))
bot.on("sticker", ctx => ctx.reply("👍"))
bot.hears("hi", ctx => ctx.reply("Hey there"))

var router = new Router()

router.get("/", async (ctx, next) => {
  ctx.response.type = "html"
  try {
    ctx.response.body = pug.renderFile("templates/index.pug", {
      cache: process.env.NODE_ENV == "production",
    })
    ctx.status = 200
  } catch (e) {
    ctx.response.body = `<html><body>${JSON.stringify(e)}</body>`
    ctx.status = 500
  }
})

router.post("/", async (ctx, next) => {
  let data = ctx.request.body

  console.log(ctx.request.files)
  // Check if everything is filled out
  if (data.message && data.name) {
    // Send a message to the client
    try {
      // Wait until the message gets sent
      await bot.telegram.sendMessage(
        adminID,
        Message.generateMessage(data.name, data.message),
        {
          parse_mode: "Markdown",
        }
      )

      // check if the user sent us a file
      if (ctx.request.files.file && (ctx.request.files.file.name != "")) {
        await bot.telegram.sendDocument(adminID, {
          source: fs.createReadStream(ctx.request.files.file.path),
          filename: ctx.request.files.file.name,
        })
      }
      ctx.response.type = "html"
      ctx.response.body = pug.renderFile("templates/index.pug", {
        cache: process.env.NODE_ENV == "production",
        message: {
          type: "success",
          text: "Great. Your message has been delivered",
        },
      })
      ctx.status = 200
    } catch (err) {
      try {
        ctx.response.type = "html"
        ctx.response.body = pug.renderFile("templates/index.pug", {
          cache: process.env.NODE_ENV == "production",
          message: {
            type: "error",
            text:
              process.env.NODE_ENV === "development"
                ? JSON.stringify(err)
                : Error.getErrorMessage(err.code),
          },
        })
        ctx.response.status = 500
      } catch (err) {
        ctx.response.type = "html"
        ctx.response.body = `<html><body>${JSON.stringify(err)}</body>`
        ctx.status = 500
      }
    }
  } else {
    ctx.response.type = "html"
    ctx.response.body = pug.renderFile("templates/index.pug", {
      cache: process.env.NODE_ENV == "production",
      message: {
        type: "error",
        text: "No name/message provided",
      },
    })
    ctx.status = 500
  }
})

router.post("/api", async (ctx, next) => {
  let data = ctx.request.body

  console.log(ctx.request.files)
  // Check if everything is filled out
  if (data.message && data.name) {
    // Send a message to the client
    try {
      // Wait until the message gets sent
      await bot.telegram.sendMessage(
        adminID,
        Message.generateMessage(data.name, data.message),
        {
          parse_mode: "Markdown",
        }
      )

      // check if the user sent us a file
      if (ctx.request.files.file && (ctx.request.files.file.name != "")) {
        await bot.telegram.sendDocument(adminID, {
          source: fs.createReadStream(ctx.request.files.file.path),
          filename: ctx.request.files.file.name,
        })
      }
      ctx.response.type = "json"
      ctx.response.body = JSON.stringify({
        type: "success",
      })
      ctx.status = 200
    } catch (err) {
      ctx.response.type = "json"
      ctx.response.body = JSON.stringify({
        type: "error",
        text:
          process.env.NODE_ENV === "development"
            ? JSON.stringify(err)
            : Error.getErrorMessage(err.code),
      })
      ctx.status = 500
    }
  } else {
    ctx.response.type = "json"
    ctx.response.body = JSON.stringify({
      type: "error",
      text: "No name/message provided",
    })
    ctx.status = 500
  }
})

router.post("/" + webhookPath, async (ctx, next) => {
  await bot.handleUpdate(ctx.request.body, ctx.response)
  ctx.status = 200
})

bot.launch()

// Set webhook if you don't need anything else
if (appURI !== "") {
  console.log(`Setting webhook with address ${appURI + webhookPath}`)
  bot.telegram.setWebhook(appURI + webhookPath)
}

app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(
    require("koa-static")("./public", {
      maxAge: 60 * 60 * 24,
      gzip: true,
    })
  )
  .listen(port)

console.log(`App is listening on port ${port}`)
