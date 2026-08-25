import { describe, it, expect } from 'vitest';
import { getSalam, workDuration } from '@/lib/guidedUtils';

const jam = (h, m = 0) => new Date(2026, 6, 15, h, m, 0, 0);

describe('getSalam', () => {
  it('memilih sapaan sesuai jam', () => {
    expect(getSalam(jam(6))).toBe('Selamat pagi');
    expect(getSalam(jam(12))).toBe('Selamat siang');
    expect(getSalam(jam(16))).toBe('Selamat sore');
    expect(getSalam(jam(21))).toBe('Selamat malam');
  });

  it('tepat di batas jam berpindah ke sapaan berikutnya', () => {
    expect(getSalam(jam(10, 59))).toBe('Selamat pagi');
    expect(getSalam(jam(11))).toBe('Selamat siang');
    expect(getSalam(jam(14, 59))).toBe('Selamat siang');
    expect(getSalam(jam(15))).toBe('Selamat sore');
    expect(getSalam(jam(17, 59))).toBe('Selamat sore');
    expect(getSalam(jam(18))).toBe('Selamat malam');
  });

  it('selalu mengembalikan sapaan, jam berapa pun', () => {
    for (let h = 0; h < 24; h++) {
      expect(getSalam(jam(h))).toMatch(/^Selamat /);
    }
  });
});

describe('workDuration', () => {
  it('menampilkan menit saja bila belum genap sejam', () => {
    expect(workDuration('07:00', jam(7, 45))).toBe('45 menit');
  });

  it('menampilkan jam dan menit setelah lewat sejam', () => {
    expect(workDuration('07:00', jam(10, 30))).toBe('3 jam 30 menit');
  });

  it('menampilkan 0 menit pada saat baru check-in', () => {
    expect(workDuration('07:00', jam(7, 0))).toBe('0 menit');
  });

  it('tepat sejam ditampilkan sebagai jam, bukan 60 menit', () => {
    expect(workDuration('07:00', jam(8, 0))).toBe('1 jam 0 menit');
  });

  it('mengembalikan null untuk jam check-in yang kosong atau cacat', () => {
    for (const v of [null, undefined, '', 'pagi tadi', '::', '7', '25:00', '07:99', 123]) {
      expect(workDuration(v, jam(10)), `input ${JSON.stringify(v)}`).toBeNull();
    }
  });

  it('mengembalikan null bila jam check-in masih di masa depan', () => {
    // Terjadi bila jam perangkat keeper meleset; lebih baik tidak menampilkan
    // apa-apa daripada menampilkan durasi negatif.
    expect(workDuration('15:00', jam(9))).toBeNull();
  });
});
