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
import { useState, useEffect } from "react";
import { CalculateLogisticDto } from "@/models/logistic";

interface LogisticsFormProps {
  transactionId: string;
}

const logisticsSchema = z.object({
  deliveryDate: z.date().optional(),
  address: z.string().min(10, "La dirección debe tener al menos 10 caracteres"),
  destinationAddress: z.string().min(10, "La dirección de destino debe tener al menos 10 caracteres"),
  contactName: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  contactPhone: z.string().regex(/^\+?[0-9]{10,}$/, "Ingresa un número de teléfono válido"),
  specialInstructions: z.string().optional(),
  paymentOption: z.enum(["Paga Cliente", "A medias", "Pagamos nosotros"]),
  logisticService: z.string(),
  price: z.number().optional(),
});

type FormData = z.infer<typeof logisticsSchema>;

export function LogisticsForm({}: LogisticsFormProps) {
  const { toast } = useToast();
  const [logisticServices, setLogisticServices] = useState<Array<{ id: string; name: string }>>([]);
  const form = useForm<FormData>({
    resolver: zodResolver(logisticsSchema),
    defaultValues: {
      deliveryDate: new Date(),
      address: "",
      contactName: "",
      contactPhone: "",
      specialInstructions: "",
    },
  });

  const [price, setPrice] = useState<number | null>(null);
  const [isPriceButtonEnabled, setIsPriceButtonEnabled] = useState(false);

  useEffect(() => {
    // Obtener servicios de logística
    const fetchLogisticServices = async () => {
      try {
        const response = await api.get("/logistics/settings");
        setLogisticServices(response.data.data);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los servicios de logística",
          variant: "destructive",
        });
      }
    };

    fetchLogisticServices();
  }, []);

  useEffect(() => {
    const { address, destinationAddress, logisticService } = form.getValues();
    setIsPriceButtonEnabled(!!address && !!destinationAddress && !!logisticService);
  }, [form.watch("address"), form.watch("destinationAddress"), form.watch("logisticService")]);

  const calculatePrice = async () => {
    try {
      const data: CalculateLogisticDto = {
        originAddress: form.getValues("address"),
        destinationAddress: form.getValues("destinationAddress"),
        settingsId: form.getValues("logisticService"),
      };

      const response = await api.post('/logistics/calculate', data);
      setPrice(response.data.data.totalPrice);
      setIsPriceButtonEnabled(false);
    } catch (error) {
      console.log(error)
    }
  };

  const downloadLogisticsTxt = () => {
    const data = form.getValues();
    const content = `
      Dirección de Origen: ${data.address}
      Dirección de Destino: ${data.destinationAddress}
      Fecha de Entrega: ${data.deliveryDate ? format(data.deliveryDate, "PPP", { locale: es }) : "No especificada"}
      Nota: ${data.specialInstructions || "Ninguna"}
      Método de Pago: ${data.paymentOption}
      Servicio de Logística: ${data.logisticService}
      Precio: ${price}
    `;
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "logistics-info.txt");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/logistics", data);
      
      toast({
        title: "Éxito",
        description: "Información logística guardada correctamente",
      });

      // Aquí puedes manejar la finalización del formulario
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la información logística",
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
                      date < new Date() || date > new Date(new Date().setMonth(new Date().getMonth() + 3))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección de Origen</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="destinationAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección de Destino</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="paymentOption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opción de Pago</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar opción" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Paga Cliente">Paga Cliente</SelectItem>
                  <SelectItem value="A medias">A medias</SelectItem>
                  <SelectItem value="Pagamos nosotros">Pagamos nosotros</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logisticService"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Servicio de Logística</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {logisticServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-4">
          <Button type="button" onClick={calculatePrice} disabled={!isPriceButtonEnabled}>
            Calcular Precio
          </Button>
          <div className="flex items-center">
            <span className="mr-2">ARS$</span>
            <Input value={price || ""} readOnly placeholder="Precio calculado" className="w-1/2" />
          </div>
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
        <div className="flex gap-4 flex-row justify-end">
          <Button type="button" onClick={downloadLogisticsTxt} disabled={!price}>
            Imprimir Logística
          </Button>
          <Button type="submit" variant="outline">Finalizar</Button>
        </div>
      </form>
    </Form>
  );
} 