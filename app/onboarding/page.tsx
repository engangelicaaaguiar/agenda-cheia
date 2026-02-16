"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X } from "lucide-react";
import {
  OnboardingProfileInputSchema,
  type OnboardingProfileInput,
} from "../../types/onboarding";
import { saveUserProfileOnboarding } from "../../actions/user-profile";

const specialtyOptions = [
  "Clinica Geral",
  "Cardiologia",
  "Psiquiatria",
  "Dermatologia",
  "Pediatria",
  "Ortopedia",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingProfileInput>({
    resolver: zodResolver(OnboardingProfileInputSchema),
    defaultValues: {
      fullName: "",
      crm: "",
      crmState: "",
      role: "DOCTOR",
      specialties: [],
      documentNames: [],
    },
    mode: "onBlur",
  });

  const documentNames = watch("documentNames");
  const selectedSpecialties = watch("specialties");

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting]);

  function setDocumentsFromFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const names = Array.from(fileList).map((file) => file.name);
    const merged = Array.from(new Set([...(documentNames || []), ...names]));
    setValue("documentNames", merged, { shouldValidate: true });
  }

  function removeDocument(name: string) {
    const next = (documentNames || []).filter((item) => item !== name);
    setValue("documentNames", next, { shouldValidate: true });
  }

  async function onSubmit(data: OnboardingProfileInput) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await saveUserProfileOnboarding(data);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6">
          <h1 className="text-2xl font-semibold text-slate-900">Onboarding DutyMD</h1>
          <p className="mt-1 text-sm text-slate-600">
            Complete seu perfil profissional e envie documentos para liberar o dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 p-8 lg:grid-cols-2">
          <section className="space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Dados Pessoais e Profissionais
            </h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome completo</label>
              <input
                {...register("fullName")}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Dr(a). Nome Sobrenome"
              />
              {errors.fullName ? (
                <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">CRM</label>
                <input
                  {...register("crm")}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="123456"
                />
                {errors.crm ? <p className="mt-1 text-xs text-red-600">{errors.crm.message}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">UF</label>
                <input
                  {...register("crmState")}
                  maxLength={2}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm uppercase focus:border-emerald-500 focus:outline-none"
                  placeholder="SP"
                />
                {errors.crmState ? (
                  <p className="mt-1 text-xs text-red-600">{errors.crmState.message}</p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Especialidades</p>
              <div className="grid grid-cols-2 gap-2">
                {specialtyOptions.map((specialty) => (
                  <label
                    key={specialty}
                    className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      value={specialty}
                      checked={(selectedSpecialties || []).includes(specialty)}
                      onChange={(event) => {
                        const current = selectedSpecialties || [];
                        const next = event.target.checked
                          ? [...current, specialty]
                          : current.filter((item) => item !== specialty);
                        setValue("specialties", next, { shouldValidate: true });
                      }}
                    />
                    <span>{specialty}</span>
                  </label>
                ))}
              </div>
              {errors.specialties ? (
                <p className="mt-1 text-xs text-red-600">{errors.specialties.message as string}</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Documentos e Anexos
            </h2>

            <div
              className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                setDocumentsFromFiles(event.dataTransfer.files);
              }}
            >
              <Upload className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                Arraste PDFs ou imagens aqui
              </p>
              <p className="mt-1 text-xs text-slate-500">CRM digital, documento de identidade, comprovantes</p>
              <label className="mt-4 inline-block cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">
                Selecionar arquivos
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,image/*"
                  onChange={(event) => setDocumentsFromFiles(event.target.files)}
                />
              </label>
            </div>

            {(documentNames || []).length > 0 ? (
              <ul className="space-y-2 rounded-lg border border-slate-200 p-3">
                {(documentNames || []).map((name) => (
                  <li key={name} className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-700">{name}</span>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => removeDocument(name)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {errors.documentNames ? (
              <p className="text-xs text-red-600">{errors.documentNames.message as string}</p>
            ) : null}
          </section>

          <div className="lg:col-span-2 flex items-center justify-between border-t border-slate-200 pt-5">
            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : <span />}
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 rounded-md bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSubmitting ? "Salvando..." : "Salvar e entrar no dashboard"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
