
export const STORY_ASPECT_RATIO = "aspect-[9/16]";
export const PRIMARY_BLUE = "#0D4D8A";

// Menggunakan format MP3 yang lebih kompatibel (Wikimedia Transcoded)
export const NEWS_INTRO_AUDIO_URL = "https://upload.wikimedia.org/wikipedia/commons/transcoded/5/5e/En-us-news.ogg/En-us-news.ogg.mp3";

export const SYSTEM_PROMPT = `
Kamu adalah asisten yang mengekstraksi data dari artikel berita untuk ditampilkan dalam format story 9:16.
Bagian atas story menggunakan gambar berita berorientasi HORIZONTAL (landscape).

Tugasmu:
1. Baca artikel dari URL yang diberikan.
2. Ambil:
   - "image_url": foto utama artikel dalam ukuran HORIZONTAL. 
       - Jika artikel memiliki beberapa gambar, pilih gambar landscape yang paling utama.
       - Jangan mengubah orientasi, jangan crop, jangan meresize — biarkan apa adanya.
   - Jika artikel TIDAK memiliki foto sama sekali:
       - Isi "image_url" dengan null.
       - Isi "generated_image_prompt" dengan deskripsi gambar AI BENTUK HORIZONTAL (landscape).
   - "title": judul asli artikel, utuh 100% tanpa dipotong.
   - "paragraphs": HARUS ADA TEPAT 3 PARAGRAF.
       - Ambil 3 paragraf pertama dari artikel.
       - Jika artikel pendek (kurang dari 3 paragraf), PECAH paragraf yang ada atau ambil kalimat berikutnya agar MENJADI 3 BAGIAN TERPISAH.
       - Paragraf ke-3 TIDAK BOLEH KOSONG.
       - Gunakan Bahasa Indonesia.
   - "source": URL berita.

Output HANYA dalam format JSON valid:
{
  "image_url": "...",
  "generated_image_prompt": "...",
  "title": "...",
  "paragraphs": ["...", "...", "..."],
  "source": "..."
}
`;
