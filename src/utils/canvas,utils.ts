import { createCanvas, loadImage } from 'canvas';

class CanvasUtils {
    
    static async createMemberCard(data: { memberId: string; memberName: string; }): Promise<Buffer> {
        // Ukuran Kartu Kredit Standar: 3.375 inci x 2.125 inci (resolusi 300 DPI)
        const width = 1000; // Lebar dalam piksel
        const height = 630; // Tinggi dalam piksel

        // Membuat kanvas baru
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // --- Template Desain ---

        // 1. Latar Belakang (Gradient biru-hijau)
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#1E3A8A'); // Biru Tua
        gradient.addColorStop(1, '#059669'); // Hijau Kebiruan
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Efek Garis Diagonal (Elemen Estetika)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        for (let i = 0; i < width + height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(0, i);
            ctx.stroke();
        }

        // 3. Header Judul
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px Inter';
        ctx.textAlign = 'left';
        ctx.fillText('MEMBER CARD PREMIUM', 50, 80);

        // 4. Detail Anggota

        // ID Anggota
        ctx.font = '30px Inter';
        ctx.fillStyle = '#E5E7EB'; // Abu-abu Terang
        ctx.fillText('ID Anggota:', 50, 200);

        ctx.font = 'bold 45px Inter';
        ctx.fillStyle = '#FBBF24'; // Kuning Emas
        ctx.fillText(data.memberId, 50, 250);

        // Nama Anggota
        ctx.font = '30px Inter';
        ctx.fillStyle = '#E5E7EB';
        ctx.fillText('Nama:', 50, 350);

        ctx.font = 'bold 55px Inter';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(data.memberName.toUpperCase(), 50, 410);

        // Level Keanggotaan
        // ctx.font = 'italic 30px Inter';
        // ctx.fillStyle = '#A7F3D0'; // Hijau Mint
        // ctx.textAlign = 'right';
        // ctx.fillText(`Level: ${data.memberLevel}`, width - 50, height - 50);


        // 5. Placeholder Logo (Gunakan gambar dummy jika perlu)
        // Di sini kita bisa menambahkan logo atau elemen visual lainnya.
        // ctx.drawImage(logoImage, 800, 50, 150, 150);

        // Kembalikan gambar sebagai Buffer
        return canvas.toBuffer('image/png');
    }

}

export default CanvasUtils;
