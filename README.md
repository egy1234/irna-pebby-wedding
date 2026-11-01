# Undangan Pernikahan Irna & Peby

Undangan digital satu halaman berbahasa Indonesia, dibuat dengan React dan Vite. Mencakup layar pembuka amplop animatif, efek kilau saat halaman disentuh, tema terang/gelap, bunga animasi di seluruh layar, musik MP3 yang dimulai melalui tombol pengunjung, hitung mundur, informasi acara, halaman lokasi dengan peta dan petunjuk Google Maps, konfirmasi kehadiran, surat ucapan interaktif, serta informasi transfer.

Ikon antarmuka menggunakan Bootstrap Icons melalui paket `bootstrap-icons`. Petunjuk arah tersedia melalui Google Maps dan Apple Maps; tautan Apple Maps membuka aplikasi Maps di iPhone jika tersedia.

## Menjalankan aplikasi

```sh
npm install
npm run dev
```

Jalankan `npm run lint` untuk pemeriksaan kode dan `npm run build` untuk membuat versi produksi.

## Menyesuaikan undangan

- Ubah nama pasangan, tanggal, lokasi, dan jadwal acara di `src/App.jsx`.
- File musik yang dipakai tombol musik berada di `public/Nada Serumpun (feat. Yoga Kharisma Putra).mp3`.
- Ubah rekening contoh sebelum undangan dibagikan.
- Ganti foto hero dan gaya halaman melalui `src/App.css` serta `src/index.css`.

Formulir RSVP dan ucapan mengirim data JSON sebagai `text/plain` ke Google Apps Script melalui URL Web App di `src/App.jsx`, dengan `mode: 'no-cors'` agar browser mengirim POST tanpa mencoba membaca respons lintas origin. Karena respons Apps Script menjadi opaque, UI tidak dapat memastikan apakah skrip berhasil menulis data; cek spreadsheet setelah pengiriman. Untuk konfirmasi sukses/gagal yang dapat dibaca frontend, gunakan backend/proxy yang mengizinkan CORS atau pindahkan pemanggilan ke layanan yang menyediakan CORS.

Payload yang dikirim:

- RSVP: `{ action: 'rsvp', nama, kehadiran, jumlahTamu }`
- Ucapan: `{ action: 'greeting', namaPengirim, pesan }`

Apps Script harus memiliki `doPost(e)`, mengurai `e.postData.contents` sebagai JSON, dan memproses kedua action. Daftar amplop ucapan pada UI saat ini hanya berisi ucapan di browser tersebut ditambah ucapan yang baru dikirim; agar semua pesan spreadsheet ditampilkan lintas perangkat, Apps Script juga perlu menyediakan endpoint untuk membaca data.

Nama undangan dapat diisi otomatis dari parameter URL `?to=Nama%20Tamu`. Contoh: `https://alamat-undangan/?to=Budi`.
