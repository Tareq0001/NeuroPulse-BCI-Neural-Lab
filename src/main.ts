import './style.css';
import { DSPPipeline } from './dsp/filters';
import { ClinicalDiagnosticEngine, MotorImageryClassifier, P300SpellerEngine } from './models/classifiers';
import { CHANNELS_10_20, EEGGenerator } from './models/eeg-generator';
import { Brain3DScene } from './scene/brain-3d';
import { ProstheticHand3D } from './scene/prosthetic-hand-3d';
import { Language, ScenarioType } from './types';
import { NeuroAudioSynthesizer } from './ui/audio';
import { BCISpellerView } from './ui/bci-speller-view';
import { DiagnosticsView } from './ui/diagnostics-view';
import { TRANSLATIONS } from './ui/i18n';
import { PolygraphView } from './ui/polygraph-view';
import { SpectrogramView } from './ui/spectrogram-view';

class NeuroPulseApp {
  private generator = new EEGGenerator();
  private dsp = new DSPPipeline(16, 250);
  private motorClassifier = new MotorImageryClassifier();
  private p300Engine = new P300SpellerEngine();
  private diagEngine = new ClinicalDiagnosticEngine();
  private audioSynth = new NeuroAudioSynthesizer();

  private brain3D!: Brain3DScene;
  private prosthetic3D!: ProstheticHand3D;
  private polygraph!: PolygraphView;
  private spectrogram!: SpectrogramView;
  private spellerView!: BCISpellerView;
  private diagnosticsView!: DiagnosticsView;

  private currentLang: Language = 'ar';
  private selectedChannelIndex = 8; // Default O1 for Berger Alpha
  private activeTab = 'overview';
  private lastTimestamp = 0;
  private sampleAccumulator = 0;
  private isPaused = false;

  constructor() {
    this.initDOM();
    this.initViews();
    this.bindEvents();
    this.applyLanguage();

    requestAnimationFrame(this.renderLoop);
  }

