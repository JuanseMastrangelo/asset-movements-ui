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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Transaction, TransactionResponse } from "@/models/transaction";
import { useNavigate, useParams } from "react-router-dom";
import { transactionsService } from "@/services/api";
import { Spinner } from "@/components/ui/spinner";
import { AmountSelectInput } from "@/components/ui/amount-select-input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Client } from "@/models";

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
  client: Client | undefined;
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

export function OperationForm({ onComplete, client }: OperationFormProps) {
  const { id } = useParams<{ id: string }>();
  // const [files, setFiles] = useState<File[]>([]);
  const [percentageChange, setPercentageChange] = useState<string>("");
  const [filteredEgressAssets, setFilteredEgressAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isReadonly, setIsReadonly] = useState<boolean>(false);
  const navigate = useNavigate();
  // const [showAsPercentage, setShowAsPercentage] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<string>("1");
  const [reverseExchangeRate, setReverseExchangeRate] = useState<string>("1");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
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
          setTransaction(transaction);
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

  // Utilidad para mostrar cotización de forma legible
  function formatRate(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(6).replace(/\.0+$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
  }

  useEffect(() => {
    const ingressAmount = form.watch("ingressAmount");
    const egressAmount = form.watch("egressAmount");
    // Calcular porcentaje
    if (ingressAmount && egressAmount) {
      const percentage = (egressAmount / ingressAmount) * 100;
      setPercentageChange(Number.isInteger(percentage) ? percentage.toString() : percentage.toFixed(2));
      // Calcular cotización directa e inversa
      setExchangeRate(formatRate(egressAmount / ingressAmount));
      setReverseExchangeRate(formatRate(ingressAmount / egressAmount));
    } else {
      setPercentageChange("");
      setExchangeRate("1");
      setReverseExchangeRate("1");
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

  const parseAmount = (value: string) => {
    const cleanValue = value.replace(",", ".");
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
        clientId: !id ? client?.id : null,
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
      // if (files.length > 0) {
      //   const formData = new FormData();
      //   files.forEach((file) => {
      //     formData.append("files", file);
      //   });
  
      //   await api.post(`transactions/${response.data.data.id}/attachments`, formData, {
      //     headers: {
      //       "Content-Type": "multipart/form-data",
      //     },
      //   });
      // }
    } catch (error) {
      toast.error("No se pudo crear/actualizar la transacción");
    }
  };
  

  // const downloadPdfPreview = async () => {
  //   try {
  //     const response = await api.post(
  //       "operations/preview",
  //       form.getValues(),
  //       { responseType: "blob" }
  //     );

  //     const blob = new Blob([response.data], { type: "application/pdf" });
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       const pdfWindow = window.open("", "_self");
  //       if (pdfWindow) {
  //         pdfWindow.document.write(
  //           `<iframe width='100%' height='100%' src='${reader.result}'></iframe>`
  //         );
  //       }
  //     };
  //     reader.readAsDataURL(blob);
  //   } catch (error) {
  //     toast.error("No se pudo generar la vista previa");
  //   }
  // };

  // Verificar si al menos un activo seleccionado tiene isPercentage como true
  // const showPercentageField = () => {
  //   const selectedIngressAsset = assets?.data.find(asset => asset.id === form.watch("ingressAssetId"));
  //   const selectedEgressAsset = assets?.data.find(asset => asset.id === form.watch("egressAssetId"));
  //   return selectedIngressAsset?.isPercentage || selectedEgressAsset?.isPercentage;
  // };

  // Obtener el nombre del activo de egreso seleccionado
  const selectedEgressAssetName = assets?.data.find(asset => asset.id === form.watch("egressAssetId"))?.name || "";
  const selectedIngressAssetName = assets?.data.find(asset => asset.id === form.watch("ingressAssetId"))?.name || "";

  // Calcular la cotización entre el activo de ingreso y el activo de egreso
  // const calculateExchangeRate = () => {
  //   const ingressAmount = form.watch("ingressAmount");
  //   const egressAmount = form.watch("egressAmount");
  //   if (ingressAmount && egressAmount) {
  //     return (egressAmount / ingressAmount).toFixed(2);
  //   }
  //   return "0.00";
  // };

  if (isLoadingAssets || isLoadingRules || loading) {
    return <Spinner />;
  }

  return (
    <>
    {
      <div className="mb-4 text-sm border-b pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`https://avatar.vercel.sh/${client? client.email : transaction?.client.email}`} alt="Cliente" />
            <AvatarFallback>{client? client.name.split(' ').map(n => n[0]).join('').toUpperCase() : transaction?.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold">{client? client.name : transaction?.client.name}</span>
            <span className="text-muted-foreground">{client? client.email : transaction?.client.email}</span>
          </div>
        </div>
      </div>
    }
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="ingressAmount"
              render={() => (
                <FormItem>
                  <FormLabel>Activo de Ingreso *</FormLabel>
                  <FormControl>
                    <AmountSelectInput
                      amount={form.watch('ingressAmount') === 0 ? "" : form.watch('ingressAmount')}
                      onAmountChange={(value) => {
                        const parsed = parseAmount(value);
                        form.setValue('ingressAmount', parsed);
                      }}
                      options={assets?.data.map((asset) => ({ value: asset.id, label: `${asset.name} (${asset.type})` })) || []}
                      selected={form.watch('ingressAssetId')}
                      onSelectChange={(value) => {
                        form.setValue('ingressAssetId', value);
                      }}
                      placeholderAmount="Cantidad"
                      placeholderSelect="Seleccionar activo"
                      disabled={isReadonly}
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
              name="egressAmount"
              render={() => (
                <FormItem>
                  <FormLabel>Activo de Egreso *</FormLabel>
                  <FormControl>
                    <AmountSelectInput
                      amount={form.watch('egressAmount') === 0 ? "" : form.watch('egressAmount')}
                      onAmountChange={(value) => {
                        const parsed = parseAmount(value);
                        form.setValue('egressAmount', parsed);
                      }}
                      options={filteredEgressAssets.map((asset) => ({ value: asset.id, label: `${asset.name} (${asset.type})` }))}
                      selected={form.watch('egressAssetId')}
                      onSelectChange={(value) => {
                        form.setValue('egressAssetId', value);
                      }}
                      placeholderAmount="Cantidad"
                      placeholderSelect="Seleccionar activo"
                      disabled={isReadonly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {(form.watch('ingressAssetId') && form.watch('egressAssetId') && form.watch('ingressAmount') > 0 && form.watch('egressAmount') > 0) && (
            <>
            {/* <div className="flex justify-center mt-2 col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="toggle-percentage"
                  checked={showAsPercentage}
                  onCheckedChange={(checked) => setShowAsPercentage(!!checked)}
                  disabled
                />
                <label htmlFor="toggle-percentage" className="select-none cursor-pointer">
                  {form.watch('egressAmount') > form.watch('ingressAmount')
                    ? 'Mostrar como porcentaje de pérdida'
                    : form.watch('egressAmount') < form.watch('ingressAmount')
                    ? 'Mostrar como porcentaje de ganancia'
                    : 'Mostrar como porcentaje'}
                </label>
              </div>
            </div> */}
            
          {false ? (
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
                  step="0.01"
                  disabled={isReadonly}
                />
                <span>% de ganancia</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center mt-2 col-span-2 gap-2">
              <div className="flex flex-row items-center justify-center gap-2">
                <span>1 {selectedEgressAssetName} =</span>
                <span className="w-24 text-center font-mono bg-muted rounded px-2 py-1 select-text">
                  {exchangeRate}
                </span>
                <span>{selectedIngressAssetName}</span>
              </div>
              <div className="flex flex-row items-center justify-center gap-2">
                <span>1 {selectedIngressAssetName} =</span>
                <span className="w-24 text-center font-mono bg-muted rounded px-2 py-1 select-text">
                  {reverseExchangeRate}
                </span>
                <span>{selectedEgressAssetName}</span>
              </div>
            </div>
          )}
            </>
          )}
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

        <div className="flex justify-between">
          <div className="space-x-2">
            {/* <Button type="button" variant="outline" onClick={downloadPdfPreview} disabled={isReadonly}>
              Vista Previa PDF
            </Button> */}
          </div>
          <Button type="submit" onClick={(e) => { if (isReadonly) { e.preventDefault(); onComplete({} as Transaction); } }}>
            {isReadonly ? "Siguiente" : "Cargar Operación"}
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}
