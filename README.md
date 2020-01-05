# Simple Telegram Feedback bot [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/FrozenAlex/TelegramFeedback)

## Enviroment variables

For the app to work first you need to set enviroment variables.
List of possible enviroment variables

```bash
    ADMIN_ID="YourChatID"
    APP_URL="https://app.url"
    BOT_TOKEN="BotTokenFromTelegram"
    WEBHOOK_PATH="whatcomesaftertheslash"
```

Variables APP_URL and WEBHOOK_PATH can be left empty if you don't have a domain name or if you are developing the app.

To develop the app you can place these variables into .env file
