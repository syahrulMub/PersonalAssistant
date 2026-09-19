namespace AIPersonalAssistant.Services;

public static class AIprompt
{
    public static string BuildExtractionPrompt(string rawActivitiesJson, string existingTopicsCatalog) =>
        $@"Anda adalah AI Memory Extraction Engine. Tugas Anda mengekstrak wawasan bernilai jangka panjang dari log aktivitas pengguna ke dalam struktur data memori yang kohesif.

        [DAFTAR TOPIK / MEMORI YANG SUDAH AKTIF]
        {existingTopicsCatalog}

        PRINSIP EVALUASI NILAI MEMORI:
        Ekstrak menjadi entitas memori jika aktivitas memenuhi salah satu kriteria nilai berikut:
        1. **Siklus Periodik & Mitigasi Risiko (Periodic Cycles & Preservation)**:
        - Tindakan berkala yang memiliki interval waktu berulang dan berisiko menimbulkan dampak negatif jika terlupakan (pemeliharaan kondisi, siklus kepatuhan, atau peninjauan preventif).
        2. **Kondisi & Profil Berkelanjutan (Sustained State & Context)**:
        - Informasi mengenai peran primer, transisi fase hidup, atau status fungsional yang memengaruhi lanskap keseharian pengguna.
        3. **Inisiatif & Milestone Bertahap (Progressive Initiatives)**:
        - Upaya yang membutuhkan rangkaian proses bertingkat dan waktu berkelanjutan untuk mencapai target tertentu.
        4. **Rutinitas & Kesejahteraan Berulang (Behavioral Routines & Wellness)**:
        - Pola aktivitas fisik, mental, atau kebiasaan terstruktur yang mencerminkan keterlibatan berkala.
        5. **Preferensi & Batasan Operasional (Preferences & Constraints)**:
        - Kecenderungan pilihan instrumen, metodologi kerja, atau batasan personal yang konsisten.

        PENGECUALIAN / ABAIKAN (TRANSIENT NOISE):
        - Abaikan transaksi atau interaksi kasual sekali lewat yang tidak membawa dampak risiko jangka panjang jika dilupakan, serta tidak memiliki keterkaitan dengan inisiatif, status, atau kebiasaan terstruktur.

        ATURAN STATUS & DERAJAT KEYAKINAN (CONFIDENCE):
        - **Aktivitas Faktual (Telah Terjadi)**: Berikan confidence tinggi (0.8 - 1.0) dan tentukan status operasional 'Completed' atau 'Ongoing'.
        - **Rencana / Pengingat / Komitmen Masa Depan**: Berikan confidence terukur (0.6 - 0.75), tentukan status operasional 'Planned' atau 'Scheduled', dan catat target proyeksi waktunya.
        - **Konsistensi Topik**: Jika aktivitas relevan dengan daftar topik aktif di atas, WAJIB gunakan Subject dan Key yang sama persis untuk mencegah fragmentasi data.

        FORMAT OUTPUT:
        Wajib memberikan output HANYA format JSON valid tanpa blok markdown atau teks tambahan:
        {{
        ""memories"": [
            {{
            ""memoryType"": ""Cyclic"" | ""State"" | ""Project"" | ""Routine"" | ""Preference"",
            ""subject"": ""string (Domain/Area Utama)"",
            ""key"": ""string (Kunci Topik Spesifik)"",
            ""value"": {{
                ""currentStatus"": ""Completed"" | ""Ongoing"" | ""Planned"" | ""Scheduled"",
                ""details"": ""string ringkasan fakta/progres"",
                ""lastExecutedAt"": ""YYYY-MM-DD (jika faktual telah terjadi)"",
                ""nextProjectedAt"": ""YYYY-MM-DD (jika terdapat rencana/estimasi jadwal berikutnya)"",
                ""cycleInterval"": ""string estimasi ritme jika relevan (misal: harian, mingguan, bulanan, kuartalan)""
            }},
            ""source"": ""InferredFromActivity"",
            ""confidence"": 0.0,
            ""evidence"": [
                {{
                ""sourceId"": 0,
                ""sourceType"": ""Activity"",
                ""observationValue"": ""string isi log aktivitas asli""
                }}
            ]
            }}
        ]
        }}

