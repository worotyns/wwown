DTOs with logic withotu services :D

```ts
// // Dashboard
// const activity = [
//     {
//         "day": "2022-12-25",
//         "color": "rgb(211, 211, 211)",
//         "incident": false,
//         "title": "2022-12-25: 0 interactions by 0 users on 0 channels"
//     }
// ]

// const last_interactions = [
//     {
//         "channel_id": "C0BE8HYG6",
//         "channel_label": "kocopoly",
//         "users": "Dawid Mędrek|U4BJD5YLX,Kuba|UL6N9GN9J,Mateusz Worotyński|U0BED3WRG,Tomasz Tomczyk|U03UTSBV077",
//         "total_value": 17,
//         "last_activity_at": 1703927347549
//     }, {
//         "channel_id": "CB8LV57ED",
//         "channel_label": "ppg",
//         "users": "Olha Lypnytska|UD3P47KUG,Przemek Cymerkiewicz|U026JP1PPT6,Aleksandra Kozioł|U02H86T77PC,Kuba|UL6N9GN9J,Marcin Pecyna|U02SA386HF0,Mateusz Worotyński|U0BED3WRG,Dawid Mędrek|U4BJD5YLX,Jarosław K.|U0CAK6YRG,Rafał Skotnicki|U02GKNZHS04,Renia|UDXQM8ZKR,Tomasz Tomczyk|U03UTSBV077",
//         "total_value": 34,
//         "last_activity_at": 1703868847047
//     }
// ]

// const channelHourly = [{
//     "hour": "00",
//     "value": 0
// }]

// VIRTUAL OPERATOR FOR THAT SAME AS FOR "TIME TRACKING"
// const incydents = [{
//     "channel_id": "C02C6BFGDB6",
//     "description": "High load - infrastructure problems / rabbitmq",
//     "channel_label": "alerts-critical",
//     "user_id": "U0BED3WRG",
//     "user_label": "Mateusz Worotyński",
//     "start_time": 1697396400000,
//     "end_time": 1697407200000,
//     "total_duration": 10800
// }]

// User

// const karma = [{
//     "user_id": "U0BED3WRG",
//     "user_label": "Mateusz Worotyński",
//     "emoji": "+1",
//     "reaction_count": 30
// }, {
//     "user_id": "U0BED3WRG",
//     "user_label": "Mateusz Worotyński",
//     "emoji": "heart",
//     "reaction_count": 16
// }]

// const daily_interactions = [
//     {
//         "date": "2023-12-30",
//         "user_id": "U0BED3WRG",
//         "user_label": "Mateusz Worotyński",
//         "channels_count": 2,
//         "threads_count": 1,
//         "thread_messages_count": 2,
//         "thread_messages_avg": 2,
//         "channel_messages": 2,
//         "channel_reactions": 0,
//         "channel_messages_avg": 1,
//         "channel_reactions_avg": 0,
//         "activity_hours": 0,
//         "activity_hours_mean": 0.02
//     }
// ]

// const top_channels = [
//     {
//         "channel_label": "it-push-transakcyjne",
//         "user_label": "Mateusz Worotyński",
//         "user_id": "U0BED3WRG",
//         "channel_id": "C05R06QGELT",
//         "total_value": 1427,
//         "last_activity_at": 1697543400173
//     }
// ]

// const last_channels = [
//     {
//         "channel_label": "kocopoly",
//         "channel_id": "C0BE8HYG6",
//         "user_id": "U0BED3WRG",
//         "user_label": "Mateusz Worotyński",
//         "total_value": 180,
//         "last_activity_at": 1703917672449
//     }
// ]

// const user_hourly = "same as dashborad"
// const user_activity = "same as dashborad"

// Channels daily
// const daily_channels_data = [{
//     "date": "2023-12-30",
//     "channel_id": "C0BE8HYG6",
//     "channel_label": "kocopoly",
//     "users_count": 3,
//     "threads_count": 1,
//     "thread_messages_count": 2,
//     "thread_messages_avg_per_user": 2,
//     "channel_messages": 3,
//     "channel_reactions": 0,
//     "channel_messages_avg_per_user": 1,
//     "channel_reactions_avg_per_user": 0,
//     "activity_hours": 2,
//     "activity_hours_avg_per_user": 0.01
// }]

// Channel data
// const ch_karma_givers = [{
//     "channel_id": "C0BE8HYG6",
//     "reacting_user_id": "U019E6FPHEK",
//     "channel_label": "kocopoly",
//     "reacting_user_label": "Mateusz Worotyński",
//     "reaction": "joy",
//     "total": 1
// }]

// const ch_karma_receivers = [{
//     "channel_id": "C0BE8HYG6",
//     "user_id": "U4BJD5YLX",
//     "channel_label": "kocopoly",
//     "user_label": "Dawid Mędrek",
//     "reaction": "+1",
//     "total": 1
// }]

// const ch_channel_daily = [{
//     "date": "2023-12-30",
//     "channel_label": "kocopoly",
//     "users_count": 3,
//     "threads_count": 1,
//     "thread_messages_count": 2,
//     "thread_messages_avg_per_user": 2,
//     "channel_messages": 3,
//     "channel_reactions": 0,
//     "channel_messages_avg_per_user": 1,
//     "channel_reactions_avg_per_user": 0,
//     "activity_hours": 2,
//     "activity_hours_avg_per_user": 0.01
// }]

// const ch_channel_top = [{
//     "user_label": "Dawid Mędrek",
//     "channel_label": "kocopoly",
//     "user_id": "U4BJD5YLX",
//     "total_value": 247,
//     "last_activity_at": 1703842121696
// }]

// const ch_most_active = [
//     {
//         "user_id": "U0BED3WRG",
//         "channel_id": "CB8LV57ED",
//         "user_label": "Mateusz Worotyński",
//         "channel_label": "ppg",
//         "total_value": 11,
//         "last_activity_at": 1703856821983
//     }, {
//         "user_id": "U4BJD5YLX",
//         "channel_id": "CB8LV57ED",
//         "user_label": "Dawid Mędrek",
//         "channel_label": "ppg",
//         "total_value": 6,
//         "last_activity_at": 1703863572029
//     }
// ]

// const ch_last_interactions = [{
//     "channel_label": "ppg",
//     "user_label": "Tomasz Tomczyk",
//     "channel_id": "CB8LV57ED",
//     "user_id": "U03UTSBV077",
//     "total_value": 131,
//     "last_activity_at": 1703868847047
// }]

// const ch_hourly_distr_in_time = "same as in dashboard"

// const ch_activity = [{
//     "day": "2022-12-25",
//     "color": "rgb(211, 211, 211)",
//     "incident": false,
//     "title": "2022-12-25: 0 interactions by 0 users on 0 channels"
// }] // same as in dashboard
```
