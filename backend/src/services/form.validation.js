// services/form.validation.js
// Central validation logic for school-application form inputs.

const { STEPS } = require('./form.service');

const GRADES = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
];

function cleanText(input) {
  return String(input || '').trim().replace(/\s+/g, ' ');
}

function validateName(input, label) {
  const value = cleanText(input);
  const pattern = /^[A-Za-z][A-Za-z .'-]{1,59}$/;

  if (!value) {
    return { isValid: false, reason: `${label} is required.` };
  }

  if (!pattern.test(value)) {
    return {
      isValid: false,
      reason: `${label} must be 2-60 characters and contain only letters, spaces, ., ' or -.`
    };
  }

  return { isValid: true, value };
}

function validateGrade(input) {
  const value = cleanText(input);
  const matched = GRADES.find((g) => g.toLowerCase() === value.toLowerCase());

  if (!matched) {
    return { isValid: false, reason: 'Please select a valid grade from Grade 1 to Grade 10.' };
  }

  return { isValid: true, value: matched };
}

function validateContact(input) {
  const raw = cleanText(input);
  const normalized = raw.replace(/[\s()-]/g, '');
  // Strip optional + or country code prefix, then check for exactly 10 digits
  const digitsOnly = normalized.replace(/^\+?91/, '');
  const pattern = /^\d{10}$/;

  if (!digitsOnly) {
    return { isValid: false, reason: 'Contact number is required.' };
  }

  if (!pattern.test(digitsOnly)) {
    return {
      isValid: false,
      reason: 'Please enter a valid 10-digit contact number.'
    };
  }

  return { isValid: true, value: digitsOnly };
}

function validateEmail(input) {
  const value = cleanText(input).toLowerCase();
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!value) {
    return { isValid: false, reason: 'Email address is required.' };
  }

  if (!pattern.test(value)) {
    return { isValid: false, reason: 'Please enter a valid email address (example: name@email.com).' };
  }

  return { isValid: true, value };
}

function formatDob(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseDob(input) {
  const value = cleanText(input);

  let day;
  let month;
  let year;

  let m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    day = Number(m[1]);
    month = Number(m[2]);
    year = Number(m[3]);
  } else {
    m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      year = Number(m[1]);
      month = Number(m[2]);
      day = Number(m[3]);
    }
  }

  if (!day || !month || !year) {
    return null;
  }

  const dob = new Date(year, month - 1, day);

  // Guard against invalid date rollover (e.g., 31/02/2015)
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return null;
  }

  return dob;
}

function validateDob(input) {
  const dob = parseDob(input);

  if (!dob) {
    return { isValid: false, reason: 'Please enter date of birth in DD/MM/YYYY format.' };
  }

  const today = new Date();
  const ageMs = today.getTime() - dob.getTime();
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);

  if (ageYears < 2 || ageYears > 25) {
    return { isValid: false, reason: 'Date of birth looks invalid for a school application (age should be between 2 and 25).' };
  }

  return { isValid: true, value: formatDob(dob) };
}

function validateYesNo(input) {
  const value = cleanText(input).toUpperCase();

  if (value === 'YES' || value === 'Y') {
    return { isValid: true, value: 'YES' };
  }

  if (value === 'NO' || value === 'N') {
    return { isValid: true, value: 'NO' };
  }

  return { isValid: false, reason: 'Please answer with YES or NO.' };
}

function validateSimpleText(input, label, min = 2, max = 120) {
  const value = cleanText(input);

  if (!value) {
    return { isValid: false, reason: `${label} is required.` };
  }

  if (value.length < min || value.length > max) {
    return { isValid: false, reason: `${label} must be between ${min} and ${max} characters.` };
  }

  return { isValid: true, value };
}

function validateFormInput(step, input) {
  switch (step) {
    case STEPS.STUDENT_NAME:
      return validateName(input, 'Student name');

    case STEPS.GRADE:
      return validateGrade(input);

    case STEPS.PARENT_NAME:
      return validateName(input, 'Parent/guardian name');

    case STEPS.CONTACT:
      return validateContact(input);

    case STEPS.EMAIL:
      return validateEmail(input);

    case STEPS.DOB:
      return validateDob(input);

    case STEPS.PREVIOUS_SCHOOL:
      return validateYesNo(input);

    case STEPS.PREVIOUS_SCHOOL_NAME:
      return validateSimpleText(input, 'Previous school name', 2, 100);

    case STEPS.SPECIAL_REQUIREMENTS:
      return validateYesNo(input);

    case STEPS.SPECIAL_REQUIREMENTS_DETAILS:
      return validateSimpleText(input, 'Special requirements details', 5, 300);

    default:
      return { isValid: true, value: cleanText(input) };
  }
}

module.exports = {
  GRADES,
  validateFormInput,
};
