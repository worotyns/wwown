# Info

Slackbot that enter to each channel and monitor engagement. It's experiment for
monitor who work on what now.

What's cover now?

- global dashboard with activity,
- last active channels, and last user on that channels,
- user specific stats

---

## Setup env

`cp .env.example .env && vim .env`

## Development

0. Build `de build`

1. Create DB `yarn run migrations`

2. Run APP `yarn run start`

## Info

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
      - app_mentions:read
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
      - reactions:write
settings:
  event_subscriptions:
    bot_events:
      - app_mention
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

## License

Licensed under [MIT](LICENSE.md)
