const DEMO_DOCTOR_ID = "demo-doctor";

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": DEMO_DOCTOR_ID,
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

  if (runOcrBtn && scanZone && ocrResult) {
    runOcrBtn.addEventListener("click", async () => {
      runOcrBtn.disabled = true;
      runOcrBtn.textContent = "Validando...";
      scanZone.classList.add("scanning");
      try {
        const result = await api("/api/onboarding/validate-crm", {
          method: "POST",
          body: JSON.stringify({
            imageBase64: "data:image/mock;base64,AAAABBBB",
            phone: phoneInput?.value?.trim() || "",
          }),
        });
        const extracted = result.extracted || {};
        if (ocrFields) {
          ocrFields.innerHTML = `
            <li>${extracted.full_name || "-"}</li>
            <li>CRM: ${extracted.crm_number || "-"}-${extracted.crm_state || "-"}</li>
            <li>Especialidade: ${extracted.specialty_hint || "-"}</li>
          `;
        }
        ocrResult.classList.add("show");
      } catch (error) {
        alert(error.message);
      } finally {
        scanZone.classList.remove("scanning");
        runOcrBtn.textContent = "OCR concluido";
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

const mobileLogin = document.getElementById("mobile-login");
if (mobileLogin) {
  const tabs = Array.from(document.querySelectorAll(".tab[data-mode]"));
  const desktopLogin = document.getElementById("desktop-login");
  const biometricBtn = document.getElementById("biometric-btn");
  const biometricStatus = document.getElementById("biometric-status");
  const pinGrid = document.getElementById("pin-grid");
  const pinView = document.getElementById("pin-view");
  const pinStatus = document.getElementById("pin-status");
  const identityInput = document.getElementById("identity");
  const magicBtn = document.getElementById("magic-btn");
  const magicResult = document.getElementById("magic-result");

  let currentPin = "";

  const updatePinView = () => {
    const masked = currentPin
      .padEnd(Math.max(4, currentPin.length), "_")
      .slice(0, Math.max(4, currentPin.length))
      .split("")
      .join(" ");
    if (pinView) pinView.textContent = masked;
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.mode;
      mobileLogin.classList.toggle("active", mode === "mobile");
      if (desktopLogin) desktopLogin.classList.toggle("active", mode === "desktop");
    });
  });

  if (biometricBtn && biometricStatus) {
    biometricBtn.addEventListener("click", () => {
      biometricStatus.textContent = "Sincronizando sua agenda...";
      setTimeout(() => {
        biometricStatus.textContent = "Acesso liberado. Buscando novas oportunidades...";
      }, 900);
    });
  }

  if (pinGrid && pinStatus) {
    pinGrid.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;

      const action = target.getAttribute("data-pin-action");
      const value = target.textContent?.trim();

      if (action === "clear") {
        currentPin = "";
        pinStatus.textContent = "";
        updatePinView();
        return;
      }

      if (action === "send") {
        if (currentPin.length === 4 || currentPin.length === 6) {
          pinStatus.textContent = "Acesso rapido confirmado. Entrando no painel...";
          pinStatus.style.color = "#166534";
        } else {
          pinStatus.textContent = "Use PIN de 4 ou 6 digitos para continuar.";
          pinStatus.style.color = "#b45309";
        }
        return;
      }

      if (!value || !/^\d$/.test(value)) return;
      if (currentPin.length < 6) {
        currentPin += value;
        updatePinView();
      }
    });
  }

  if (magicBtn && magicResult && identityInput) {
    magicBtn.addEventListener("click", () => {
      if (!identityInput.value.trim()) {
        magicResult.textContent = "Preencha e-mail ou CPF para receber acesso rapido.";
        magicResult.classList.add("show");
        return;
      }
      magicResult.textContent =
        "Enviamos um link seguro para voce. Toque nele para entrar instantaneamente.";
      magicResult.classList.add("show");
    });
  }
}
