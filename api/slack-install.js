export default function handler(req, res) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.SLACK_OAUTH_REDIRECT_URI);
  const scopes = "commands,chat:write,app_mentions:read";
  if (!clientId || !redirectUri) {
    return res.status(500).send("Missing SLACK_CLIENT_ID or SLACK_OAUTH_REDIRECT_URI");
  }
  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
  res.redirect(url);
}