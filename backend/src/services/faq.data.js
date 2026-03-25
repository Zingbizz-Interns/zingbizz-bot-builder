// services/faq.data.js
// Pre-built FAQ data: 5 genres × 5 questions with mapped answers.

const FAQ_GENRES = [
  { id: 'fee_structure', title: 'Fee Structure' },
  { id: 'curriculum', title: 'Curriculum & Academics' },
  { id: 'transport', title: 'Transport & Facilities' },
  { id: 'admissions_process', title: 'Admissions Process' },
  { id: 'school_policies', title: 'School Policies' },
];

const FAQ_QUESTIONS = {
  fee_structure: [
    {
      id: 'fee_q1',
      title: 'Tuition fees per year?',
      answer:
        'Our annual tuition fees range from ₹45,000 for Grade 1–5 to ₹65,000 for Grade 6–10. This covers all academic materials and standard activities.',
    },
    {
      id: 'fee_q2',
      title: 'Payment plans available?',
      answer:
        'Yes! We offer three payment options:\n1. Full annual payment (5% discount)\n2. Semester-wise (2 installments)\n3. Quarterly (4 installments)\nPlease contact our accounts office for setup.',
    },
    {
      id: 'fee_q3',
      title: 'Sibling discount?',
      answer:
        'We offer a 10% tuition discount for the second sibling and 15% for the third sibling enrolled simultaneously. The discount applies to the younger sibling(s).',
    },
    {
      id: 'fee_q4',
      title: 'Late payment penalty?',
      answer:
        'A late fee of ₹500 is charged if payment is not received within 15 days of the due date. After 30 days, access to online resources may be temporarily suspended.',
    },
    {
      id: 'fee_q5',
      title: 'Refund policy?',
      answer:
        'Full refund is available if withdrawal is within 15 days of admission. After that, a pro-rata refund (minus ₹5,000 processing fee) is given based on the remaining term.',
    },
  ],

  curriculum: [
    {
      id: 'curr_q1',
      title: 'Which curriculum?',
      answer:
        'We follow the CBSE (Central Board of Secondary Education) curriculum, supplemented with activity-based learning and project work to develop critical thinking skills.',
    },
    {
      id: 'curr_q2',
      title: 'Subjects offered?',
      answer:
        'Core subjects: English, Hindi, Mathematics, Science, Social Studies.\nElectives (Grade 6+): Computer Science, French/Sanskrit, Art & Design, Physical Education.\nAll grades include moral education and environmental studies.',
    },
    {
      id: 'curr_q3',
      title: 'Exam schedule?',
      answer:
        'We conduct:\n• Unit Tests: Monthly\n• Mid-Term Exams: September\n• Final Exams: March\nContinuous assessment (projects, assignments) counts for 20% of the final grade.',
    },
    {
      id: 'curr_q4',
      title: 'Extra tutoring available?',
      answer:
        'Yes, free remedial classes are available after school hours (3:30–4:30 PM) for students who need additional support in Math, Science, or English. Parents can request this through the class teacher.',
    },
    {
      id: 'curr_q5',
      title: 'How are report cards?',
      answer:
        'Digital report cards are shared via the parent portal after each exam cycle. Two Parent-Teacher Meetings (PTMs) per year allow detailed discussion of your child\'s progress.',
    },
  ],

  transport: [
    {
      id: 'trans_q1',
      title: 'Bus routes available?',
      answer:
        'We operate 12 bus routes covering all major areas within a 15 km radius. Routes are shared at the start of each academic year. GPS tracking is available via our school app.',
    },
    {
      id: 'trans_q2',
      title: 'Sports facilities?',
      answer:
        'Our campus includes:\n• Cricket and football grounds\n• Basketball and volleyball courts\n• Indoor badminton hall\n• 25m swimming pool\n• Athletics track\nCoaching is available for all sports.',
    },
    {
      id: 'trans_q3',
      title: 'Library hours?',
      answer:
        'The library is open Monday–Friday, 8:00 AM to 4:30 PM, and Saturday 9:00 AM to 1:00 PM. Students can borrow up to 3 books at a time for 14 days.',
    },
    {
      id: 'trans_q4',
      title: 'Cafeteria & lunch menu?',
      answer:
        'Our cafeteria serves a balanced vegetarian and non-vegetarian menu daily. Weekly menus are shared every Monday via the school app. Students may also bring home-packed meals.',
    },
    {
      id: 'trans_q5',
      title: 'Science/computer labs?',
      answer:
        'We have dedicated labs for Physics, Chemistry, Biology, and Computer Science, each equipped with modern instruments. Lab sessions are part of the regular timetable from Grade 3 onwards.',
    },
  ],

  admissions_process: [
    {
      id: 'adm_q1',
      title: 'Documents required?',
      answer:
        'Required documents:\n1. Birth certificate\n2. Previous school transfer certificate\n3. Report card of last 2 years\n4. 4 passport-size photographs\n5. Aadhaar card (student & parent)\n6. Address proof',
    },
    {
      id: 'adm_q2',
      title: 'Age criteria?',
      answer:
        'Grade 1: Minimum 5.5 years as of June 1st of the admission year.\nFor other grades, the standard age-grade mapping per CBSE norms applies. Over-age or under-age cases are evaluated individually.',
    },
    {
      id: 'adm_q3',
      title: 'Is there an entrance test?',
      answer:
        'For Grades 2–10, a written aptitude test in English and Mathematics is conducted. Grade 1 admissions involve an informal interaction with the child and parents. Results are shared within 5 working days.',
    },
    {
      id: 'adm_q4',
      title: 'Application deadlines?',
      answer:
        'Admissions open in November each year for the next academic session (starting April). Early bird applications (Nov–Dec) receive priority. Late applications are accepted subject to seat availability.',
    },
    {
      id: 'adm_q5',
      title: 'Transfer student policy?',
      answer:
        'Transfer students are welcome mid-session subject to seat availability. A transfer certificate and a No Objection Certificate from the previous school are mandatory. An assessment may be required.',
    },
  ],

  school_policies: [
    {
      id: 'pol_q1',
      title: 'Uniform requirements?',
      answer:
        'Students must wear the prescribed uniform on all school days. The uniform set includes:\n• Regular uniform (Mon–Thu)\n• Sports uniform (Fri & PT days)\n• Winter additions: sweater and blazer\nUniforms are available at the school store.',
    },
    {
      id: 'pol_q2',
      title: 'Attendance policy?',
      answer:
        'A minimum of 75% attendance is required to be eligible for exams (CBSE mandate). Parents receive SMS/app alerts for absences. Three consecutive unauthorized absences trigger a follow-up call.',
    },
    {
      id: 'pol_q3',
      title: 'Mobile phone rules?',
      answer:
        'Mobile phones are NOT allowed on campus for students up to Grade 8. Grades 9–10 may carry phones for commute safety but must deposit them at the school office upon arrival.',
    },
    {
      id: 'pol_q4',
      title: 'Anti-bullying measures?',
      answer:
        'We have a zero-tolerance anti-bullying policy. A dedicated counsellor is available. Students can report incidents confidentially via the school app or directly to any staff member. Awareness workshops are held quarterly.',
    },
    {
      id: 'pol_q5',
      title: 'Parent-Teacher meetings?',
      answer:
        'Two formal PTMs are held per year (post mid-term and post final exams). Additionally, parents can book one-on-one meetings with teachers via the school app anytime during the term.',
    },
  ],
};

module.exports = { FAQ_GENRES, FAQ_QUESTIONS };
