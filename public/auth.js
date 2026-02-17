const DOCTOR_ID_STORAGE_KEY = "dutymd_doctor_id";
const CALENDAR_GOOGLE_STORAGE_PREFIX = "dutymd_calendar_google_connected_";
const CALENDAR_MS_STORAGE_PREFIX = "dutymd_calendar_ms_connected_";

function generateDoctorId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `doctor-${crypto.randomUUID()}`;
  }
  return `doctor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDoctorIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const candidate = params.get("doctorId") || params.get("doctor_id");
    if (candidate && candidate.trim().length >= 8) {
      return candidate.trim();
    }
  } catch {
    // Ignora parsing de URL em ambientes sem window.
  }
  return null;
}

function getOrCreateDoctorId() {
  const fromUrl = getDoctorIdFromUrl();
  if (fromUrl) {
    try {
      localStorage.setItem(DOCTOR_ID_STORAGE_KEY, fromUrl);
    } catch {
      // Ignora erro de storage e segue com valor da URL.
    }
    return fromUrl;
  }

  try {
    const stored = localStorage.getItem(DOCTOR_ID_STORAGE_KEY);
    if (stored && stored.trim().length >= 8) {
      return stored;
    }
  } catch {
    // Ignora falha de leitura de storage.
  }

  const created = generateDoctorId();
  try {
    localStorage.setItem(DOCTOR_ID_STORAGE_KEY, created);
  } catch {
    // Ignora falha de escrita de storage.
  }
  return created;
}

let activeDoctorId = getOrCreateDoctorId();

function setActiveDoctorId(nextId) {
  if (!nextId || nextId.trim().length < 8) return;
  activeDoctorId = nextId.trim();
  try {
    localStorage.setItem(DOCTOR_ID_STORAGE_KEY, activeDoctorId);
  } catch {
    // Ignora falha de escrita no storage.
  }
}

function getCalendarStorageKey(provider) {
  const suffix = activeDoctorId || "anonymous";
  if (provider === "google") return `${CALENDAR_GOOGLE_STORAGE_PREFIX}${suffix}`;
  return `${CALENDAR_MS_STORAGE_PREFIX}${suffix}`;
}

function setCalendarConnected(provider, connected) {
  const key = getCalendarStorageKey(provider);
  try {
    if (connected) {
      localStorage.setItem(key, "1");
      return;
    }
    localStorage.removeItem(key);
  } catch {
    // Ignora erro de storage.
  }
}

function isCalendarConnected(provider) {
  const key = getCalendarStorageKey(provider);
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": activeDoctorId,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Falha na requisição");
  }
  return response.json();
};

const signupForm = document.getElementById("signup-form");

if (signupForm) {
  const steps = Array.from(signupForm.querySelectorAll(".step"));
  const phoneInput = document.getElementById("phone");
  const crmFileInput = document.getElementById("crm-file");
  const crmFileName = document.getElementById("crm-file-name");
  const runOcrBtn = document.getElementById("run-ocr");
  const scanZone = document.getElementById("scan-zone");
  const ocrResult = document.getElementById("ocr-result");
  const ocrFields = document.getElementById("ocr-fields");
  const specialtyInput = document.getElementById("specialty-input");
  const specialtySuggestions = document.getElementById("specialty-suggestions");
  const specialtyChips = document.getElementById("specialty-chips");
  const availabilityGrid = document.getElementById("availability-grid");
  const signupStatus = document.getElementById("signup-status");
  const progressLabel = document.getElementById("progress-label");
  const progressFill = document.getElementById("progress-fill");

  const selectedSpecialties = [];
  const selectedSlots = [];
  let specialtiesCatalog = [];
  let selectedDocuments = [];

  const availabilityTemplates = [
    { day_of_week: 1, period: "Manha", start_time: "08:00", end_time: "12:00" },
    { day_of_week: 1, period: "Tarde", start_time: "13:00", end_time: "18:00" },
    { day_of_week: 2, period: "Manha", start_time: "08:00", end_time: "12:00" },
    { day_of_week: 2, period: "Noite", start_time: "19:00", end_time: "22:00" },
    { day_of_week: 3, period: "Tarde", start_time: "13:00", end_time: "18:00" },
    { day_of_week: 4, period: "Manha", start_time: "08:00", end_time: "12:00" },
    { day_of_week: 5, period: "Noite", start_time: "19:00", end_time: "22:00" },
    { day_of_week: 6, period: "Manha", start_time: "09:00", end_time: "12:00" },
  ];

  const showStep = (targetStep) => {
    steps.forEach((step) => {
      step.classList.toggle("active", Number(step.dataset.step) === targetStep);
    });
    if (progressLabel) progressLabel.textContent = `Passo ${targetStep} de 4`;
    if (progressFill) progressFill.style.width = `${targetStep * 25}%`;
  };

  const renderSpecialtyChips = () => {
    if (!specialtyChips) return;
    specialtyChips.innerHTML = "";
    selectedSpecialties.forEach((item) => {
      const chip = document.createElement("div");
      chip.className = `chip ${item.is_primary ? "primary" : ""}`;
      chip.innerHTML = `
        <span>${item.name}</span>
        <button type="button" data-action="primary" data-id="${item.id}">Principal</button>
        <button type="button" data-action="remove" data-id="${item.id}">X</button>
      `;
      specialtyChips.appendChild(chip);
    });
  };

  const renderSuggestions = (query = "") => {
    if (!specialtySuggestions) return;
    specialtySuggestions.innerHTML = "";
    const normalized = query.toLowerCase();
    const filtered = specialtiesCatalog.filter((item) => item.name.toLowerCase().includes(normalized));
    filtered.slice(0, 6).forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.name;
      button.addEventListener("click", () => {
        if (selectedSpecialties.some((entry) => entry.id === item.id)) return;
        selectedSpecialties.push({
          id: item.id,
          name: item.name,
          is_primary: selectedSpecialties.length === 0,
        });
        renderSpecialtyChips();
      });
      specialtySuggestions.appendChild(button);
    });
  };

  const renderAvailability = () => {
    if (!availabilityGrid) return;
    availabilityGrid.innerHTML = "";
    availabilityTemplates.forEach((slot, idx) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = `Dia ${slot.day_of_week} | ${slot.period} (${slot.start_time}-${slot.end_time})`;
      button.addEventListener("click", () => {
        const exists = selectedSlots.find((item) => item._idx === idx);
        if (exists) {
          const next = selectedSlots.filter((item) => item._idx !== idx);
          selectedSlots.length = 0;
          next.forEach((item) => selectedSlots.push(item));
          button.classList.remove("active");
          return;
        }
        selectedSlots.push({ ...slot, is_recurring: true, _idx: idx });
        button.classList.add("active");
      });
      availabilityGrid.appendChild(button);
    });
  };

  const saveStep = async (step) => {
    const stepValue = Number.parseInt(String(step), 10);
    if (!Number.isInteger(stepValue)) {
      throw new Error("Passo de cadastro inválido.");
    }
    const payload = { step: stepValue, data: {} };

    if (stepValue === 1) {
      payload.data.phone = phoneInput?.value?.trim() || "";
      payload.data.document_review_status = "pending";
      payload.data.documents = selectedDocuments.map((file) => ({
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size || 0,
      }));
    }

    if (stepValue === 2) {
      payload.data.specialties = selectedSpecialties.map((item) => ({
        specialty_id: item.id,
        is_primary: item.is_primary,
      }));
    }

    if (stepValue === 3) {
      payload.data.availabilities = selectedSlots.map(({ _idx, ...rest }) => rest);
    }

    await api(`/api/onboarding/save-step?step=${encodeURIComponent(String(stepValue))}`, {
      method: "POST",
      headers: {
        "x-onboarding-step": String(stepValue),
      },
      body: JSON.stringify(payload),
    });
  };

  signupForm.querySelectorAll("[data-next-step]").forEach((button) => {
    button.addEventListener("click", async () => {
      const next = Number(button.getAttribute("data-next-step"));
      const current = next - 1;
      try {
        await saveStep(current);
        showStep(next);
        if (next === 4 && signupStatus) {
          signupStatus.textContent = "Buscando novas oportunidades...";
          await api("/api/doctors/profile", {
            method: "PUT",
            body: JSON.stringify({ complete: true }),
          });
          signupStatus.textContent = "Tudo pronto, Dr(a). Seu consultório digital está aberto.";
          signupStatus.style.color = "#166534";
        }
      } catch (error) {
        alert(error.message);
      }
    });
  });

  signupForm.querySelectorAll("[data-prev-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const prev = Number(button.getAttribute("data-prev-step"));
      showStep(prev);
    });
  });

  if (crmFileInput && crmFileName && runOcrBtn) {
    crmFileInput.addEventListener("change", () => {
      const files = crmFileInput.files ? Array.from(crmFileInput.files) : [];
      selectedDocuments = files;
      if (ocrResult) ocrResult.classList.remove("show");

      if (!files.length) {
        crmFileName.textContent = "Nenhum arquivo selecionado.";
        runOcrBtn.disabled = true;
        return;
      }

      const hasInvalidFile = files.some((file) => file.size / (1024 * 1024) > 8);
      if (hasInvalidFile) {
        crmFileName.textContent = "Um dos arquivos excede 8MB. Envie arquivos menores.";
        crmFileName.style.color = "#b91c1c";
        selectedDocuments = [];
        crmFileInput.value = "";
        runOcrBtn.disabled = true;
        return;
      }

      crmFileName.textContent = `Arquivos selecionados: ${files.map((file) => file.name).join(", ")}`;
      crmFileName.style.color = "";
      runOcrBtn.disabled = false;
      runOcrBtn.textContent = "Enviar documentos e continuar";
    });
  }

  if (runOcrBtn && scanZone && ocrResult) {
    runOcrBtn.addEventListener("click", async () => {
      if (!selectedDocuments.length) {
        alert("Selecione ao menos um documento ou imagem para enviar.");
        return;
      }

      runOcrBtn.disabled = true;
      runOcrBtn.textContent = "Enviando...";
      scanZone.classList.add("scanning");
      try {
        await saveStep(1);
        if (ocrFields) {
          ocrFields.innerHTML = selectedDocuments
            .map((file) => `<li>${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)</li>`)
            .join("");
        }
        ocrResult.classList.add("show");
        showStep(2);
      } catch (error) {
        alert(error?.message || "Falha ao enviar documentos.");
      } finally {
        scanZone.classList.remove("scanning");
        runOcrBtn.textContent = "Enviar documentos e continuar";
        runOcrBtn.disabled = false;
      }
    });
  }

  if (specialtyInput) {
    specialtyInput.addEventListener("input", () => {
      renderSuggestions(specialtyInput.value.trim());
    });
  }

  if (specialtyChips) {
    specialtyChips.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const action = target.dataset.action;
      const id = Number(target.dataset.id);
      const idx = selectedSpecialties.findIndex((item) => item.id === id);
      if (idx === -1) return;

      if (action === "remove") {
        selectedSpecialties.splice(idx, 1);
        if (!selectedSpecialties.some((item) => item.is_primary) && selectedSpecialties[0]) {
          selectedSpecialties[0].is_primary = true;
        }
      }

      if (action === "primary") {
        selectedSpecialties.forEach((item) => {
          item.is_primary = item.id === id;
        });
      }

      renderSpecialtyChips();
    });
  }

  (async () => {
    try {
      const [catalog, state] = await Promise.all([api("/api/specialties"), api("/api/onboarding/state")]);
      specialtiesCatalog = catalog.items || [];
      renderSuggestions("");
      renderAvailability();
      const currentStep = Math.max(1, Math.min(4, Number(state?.doctor?.onboarding_step || 1)));
      showStep(currentStep);
      if (phoneInput && state?.doctor?.phone) phoneInput.value = state.doctor.phone;
    } catch {
      renderAvailability();
      renderSuggestions("");
      showStep(1);
    }
  })();
}

const emailLoginBtn = document.getElementById("email-login-btn");
const googleLoginBtn = document.getElementById("google-login-btn");
const identityInput = document.getElementById("identity");
const authHint = document.getElementById("auth-hint");

function setAuthHintMessage(message, isError = false) {
  if (!authHint) return;
  authHint.textContent = message;
  authHint.style.color = isError ? "#b91c1c" : "";
}

function showOAuthErrorIfPresent() {
  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get("oauth_error");
  if (!oauthError) return;

  const messageByCode = {
    supabase_not_configured: "OAuth Google indisponível: conexão Supabase não configurada.",
    google_provider_not_enabled:
      "Google login não está habilitado no Supabase. Ative o provedor Google no painel de Auth.",
    google_missing_oauth_secret:
      "Google OAuth sem Client Secret no Supabase. Preencha Client ID e Client Secret no provider Google.",
    google_invalid_redirect_url:
      "Redirect URL inválida no Google/Supabase. Revise as URLs autorizadas e tente novamente.",
    google_oauth_unavailable: "Não foi possível iniciar o login Google agora. Tente novamente.",
    oauth_network_error: "Falha de rede ao iniciar o login Google. Tente novamente.",
  };

  const message = messageByCode[oauthError] || "Falha ao iniciar login com Google.";
  setAuthHintMessage(message, true);
}

function parseTokenHash() {
  const hash = window.location.hash || "";
  if (!hash.includes("access_token")) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    expiresIn: params.get("expires_in"),
    tokenType: params.get("token_type"),
  };
}

function clearHashFromUrl() {
  if (!window.location.hash) return;
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}

function messageFromCalendarStatus(code, providerLabel) {
  const messages = {
    connected: `${providerLabel} conectado com sucesso.`,
    provider_not_enabled: `${providerLabel} não está habilitado no Supabase. Ative o provedor no painel de Auth.`,
    oauth_secret_missing: `${providerLabel} sem Client Secret configurado no Supabase.`,
    invalid_redirect: `Redirect URL inválida para ${providerLabel}. Revise a configuração OAuth.`,
    unavailable: `Não foi possível conectar ${providerLabel} agora. Tente novamente.`,
    network_error: `Falha de rede ao conectar ${providerLabel}. Tente novamente.`,
    setup_required: `Supabase não configurado para sincronizar ${providerLabel}.`,
  };
  return messages[code] || "";
}

async function bootstrapGoogleDoctor(accessToken) {
  const response = await fetch("/api/auth/bootstrap-doctor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.doctorId) {
    throw new Error(payload?.error || "Falha ao preparar cadastro do médico.");
  }

  return payload.doctorId;
}

async function handleGoogleReturnIfNeeded() {
  const url = new URL(window.location.href);
  const isGoogleReturn = url.searchParams.get("google_return") === "1";
  if (!isGoogleReturn) return;

  const tokenInfo = parseTokenHash();
  if (!tokenInfo?.accessToken) {
    setAuthHintMessage("Falha no retorno do Google. Tente novamente.", true);
    return;
  }

  setAuthHintMessage("Validando sua conta Google...");

  try {
    const doctorId = await bootstrapGoogleDoctor(tokenInfo.accessToken);
    setActiveDoctorId(doctorId);
    window.location.href = `/cadastro.html?doctorId=${encodeURIComponent(doctorId)}`;
  } catch (error) {
    setAuthHintMessage(error.message || "Falha ao concluir login com Google.", true);
  }
}

showOAuthErrorIfPresent();
handleGoogleReturnIfNeeded();

const agendaSyncPage = document.getElementById("agenda-sync-page");
if (agendaSyncPage) {
  const googleCalendarBtn = document.getElementById("google-calendar-btn");
  const microsoftCalendarBtn = document.getElementById("microsoft-calendar-btn");
  const googleCalendarStatus = document.getElementById("google-calendar-status");
  const microsoftCalendarStatus = document.getElementById("microsoft-calendar-status");
  const agendaSyncMessage = document.getElementById("agenda-sync-message");

  const setStatusPill = (element, connected) => {
    if (!element) return;
    element.textContent = connected ? "Conectado" : "Não conectado";
    element.classList.toggle("connected", connected);
  };

  const renderCalendarStatus = () => {
    const googleConnected = isCalendarConnected("google");
    const microsoftConnected = isCalendarConnected("microsoft");
    setStatusPill(googleCalendarStatus, googleConnected);
    setStatusPill(microsoftCalendarStatus, microsoftConnected);
    if (agendaSyncMessage && (googleConnected || microsoftConnected)) {
      agendaSyncMessage.textContent = "Sincronização ativa. Sua agenda será considerada no matching de oportunidades.";
      agendaSyncMessage.style.color = "#166534";
    }
  };

  const agendaUrl = new URL(window.location.href);
  const calendarGoogleStatus = agendaUrl.searchParams.get("calendar_google");
  const calendarMicrosoftStatus = agendaUrl.searchParams.get("calendar_ms");
  const calendarGoogleReturn = agendaUrl.searchParams.get("calendar_google_return") === "1";
  const calendarMicrosoftReturn = agendaUrl.searchParams.get("calendar_ms_return") === "1";
  const tokenInfo = parseTokenHash();

  if (calendarGoogleReturn && tokenInfo?.accessToken) {
    setCalendarConnected("google", true);
    clearHashFromUrl();
  }
  if (calendarMicrosoftReturn && tokenInfo?.accessToken) {
    setCalendarConnected("microsoft", true);
    clearHashFromUrl();
  }

  if (calendarGoogleStatus === "connected") setCalendarConnected("google", true);
  if (calendarMicrosoftStatus === "connected") setCalendarConnected("microsoft", true);

  if (agendaSyncMessage) {
    const googleMessage = messageFromCalendarStatus(calendarGoogleStatus, "Google Calendar");
    const microsoftMessage = messageFromCalendarStatus(calendarMicrosoftStatus, "Microsoft Calendar");
    const combinedMessage = [googleMessage, microsoftMessage].filter(Boolean).join(" ");
    if (combinedMessage) {
      const hasError =
        (calendarGoogleStatus && calendarGoogleStatus !== "connected") ||
        (calendarMicrosoftStatus && calendarMicrosoftStatus !== "connected");
      agendaSyncMessage.textContent = combinedMessage;
      agendaSyncMessage.style.color = hasError ? "#b91c1c" : "#166534";
    }
  }

  renderCalendarStatus();

  if (googleCalendarBtn) {
    googleCalendarBtn.addEventListener("click", () => {
      if (agendaSyncMessage) {
        agendaSyncMessage.textContent = "Abrindo autorização do Google Calendar...";
        agendaSyncMessage.style.color = "#1e3a8a";
      }
      window.location.href = `/api/calendar/google/start?doctorId=${encodeURIComponent(activeDoctorId)}`;
    });
  }

  if (microsoftCalendarBtn) {
    microsoftCalendarBtn.addEventListener("click", () => {
      if (agendaSyncMessage) {
        agendaSyncMessage.textContent = "Abrindo autorização do Microsoft Calendar...";
        agendaSyncMessage.style.color = "#1e3a8a";
      }
      window.location.href = `/api/calendar/microsoft/start?doctorId=${encodeURIComponent(activeDoctorId)}`;
    });
  }
}

if (emailLoginBtn && identityInput) {
  emailLoginBtn.addEventListener("click", () => {
    const email = identityInput.value.trim();
    if (!email) {
      if (authHint) authHint.textContent = "Informe seu e-mail para continuar.";
      return;
    }
    const encoded = encodeURIComponent(email);
    window.location.href = `/login?audience=doctor&email=${encoded}`;
  });
}

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", () => {
    setAuthHintMessage("Redirecionando para autenticação Google...");
    window.location.href = "/api/auth/google-start";
  });
}
