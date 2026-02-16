### Summary

OpenBoard is a leaderboard for OpenCode statistics. The goal of this project is to collect how many tokens opencode users use and display it in a leaderboard.

The collection is happening through an opencode plugin that sends anonym token usage data using an opencode plugin.

The main app is a TanStack Start Solid js app that displays the leaderboard and exposes the API to which the plugin sends the data.

The app is hosted on Cloudflare workers and uses the cloudflare primitves like D1 for db.
