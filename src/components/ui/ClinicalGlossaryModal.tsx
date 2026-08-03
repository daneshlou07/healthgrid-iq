import React, { useState } from 'react';
import { Search, BookOpen, X, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface GlossaryTerm {
  term: string;
  category: 'Roles & Staff' | 'Scans & Modalities' | 'Safety & Clinical' | 'Billing & MOH Rules';
  shortDefEn: string;
  shortDefMs: string;
  explanationEn: string;
  explanationMs: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Case / Referral Intake',
    category: 'Scans & Modalities',
    shortDefEn: 'Official doctor request for a patient imaging scan.',
    shortDefMs: 'Permohonan rasmi doktor untuk ujian imbasan pesakit.',
    explanationEn: 'Every scan starts with a Case. The Medical Officer fills in patient details, body regions, and clinical symptoms.',
    explanationMs: 'Setiap imbasan bermula dengan Kes. Pegawai Perubatan memasukkan maklumat pesakit dan simptom klinikal.',
  },
  {
    term: 'Modality',
    category: 'Scans & Modalities',
    shortDefEn: 'The type of imaging equipment used for the scan.',
    shortDefMs: 'Jenis peralatan imbasan yang digunakan.',
    explanationEn: 'Common modalities include X-Ray (general radiograph), CT Scan (3D cross-section), MRI (magnetic imaging), and Ultrasound.',
    explanationMs: 'Modaliti utama merangkumi X-Ray (radiograf am), Imbasan CT (keratan 3D), MRI (medan magnet), dan Ultrabunyi.',
  },
  {
    term: 'Medical Officer (MO)',
    category: 'Roles & Staff',
    shortDefEn: 'The primary clinic or ward doctor treating the patient.',
    shortDefMs: 'Doktor perawat utama di klinik atau wad.',
    explanationEn: 'The MO orders the radiology scan, performs routine primary image reviews, or requests 2nd opinions from Specialist Radiologists.',
    explanationMs: 'MO memesan imbasan radiologi, membuat semakan awal rutin, atau memohon pandangan kedua daripada Pakar Radiologi.',
  },
  {
    term: 'Radiographer (Juru X-Ray)',
    category: 'Roles & Staff',
    shortDefEn: 'The healthcare technologist operating the imaging machine.',
    shortDefMs: 'Juruteknologi kesihatan yang mengendalikan mesin imbasan.',
    explanationEn: 'The Radiographer performs the scan, positions the patient, records exposure settings (kVp/mAs), and verifies image quality.',
    explanationMs: 'Juru X-Ray melakukan imbasan, mengatur kedudukan pesakit, mencatat tetapan pendedahan (kVp/mAs), dan mengesahkan kualiti imbasan.',
  },
  {
    term: 'Radiologist (Pakar Radiologi)',
    category: 'Roles & Staff',
    shortDefEn: 'Specialist doctor who writes official diagnostic reports.',
    shortDefMs: 'Doktor pakar yang menulis laporan diagnostik rasmi.',
    explanationEn: 'Radiologists examine complex DICOM images, detect abnormalities or critical findings, and sign off legal diagnostic reports.',
    explanationMs: 'Pakar Radiologi menganalisis imbasan DICOM kompleks, mengesan kejanggalan, dan mengesahkan laporan rasmi.',
  },
  {
    term: 'Views / Projection Protocol',
    category: 'Scans & Modalities',
    shortDefEn: 'The specific anatomical angle for taking an X-Ray.',
    shortDefMs: 'Sudut anatomi khusus untuk mengambil imbasan X-Ray.',
    explanationEn: 'Examples: PA (Posteroanterior - chest front), AP (Anteroposterior - front-to-back), Lateral (side view), and Oblique (angled view).',
    explanationMs: 'Contoh: PA (Pandangan hadapan), AP (Depan-ke-belakang), Lateral (Pandangan sisi), dan Oblique (Pandangan senget).',
  },
  {
    term: 'LMP (Last Menstrual Period)',
    category: 'Safety & Clinical',
    shortDefEn: 'Date of patient\'s last menstrual period (Safety Check).',
    shortDefMs: 'Tarikh haid terakhir pesakit (Semakan Keselamatan).',
    explanationEn: 'Crucial radiation safety check. Radiation from X-Rays/CTs can harm an early pregnancy, so LMP verifies pregnancy status before scanning.',
    explanationMs: 'Semakan keselamatan sinaran yang amat penting untuk mengelakkan pendedahan radiasi kepada janin sekiranya pesakit hamil.',
  },
  {
    term: 'kVp & mAs',
    category: 'Safety & Clinical',
    shortDefEn: 'Machine electrical voltage (kVp) and current time (mAs).',
    shortDefMs: 'Voltan elektrik (kVp) dan arus masa (mAs) mesin.',
    explanationEn: 'Technical exposure factors controlled by the radiographer to achieve optimal image contrast and sharpness while minimizing radiation dose.',
    explanationMs: 'Faktor pendedahan teknikal yang dikawal oleh juru X-ray untuk memastikan kualiti gambaran imbasan yang jelas.',
  },
  {
    term: 'Radiation Dose (mSv)',
    category: 'Safety & Clinical',
    shortDefEn: 'Measurement of effective radiation exposure in millisieverts.',
    shortDefMs: 'Ukuran pendedahan radiasi berkesan dalam millisievert.',
    explanationEn: 'Logged on MOH forms to track patient radiation safety and ensure exposure remains strictly within Ministry of Health diagnostic reference guidelines.',
    explanationMs: 'Dicatat dalam borang KKM untuk mengawasi keselamatan pesakit dan memastikan pendedahan radiasi dalam had yang selamat.',
  },
  {
    term: 'FPP (Full Paying Patient / Skim FPP)',
    category: 'Billing & MOH Rules',
    shortDefEn: 'Ministry of Health full-paying private patient scheme.',
    shortDefMs: 'Skim pesakit bayar penuh (FPP) Kementerian Kesihatan Malaysia.',
    explanationEn: 'Determines billing category: Full Paying Patient (FPP rate), Civil Servant (Free government rate), or Subsidized Citizen rate.',
    explanationMs: 'Menentukan kategori bayaran: Skim Bayar Penuh (FPP), Penjawat Awam (Percuma), atau Warganegara Bersubsidi.',
  },
  {
    term: 'MRN (Medical Record Number)',
    category: 'Billing & MOH Rules',
    shortDefEn: 'Unique hospital patient record identifier.',
    shortDefMs: 'Nombor pendaftaran induk pesakit hospital.',
    explanationEn: 'Unique lifelong registration number linking all patient scans, clinical notes, and diagnostic reports in the hospital database.',
    explanationMs: 'Nombor pendaftaran rasmi pesakit yang menghubungkan semua imbasan dan laporan perubatan pesakit.',
  },
  {
    term: 'PER.SS-RA301',
    category: 'Billing & MOH Rules',
    shortDefEn: 'Official KKM / MOH Radiology Requisition Form.',
    shortDefMs: 'Borang Permohonan Pemeriksaan X-Ray Rasmi KKM.',
    explanationEn: 'The mandatory Ministry of Health Malaysia paper form (PER.SS-RA301) digitalized into HealthGrid IQ for print, PDF export, and legal compliance.',
    explanationMs: 'Borang rasmi Kementerian Kesihatan Malaysia (PER.SS-RA301) yang telah didigitalkan untuk cetakan dan simpanan sah.',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClinicalGlossaryModal({ isOpen, onClose }: Props) {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Roles & Staff', 'Scans & Modalities', 'Safety & Clinical', 'Billing & MOH Rules'];

  const filteredTerms = GLOSSARY_TERMS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.term.toLowerCase().includes(q) ||
      item.shortDefEn.toLowerCase().includes(q) ||
      item.shortDefMs.toLowerCase().includes(q) ||
      item.explanationEn.toLowerCase().includes(q) ||
      item.explanationMs.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0F4C42] flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4 text-[#0F4C42]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-navy-900 leading-tight">
                {t('Medical & Clinical Glossary', 'Glosari Terma & Singkatan Perubatan')}
              </h3>
              <p className="text-xs text-surface-500">
                {t('Plain English & BM explanations for hospital terms, acronyms, and safety rules', 'Penerangan ringkas untuk istilah perubatan, singkatan, dan peraturan keselamatan')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search term, acronym, or meaning (e.g. LMP, MO, Modality)...', 'Cari istilah, singkatan, atau maksud (cth. LMP, MO, Modaliti)...')}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/20 focus:border-[#0F4C42]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#0F4C42] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Glossary Terms List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredTerms.length > 0 ? (
            filteredTerms.map((item) => (
              <div key={item.term} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-navy-900 flex items-center gap-2">
                    <span>{item.term}</span>
                  </h4>
                  <span className="text-[10px] font-bold text-[#0F4C42] bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  {language === 'ms' ? item.shortDefMs : item.shortDefEn}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed pt-1 border-t border-slate-200/60">
                  <Info className="w-3.5 h-3.5 text-[#0F4C42] inline mr-1 -mt-0.5" />
                  {language === 'ms' ? item.explanationMs : item.explanationEn}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              {t('No glossary terms matched your search.', 'Tiada istilah glosari yang sepadan dengan carian anda.')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
          <span>{filteredTerms.length} {t('Terms Listed', 'Istilah Senarai')}</span>
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-1.5 font-semibold">
            {t('Close Glossary', 'Tutup Glosari')}
          </button>
        </div>
      </div>
    </div>
  );
}
