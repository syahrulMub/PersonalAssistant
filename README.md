# 🧠 AI Personal Assistant

> **A Mindful Personal Assistant & Intelligent Habit/Activity Tracker** didukung oleh **Google Gemini AI**, **ASP.NET Core 7**, dan **React 18 SPA**.  
> Dirancang untuk menjembatani pencatatan aktivitas harian dengan sintesis memori jangka panjang, asisten suara interaktif, kompilasi wawasan harian, dan rekomendasi kebiasaan mikro ala _Atomic Habits_.

---

## 📑 Daftar Isi

1. [Tentang Aplikasi](#-tentang-aplikasi)
2. [Tech Stack & Arsitektur](#-tech-stack--arsitektur)
3. [Fitur & Fungsi Utama](#-fitur--fungsi-utama)
4. [Arsitektur Sistem & Catatan Developer (Under The Hood)](#-arsitektur-sistem--catatan-developer)
5. [Panduan Pengguna (User Guide)](#-panduan-pengguna-user-guide)
6. [Instalasi & Menjalankan Aplikasi](#-instalasi--menjalankan-aplikasi)
7. [Struktur Proyek](#-struktur-proyek)
8. [Konfigurasi Environment & Keamanan](#-konfigurasi-environment--keamanan)

---

## 🌟 Tentang Aplikasi

**AI Personal Assistant** bukan sekadar aplikasi To-Do List atau pelacak kebiasaan biasa. Aplikasi ini dirancang dengan pendekatan **Mindful Technology**:

- **Bebas Beban Kognitif:** Pengguna tidak perlu merangkum atau menganalisis seluruh riwayatnya sendiri.
- **Memori Berkelanjutan:** AI mengingat konteks masa lalu, preferensi pengguna, dan status proyek tanpa kehilangan detail saat terjadi koreksi.
- **Rekomendasi Nyata:** Menghasilkan benang merah (_observed patterns_) dan penyesuaian ritme (_habit tweaks_) yang realistis dan aplikatif, tanpa jargon teoritis atau analisis menghakimi.

---

## 🛠 Tech Stack & Arsitektur

### 1. Backend (.NET 7 Web API)

- **Framework:** .NET 7.0 (C#)
- **Database & ORM:** SQLite dengan Entity Framework Core 7 (Code-First Migration)
- **Background Worker & Cron Jobs:** [Hangfire](https://www.hangfire.io/) dengan `Hangfire.Storage.SQLite`
- **Autentikasi & Keamanan:** JWT (_JSON Web Tokens_), BCrypt.Net Password Hashing, Role-Based Access Control (`Admin` & `User`)
- **Email Service:** MailKit & MimeKit (SMTP Dispatcher)
- **Logging & Telemetri:** Asynchronous In-Memory Queue (`ApiLogQueue`) dengan Background Hosted Service untuk minim latency request

### 2. AI Intelligence Engine (Google Gemini)

- **Model:** Google Gemini API (`gemini-2.5-flash`, `gemini-1.5-flash`, dengan fallback candidate models)
- **Integrasi Canggih:**
  - **Structured JSON Mode:** Enforcing skema JSON murni tanpa artefak markdown wrap.
  - **Function / Tool Calling:** Tool `search_comprehensive_history` untuk pencarian arsip multi-dimensi.
  - **Deep Merge Memory Reconciler:** Algoritma rekonsiliasi atribut lama dan baru secara non-destruktif.

### 3. Frontend (React 18 SPA)

- **Framework:** React 18 dengan React Router v6
- **Styling & Desain:** Tailwind CSS 3 (Dark/Light mode native), Bootstrap 5 / Reactstrap
- **Palet Warna "Mindful Tech":**
  - _Deep Slate:_ `#090D16` / `#131B2E` (Latar Dark Mode yang tenang)
  - _Muted Sage Green:_ `#3D996E` / `#95CDB1` (Simbol pertumbuhan & kebiasaan)
  - _Soft AI Violet:_ `#8B5CF6` / `#DDD6FE` (Simbol kecerdasan & pola wawasan)
  - _Warm Amber:_ `#F59E0B` / `#FDE68A` (Simbol rekomendasi aksi mikro)
- **Ikonografi:** `react-icons` (`Bs*`, `Fi*`)
- **Voice Interactivity:** Integrasi Web Speech API (Speech Recognition & Speech Synthesis).

---

## 🚀 Fitur & Fungsi Utama

### 1. Dashboard Kompilasi Harian AI (AI Daily Digest)

Dashboard utama di halaman muka (`/`) mengompilasi data aktivitas sepekan dan interaksi AI yang diperbarui otomatis setiap hari pukul **04:00 WIB**:

- **Distribusi Fokus Energi:** Progress bar persentase alokasi kegiatan sepekan berdasarkan kategori nyata.
- **Domain & Ranah Aktif:** Tag cloud area hidup/proyek yang aktif diperbarui di memori AI.
- **Pola & Dinamika Terdeteksi:** Wawasan benang merah ritme kerja pengguna tanpa asumsi menghakimi.
- **Penyesuaian Ritme (Atomic Habits):** Saran aksi mikro praktis untuk menjaga konsistensi atau memanfaatkan momentum produktivitas.
- **Eksplorasi Konsep & Problem Solving:** Rangkuman konsep teknis dan arsitektur yang dieksplorasi pengguna pada sesi Ask AI.
- **Presisi Tanggal Rekap:** Menampilkan waktu rekap harian terakhir secara presisi (contoh: `Rekap: 01 Okt 2026, 04:00 WIB`).

### 2. Dual-Output AI Voice Assistant (Traceback Memory)

Asisten percakapan cerdas yang dapat diakses melalui tombol mengambang (_Floating Action Button_) atau bilah navigasi:

- **Kanal TTS (`voiceSpeechResponse`):** Kalimat respons lisan yang luwes, ramah di telinga, dan bersih dari simbol sintaksis markdown.
- **Kanal Visual (`reportMarkdown`):** Sajian visual di layar pengguna berupa tabel progres, heading terstruktur, dan metrik pencapaian.
- **Pencarian Arsip Otomatis (Function Calling):** Jika informasi yang dicari berada di masa lampau, AI otomatis memanggil tool `search_comprehensive_history` untuk mencari ke database observasi sebelum merespons.
- **Non-Blocking Memory Correction:** Jika pengguna mengoreksi data di percakapan, mutasi memori diproses di _background task_ tanpa menghambat alur audio.

### 3. Arsitektur Memori Jangka Panjang (Long-Term Memory Engine)

- **AIMemories:** Menyimpan fakta, status proyek, dan preferensi entitas dalam atribut JSON terstruktur.
- **AIMemoryObservations:** Jejak audit bukti (_evidence_) kronologis dari aktivitas harian yang memvalidasi memori.
- **Deep Merge & Reconciliation:** Saat terjadi pembaruan, atribut lama dipertahankan dan hanya atribut yang dikoreksi yang ditimpa.
- **Minified SQLite Storage:** Semua payload JSON disimpan dalam 1 baris rapat (_minified single-line_) untuk menghindari isu indentasi atau pemotongan di GUI SQLite.

### 4. Manajemen Aktivitas & Kebiasaan (Activity & Habit Tracker)

- Pencatatan aktivitas harian dengan kategori: `Productivity`, `Learning`, `Health`, `Personal`, dan `General`.
- Status pelacakan: `Pending`, `Ongoing`, `Completed`, dan `Cancelled`.
- Dilengkapi pencatatan waktu riil (`actualCompletedDate`) dan catatan detail hambatan/hasil eksekusi.

### 5. Otomasi Jadwal Terpusat (Hangfire Recurring Jobs)

Aplikasi menjalankan 5 siklus otomasi latar belakang yang terhubung ke zona waktu `Asia/Jakarta`:

1. `04:00 WIB` — **Dashboard Daily Update:** Mengompilasi ringkasan mingguan dan membuat snapshot dashboard.
2. `07:00 WIB` — **Daily AI Morning Summary:** Menyiapkan digest rencana aktivitas pagi hari.
3. `08:00 WIB` — **Send Email Morning Briefing:** Mengirim email rangkuman pagi ke kotak masuk pengguna via SMTP.
4. `21:00 WIB` — **Daily AI Night Summary:** Rekap malam evaluasi pencapaian hari ini dan penataan agenda tertunda.
5. `03:00, 10:00, 21:00 WIB` — **AI Daily Memory Consolidation:** Sinkronisasi log aktivitas harian ke katalog memori AI.

### 6. Kontrol & Aktivasi Fitur AI (AI Feature Activation)

Pengguna memiliki kebebasan penuh mengaktifkan/menonaktifkan modul AI secara granular:

- _Voice Reflection_
- _Daily Morning Brief_
- _Night Recap_
- _Email Notification Briefing_
- _Periodic Background Reminders_

---

## 🔬 Arsitektur Sistem & Catatan Developer

Bagi developer yang mengembangkan atau meneliti basis kode ini, berikut adalah pola arsitektur utama yang diterapkan:

### 1. Pola Dual Output pada Prompt AI

AI prompt (`AIprompt.TracebackMemoryandInsightPrompt`) dirancang untuk memisahkan saluran keluaran:

```json
{
  "voiceSpeechResponse": "Narasi ringkas tanpa markdown untuk TTS engine",
  "reportMarkdown": "Visual UI Rich Markdown (tabel, heading ##, bullet list)",
  "intent": "OVERVIEW | KNOWLEDGE | NEXT_STEP | INVALID",
  "actionType": "None | Schedule | CloseSession",
  "keywords": ["Docker", "SQLite Optimization"],
  "draftSchedules": [...],
  "memoryMutations": [...]
}
```

### 2. Deep Merge Memory Reconciler (`CorrectionMemoryAskAI`)

Ketika AI mendeteksi mutasi memori dari percakapan pengguna (`memoryMutations`):

1. Background task (`Task.Run`) dipicu secara asinkron menggunakan scoped service factory.
2. Memori target dibaca dari `AIMemories`.
3. AI reconcile engine (`AIprompt.MemoryAdjusmentAskAIPromt`) menggabungkan atribut lama dengan atribut baru tanpa menghapus metadata penting lain.
4. Output JSON di-_minify_ menggunakan serializer relaxed escaping (`JavaScriptEncoder.UnsafeRelaxedJsonEscaping`) dan disimpan dalam satu baris rapat ke kolom SQLite `ValueJson`.

### 3. Tool Function Calling (`GetLibraryToolsDefinition`)

Ketika pengguna menanyakan hal di luar memori aktif 10 item teratas, model Gemini memicu declaration:

```json
{
  "name": "search_comprehensive_history",
  "parameters": {
    "keywords": ["Keyword1", "Keyword2"],
    "domain": "Productivity"
  }
}
```

Backend mengeksekusi pencarian pada `AIMemoryObservations` dan `AIMemories`, lalu mengembalikan konteks kronologis ke Gemini sebelum AI merumuskan jawaban final.

### 4. Asynchronous Request Logging (`LogQueueBackgroundWorker`)

Alih-alih menulis log API secara langsung di pipeline HTTP request yang memperlambat respons klien:

1. Middleware `ApiRequestLoggingMiddleware` memasukkan payload telemetry ke in-memory thread-safe queue (`ILogQueue`).
2. `LogQueueBackgroundWorker` (Background Hosted Service) mengambil antrean secara berkala dan menulis batch log ke database SQLite.

---

## 📖 Panduan Pengguna (User Guide)

1. **Memulai Hari (Pagi):**
   - Buka aplikasi di browser.
   - Periksa **Dashboard Harian** di halaman utama untuk melihat distribusi energi dan rekomendasi kebiasaan mikro.
   - Jika fitur email diaktifkan, Anda akan menerima email Morning Briefing pukul 08:00 WIB.
2. **Mencatat & Melacak Tugas:**
   - Masuk ke menu **Activities** untuk menambah atau menandai kegiatan yang selesai.
3. **Menggunakan Voice Assistant:**
   - Klik tombol ungu melingkar (_Bicara_) di mobile dock atau Desktop Voice FAB di pojok kanan bawah.
   - Ucapkan progres Anda atau tanyakan riwayat lampau (contoh: _"Rekap apa saja yang sudah aku selesaikan di modul backend minggu ini"_).
   - Asisten akan membacakan rangkuman dan menampilkan detail visual di layar.
4. **Mengubah Preferensi AI:**
   - Masuk ke menu **AI Features** untuk mengaktifkan atau menonaktifkan fitur tertentu sesuai kenyamanan Anda.

---

## 💻 Instalasi & Menjalankan Aplikasi

### Prasyarat

- [.NET 7 SDK](https://dotnet.microsoft.com/download/dotnet/7.0)
- [Node.js](https://nodejs.org/) (versi 18 LTS atau lebih baru) & `npm`
- Git

### Langkah Instalasi

1. **Clone Repository:**

   ```bash
   git clone https://github.com/syahrulMub/PersonalAssistant.git
   cd PersonalAssistant
   ```

2. **Konfigurasi Backend (`appsettings.json`):**
   Buka `AIPersonalAssistant/appsettings.json` dan lengkapi konfigurasi berikut:

   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Data Source=PersonalAssistant.db",
       "DevelopmentConnection": "Data Source=PersonalAssistantDev.db"
     },
     "Gemini": {
       "ApiKey": "MASUKKAN_GOOGLE_GEMINI_API_KEY_ANDA",
       "ApiKeyAIMemoryCompiler": "MASUKKAN_KEY_JIKA_DIPISAH",
       "ApiKeyAskAIAssistant": "MASUKKAN_KEY_JIKA_DIPISAH"
     },
     "Jwt": {
       "Key": "GunakanStringRahasiaMinimal32KarakterYangSangatKuatDanPanjang!",
       "Issuer": "AIPersonalAssistant-api",
       "Audience": "AIPersonalAssistant-frontend"
     },
     "EmailSettings": {
       "SmtpServer": "smtp.gmail.com",
       "Port": 587,
       "SenderName": "AI Personal Assistant",
       "SenderEmail": "email.anda@gmail.com",
       "Username": "email.anda@gmail.com",
       "Password": "APP_PASSWORD_SMTP_ANDA"
     }
   }
   ```

3. **Install Dependensi Frontend:**

   ```bash
   cd AIPersonalAssistant/ClientApp
   npm install
   cd ../..
   ```

4. **Menjalankan Aplikasi (Development Mode):**
   Masuk ke folder `AIPersonalAssistant` dan jalankan:

   ```bash
   cd AIPersonalAssistant
   dotnet run
   ```

   _Catatan:_ Proyek ini menggunakan `Microsoft.AspNetCore.SpaProxy`, sehingga menjalankan `dotnet run` akan secara otomatis meluncurkan backend Web API sekaligus development server React SPA.

5. **Akses Aplikasi:**
   - **Frontend App:** `https://localhost:44442` (atau port HTTPS yang dialokasikan)
   - **Swagger API Docs:** `https://localhost:7xxx/swagger`
   - **Hangfire Scheduler Dashboard:** `https://localhost:7xxx/hangfire`

6. **Akun Admin Default:**
   Saat pertama kali database dibuat, seed data admin otomatis disiapkan:
   - **Email:** `syahrul.mubarrok4@gmail.com`
   - **Password:** `Admin123!`

---

## 📂 Struktur Proyek

```text
PersonalAssistant/
├── AIPersonalAssistant/
│   ├── Controllers/             # Endpoint API (Activity, Dashboard, Auth, Feature, Telemetry)
│   ├── Data/                    # AppDbContext, Entity Configurations, Database Resolvers
│   ├── DTOs/                    # Data Transfer Objects (Dashboard, Memory, Reflection)
│   ├── Models/                  # Entity Models (ActivityLogs, AIMemory, TracebackMemory, etc.)
│   ├── Services/                # Core Business Logic
│   │   ├── AIGeminiService.cs       # Gemini API Caller & Function Calling Executor
│   │   ├── AIMemoryService.cs       # Memory Deep Merge & Reconciliation Service
│   │   ├── TracebackMemoryService.cs# Multi-turn Voice Assistant & Tool Executor
│   │   ├── DashboardService.cs      # Weekly Intelligence Compiler & Snapshots
│   │   ├── SchedulerMethod.cs       # Hangfire Scheduled Tasks
│   │   └── AIprompt.cs              # Pusat Definisi Rekayasa Prompt AI
│   ├── Middleware/              # ApiRequestLoggingMiddleware & Security Filters
│   ├── ClientApp/               # React 18 Single Page Application
│   │   ├── src/
│   │   │   ├── components/      # UI Components (Home, Activity, Dashboard, Nav)
│   │   │   ├── context/         # React Contexts (AuthContext, ThemeContext, VoiceContext)
│   │   │   └── pages/           # Auth Pages (LoginPage, RegisterPage)
│   │   └── tailwind.config.js   # Konfigurasi Tema Dark/Light & Warna Mindful Tech
│   ├── appsettings.json         # Konfigurasi Backend & Secret Keys
│   └── Program.cs               # Dependency Injection, Middleware Pipeline, Hangfire Jobs
└── README.md
```

---

## 🔒 Konfigurasi Environment & Keamanan

1. **Isolasi Memori Pengguna:** Setiap kueri memori dan observasi difilter ketat berdasarkan `UserId` yang diambil dari klaim JWT token pengguna yang terverifikasi (`User.GetUserId()`).
2. **Penyimpanan Password:** Menggunakan algoritma _hashing_ BCrypt dengan _salt_.
3. **Penyaringan Payload AI (Anti-Meta Guardrails):** Prompt compiler dilengkapi instruksi ketat untuk mengabaikan obrolan meta di mana pengguna sedang mengetes bot atau mengoreksi memori, sehingga data analisis fokus 100% pada progres kehidupan nyata.

---

## 📄 Lisensi & Kontribusi

Dikembangkan dengan penuh dedikasi oleh **syahrulMub** bersama AI assistance (2026). Terbuka untuk eksplorasi, kolaborasi riset rekayasa memori AI, dan pengembangan asisten produktivitas personal.
