import { col, fk, table } from '../lib/schema.mjs';
import { createRng, ts, ms, DAY, HOUR, MINUTE, round2 } from '../lib/rng.mjs';
import { FIRST_NAMES, LAST_NAMES, US_CITIES, COMPANY_A } from '../lib/names.mjs';
import { distinct, maxShare, nulls } from '../lib/contract.mjs';

const SEED = 20254;
const GENERATOR_VERSION = '3.0.0';
const START = ms('2022-07-01 00:00:00');
const END = ms('2025-07-01 00:00:00');
const PATIENTS = 3200;

/** Chronic conditions: ICD-10-CM code (public domain), description, prevalence model, management medication. */
const CHRONIC = [
  { code: 'I10', name: 'Essential (primary) hypertension', p: age => 0.05 + 0.6 * Math.max(0, age - 30) / 60, med: ['Lisinopril 10 mg tablet', 0.12], labs: [] },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications', p: age => 0.02 + 0.25 * Math.max(0, age - 30) / 60, med: ['Metformin 500 mg tablet', 0.08], labs: ['A1C'] },
  { code: 'E78.5', name: 'Hyperlipidemia, unspecified', p: age => 0.04 + 0.4 * Math.max(0, age - 35) / 55, med: ['Atorvastatin 20 mg tablet', 0.15], labs: ['LDL'] },
  { code: 'J45.909', name: 'Unspecified asthma, uncomplicated', p: () => 0.08, med: ['Albuterol 90 mcg inhaler', 0.4], labs: [] },
  { code: 'J44.9', name: 'Chronic obstructive pulmonary disease, unspecified', p: age => (age > 45 ? 0.07 : 0), med: ['Fluticasone-salmeterol inhaler', 0.6], labs: [] },
  { code: 'F32.A', name: 'Depression, unspecified', p: () => 0.09, med: ['Sertraline 50 mg tablet', 0.1], labs: [] },
  { code: 'N18.30', name: 'Chronic kidney disease, stage 3 unspecified', p: age => (age > 55 ? 0.08 : 0.005), med: null, labs: ['EGFR'] },
  { code: 'I48.91', name: 'Unspecified atrial fibrillation', p: age => (age > 60 ? 0.07 : 0.003), med: ['Apixaban 5 mg tablet', 1.8], labs: [] },
  { code: 'E66.9', name: 'Obesity, unspecified', p: () => 0.2, med: null, labs: [] },
  { code: 'K21.9', name: 'Gastro-esophageal reflux disease without esophagitis', p: () => 0.1, med: ['Omeprazole 20 mg capsule', 0.05], labs: [] },
];
const ACUTE = [
  ['J06.9', 'Acute upper respiratory infection, unspecified', 'Amoxicillin 500 mg capsule', 10, 18],
  ['J02.9', 'Acute pharyngitis, unspecified', 'Amoxicillin 500 mg capsule', 10, 8],
  ['N39.0', 'Urinary tract infection, site not specified', 'Nitrofurantoin 100 mg capsule', 5, 8],
  ['U07.1', 'COVID-19', null, 0, 9],
  ['M54.50', 'Low back pain, unspecified', 'Ibuprofen 600 mg tablet', 14, 9],
  ['S93.401A', 'Sprain of unspecified ligament of ankle, initial encounter', 'Ibuprofen 600 mg tablet', 10, 5],
  ['J18.9', 'Pneumonia, unspecified organism', 'Azithromycin 250 mg tablet', 5, 3],
  ['R07.9', 'Chest pain, unspecified', null, 0, 4],
  ['R10.9', 'Unspecified abdominal pain', null, 0, 5],
  ['T78.40XA', 'Allergy, unspecified, initial encounter', 'Cetirizine 10 mg tablet', 30, 4],
];
const SPECIALTIES = [['Family Medicine', 32], ['Internal Medicine', 20], ['Pediatrics', 10], ['Emergency Medicine', 9], ['Cardiology', 5], ['Endocrinology', 3], ['Pulmonology', 3], ['Psychiatry', 4], ['Nephrology', 2], ['Orthopedics', 4], ['Hospital Medicine', 5], ['Urgent Care', 6], ['Gastroenterology', 2]];
const SPECIALIST = { 'E11.9': 'Endocrinology', 'I48.91': 'Cardiology', 'J44.9': 'Pulmonology', 'F32.A': 'Psychiatry', 'N18.30': 'Nephrology', 'K21.9': 'Gastroenterology' };
const PROCEDURES = {
  ecg: ['PRC-ECG', 'Electrocardiogram, 12-lead', 95], xray: ['PRC-CXR', 'Chest X-ray, 2 views', 140], flu: ['PRC-FLU', 'Influenza vaccination', 45], covid: ['PRC-CVX', 'COVID-19 vaccination', 0],
  a1c: ['PRC-A1C', 'Hemoglobin A1c test', 35], lipid: ['PRC-LIP', 'Lipid panel', 40], cmp: ['PRC-CMP', 'Comprehensive metabolic panel', 55], spiro: ['PRC-SPI', 'Spirometry', 120],
  ct: ['PRC-CTH', 'CT scan, head without contrast', 850], echo: ['PRC-ECH', 'Echocardiogram', 650], phq: ['PRC-PHQ', 'Depression screening (PHQ-9)', 25], mammo: ['PRC-MAM', 'Screening mammogram', 230],
  colon: ['PRC-COL', 'Screening colonoscopy', 1450], sutures: ['PRC-LAC', 'Simple laceration repair', 310], strep: ['PRC-STR', 'Rapid strep test', 30], ua: ['PRC-UA', 'Urinalysis', 20],
};
const OBS = { BP_SYS: ['Systolic blood pressure', 'mmHg'], BP_DIA: ['Diastolic blood pressure', 'mmHg'], HR: ['Heart rate', 'beats/min'], BMI: ['Body mass index', 'kg/m2'], A1C: ['Hemoglobin A1c', '%'], LDL: ['LDL cholesterol', 'mg/dL'], EGFR: ['Estimated glomerular filtration rate', 'mL/min/1.73m2'], TEMP: ['Body temperature', 'degC'], SPO2: ['Oxygen saturation', '%'] };

