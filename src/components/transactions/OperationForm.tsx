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
import { toast } from "sonner";
import { Transaction, TransactionResponse } from "@/models/transaction";
import { useNavigate, useParams } from "react-router-dom";
import { transactionsService } from "@/services/api";
import { Spinner } from "@/components/ui/spinner";

interface Asset {
  id: string;
  name: string;
  type: string;
  amount: number;
  isPercentage?: boolean;
}

interface TransactionRule {
  sourceAssetId: string;
  targetAssetId: string;
}

interface OperationFormProps {
  clientId: string | undefined;
  onComplete: (data: Transaction) => void;
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

export function OperationForm({ onComplete, clientId }: OperationFormProps) {
  const { id } = useParams<{ id: string }>();
  const [files, setFiles] = useState<File[]>([]);
  const [percentageChange, setPercentageChange] = useState<string>("");
  const [filteredEgressAssets, setFilteredEgressAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isReadonly, setIsReadonly] = useState<boolean>(false);
  const navigate = useNavigate();

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
        toast.error("No se pudieron cargar los activos");
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: rulesData, isLoading: isLoadingRules } = useQuery({
    queryKey: ["transaction-rules"],
    queryFn: async () => {
      try {
        const response = await api.get<{ data: TransactionRule[] }>("/transaction-rules");
        return response.data;
      } catch (error) {
        toast.error("No se pudieron cargar las reglas de transacción");
        throw error;
      }
    },
  });

