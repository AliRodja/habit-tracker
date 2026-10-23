import { describe, expect, it } from "vitest";
import { buildImportPlan, detectFormat, parseImportText, type ExistingState } from "@/lib/io/plan";
import { exportFile, habit, record } from "./io-helpers";

const today = "2026-10-23";
const none: ExistingState = { habits: [], recordKeys: new Set(), maxActive: 5 };
const local = (habits: { id: string; name: string; isActive?: boolean }[], keys: string[] = []): ExistingState => ({
  habits: habits.map((h) => ({ isActive: true, ...h })),
  recordKeys: new Set(keys),
  maxActive: 5,
});
const json = (file: object) => JSON.stringify(file);
const plan = (text: string, filename: string, existing: ExistingState, mode: "merge" | "replace" = "merge") =>
  buildImportPlan(parseImportText(text, filename), existing, mode, today);

describe("detectFormat", () => {
  it("memakai ekstensi, lalu isi berkas", () => {
    expect(detectFormat("", "a.JSON")).toBe("json");
    expect(detectFormat("{}", "a.csv")).toBe("csv");
    expect(detectFormat('  {"a":1}', "data.txt")).toBe("json");
    expect(detectFormat("date,habit_id", "data.txt")).toBe("csv");
  });
});

describe("JSON: validasi skema (TC-18)", () => {
  it("berkas rusak menghasilkan satu galat berkas dan tidak dapat diterapkan", () => {
    const p = plan("{ bukan json", "x.json", none);
    expect(p.canApply).toBe(false);
    expect(p.issues).toEqual([{ scope: "file", row: null, message: "Berkas bukan JSON yang valid." }]);
  });

  it("berkas bukan milik aplikasi ini atau versi tidak didukung", () => {
    const wrongApp = plan(json({ app: "lain", schemaVersion: 1, habits: [], records: [] }), "x.json", none);
    expect(wrongApp.issues[0].message).toMatch(/bukan berkas ekspor Daily Habit Tracker/);
    const wrongVersion = plan(json({ app: "daily-habit-tracker", schemaVersion: 2, habits: [], records: [] }), "x.json", none);
    expect(wrongVersion.issues[0].message).toMatch(/schemaVersion 1 saja/);
  });

  it("galat per baris dilaporkan semuanya dengan nomor baris dan nama field", () => {
    const bad = exportFile(
      [habit("a", "OK"), { ...habit("b", ""), color: "magenta" as never }, habit("c", "Salah", { isActive: false })],
      [record("a", "2026-02-30"), record("a", "2026-10-01", { note: "x".repeat(201) })],
    );
    const messages = plan(json(bad), "x.json", none).issues.map((i) => `${i.scope}#${i.row}: ${i.message}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^habit#2: name: nama wajib diisi/),
        expect.stringMatching(/^habit#2: color: warna harus salah satu dari/),
        expect.stringMatching(/^habit#3: archivedAt: habit aktif tidak boleh/),
        expect.stringMatching(/^record#1: date: tanggal tidak valid/),
        expect.stringMatching(/^record#2: note: catatan maksimal 200 karakter/),
      ]),
    );
  });

  it("berkas kosong (tanpa habit dan catatan) ditolak", () => {
    const p = plan(json(exportFile([], [])), "x.json", none);
    expect(p.canApply).toBe(false);
    expect(p.issues[0].message).toMatch(/tidak berisi habit maupun catatan/);
  });
});

describe("JSON: aturan bisnis", () => {
  it("menghitung habit dan catatan baru vs diperbarui pada mode Gabung", () => {
    const file = exportFile([habit("a", "A"), habit("b", "B", { orderIndex: 1 })], [record("a", "2026-10-01"), record("a", "2026-10-02"), record("b", "2026-10-01")]);
    const p = plan(json(file), "x.json", local([{ id: "a", name: "A" }, { id: "z", name: "Z" }], ["a|2026-10-01"]));
    expect(p.canApply).toBe(true);
    expect(p.counts).toEqual({
      habits: { total: 2, created: 1, updated: 1 },
      records: { total: 3, created: 2, updated: 1 },
      activeAfter: 3, // a, b dari berkas + z lokal
    });
  });

  it("mode Ganti: semuanya dianggap baru dan data lokal tidak dihitung", () => {
    const file = exportFile([habit("a", "A")], [record("a", "2026-10-01")]);
    const p = plan(json(file), "x.json", local([{ id: "a", name: "A" }, { id: "z", name: "Z" }], ["a|2026-10-01"]), "replace");
    expect(p.counts).toEqual({ habits: { total: 1, created: 1, updated: 0 }, records: { total: 1, created: 1, updated: 0 }, activeAfter: 1 });
  });

  it("FR-19.6: lebih dari 5 habit aktif ditolak dengan petunjuk penyesuaian", () => {
    const six = ["a", "b", "c", "d", "e", "f"].map((id, i) => habit(id, id.toUpperCase(), { orderIndex: i }));
    const replace = plan(json(exportFile(six, [])), "x.json", none, "replace");
    expect(replace.canApply).toBe(false);
    expect(replace.issues[0].message).toMatch(/6 habit aktif \(batas 5\).*nonaktif/);

    // Pada mode Gabung, habit lokal ikut dihitung.
    const merge = plan(json(exportFile([habit("n1", "N1"), habit("n2", "N2")], [])), "x.json", local([1, 2, 3, 4].map((n) => ({ id: `l${n}`, name: `L${n}` }))));
    expect(merge.canApply).toBe(false);
    expect(merge.issues[0].message).toMatch(/6 habit aktif \(batas saat ini 5\).*mode Ganti/);
  });

  it("batas mengikuti Pengaturan: Gabung memakai batas lokal yang berlaku", () => {
    const six = ["a", "b", "c", "d", "e", "f"].map((id, i) => habit(id, id.toUpperCase(), { orderIndex: i }));
    expect(plan(json(exportFile(six, [])), "x.json", { ...none, maxActive: 6 }).canApply).toBe(true);
    const tooMany = plan(json(exportFile(six, [])), "x.json", { ...none, maxActive: 4 });
    expect(tooMany.issues[0].message).toMatch(/6 habit aktif \(batas saat ini 4\).*Naikkan batasnya di Pengaturan/);
  });

  it("mode Ganti dengan pengaturan di berkas memakai batas dari berkas", () => {
    const six = ["a", "b", "c", "d", "e", "f"].map((id, i) => habit(id, id.toUpperCase(), { orderIndex: i }));
    const withLimit = (maxActiveHabits?: string) => json(exportFile(six, [], { settings: maxActiveHabits ? { maxActiveHabits } : { theme: "dark" } }));
    expect(plan(withLimit("6"), "x.json", none, "replace").canApply).toBe(true);
    // Pengaturan di berkas tanpa maxActiveHabits mengembalikan batas ke bawaan 5, meski batas lokal 10.
    expect(plan(withLimit(), "x.json", { ...none, maxActive: 10 }, "replace").canApply).toBe(false);
    expect(plan(json(exportFile(six, [], { settings: { maxActiveHabits: "11" } })), "x.json", none, "replace").issues[0].message).toMatch(/maxActiveHabits harus angka 1–10/);
  });

  it("habit nonaktif tidak dihitung terhadap batas 5", () => {
    const habits = ["a", "b", "c", "d", "e"].map((id, i) => habit(id, id, { orderIndex: i }));
    habits.push(habit("old", "Lama", { isActive: false, archivedAt: "2026-05-01" }));
    expect(plan(json(exportFile(habits, [])), "x.json", none, "replace").canApply).toBe(true);
  });

  it("nama habit aktif ganda ditolak tanpa peka huruf besar/kecil", () => {
    const p = plan(json(exportFile([habit("a", "Minum Air"), habit("b", "minum air")], [])), "x.json", none, "replace");
    expect(p.canApply).toBe(false);
    expect(p.issues.map((i) => i.message).join(" | ")).toMatch(/nama "minum air" sudah dipakai/);
  });

  it("id habit ganda dan catatan ganda ditolak", () => {
    const p = plan(
      json(exportFile([habit("a", "Satu"), habit("a", "Dua")], [record("a", "2026-10-01"), record("a", "2026-10-01")])),
      "x.json",
      none,
      "replace",
    );
    const text = p.issues.map((i) => i.message).join(" | ");
    expect(text).toMatch(/id "a" muncul lebih dari sekali/);
    expect(text).toMatch(/duplikat dengan baris 1/);
  });

  it("mode Gabung: nama bentrok dengan habit lokal berbeda id ditolak", () => {
    const p = plan(json(exportFile([habit("baru", "Minum Air")], [])), "x.json", local([{ id: "lama", name: "minum air" }]));
    expect(p.canApply).toBe(false);
  });

  it("catatan untuk habit tak dikenal atau tanggal masa depan ditolak", () => {
    const p = plan(json(exportFile([habit("a", "A")], [record("x", "2026-10-01"), record("a", "2026-10-24")])), "x.json", none);
    expect(p.issues.map((i) => i.message)).toEqual(['habitId "x" tidak dikenal', "tanggal 2026-10-24 berada di masa depan"]);
  });

  it("catatan boleh merujuk habit lokal pada mode Gabung, tetapi tidak pada mode Ganti", () => {
    const file = json(exportFile([], [record("lokal", "2026-10-01")]));
    expect(plan(file, "x.json", local([{ id: "lokal", name: "L" }])).canApply).toBe(true);
    expect(plan(file, "x.json", local([{ id: "lokal", name: "L" }]), "replace").canApply).toBe(false);
  });

  it("catatan sebelum tanggal mulai tetap diterima (FR-02 mempertahankan catatan lama)", () => {
    const file = exportFile([habit("a", "A", { startDate: "2026-10-15" })], [record("a", "2026-10-01")]);
    expect(plan(json(file), "x.json", none, "replace").canApply).toBe(true);
  });

  it("pengaturan hanya diterapkan pada mode Ganti", () => {
    const file = json(exportFile([habit("a", "A")], [], { settings: { timezone: "Asia/Makassar", theme: "dark" } }));
    expect(plan(file, "x.json", none, "replace").settings).toEqual({ timezone: "Asia/Makassar", theme: "dark" });
    expect(plan(file, "x.json", none, "merge").settings).toBeNull();
    const badTz = json(exportFile([habit("a", "A")], [], { settings: { timezone: "Mars/Olympus" } }));
    expect(plan(badTz, "x.json", none, "replace").canApply).toBe(false);
  });
});

describe("CSV", () => {
  const csv = (lines: string[]) => ["date,habit_id,habit_name,completed,note", ...lines].join("\n");

  it("mode Ganti ditolak dengan penjelasan", () => {
    const p = plan(csv(["2026-10-01,a,A,1,"]), "x.csv", local([{ id: "a", name: "A" }]), "replace");
    expect(p.canApply).toBe(false);
    expect(p.issues[0].message).toMatch(/hanya mendukung mode Gabung/);
  });

  it("mencocokkan habit lewat id, lalu lewat nama (tidak peka huruf besar/kecil)", () => {
    const p = plan(csv(["2026-10-01,a,Apapun,1,", "2026-10-02,,minum air,0,sakit"]), "x.csv", local([{ id: "a", name: "A" }, { id: "w", name: "Minum Air" }]));
    expect(p.canApply).toBe(true);
    expect(p.records).toEqual([
      { habitId: "a", date: "2026-10-01", completed: true, note: null },
      { habitId: "w", date: "2026-10-02", completed: false, note: "sakit" },
    ]);
  });

  it("nama didahulukan pada habit aktif bila ada nama ganda", () => {
    const p = plan(csv(["2026-10-01,,Sama,1,"]), "x.csv", local([{ id: "arsip", name: "Sama", isActive: false }, { id: "aktif", name: "Sama" }]));
    expect(p.records[0].habitId).toBe("aktif");
  });

  it("habit tak dikenal, tanggal masa depan, dan duplikat dilaporkan per baris; satu galat memblokir semuanya", () => {
    const p = plan(csv(["2026-10-01,a,A,1,", "2026-10-01,a,A,0,", "2026-10-02,zzz,Zzz,1,", "2026-10-30,a,A,1,"]), "x.csv", local([{ id: "a", name: "A" }]));
    expect(p.canApply).toBe(false);
    expect(p.issues.map((i) => [i.row, i.message])).toEqual([
      [3, "duplikat dengan baris 2 (habit dan tanggal sama)"],
      [4, 'habit "Zzz" tidak ditemukan di data lokal'],
      [5, "tanggal 2026-10-30 berada di masa depan"],
    ]);
  });

  it("menghitung catatan baru vs diperbarui", () => {
    const p = plan(csv(["2026-10-01,a,A,1,", "2026-10-02,a,A,1,"]), "x.csv", local([{ id: "a", name: "A" }], ["a|2026-10-01"]));
    expect(p.counts.records).toEqual({ total: 2, created: 1, updated: 1 });
    expect(p.counts.habits.total).toBe(0);
  });
});
