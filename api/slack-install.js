import { installUrl } from "@slack/oauth";

export default function handler(req, res) {
  const url = installUrl({
    clientId: process.env.SLACK_CLIENT_ID,
    scopes: ["commands", "chat:write", "app_mentions:read"],
    redirectUri: process.env.SLACK_OAUTH_REDIRECT_URI,
  });
  res.redirect(url);
}