  useEffect(() => {
    const loadTransaction = async () => {
      setLoading(true);
      if (id && assets) {
        try {
          const transaction = await transactionsService.getOne(id);
          form.reset({
            ingressAssetId: transaction.details.find(d => d.movementType === "INCOME")?.assetId || "",
            ingressAmount: transaction.details.find(d => d.movementType === "INCOME")?.amount || 0,
            egressAssetId: transaction.details.find(d => d.movementType === "EXPENSE")?.assetId || "",
            egressAmount: transaction.details.find(d => d.movementType === "EXPENSE")?.amount || 0,
            notes: transaction.notes || "",
          });
          if (transaction.state !== "PENDING") {
            setIsReadonly(true);
          }
          setLoading(false);
        } catch (error) {
          toast.error("No se pudo cargar la transacción");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    loadTransaction();
  }, [id, assets]);

  useEffect(() => {
    if (form.watch("ingressAmount") && form.watch("egressAmount")) {
      const percentage = (form.watch("egressAmount") / form.watch("ingressAmount") * 100);
      // Si el número es entero, no mostrar decimales
      setPercentageChange(Number.isInteger(percentage) ? percentage.toString() : percentage.toFixed(2));
    }
  }, [form.watch("ingressAmount"), form.watch("egressAmount")]);

  useEffect(() => {
    const selectedIngressAssetId = form.watch("ingressAssetId");
    if (selectedIngressAssetId && rulesData) {
      const validEgressAssets = rulesData.data
        .filter(rule => rule.sourceAssetId === selectedIngressAssetId)
        .map(rule => rule.targetAssetId);
      setFilteredEgressAssets(assets?.data.filter(asset => validEgressAssets.includes(asset.id)) || []);
    } else {
      setFilteredEgressAssets([]);
    }
  }, [form.watch("ingressAssetId"), rulesData, assets]);

  const updateEgressFromPercentage = (percentage: string) => {
    const ingressAmount = form.watch("ingressAmount");
    if (ingressAmount && !isNaN(parseFloat(percentage))) {
      const newEgressAmount = (ingressAmount * parseFloat(percentage) / 100);
      form.setValue("egressAmount", newEgressAmount);
    }
  };

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
        toast.error("Debes seleccionar ambos activos");
        return;
      }
      const body = {
        clientId: !id ? clientId : null,
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
      if (id) {
        // Actualizar la transacción existente
        response = await api.patch<TransactionResponse>(`transactions/${id}`, body);
        toast.success("Transacción actualizada correctamente");
      } else {
        // Crear una nueva transacción
        response = await api.post<TransactionResponse>("transactions", body);
        toast.success("Transacción creada correctamente");
        navigate(`/transactions/${response.data.data.id}?step=values`);
      }
      onComplete(response.data.data);
  
  
      // Si hay archivos, los subimos en una segunda llamada
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("files", file);
        });
  
        await api.post(`transactions/${response.data.data.id}/attachments`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }
    } catch (error) {
      toast.error("No se pudo crear/actualizar la transacción");
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
      toast.error("No se pudo generar la vista previa");
    }
  };

  // Verificar si al menos un activo seleccionado tiene isPercentage como true
  const showPercentageField = () => {
    const selectedIngressAsset = assets?.data.find(asset => asset.id === form.watch("ingressAssetId"));
    const selectedEgressAsset = assets?.data.find(asset => asset.id === form.watch("egressAssetId"));
    return selectedIngressAsset?.isPercentage || selectedEgressAsset?.isPercentage;
  };

  // Obtener el nombre del activo de egreso seleccionado
  const selectedEgressAssetName = assets?.data.find(asset => asset.id === form.watch("egressAssetId"))?.name || "";
  const selectedIngressAssetName = assets?.data.find(asset => asset.id === form.watch("ingressAssetId"))?.name || "";

  // Calcular la cotización entre el activo de ingreso y el activo de egreso
  const calculateExchangeRate = () => {
    const ingressAmount = form.watch("ingressAmount");
    const egressAmount = form.watch("egressAmount");
    if (ingressAmount && egressAmount) {
      return (egressAmount / ingressAmount).toFixed(2);
    }
    return "0.00";
  };

  if (isLoadingAssets || isLoadingRules || loading) {
    return <Spinner />;
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadonly}>
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
                      disabled={isReadonly}
                      {...field}
                      value={formatAmount(field.value)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^-\d,]+/g, "");
                        if (value === "") {
                          field.onChange(0);
                          return;
                        }
                        if (value.split(",").length > 2) return;
                        if (value.includes(",")) {
                          const [_, dec] = value.split(",");
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadonly}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar activo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredEgressAssets.map((asset) => (
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
                      disabled={isReadonly}
                      {...field}
                      value={formatAmount(field.value)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^-\d,]+/g, "");
                        if (value === "") {
                          field.onChange(0);
                          return;
                        }
                        if (value.split(",").length > 2) return;
                        if (value.includes(",")) {
                          const [_, dec] = value.split(",");
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
          {
            selectedEgressAssetName && selectedIngressAssetName && (
              <>
              
          {showPercentageField() ? (
            <div className="flex justify-center mt-2 col-span-2">
              <div className="flex items-center justify-center space-x-2 w-full">
                <Input
                  type="number"
                  value={percentageChange}
                  onChange={(e) => {
                    setPercentageChange(e.target.value);
                    updateEgressFromPercentage(e.target.value);
                  }}
                  className="w-20 text-center"
                  min="0"
                  step="1"
                  disabled={isReadonly}
                />
                <span>%</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mt-2 col-span-2">
              <div className="flex flex-row items-center">
                <div className="w-auto">
                  1 {selectedIngressAssetName} =
                </div> 
                <div className="flex items-center justify-center space-x-2 w-full">
                  <Input
                    type="text"
                    value={calculateExchangeRate()}
                    className="w-20 text-center"
                    disabled
                  />
                  <span>{selectedEgressAssetName}</span>
                </div>
              </div>
            </div>
          )}
              </>
            )
          }
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isReadonly} />
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
            <Button type="button" variant="outline" onClick={downloadPdfPreview} disabled={isReadonly}>
              Vista Previa PDF
            </Button>
          </div>
          <Button type="submit" onClick={(e) => { if (isReadonly) { e.preventDefault(); onComplete({} as Transaction); } }}>
            {isReadonly ? "Siguiente" : "Guardar Operación"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
