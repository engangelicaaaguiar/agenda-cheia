import express from "express";
import cors from "cors";
import path from "node:path";
import { supabaseAdmin, supabaseEnabled } from "./lib/supabaseAdmin.js";

const app = express();
const publicDir = path.join(process.cwd(), "public");

const memoryDb = {
  doctors: new Map(),
  doctorSpecialties: [],
  availabilities: [],
};

const specialtiesCatalog = [
  { id: 1, name: "Clinica Geral" },
  { id: 2, name: "Cardiologia" },
  { id: 3, name: "Cardiologia Pediatrica" },
  { id: 4, name: "Dermatologia" },
  { id: 5, name: "Psiquiatria" },
  { id: 6, name: "Pediatria" },
];

app.use(cors());
app.use(express.json({ limit: "2mb" }));
if (!process.env.NETLIFY) {
  app.use(express.static(publicDir));
}

function getDoctorId(req) {
  return req.header("x-user-id") || req.body?.doctorId || req.query?.doctorId || "demo-doctor";
}

function defaultDoctor(doctorId) {
  const now = new Date().toISOString();
  return {
    id: doctorId,
    full_name: null,
    crm_number: null,
    crm_state: null,
    crm_status: "pending",
    phone: null,
    bio: null,
    avatar_url: null,
    onboarding_step: 1,
    is_profile_complete: false,
    created_at: now,
    updated_at: now,
  };
}

function ensureDoctorMemory(doctorId) {
  if (!memoryDb.doctors.has(doctorId)) {
    memoryDb.doctors.set(doctorId, defaultDoctor(doctorId));
  }
  return memoryDb.doctors.get(doctorId);
}

async function ensureDoctor(doctorId) {
  if (!supabaseEnabled) return ensureDoctorMemory(doctorId);

  const { data, error } = await supabaseAdmin
    .from("doctors")
    .select("*")
    .eq("id", doctorId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const payload = defaultDoctor(doctorId);
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("doctors")
    .insert(payload)
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

async function getDoctorState(doctorId) {
  if (!supabaseEnabled) {
    const doctor = ensureDoctorMemory(doctorId);
    const specialties = memoryDb.doctorSpecialties.filter((item) => item.doctor_id === doctorId);
    const availabilities = memoryDb.availabilities.filter((item) => item.doctor_id === doctorId);
    return { doctor, specialties, availabilities };
  }

  const doctor = await ensureDoctor(doctorId);
  const [{ data: specialties, error: spError }, { data: availabilities, error: avError }] =
    await Promise.all([
      supabaseAdmin.from("doctor_specialties").select("*").eq("doctor_id", doctorId),
      supabaseAdmin.from("availabilities").select("*").eq("doctor_id", doctorId),
    ]);

  if (spError) throw spError;
  if (avError) throw avError;

  return {
    doctor,
    specialties: specialties || [],
    availabilities: availabilities || [],
  };
}

async function saveDoctorPatch(doctorId, patch) {
  if (!supabaseEnabled) {
    const doctor = ensureDoctorMemory(doctorId);
    Object.assign(doctor, patch, { updated_at: new Date().toISOString() });
    return doctor;
  }

  const payload = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin
    .from("doctors")
    .update(payload)
    .eq("id", doctorId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabaseEnabled });
});

