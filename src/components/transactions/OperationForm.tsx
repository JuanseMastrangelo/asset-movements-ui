import { useState } from "react";
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

interface Asset {
  id: string;
  name: string;
  type: string;
  amount: number;
}

interface OperationFormProps {
  onComplete: (data: FormData) => void;
  initialData?: FormData;
}

const operationSchema = z.object({
  ingressAssetId: z.string({
    required_error: "Debes seleccionar un activo de ingreso",
  }),
  ingressAmount: z.number({
    required_error: "Debes ingresar una cantidad",
    invalid_type_error: "Debe ser un número",
  }).positive("La cantidad debe ser mayor a 0"),
  egressAssetId: z.string({
    required_error: "Debes seleccionar un activo de egreso",
  }),
  egressAmount: z.number({
    required_error: "Debes ingresar una cantidad",
    invalid_type_error: "Debe ser un número",
  }).positive("La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof operationSchema>;

export function OperationForm({ onComplete, initialData }: OperationFormProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(operationSchema),
    defaultValues: initialData || {
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

  const calculateDifferencePercentage = () => {
    const { ingressAmount, egressAmount } = form.getValues();
    if (!ingressAmount || !egressAmount) return 0;
    return ((ingressAmount - egressAmount) / egressAmount) * 100;
  };

  const onSubmit = async (data: FormData) => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
      
      files.forEach((file) => {
        formData.append("files", file);
      });

      await api.post("/operations", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "Éxito",
        description: "Operación creada correctamente",
      });

      onComplete(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la operación",
        variant: "destructive",
      });
    }
  };

  const createTodoItem = async () => {
    try {
      await api.post("/todos", {
        title: "Revisar operación",
        description: form.getValues("notes"),
        dueDate: new Date(),
        priority: "HIGH",
      });

      toast({
        title: "Éxito",
        description: "Tarea creada correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la tarea",
        variant: "destructive",
      });
    }
  };

  const downloadPdfPreview = async () => {
    try {
      const response = await api.post("/operations/preview", form.getValues(), {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "preview.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
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

  const differencePercentage = calculateDifferencePercentage();
  const isHighDifference = Math.abs(differencePercentage) > 10;

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
                  <FormLabel>Activo de Ingreso</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
                  <FormLabel>Cantidad de Ingreso</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                  <FormLabel>Activo de Egreso</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
                  <FormLabel>Cantidad de Egreso</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {differencePercentage !== 0 && (
          <div className={`text-center p-4 rounded-lg ${
            isHighDifference ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}>
            Diferencia: {differencePercentage.toFixed(2)}%
            {isHighDifference && (
              <p className="text-sm mt-1">
                ¡Atención! La diferencia es mayor al 10%
              </p>
            )}
          </div>
        )}

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
            maxSize={5 * 1024 * 1024} // 5MB
            accept={{
              "application/pdf": [".pdf"],
              "image/*": [".png", ".jpg", ".jpeg"],
            }}
          />
        </div>

        <div className="flex justify-between">
          <div className="space-x-2">
            <Button type="button" variant="outline" onClick={createTodoItem}>
              Crear Tarea
            </Button>
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