const tables = [
  table('patients', 'One fictional patient.', [
    col('patient_id', 'INTEGER', 'Patient key'),
    col('first_name', 'TEXT', 'Fictional given name'),
    col('last_name', 'TEXT', 'Fictional family name'),
    col('sex', 'TEXT', 'F or M (as recorded at registration)'),
    col('birth_date', 'TEXT', 'Date of birth'),
    col('city', 'TEXT', 'Home city'),
    col('state', 'TEXT', 'Home state'),
    col('insurance_type', 'TEXT', 'commercial, medicare, medicaid or self_pay'),
    col('deceased_date', 'TEXT', 'Date of death; NULL if alive at the end of the data', true),
  ], { indexes: [['state']] }),
  table('providers', 'One clinician.', [
    col('provider_id', 'INTEGER', 'Provider key'),
    col('full_name', 'TEXT', 'Fictional name'),
    col('specialty', 'TEXT', 'Clinical specialty'),
    col('clinic_name', 'TEXT', 'Practice or facility'),
    col('city', 'TEXT', 'Practice city'),
    col('state', 'TEXT', 'Practice state'),
  ]),
  table('encounters', 'One patient visit (clinic, telehealth, urgent care, emergency, or hospital stay).', [
    col('encounter_id', 'INTEGER', 'Encounter key'),
    col('patient_id', 'INTEGER', 'Patient'),
    col('provider_id', 'INTEGER', 'Attending provider'),
    col('encounter_class', 'TEXT', 'wellness, ambulatory, telehealth, urgent_care, emergency or inpatient'),
    col('start_at', 'TEXT', 'Visit start (local time)'),
    col('end_at', 'TEXT', 'Visit end or discharge (local time)'),
    col('reason_code', 'TEXT', 'Diagnosis code for the visit reason; NULL for routine wellness visits', true),
    col('total_cost', 'REAL', 'Billed amount in USD'),
    col('payer_paid', 'REAL', 'Amount covered by insurance in USD'),
  ], { foreignKeys: [fk('patient_id', 'patients'), fk('provider_id', 'providers')], indexes: [['patient_id', 'start_at'], ['provider_id'], ['start_at']] }),
  table('appointments', 'One booked appointment. Completed appointments link to the visit they produced.', [
    col('appointment_id', 'INTEGER', 'Appointment key'),
    col('patient_id', 'INTEGER', 'Patient'),
    col('provider_id', 'INTEGER', 'Provider booked'),
    col('booked_at', 'TEXT', 'When the appointment was made'),
    col('scheduled_start', 'TEXT', 'Appointment time'),
    col('status', 'TEXT', 'completed, cancelled, no_show or scheduled (future)'),
    col('encounter_id', 'INTEGER', 'Resulting encounter for completed appointments; NULL otherwise', true),
  ], { foreignKeys: [fk('patient_id', 'patients'), fk('provider_id', 'providers'), fk('encounter_id', 'encounters')], indexes: [['patient_id'], ['provider_id'], ['encounter_id']] }),
  table('conditions', 'One diagnosis recorded for a patient. Chronic conditions have no resolved date.', [
    col('condition_id', 'INTEGER', 'Condition key'),
    col('patient_id', 'INTEGER', 'Patient'),
    col('encounter_id', 'INTEGER', 'Encounter where it was recorded'),
    col('code', 'TEXT', 'Diagnosis code'),
    col('description', 'TEXT', 'Diagnosis'),
    col('onset_date', 'TEXT', 'Onset date'),
    col('resolved_date', 'TEXT', 'Resolution date; NULL for ongoing conditions', true),
  ], { foreignKeys: [fk('patient_id', 'patients'), fk('encounter_id', 'encounters')], indexes: [['patient_id'], ['code']] }),
  table('medications', 'One prescription fill period. Repeat fills of the same drug can overlap or leave gaps.', [
    col('medication_id', 'INTEGER', 'Prescription key'),
    col('patient_id', 'INTEGER', 'Patient'),
    col('encounter_id', 'INTEGER', 'Prescribing encounter', true),
    col('medication_name', 'TEXT', 'Generic drug, strength and form'),
    col('start_date', 'TEXT', 'First day of supply'),
    col('stop_date', 'TEXT', 'First day the fill no longer covers; NULL if still open', true),
    col('days_supply', 'INTEGER', 'Days of medication dispensed', true),
    col('cost', 'REAL', 'Dispensed cost in USD'),
  ], { foreignKeys: [fk('patient_id', 'patients'), fk('encounter_id', 'encounters')], indexes: [['patient_id', 'medication_name']] }),
  table('observations', 'One measurement: vital sign or lab result.', [
    col('observation_id', 'INTEGER', 'Observation key'),
    col('patient_id', 'INTEGER', 'Patient'),
    col('encounter_id', 'INTEGER', 'Encounter'),
    col('observed_at', 'TEXT', 'Measurement time'),
    col('code', 'TEXT', 'Measurement code (for example BP_SYS, HR, BMI, A1C)'),
    col('description', 'TEXT', 'Measurement name'),
    col('value', 'REAL', 'Result; NULL when the measurement was attempted but not obtained', true),
    col('unit', 'TEXT', 'Unit of measure'),
  ], { foreignKeys: [fk('patient_id', 'patients'), fk('encounter_id', 'encounters')], indexes: [['patient_id', 'code'], ['encounter_id']] }),
  table('procedures', 'One procedure, test or vaccination performed during an encounter.', [
    col('procedure_id', 'INTEGER', 'Procedure key'),
    col('patient_id', 'INTEGER', 'Patient'),
    col('encounter_id', 'INTEGER', 'Encounter'),
    col('performed_at', 'TEXT', 'Time performed'),
    col('code', 'TEXT', 'Procedure code'),
    col('description', 'TEXT', 'Procedure'),
    col('cost', 'REAL', 'Billed amount in USD'),
  ], { foreignKeys: [fk('patient_id', 'patients'), fk('encounter_id', 'encounters')], indexes: [['patient_id'], ['encounter_id']] }),
];

