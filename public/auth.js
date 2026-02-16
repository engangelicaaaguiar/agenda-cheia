const DOCTOR_ID_STORAGE_KEY = "dutymd_doctor_id";

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
    throw new Error(payload.error || "Falha na requisicao");
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
  let selectedCrmFile = null;
  let hasValidatedDocument = false;

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

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo enviado."));
      reader.readAsDataURL(file);
    });

  const saveStep = async (step) => {
    const payload = { step, data: {} };

    if (step === 1) {
      payload.data.phone = phoneInput?.value?.trim() || "";
    }

    if (step === 2) {
      payload.data.specialties = selectedSpecialties.map((item) => ({
        specialty_id: item.id,
        is_primary: item.is_primary,
      }));
    }

    if (step === 3) {
      payload.data.availabilities = selectedSlots.map(({ _idx, ...rest }) => rest);
    }

    await api("/api/onboarding/save-step", {
      method: "POST",
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
          signupStatus.textContent = "Tudo pronto, Dr(a). Seu consultorio digital esta aberto.";
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
      const file = crmFileInput.files && crmFileInput.files[0] ? crmFileInput.files[0] : null;
      selectedCrmFile = file;
      hasValidatedDocument = false;
      if (ocrResult) ocrResult.classList.remove("show");

      if (!file) {
        crmFileName.textContent = "Nenhum arquivo selecionado.";
        runOcrBtn.disabled = true;
        return;
      }

      const fileSizeMb = file.size / (1024 * 1024);
      if (fileSizeMb > 8) {
        crmFileName.textContent = "Arquivo maior que 8MB. Envie um arquivo menor.";
        crmFileName.style.color = "#b91c1c";
        selectedCrmFile = null;
        crmFileInput.value = "";
        runOcrBtn.disabled = true;
        return;
      }

      crmFileName.textContent = `Arquivo selecionado: ${file.name}`;
      crmFileName.style.color = "";
      runOcrBtn.disabled = false;
      runOcrBtn.textContent = "Validar documento e liberar acesso";
    });
  }

  if (runOcrBtn && scanZone && ocrResult) {
    runOcrBtn.addEventListener("click", async () => {
      if (hasValidatedDocument) {
        try {
          await saveStep(1);
          showStep(2);
        } catch (error) {
          alert(error.message || "Nao foi possivel avancar para o proximo passo.");
        }
        return;
      }

      if (!selectedCrmFile) {
        alert("Selecione um documento ou imagem para validar.");
        return;
      }

      runOcrBtn.disabled = true;
      runOcrBtn.textContent = "Validando...";
      scanZone.classList.add("scanning");
      try {
        const imageBase64 = await fileToDataUrl(selectedCrmFile);
        const result = await api("/api/onboarding/validate-crm", {
          method: "POST",
          body: JSON.stringify({
            imageBase64,
            phone: phoneInput?.value?.trim() || "",
            fileName: selectedCrmFile.name,
            mimeType: selectedCrmFile.type || "application/octet-stream",
          }),
        });
        const extracted = result.extracted || {};
        if (ocrFields) {
          ocrFields.innerHTML = `
            <li>${extracted.full_name || "-"}</li>
            <li>CRM: ${extracted.crm_number || "-"}-${extracted.crm_state || "-"}</li>
            <li>Especialidade: ${extracted.specialty_hint || "-"}</li>
            ${extracted.source_file ? `<li>Arquivo: ${extracted.source_file}</li>` : ""}
          `;
        }
        ocrResult.classList.add("show");
        hasValidatedDocument = true;
      } catch (error) {
        alert(error.message);
      } finally {
        scanZone.classList.remove("scanning");
        if (hasValidatedDocument) {
          runOcrBtn.textContent = "OCR concluido - continuar";
          runOcrBtn.disabled = false;
        } else {
          runOcrBtn.textContent = "Validar documento e liberar acesso";
          runOcrBtn.disabled = false;
        }
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
    supabase_not_configured: "OAuth Google indisponivel: conexao Supabase nao configurada.",
    google_provider_not_enabled:
      "Google login nao esta habilitado no Supabase. Ative o provider Google no painel de Auth.",
    google_missing_oauth_secret:
      "Google OAuth sem Client Secret no Supabase. Preencha Client ID e Client Secret no provider Google.",
    google_invalid_redirect_url:
      "Redirect URL invalida no Google/Supabase. Revise as URLs autorizadas e tente novamente.",
    google_oauth_unavailable: "Nao foi possivel iniciar o login Google agora. Tente novamente.",
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
    throw new Error(payload?.error || "Falha ao preparar cadastro do medico.");
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
    setAuthHintMessage("Redirecionando para autenticacao Google...");
    window.location.href = "/api/auth/google-start";
  });
}