        [LOG AKTIVITAS PENGGUNA]
        {rawActivitiesJson}";

    public static string PromptParseActivityFromSpeechAsync(string currentTimeString, string dayOfWeek, string speechText) =>
    $@"
        Peran: Ekstraktor data aktivitas terstruktur dari transkrip ucapan.
        Waktu referensi saat ini: {currentTimeString} WIB. Hari: {dayOfWeek}.

        Input Transkrip:
        ""{speechText}""

        Aturan Ekstraksi & Standar Data:

        1. Granularitas & Multi-Item:
        - Evaluasi apakah input memuat beberapa agenda terpisah, serangkaian tugas berurutan, atau pembagian jadwal beberapa hari.
        - Jika terdapat lebih dari satu entitas kegiatan, pecah secara modular menjadi objek terpisah dalam array JSON.
        - Jika hanya memuat satu konteks kegiatan, hasilkan array dengan satu objek.
        - Batasi pemrosesan maksimal 15 entitas kegiatan per prompt; prioritaskan urutan waktu terdekat dan abaikan agenda tambahan di luar batas tersebut.

        2. Konstruksi Judul ('title'):
        - Berupa frasa tindakan langsung yang padat dan jelas.
        - Representasikan inti kegiatan tanpa meta-pembuka (dilarang menggunakan atribusi pihak ketiga seperti 'Pengguna meminta...', 'Catatan untuk...', atau 'User ingin...').

        3. Integritas Deskripsi ('description'):
        - Pertahankan seluruh informasi faktual, daftar item, rincian teknis, pencapaian, dan kendala yang disebutkan tanpa memangkas substansinya.
        - Bersihkan teks dari kata pengisi non-substansial (filler words, keraguan bicara, atau frasa komando seperti 'tolong buatkan', 'catat dong').
        - Susun kembali tata bahasa menjadi kalimat terstruktur yang rapi, profesional, dan mencerminkan catatan kepemilikan langsung dari penutur.

        4. Taksonomi Kategori ('category'):
        Klasifikasikan secara objektif ke dalam salah satu nilai berikut:
        - 'Productivity' : Pekerjaan, rekayasa/teknis, tugas profesional, rapat, tenggat waktu.
        - 'Learning'     : Pembelajaran, literasi, riset, eksplorasi pengetahuan.
        - 'Health'       : Aktivitas fisik, pemulihan, nutrisi, pola istirahat/kebugaran.
        - 'Personal'     : Urusan pribadi, domestik, komitmen sosial, pengelolaan personal.
        - 'General'      : Konteks di luar klasifikasi di atas.

        5. Temporal & Pengingat ('isReminder', 'remindAt'):
        - 'isReminder': Bernilai true jika entitas merujuk pada rencana/jadwal masa depan dengan parameter waktu yang dapat diidentifikasi. Bernilai false jika tidak ada indikasi waktu masa depan atau merupakan laporan pencapaian/aktivitas yang telah tuntas.
        - 'remindAt': Hitung nilai waktu spesifik ke dalam format ISO-8601 (yyyy-MM-ddTHH:mm:ss) berdasarkan referensi waktu saat ini ({currentTimeString} WIB). Tetapkan null jika tidak ada indikasi waktu spesifik atau jika 'isReminder' bernilai false.

