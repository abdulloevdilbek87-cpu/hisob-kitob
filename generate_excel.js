const XLSX = require('xlsx');
const path = require('path');

// Excel ish kitobini yaratish (Toza shablon, hech qanday ortiqcha do'konlarsiz)
const wb = XLSX.utils.book_new();

const headers = [
  "№",
  "Do'kon Nomi",
  "Mas'ul Shaxs",
  "Telefon",
  "Manzil",
  "Boshlang'ich Qarz (so'm)",
  "Berilgan Tovar (so'm)",
  "To'langan Summa (so'm)",
  "Qoldiq Qarz (so'm)",
  "To'lov Holati",
  "Oxirgi Sana",
  "Eslatma"
];

const rows = [headers];

// 20 ta bo'sh qator tayyorlab qo'yiladi (Formulalari bilan tayyor)
for (let i = 1; i <= 20; i++) {
  const rowNum = i + 1;
  rows.push([
    i,
    "", // Do'kon nomi bo'sh
    "",
    "",
    "",
    0,  // Boshlang'ich qarz
    0,  // Berilgan tovar
    0,  // To'langan summa
    { f: `F${rowNum}+G${rowNum}-H${rowNum}` }, // Qoldiq qarz formulasi
    { f: `IF(B${rowNum}="","",IF(I${rowNum}<=0,"To'langan",IF(H${rowNum}>0,"Qisman to'langan","Qarzdor")))` }, // Holat formulasi
    "",
    ""
  ]);
}

// JAMI SATRI (FORMULALAR BILAN)
const lastDataRow = 21;
rows.push([
  "JAMI:",
  "",
  "",
  "",
  "",
  { f: `SUM(F2:F${lastDataRow})` }, // Jami Boshlang'ich qarz
  { f: `SUM(G2:G${lastDataRow})` }, // Jami Berilgan tovar
  { f: `SUM(H2:H${lastDataRow})` }, // Jami To'langan summa
  { f: `SUM(I2:I${lastDataRow})` }, // Jami Qoldiq qarz
  "",
  "",
  ""
]);

// Worksheet yaratish
const ws = XLSX.utils.aoa_to_sheet(rows);

// Ustun kengliklari
ws['!cols'] = [
  { wch: 6 },  // №
  { wch: 28 }, // Do'kon Nomi
  { wch: 22 }, // Mas'ul Shaxs
  { wch: 18 }, // Telefon
  { wch: 30 }, // Manzil
  { wch: 24 }, // Boshlang'ich Qarz
  { wch: 22 }, // Berilgan Tovar
  { wch: 22 }, // To'langan Summa
  { wch: 20 }, // Qoldiq Qarz
  { wch: 18 }, // Holat
  { wch: 14 }, // Sana
  { wch: 35 }  // Eslatma
];

XLSX.utils.book_append_sheet(wb, ws, "Do'konlar Qarz Hisobi");

// Faylga saqlash
const outputPath = path.join(__dirname, 'Dukonlar_Hisobi_Avtomatlashtirilgan.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`Excel toza shabloni muvaffaqiyatli yaratildi: ${outputPath}`);
