const express = require("express");
const crypto = require("crypto");
const mysql = require("mysql2/promise");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// --- KONEKSI DATABASE ---
const dbPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "ookwlan24", 
  database: "api_key",   
  port: 3307,            
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Tes koneksi
(async () => {
  try {
    await dbPool.query("SELECT 1");
    console.log("✅ Berhasil terhubung ke database MySQL (api_key)");
  } catch (err) {
    console.error("❌ GAGAL terhubung ke database:", err.message);
  }
})();

// -----------------------------------------------------------------
// 1. GENERATE API KEY
// -----------------------------------------------------------------
app.post("/generate-api-key", async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({ error: "Nama Depan dan Email wajib diisi!" });
    }

    console.log(`Request API Key untuk email: ${email}`);

    // Cek User
    const [users] = await dbPool.query("SELECT id FROM users WHERE email = ?", [email]);
    let userId;

    if (users.length > 0) {
      userId = users[0].id;
    } else {
      const [result] = await dbPool.query(
        "INSERT INTO users (first_name, last_name, email) VALUES (?, ?, ?)",
        [firstName, lastName, email]
      );
      userId = result.insertId;
    }

    // Generate Key
    const apiKey = "sk_live_" + crypto.randomBytes(32).toString("hex");
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); 

    // Insert Key
    await dbPool.query(
      "INSERT INTO api_keys (user_id, api_key, status, start_date, end_date) VALUES (?, ?, 'active', ?, ?)",
      [userId, apiKey, startDate, endDate]
    );

    console.log(`API Key berhasil dibuat: ${apiKey}`);
    res.json({ apiKey: apiKey });

  } catch (error) {
    console.error("Error saat membuat key:", error);
    res.status(500).json({ error: "Gagal memproses permintaan database" });
  }
});

app.post("/check", async (req, res) => {
  try {
    const { apikey } = req.body;
    if (!apikey) {
      return res.status(400).json({ status: "error", message: "API key wajib diisi" });
    }

    const query = `
      SELECT k.*, u.email, u.first_name 
      FROM api_keys k 
      JOIN users u ON k.user_id = u.id 
      WHERE k.api_key = ?
    `;

    const [rows] = await dbPool.query(query, [apikey]);

    if (rows.length > 0) {
      const data = rows[0];
      const now = new Date();
      const expiredDate = new Date(data.end_date);

      if (data.status !== 'active') {
        return res.status(403).json({ status: "error", message: "API Key ini sudah tidak aktif (Inactive)." });
      }

      if (now > expiredDate) {
        return res.status(403).json({ status: "error", message: "API Key ini sudah kadaluarsa (Expired)." });
      }

      res.json({
        status: "sukses",
        message: "API key valid.",
        owner: `${data.first_name} (${data.email})`,
        created_at: data.created_at,
        expires_at: data.end_date
      });

    } else {
      res.status(404).json({ status: "error", message: "API key tidak ditemukan di database." });
    }

  } catch (error) {
    console.error("Error saat mengecek key:", error);
    res.status(500).json({ error: "Gagal memproses permintaan" });
  }
});

app.get("/admin/keys", async (req, res) => {
  try {
    const query = `
      SELECT api_keys.id, users.first_name, users.email, api_keys.api_key, api_keys.status, api_keys.created_at 
      FROM api_keys 
      JOIN users ON api_keys.user_id = users.id
      ORDER BY api_keys.created_at DESC
    `;
    const [rows] = await dbPool.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Gagal ambil data admin:", error);
    res.status(500).json({ error: "Gagal mengambil data" });
  }
});

app.delete("/admin/keys/:id", async (req, res) => {
  try {
    const keyId = req.params.id;
    await dbPool.query("DELETE FROM api_keys WHERE id = ?", [keyId]);
    res.json({ message: "Key berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus key:", error);
    res.status(500).json({ error: "Gagal menghapus key" });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});