        Format Output:
        Hasilkan HANYA JSON Array valid tanpa pembungkus blok markdown (tanpa ```json) dan tanpa teks pembuka atau penutup.

        Skema JSON:
        [
        {{
            ""title"": ""string"",
            ""description"": ""string"",
            ""category"": ""Productivity|Learning|Health|Personal|General"",
            ""isReminder"": boolean,
            ""remindAt"": ""string | null""
        }}
        ]
        ";
    public static string BuildConsolidationPrompt(string candidatesJson, string existingMemoriesJson) =>
        $@"Anda adalah AI Memory Consolidation Engine. Tugas Anda mengevaluasi kandidat memori baru terhadap memori lama pengguna untuk mencegah fragmentasi dan duplikasi data.

            ATURAN PENGAMBILAN KEPUTUSAN (ACTION):
            1. CREATE:
            - Gunakan jika kandidat benar-benar topik baru dan TIDAK memiliki kaitan dengan memori lama.
            - Set ""existingMemoryId"": null, ""sourceMemoryId"": null.

            2. UPDATE:
            - Gunakan jika kandidat merupakan kelanjutan, perkembangan progres, atau informasi tambahan dari memori lama yang sudah ada.
            - Set ""existingMemoryId"" ke ID memori lama.
            - Gabungkan data lama dan data baru di dalam ""valueJson"" (jangan hapus data lama yang masih valid, sintesiskan).
            - Naikkan nilai ""confidence"" (maksimal 1.0) karena bukti observasi bertambah.

            3. MERGE:
            - Gunakan jika kandidat menyadarkan bahwa ada memori lama A (sub-fitur/topik parsial) yang sebenarnya adalah bagian dari memori lama B (proyek utama).
            - Set ""existingMemoryId"" ke ID memori target utama (B).
            - Set ""sourceMemoryId"" ke ID memori lama yang akan dilebur/diarsipkan (A).
            - Gabungkan seluruh konten ke dalam ""valueJson"" memori utama.

            4. IGNORE:
            - Gunakan jika informasi pada kandidat sudah tercatat lengkap di memori lama tanpa ada hal baru yang bernilai.

            FORMAT OUTPUT:
            Wajib memberikan output HANYA array JSON valid tanpa markdown, pembuka, atau penutup:
            [
            {{
                ""action"": ""CREATE"" | ""UPDATE"" | ""IGNORE"" | ""MERGE"",
                ""existingMemoryId"": 0,
                ""sourceMemoryId"": null,
                ""memoryType"": ""string"",
                ""subject"": ""string"",
                ""key"": ""string"",
                ""valueJson"": ""string (JSON valid yang sudah di-serialize/escaped)"",
                ""confidence"": 0.0,
                ""reason"": ""string ringkas alasan keputusan"",
                ""evidence"": [
                {{
                    ""sourceId"": 0,
                    ""sourceType"": ""Activity"",
                    ""observationValue"": ""string""
                }}
                ]
            }}
            ]

            [DAFTAR MEMORI LAMA YANG RELEVAN]
            {existingMemoriesJson}

            [KANDIDAT MEMORI BARU DARI AKTIVITAS HARI INI]
            {candidatesJson}";
    public static string PromptGetReflectionContextAsync(string contextType, string activeMemoriesJson, string todaysWinsJson, string pendingTasksJson, DateTime currentTimestampUtc) =>
    $@"
        Anda adalah AI Context Synthesizer untuk sesi {contextType} Reflection pengguna.
        Waktu saat ini (UTC Anchor): {{currentTimestampUtc:yyyy-MM-ddTHH:mm:ssZ}} (Tanggal: {{currentTimestampUtc:yyyy-MM-dd}})
        [MEMORI JANGKA PANJANG PENGGUNA - HANYA UNTUK REFERENSI KONTEKS LATAR BELAKANG]
        {activeMemoriesJson}

        [LOG AKTIVITAS TERBARU YANG SUDAH DICAPAI HARI INI ({{currentTimestampUtc:yyyy-MM-dd}})]
        {todaysWinsJson}

        [LOG AKTIVITAS TERBARU YANG MASIH BERSTATUS PENDING]
        {pendingTasksJson}

        TUGAS ANDA:
        1. **BriefDigest**: Buat ringkasan padat (1-2 kalimat) tentang kondisi dan fokus pengguna (misal: 'Kemarin kamu fokus mengerjakan backend auth dan tidur larut malam').
        2. **ItemsToClarify**: 
        - WAJIB HANYA mengambil item dari [LOG AKTIVITAS TERBARU YANG MASIH BERSTATUS PENDING / TERTUNDA].
        - Salin 'Id' aktivitas secara presisi ke properti 'activityId'.
        - JANGAN PERNAH mengambil item dari [MEMORI JANGKA PANJANG].
        - JIKA daftar pending kosong, KEMBALIKAN ARRAY KOSONG []. JANGAN MENGARANG ITEM SENDIRI.
        3. **WinsAndCompletions**: 
        - WAJIB HANYA mengambil dari [LOG AKTIVITAS TERBARU YANG SUDAH DICAPAI].
        - JANGAN PERNAH mengambil pencapaian masa lalu dari [MEMORI JANGKA PANJANG PENGGUNA].
        - Jika [LOG AKTIVITAS TERBARU YANG SUDAH DICAPAI] kosong/tidak ada data, kembalikan array kosong [].
        4. **PersonalizedQuestion**: Buat 1 pertanyaan santai dan terarah agar user mudah merespons via rekaman suara.

        FORMAT OUTPUT (HANYA JSON VALID):
        {{
        ""periodLabel"": ""string"",
        ""briefDigest"": ""string"",
        ""itemsToClarify"": [
            {{
            ""activityId"": ""int"",
            ""keyTopic"": ""string"",
            ""contextNote"": ""string alasan mengapa ini perlu dikonfirmasi"",
            ""type"": ""Maintenance"" | ""Project"" | ""Habit""
            }}
        ],
        ""winsAndCompletions"": [
            ""string ringkasan pencapaian""
        ],
        ""personalizedQuestion"": ""string""
        }}";

    public static string BuildReflectionCompilerPrompt(string userTranscript, string presentedContextJson, string memoryUser, DateTime currentTimestampUtc) =>
    $$"""
        Anda adalah AI Reflection & Execution Engine.
        Tugas Anda adalah memproses hasil transkrip suara pengguna dan menyinkronkannya dengan konteks yang ditampilkan kepada pengguna.
        Waktu saat ini UTC (Anchor) : {{currentTimestampUtc}}

        [KONTEKS YANG DITAMPILKAN KEPADA PENGGUNA]
        {{presentedContextJson}}

        [KATALOG MEMORI AKTIF PENGGUNA (Gunakan ID ini jika topik yang dibahas cocok)]
        {{memoryUser}}

        [TRANSKRIP SUARA PENGGUNA]
        "{{userTranscript}}"

        INSTRUKSI PEMROSESAN:
        1. Penyelarasan & Resolusi Rujukan:
            - Cocokkan pernyataan pengguna dengan item pada 'ItemsToClarify' atau ringkasan yang ditampilkan.
            - Pahami rujukan relatif (misal: merujuk pada urutan item atau topik terkait).

        2. Koreksi & Ralat Mandiri (Speech Self-Repair):
            - Jika pengguna salah bicara atau meralat ucapannya di tengah kalimat, abaikan kata yang keliru dan ambil pernyataan final setelah ralat.

        3. Pengayaan Detail & Perluasan Cakupan (Detail Enrichment):
            - Jika ada rincian tambahan, pekerjaan sampingan yang menyertai, atau hasil di luar rencana awal, JANGAN buat tugas baru terpisah. Gabungkan seluruh rincian tersebut ke dalam 'note' pada aktivitas dan 'details' pada memori.
            - Jika ada perbedaan waktu riil pelaksanaan dengan rencana awal, gunakan waktu riil tersebut untuk mengisi 'actualCompletedDate'.

        4. Format Tindakan Aktivitas (ActivityActions):
            - 'MarkCompleted': Menyelesaikan aktivitas dengan menyertakan 'actualCompletedDate' yang presisi serta 'note' yang memuat semua rincian eksekusi.
            - 'Reschedule': Menggeser waktu aktivitas ke jadwal baru yang disebutkan beserta alasannya pada 'note'.
                Aturan Tindakan 'Reschedule':
                - Jika pengguna menyebut waktu pasti (misal: "besok sore", "Senin depan jam 10"): Hitung tanggal dan jam tersebut secara presisi.
                - Jika pengguna ragu/tidak menyebut tanggal pasti (misal: "tunda dulu", "belum sempat", "nanti aja"): Otomatis jadwalkan ke esok hari (H+1) dari waktu saat ini, gunakan jam yang sama dengan jadwal sebelumnya atau default pukul 09:00 UTC.
            - 'Cancel': Membatalkan rencana yang dinyatakan tidak jadi dikerjakan.
            - 'CreateNew': HANYA digunakan jika pengguna secara eksplisit menyebutkan rencana/agenda terpisah yang benar-benar baru untuk dikerjakan di masa depan.
                - Batasi pemrosesan maksimal 15 entitas kegiatan per prompt; prioritaskan urutan waktu terdekat dan abaikan agenda tambahan di luar batas tersebut.
                'newScheduledTime' : Terjemahkan waktu lokal pengguna ke format ISO 8601 UTC ('YYYY-MM-DDTHH:mm:ssZ')
                'newTaskCategory': Pilih SATU kategori yang paling tepat dari daftar berikut:
                - 'Productivity' (pekerjaan, tugas kantor, meeting, deadline)
                - 'Learning' (belajar, membaca, kursus, riset)
                - 'Health' (olahraga, makan, istirahat, dokter, obat)
                - 'Personal' (keluarga, belanja, ibadah, hobi, urusan pribadi)
                - 'General' (lainnya)

        5. ATURAN PEMBARUAN MEMORI (memoryUpdates):
            - JANGAN MEMBUAT MEMORI BARU JIKA TOPIK SUDAH ADA.
            - Jika memperbarui topik yang sudah ada di [KONTEKS YANG DITAMPILKAN], Anda WAJIB menggunakan nilai 'subject' dan 'key' yang PERSIS SAMA seperti yang tertera pada [KATALOG MEMORI AKTIF PENGGUNA].
            - HANYA buat 'subject' dan 'key' baru jika pengguna menceritakan hal/proyek/kebiasaan yang benar-benar baru dan belum pernah ada di memori sebelumnya.

        6. Penanganan Item yang Tidak Disebutkan (Ignored / Omitted Items):
            - Jika suatu item pada 'itemsToClarify' TIDAK DISEBUTKAN sama sekali oleh pengguna dalam transkrip suara, JANGAN masukkan item tersebut ke dalam 'activityAdjustments' maupun 'memoryUpdates'.
            - JANGAN berasumsi bahwa item tersebut sudah selesai atau dibatalkan. Biarkan sistem backend mempertahankan status aslinya.

        FORMAT OUTPUT (HANYA JSON VALID SESUAI SKEMA BERIKUT):
        {
        "feedbackText": "string kalimat respon yang hangat, ringkas, dan merangkum penyesuaian yang dilakukan",
        "activityAdjustments": [
            {
            "actionType": "MarkCompleted | Reschedule | Cancel | CreateNew",
            "targetActivityId": "int",
            "targetActivityTitle": "string",
            "actualCompletedDate": "YYYY-MM-DDTHH:mm:ssZ",
            "newScheduledTime": "YYYY-MM-DDTHH:mm:ssZ",
            "newTaskTitle": "string",
            "newTaskCategory": "string",
            "newStatus": ""Completed" untuk kegiatan yang sudah dilaksanakan || "Pending" untuk jadwal baru",
            "note": "string seluruh rincian tambahan, kendala, atau hasil eksekusi"
            }
        ],
        "memoryUpdates": [
            {
              "memoryId": 0, // WAJIB diisi ID dari KATALOG jika topik sama, atau null jika benar-benar baru
              "relatedActivityId": 0, // ID aktivitas yang selesai jika berkaitan, atau null
              "subject": "string",
              "key": "string",
              "memoryType": "Cyclic | Routine | Project | Preference | State",
              "value": {
                "currentStatus": "Completed | Ongoing | Scheduled | Cancelled",
                "details": "string rangkuman lengkap",
                "lastExecutedAt": "YYYY-MM-DD",
                "nextProjectedAt": "YYYY-MM-DD"
              },
              "confidence": 1.0
            }
          ]
        }
        """;

}
