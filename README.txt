# Kas Pemuda-Pemudi RT 08

Aplikasi web responsif untuk data warga dan kas iuran wajib tahunan.

## Fitur
- Login akun melalui Supabase Auth.
- Dashboard kas, warga, lunas/belum lunas, dan progres iuran.
- Iuran wajib Rp50.000 per warga per tahun.
- Pembayaran dapat dicicil; setiap cicilan disimpan sebagai transaksi.
- Admin dapat menambah/mengubah/menghapus data warga dan mencatat pembayaran.
- Warga hanya dapat melihat data dan transaksi.
- Rekap per warga dan cetak/simpan sebagai PDF dari browser.

## Cara pasang
1. Buat salinan cadangan proyek Supabase yang sudah digunakan.
2. Buka Supabase > SQL Editor > New query.
3. Buka `supabase_setup.sql`, salin seluruh isinya, lalu jalankan.
4. Di Supabase > Authentication > Users, buat akun admin dengan email dan kata sandi.
5. Salin UUID akun admin. Buka SQL Editor, ganti placeholder UUID pada contoh INSERT bagian LANGKAH ADMIN PERTAMA di `supabase_setup.sql`, lalu jalankan perintah INSERT itu (hapus tanda komentar `--` pada baris perintah).
6. Buka `config.js`, isi:
   - `SUPABASE_URL`: Project URL dari Supabase > Project Settings > API.
   - `SUPABASE_ANON_KEY`: anon/public key dari halaman yang sama.
   Jangan gunakan `service_role` key di browser.
7. Upload semua isi folder ini ke hosting static (misalnya Netlify, Vercel static, atau hosting cPanel). Pastikan `index.html`, `styles.css`, `app.js`, dan `config.js` berada di folder publik yang sama.
8. Buka alamat website, login dengan akun admin.

## Membuat akun warga
Buat akun melalui Supabase > Authentication > Users, lalu tambahkan profil role `warga` di SQL Editor:
`insert into public.profiles (id, full_name, role) values ('UUID_USER', 'Nama Warga', 'warga');`
Warga login menggunakan email dan kata sandi yang dibuat admin.

## Catatan keamanan
- Akses tulis dibatasi oleh Row Level Security di database, bukan hanya oleh tampilan aplikasi.
- Anon/public key memang digunakan pada frontend; jangan pernah menaruh service_role key.
- Akun yang belum memiliki baris `profiles` tidak dapat masuk ke aplikasi.
- Aplikasi ini mencatat pembayaran iuran. Pengeluaran kas umum belum dimasukkan pada versi awal.
- Tahun tagihan mengikuti tahun kalender perangkat/server saat aplikasi dibuka. Data pembayaran menyimpan tahun tagihannya.