app.get("/api/supabase/ping", async (req, res, next) => {
  try {
    if (!supabaseEnabled) return res.status(400).json({ error: "Supabase nao configurado no .env" });
    const { data, error } = await supabaseAdmin.from("doctors").select("id").limit(1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

app.get("/api/specialties", async (req, res) => {
  if (!supabaseEnabled) return res.json({ items: specialtiesCatalog });

  const { data, error } = await supabaseAdmin.from("specialties").select("id,name").order("name");
  if (error) return res.json({ items: specialtiesCatalog });
  res.json({ items: (data || []).length > 0 ? data : specialtiesCatalog });
});

app.get("/api/onboarding/state", async (req, res, next) => {
  try {
    const doctorId = getDoctorId(req);
    const state = await getDoctorState(doctorId);
    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.get("/api/session/post-login", async (req, res, next) => {
  try {
    const doctorId = getDoctorId(req);
    const doctor = await ensureDoctor(doctorId);
    if (doctor.is_profile_complete) {
      return res.json({ redirectTo: "/dashboard" });
    }
    return res.json({ redirectTo: `/onboarding/step-${doctor.onboarding_step}` });
  } catch (error) {
    next(error);
  }
});

app.post("/api/onboarding/validate-crm", async (req, res, next) => {
  try {
    const doctorId = getDoctorId(req);
    await ensureDoctor(doctorId);
    const { imageBase64, phone } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.length < 8) {
      return res.status(400).json({ error: "Imagem do CRM obrigatoria." });
    }

    // Mock de OCR/CFM para ambiente local.
    const parsed = {
      full_name: "Dr. Ricardo Mendes",
      crm_number: "123456",
      crm_state: "SP",
      specialty_hint: "Cardiologia",
      crm_status: "valid",
    };

    const doctor = await saveDoctorPatch(doctorId, {
      full_name: parsed.full_name,
      crm_number: parsed.crm_number,
      crm_state: parsed.crm_state,
      crm_status: parsed.crm_status,
      phone: phone || null,
      onboarding_step: 2,
    });

    res.json({
      status: "valid",
      extracted: parsed,
      nextStep: doctor.onboarding_step,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/onboarding/save-step", async (req, res, next) => {
  try {
    const doctorId = getDoctorId(req);
    const doctor = await ensureDoctor(doctorId);
    const { step, data } = req.body || {};

    if (!Number.isInteger(step) || step < 1 || step > 4) {
      return res.status(400).json({ error: "Step invalido." });
    }

    if (step === 1) {
      await saveDoctorPatch(doctorId, { phone: data?.phone || doctor.phone });
    }

    if (step === 2) {
      const incoming = Array.isArray(data?.specialties) ? data.specialties : [];
      if (!supabaseEnabled) {
        memoryDb.doctorSpecialties = memoryDb.doctorSpecialties.filter((row) => row.doctor_id !== doctorId);
        incoming.forEach((item, index) => {
          memoryDb.doctorSpecialties.push({
            id: crypto.randomUUID(),
            doctor_id: doctorId,
            specialty_id: Number(item.specialty_id),
            is_primary: Boolean(item.is_primary || index === 0),
          });
        });
      } else {
        await supabaseAdmin.from("doctor_specialties").delete().eq("doctor_id", doctorId);
        if (incoming.length > 0) {
          const rows = incoming.map((item, index) => ({
            doctor_id: doctorId,
            specialty_id: Number(item.specialty_id),
            is_primary: Boolean(item.is_primary || index === 0),
          }));
          const { error } = await supabaseAdmin.from("doctor_specialties").insert(rows);
          if (error) throw error;
        }
      }
    }

    if (step === 3) {
      const incoming = Array.isArray(data?.availabilities) ? data.availabilities : [];
      if (!supabaseEnabled) {
        memoryDb.availabilities = memoryDb.availabilities.filter((row) => row.doctor_id !== doctorId);
        incoming.forEach((item) => {
          memoryDb.availabilities.push({
            id: crypto.randomUUID(),
            doctor_id: doctorId,
            day_of_week: Number(item.day_of_week),
            start_time: item.start_time,
            end_time: item.end_time,
            is_recurring: item.is_recurring !== false,
          });
        });
      } else {
        await supabaseAdmin.from("availabilities").delete().eq("doctor_id", doctorId);
        if (incoming.length > 0) {
          const rows = incoming.map((item) => ({
            doctor_id: doctorId,
            day_of_week: Number(item.day_of_week),
            start_time: item.start_time,
            end_time: item.end_time,
            is_recurring: item.is_recurring !== false,
          }));
          const { error } = await supabaseAdmin.from("availabilities").insert(rows);
          if (error) throw error;
        }
      }
    }

    const nextStep = Math.min(4, step + 1);
    const updated = await saveDoctorPatch(doctorId, {
      onboarding_step: Math.max(doctor.onboarding_step || 1, nextStep),
    });

    res.json({ success: true, onboarding_step: updated.onboarding_step });
  } catch (error) {
    next(error);
  }
});

app.put("/api/doctors/profile", async (req, res, next) => {
  try {
    const doctorId = getDoctorId(req);
    await ensureDoctor(doctorId);
    const { complete, bio, avatar_url } = req.body || {};

    const patch = {};
    if (typeof bio === "string") patch.bio = bio;
    if (typeof avatar_url === "string") patch.avatar_url = avatar_url;
    if (complete === true) {
      patch.is_profile_complete = true;
      patch.onboarding_step = 4;
    }

    const doctor = await saveDoctorPatch(doctorId, patch);
    const state = await getDoctorState(doctorId);
    const specialtyIds = state.specialties.map((row) => Number(row.specialty_id));
    const scoreBoost = specialtyIds.includes(2) ? 20 : 10;

    res.json({
      success: true,
      doctor,
      trigger: {
        indexed_for_matching: true,
        initial_score: 60 + scoreBoost,
        notifications_sent: ["email", "push"],
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/error", (req, res, next) => {
  next(new Error("Erro interno simulado"));
});

app.use((req, res) => {
  res.status(404).json({ error: "Rota nao encontrada" });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: "Erro interno do servidor" });
});

export default app;
