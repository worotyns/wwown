# Info

Slackbot that enter to each channel and monitor engagement.
It's experiment for monitor who work on what now?

---

# Development
0. Build
`yarn build`

1. Create DB
`yarn run migrations`

2. Run APP
`yarn run start`

# Deployment 
1. FlyIO Secrets
  fly secrets set SLACK_BOT_TOKEN="xoxb-xxx"
  fly secrets set SLACK_SIGNING_SECRET="xxx"
  fly secrets set SLACK_APP_TOKEN="xapp-1-xxx"
  
2. FlyIO Deploy
  fly deploy