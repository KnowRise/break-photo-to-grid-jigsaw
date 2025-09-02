// Hanya panggil dotenv jika kita TIDAK berada di lingkungan produksi
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require("express");
const multer = require("multer");
const { createCanvas, loadImage } = require("canvas");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted Area"');
    return res.status(401).json({ error: "Authentication required" });
  }
  const [username, password] = Buffer.from(authHeader.split(" ")[1], "base64")
    .toString()
    .split(":");
  if (
    username === process.env.BASIC_AUTH_USER &&
    password === process.env.BASIC_AUTH_PASSWORD
  ) {
    next();
  } else {
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted Area"');
    return res.status(401).json({ error: "Invalid credentials" });
  }
};

const authGuard = (req, res, next) => {
  // Variabel lingkungan selalu berupa string, jadi kita bandingkan dengan 'true'
  if (process.env.AUTH_ENABLED === "true") {
    // Jika auth diaktifkan, jalankan middleware basicAuth
    return basicAuth(req, res, next);
  }
  // Jika auth tidak diaktifkan, langsung lanjutkan ke handler berikutnya
  next();
};

// FUNGSI UNTUK JIGSAW (Tidak ada perubahan di sini)
function drawPuzzlePiece(ctx, x, y, w, h, tabSize, tabConfig) {
  ctx.beginPath();
  ctx.moveTo(x, y);

  // TOP edge
  if (tabConfig.top) {
    const tabHeight = tabSize * tabConfig.top;
    ctx.lineTo(x + w * 0.35, y);
    ctx.bezierCurveTo(
      x + w * 0.3,
      y,
      x + w * 0.25,
      y - tabHeight,
      x + w * 0.5,
      y - tabHeight
    );
    ctx.bezierCurveTo(
      x + w * 0.75,
      y - tabHeight,
      x + w * 0.7,
      y,
      x + w * 0.65,
      y
    );
    ctx.lineTo(x + w, y);
  } else {
    ctx.lineTo(x + w, y);
  }

  // RIGHT edge
  if (tabConfig.right) {
    const tabWidth = tabSize * tabConfig.right;
    ctx.lineTo(x + w, y + h * 0.35);
    ctx.bezierCurveTo(
      x + w,
      y + h * 0.3,
      x + w + tabWidth,
      y + h * 0.25,
      x + w + tabWidth,
      y + h * 0.5
    );
    ctx.bezierCurveTo(
      x + w + tabWidth,
      y + h * 0.75,
      x + w,
      y + h * 0.7,
      x + w,
      y + h * 0.65
    );
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.lineTo(x + w, y + h);
  }

  // BOTTOM edge
  if (tabConfig.bottom) {
    const tabHeight = tabSize * tabConfig.bottom;
    ctx.lineTo(x + w * 0.65, y + h);
    ctx.bezierCurveTo(
      x + w * 0.7,
      y + h,
      x + w * 0.75,
      y + h + tabHeight,
      x + w * 0.5,
      y + h + tabHeight
    );
    ctx.bezierCurveTo(
      x + w * 0.25,
      y + h + tabHeight,
      x + w * 0.3,
      y + h,
      x + w * 0.35,
      y + h
    );
    ctx.lineTo(x, y + h);
  } else {
    ctx.lineTo(x, y + h);
  }

  // LEFT edge
  if (tabConfig.left) {
    const tabWidth = tabSize * tabConfig.left;
    ctx.lineTo(x, y + h * 0.65);
    ctx.bezierCurveTo(
      x,
      y + h * 0.7,
      x - tabWidth,
      y + h * 0.75,
      x - tabWidth,
      y + h * 0.5
    );
    ctx.bezierCurveTo(
      x - tabWidth,
      y + h * 0.25,
      x,
      y + h * 0.3,
      x,
      y + h * 0.35
    );
    ctx.lineTo(x, y);
  } else {
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.stroke();
}

// FUNGSI BARU UNTUK GRID
function drawGridLines(ctx, width, height, numX, numY) {
  const pieceW = width / numX;
  const pieceH = height / numY;

  // Gambar garis vertikal
  for (let i = 1; i < numX; i++) {
    const lineX = i * pieceW;
    ctx.beginPath();
    ctx.moveTo(lineX, 0);
    ctx.lineTo(lineX, height);
    ctx.stroke();
  }

  // Gambar garis horizontal
  for (let j = 1; j < numY; j++) {
    const lineY = j * pieceH;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(width, lineY);
    ctx.stroke();
  }
}

app.get("/", (req, res) => {
  res.send(
    "Welcome to the Puzzle API. Use POST /puzzle with an image file and 'type' query (jigsaw/grid)."
  );
});

app.post("/puzzle", authGuard, upload.single("image"), async (req, res) => {
  try {
    // --- PERUBAHAN 1: Menambahkan parameter 'type' ---
    const { x = 4, y = 3, tabSize = 20, type = "jigsaw" } = req.query;
    const numX = parseInt(x, 10);
    const numY = parseInt(y, 10);
    const size = parseInt(tabSize, 10);

    const img = await loadImage(req.file.buffer);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Gambar image asli
    ctx.drawImage(img, 0, 0);

    // Atur gaya garis
    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.lineWidth = 2;

    const pieceW = img.width / numX;
    const pieceH = img.height / numY;

    // --- PERUBAHAN 2: Logika percabangan berdasarkan 'type' ---
    if (type === "jigsaw") {
      // Logika yang sudah ada untuk membuat jigsaw
      const tabs = [];
      for (let i = 0; i < numX; i++) {
        tabs[i] = [];
        for (let j = 0; j < numY; j++) {
          const topTab = j === 0 ? 0 : -tabs[i][j - 1].bottom;
          const leftTab = i === 0 ? 0 : -tabs[i - 1][j].right;
          const rightTab = i === numX - 1 ? 0 : Math.random() > 0.5 ? 1 : -1;
          const bottomTab = j === numY - 1 ? 0 : Math.random() > 0.5 ? 1 : -1;

          tabs[i][j] = {
            top: topTab,
            left: leftTab,
            right: rightTab,
            bottom: bottomTab,
          };
        }
      }

      for (let i = 0; i < numX; i++) {
        for (let j = 0; j < numY; j++) {
          const posX = i * pieceW;
          const posY = j * pieceH;
          drawPuzzlePiece(ctx, posX, posY, pieceW, pieceH, size, tabs[i][j]);
        }
      }
    } else if (type === "grid") {
      // Logika baru untuk menggambar grid sederhana
      drawGridLines(ctx, img.width, img.height, numX, numY);
    }

    // Kirim hasil PNG
    res.set("Content-Type", "image/png");
    canvas.pngStream().pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Processing failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Puzzle API running on port 3000"));
