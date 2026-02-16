"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { CrmUploader } from "../../components/onboarding/crm-uploader";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { extractCrmData } from "./actions";
import { saveUserProfileOnboarding } from "../../actions/user-profile";

const OnboardingFormSchema = z.object({
  fullName: z.string().min(3, "Informe o nome completo."),
  crm: z
    .string()
    .min(4, "CRM invalido.")
    .regex(/^\d+$/, "CRM deve conter apenas numeros."),
  crmState: z.string().length(2, "UF deve ter 2 caracteres."),
  rqe: z.string().max(30, "RQE muito longo.").optional(),
  ecpfLinked: z.boolean().default(false),
  specialty: z.string().min(2, "Selecione uma especialidade."),
  documentNames: z.array(z.string().min(1)).min(1, "Envie ao menos um documento."),
});

type OnboardingFormValues = z.infer<typeof OnboardingFormSchema>;

const specialtyOptions = [
  { label: "Selecione uma especialidade", value: "" },
  { label: "Clinica Geral", value: "Clinica Geral" },
  { label: "Cardiologia", value: "Cardiologia" },
  { label: "Psiquiatria", value: "Psiquiatria" },
  { label: "Dermatologia", value: "Dermatologia" },
  { label: "Pediatria", value: "Pediatria" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingFormSchema),
    defaultValues: {
      fullName: "",
      crm: "",
      crmState: "",
      rqe: "",
      ecpfLinked: false,
      specialty: "",
      documentNames: [],
    },
  });

  const documentNames = watch("documentNames");

  async function handleExtract(file: File) {
    setOcrError(null);
    setOcrLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await extractCrmData(formData);

      if (!result.ok) {
        setOcrError(result.error);
        const names = Array.from(new Set([...(documentNames || []), file.name]));
        setValue("documentNames", names, { shouldValidate: true });
        return;
      }

      setValue("fullName", result.data.name, { shouldValidate: true, shouldDirty: true });
      setValue("crm", result.data.crm, { shouldValidate: true, shouldDirty: true });
      setValue("crmState", result.data.uf, { shouldValidate: true, shouldDirty: true });
      const names = Array.from(new Set([...(documentNames || []), file.name]));
      setValue("documentNames", names, { shouldValidate: true });
    } finally {
      setOcrLoading(false);
    }
  }

  async function onSubmit(values: OnboardingFormValues) {
    setSaveError(null);
    setSaveLoading(true);

    try {
      const result = await saveUserProfileOnboarding({
        fullName: values.fullName,
        crm: values.crm,
        crmState: values.crmState,
        rqe: values.rqe,
        ecpfLinked: values.ecpfLinked,
        role: "DOCTOR",
        specialties: [values.specialty],
        documentNames: values.documentNames,
      });

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }

      router.push("/dashboard");
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Onboarding Medico - DutyMD</CardTitle>
          <CardDescription>
            Envie seu CRM e complete os dados profissionais. O OCR tenta preencher tudo automaticamente.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" {...register("fullName")} placeholder="Dr(a). Nome Sobrenome" />
                {errors.fullName ? <p className="text-xs text-red-600">{errors.fullName.message}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="crm">CRM</Label>
                  <Input id="crm" {...register("crm")} placeholder="123456" />
                  {errors.crm ? <p className="text-xs text-red-600">{errors.crm.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crmState">UF</Label>
                  <Input id="crmState" maxLength={2} {...register("crmState")} placeholder="SP" />
                  {errors.crmState ? <p className="text-xs text-red-600">{errors.crmState.message}</p> : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Select
                  id="specialty"
                  options={specialtyOptions}
                  value={watch("specialty")}
                  onChange={(event) =>
                    setValue("specialty", event.target.value, { shouldValidate: true, shouldDirty: true })
                  }
                />
                {errors.specialty ? <p className="text-xs text-red-600">{errors.specialty.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rqe">RQE (opcional)</Label>
                <Input id="rqe" {...register("rqe")} placeholder="12345" />
                {errors.rqe ? <p className="text-xs text-red-600">{errors.rqe.message}</p> : null}
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...register("ecpfLinked")} />
                Ja vinculei meu e-CPF para assinatura digital.
              </label>
            </section>

            <section className="space-y-3">
              <CrmUploader onConfirmExtract={handleExtract} isLoading={ocrLoading} />

              {ocrLoading ? (
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando seu documento...
                </div>
              ) : null}

              {ocrError ? <p className="text-sm text-amber-700">{ocrError}</p> : null}
              {errors.documentNames ? (
                <p className="text-xs text-red-600">{errors.documentNames.message as string}</p>
              ) : null}
            </section>

            <div className="lg:col-span-2 flex items-center justify-end border-t border-slate-200 pt-5">
              {saveError ? <p className="mr-auto text-sm text-red-600">{saveError}</p> : null}
              <Button type="submit" disabled={saveLoading || ocrLoading}>
                {saveLoading ? "Salvando..." : "Salvar e entrar no dashboard"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
