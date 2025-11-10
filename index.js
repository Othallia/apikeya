const express = require("express");
const crypto = require("crypto");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static("public"));

app.post("/generate-api-key", (req, res) => {
  console.log("Request diterima di /generate-api-key");
  const key = "sk_live_" + crypto.randomBytes(32).toString("hex");
  res.json({ apiKey: key });
});

app.post("/check", (req, res) => {
  const { apikey } = req.body;

  console.log("Request diterima di /check. API Key:", apikey);

  if (apikey && apikey.startsWith("sk_live_")) {
    res.json({
      status: "sukses",
      message: "API key valid!",
    });
  } else {
    res.status(400).json({
      status: "error",
      message: "API key tidak ada atau tidak valid",
    });
  }
});

app.listen(port, () => {
  console.log('Server berjalan di http://localhost:${port}');
});