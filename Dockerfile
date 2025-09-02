# Tahap 1: Gunakan base image resmi Node.js versi 20-slim.
# 'slim' adalah versi yang lebih kecil dari image default.
FROM node:20-slim

# Instalasi dependency sistem yang dibutuhkan oleh 'node-canvas'.
# 'node-canvas' memerlukan library grafis C++ (Cairo) untuk bekerja.
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

# Tentukan direktori kerja di dalam kontainer.
# Semua perintah selanjutnya akan dijalankan dari direktori ini.
WORKDIR /app

# Salin package.json dan package-lock.json (jika ada).
# Tanda bintang (*) memastikan keduanya tersalin.
COPY package*.json ./

# Instal dependency Node.js.
# Ini dilakukan terpisah dari 'COPY . .' untuk memanfaatkan caching Docker.
# Layer ini hanya akan di-build ulang jika package.json berubah.
RUN npm install

# Salin sisa file aplikasi ke dalam direktori kerja.
COPY . .

# Beri tahu Docker bahwa kontainer akan berjalan di port 3000.
EXPOSE 3000

# Perintah default untuk menjalankan aplikasi saat kontainer dimulai.
CMD [ "node", "server.js" ]