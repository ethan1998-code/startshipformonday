export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("Received method:", req.method);

  if (req.method === "POST") {
    let body = "";
    await new Promise((resolve) => {
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", resolve);
    });

    console.log("Raw body:", body);

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.log("Failed to parse JSON:", e);
      return res.status(400).send("Invalid JSON");
    }

    console.log("Parsed data:", data);

    if (data && data.challenge) {
      console.log("Responding with challenge:", data.challenge);
      return res.status(200).json({ challenge: data.challenge });
    }

    return res.status(200).send("OK");
  } else {
    res.status(405).send("Method Not Allowed");
  }
}