function generate() {
  const rng = createRng(SEED);
  const patients = [], providers = [], encounters = [], appointments = [], conditions = [], medications = [], observations = [], procedures = [];
  // Providers cluster in clinics within cities.
  const clinicsByCity = new Map();
  const providersBy = new Map();
  for (let i = 0; i < 460; i++) {
    const [city, state] = rng.weighted(US_CITIES.map(c => [c, c[2]]));
    const specialty = rng.weighted(SPECIALTIES);
    const key = `${city}|${state}`;
    const clinics = clinicsByCity.get(key) ?? clinicsByCity.set(key, [`${rng.pick(COMPANY_A)} Health Center`, `${city} ${rng.pick(['Medical Group', 'Community Clinic', 'Family Practice'])}`]).get(key);
    const clinic = ['Emergency Medicine', 'Hospital Medicine'].includes(specialty) ? `${city} General Hospital` : rng.pick(clinics);
    providers.push([i + 1, `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`, specialty, clinic, city, state]);
    (providersBy.get(`${key}|${specialty}`) ?? providersBy.set(`${key}|${specialty}`, []).get(`${key}|${specialty}`)).push(i + 1);
    (providersBy.get(specialty) ?? providersBy.set(specialty, []).get(specialty)).push(i + 1);
  }
  const providerFor = (r, city, state, specialty) => {
    const local = providersBy.get(`${city}|${state}|${specialty}`);
    const pool = local && r.chance(0.9) ? local : providersBy.get(specialty);
    return r.pick(pool.slice(0, Math.max(1, Math.ceil(pool.length * 0.85)))); // a few providers never see sampled patients
  };

  for (let p = 0; p < PATIENTS; p++) {
    const r = rng.fork(`patient:${p}`);
    const id = p + 1;
    const birth = ms('1932-01-01 00:00:00') + Math.floor(r.next() * (ms('2024-06-01 00:00:00') - ms('1932-01-01 00:00:00')));
    const ageAt = t => (t - birth) / (365.25 * DAY);
    const age = ageAt(START);
    const sex = r.chance(0.51) ? 'F' : 'M';
    const [city, state] = r.weighted(US_CITIES.map(c => [c, c[2]]));
    const insurance = ageAt(END) >= 65 ? (r.chance(0.92) ? 'medicare' : 'commercial') : r.weighted([['commercial', 62], ['medicaid', 26], ['self_pay', 12]]);
    const coverage = { commercial: 0.8, medicare: 0.85, medicaid: 0.95, self_pay: 0 }[insurance];
    const frailty = Math.max(0, r.normal(age / 90, 0.2));
    const deathAt = age > 60 && r.chance(0.03 + frailty * 0.05) ? START + Math.floor(r.float(0.2, 1) * (END - START)) : null;
    patients.push([id, r.pick(FIRST_NAMES), r.pick(LAST_NAMES), sex, ts(birth).slice(0, 10), city, state, insurance, deathAt ? ts(deathAt).slice(0, 10) : null]);
    const lastDay = deathAt ?? END;
    const born = Math.max(START, birth);
    const pcpSpecialty = ageAt(END) < 18 ? 'Pediatrics' : r.chance(0.6) ? 'Family Medicine' : 'Internal Medicine';
    const pcp = providerFor(r, city, state, pcpSpecialty);

    const addEncounter = (t, klass, provider, reason, hours, cost) => {
      const eid = encounters.length + 1;
      const end = t + Math.max(15 * MINUTE, Math.round(hours * HOUR));
      const total = round2(cost * r.float(0.85, 1.25));
      encounters.push([eid, id, provider, klass, ts(t), ts(Math.min(end, END - MINUTE)), reason, total, round2(total * coverage * r.float(0.9, 1))]);
      return { id: eid, t };
    };
    const observe = (enc, code, value) => {
      const [desc, unit] = OBS[code];
      observations.push([observations.length + 1, id, enc.id, ts(enc.t + r.int(5, 40) * MINUTE), code, desc, value === null ? null : round2(value), unit]);
    };
    const procedure = (enc, key) => {
      const [code, desc, cost] = PROCEDURES[key];
      procedures.push([procedures.length + 1, id, enc.id, ts(enc.t + r.int(10, 90) * MINUTE), code, desc, round2(cost * r.float(0.9, 1.15))]);
    };
    const prescribe = (enc, name, start, days, unitCost, stop = null) => {
      medications.push([medications.length + 1, id, enc ? enc.id : null, name, ts(start).slice(0, 10), stop === undefined ? null : ts(stop ?? start + days * DAY).slice(0, 10), days, round2(unitCost * days * r.float(0.9, 1.1))]);
    };
    const vitals = (enc, extra = 0) => {
      const sys = 112 + age * 0.35 + extra + r.normal(0, 11);
      const roll = r.next();
      if (roll < 0.62) { observe(enc, 'BP_SYS', Math.round(sys)); observe(enc, 'BP_DIA', Math.round(sys * 0.62 + r.normal(0, 6))); }
      else if (roll < 0.64) observe(enc, 'BP_SYS', null);
      if (r.chance(0.22)) observe(enc, 'HR', Math.round(r.normal(76, 11)));
    };

    // Chronic conditions with onset before or during the period.
    const chronic = CHRONIC.filter(c => r.chance(Math.min(0.9, c.p(ageAt(END)) * (0.6 + frailty))));
    const onsets = chronic.map(c => ({ c, t: r.chance(0.7) ? START - r.int(30, 3000) * DAY : START + Math.floor(r.next() * (lastDay - START - 30 * DAY)) }));
    const diagnosed = new Set();
    let bmi = r.normal(27.5, 5.5) + (chronic.some(c => c.code === 'E66.9') ? 6 : 0);
    let a1c = 6.9 + r.normal(0, 0.9);

    // Visit schedule: annual wellness, chronic follow-ups, acute episodes, ED and inpatient stays.
    const visits = [];
    if (r.chance(insurance === 'self_pay' ? 0.3 : 0.7)) for (let t = born + r.int(0, 364) * DAY; t < lastDay; t += r.int(340, 520) * DAY) visits.push({ t, kind: 'wellness' });
    if (onsets.length) {
      // One follow-up schedule per patient; each visit manages one of the patient's conditions.
      const every = onsets.some(o => o.c.code === 'E11.9' || o.c.code === 'I48.91') ? 150 : 220;
      const first = Math.max(born, Math.min(...onsets.map(o => o.t)));
      for (let t = first + r.int(5, every) * DAY; t < lastDay; t += r.int(every - 30, every + 90) * DAY) {
        const due = onsets.filter(o => o.t <= t);
        visits.push({ t, kind: 'chronic', c: (due.length ? r.pick(due) : r.pick(onsets)).c });
      }
    }
    const acuteRate = 0.3 + frailty * 0.35;
    for (let t = born + r.exponential(365 / acuteRate) * DAY; t < lastDay; t += r.exponential(365 / acuteRate) * DAY) visits.push({ t, kind: 'acute' });
    const edRate = 0.05 + frailty * 0.15 + (chronic.length > 2 ? 0.1 : 0);
    for (let t = born + r.exponential(365 / edRate) * DAY; t < lastDay; t += r.exponential(365 / edRate) * DAY) visits.push({ t, kind: 'ed' });
    visits.sort((a, b) => a.t - b.t);

    let lastInpatient = null;
    for (const v of visits) {
      const day = Math.floor(v.t / DAY) * DAY;
      if (v.kind === 'wellness' || v.kind === 'chronic' || (v.kind === 'acute' && r.chance(0.6))) {
        // Booked visits: appointments may be cancelled or missed and then rebooked.
        const specialty = v.kind === 'chronic' && SPECIALIST[v.c.code] && r.chance(0.35) ? SPECIALIST[v.c.code] : pcpSpecialty;
        const provider = specialty === pcpSpecialty ? pcp : providerFor(r, city, state, specialty);
        let slot = day + r.int(8, 16) * HOUR + r.pick([0, 15, 30, 45]) * MINUTE;
        const booked = slot - (v.kind === 'acute' ? r.int(0, 2) : r.int(7, 45)) * DAY - r.int(1, 8) * HOUR;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (slot >= END) { appointments.push([appointments.length + 1, id, provider, ts(booked), ts(slot), 'scheduled', null]); break; }
          const roll = r.next();
          if (attempt === 0 && roll < 0.08) { appointments.push([appointments.length + 1, id, provider, ts(booked), ts(slot), 'cancelled', null]); slot += r.int(3, 21) * DAY; continue; }
          if (attempt === 0 && roll < 0.14) { appointments.push([appointments.length + 1, id, provider, ts(booked), ts(slot), 'no_show', null]); break; }
          if (slot >= lastDay) break;
          const telehealth = v.kind !== 'wellness' && r.chance(0.18);
          const klass = v.kind === 'wellness' ? 'wellness' : telehealth ? 'telehealth' : 'ambulatory';
          let reason = null;
          if (v.kind === 'chronic') reason = v.c.code;
          let acute = null;
          if (v.kind === 'acute') { acute = r.weighted(ACUTE.map(a => [a, a[4]])); reason = acute[0]; }
          const enc = addEncounter(slot, klass, provider, reason, r.float(0.3, 0.8), klass === 'wellness' ? 260 : telehealth ? 95 : 180);
          appointments.push([appointments.length + 1, id, provider, ts(booked), ts(slot), 'completed', enc.id]);
          if (!telehealth) {
            vitals(enc);
            if (v.kind === 'wellness' && ageAt(slot) >= 2 && r.chance(0.9)) observe(enc, 'BMI', bmi += r.normal(0.1, 0.6));
          }
          if (v.kind === 'wellness') {
            if (r.chance(0.35)) procedure(enc, 'flu');
            if (ageAt(slot) > 12 && r.chance(0.2)) procedure(enc, 'phq');
            if (sex === 'F' && ageAt(slot) > 40 && r.chance(0.3)) procedure(enc, 'mammo');
            if (ageAt(slot) > 45 && r.chance(0.03)) procedure(enc, 'colon');
            if (ageAt(slot) > 30 && r.chance(0.25)) { procedure(enc, 'lipid'); observe(enc, 'LDL', r.normal(chronic.some(c => c.code === 'E78.5') ? 145 : 112, 25)); }
          }
          // Diagnose chronic conditions whose onset has passed.
          for (const o of onsets) {
            if (diagnosed.has(o.c.code) || o.t > slot || !(v.kind !== 'acute' || r.chance(0.3))) continue;
            diagnosed.add(o.c.code);
            conditions.push([conditions.length + 1, id, enc.id, o.c.code, o.c.name, ts(Math.min(o.t, slot)).slice(0, 10), null]);
            if (o.c.med) {
              // 180-day supplies renewed early (overlapping intervals) or late (gaps in therapy).
              let t = slot;
              const adherence = r.float(0.55, 1);
              const stopAt = r.chance(0.12) ? slot + r.int(60, 700) * DAY : lastDay;
              while (t < Math.min(stopAt, END)) {
                prescribe(enc, o.c.med[0], t, 180, o.c.med[1]);
                const next = r.chance(0.15) ? r.int(150, 172) : r.chance(adherence) ? r.int(176, 186) : r.int(200, 320);
                t += next * DAY;
              }
            }
          }
          if (v.kind === 'chronic') {
            for (const lab of v.c.labs) {
              if (lab === 'A1C') { procedure(enc, 'a1c'); a1c += r.normal(-0.05, 0.4); observe(enc, 'A1C', Math.max(5, a1c)); }
              if (lab === 'LDL') { procedure(enc, 'lipid'); observe(enc, 'LDL', r.normal(130, 30)); }
              if (lab === 'EGFR') { procedure(enc, 'cmp'); observe(enc, 'EGFR', r.chance(0.02) ? null : r.normal(48, 8)); }
            }
            if (v.c.code === 'I48.91' && r.chance(0.5)) procedure(enc, 'ecg');
            if (v.c.code === 'J44.9' && r.chance(0.3)) procedure(enc, 'spiro');
          }
          if (acute) {
            if (acute[0] === 'J02.9') procedure(enc, 'strep');
            if (acute[0] === 'N39.0') procedure(enc, 'ua');
            if (!telehealth && r.chance(0.6)) observe(enc, 'TEMP', r.normal(acute[0].startsWith('J') || acute[0] === 'U07.1' ? 38.1 : 36.9, 0.5));
            conditions.push([conditions.length + 1, id, enc.id, acute[0], acute[1], ts(slot).slice(0, 10), ts(slot + r.int(5, 30) * DAY).slice(0, 10)]);
            if (acute[2]) prescribe(enc, acute[2], slot, acute[3], 0.6);
          }
          break;
        }
      } else if (v.kind === 'acute') {
        const acute = r.weighted(ACUTE.map(a => [a, a[4]]));
        const enc = addEncounter(day + r.int(8, 20) * HOUR, 'urgent_care', providerFor(r, city, state, 'Urgent Care'), acute[0], r.float(0.5, 2), 240);
        vitals(enc, 4);
        observe(enc, 'TEMP', r.normal(acute[0].startsWith('J') || acute[0] === 'U07.1' ? 38.3 : 37, 0.5));
        if (acute[0] === 'S93.401A' && r.chance(0.6)) procedure(enc, 'xray');
        conditions.push([conditions.length + 1, id, enc.id, acute[0], acute[1], ts(enc.t).slice(0, 10), ts(enc.t + r.int(5, 30) * DAY).slice(0, 10)]);
        if (acute[2]) prescribe(enc, acute[2], enc.t, acute[3], 0.6);
      } else {
        // Emergency visit, sometimes admitted; a few readmissions within 30 days of discharge.
        const reason = r.pick(['R07.9', 'R10.9', 'J18.9', 'S93.401A', 'J45.909', 'I48.91', 'U07.1', 'N39.0']);
        const enc = addEncounter(day + r.int(0, 23) * HOUR + r.int(0, 59) * MINUTE, 'emergency', providerFor(r, city, state, 'Emergency Medicine'), reason, r.float(2, 9), 1650);
        vitals(enc, 10);
        observe(enc, 'SPO2', Math.min(100, r.normal(reason === 'J18.9' ? 91 : 97, 2)));
        if (reason === 'R07.9') { procedure(enc, 'ecg'); if (r.chance(0.3)) procedure(enc, 'echo'); }
        if (['J18.9', 'U07.1'].includes(reason)) procedure(enc, 'xray');
        if (r.chance(0.08)) procedure(enc, 'ct');
        if (r.chance(0.04)) procedure(enc, 'sutures');
        const admit = r.chance(0.12 + frailty * 0.15);
        if (admit) {
          const stay = Math.max(1, Math.round(r.lognormal(3.2, 0.6)));
          const admitAt = enc.t + 6 * HOUR;
          const ip = addEncounter(admitAt, 'inpatient', providerFor(r, city, state, 'Hospital Medicine'), reason, stay * 24, 4200 * stay);
          vitals(ip, 6);
          lastInpatient = admitAt + stay * DAY;
          // Readmission risk within 30 days.
          if (r.chance(0.13 + frailty * 0.1)) {
            const back = lastInpatient + r.int(2, 29) * DAY;
            if (back < lastDay) addEncounter(back, 'inpatient', providerFor(r, city, state, 'Hospital Medicine'), reason, r.int(1, 6) * 24, 4500 * 3);
          }
        }
      }
    }
    void lastInpatient;
    // Seasonal COVID-19 vaccination for adults at a wellness or pharmacy encounter is recorded at the next ambulatory visit.
  }
  return { patients, providers, encounters, appointments, conditions, medications, observations, procedures };
}