  private initDOM(): void {
    const appEl = document.getElementById('app')!;
    appEl.innerHTML = `
      <div class="neuropulse-container" id="mainContainer">
        <!-- Top Cyber-Medical Header -->
        <header class="app-header">
          <div class="header-left">
            <div class="brand-logo">
              <span class="logo-pulse"></span>
              <div class="brand-text">
                <h1 data-i18n="app_title">NeuroPulse BCI Lab</h1>
                <p data-i18n="app_subtitle">Digital Twin for Brain-Computer Interface & Neural Signal Processing</p>
              </div>
            </div>
            <div class="author-badge">
              <span class="badge-dot"></span>
              <span data-i18n="teacher_name">أ. طارق ابوعشي</span>
            </div>
          </div>

          <div class="header-center">
            <!-- Scenario Selector -->
            <div class="scenario-selector">
              <label for="scenarioSelect">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>السيناريو السريري:</span>
              </label>
              <select id="scenarioSelect" class="scenario-dropdown">
                <option value="motor_imagery" selected>1. التخيل الحركي: التحكم باليد الاصطناعية (C3/C4 Mu ERD)</option>
                <option value="p300_speller">2. هجاء الحروف الذهني P300 (Oddball Matrix Speller)</option>
                <option value="epilepsy_seizure">3. كشف نوبات الصرع: تفريغ شوكة وموجة 3Hz المعمم</option>
                <option value="berger_alpha">4. إيقاع بيرغر: تزامن موجات ألفا القذالية (إغماض العينين)</option>
                <option value="sleep_staging">5. تخطيط النوم ومراحل الـ Hypnogram (N1, N2, N3, REM)</option>
                <option value="free_stream">6. المعمل المفتوح لـ 16 قناة وتجارب التشويه (Artifacts)</option>
              </select>
            </div>
          </div>

          <div class="header-right">
            <!-- Telemetry Pill -->
            <div class="telemetry-pill">
              <span class="pill-dot live"></span>
              <span class="pill-text" data-i18n="status_sample_rate">250 Hz (16-Ch)</span>
            </div>
            <!-- Audio Feedback Quick Toggle -->
            <button id="btnAudioToggle" class="cyber-btn icon-btn" title="Toggle Audio Neuro-Feedback">
              <svg id="audioIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
            <!-- Language Switcher -->
            <button id="btnLangToggle" class="cyber-btn lang-btn">
              <span>EN / عربي</span>
            </button>
          </div>
        </header>

        <!-- Main Workspace Tabs -->
        <nav class="view-tabs">
          <button class="tab-btn active" data-tab="overview">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span data-i18n="tab_overview">القشرة المخية 3D</span>
          </button>
          <button class="tab-btn" data-tab="polygraph">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span data-i18n="tab_polygraph">مخطط 16 قناة (Polygraph)</span>
          </button>
          <button class="tab-btn" data-tab="dsp">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17v-4"/><path d="M12 17v-8"/><path d="M17 17v-12"/></svg>
            <span data-i18n="tab_dsp">تحليل فورييه والشلال الطيفي</span>
          </button>
          <button class="tab-btn" data-tab="prosthetic">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
            <span data-i18n="tab_prosthetic">اليد الاصطناعية 3D</span>
          </button>
          <button class="tab-btn" data-tab="speller">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span data-i18n="tab_speller">هجاء الحروف الذهني P300</span>
          </button>
          <button class="tab-btn" data-tab="diagnostics">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            <span data-i18n="tab_diagnostics">التشخيص ونوبات الصرع</span>
          </button>
        </nav>

        <!-- Emergency Seizure Alert Banner (Hidden by default) -->
        <div id="seizureAlertBanner" class="seizure-banner hidden">
          <div class="banner-pulse-icon">⚠️</div>
          <div class="banner-content">
            <strong data-i18n="diag_seizure_alert">تنبيه سريري: رصد تفريغ صرعي حاد (3Hz Spike-and-Wave)!</strong>
            <p id="seizureDurationLabel">مدة النوبة: 0.0 ثانية | التردد: 3.0 هرتز | التزامن: 100% معممة عبر نصفي الدماغ</p>
          </div>
        </div>

        <!-- Main Content Grid -->
        <main class="main-layout">
          <!-- Left/Center Dynamic Workspace -->
          <section class="workspace-area">
            <!-- TAB 1: 3D Cortical Brain Overview -->
            <div id="tabContent_overview" class="tab-panel active">
              <div class="view-card three-card">
                <div class="card-toolbar">
                  <div class="toolbar-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                    <span>النموذج التشريحي ثلاثي الأبعاد للقشرة المخية ومواقع أقطاب 10-20</span>
                  </div>
                  <div class="toolbar-actions">
                    <button id="btnWireframe" class="chip-btn" data-i18n="btn_wireframe">شبكي</button>
                    <button id="btnSkull" class="chip-btn active" data-i18n="btn_skull">الجمجمة</button>
                    <button id="btnBrodmann" class="chip-btn active" data-i18n="btn_brodmann">مناطق برودمان</button>
                  </div>
                </div>
                <div id="brain3DContainer" class="three-viewport"></div>
                <div class="three-legend">
                  <span class="legend-item"><span class="legend-color m1"></span> M1 القشرة الحركية</span>
                  <span class="legend-item"><span class="legend-color v1"></span> V1 القشرة البصرية</span>
                  <span class="legend-item"><span class="legend-color pfc"></span> PFC قشرة ما قبل الجبهية</span>
                </div>
              </div>
            </div>

            <!-- TAB 2: 16-Channel Polygraph View -->
            <div id="tabContent_polygraph" class="tab-panel">
              <div class="view-card polygraph-card">
                <div class="card-toolbar">
                  <div class="toolbar-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    <span>مخطط النشاط الكهربائي الدماغي المستمر (16-Channel Montage Sweep)</span>
                  </div>
                  <div class="toolbar-actions">
                    <label class="toggle-switch">
                      <input type="checkbox" id="checkShowRaw">
                      <span class="toggle-slider"></span>
                      <span class="toggle-label">عرض الإشارة الخام (قبل الترشيح)</span>
                    </label>
                  </div>
                </div>
                <div class="canvas-wrapper">
                  <canvas id="polygraphCanvas"></canvas>
                </div>
              </div>
            </div>

            <!-- TAB 3: DSP FFT & Spectrogram Waterfall -->
            <div id="tabContent_dsp" class="tab-panel">
              <div class="view-card dsp-card">
                <div class="card-toolbar">
                  <div class="toolbar-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    <span>معالجة الإشارات الرقمية: كثافة القدرة الطيفية (PSD) وشلال التردد الزمني</span>
                  </div>
                  <div class="toolbar-actions">
                    <select id="channelSelectPSD" class="chip-select">
                      ${CHANNELS_10_20.map((c) => `<option value="${c.index}" ${c.name === 'O1' ? 'selected' : ''}>قطب: ${c.name} (${c.label})</option>`).join('')}
                    </select>
                  </div>
                </div>
                <div class="dsp-grid">
                  <div class="dsp-panel">
                    <canvas id="spectrumCanvas"></canvas>
                  </div>
                  <div class="dsp-panel">
                    <canvas id="waterfallCanvas"></canvas>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 4: 3D Prosthetic Hand View -->
            <div id="tabContent_prosthetic" class="tab-panel">
              <div class="view-card prosthetic-card">
                <div class="card-toolbar">
                  <div class="toolbar-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/></svg>
                    <span>اليد الاصطناعية الروبوتية الموجهة بالنية العصبية (Common Spatial Pattern & Motor Imagery)</span>
                  </div>
                </div>
                <div class="prosthetic-layout">
                  <div id="prosthetic3DContainer" class="prosthetic-viewport"></div>
                  <div class="motor-telemetry">
                    <div class="intent-banner">
                      <span class="intent-label" data-i18n="motor_intent">النية الحركية المفكوكة:</span>
                      <h2 id="decodedIntentText" class="intent-value">حالة الاسترخاء / الراحة</h2>
                    </div>
                    <div class="prob-bars">
                      <div class="prob-item">
                        <div class="prob-header">
                          <span data-i18n="motor_left">اليد اليسرى (C4 ERD)</span>
                          <span id="probLeftVal">10%</span>
                        </div>
                        <div class="meter-bar"><div id="meterLeft" class="meter-fill violet" style="width: 10%;"></div></div>
                      </div>
                      <div class="prob-item">
                        <div class="prob-header">
                          <span data-i18n="motor_right">اليد اليمنى (C3 ERD)</span>
                          <span id="probRightVal">10%</span>
                        </div>
                        <div class="meter-bar"><div id="meterRight" class="meter-fill cyan" style="width: 10%;"></div></div>
                      </div>
                      <div class="prob-item">
                        <div class="prob-header">
                          <span data-i18n="motor_rest">حالة الراحة (Rest)</span>
                          <span id="probRestVal">80%</span>
                        </div>
                        <div class="meter-bar"><div id="meterRest" class="meter-fill emerald" style="width: 80%;"></div></div>
                      </div>
                    </div>
                    <div class="sim-intent-buttons">
                      <button class="cyber-btn sm" id="btnSimLeft">محاكاة حركة اليد اليسرى</button>
                      <button class="cyber-btn sm" id="btnSimRight">محاكاة حركة اليد اليمنى</button>
                      <button class="cyber-btn sm" id="btnSimRest">محاكاة وضع الراحة</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 5: P300 Speller View -->
            <div id="tabContent_speller" class="tab-panel">
              <div class="view-card speller-card">
                <div class="card-toolbar">
                  <div class="toolbar-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/></svg>
                    <span data-i18n="speller_title">مصفوفة الهجاء العصبي بالكمون المستثار P300</span>
                  </div>
                </div>
                <div class="speller-layout">
                  <div class="speller-matrix-container" id="p300MatrixContainer"></div>
                  <div class="speller-stats">
                    <div class="speller-hud-card">
                      <span class="hud-label" data-i18n="speller_target">الحرف المستهدف بصرياً:</span>
                      <h1 id="spellerTargetChar" class="hud-val-highlight">B</h1>
                    </div>
                    <div class="speller-hud-card">
                      <span class="hud-label" data-i18n="speller_decoded">آخر حرف مفكوك عصبياً:</span>
                      <h1 id="spellerDecodedChar" class="hud-val-cyan">-</h1>
                    </div>
                    <div class="speller-hud-card full">
                      <span class="hud-label" data-i18n="speller_buffer">سجل النص المفكوك ذهنياً:</span>
                      <div id="spellerTextBuffer" class="text-buffer">BRAIN_</div>
                    </div>
                    <div class="erp-canvas-box">
                      <canvas id="erpCanvas"></canvas>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 6: Diagnostics & Sleep View -->
            <div id="tabContent_diagnostics" class="tab-panel">
              <div class="view-card diag-card">
                <div class="card-toolbar">
                  <div class="toolbar-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5"/></svg>
                    <span>التشخيص السريري، مراقبة نوبات الصرع، وتخطيط مراحل النوم (Polysomnography)</span>
                  </div>
                </div>
                <div class="diag-layout">
                  <div class="hypnogram-box">
                    <canvas id="hypnogramCanvas"></canvas>
                  </div>
                  <div class="impedance-box">
                    <canvas id="impedanceCanvas"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Right Floating HUD: Telemetry, Filters & Brain Rhythms -->
          <aside class="sidebar-hud">
            <!-- Frequency Bands Radar / Power Bars -->
            <div class="hud-card">
              <div class="hud-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M3 12h2"/><path d="M19 12h2"/></svg>
                <span>الترددات الحيوية (Brain Rhythms)</span>
              </div>
              <div class="band-bars">
                <div class="band-item">
                  <div class="band-info">
                    <span class="band-name delta">δ دلتا (0.5-4 Hz)</span>
                    <span id="powerDelta" class="band-val">12 µV²</span>
                  </div>
                  <div class="meter-bar"><div id="meterDelta" class="meter-fill delta" style="width: 20%;"></div></div>
                </div>
                <div class="band-item">
                  <div class="band-info">
                    <span class="band-name theta">θ ثيتا (4-8 Hz)</span>
                    <span id="powerTheta" class="band-val">18 µV²</span>
                  </div>
                  <div class="meter-bar"><div id="meterTheta" class="meter-fill theta" style="width: 25%;"></div></div>
                </div>
                <div class="band-item">
                  <div class="band-info">
                    <span class="band-name alpha">α ألفا (8-13 Hz)</span>
                    <span id="powerAlpha" class="band-val">45 µV²</span>
                  </div>
                  <div class="meter-bar"><div id="meterAlpha" class="meter-fill alpha" style="width: 65%;"></div></div>
                </div>
                <div class="band-item">
                  <div class="band-info">
                    <span class="band-name beta">β بيتا (13-30 Hz)</span>
                    <span id="powerBeta" class="band-val">22 µV²</span>
                  </div>
                  <div class="meter-bar"><div id="meterBeta" class="meter-fill beta" style="width: 30%;"></div></div>
                </div>
                <div class="band-item">
                  <div class="band-info">
                    <span class="band-name gamma">γ غاما (30-60 Hz)</span>
                    <span id="powerGamma" class="band-val">8 µV²</span>
                  </div>
                  <div class="meter-bar"><div id="meterGamma" class="meter-fill gamma" style="width: 15%;"></div></div>
                </div>
              </div>
            </div>

            <!-- DSP Active Filter Bank -->
            <div class="hud-card">
              <div class="hud-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
                <span>مرشحات الإشارات الرقمية (DSP)</span>
              </div>
              <div class="filter-toggles">
                <label class="toggle-item">
                  <input type="checkbox" id="checkFilterHighpass" checked>
                  <span class="toggle-check"></span>
                  <span data-i18n="filter_dc">0.5 Hz تمرير عالي (حذف DC)</span>
                </label>
                <label class="toggle-item">
                  <input type="checkbox" id="checkFilterLowpass" checked>
                  <span class="toggle-check"></span>
                  <span data-i18n="filter_lp">40 Hz تمرير منخفض (حجب العضلات)</span>
                </label>
                <label class="toggle-item">
                  <input type="checkbox" id="checkFilterNotch50" checked>
                  <span class="toggle-check"></span>
                  <span data-i18n="filter_notch50">مرشح الحز 50 Hz (كهرباء شبكية)</span>
                </label>
                <label class="toggle-item">
                  <input type="checkbox" id="checkFilterCAR" checked>
                  <span class="toggle-check"></span>
                  <span data-i18n="filter_car">المرشح المكاني (CAR وحجب الرمش)</span>
                </label>
              </div>
            </div>

            <!-- Interactive Physiological Triggers -->
            <div class="hud-card">
              <div class="hud-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                <span>محفزات فيسيولوجية تفاعلية</span>
              </div>
              <div class="action-buttons-grid">
                <button id="btnToggleEyes" class="action-btn">
                  <span class="btn-icon">👁️</span>
                  <span data-i18n="btn_eyes">إغماض / فتح العينين</span>
                </button>
                <button id="btnTriggerBlink" class="action-btn">
                  <span class="btn-icon">⚡</span>
                  <span data-i18n="btn_blink">محاكاة رمشة (EOG)</span>
                </button>
                <button id="btnTriggerEMG" class="action-btn">
                  <span class="btn-icon">😬</span>
                  <span data-i18n="btn_emg">شد عضلات الفك (EMG)</span>
                </button>
                <button id="btnToggle50Hz" class="action-btn">
                  <span class="btn-icon">🔌</span>
                  <span data-i18n="btn_line_noise">ضجيج شبكي 50Hz</span>
                </button>
              </div>
            </div>

            <!-- Audio Neuro-Feedback Synthesizer Controls -->
            <div class="hud-card audio-card">
              <div class="hud-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
                <span data-i18n="audio_title">مركّب التغذية الراجعة السمعية</span>
              </div>
              <div class="audio-controls">
                <div class="audio-mode-selector">
                  <button id="btnBinauralMode" class="chip-btn active">Binaural Beats</button>
                  <button id="btnIsochronicMode" class="chip-btn">Isochronic Pulses</button>
                </div>
                <div class="audio-slider-row">
                  <label>مستوى الصوت:</label>
                  <input type="range" id="audioVolumeSlider" min="0" max="1" step="0.05" value="0.5">
                </div>
                <div class="audio-preset-chips">
                  <button class="chip-btn" data-freq="10">Alpha 10Hz</button>
                  <button class="chip-btn" data-freq="6">Theta 6Hz</button>
                  <button class="chip-btn" data-freq="2.5">Delta 2.5Hz</button>
                  <button class="chip-btn" data-freq="20">Beta 20Hz</button>
                  <button class="chip-btn" data-freq="40">Gamma 40Hz</button>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    `;
  }

