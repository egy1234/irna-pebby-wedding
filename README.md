# Undangan Pernikahan Irna & Peby

Undangan digital satu halaman berbahasa Indonesia, dibuat dengan React dan Vite. Mencakup layar pembuka amplop animatif, efek kilau saat halaman disentuh, tema terang/gelap, bunga animasi di seluruh layar, musik MP3 yang dimulai melalui tombol pengunjung, hitung mundur, informasi acara, halaman lokasi dengan peta dan petunjuk Google Maps, konfirmasi kehadiran, surat ucapan interaktif, serta informasi transfer.

Ikon antarmuka menggunakan Bootstrap Icons melalui paket `bootstrap-icons`. Petunjuk arah tersedia melalui Google Maps dan Apple Maps; tautan Apple Maps membuka aplikasi Maps di iPhone jika tersedia.

Pratinjau tautan memakai metadata Open Graph/Twitter pada `index.html` dan foto yang sama dengan latar hero. Agar pratinjau muncul, situs harus sudah di-deploy ke URL publik yang dapat diakses crawler; setelah memperbarui metadata, platform berbagi mungkin perlu waktu untuk memperbarui cache pratinjau.

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

Formulir RSVP dan ucapan mengirim data JSON sebagai `text/plain` ke Google Apps Script melalui URL Web App di `src/App.jsx`, dengan `mode: 'no-cors'` agar browser mengirim POST tanpa mencoba membaca respons lintas origin. Karena respons POST tidak dapat dibaca browser, konfirmasi tulis tetap tidak dapat diverifikasi dari frontend.

Payload yang dikirim:

- RSVP: `{ action: 'rsvp', nama, kehadiran, jumlahTamu }`
- Ucapan: `{ action: 'greeting', namaPengirim, pesan }`

Apps Script harus memiliki `doPost(e)`, mengurai `e.postData.contents` sebagai JSON, dan memproses kedua action. Agar semua tamu melihat ucapan yang sama, tambahkan endpoint JSONP `doGet(e)` berikut ke proyek Apps Script. Baris pertama tab `Ucapan` harus berisi header dan kolom berikutnya berurutan: `id | nama_pengirim | pesan | waktu_kirim`.

```js
function doGet(e) {
  const callback = e.parameter.callback || '';
  const jsonp = (result) => {
    if (!callback) return responseJSON(result);
    if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
      return responseJSON({ status: 'error', message: 'Callback tidak valid' });
    }
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(result)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  };
  try {
    if (e.parameter.action !== 'getGreetings') {
      return jsonp({ status: 'error', message: 'Aksi tidak dikenal' });
    }
    return jsonp({ status: 'success', data: ambilUcapan() });
  } catch (error) {
    return jsonp({ status: 'error', message: String(error) });
  }
}
```

Setelah menyimpan script, buka **Deploy → Manage deployments → Edit → New version → Deploy**. Pastikan akses Web App mengizinkan siapa saja membuka undangan membaca daftar ucapan. Frontend memuat data bersama saat undangan dibuka dan menyegarkannya saat panel ucapan dibuka. Endpoint baca ini membuat nama dan isi ucapan dapat dibaca publik, sesuai tujuan menampilkannya ke semua tamu.

Nama undangan tampil otomatis pada halaman pembuka dan terisi pada formulir RSVP dari parameter URL `?to=Nama%20Tamu`. Contoh: `https://alamat-undangan/?to=Budi`.

Untuk membuat tautan personal bagi satu atau banyak tamu, buka halaman `/buat-tautan` pada website, masukkan satu nama per baris, lalu pilih **Buat tautan**. Tautan dapat disalin satu per satu, disalin semua, atau diunduh sebagai CSV. Nama yang dimasukkan hanya diproses di browser dan tidak disimpan oleh website.

Alternatifnya, di Google Sheets simpan nama di kolom A mulai dari A2, lalu gunakan rumus berikut di B2 dan tarik ke bawah. Ganti URL contoh dengan URL website yang sudah dipublikasikan.

```text
=HYPERLINK("https://alamat-undangan.com/?to="&ENCODEURL(A2);"Buka undangan untuk "&A2)
```