const dataset = {
  id: 'healthcare',
  version: '3.0.0',
  name: 'Healthcare',
  domain: 'Clinical care',
  kind: 'synthetic',
  description: 'Three years of synthetic patient journeys: patients, clinicians, appointments, visits, diagnoses, prescriptions, vital signs, lab results and procedures. No real person’s health information is present.',
  source: {
    publisher: 'Runtime',
    url: 'https://github.com/KrishnaSathvik/runtime.school',
    release: `Runtime healthcare generator ${GENERATOR_VERSION}, seed ${SEED}`,
    license: 'Runtime-owned synthetic data',
    licenseUrl: 'https://github.com/KrishnaSathvik/runtime.school',
    commercialReuse: 'permitted',
    attribution: 'Synthetic data generated by Runtime. Diagnosis codes are ICD-10-CM (U.S. public domain); procedure and measurement codes are Runtime-defined.',
    retrieved: '2026-10-14',
    transformations: [
      'Age and frailty drive chronic-condition prevalence; conditions drive follow-up visits, labs and medications.',
      'Chronic medications are 180-day supplies renewed early (overlapping intervals) or late (gaps in therapy).',
      'Appointments can be cancelled and rebooked, missed (no-show) or still scheduled after the data ends.',
      'Emergency visits can lead to inpatient stays and 30-day readmissions.',
      'Modeled after the concepts of Synthea; no Synthea output or real patient data is used.',
    ],
  },
  reproduction: { command: 'node datasets/build.mjs healthcare', implementation: 'datasets/healthcare/dataset.mjs', seed: SEED, notes: `Generator version ${GENERATOR_VERSION}; deterministic for a given seed.` },
  coverage: { start: '2022-07-01', end: '2025-06-30', grain: 'encounter; observation' },
  tables,
  edgeCases: [
    'Patients with no encounters; providers who never saw a patient',
    'Cancelled, no-show and future-scheduled appointments with no encounter',
    'Overlapping and gapped medication fill intervals',
    'Ongoing chronic conditions with NULL resolved dates',
    'Measurements attempted but not obtained (NULL value)',
    'Inpatient stays spanning several days; 30-day readmissions',
    'Patients who died during the period',
    'Telehealth visits without vital signs',
  ],
  qualityNotes: [
    'All people and clinicians are fictional; prevalence and costs are illustrative, not epidemiological estimates.',
    'stop_date is exclusive: a fill covers start_date up to the day before stop_date.',
    'Use the patient’s age at the visit, not today, for age-based analysis.',
  ],
  concepts: ['LEFT JOIN', 'anti-joins', 'EXISTS', 'ON vs WHERE', 'correlated subqueries', 'interval overlap', 'interval merging', 'NULL reasoning', 'validation'],
  rows: () => generate(),
  mutation: `
UPDATE appointments SET status = 'no_show', encounter_id = NULL WHERE appointment_id % 157 = 0 AND status = 'completed';
DELETE FROM observations WHERE observation_id % 113 = 0;
UPDATE observations SET value = value + 12 WHERE code = 'BP_SYS' AND observation_id % 61 = 0;
INSERT INTO providers VALUES ((SELECT MAX(provider_id) + 1 FROM providers), 'Rowan Test', 'Cardiology', 'Runtime Heart Clinic', 'Denver', 'CO');
INSERT INTO patients VALUES ((SELECT MAX(patient_id) + 1 FROM patients), 'Avery', 'Quinn', 'F', '1980-02-29', 'Denver', 'CO', 'commercial', NULL);
UPDATE medications SET stop_date = date(stop_date, '+20 days') WHERE medication_id % 47 = 0 AND stop_date IS NOT NULL;
UPDATE conditions SET resolved_date = NULL WHERE condition_id % 89 = 0;
UPDATE encounters SET total_cost = total_cost + 100 WHERE encounter_id % 73 = 0;
INSERT INTO encounters SELECT (SELECT MAX(encounter_id) + 1 FROM encounters), p.patient_id, (SELECT MIN(provider_id) FROM providers WHERE specialty = 'Emergency Medicine'), 'emergency', '2025-05-20 03:10:00', '2025-05-20 07:40:00', 'R07.9', 1720.0, 1500.0 FROM patients p WHERE NOT EXISTS (SELECT 1 FROM encounters e WHERE e.patient_id = p.patient_id AND e.encounter_class = 'emergency') ORDER BY p.patient_id LIMIT 1;
`,
  contract: {
    totalRows: [75000, 125000],
    minRows: { patients: 3000, providers: 400, encounters: 15000, appointments: 12000, conditions: 6000, medications: 10000, observations: 25000, procedures: 5000 },
    checks: [
      { name: 'encounter classes', sql: distinct('encounters', 'encounter_class'), equals: 6 },
      { name: 'largest patient share of encounters', sql: maxShare('encounters', 'patient_id'), max: 0.003 },
      { name: 'patients without encounters', sql: 'SELECT COUNT(*) FROM patients p WHERE NOT EXISTS (SELECT 1 FROM encounters e WHERE e.patient_id = p.patient_id)', min: 50 },
      { name: 'providers without encounters', sql: 'SELECT COUNT(*) FROM providers v WHERE NOT EXISTS (SELECT 1 FROM encounters e WHERE e.provider_id = v.provider_id)', min: 10 },
      { name: 'appointment statuses', sql: distinct('appointments', 'status'), equals: 4 },
      { name: 'completed appointments link an encounter', sql: "SELECT COUNT(*) FROM appointments WHERE (status = 'completed') <> (encounter_id IS NOT NULL)", equals: 0 },
      { name: 'overlapping fills of the same drug', sql: 'SELECT COUNT(*) FROM medications a JOIN medications b ON a.patient_id = b.patient_id AND a.medication_name = b.medication_name AND a.medication_id < b.medication_id AND b.start_date < a.stop_date AND a.start_date < b.stop_date', min: 500 },
      { name: 'gaps between fills of the same drug (> 14 days)', sql: "SELECT COUNT(*) FROM (SELECT start_date, LAG(stop_date) OVER (PARTITION BY patient_id, medication_name ORDER BY start_date, medication_id) AS prev_stop FROM medications) WHERE julianday(start_date) - julianday(prev_stop) > 14", min: 500 },
      { name: 'ongoing chronic conditions', sql: nulls('conditions', 'resolved_date'), min: 2000 },
      { name: 'observations without a value', sql: nulls('observations', 'value'), min: 50 },
      { name: '30-day readmissions', sql: "SELECT COUNT(*) FROM (SELECT patient_id, start_at, LAG(end_at) OVER (PARTITION BY patient_id ORDER BY start_at) AS prev_end FROM encounters WHERE encounter_class = 'inpatient') WHERE julianday(start_at) - julianday(prev_end) BETWEEN 0 AND 30", min: 30 },
      { name: 'deceased patients', sql: 'SELECT COUNT(deceased_date) FROM patients', min: 30 },
      { name: 'diagnosis codes', sql: distinct('conditions', 'code'), min: 15 },
    ],
  },
};

export default dataset;
