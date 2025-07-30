export const config = {
  api: {
    bodyParser: false, // Désactive le body parser natif
  },
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Lis le body brut
    let body = "";
    await new Promise((resolve) => {
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", resolve);
    });

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return res.status(400).send("Invalid JSON");
    }

    // Répond au challenge Slack
    if (data && data.challenge) {
      return res.status(200).json({ challenge: data.challenge });
    }

    // Ici, traite les events Slack si besoin
    return res.status(200).send("OK");
  }

  res.status(405).send("Method Not Allowed");
}