import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// API Route for sending budget approval request
app.post("/api/send-budget-request", async (req, res) => {
  console.log("Received budget request to:", req.body?.to);
  const { to, subject, body, pdfBase64, fileName } = req.body;

  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error("Configurazione Email mancante nel server (GMAIL_USER o GMAIL_APP_PASSWORD)");
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to,
      subject: subject,
      text: body,
      attachments: [
        {
          filename: fileName || "Richiesta_Approvazione_Budget.pdf",
          content: pdfBase64,
          encoding: 'base64'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", to);
    res.json({ success: true, message: "Email inviata con successo" });
  } catch (error: any) {
    console.error("Errore invio email:", error);
    res.status(500).json({ 
        error: "Errore durante l'invio dell'email", 
        details: error.message,
        code: error.code || 'UNKNOWN'
    });
  }
});

// Global Error Handler for API
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global Error:", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// Vite/Static middleware setup
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// For Cloud Run / Local
if (process.env.VERCEL !== "1") {
  const PORT = 3000;
  setupServer().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

// Export for Vercel
export default app;
