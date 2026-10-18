# Hero AI ⚡

Klien obrolan AI modern berbasis **Next.js (App Router)** dan **TypeScript**, siap dideploy langsung ke **Vercel** dengan UI ergonomis bergaya developer tools, bebas dari "AI slop", dan dilengkapi tema **Dracula VS Code**.

---

## ✨ Fitur Utama

- 🎨 **Tema Dracula VS Code & Light Mode**:
  - **Dark Mode**: Menggunakan palet warna asli **Dracula Theme VS Code** (`#282a36`, `#21222c`, `#44475a`, `#6272a4`, `#8be9fd`, `#50fa7b`, `#ff79c6`, `#bd93f9`).
  - **Light Mode**: Tampilan bersih, minimalis, dan kontras tinggi.
  - Beralih tema dengan 1 tombol di pojok bawah sidebar (tersimpan otomatis).
- 💬 **Riwayat Obrolan & Auto-Save**:
  - Percakapan disimpan **otomatis** ke `localStorage` tanpa perlu klik tombol simpan manual.
  - **Sidebar di sebelah kiri layar**:
    - Tombol `+ Percakapan Baru`
    - Daftar obrolan berurutan dengan judul otomatis dari pertanyaan pertama
    - Fitur **Rename (ubah judul)** dan **Hapus percakapan**
    - Pencarian riwayat percakapan
    - Responsif (bisa di-collapse di desktop & drawer slide-over di mobile).
- 🧼 **Tampilan Balasan AI Rapi (Anti "AI Slop")**:
  - Tidak ada divider `----` atau garis kasar yang bocor.
  - Pemisah teks dirender menjadi hairline divider tipis yang halus.
  - **Code Block** dilengkapi header bahasa pemrograman, syntax highlighting, dan tombol **Salin Kode** interaktif.
  - Typography markdown rapi (tabel, list, blockquote, inline code).
- 🖼️ **Vision & Paste Screenshot Langsung (Ctrl+V)**:
  - Cukup tekan `Ctrl + V` untuk menempelkan screenshot gambar langsung ke input chat.
  - Dukungan drag-and-drop file dan picker attachment (gambar dikirim dalam format OpenAI Vision).
- 🔄 **Next.js Streaming CORS Proxy (`/api/proxy`)**:
  - Route handler built-in Next.js untuk mem-bypass CORS ke endpoint OpenAI / 9router.
  - Mendukung Server-Sent Events (SSE) streaming real-time tanpa delay.
- 🧠 **Memori AI Jangka Panjang (Long-Term Memory)**:
  - Instruksi preferensi user yang selalu diinjeksi ke system prompt agar AI selalu mengingat gaya jawaban favorit Anda.
- 💾 **Export & Import JSON**:
  - Backup seluruh percakapan dan memori ke file `.json`, dan restore kapan saja.

---

## 🚀 Menjalankan Secara Lokal

```bash
# 1. Masuk ke direktori project
cd "d:/Project/Hero AI"

# 2. Jalankan mode pengembangan
npm run dev

# 3. Atau build untuk production
npm run build
npm run start
```

Buka browser di [http://localhost:3000](http://localhost:3000).

---

## ☁️ Deploy ke Vercel

Aplikasi ini sudah 100% kompatibel dengan **Vercel**:

1. Push repository ini ke GitHub / GitLab.
2. Buka dashboard [Vercel](https://vercel.com) dan klik **Add New Project**.
3. Import repository Hero AI.
4. Framework Preset akan otomatis terdeteksi sebagai **Next.js**.
5. Klik **Deploy**. Tidak ada environment variable wajib yang perlu diisi karena semua konfigurasi Base URL & API Key dapat diatur langsung di UI browser.

---

## 🛠️ Pengaturan Kredensial

Klik menu **Pengaturan** di kanan atas atau kiri bawah sidebar untuk:
- Mengatur **Base URL** (default: `https://hero-ai.zero-hero.biz.id/v1`)
- Memasukkan **API Key**
- Menguji status koneksi dengan tombol **Test Connection**
- Mengambil daftar model otomatis dari endpoint via tombol **Ambil dari API**
- Mengatur **Temperature**, **Streaming**, dan **System Prompt**
- Menulis **Catatan Memori Jangka Panjang**
- Melakukan **Export / Import JSON**
