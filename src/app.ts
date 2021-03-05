// Import configs
require("dotenv").config();

// Temporary configs
const botToken = process.env.BOT_TOKEN || "";
const appURI = process.env.APP_URL || "";
const port = process.env.PORT || 8080;
const webhookPath = process.env.WEBHOOK_PATH;
const adminID = process.env.ADMIN_ID;

// Field names
const messageField = process.env.MESSAGE_FIELD || "message";
const nameField = process.env.NAME_FIELD || "username";
const fakeField = process.env.UNREAL_FIELD || "name";

// Import koa
import * as path from "path";
import * as Koa from "koa";
import * as mkdirp from "mkdirp";
import * as cors from "@koa/cors";
import * as Router from "koa-router";
import * as fs from "fs-extra";
import Telegraf from "telegraf";

const Message = require("./message");
const Error = require("./ErrorList");

import * as BodyParser from "koa-body";
import { File } from "formidable";

import * as i18n from "i18n";

let locales = ["en", "ru"];

i18n.configure({
  locales: locales,
  defaultLocale: "en",
  directory: path.join(__dirname, "..", "/locales"),
});

const bodyParser = BodyParser({
  multipart: true,
  formidable: {
    uploadDir: path.join(__dirname, "..", process.env.TEMP_DIR || "tmp"),
    keepExtensions: true,
    multiples: true,
  },
  formLimit: "50mb",
  urlencoded: true,
});

//Make dir if not exists
mkdirp(path.join(__dirname, "..", process.env.TEMP_DIR || "tmp"));

var app = new Koa();
app.use(cors());

// Handle errors
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.message;
    ctx.app.emit("error", err, ctx);
  }
});

// Locale
app.use(async (ctx, next) => {
  let locale = ctx.acceptsLanguages(locales);

  if (locale) ctx.locale = <string>locale;
  await next();
});

app.use(bodyParser);

// Set up telegraf
const bot = new Telegraf(botToken);
bot.start((ctx) => {
  ctx.from.language_code;
  ctx.reply(
    i18n.__(
      {
        phrase: "Feedback bot!\nYour ID is %s\nYour Chat ID %s",
        locale: ctx.from.language_code,
      },
      ctx.from.id.toString(),
      ctx.chat.id.toString()
    )
  );
});
bot.help((ctx) =>
  ctx.reply(
    i18n.__({ phrase: "Send me a sticker", locale: ctx.from.language_code })
  )
);

bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.help((ctx)=> {
  ctx.reply(`This is a private telegram bot, your id is ${ctx.message.from.id}`);
});
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

var router = new Router();

// Receive feedback
router.post("/", receiveFeedback);
router.post("/api", receiveFeedback);
async function receiveFeedback(
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>> & {
    locale: string;
  },
  next: Koa.Next
) {
  let data = ctx.request.body;

  // Field mapping (spam bot protection)
  let messageInfo = {
    name: data[nameField],
    message: data[messageField],
    fake: data[fakeField],
  };

  // Fake data entered, so no way we add it
  if (messageInfo.fake !== "") {
    ctx.status = 200;
    // TODO: Sleep for a while
    ctx.body = i18n.__({
      phrase: "The message is sent successfully",
      locale: ctx.locale,
    });
    console.log(`Spam blocked`);
    console.log(ctx.request.ip);
    console.log(messageInfo);
    return;
  }

  if (!(messageInfo.name && messageInfo.message))
    return ctx.throw(403, i18n.__("No message or name"));

  // Send a message to the client
  try {
    // Send the message
    await bot.telegram.sendMessage(
      adminID,
      Message.generateMessage(messageInfo.name, messageInfo.message),
      {
        parse_mode: "Markdown",
      }
    );

    // Files handling
    // check if the user sent us a file
    if (ctx.request.files && ctx.request.files.file) {
      let files: File[];

      // Transform to array
      files = Array.isArray(ctx.request.files.file)
        ? ctx.request.files.file
        : [ctx.request.files.file];

      let promises = files.map(async (file) => {
        if (file.name) {
          await bot.telegram.sendDocument(adminID, {
            source: fs.createReadStream(file.path),
            filename: file.name,
          });
          await fs.unlink(file.path);
        }
      });

      await Promise.all(promises);
    }
    ctx.status = 200;
    ctx.body = i18n.__({
      phrase: "The message is sent successfully",
      locale: ctx.locale,
    });
  } catch (err) {
    ctx.type = "json";
    ctx.body = JSON.stringify({
      type: "error",
      text:
        process.env.NODE_ENV === "development"
          ? JSON.stringify(err)
          : Error.getErrorMessage(err.code),
    });
    ctx.status = 500;
  }
}

// Handle bot messages
router.post("/" + webhookPath, async (ctx, next) => {
  //@ts-ignore
  await bot.handleUpdate(ctx.request.body, ctx.response);
  ctx.status = 200;
});

bot.launch();

// Set webhook if you don't need anything else
if (appURI !== "") {
  console.log(`Setting webhook with address ${appURI + webhookPath}`);
  bot.telegram.setWebhook(appURI + webhookPath);
}

app.use(router.routes()).use(router.allowedMethods()).listen(port);

console.log(`App is listening on port ${port}`);
