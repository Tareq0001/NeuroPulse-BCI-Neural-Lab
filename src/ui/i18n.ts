import { Language } from '../types';

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    app_title: 'NeuroPulse BCI Lab',
    app_subtitle: 'Digital Twin for Brain-Computer Interface & Neural Signal Processing',
    teacher_name: 'Eng. Tareq Abouashi',

    // Scenarios
    scenario_motor: 'Motor Imagery BCI: Robotic Prosthetic Control',
    scenario_p300: 'P300 Alphanumeric Mind-Speller Matrix',
    scenario_seizure: 'Epileptic Seizure: 3Hz Spike-Wave Detection',
    scenario_berger: 'Berger Effect: Occipital Alpha Wave (O1/O2)',
    scenario_sleep: 'Sleep Staging & Polysomnography Hypnogram',
    scenario_free: 'Free Multi-Channel Clinical Stream',

    // Tabs / Views
    tab_overview: '3D Cortical Lab',
    tab_polygraph: '16-Ch Polygraph',
    tab_dsp: 'FFT & Spectrogram',
    tab_speller: 'P300 Speller',
    tab_prosthetic: 'Prosthetic Hand',
    tab_diagnostics: 'Diagnostics & Sleep',

    // BCI Motor Imagery
    motor_intent: 'Decoded Motor Intent',
    motor_left: 'Left Hand (C4 ERD)',
    motor_right: 'Right Hand (C3 ERD)',
    motor_rest: 'Rest Baseline',
    prob_left: 'Left Confidence',
    prob_right: 'Right Confidence',
    prob_rest: 'Rest Confidence',
    mu_c3: 'C3 Mu Power (Left Motor)',
    mu_c4: 'C4 Mu Power (Right Motor)',
    erd_ratio: 'Hemispheric ERD Index',

    // P300 Speller
    speller_title: 'Oddball Visual P300 Speller',
    speller_target: 'Target Character',
    speller_decoded: 'Mind-Decoded Letter',
    speller_buffer: 'Spelled Sentence Buffer',
    speller_accuracy: 'Classification Confidence',

    // Diagnostics
    diag_seizure_status: 'Seizure Surveillance Status',
    diag_normal: 'Normal Baseline EEG',
    diag_seizure_alert: 'PAROXYSMAL 3-HZ SPIKE-WAVE SEIZURE DETECTED!',
    diag_duration: 'Discharge Duration',
    diag_hypnogram: '4-Stage Sleep Progression',
    diag_impedance: '10-20 Electrode Impedance Quality',
    impedance_good: '< 5 kΩ (Optimal)',
    impedance_medium: '5 - 10 kΩ (Acceptable)',
    impedance_bad: '> 10 kΩ (High Noise)',

    // Frequency Bands
    band_delta: 'Delta (0.5 - 4 Hz) Deep Restorative',
    band_theta: 'Theta (4 - 8 Hz) Drowsiness / Memory',
    band_alpha: 'Alpha (8 - 13 Hz) Relaxed Berger Wave',
    band_beta: 'Beta (13 - 30 Hz) Active Cognition',
    band_gamma: 'Gamma (30 - 60 Hz) Sensory Binding',

    // Filters
    filter_dc: '0.5 Hz High-Pass (DC Drift Removal)',
    filter_lp: '40 Hz Low-Pass (HF Muscle Rejection)',
    filter_notch50: '50 Hz Notch (EU/AS Line Hum)',
    filter_notch60: '60 Hz Notch (US Line Hum)',
    filter_car: 'Adaptive Spatial Filter (CAR / Blink Rejection)',

    // Audio Neurofeedback
    audio_title: 'Web Audio Neuro-Feedback Synthesizer',
    audio_binaural: 'Binaural Beats (Stereo L/R)',
    audio_isochronic: 'Isochronic Pulses',
    audio_start: 'Enable Audio Feedback',
    audio_stop: 'Mute Audio Feedback',
    audio_volume: 'Volume',

    // Controls
    btn_eyes: 'Toggle Eyes Closed / Open',
    btn_blink: 'Simulate Eye Blink (EOG)',
    btn_emg: 'Simulate Jaw Clench (EMG)',
    btn_line_noise: 'Simulate 50Hz Hum',
    btn_wireframe: 'Cortex Wireframe',
    btn_skull: 'Skull Mesh',
    btn_brodmann: 'Brodmann Areas (M1/V1/PFC)',
    btn_reset: 'Reset Stream',

    // Status
    status_sample_rate: 'Sample Rate: 250 Hz (16-Ch)',
    status_channels: 'Montage: 10-20 System',
    status_connected: 'Stream Active (Synthesized Physical Rig)'
  },
  ar: {
    app_title: 'مختبر نيوروبلس لمعالجة الإشارات العصبية (BCI)',
    app_subtitle: 'التوأم الرقمي لواجهة الدماغ والحاسوب وتحليل التخطيط الدماغي ثلاثي الأبعاد',
    teacher_name: 'أ. طارق ابوعشي',

    // Scenarios
    scenario_motor: 'التخيل الحركي BCI: التحكم باليد الاصطناعية الآلية',
    scenario_p300: 'مصفوفة هجاء الحروف الذهني P300 عبر الانتباه البصري',
    scenario_seizure: 'كشف نوبات الصرع: تفريغات شوكة وموجة 3 هرتز المعممة',
    scenario_berger: 'تأثير بيرغر: تزامن موجات ألفا القذالية (إغماض العينين)',
    scenario_sleep: 'تخطيط ومراحل النوم وتتبع الدورة الحيوية (Hypnogram)',
    scenario_free: 'المعمل السريري المفتوح لـ 16 قناة تخطيط',

    // Tabs / Views
    tab_overview: 'القشرة المخية 3D',
    tab_polygraph: 'مخطط 16 قناة (Polygraph)',
    tab_dsp: 'تحليل فورييه والشلال الطيفي',
    tab_speller: 'هجاء الحروف الذهني P300',
    tab_prosthetic: 'اليد الاصطناعية 3D',
    tab_diagnostics: 'التشخيص ونوبات الصرع',

    // BCI Motor Imagery
    motor_intent: 'النية الحركية المفكوكة عصبياً',
    motor_left: 'اليد اليسرى (تثبيط C4 ERD)',
    motor_right: 'اليد اليمنى (تثبيط C3 ERD)',
    motor_rest: 'حالة الاسترخاء / الراحة',
    prob_left: 'ثقة حركة اليسار',
    prob_right: 'ثقة حركة اليمين',
    prob_rest: 'ثقة وضع الراحة',
    mu_c3: 'قدرة إيقاع مو C3 (القشرة اليسرى)',
    mu_c4: 'قدرة إيقاع مو C4 (القشرة اليمنى)',
    erd_ratio: 'مؤشر نزع التزامن بين نصفي الدماغ (ERD)',

    // P300 Speller
    speller_title: 'مصفوفة الهجاء العصبي بالكمون المستثار P300',
    speller_target: 'الحرف المستهدف بصرياً',
    speller_decoded: 'الحرف المفكوك عصبياً',
    speller_buffer: 'سجل الكلمات المكتوبة ذهنياً',
    speller_accuracy: 'دقة وتطابق النموذج العصبي',

    // Diagnostics
    diag_seizure_status: 'مراقبة النشاط الصرعي الآلي',
    diag_normal: 'تخطيط دماغي سليم ومستقر',
    diag_seizure_alert: 'تنبيه سريري: رصد تفريغ صرعي حاد (3Hz Spike-and-Wave)!',
    diag_duration: 'مدة النوبة الصرعية',
    diag_hypnogram: 'مراحل النوم الأربعة (Wake, N1, N2, N3, REM)',
    diag_impedance: 'جودة ملامسة ومقاومة أقطاب 10-20',
    impedance_good: '< 5 ك.أوم (مثالية)',
    impedance_medium: '5 - 10 ك.أوم (مقبولة)',
    impedance_bad: '> 10 ك.أوم (ضجيج مرتفع)',

    // Frequency Bands
    band_delta: 'دلتا (0.5 - 4 هرتز) النوم العميق والاستشفاء',
    band_theta: 'ثيتا (4 - 8 هرتز) الاسترخاء والتأمل والذاكرة',
    band_alpha: 'ألفا (8 - 13 هرتز) إيقاع بيرغر واليقظة المسترخية',
    band_beta: 'بيتا (13 - 30 هرتز) التركيز والتفكير ومعالجة البيانات',
    band_gamma: 'غاما (30 - 60 هرتز) الربط الحسي والعمليات المعرفية العليا',

    // Filters
    filter_dc: 'مرشح تمرير عالي 0.5 هرتز (إزالة انزياح التيار المستمر DC)',
    filter_lp: 'مرشح تمرير منخفض 40 هرتز (حجب تشويش العضلات عالي التردد)',
    filter_notch50: 'مرشح الحز 50 هرتز (إلغاء طنين شبكة الكهرباء)',
    filter_notch60: 'مرشح الحز 60 هرتز (إلغاء طنين 60Hz)',
    filter_car: 'المرشح المكاني التكيفي (CAR وإلغاء رمش العين EOG)',

    // Audio Neurofeedback
    audio_title: 'مركّب التغذية الراجعة العصبية السمعية (Web Audio API)',
    audio_binaural: 'نغمات الأذنين المتزامنة (Binaural Beats L/R)',
    audio_isochronic: 'النبضات السمعية المتساوية (Isochronic Pulses)',
    audio_start: 'تشغيل الصوت العصبي',
    audio_stop: 'كتم الصوت',
    audio_volume: 'مستوى الصوت',

    // Controls
    btn_eyes: 'إغماض / فتح العينين (Berger Effect)',
    btn_blink: 'محاكاة رمشة عين (EOG)',
    btn_emg: 'محاكاة شد الفك (EMG)',
    btn_line_noise: 'محاكاة ضجيج كهربائي 50Hz',
    btn_wireframe: 'نمط شبكي ثلاثي الأبعاد',
    btn_skull: 'عرض الجمجمة الشفافة',
    btn_brodmann: 'مناطق برودمان (الحركية M1 / البصرية V1 / الجبهية)',
    btn_reset: 'إعادة ضبط التدفق',

    // Status
    status_sample_rate: 'معدل العينات: 250 هرتز (16 قناة)',
    status_channels: 'التوزيع: نظام 10-20 الدولي',
    status_connected: 'التدفق العصبي حي ومتصل'
  }
};
