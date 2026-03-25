// services/instagram.csv.storage.js
// CSV-based storage for Instagram admission form submissions.
// Stores data in data/instagram_admissions.csv and supports sender-based lookup.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CSV_PATH = path.join(DATA_DIR, 'instagram_admissions.csv');

const CSV_HEADERS = [
  'senderId',
  'studentName',
  'grade',
  'parentName',
  'contact',
  'email',
  'dob',
  'previousSchool',
  'specialRequirements',
  'submittedAt',
];

function escapeCSV(value) {
  const str = String(value || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  values.push(current);
  return values;
}

function ensureInstagramCSV() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, CSV_HEADERS.join(',') + '\n', 'utf8');
  }
}

function saveInstagramAdmission(senderId, formData) {
  ensureInstagramCSV();

  const row = CSV_HEADERS.map((header) => {
    if (header === 'senderId') return escapeCSV(senderId);
    if (header === 'submittedAt') return escapeCSV(new Date().toISOString());
    return escapeCSV(formData[header] || '');
  });

  fs.appendFileSync(CSV_PATH, row.join(',') + '\n', 'utf8');
  console.log(`💾 [Instagram CSV] Admission saved for sender ${senderId}`);
}

function getInstagramAdmissionsBySenderId(senderId) {
  ensureInstagramCSV();

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length <= 1) return [];

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values[0] === senderId) {
      const record = {};
      CSV_HEADERS.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      results.push(record);
    }
  }

  return results;
}

module.exports = {
  saveInstagramAdmission,
  getInstagramAdmissionsBySenderId,
};
