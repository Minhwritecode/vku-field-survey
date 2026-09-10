import './style.css';
import { v4 as uuidv4 } from 'uuid';
import { saveDraft, addToSyncQueue, getPendingSyncQueue, removeCompletedSync, type SurveyData } from './db';
import { capturePhoto, getCurrentGPS, listenNetworkStatus, isOnline, sendSyncNotification } from './native';
import { translations, getStoredLanguage, setStoredLanguage, type Language } from './i18n';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('ServiceWorker registration skipped or failed:', err);
    });
  });
}

const CLOUD_DB_ENDPOINT = 'https://vku-field-survey-default-rtdb.firebaseio.com/surveys';

let currentLanguage: Language = getStoredLanguage();
let currentDraftId = uuidv4();
let capturedPhotoBase64: string | undefined = undefined;
let selectedRating = 5;
let currentStep = 1;
let currentCloudRecords: Record<string, SurveyData> = {};
let currentQueueRecords: SurveyData[] = [];
let syncInProgress = false;

// Helper to get translated string
function t(key: string): string {
  return translations[currentLanguage][key] || translations['en'][key] || key;
}

// Toast Notification Helper
function showToast(message: string, type: 'success' | 'info' | 'warning' = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'warning' ? '⚠️' : 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Main Render Function
function renderAppUI() {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="bg-blobs">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <header class="app-header glass-card">
      <div class="brand-wrapper">
        <div class="brand-icon" style="background: none; padding: 0; overflow: hidden;">
          <img src="/icon.jpg" alt="App Icon" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" />
        </div>
        <div class="brand-title">
          <h1 id="i18n-appTitle">${t('appTitle')}</h1>
          <span class="brand-subtitle" id="i18n-appSubtitle">${t('appSubtitle')}</span>
        </div>
      </div>
      <div class="header-controls">
        <button class="lang-switch-btn" id="lang-toggle-btn">
          <span>${currentLanguage === 'en' ? '🇬🇧 EN' : '🇻🇳 VI'}</span>
        </button>
        <div id="network-status" class="status-pill online">
          <span class="pulse-dot"></span>
          <span id="status-text">${t('online')}</span>
        </div>
      </div>
    </header>

    <main class="glass-card">
      <div class="card-header-title">
        <h2 id="i18n-cardTitle">${t('cardTitle')}</h2>
        <span class="auto-save-tag" id="i18n-autoSaveTag">${t('autoSaveTag')}</span>
      </div>

      <!-- Multi-Step Progress Indicator -->
      <div class="wizard-steps">
        <div class="wizard-progress-bar" id="progress-bar"></div>
        <div class="step-item active" data-step="1" id="step-btn-1">
          <div class="step-circle">1</div>
          <span class="step-label" id="i18n-step1Label">${t('step1Label')}</span>
        </div>
        <div class="step-item" data-step="2" id="step-btn-2">
          <div class="step-circle">2</div>
          <span class="step-label" id="i18n-step2Label">${t('step2Label')}</span>
        </div>
        <div class="step-item" data-step="3" id="step-btn-3">
          <div class="step-circle">3</div>
          <span class="step-label" id="i18n-step3Label">${t('step3Label')}</span>
        </div>
      </div>

      <form id="survey-form">
        <!-- Step 1: Location & Auditor Info -->
        <div class="step-pane active" id="pane-step-1">
          <div class="form-group">
            <label for="inspectorName" id="i18n-inspectorLabel">${t('inspectorLabel')}</label>
            <input type="text" id="inspectorName" class="input-control" placeholder="${t('inspectorPlaceholder')}" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="building" id="i18n-buildingLabel">${t('buildingLabel')}</label>
              <input type="text" id="building" class="input-control" placeholder="${t('buildingPlaceholder')}" required />
            </div>
            <div class="form-group">
              <label for="floor" id="i18n-floorLabel">${t('floorLabel')}</label>
              <input type="text" id="floor" class="input-control" placeholder="${t('floorPlaceholder')}" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="room" id="i18n-roomLabel">${t('roomLabel')}</label>
              <input type="text" id="room" class="input-control" placeholder="${t('roomPlaceholder')}" required />
            </div>
            <div class="form-group">
              <label for="roomType" id="i18n-roomTypeLabel">${t('roomTypeLabel')}</label>
              <select id="roomType" class="input-control">
                <option value="Classroom">${t('roomTypeClassroom')}</option>
                <option value="Computer Lab">${t('roomTypeComputerLab')}</option>
                <option value="Lecture Hall">${t('roomTypeLectureHall')}</option>
                <option value="Faculty Office">${t('roomTypeFacultyOffice')}</option>
                <option value="Restroom">${t('roomTypeRestroom')}</option>
                <option value="Basement Equipment Room">${t('roomTypeServerRoom')}</option>
              </select>
            </div>
          </div>
          <div class="wizard-actions">
            <button type="button" class="btn-primary" id="btn-next-1">${t('btnNext')}</button>
          </div>
        </div>

        <!-- Step 2: Equipment Category, Asset Tag & Operational Status -->
        <div class="step-pane" id="pane-step-2">
          <div class="form-row">
            <div class="form-group">
              <label for="category" id="i18n-categoryLabel">${t('categoryLabel')}</label>
              <select id="category" class="input-control">
                <option value="Hardware">${t('categoryHardware')}</option>
                <option value="Projector">${t('categoryProjector')}</option>
                <option value="AC">${t('categoryAC')}</option>
                <option value="Electrical">${t('categoryElectrical')}</option>
                <option value="Furniture">${t('categoryFurniture')}</option>
                <option value="Network">${t('categoryNetwork')}</option>
                <option value="Safety">${t('categorySafety')}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="assetTag" id="i18n-assetTagLabel">${t('assetTagLabel')}</label>
              <input type="text" id="assetTag" class="input-control" placeholder="${t('assetTagPlaceholder')}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="operationalStatus" id="i18n-operationalStatusLabel">${t('operationalStatusLabel')}</label>
              <select id="operationalStatus" class="input-control">
                <option value="Functional">${t('statusFunctional')}</option>
                <option value="Maintenance Needed">${t('statusMaintenance')}</option>
                <option value="Out of Order">${t('statusOutOfOrder')}</option>
                <option value="Critical Hazard">${t('statusCritical')}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="priorityLevel" id="i18n-priorityLevelLabel">${t('priorityLevelLabel')}</label>
              <select id="priorityLevel" class="input-control">
                <option value="Low">${t('priorityLow')}</option>
                <option value="Medium" selected>${t('priorityMedium')}</option>
                <option value="High">${t('priorityHigh')}</option>
                <option value="Emergency">${t('priorityEmergency')}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label id="i18n-conditionRatingLabel">${t('conditionRatingLabel')}</label>
            <div class="star-rating-container">
              <div class="stars-wrapper" id="stars-wrapper">
                <span class="star-icon active" data-value="1">★</span>
                <span class="star-icon active" data-value="2">★</span>
                <span class="star-icon active" data-value="3">★</span>
                <span class="star-icon active" data-value="4">★</span>
                <span class="star-icon active" data-value="5">★</span>
              </div>
              <span class="rating-text-badge" id="rating-badge">5 / 5 Excellent</span>
            </div>
            <input type="hidden" id="rating" value="5" />
          </div>

          <div class="wizard-actions">
            <button type="button" class="btn-secondary" id="btn-prev-2">${t('btnBack')}</button>
            <button type="button" class="btn-primary" id="btn-next-2">${t('btnNext')}</button>
          </div>
        </div>

        <!-- Step 3: Issue Tags, Required Action & Photo Evidence -->
        <div class="step-pane" id="pane-step-3">
          <div class="form-group">
            <label id="i18n-issueTagsLabel">${t('issueTagsLabel')}</label>
            <div class="chip-group" id="issue-tags-group">
              <label class="chip-tag">
                <input type="checkbox" value="Power Failure" /> ${t('tagPowerFailure')}
              </label>
              <label class="chip-tag">
                <input type="checkbox" value="Physical Damage" /> ${t('tagPhysicalDamage')}
              </label>
              <label class="chip-tag">
                <input type="checkbox" value="Overheating" /> ${t('tagOverheating')}
              </label>
              <label class="chip-tag">
                <input type="checkbox" value="Noisy Operation" /> ${t('tagNoisyOperation')}
              </label>
              <label class="chip-tag">
                <input type="checkbox" value="Network Disconnected" /> ${t('tagDisconnected')}
              </label>
              <label class="chip-tag">
                <input type="checkbox" value="Water Leakage" /> ${t('tagWaterLeakage')}
              </label>
              <label class="chip-tag">
                <input type="checkbox" value="Missing Parts" /> ${t('tagMissingParts')}
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="actionRequired" id="i18n-actionRequiredLabel">${t('actionRequiredLabel')}</label>
            <select id="actionRequired" class="input-control">
              <option value="Inspection Only">${t('actionInspectionOnly')}</option>
              <option value="On-site Maintenance">${t('actionOnSiteMaintenance')}</option>
              <option value="Parts Replacement">${t('actionPartsReplacement')}</option>
              <option value="Complete Replacement">${t('actionCompleteReplacement')}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="notes" id="i18n-notesLabel">${t('notesLabel')}</label>
            <textarea id="notes" class="input-control" rows="3" placeholder="${t('notesPlaceholder')}"></textarea>
          </div>

          <div class="photo-picker-box">
            <label id="i18n-photoLabel">${t('photoLabel')}</label>
            <button type="button" class="btn-photo-trigger" id="btn-photo">
              <span id="i18n-btnPhoto">${t('btnPhoto')}</span>
            </button>
            <div class="preview-frame" id="preview-frame">
              <img id="photo-preview" class="preview-img" alt="Field Photo Preview" />
              <button type="button" class="btn-remove-photo" id="btn-remove-photo">✕</button>
            </div>
          </div>

          <div class="wizard-actions">
            <button type="button" class="btn-secondary" id="btn-prev-3">${t('btnBack')}</button>
            <button type="submit" class="btn-primary" id="btn-submit">
              <span id="i18n-btnSubmit">${t('btnSubmit')}</span>
            </button>
          </div>
        </div>
      </form>
    </main>

    <!-- Queue Status Card -->
    <section class="glass-card">
      <div class="card-header-title">
        <h2 id="i18n-queueTitle">${t('queueTitle')}</h2>
        <button class="btn-secondary" id="btn-sync" style="padding: 7px 16px; font-size: 12px;">
          <span id="sync-icon">⚡</span> <span id="i18n-btnSync">${t('btnSync').replace(/^⚡\s*/, '')}</span>
        </button>
      </div>
      <div class="queue-summary-box">
        <span id="i18n-pendingCountLabel">${t('pendingCountLabel')}</span>
        <div class="queue-counter-badge">
          <span id="queue-count">0</span>
          <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">records</span>
        </div>
      </div>
      <div class="queue-items-list" id="queue-items-list">
        <div class="empty-queue-text" id="i18n-emptyQueueText">${t('emptyQueueText')}</div>
      </div>
    </section>

    <!-- Cloud Database Synced Submissions Feed Card -->
    <section class="glass-card">
      <div class="card-header-title">
        <h2 id="i18n-cloudTitle">${t('cloudTitle')}</h2>
        <button class="btn-secondary" id="btn-fetch-cloud" style="padding: 7px 16px; font-size: 12px;">
          <span id="cloud-icon">🔄</span> <span id="i18n-btnFetchCloud">${t('btnFetchCloud').replace(/^🔄\s*/, '')}</span>
        </button>
      </div>
      <div class="queue-summary-box">
        <span id="i18n-cloudCountLabel">${t('cloudCountLabel')}</span>
        <div class="queue-counter-badge">
          <span id="cloud-count">0</span>
          <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">synced</span>
        </div>
      </div>
      <div class="queue-items-list" id="cloud-items-list">
        <div class="empty-queue-text" id="i18n-emptyCloudText">${t('emptyCloudText')}</div>
      </div>
    </section>

    <!-- Glassmorphic Modal Overlay for Survey Details -->
    <div class="modal-overlay" id="details-modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 id="modal-title">${t('modalTitle')}</h3>
          <button class="modal-close-btn" id="btn-close-modal">✕</button>
        </div>
        <div class="modal-body" id="modal-body-content">
          <!-- Content dynamically injected -->
        </div>
      </div>
    </div>

    <div id="toast-container"></div>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  // Language Switcher Button Event Listener
  document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'en' ? 'vi' : 'en';
    setStoredLanguage(currentLanguage);
    renderAppUI();
    goToStep(currentStep);
    updateQueueUI();
    fetchCloudDatabaseRecords();
    showToast(currentLanguage === 'vi' ? 'Đã chuyển sang Tiếng Việt 🇻🇳' : 'Switched to English 🇬🇧', 'info');
  });

  // Chip Checkbox Active Toggle Event Handler
  document.querySelectorAll('.chip-tag input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const parent = target.closest('.chip-tag');
      if (parent) {
        if (target.checked) {
          parent.classList.add('active');
        } else {
          parent.classList.remove('active');
        }
      }
      triggerDraftSave();
    });
  });

  document.getElementById('btn-next-1')?.addEventListener('click', () => {
    const building = (document.getElementById('building') as HTMLInputElement).value;
    const floor = (document.getElementById('floor') as HTMLInputElement).value;
    const room = (document.getElementById('room') as HTMLInputElement).value;

    if (!building.trim() || !floor.trim() || !room.trim()) {
      showToast(t('toastValidationWarning'), 'warning');
      return;
    }
    goToStep(2);
  });

  document.getElementById('btn-next-2')?.addEventListener('click', () => goToStep(3));
  document.getElementById('btn-prev-2')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-prev-3')?.addEventListener('click', () => goToStep(2));

  document.querySelectorAll('.step-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStep = Number(btn.getAttribute('data-step'));
      goToStep(targetStep);
    });
  });

  // Interactive Star Rating Logic
  document.querySelectorAll('.star-icon').forEach(star => {
    star.addEventListener('click', () => {
      const val = Number(star.getAttribute('data-value'));
      selectedRating = val;
      (document.getElementById('rating') as HTMLInputElement).value = val.toString();
      
      document.querySelectorAll('.star-icon').forEach(s => {
        const v = Number(s.getAttribute('data-value'));
        if (v <= val) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });

      const badge = document.getElementById('rating-badge');
      if (badge) {
        const ratingLabels: Record<number, { en: string; vi: string }> = {
          1: { en: '1 / 5 ⚠️ Critical', vi: '1 / 5 ⚠️ Rất kém' },
          2: { en: '2 / 5 ⚠️ Poor', vi: '2 / 5 ⚠️ Kém' },
          3: { en: '3 / 5 ⚖️ Fair', vi: '3 / 5 ⚖️ Trung bình' },
          4: { en: '4 / 5 👍 Good', vi: '4 / 5 👍 Tốt' },
          5: { en: '5 / 5 🌟 Excellent', vi: '5 / 5 🌟 Tuyệt vời' }
        };
        badge.textContent = ratingLabels[val]?.[currentLanguage] || `${val} / 5`;
      }
      triggerDraftSave();
    });
  });

  // Native Camera Photo Capture
  document.getElementById('btn-photo')!.addEventListener('click', async () => {
    const photo = await capturePhoto();
    if (photo) {
      capturedPhotoBase64 = photo;
      const imgEl = document.getElementById('photo-preview') as HTMLImageElement;
      const frame = document.getElementById('preview-frame')!;
      imgEl.src = photo;
      frame.style.display = 'block';
      showToast(t('toastPhotoSuccess'), 'success');
      triggerDraftSave();
    }
  });

  document.getElementById('btn-remove-photo')?.addEventListener('click', () => {
    capturedPhotoBase64 = undefined;
    (document.getElementById('photo-preview') as HTMLImageElement).src = '';
    document.getElementById('preview-frame')!.style.display = 'none';
    showToast(t('toastPhotoRemoved'), 'info');
    triggerDraftSave();
  });

  // Form Submit Event Handler
  const form = document.getElementById('survey-form') as HTMLFormElement;
  form.addEventListener('input', triggerDraftSave);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Capture the native position at the moment the field record is submitted.
    // If GPS is unavailable/denied, the survey is still safely queued offline.
    const gps = await getCurrentGPS();
    const survey: SurveyData = {
      id: currentDraftId,
      inspectorName: (document.getElementById('inspectorName') as HTMLInputElement).value,
      building: (document.getElementById('building') as HTMLInputElement).value,
      floor: (document.getElementById('floor') as HTMLInputElement).value,
      room: (document.getElementById('room') as HTMLInputElement).value,
      roomType: (document.getElementById('roomType') as HTMLSelectElement).value,
      category: (document.getElementById('category') as HTMLSelectElement).value as any,
      assetTag: (document.getElementById('assetTag') as HTMLInputElement).value,
      rating: selectedRating,
      operationalStatus: (document.getElementById('operationalStatus') as HTMLSelectElement).value as any,
      priorityLevel: (document.getElementById('priorityLevel') as HTMLSelectElement).value as any,
      issueTags: getSelectedIssueTags(),
      notes: (document.getElementById('notes') as HTMLTextAreaElement).value,
      actionRequired: (document.getElementById('actionRequired') as HTMLSelectElement).value,
      photoBase64: capturedPhotoBase64,
      latitude: gps?.lat,
      longitude: gps?.lng,
      locationAccuracy: gps?.accuracy,
      timestamp: Date.now(),
      status: 'PENDING_SYNC'
    };

    await addToSyncQueue(survey);
    showToast(`${t('toastSavedToQueue')} ${gps ? `📍 (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})` : ''}`, 'success');
    
    // Reset Form
    form.reset();
    document.querySelectorAll('#issue-tags-group .chip-tag').forEach(c => c.classList.remove('active'));
    capturedPhotoBase64 = undefined;
    document.getElementById('preview-frame')!.style.display = 'none';
    currentDraftId = uuidv4();
    selectedRating = 5;
    document.querySelectorAll('.star-icon').forEach(s => s.classList.add('active'));
    document.getElementById('rating-badge')!.textContent = '5 / 5';
    
    goToStep(1);
    updateQueueUI();

    if (await isOnline()) {
      triggerAutoSync();
    }
  });

  document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
  document.getElementById('details-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('details-modal-overlay')) {
      closeModal();
    }
  });

  document.getElementById('btn-sync')!.addEventListener('click', triggerAutoSync);
  document.getElementById('btn-fetch-cloud')!.addEventListener('click', fetchCloudDatabaseRecords);
}

