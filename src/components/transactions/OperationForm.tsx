import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/components/ui/use-toast";
import { Transaction, TransactionResponse } from "@/models/transaction";

interface Asset {
  id: string;
  name: string;
  type: string;
  amount: number;
}

interface OperationFormProps {
  onComplete: (data: Transaction) => void;
  initialData: Partial<Transaction>;
}

const operationSchema = z.object({
  ingressAssetId: z.string({
    required_error: "Debes seleccionar un activo de ingreso",
  }),
  ingressAmount: z
    .number({
      required_error: "Debes ingresar una cantidad",
      invalid_type_error: "Debe ser un número",
    })
    .positive("La cantidad debe ser mayor a 0"),
  egressAssetId: z.string({
    required_error: "Debes seleccionar un activo de egreso",
  }),
  egressAmount: z
    .number({
      required_error: "Debes ingresar una cantidad",
      invalid_type_error: "Debe ser un número",
    })
    .positive("La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof operationSchema>;

export function OperationForm({ onComplete, initialData }: OperationFormProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      ingressAssetId: "",
      ingressAmount: 0,
      egressAssetId: "",
      egressAmount: 0,
      notes: "",
    },
  });

  const { data: assets, isLoading: isLoadingAssets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      try {
        const response = await api.get<{ data: Asset[] }>("/assets");
        return response.data;
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los activos",
          variant: "destructive",
        });
        throw error;
      }
    },
  });

  useEffect(() => {
    if (initialData && initialData.details) {
      const ingressDetail = initialData.details.find(
        (d) => d.movementType === "INCOME"
      );
      const egressDetail = initialData.details.find(
        (d) => d.movementType === "EXPENSE"
      );

      if (ingressDetail && egressDetail) {
        form.reset({
          ingressAssetId: ingressDetail.assetId,
          ingressAmount: ingressDetail.amount,
          egressAssetId: egressDetail.assetId,
          egressAmount: egressDetail.amount,
          notes: initialData.notes,
        });
      }
    }
  }, [initialData, form]);

  const formatAmount = (value: number) => {
    if (value === 0) return "";
    const [integerPart, decimalPart] = value.toString().split(".");
    if (decimalPart) {
      return `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimalPart}`;
    }
    return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseAmount = (value: string) => {
    const cleanValue = value.replace(/\./g, "").replace(",", ".");
    const parsedValue = parseFloat(cleanValue);
    return isNaN(parsedValue) ? 0 : parsedValue;
  };

  const onSubmit = async (data: FormData) => {
    try {
      const selectedIngressAsset = assets?.data.find(
        (a) => a.id === data.ingressAssetId
      );
      const selectedEgressAsset = assets?.data.find(
        (a) => a.id === data.egressAssetId
      );
  
      if (!selectedIngressAsset || !selectedEgressAsset) {
        toast({
          title: "Error",
          description: "Debes seleccionar ambos activos",
          variant: "destructive",
        });
        return;
      }
  
      const body = {
        clientId: initialData?.clientId,
        notes: data.notes || "",
        details: [
          {
            assetId: data.ingressAssetId,
            movementType: "INCOME" as const,
            amount: data.ingressAmount,
            notes: `Ingreso de ${selectedIngressAsset.name}`,
          },
          {
            assetId: data.egressAssetId,
            movementType: "EXPENSE" as const,
            amount: data.egressAmount,
            notes: `Egreso de ${selectedEgressAsset.name}`,
          },
        ],
      };
  
      let response;
      if (initialData && initialData.id) {
        // Actualizar la transacción existente
        response = await api.patch<TransactionResponse>(`transactions/${initialData.id}`, body);
        toast({
          title: "Éxito",
          description: "Transacción actualizada correctamente",
        });
      } else {
        // Crear una nueva transacción
        response = await api.post<TransactionResponse>("transactions", body);
        toast({
          title: "Éxito",
          description: "Transacción creada correctamente",
        });
      }
      onComplete(response.data.data);
  
  
      // Si hay archivos, los subimos en una segunda llamada
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("files", file);
        });
  
        await api.post(`transactions/${response.data.id}/attachments`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear/actualizar la transacción",
        variant: "destructive",
      });
    }
  };
  

  const downloadPdfPreview = async () => {
    try {
      const response = await api.post(
        "operations/preview",
        form.getValues(),
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const reader = new FileReader();
      reader.onload = () => {
        const pdfWindow = window.open("", "_self");
        if (pdfWindow) {
          pdfWindow.document.write(
            `<iframe width='100%' height='100%' src='${reader.result}'></iframe>`
          );
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar la vista previa",
        variant: "destructive",
      });
    }
  };

  if (isLoadingAssets) {
    return <div>Cargando activos...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="ingressAssetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activo de Ingreso *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar activo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assets?.data.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name} ({asset.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ingressAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad de Ingreso *</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      disabled={!form.watch("ingressAssetId")}
                      {...field}
                      value={formatAmount(field.value)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, "");
                        if (value === "") {
                          field.onChange(0);
                          return;
                        }
                        if (value.split(",").length > 2) return;
                        if (value.includes(",")) {
                          const [int, dec] = value.split(",");
                          if (dec && dec.length > 2) return;
                        }
                        const numericValue = parseAmount(value);
                        field.onChange(numericValue);
                      }}
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="egressAssetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activo de Egreso *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar activo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assets?.data.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name} ({asset.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="egressAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad de Egreso *</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      disabled={!form.watch("egressAssetId")}
                      {...field}
                      value={formatAmount(field.value)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, "");
                        if (value === "") {
                          field.onChange(0);
                          return;
                        }
                        if (value.split(",").length > 2) return;
                        if (value.includes(",")) {
                          const [int, dec] = value.split(",");
                          if (dec && dec.length > 2) return;
                        }
                        const numericValue = parseAmount(value);
                        field.onChange(numericValue);
                      }}
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Documentos Requeridos</FormLabel>
          <FileUpload
            value={files}
            onChange={setFiles}
            maxFiles={5}
            maxSize={5 * 1024 * 1024}
            accept={{
              "application/pdf": [".pdf"],
              "image/*": [".png", ".jpg", ".jpeg"],
            }}
          />
        </div>

        <div className="flex justify-between">
          <div className="space-x-2">
            <Button type="button" variant="outline" onClick={downloadPdfPreview}>
              Vista Previa PDF
            </Button>
          </div>
          <Button type="submit">Crear Operación</Button>
        </div>
      </form>
    </Form>
  );
}