  private initViews(): void {
    // 1. 3D Cortical Brain
    const brainContainer = document.getElementById('brain3DContainer')!;
    this.brain3D = new Brain3DScene(brainContainer);

    // 2. 3D Prosthetic Hand
    const handContainer = document.getElementById('prosthetic3DContainer')!;
    this.prosthetic3D = new ProstheticHand3D(handContainer);

    // 3. Polygraph Canvas
    const polyCanvas = document.getElementById('polygraphCanvas') as HTMLCanvasElement;
    this.polygraph = new PolygraphView(polyCanvas);

    // 4. Spectrogram & Waterfall
    const sCanvas = document.getElementById('spectrumCanvas') as HTMLCanvasElement;
    const wCanvas = document.getElementById('waterfallCanvas') as HTMLCanvasElement;
    this.spectrogram = new SpectrogramView(sCanvas, wCanvas);

    // 5. P300 Speller
    const matrixContainer = document.getElementById('p300MatrixContainer')!;
    const erpCanvas = document.getElementById('erpCanvas') as HTMLCanvasElement;
    this.spellerView = new BCISpellerView(matrixContainer, erpCanvas);

    // 6. Diagnostics & Sleep Hypnogram
    const hypnoCanvas = document.getElementById('hypnogramCanvas') as HTMLCanvasElement;
    const impedCanvas = document.getElementById('impedanceCanvas') as HTMLCanvasElement;
    this.diagnosticsView = new DiagnosticsView(hypnoCanvas, impedCanvas);
  }

