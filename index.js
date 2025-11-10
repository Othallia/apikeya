const express = require("express");
const crypto = require("crypto");
// --- INI YANG BARU (1/3): Ada /promise ---
const mysql = require("mysql2/promise");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// --- INI YANG BARU (2/3): Menggunakan createPool ---
const dbPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "ookwlan24", // Password kamu
  database: "api_key",
  port: 3307, // Port custom kamu
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- INI YANG BARU (3/3): Tes koneksi cara async ---
(async () => {
  try {
    await dbPool.query("SELECT 1");
    console.log("✅ Berhasil terhubung ke database MySQL (api_key)");
  } catch (err) {
    console.error("❌ GAGAL terhubung ke database:", err.message);
  }
})();
// -----------------------------------------------------------------

app.post("/generate-api-key", async (req, res) => {
  try {
    const { serviceName } = req.body;
    if (!serviceName) {
      return res
        .status(400)
        .json({ error: "Nama layanan (serviceName) diperlukan" });
    }

    const key = "sk_live_" + crypto.randomBytes(32).toString("hex");
    console.log(`Membuat key untuk: ${serviceName}`);

    // Menggunakan dbPool
    await dbPool.query(
      "INSERT INTO issued_keys (api_key, service_name) VALUES (?, ?)",
      [key, serviceName]
    );

    console.log(`Key berhasil disimpan ke DB.`);

    res.json({ apiKey: key });
  } catch (error) {
    console.error("Error saat membuat key:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(500).json({
        error: "Terjadi duplikasi key. Coba buat lagi.",
      });
    }
    res.status(500).json({ error: "Gagal memproses permintaan" });
  }
});

app.post("/check", async (req, res) => {
  try {
    const { apikey } = req.body;
    if (!apikey) {
      return res.status(400).json({
        status: "error",
        message: "API key tidak ada atau tidak valid",
      });
    }

    console.log(`Mengecek key: ${apikey}`);

    // Menggunakan dbPool
    const [rows] = await dbPool.query(
      "SELECT * FROM issued_keys WHERE api_key = ?",
      [apikey]
    );

    if (rows.length > 0) {
      // INI RESPON YANG BENAR DARI KODE BARU
      res.json({
        status: "sukses",
        message: "API key valid dan terdaftar.",
        service: rows[0].service_name,
        created: rows[0].created_at,
      });
    } else {
      res.status(404).json({
        status: "error",
        message: "API key tidak valid atau tidak ditemukan",
      });
    }
  } catch (error) {
    console.error("Error saat mengecek key:", error);
    res.status(500).json({ error: "Gagal memproses permintaan" });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