function getSelectedIssueTags(): string[] {
  const selected: string[] = [];
  document.querySelectorAll<HTMLInputElement>('#issue-tags-group input[type="checkbox"]:checked').forEach(cb => {
    selected.push(cb.value);
  });
  return selected;
}

// Navigation Wizard Logic
function goToStep(step: number) {
  currentStep = step;
  console.log('Navigated to wizard step:', currentStep);
  document.querySelectorAll('.step-pane').forEach(el => el.classList.remove('active'));
  document.getElementById(`pane-step-${step}`)?.classList.add('active');

  document.querySelectorAll('.step-item').forEach(el => {
    const s = Number(el.getAttribute('data-step'));
    const circle = el.querySelector('.step-circle');
    if (s === step) {
      el.classList.add('active');
      el.classList.remove('completed');
      if (circle) circle.textContent = s.toString();
    } else if (s < step) {
      el.classList.remove('active');
      el.classList.add('completed');
      if (circle) circle.textContent = '✓';
    } else {
      el.classList.remove('active', 'completed');
      if (circle) circle.textContent = s.toString();
    }
  });

  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${((step - 1) / 2) * 100}%`;
  }
}

// Modal Logic
function openSurveyDetailsModal(item: SurveyData) {
  const overlay = document.getElementById('details-modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const contentEl = document.getElementById('modal-body-content');

  if (!overlay || !contentEl || !titleEl) return;

  titleEl.textContent = `${item.building} - ${item.room} (${item.category})`;

  contentEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap: 14px;">
      <div class="detail-row-grid">
        <div class="detail-item">
          <label>Auditor / Inspector</label>
          <p>${item.inspectorName || 'N/A'}</p>
        </div>
        <div class="detail-item">
          <label>Sync Status</label>
          <p style="color: ${item.status === 'SYNCED' ? 'var(--success)' : 'var(--warning)'};">${item.status}</p>
        </div>
        <div class="detail-item">
          <label>Building & Floor</label>
          <p>${item.building} (${item.floor})</p>
        </div>
        <div class="detail-item">
          <label>Room # & Zone</label>
          <p>${item.room} [${item.roomType || 'Standard'}]</p>
        </div>
        <div class="detail-item">
          <label>Category & Asset Tag</label>
          <p>${item.category} ${item.assetTag ? '(# ' + item.assetTag + ')' : ''}</p>
        </div>
        <div class="detail-item">
          <label>Operational Status</label>
          <p>${item.operationalStatus || 'Functional'}</p>
        </div>
        <div class="detail-item">
          <label>Priority Level</label>
          <p>${item.priorityLevel || 'Medium'}</p>
        </div>
        <div class="detail-item">
          <label>Condition Rating</label>
          <p style="color: var(--accent-gold);">★ ${item.rating} / 5</p>
        </div>
      </div>

      ${item.issueTags && item.issueTags.length > 0 ? `
        <div class="detail-item">
          <label>Observed Issue Tags</label>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
            ${item.issueTags.map(tag => `<span class="tag-pending" style="background:rgba(56,189,248,0.15); color:var(--primary-light); border-color:rgba(56,189,248,0.3);">${tag}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${item.actionRequired ? `
        <div class="detail-item">
          <label>Action Required</label>
          <p style="color: var(--primary-light);">${item.actionRequired}</p>
        </div>
      ` : ''}

      <div class="detail-item">
        <label>Defect Notes / Incident Details</label>
        <p style="font-weight:normal; background:rgba(30,41,59,0.5); padding:10px; border-radius:8px; border:1px solid var(--border-glass);">
          ${item.notes || 'No defect notes recorded.'}
        </p>
      </div>

      <div class="detail-item">
        <label>Timestamp</label>
        <p style="font-size:12px; color:var(--text-muted);">${new Date(item.timestamp).toLocaleString()}</p>
      </div>

      ${item.latitude !== undefined && item.longitude !== undefined ? `
        <div class="detail-item">
          <label>GPS Location</label>
          <p style="font-size:12px; color:var(--text-muted);">
            ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}
            ${item.locationAccuracy !== undefined ? ` (±${Math.round(item.locationAccuracy)} m)` : ''}
          </p>
        </div>
      ` : ''}

      ${item.photoBase64 ? `
        <div class="detail-item">
          <label>Field Photo Evidence</label>
          <div class="detail-photo-frame">
            <img src="${item.photoBase64}" alt="Field Photo Evidence" />
          </div>
        </div>
      ` : `
        <div class="detail-item">
          <label>Field Photo Evidence</label>
          <p style="font-size:12px; color:var(--text-dim);">No photo attached.</p>
        </div>
      `}
    </div>
  `;

  overlay.classList.add('active');
}

function closeModal() {
  document.getElementById('details-modal-overlay')?.classList.remove('active');
}

// Network Status UI Updates
async function updateNetworkUI(online: boolean) {
  const statusEl = document.getElementById('network-status');
  const statusText = document.getElementById('status-text');
  
  if (statusEl && statusText) {
    if (online) {
      statusEl.className = 'status-pill online';
      statusText.textContent = t('online');
      showToast(t('toastOnline'), 'info');
      triggerAutoSync();
    } else {
      statusEl.className = 'status-pill offline';
      statusText.textContent = t('offline');
      showToast(t('toastOffline'), 'warning');
    }
  }
}

listenNetworkStatus(updateNetworkUI);
isOnline().then(updateNetworkUI);

// Real-time Draft Saving in IndexedDB
async function triggerDraftSave() {
  const survey: SurveyData = {
    id: currentDraftId,
    inspectorName: (document.getElementById('inspectorName') as HTMLInputElement).value,
    building: (document.getElementById('building') as HTMLInputElement).value,
    floor: (document.getElementById('floor') as HTMLInputElement).value,
    room: (document.getElementById('room') as HTMLInputElement).value,
    roomType: (document.getElementById('roomType') as HTMLSelectElement).value,
    category: (document.getElementById('category') as HTMLSelectElement).value as any,
    assetTag: (document.getElementById('assetTag') as HTMLInputElement).value,
    rating: selectedRating,
    operationalStatus: (document.getElementById('operationalStatus') as HTMLSelectElement).value as any,
    priorityLevel: (document.getElementById('priorityLevel') as HTMLSelectElement).value as any,
    issueTags: getSelectedIssueTags(),
    notes: (document.getElementById('notes') as HTMLTextAreaElement).value,
    actionRequired: (document.getElementById('actionRequired') as HTMLSelectElement).value,
    photoBase64: capturedPhotoBase64,
    timestamp: Date.now(),
    status: 'DRAFT'
  };
  await saveDraft(survey);
}

// Update Queue Inspector UI
async function updateQueueUI() {
  const queue = await getPendingSyncQueue();
  currentQueueRecords = queue;
  const countEl = document.getElementById('queue-count');
  const listEl = document.getElementById('queue-items-list');
  
  if (countEl) countEl.textContent = queue.length.toString();

  if (!listEl) return;

  if (queue.length === 0) {
    listEl.innerHTML = `<div class="empty-queue-text">${t('emptyQueueText')}</div>`;
    return;
  }

  listEl.innerHTML = queue.map((item, idx) => `
    <div class="queue-item-card">
      ${item.photoBase64 ? `<img src="${item.photoBase64}" alt="Evidence" style="width: 46px; height: 46px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border-glass); flex-shrink: 0;" />` : ''}
      <div class="queue-item-info">
        <h4>${item.building} - ${item.room} (${item.category})</h4>
        <p>⭐ ${item.rating}/5 • ${item.operationalStatus || 'Status N/A'} • ${new Date(item.timestamp).toLocaleTimeString()}</p>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="tag-pending">PENDING</span>
        <button class="btn-view-details" data-queue-idx="${idx}">View 👁️</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll<HTMLButtonElement>('.btn-view-details[data-queue-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-queue-idx'));
      if (currentQueueRecords[idx]) {
        openSurveyDetailsModal(currentQueueRecords[idx]);
      }
    });
  });
}

// Fetch Live Records from Firebase Cloud Database
async function fetchCloudDatabaseRecords() {
  const cloudCountEl = document.getElementById('cloud-count');
  const cloudListEl = document.getElementById('cloud-items-list');
  const cloudIcon = document.getElementById('cloud-icon');
  
  if (cloudIcon) cloudIcon.classList.add('spin');
  if (cloudListEl) cloudListEl.innerHTML = `<div class="empty-queue-text">Fetching records from Firebase Cloud DB...</div>`;

  try {
    const response = await fetch(`${CLOUD_DB_ENDPOINT}.json`);
    const data = await response.json();
    
    if (cloudIcon) cloudIcon.classList.remove('spin');
    
    if (!data) {
      if (cloudCountEl) cloudCountEl.textContent = '0';
      if (cloudListEl) cloudListEl.innerHTML = `<div class="empty-queue-text">${t('emptyCloudText')}</div>`;
      return;
    }

    currentCloudRecords = data;
    const records: SurveyData[] = Object.values(data);
    const keys = Object.keys(data);
    
    if (cloudCountEl) cloudCountEl.textContent = records.length.toString();

    if (cloudListEl) {
      cloudListEl.innerHTML = records.map((item, idx) => {
        const bldg = item.building || 'VKU Campus';
        const rm = item.room || 'General Area';
        const cat = item.category || 'Equipment';
        const stars = item.rating !== undefined ? item.rating : 5;
        const inspector = item.inspectorName ? ` • ${item.inspectorName}` : '';
        const opStatus = item.operationalStatus || 'Functional';
        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Recently';

        return `
        <div class="queue-item-card" style="border-left: 4px solid var(--success);">
          ${item.photoBase64 ? `<img src="${item.photoBase64}" alt="Evidence" style="width: 46px; height: 46px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border-glass); flex-shrink: 0;" />` : ''}
          <div class="queue-item-info">
            <h4>${bldg} - ${rm} (${cat})${inspector}</h4>
            <p>⭐ ${stars}/5 • ${opStatus} • ${dateStr}</p>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="tag-pending" style="background: var(--success-bg); color: var(--success); border-color: rgba(16,185,129,0.35);">SYNCED</span>
            <button class="btn-view-details" data-cloud-key="${keys[idx]}">View 👁️</button>
          </div>
        </div>
      `;
      }).join('');

      document.querySelectorAll<HTMLButtonElement>('.btn-view-details[data-cloud-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-cloud-key');
          if (key && currentCloudRecords[key]) {
            openSurveyDetailsModal(currentCloudRecords[key]);
          }
        });
      });
    }
  } catch (err) {
    console.warn('Cloud DB fetch error:', err);
    if (cloudIcon) cloudIcon.classList.remove('spin');
    if (cloudListEl) cloudListEl.innerHTML = `<div class="empty-queue-text" style="color: #fca5a5;">Could not fetch Cloud DB (Offline or network blocked)</div>`;
  }
}

// Background Sync Trigger to Cloud DB Endpoint
async function triggerAutoSync() {
  if (syncInProgress) return;

  const queue = await getPendingSyncQueue();
  if (queue.length === 0) return;

  syncInProgress = true;

  const syncIcon = document.getElementById('sync-icon');
  if (syncIcon) syncIcon.classList.add('spin');

  showToast(`Synchronizing ${queue.length} record(s) to Cloud Database...`, 'info');

  let syncedCount = 0;

  try {
    for (const item of queue) {
      try {
        console.log('Sending record to Cloud Database:', item);

        const payload: SurveyData = {
          ...item,
          status: 'SYNCED'
        };

        const response = await fetch(`${CLOUD_DB_ENDPOINT}/${item.id}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await removeCompletedSync(item.id);
        syncedCount += 1;
      } catch (err) {
        console.error('Cloud synchronization error for item:', item.id, err);
      }
    }

    if (syncedCount > 0) {
      showToast(t('toastSyncSuccess'), 'success');
      await sendSyncNotification(syncedCount);
    } else {
      showToast(t('toastSyncFailed'), 'warning');
    }
  } finally {
    syncInProgress = false;
    if (syncIcon) syncIcon.classList.remove('spin');
    updateQueueUI();
    fetchCloudDatabaseRecords();
  }
}

// Initialize Application UI
renderAppUI();
updateQueueUI();
fetchCloudDatabaseRecords();
