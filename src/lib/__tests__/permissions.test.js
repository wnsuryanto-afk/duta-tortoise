import { describe, it, expect } from 'vitest';
import {
  ROLE_LABELS, NAV_ACCESS, canAccess, getPerms,
  canPerformAction, isOwner, isManagerLevel,
} from '@/lib/permissions';
import { NAV_SECTIONS, SETTINGS_ITEMS, EXTRA_DESTINATIONS } from '@/lib/navigation';

const ROLES = Object.keys(NAV_ACCESS);

const ALL_NAV_ITEMS = [
  ...NAV_SECTIONS.flatMap((s) => s.items),
  ...SETTINGS_ITEMS,
  ...EXTRA_DESTINATIONS,
];

describe('struktur role', () => {
  it('setiap role di NAV_ACCESS punya label', () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role], `label untuk role "${role}"`).toBeTruthy();
    }
  });

  it('owner melihat paling banyak section dari semua role', () => {
    const jumlah = Object.fromEntries(ROLES.map((r) => [r, NAV_ACCESS[r].length]));
    for (const role of ROLES.filter((r) => r !== 'owner')) {
      expect(jumlah.owner).toBeGreaterThanOrEqual(jumlah[role]);
    }
  });

  it('tidak ada section duplikat dalam daftar akses satu role', () => {
    for (const role of ROLES) {
      const list = NAV_ACCESS[role];
      expect(new Set(list).size, `duplikat di NAV_ACCESS.${role}`).toBe(list.length);
    }
  });
});

describe('setiap menu bisa dijangkau', () => {
  // Ini penjaga regresi. Sejak hak akses ditegakkan di level rute, sebuah
  // section yang punya entri menu tapi tidak pernah terdaftar di NAV_ACCESS
  // membuat halamannya terkunci untuk SEMUA orang — bukan sekadar
  // tersembunyi dari menu.
  it('setiap section yang punya entri menu dimiliki minimal satu role', () => {
    const dimiliki = new Set(Object.values(NAV_ACCESS).flat());
    const yatim = [...new Set(ALL_NAV_ITEMS.map((i) => i.section))]
      .filter((s) => !dimiliki.has(s));
    expect(yatim, 'section punya menu tapi tak dimiliki role mana pun').toEqual([]);
  });

  it('owner bisa mengakses setiap halaman yang ada di menu', () => {
    const tak_terjangkau = ALL_NAV_ITEMS
      .filter((i) => !canAccess('owner', i.section))
      .map((i) => `${i.path} (${i.section})`);
    expect(tak_terjangkau).toEqual([]);
  });
});

describe('canAccess', () => {
  it('mengembalikan false untuk role yang tidak dikenal', () => {
    expect(canAccess('tukang_kebun', 'tortoise')).toBe(false);
    expect(canAccess(undefined, 'tortoise')).toBe(false);
  });

  it('mengembalikan false untuk section yang tidak dikenal', () => {
    expect(canAccess('owner', 'section-karangan')).toBe(false);
  });

  it('keeper tidak bisa mengakses area keuangan dan kepegawaian', () => {
    for (const section of ['finance', 'payroll', 'hr', 'users', 'sales']) {
      expect(canAccess('keeper', section), `keeper -> ${section}`).toBe(false);
    }
  });

  it('keeper tetap bisa mengakses pekerjaan lapangannya', () => {
    for (const section of ['sop', 'health', 'treatment', 'pakan-harian']) {
      expect(canAccess('keeper', section), `keeper -> ${section}`).toBe(true);
    }
  });
});

describe('getPerms', () => {
  it('menutup semua aksi untuk role tak dikenal', () => {
    expect(getPerms('hantu', 'tortoise')).toEqual({
      canCreate: false, canEdit: false, canDelete: false,
      canViewPrice: false, canViewSales: false,
    });
  });

  it('menutup semua aksi untuk section yang belum diatur', () => {
    const p = getPerms('owner', 'section-yang-belum-ada');
    expect(Object.values(p).every((v) => v === false)).toBe(true);
  });

  it('owner boleh membuat dan mengubah data kura', () => {
    const p = getPerms('owner', 'tortoise');
    expect(p.canCreate).toBe(true);
    expect(p.canEdit).toBe(true);
  });

  it('investor tidak boleh mengubah apa pun', () => {
    for (const section of ['tortoise', 'breeding', 'health', 'sales', 'finance']) {
      const p = getPerms('investor', section);
      expect(p.canCreate, `investor create ${section}`).toBe(false);
      expect(p.canEdit, `investor edit ${section}`).toBe(false);
      expect(p.canDelete, `investor delete ${section}`).toBe(false);
    }
  });
});

describe('canPerformAction', () => {
  it('sejalan dengan getPerms', () => {
    const p = getPerms('owner', 'tortoise');
    expect(canPerformAction('owner', 'tortoise', 'create')).toBe(p.canCreate);
    expect(canPerformAction('owner', 'tortoise', 'delete')).toBe(p.canDelete);
  });

  it('menolak aksi yang tidak dikenal', () => {
    expect(canPerformAction('owner', 'tortoise', 'meledakkan')).toBe(false);
  });
});

describe('helper role', () => {
  it('isOwner hanya untuk owner', () => {
    expect(isOwner('owner')).toBe(true);
    expect(isOwner('admin')).toBe(false);
  });

  it('isManagerLevel mencakup owner, admin, manajer', () => {
    expect(['owner', 'admin', 'manajer'].every(isManagerLevel)).toBe(true);
    expect(['keeper', 'kepala_feeder', 'investor'].some(isManagerLevel)).toBe(false);
  });
});
