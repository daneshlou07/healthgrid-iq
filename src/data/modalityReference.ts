import type { ExaminationSide } from '../types';

export interface BodyPartReference {
  name: string;
  bodyRegion: string;
  supportsLaterality: boolean; // if true -> ['Left', 'Right', 'Bilateral', 'N/A'], else -> ['N/A']
  defaultViewsOrProtocols: string[];
}

export interface ModalityReference {
  modality: 'X-Ray' | 'CT Scan' | 'MRI' | 'Ultrasound' | 'Mammogram';
  optionTypeLabel: string; // 'Views (Multi-select)' | 'Protocol / Exam Name' | 'MRI Protocol' | 'Ultrasound Examination Type'
  isMultiOptionAllowed: boolean; // X-Ray views can be multi-selected
  bodyParts: BodyPartReference[];
  availableViewsOrProtocols: string[];
}

export const MODALITY_REFERENCE_DATASET: Record<string, ModalityReference> = {
  'X-Ray': {
    modality: 'X-Ray',
    optionTypeLabel: 'Available Views (Multi-select)',
    isMultiOptionAllowed: true,
    availableViewsOrProtocols: [
      'PA (Posteroanterior)',
      'AP (Anteroposterior)',
      'Lateral',
      'Oblique',
      'Lordotic',
      'Flexion / Extension',
      'Skyline / Axial',
      'Waters View',
      'Townes View',
      'Decubitus',
      'Tunnel / Notch',
    ],
    bodyParts: [
      { name: 'Chest / Thorax', bodyRegion: 'Chest', supportsLaterality: false, defaultViewsOrProtocols: ['PA (Posteroanterior)', 'Lateral'] },
      { name: 'Ribs', bodyRegion: 'Chest', supportsLaterality: true, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Oblique'] },
      { name: 'Abdomen', bodyRegion: 'Abdomen', supportsLaterality: false, defaultViewsOrProtocols: ['AP Supine', 'AP Erect'] },
      { name: 'Head / Skull', bodyRegion: 'Head', supportsLaterality: false, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Lateral'] },
      { name: 'Paranasal Sinuses', bodyRegion: 'Head', supportsLaterality: false, defaultViewsOrProtocols: ['Waters View', 'Lateral'] },
      { name: 'Cervical Spine', bodyRegion: 'Cervical Spine', supportsLaterality: false, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Lateral'] },
      { name: 'Thoracic Spine', bodyRegion: 'Thoracic Spine', supportsLaterality: false, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Lateral'] },
      { name: 'Lumbar Spine', bodyRegion: 'Lumbar Spine', supportsLaterality: false, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Lateral'] },
      { name: 'Pelvis', bodyRegion: 'Pelvis', supportsLaterality: false, defaultViewsOrProtocols: ['AP (Anteroposterior)'] },
      { name: 'Hip', bodyRegion: 'Hip', supportsLaterality: true, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Lateral'] },
      { name: 'Shoulder / Clavicle', bodyRegion: 'Shoulder', supportsLaterality: true, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Axial'] },
      { name: 'Humerus / Elbow / Forearm', bodyRegion: 'Upper Limb', supportsLaterality: true, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Lateral'] },
      { name: 'Wrist / Hand', bodyRegion: 'Wrist', supportsLaterality: true, defaultViewsOrProtocols: ['PA (Posteroanterior)', 'Lateral', 'Oblique'] },
      { name: 'Femur / Knee', bodyRegion: 'Knee', supportsLaterality: true, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Lateral', 'Skyline / Axial'] },
      { name: 'Tibia-Fibula / Ankle / Foot', bodyRegion: 'Ankle', supportsLaterality: true, defaultViewsOrProtocols: ['AP (Anteroposterior)', 'Lateral', 'Oblique'] },
    ],
  },

  'CT Scan': {
    modality: 'CT Scan',
    optionTypeLabel: 'Protocol / Exam Name',
    isMultiOptionAllowed: false,
    availableViewsOrProtocols: [
      'CT Head Non-Contrast',
      'CT Head with Contrast',
      'CT Brain Perfusion',
      'CT Angiography Brain / Carotid',
      'CT Paranasal Sinus',
      'CT Neck Soft Tissue',
      'CT Chest Non-Contrast',
      'CT Chest with Contrast',
      'CTPA (Pulmonary Angiography)',
      'HRCT Chest (High Resolution)',
      'CT Abdomen & Pelvis Non-Contrast',
      'CT Abdomen & Pelvis Contrast',
      'CT Abdomen Triphasic (Liver/Pancreas)',
      'CT Urogram',
      'CT Cervical Spine',
      'CT Lumbar Spine',
      'CT Extremity / Joint 3D',
    ],
    bodyParts: [
      { name: 'Brain / Head', bodyRegion: 'Head', supportsLaterality: false, defaultViewsOrProtocols: ['CT Head Non-Contrast'] },
      { name: 'Facial Bones / Sinuses', bodyRegion: 'Head', supportsLaterality: false, defaultViewsOrProtocols: ['CT Paranasal Sinus'] },
      { name: 'Neck / Soft Tissue', bodyRegion: 'Neck', supportsLaterality: false, defaultViewsOrProtocols: ['CT Neck Soft Tissue'] },
      { name: 'Chest / Thorax', bodyRegion: 'Chest', supportsLaterality: false, defaultViewsOrProtocols: ['CT Chest with Contrast'] },
      { name: 'Abdomen & Pelvis', bodyRegion: 'Abdomen', supportsLaterality: false, defaultViewsOrProtocols: ['CT Abdomen & Pelvis Contrast'] },
      { name: 'Cervical Spine', bodyRegion: 'Cervical Spine', supportsLaterality: false, defaultViewsOrProtocols: ['CT Cervical Spine'] },
      { name: 'Lumbar Spine', bodyRegion: 'Lumbar Spine', supportsLaterality: false, defaultViewsOrProtocols: ['CT Lumbar Spine'] },
      { name: 'Upper Extremity', bodyRegion: 'Upper Limb', supportsLaterality: true, defaultViewsOrProtocols: ['CT Extremity / Joint 3D'] },
      { name: 'Lower Extremity', bodyRegion: 'Lower Limb', supportsLaterality: true, defaultViewsOrProtocols: ['CT Extremity / Joint 3D'] },
    ],
  },

  'MRI': {
    modality: 'MRI',
    optionTypeLabel: 'MRI Protocol',
    isMultiOptionAllowed: false,
    availableViewsOrProtocols: [
      'MRI Brain Routine',
      'Stroke Protocol (DWI / ADC)',
      'MRI Brain with Contrast',
      'MRI Pituitary Fossa',
      'MRA Brain / Carotids',
      'MRI Cervical Spine',
      'MRI Thoracic Spine',
      'MRI Lumbar Spine',
      'MRI Whole Spine Screening',
      'MRI Shoulder Protocol',
      'MRI Knee Protocol',
      'MRI Hip Protocol',
      'MRI Wrist / Hand',
      'MRI Ankle / Foot',
      'MRCP (Biliary Tree)',
      'MRI Abdomen Routine',
      'MRI Pelvis / Prostate',
    ],
    bodyParts: [
      { name: 'Brain / Head', bodyRegion: 'Head', supportsLaterality: false, defaultViewsOrProtocols: ['MRI Brain Routine'] },
      { name: 'Pituitary / IAM', bodyRegion: 'Head', supportsLaterality: false, defaultViewsOrProtocols: ['MRI Pituitary Fossa'] },
      { name: 'Cervical Spine', bodyRegion: 'Cervical Spine', supportsLaterality: false, defaultViewsOrProtocols: ['MRI Cervical Spine'] },
      { name: 'Thoracic Spine', bodyRegion: 'Thoracic Spine', supportsLaterality: false, defaultViewsOrProtocols: ['MRI Thoracic Spine'] },
      { name: 'Lumbar Spine', bodyRegion: 'Lumbar Spine', supportsLaterality: false, defaultViewsOrProtocols: ['MRI Lumbar Spine'] },
      { name: 'Shoulder', bodyRegion: 'Shoulder', supportsLaterality: true, defaultViewsOrProtocols: ['MRI Shoulder Protocol'] },
      { name: 'Knee', bodyRegion: 'Knee', supportsLaterality: true, defaultViewsOrProtocols: ['MRI Knee Protocol'] },
      { name: 'Hip / Pelvis', bodyRegion: 'Hip', supportsLaterality: true, defaultViewsOrProtocols: ['MRI Hip Protocol'] },
      { name: 'Wrist / Hand', bodyRegion: 'Wrist', supportsLaterality: true, defaultViewsOrProtocols: ['MRI Wrist / Hand'] },
      { name: 'Ankle / Foot', bodyRegion: 'Ankle', supportsLaterality: true, defaultViewsOrProtocols: ['MRI Ankle / Foot'] },
      { name: 'Abdomen / Biliary', bodyRegion: 'Abdomen', supportsLaterality: false, defaultViewsOrProtocols: ['MRCP (Biliary Tree)'] },
      { name: 'Pelvis', bodyRegion: 'Pelvis', supportsLaterality: false, defaultViewsOrProtocols: ['MRI Pelvis / Prostate'] },
    ],
  },

  'Ultrasound': {
    modality: 'Ultrasound',
    optionTypeLabel: 'Ultrasound Examination Type',
    isMultiOptionAllowed: false,
    availableViewsOrProtocols: [
      'FAST Scan (Trauma)',
      'Hepatobiliary System (HBS)',
      'Upper Abdomen Ultrasound',
      'Whole Abdomen Ultrasound',
      'Pelvis Transabdominal',
      'Pelvis Transvaginal',
      'Obstetric (1st Trimester)',
      'Obstetric Anomaly (2nd / 3rd Trimester)',
      'Renal & Bladder (KUB)',
      'Renal Doppler',
      'Thyroid Ultrasound',
      'Neck Soft Tissue / Lymph Nodes',
      'Breast Ultrasound',
      'Scrotal / Testicular Ultrasound',
      'Venous Doppler (DVT)',
      'Arterial Doppler',
      'Musculoskeletal Joint / Tendon',
    ],
    bodyParts: [
      { name: 'Abdomen / Hepatobiliary', bodyRegion: 'Abdomen', supportsLaterality: false, defaultViewsOrProtocols: ['Hepatobiliary System (HBS)'] },
      { name: 'Pelvis / Gynaecology / Obstetric', bodyRegion: 'Pelvis', supportsLaterality: false, defaultViewsOrProtocols: ['Pelvis Transabdominal'] },
      { name: 'Renal / Urinary Tract (KUB)', bodyRegion: 'Abdomen', supportsLaterality: true, defaultViewsOrProtocols: ['Renal & Bladder (KUB)'] },
      { name: 'Thyroid / Neck', bodyRegion: 'Neck', supportsLaterality: false, defaultViewsOrProtocols: ['Thyroid Ultrasound'] },
      { name: 'Breast', bodyRegion: 'Chest', supportsLaterality: true, defaultViewsOrProtocols: ['Breast Ultrasound'] },
      { name: 'Scrotum / Testicular', bodyRegion: 'Pelvis', supportsLaterality: true, defaultViewsOrProtocols: ['Scrotal / Testicular Ultrasound'] },
      { name: 'Vascular / Doppler', bodyRegion: 'Lower Limb', supportsLaterality: true, defaultViewsOrProtocols: ['Venous Doppler (DVT)'] },
      { name: 'Musculoskeletal (MSK)', bodyRegion: 'Upper Limb', supportsLaterality: true, defaultViewsOrProtocols: ['Musculoskeletal Joint / Tendon'] },
    ],
  },

  'Mammogram': {
    modality: 'Mammogram',
    optionTypeLabel: 'Mammogram Examination Type',
    isMultiOptionAllowed: false,
    availableViewsOrProtocols: [
      'Diagnostic Mammogram',
      'Screening Mammogram',
      'Tomosynthesis (3D Mammogram)',
      'Ultrasound-Guided Breast Biopsy',
      'Stereotactic Breast Biopsy',
    ],
    bodyParts: [
      { name: 'Breast', bodyRegion: 'Chest', supportsLaterality: true, defaultViewsOrProtocols: ['Screening Mammogram'] },
    ],
  },
};

export function getModalityRef(modality: string): ModalityReference {
  const normKey = modality === 'X-Ray' ? 'X-Ray'
    : (modality.includes('CT') ? 'CT Scan'
      : (modality.includes('MRI') ? 'MRI'
        : (modality.includes('Ultrasound') ? 'Ultrasound' : 'Mammogram')));
  return MODALITY_REFERENCE_DATASET[normKey] || MODALITY_REFERENCE_DATASET['X-Ray'];
}

export function getSideOptions(supportsLaterality: boolean): ExaminationSide[] {
  return supportsLaterality ? ['Left', 'Right', 'Bilateral', 'N/A'] : ['N/A'];
}
