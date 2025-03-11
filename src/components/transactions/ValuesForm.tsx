import { useState } from "react";
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
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/components/ui/use-toast";

interface ValuesFormProps {
  onComplete: (data: FormData) => void;
  initialData?: FormData;
}

const valuesSchema = z.object({
  currencyAmount: z.number({
    required_error: "Debes ingresar un monto",
    invalid_type_error: "Debe ser un número",
  }).positive("El monto debe ser mayor a 0"),
  exchangeRate: z.number({
    required_error: "Debes ingresar una tasa de cambio",
    invalid_type_error: "Debe ser un número",
  }).positive("La tasa debe ser mayor a 0"),
  totalAmount: z.number({
    required_error: "Debes ingresar un monto total",
    invalid_type_error: "Debe ser un número",
  }).positive("El monto debe ser mayor a 0"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof valuesSchema>;

export function ValuesForm({ onComplete, initialData }: ValuesFormProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(valuesSchema),
    defaultValues: initialData || {
      currencyAmount: 0,
      exchangeRate: 0,
      totalAmount: 0,
      notes: "",
    },
  });

  const calculateTotal = (currencyAmount: number, exchangeRate: number) => {
    return currencyAmount * exchangeRate;
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

      await api.post("/values", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "Éxito",
        description: "Valores guardados correctamente",
      });

      onComplete(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los valores",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="currencyAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto en Divisa</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      field.onChange(value);
                      const exchangeRate = form.getValues("exchangeRate");
                      if (exchangeRate) {
                        form.setValue("totalAmount", calculateTotal(value, exchangeRate));
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exchangeRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tasa de Cambio</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      field.onChange(value);
                      const currencyAmount = form.getValues("currencyAmount");
                      if (currencyAmount) {
                        form.setValue("totalAmount", calculateTotal(currencyAmount, value));
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto Total</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    disabled
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            maxSize={5 * 1024 * 1024} // 5MB
            accept={{
              "application/pdf": [".pdf"],
              "image/*": [".png", ".jpg", ".jpeg"],
            }}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit">Guardar Valores</Button>
        </div>
      </form>
    </Form>
  );
} 