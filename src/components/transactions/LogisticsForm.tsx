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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

interface LogisticsFormProps {
  onComplete: (data: FormData) => void;
  initialData?: FormData;
}

const logisticsSchema = z.object({
  deliveryDate: z.date({
    required_error: "Debes seleccionar una fecha de entrega",
  }),
  address: z.string({
    required_error: "Debes ingresar una dirección",
  }).min(10, "La dirección debe tener al menos 10 caracteres"),
  method: z.string({
    required_error: "Debes seleccionar un método de entrega",
  }),
  contactName: z.string({
    required_error: "Debes ingresar un nombre de contacto",
  }).min(3, "El nombre debe tener al menos 3 caracteres"),
  contactPhone: z.string({
    required_error: "Debes ingresar un teléfono de contacto",
  }).regex(/^\+?[0-9]{10,}$/, "Ingresa un número de teléfono válido"),
  specialInstructions: z.string().optional(),
});

type FormData = z.infer<typeof logisticsSchema>;

const deliveryMethods = [
  { id: "pickup", name: "Retiro en sucursal" },
  { id: "delivery", name: "Entrega a domicilio" },
  { id: "courier", name: "Envío por courier" },
];

export function LogisticsForm({ onComplete, initialData }: LogisticsFormProps) {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(logisticsSchema),
    defaultValues: initialData || {
      deliveryDate: new Date(),
      address: "",
      method: "",
      contactName: "",
      contactPhone: "",
      specialInstructions: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/logistics", data);
      
      toast({
        title: "Éxito",
        description: "Información logística guardada correctamente",
      });

      onComplete(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la información logística",
        variant: "destructive",
      });
    }
  };

  const downloadPdfPreview = async () => {
    try {
      const response = await api.post("/logistics/preview", form.getValues(), {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "logistics-preview.pdf");
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="deliveryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Entrega</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={`w-full pl-3 text-left font-normal ${
                        !field.value && "text-muted-foreground"
                      }`}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date > new Date().setMonth(new Date().getMonth() + 3)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Entrega</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {deliveryMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
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
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección de Entrega</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de Contacto</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono de Contacto</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" placeholder="+54..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specialInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instrucciones Especiales</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={downloadPdfPreview}>
            Vista Previa PDF
          </Button>
          <Button type="submit">Guardar Información</Button>
        </div>
      </form>
    </Form>
  );
} 