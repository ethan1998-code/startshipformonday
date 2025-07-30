export default async function handler(req, res) {
  if (req.method === "POST" && req.body?.challenge) {
    // Slack vérifie l'URL avec un challenge
    return res.status(200).json({ challenge: req.body.challenge });
  }
  // Ici tu traites les events Slack reçus
  res.status(200).send("Slack events endpoint OK!");
}