  private bindEvents(): void {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.tab!;
        this.switchTab(target);
      });
    });

    // Scenario switching
    const scenarioSelect = document.getElementById('scenarioSelect') as HTMLSelectElement;
    scenarioSelect.addEventListener('change', () => {
      const scenario = scenarioSelect.value as ScenarioType;
      this.generator.setScenario(scenario);

      // Auto switch relevant tab for best interactive experience
      if (scenario === 'motor_imagery') {
        this.switchTab('prosthetic');
      } else if (scenario === 'p300_speller') {
        this.switchTab('speller');
      } else if (scenario === 'epilepsy_seizure' || scenario === 'sleep_staging') {
        this.switchTab('diagnostics');
      } else if (scenario === 'berger_alpha') {
        this.switchTab('dsp');
      }
    });

    // Language toggle
    const btnLang = document.getElementById('btnLangToggle')!;
    btnLang.addEventListener('click', () => {
      this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
      this.applyLanguage();
    });

    // 3D Scene Controls
    document.getElementById('btnWireframe')?.addEventListener('click', (e) => {
      const active = this.brain3D.toggleWireframe();
      (e.currentTarget as HTMLElement).classList.toggle('active', active);
    });

    document.getElementById('btnSkull')?.addEventListener('click', (e) => {
      const active = this.brain3D.toggleSkull();
      (e.currentTarget as HTMLElement).classList.toggle('active', active);
    });

    document.getElementById('btnBrodmann')?.addEventListener('click', (e) => {
      const active = this.brain3D.toggleBrodmann();
      (e.currentTarget as HTMLElement).classList.toggle('active', active);
    });

    // Show raw toggle
    const checkRaw = document.getElementById('checkShowRaw') as HTMLInputElement;
    checkRaw?.addEventListener('change', () => {
      this.polygraph.showRaw = checkRaw.checked;
    });

    // DSP Channel select
    const psdSelect = document.getElementById('channelSelectPSD') as HTMLSelectElement;
    psdSelect?.addEventListener('change', () => {
      this.selectedChannelIndex = parseInt(psdSelect.value, 10) || 0;
    });

    // Filter toggles
    document.getElementById('checkFilterHighpass')?.addEventListener('change', (e) => {
      this.dsp.settings.highpass = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('checkFilterLowpass')?.addEventListener('change', (e) => {
      this.dsp.settings.lowpass = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('checkFilterNotch50')?.addEventListener('change', (e) => {
      this.dsp.settings.notch50Hz = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('checkFilterCAR')?.addEventListener('change', (e) => {
      this.dsp.settings.artifactRemoval = (e.target as HTMLInputElement).checked;
    });

    // Interactive Triggers
    const btnEyes = document.getElementById('btnToggleEyes')!;
    btnEyes.addEventListener('click', () => {
      this.generator.eyesClosed = !this.generator.eyesClosed;
      btnEyes.classList.toggle('active', this.generator.eyesClosed);
    });

    const btnBlink = document.getElementById('btnTriggerBlink')!;
    btnBlink.addEventListener('click', () => {
      this.generator.injectBlink = true;
      setTimeout(() => (this.generator.injectBlink = false), 250);
    });

    const btnEMG = document.getElementById('btnTriggerEMG')!;
    btnEMG.addEventListener('click', () => {
      this.generator.injectEMG = true;
      setTimeout(() => (this.generator.injectEMG = false), 400);
    });

    const btn50Hz = document.getElementById('btnToggle50Hz')!;
    btn50Hz.addEventListener('click', () => {
      this.generator.injectLineNoise = !this.generator.injectLineNoise;
      btn50Hz.classList.toggle('active', this.generator.injectLineNoise);
    });

    // Sim intent buttons for prosthetic hand
    document.getElementById('btnSimLeft')?.addEventListener('click', () => {
      this.generator.userMotorIntent = 'left_hand';
    });
    document.getElementById('btnSimRight')?.addEventListener('click', () => {
      this.generator.userMotorIntent = 'right_hand';
    });
    document.getElementById('btnSimRest')?.addEventListener('click', () => {
      this.generator.userMotorIntent = 'rest';
    });

    // Audio Feedback controls
    const btnAudio = document.getElementById('btnAudioToggle')!;
    btnAudio.addEventListener('click', () => {
      const playing = this.audioSynth.toggle();
      btnAudio.classList.toggle('active', playing);
    });

    const volSlider = document.getElementById('audioVolumeSlider') as HTMLInputElement;
    volSlider?.addEventListener('input', () => {
      this.audioSynth.setVolume(parseFloat(volSlider.value));
    });

    document.getElementById('btnBinauralMode')?.addEventListener('click', (e) => {
      this.audioSynth.setMode('binaural');
      document.getElementById('btnBinauralMode')?.classList.add('active');
      document.getElementById('btnIsochronicMode')?.classList.remove('active');
    });

    document.getElementById('btnIsochronicMode')?.addEventListener('click', (e) => {
      this.audioSynth.setMode('isochronic');
      document.getElementById('btnIsochronicMode')?.classList.add('active');
      document.getElementById('btnBinauralMode')?.classList.remove('active');
    });

    const presetChips = document.querySelectorAll('.audio-preset-chips button');
    presetChips.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const freq = parseFloat((e.currentTarget as HTMLElement).dataset.freq || '10');
        this.audioSynth.setTargetFrequency(freq);
        presetChips.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
      });
    });
  }

  private switchTab(tabId: string): void {
    this.activeTab = tabId;

    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.id === `tabContent_${tabId}`);
    });

    // Resize triggers when switching
    setTimeout(() => {
      this.polygraph.resize();
      this.spectrogram.resize();
      this.diagnosticsView.resize();
    }, 50);
  }

  private applyLanguage(): void {
    const lang = this.currentLang;
    const t = TRANSLATIONS[lang];
    const container = document.getElementById('mainContainer')!;

    container.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // Replace all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && t[key]) {
        el.textContent = t[key];
      }
    });
  }

  private renderLoop = (timestamp: number): void => {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const deltaMs = Math.min(50, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;

    if (!this.isPaused) {
      // Advance EEG generator at 250 Hz (1 frame every 4ms)
      this.sampleAccumulator += deltaMs;
      const msPerSample = 1000 / this.generator.sampleRate;

      let lastFrame = null;
      while (this.sampleAccumulator >= msPerSample) {
        const frame = this.generator.nextFrame();
        // DSP filtering
        frame.filtered = this.dsp.processFrame(frame.raw);
        this.polygraph.addFrame(frame);
        lastFrame = frame;
        this.sampleAccumulator -= msPerSample;
      }

      const activeSamples = lastFrame ? lastFrame.filtered : new Array(16).fill(0);

      // 1. Update Motor Classifier
      const motorResult = this.motorClassifier.update(activeSamples);
      this.prosthetic3D.setIntent(motorResult.prediction, motorResult.probabilities[motorResult.prediction]);

      // Update Motor UI
      const intentTextEl = document.getElementById('decodedIntentText');
      if (intentTextEl) {
        if (motorResult.prediction === 'left_hand') {
          intentTextEl.textContent = this.currentLang === 'ar' ? 'اليد اليسرى (C4 ERD)' : 'Left Hand (C4 ERD)';
          intentTextEl.className = 'intent-value violet';
        } else if (motorResult.prediction === 'right_hand') {
          intentTextEl.textContent = this.currentLang === 'ar' ? 'اليد اليمنى (C3 ERD)' : 'Right Hand (C3 ERD)';
          intentTextEl.className = 'intent-value cyan';
        } else {
          intentTextEl.textContent = this.currentLang === 'ar' ? 'حالة الاسترخاء / الراحة' : 'Rest Baseline';
          intentTextEl.className = 'intent-value emerald';
        }
      }

      const pLeftEl = document.getElementById('probLeftVal');
      const pRightEl = document.getElementById('probRightVal');
      const pRestEl = document.getElementById('probRestVal');
      const mLeftEl = document.getElementById('meterLeft');
      const mRightEl = document.getElementById('meterRight');
      const mRestEl = document.getElementById('meterRest');

      if (pLeftEl && mLeftEl) {
        const pct = Math.round(motorResult.probabilities.left_hand * 100);
        pLeftEl.textContent = `${pct}%`;
        mLeftEl.style.width = `${pct}%`;
      }
      if (pRightEl && mRightEl) {
        const pct = Math.round(motorResult.probabilities.right_hand * 100);
        pRightEl.textContent = `${pct}%`;
        mRightEl.style.width = `${pct}%`;
      }
      if (pRestEl && mRestEl) {
        const pct = Math.round(motorResult.probabilities.rest * 100);
        pRestEl.textContent = `${pct}%`;
        mRestEl.style.width = `${pct}%`;
      }

      // 2. Update P300 Speller
      const p300State = this.p300Engine.update(deltaMs, activeSamples, (isTarget) => {
        this.generator.triggerP300Flash(isTarget);
      });
      this.spellerView.update(p300State);

      const targetEl = document.getElementById('spellerTargetChar');
      if (targetEl) targetEl.textContent = p300State.targetChar;
      const decEl = document.getElementById('spellerDecodedChar');
      if (decEl) decEl.textContent = p300State.predictedChar || '-';
      const bufEl = document.getElementById('spellerTextBuffer');
      if (bufEl) bufEl.textContent = p300State.spelledText;

      // 3. Update Diagnostics & Seizure detection
      const diagMetrics = this.diagEngine.update(deltaMs / 1000, activeSamples, this.generator.injectSeizure || this.generator.scenario === 'epilepsy_seizure');
      this.diagnosticsView.update(diagMetrics);

      // Emergency banner toggle
      const banner = document.getElementById('seizureAlertBanner');
      if (banner) {
        banner.classList.toggle('hidden', !diagMetrics.seizureDetected);
        const durLabel = document.getElementById('seizureDurationLabel');
        if (durLabel) {
          durLabel.textContent = `مدة النوبة: ${diagMetrics.seizureDurationSec} ثانية | التردد: 3.0 هرتز | التزامن: 100% معممة عبر نصفي الدماغ`;
        }
      }

      // 4. Update 3D Scenes
      const timeSec = timestamp / 1000;
      this.brain3D.update(activeSamples, timeSec, this.generator.scenario);
      this.prosthetic3D.update();

      // 5. Update Polygraph View
      this.polygraph.render();

      // 6. Update DSP Spectrum & Frequency Bands (computed on selected channel)
      // Channel buffer: last 256 samples of selected channel
      const chSamples = new Array(256).fill(0);
      for (let s = 0; s < 256; s++) {
        chSamples[s] = activeSamples[this.selectedChannelIndex] || 0;
      }
      const chName = CHANNELS_10_20[this.selectedChannelIndex]?.name || 'O1';
      const bands = this.spectrogram.update(chSamples, chName);

      // Update Band Power Meters in Sidebar
      const dEl = document.getElementById('powerDelta');
      const tEl = document.getElementById('powerTheta');
      const aEl = document.getElementById('powerAlpha');
      const bEl = document.getElementById('powerBeta');
      const gEl = document.getElementById('powerGamma');

      const mdEl = document.getElementById('meterDelta');
      const mtEl = document.getElementById('meterTheta');
      const maEl = document.getElementById('meterAlpha');
      const mbEl = document.getElementById('meterBeta');
      const mgEl = document.getElementById('meterGamma');

      if (dEl && mdEl) {
        dEl.textContent = `${bands.delta} µV²`;
        mdEl.style.width = `${Math.min(100, bands.relative.delta * 100)}%`;
      }
      if (tEl && mtEl) {
        tEl.textContent = `${bands.theta} µV²`;
        mtEl.style.width = `${Math.min(100, bands.relative.theta * 100)}%`;
      }
      if (aEl && maEl) {
        aEl.textContent = `${bands.alpha} µV²`;
        maEl.style.width = `${Math.min(100, bands.relative.alpha * 100)}%`;
      }
      if (bEl && mbEl) {
        bEl.textContent = `${bands.beta} µV²`;
        mbEl.style.width = `${Math.min(100, bands.relative.beta * 100)}%`;
      }
      if (gEl && mgEl) {
        gEl.textContent = `${bands.gamma} µV²`;
        mgEl.style.width = `${Math.min(100, bands.relative.gamma * 100)}%`;
      }
    }

    requestAnimationFrame(this.renderLoop);
  };
}

// Bootstrap application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new NeuroPulseApp();
});
