# Info

Slackbot that enter to each channel and monitor engagement.

It's experiment for monitor who work on what now?

Example: https://wwown.fly.dev/

---

## Setup env
`cp .env.example .env`
`vim .env`

## Development
0. Build
`yarn build`

1. Create DB
`yarn run migrations`

2. Run APP
`yarn run start`

## Slack manifest
```yaml
display_information:
  name: wwown
features:
  bot_user:
    display_name: wwown
    always_online: false
oauth_config:
  scopes:
    bot:
      - channels:history
      - channels:join
      - channels:read
      - chat:write
      - groups:history
      - groups:read
      - im:history
      - mpim:history
      - reactions:read
      - users:read
settings:
  event_subscriptions:
    bot_events:
      - channel_archive
      - channel_created
      - channel_id_changed
      - channel_left
      - channel_rename
      - channel_unarchive
      - group_archive
      - group_deleted
      - group_left
      - group_rename
      - group_unarchive
      - message.channels
      - message.groups
      - message.im
      - message.mpim
      - reaction_added
      - reaction_removed
  interactivity:
    is_enabled: true
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

## Required tokens:
 - Signing Secret
 - App Token with "connection:write" scope (starts with: xapp-)
 - Bot Token - after add to workspace you will get it (starts with: xoxb-)
 
## Deployment via fly.io
1. FlyIO Secrets
```sh
  fly secrets set SLACK_BOT_TOKEN="xoxb-xxx"
  fly secrets set SLACK_SIGNING_SECRET="xxx"
  fly secrets set SLACK_APP_TOKEN="xapp-1-xxx"
```

2. FlyIO Deploy
```sh
  fly deploy
```