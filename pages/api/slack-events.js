export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === "POST") {
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

    if (data && data.challenge) {
      return res.status(200).json({ challenge: data.challenge });
    }

    return res.status(200).send("OK");
  } else {
    res.status(405).send("Method Not Allowed");
  }
}