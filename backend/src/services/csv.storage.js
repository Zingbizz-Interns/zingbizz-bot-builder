// services/csv.storage.js
// CSV-based storage for admission form submissions.
// Stores data in data/admissions.csv, supports appending and phone-based lookup.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CSV_PATH = path.join(DATA_DIR, 'admissions.csv');

const CSV_HEADERS = [
  'phone',
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

/**
 * Escape a value for CSV (handles commas, quotes, newlines).
 */
function escapeCSV(value) {
  const str = String(value || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parse a single CSV line into an array of values.
 * Handles quoted fields with commas and escaped quotes.
 */
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
          i++; // skip escaped quote
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

/**
 * Ensure the data directory and CSV file exist, creating the header row if needed.
 */
function ensureCSV() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, CSV_HEADERS.join(',') + '\n', 'utf8');
  }
}

/**
 * Append an admission record to the CSV file.
 * @param {string} phone - sender phone number
 * @param {object} formData - the completed form data
 */
function saveAdmission(phone, formData) {
  ensureCSV();

  const row = CSV_HEADERS.map((header) => {
    if (header === 'phone') return escapeCSV(phone);
    if (header === 'submittedAt') return escapeCSV(new Date().toISOString());
    return escapeCSV(formData[header] || '');
  });

  fs.appendFileSync(CSV_PATH, row.join(',') + '\n', 'utf8');
  console.log(`💾 [CSV] Admission saved for phone ${phone}`);
}

/**
 * Get all admissions for a given phone number.
 * @param {string} phone
 * @returns {Array<object>} Array of admission records
 */
function getAdmissionsByPhone(phone) {
  ensureCSV();

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length <= 1) return []; // only header or empty

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values[0] === phone) {
      const record = {};
      CSV_HEADERS.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      results.push(record);
    }
  }

  return results;
}

module.exports = { saveAdmission, getAdmissionsByPhone };
