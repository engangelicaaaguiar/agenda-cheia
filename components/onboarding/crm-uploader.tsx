"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { useDropzone } from "react-dropzone";
import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

type CrmUploaderProps = {
  onConfirmExtract: (file: File) => Promise<void>;
  isLoading: boolean;
};

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(body);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let index = 0; index < len; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mime });
}

export function CrmUploader({ onConfirmExtract, isLoading }: CrmUploaderProps) {
  const webcamRef = useRef<Webcam | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tab, setTab] = useState("upload");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const first = acceptedFiles[0];
    if (!first) return;
    setFile(first);
    setPreviewUrl(URL.createObjectURL(first));
  }, []);

  const dropzone = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
  });

  const hintText = useMemo(() => {
    if (!file) return "Arraste e solte uma imagem do CRM ou use a webcam.";
    return `Arquivo selecionado: ${file.name}`;
  }, [file]);

  function clearImage() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  }

  function captureFromWebcam() {
    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) return;
    const generated = dataUrlToFile(screenshot, `crm-${Date.now()}.jpg`);
    setFile(generated);
    setPreviewUrl(screenshot);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documento CRM</CardTitle>
        <CardDescription>Envie uma foto nítida para extração automática de dados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upload">
              <ImagePlus className="mr-2 h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="webcam">
              <Camera className="mr-2 h-4 w-4" />
              Webcam
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div
              {...dropzone.getRootProps()}
              className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
                dropzone.isDragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50"
              }`}
            >
              <input {...dropzone.getInputProps()} />
              <Upload className="mx-auto h-7 w-7 text-slate-500" />
              <p className="mt-2 text-sm text-slate-700">{hintText}</p>
              <p className="mt-1 text-xs text-slate-500">PNG, JPG ou WEBP. Somente 1 arquivo.</p>
            </div>
          </TabsContent>

          <TabsContent value="webcam">
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <div className="overflow-hidden rounded-md border border-slate-200">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }}
                  className="h-[280px] w-full object-cover"
                />
              </div>
              <Button type="button" variant="outline" onClick={captureFromWebcam}>
                Capturar foto
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {previewUrl ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="overflow-hidden rounded-md border border-slate-200">
              <img src={previewUrl} alt="Preview CRM" className="h-48 w-full object-contain bg-slate-50" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={clearImage}>
                <X className="mr-1 h-4 w-4" />
                Remover
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!file) return;
                  await onConfirmExtract(file);
                }}
                disabled={isLoading || !file}
              >
                {isLoading ? "Analisando seu documento..." : "Confirmar e Extrair"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
