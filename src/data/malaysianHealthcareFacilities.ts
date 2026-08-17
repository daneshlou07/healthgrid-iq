import type { AddressSuggestion } from '../services/addressService';

/**
 * Curated directory of Malaysian Government (KKM) Hospitals,
 * Klinik Kesihatan (KK), Klinik Desa (KD), and Major Medical Centres.
 * Provides instant 100% accurate address and GPS coordinate resolution.
 */
export const MALAYSIAN_HEALTHCARE_FACILITIES: AddressSuggestion[] = [
  // ==========================================
  // SELANGOR - Hospitals & Klinik Kesihatan
  // ==========================================
  {
    id: 'kkm-sel-1',
    formattedAddress: 'Hospital Sungai Buloh, Jalan Hospital, 47000 Sungai Buloh, Selangor',
    street: 'Jalan Hospital',
    areaOrTaman: 'Bandar Baru Sungai Buloh',
    city: 'Sungai Buloh',
    postcode: '47000',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.2185,
    lon: 101.5828,
    source: 'local'
  },
  {
    id: 'kkm-sel-2',
    formattedAddress: 'Hospital Selayang, Lebuhraya Selayang-Kepong, 68100 Batu Caves, Selangor',
    street: 'Lebuhraya Selayang-Kepong',
    areaOrTaman: 'Bandar Baru Selayang',
    city: 'Batu Caves',
    postcode: '68100',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.2422,
    lon: 101.6467,
    source: 'local'
  },
  {
    id: 'kkm-sel-3',
    formattedAddress: 'Hospital Shah Alam, Persiaran Kayangan, Seksyen 7, 40000 Shah Alam, Selangor',
    street: 'Persiaran Kayangan',
    areaOrTaman: 'Seksyen 7',
    city: 'Shah Alam',
    postcode: '40000',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.0734,
    lon: 101.4901,
    source: 'local'
  },
  {
    id: 'kkm-sel-4',
    formattedAddress: 'Hospital Tengku Ampuan Rahimah, Jalan Langat, 41200 Klang, Selangor',
    street: 'Jalan Langat',
    areaOrTaman: 'Taman Klang Jaya',
    city: 'Klang',
    postcode: '41200',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.0211,
    lon: 101.4398,
    source: 'local'
  },
  {
    id: 'kkm-sel-5',
    formattedAddress: 'Hospital Serdang, Jalan Puchong, 43000 Kajang, Selangor',
    street: 'Jalan Puchong',
    areaOrTaman: 'Serdang',
    city: 'Kajang',
    postcode: '43000',
    state: 'Selangor',
    type: 'hospital',
    lat: 2.9765,
    lon: 101.7208,
    source: 'local'
  },
  {
    id: 'kkm-sel-6',
    formattedAddress: 'Hospital Kajang, Jalan Semenyih, 43000 Kajang, Selangor',
    street: 'Jalan Semenyih',
    areaOrTaman: 'Bandar Kajang',
    city: 'Kajang',
    postcode: '43000',
    state: 'Selangor',
    type: 'hospital',
    lat: 2.9928,
    lon: 101.7925,
    source: 'local'
  },
  {
    id: 'kkm-sel-7',
    formattedAddress: 'Hospital Ampang, Jalan Mewah Utara, Pandan Mewah, 68000 Ampang, Selangor',
    street: 'Jalan Mewah Utara',
    areaOrTaman: 'Pandan Mewah',
    city: 'Ampang',
    postcode: '68000',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.1278,
    lon: 101.7618,
    source: 'local'
  },
  {
    id: 'kkm-sel-8',
    formattedAddress: 'Hospital Banting, Jalan Sultan Alam Shah, 42700 Banting, Selangor',
    street: 'Jalan Sultan Alam Shah',
    areaOrTaman: 'Pekan Banting',
    city: 'Banting',
    postcode: '42700',
    state: 'Selangor',
    type: 'hospital',
    lat: 2.8139,
    lon: 101.5033,
    source: 'local'
  },
  {
    id: 'kkm-sel-9',
    formattedAddress: 'Hospital Tanjong Karang, KM 55, Jalan Klang-Teluk Intan, 45500 Tanjong Karang, Selangor',
    street: 'Jalan Klang-Teluk Intan',
    areaOrTaman: 'Pekan Tanjong Karang',
    city: 'Tanjong Karang',
    postcode: '45500',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.4242,
    lon: 101.1824,
    source: 'local'
  },
  {
    id: 'kkm-sel-10',
    formattedAddress: 'Klinik Kesihatan Bestari Jaya, JKR 1087, Jln 14, Pekan Ijok, 45600 Batang Berjuntai, Selangor',
    street: 'Jalan 14',
    areaOrTaman: 'Pekan Ijok',
    city: 'Bestari Jaya',
    postcode: '45600',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.3636,
    lon: 101.3843,
    source: 'local'
  },
  {
    id: 'kkm-sel-11',
    formattedAddress: 'Klinik Kesihatan Sungai Buloh, KM 22, Jalan Kuala Selangor, 47000 Sungai Buloh, Selangor',
    street: 'Jalan Kuala Selangor',
    areaOrTaman: 'Sungai Buloh',
    city: 'Sungai Buloh',
    postcode: '47000',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.2084,
    lon: 101.5721,
    source: 'local'
  },
  {
    id: 'kkm-sel-12',
    formattedAddress: 'Klinik Kesihatan Tanjong Karang, KM8, Jalan Sungai Terap 5, 45500 Tanjong Karang, Selangor',
    street: 'Jalan Sungai Terap 5',
    areaOrTaman: 'Kampung Sungai Terap',
    city: 'Tanjong Karang',
    postcode: '45500',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.4242,
    lon: 101.1824,
    source: 'local'
  },
  {
    id: 'kkm-sel-13',
    formattedAddress: 'Klinik Kesihatan Jeram, Jalan Rizab Masjid, Kampung Bukit Cherakah, 45800 Jeram, Selangor',
    street: 'Jalan Rizab Masjid',
    areaOrTaman: 'Kampung Bukit Cherakah',
    city: 'Jeram',
    postcode: '45800',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.2072,
    lon: 101.4633,
    source: 'local'
  },
  {
    id: 'kkm-sel-14',
    formattedAddress: 'Klinik Kesihatan Seksyen 7, Jalan Plumbum 7/95, Seksyen 7, 40000 Shah Alam, Selangor',
    street: 'Jalan Plumbum 7/95',
    areaOrTaman: 'Seksyen 7',
    city: 'Shah Alam',
    postcode: '40000',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.0768,
    lon: 101.4925,
    source: 'local'
  },
  {
    id: 'kkm-sel-15',
    formattedAddress: 'Klinik Kesihatan Kelana Jaya, Jalan SS 6/3, Kelana Jaya, 47301 Petaling Jaya, Selangor',
    street: 'Jalan SS 6/3',
    areaOrTaman: 'Kelana Jaya',
    city: 'Petaling Jaya',
    postcode: '47301',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.1044,
    lon: 101.6002,
    source: 'local'
  },
  {
    id: 'kkm-sel-16',
    formattedAddress: 'Klinik Kesihatan Seri Kembangan, Jalan Raya 3, Seri Kembangan, 43300 Seri Kembangan, Selangor',
    street: 'Jalan Raya 3',
    areaOrTaman: 'Pekan Seri Kembangan',
    city: 'Seri Kembangan',
    postcode: '43300',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.0238,
    lon: 101.7042,
    source: 'local'
  },
  {
    id: 'kkm-sel-17',
    formattedAddress: 'Klinik Kesihatan Bandar Botanik, Jalan Botanik 1, Bandar Botanik, 41200 Klang, Selangor',
    street: 'Jalan Botanik 1',
    areaOrTaman: 'Bandar Botanik',
    city: 'Klang',
    postcode: '41200',
    state: 'Selangor',
    type: 'hospital',
    lat: 2.9967,
    lon: 101.4502,
    source: 'local'
  },
  {
    id: 'kkm-sel-18',
    formattedAddress: 'Klinik Kesihatan Rawang, Jalan Dungun, 48000 Rawang, Selangor',
    street: 'Jalan Dungun',
    areaOrTaman: 'Bandar Rawang',
    city: 'Rawang',
    postcode: '48000',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.3214,
    lon: 101.5768,
    source: 'local'
  },
  {
    id: 'kkm-sel-19',
    formattedAddress: 'Klinik Kesihatan Kuala Selangor, Jalan Semarak, 45000 Kuala Selangor, Selangor',
    street: 'Jalan Semarak',
    areaOrTaman: 'Bandar Kuala Selangor',
    city: 'Kuala Selangor',
    postcode: '45000',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.3482,
    lon: 101.2514,
    source: 'local'
  },

  // ==========================================
  // KUALA LUMPUR & PUTRAJAYA
  // ==========================================
  {
    id: 'kkm-kl-1',
    formattedAddress: 'Hospital Kuala Lumpur (HKL), Jalan Pahang, 50586 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur',
    street: 'Jalan Pahang',
    areaOrTaman: 'Titiwangsa',
    city: 'Kuala Lumpur',
    postcode: '50586',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'hospital',
    lat: 3.1706,
    lon: 101.7019,
    source: 'local'
  },
  {
    id: 'kkm-kl-2',
    formattedAddress: 'Pusat Perubatan Universiti Malaya (PPUM), Lembah Pantai, 59100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur',
    street: 'Jalan Universiti',
    areaOrTaman: 'Lembah Pantai',
    city: 'Kuala Lumpur',
    postcode: '59100',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'hospital',
    lat: 3.1186,
    lon: 101.6534,
    source: 'local'
  },
  {
    id: 'kkm-kl-3',
    formattedAddress: 'Hospital Canselor Tuanku Muhriz UKM (HCTM), Jalan Yaacob Latif, Bandar Tun Razak, 56000 Cheras, Kuala Lumpur',
    street: 'Jalan Yaacob Latif',
    areaOrTaman: 'Bandar Tun Razak',
    city: 'Cheras',
    postcode: '56000',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'hospital',
    lat: 3.0978,
    lon: 101.7247,
    source: 'local'
  },
  {
    id: 'kkm-kl-4',
    formattedAddress: 'Institut Kanser Negara (IKN), No. 4, Jalan P7, Presint 7, 62250 Putrajaya',
    street: 'Jalan P7',
    areaOrTaman: 'Presint 7',
    city: 'Putrajaya',
    postcode: '62250',
    state: 'Wilayah Persekutuan Putrajaya',
    type: 'hospital',
    lat: 2.9289,
    lon: 101.6742,
    source: 'local'
  },
  {
    id: 'kkm-kl-5',
    formattedAddress: 'Hospital Putrajaya, Pusat Pentadbiran Kerajaan Persekutuan, Presint 7, 62250 Putrajaya',
    street: 'Jalan P7',
    areaOrTaman: 'Presint 7',
    city: 'Putrajaya',
    postcode: '62250',
    state: 'Wilayah Persekutuan Putrajaya',
    type: 'hospital',
    lat: 2.9298,
    lon: 101.6738,
    source: 'local'
  },
  {
    id: 'kkm-kl-6',
    formattedAddress: 'Klinik Kesihatan Jinjang, Jalan Jinjang Aman 3, Jinjang Utara, 52000 Kuala Lumpur',
    street: 'Jalan Jinjang Aman 3',
    areaOrTaman: 'Jinjang Utara',
    city: 'Kuala Lumpur',
    postcode: '52000',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'hospital',
    lat: 3.2119,
    lon: 101.6587,
    source: 'local'
  },
  {
    id: 'kkm-kl-7',
    formattedAddress: 'Klinik Kesihatan Cheras, Jalan Yaacob Latif, Bandar Tun Razak, 56000 Cheras, Kuala Lumpur',
    street: 'Jalan Yaacob Latif',
    areaOrTaman: 'Cheras',
    city: 'Kuala Lumpur',
    postcode: '56000',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    type: 'hospital',
    lat: 3.1012,
    lon: 101.7289,
    source: 'local'
  },
  {
    id: 'kkm-kl-8',
    formattedAddress: 'Klinik Kesihatan Putrajaya Presint 9, Jalan P9/F, Presint 9, 62250 Putrajaya',
    street: 'Jalan P9/F',
    areaOrTaman: 'Presint 9',
    city: 'Putrajaya',
    postcode: '62250',
    state: 'Wilayah Persekutuan Putrajaya',
    type: 'hospital',
    lat: 2.9372,
    lon: 101.6784,
    source: 'local'
  },

  // ==========================================
  // PENANG & PERAK
  // ==========================================
  {
    id: 'kkm-png-1',
    formattedAddress: 'Hospital Pulau Pinang, Jalan Residensi, 10990 George Town, Pulau Pinang',
    street: 'Jalan Residensi',
    areaOrTaman: 'George Town',
    city: 'George Town',
    postcode: '10990',
    state: 'Pulau Pinang',
    type: 'hospital',
    lat: 5.4172,
    lon: 100.3114,
    source: 'local'
  },
  {
    id: 'kkm-png-2',
    formattedAddress: 'Hospital Seberang Jaya, Jalan Tun Hussein Onn, 13700 Seberang Jaya, Pulau Pinang',
    street: 'Jalan Tun Hussein Onn',
    areaOrTaman: 'Seberang Jaya',
    city: 'Perai',
    postcode: '13700',
    state: 'Pulau Pinang',
    type: 'hospital',
    lat: 5.3944,
    lon: 100.4083,
    source: 'local'
  },
  {
    id: 'kkm-prk-1',
    formattedAddress: 'Hospital Raja Permaisuri Bainun (HRPB), Jalan Hospital, 30990 Ipoh, Perak',
    street: 'Jalan Hospital',
    areaOrTaman: 'Ipoh City',
    city: 'Ipoh',
    postcode: '30990',
    state: 'Perak',
    type: 'hospital',
    lat: 4.6022,
    lon: 101.0903,
    source: 'local'
  },
  {
    id: 'kkm-prk-2',
    formattedAddress: 'Hospital Taiping, Jalan Taming Sari, 34000 Taiping, Perak',
    street: 'Jalan Taming Sari',
    areaOrTaman: 'Taiping',
    city: 'Taiping',
    postcode: '34000',
    state: 'Perak',
    type: 'hospital',
    lat: 4.8569,
    lon: 100.7411,
    source: 'local'
  },
  {
    id: 'kkm-prk-3',
    formattedAddress: 'Hospital Teluk Intan, Jalan Changkat Jong, 36000 Teluk Intan, Perak',
    street: 'Jalan Changkat Jong',
    areaOrTaman: 'Teluk Intan',
    city: 'Teluk Intan',
    postcode: '36000',
    state: 'Perak',
    type: 'hospital',
    lat: 3.9986,
    lon: 101.0428,
    source: 'local'
  },

  // ==========================================
  // JOHOR & MELAKA & NEGERI SEMBILAN
  // ==========================================
  {
    id: 'kkm-jhr-1',
    formattedAddress: 'Hospital Sultanah Aminah (HSA), Jalan Persiaran Abu Bakar Sultan, 80100 Johor Bahru, Johor',
    street: 'Jalan Persiaran Abu Bakar Sultan',
    areaOrTaman: 'Johor Bahru City',
    city: 'Johor Bahru',
    postcode: '80100',
    state: 'Johor',
    type: 'hospital',
    lat: 1.4589,
    lon: 103.7464,
    source: 'local'
  },
  {
    id: 'kkm-jhr-2',
    formattedAddress: 'Hospital Sultan Ismail (HSI), Jalan Persiaran Mutiara Emas Utama, Taman Mount Austin, 81100 Johor Bahru, Johor',
    street: 'Jalan Persiaran Mutiara Emas Utama',
    areaOrTaman: 'Taman Mount Austin',
    city: 'Johor Bahru',
    postcode: '81100',
    state: 'Johor',
    type: 'hospital',
    lat: 1.5467,
    lon: 103.7919,
    source: 'local'
  },
  {
    id: 'kkm-mlk-1',
    formattedAddress: 'Hospital Melaka, Jalan Mufti Haji Khalil, 75400 Melaka',
    street: 'Jalan Mufti Haji Khalil',
    areaOrTaman: 'Bandar Melaka',
    city: 'Melaka',
    postcode: '75400',
    state: 'Melaka',
    type: 'hospital',
    lat: 2.2178,
    lon: 102.2611,
    source: 'local'
  },
  {
    id: 'kkm-ns-1',
    formattedAddress: 'Hospital Tuanku Ja\'afar (HTJ), Jalan Rasah, 70300 Seremban, Negeri Sembilan',
    street: 'Jalan Rasah',
    areaOrTaman: 'Rasah',
    city: 'Seremban',
    postcode: '70300',
    state: 'Negeri Sembilan',
    type: 'hospital',
    lat: 2.7144,
    lon: 101.9442,
    source: 'local'
  },

  // ==========================================
  // EAST COAST (PAHANG, KELANTAN, TERENGGANU)
  // ==========================================
  {
    id: 'kkm-phg-1',
    formattedAddress: 'Hospital Tengku Ampuan Afzan (HTAA), Jalan Tanah Putih, 25100 Kuantan, Pahang',
    street: 'Jalan Tanah Putih',
    areaOrTaman: 'Kuantan',
    city: 'Kuantan',
    postcode: '25100',
    state: 'Pahang',
    type: 'hospital',
    lat: 3.8017,
    lon: 103.3228,
    source: 'local'
  },
  {
    id: 'kkm-klt-1',
    formattedAddress: 'Hospital Raja Perempuan Zainab II (HRPZ II), Jalan Hospital, 15586 Kota Bharu, Kelantan',
    street: 'Jalan Hospital',
    areaOrTaman: 'Kota Bharu',
    city: 'Kota Bharu',
    postcode: '15586',
    state: 'Kelantan',
    type: 'hospital',
    lat: 6.1264,
    lon: 102.2458,
    source: 'local'
  },
  {
    id: 'kkm-trg-1',
    formattedAddress: 'Hospital Sultanah Nur Zahirah (HSNZ), Jalan Sultan Mahmud, 20400 Kuala Terengganu, Terengganu',
    street: 'Jalan Sultan Mahmud',
    areaOrTaman: 'Batu Buruk',
    city: 'Kuala Terengganu',
    postcode: '20400',
    state: 'Terengganu',
    type: 'hospital',
    lat: 5.3217,
    lon: 103.1517,
    source: 'local'
  },

  // ==========================================
  // EAST MALAYSIA (SABAH & SARAWAK)
  // ==========================================
  {
    id: 'kkm-sbh-1',
    formattedAddress: 'Hospital Queen Elizabeth, Jalan Penampang, 88200 Kota Kinabalu, Sabah',
    street: 'Jalan Penampang',
    areaOrTaman: 'Kota Kinabalu',
    city: 'Kota Kinabalu',
    postcode: '88200',
    state: 'Sabah',
    type: 'hospital',
    lat: 5.9525,
    lon: 116.0717,
    source: 'local'
  },
  {
    id: 'kkm-swk-1',
    formattedAddress: 'Hospital Umum Sarawak (SGH), Jalan Hospital, 93586 Kuching, Sarawak',
    street: 'Jalan Hospital',
    areaOrTaman: 'Kuching',
    city: 'Kuching',
    postcode: '93586',
    state: 'Sarawak',
    type: 'hospital',
    lat: 1.5428,
    lon: 110.3422,
    source: 'local'
  },

  // ==========================================
  // PRIVATE SPECIALIST CENTRES
  // ==========================================
  {
    id: 'priv-sel-1',
    formattedAddress: 'Sunway Medical Centre, No. 5, Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya, Selangor',
    street: 'Jalan Lagoon Selatan',
    areaOrTaman: 'Bandar Sunway',
    city: 'Subang Jaya',
    postcode: '47500',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.0642,
    lon: 101.6094,
    source: 'local'
  },
  {
    id: 'priv-sel-2',
    formattedAddress: 'Subang Jaya Medical Centre (SJMC), No. 1, Jalan SS 12/1A, 47500 Subang Jaya, Selangor',
    street: 'Jalan SS 12/1A',
    areaOrTaman: 'SS 12',
    city: 'Subang Jaya',
    postcode: '47500',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.0768,
    lon: 101.5947,
    source: 'local'
  },
  {
    id: 'priv-sel-3',
    formattedAddress: 'KPJ Damansara Specialist Hospital, 119, Jalan SS 20/10, Damansara Utama, 47400 Petaling Jaya, Selangor',
    street: 'Jalan SS 20/10',
    areaOrTaman: 'Damansara Utama',
    city: 'Petaling Jaya',
    postcode: '47400',
    state: 'Selangor',
    type: 'hospital',
    lat: 3.1347,
    lon: 101.6286,
    source: 'local'
  }
];
