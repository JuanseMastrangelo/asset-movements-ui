import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api, transactionsService } from "@/services/api";
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
import { CalendarIcon, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect } from "react";
import { CalculateLogisticDto, LogisticData } from "@/models/logistic";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { toast } from 'sonner';
import { Badge } from "../ui/badge";

const logisticsSchema = z.object({
  deliveryDate: z.date().optional(),
  address: z.string().min(10, "La dirección debe tener al menos 10 caracteres"),
  destinationAddress: z.string().min(10, "La dirección de destino debe tener al menos 10 caracteres"),
  contactName: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  contactPhone: z.string().regex(/^\+?[0-9]{10,}$/, "Ingresa un número de teléfono válido"),
  specialInstructions: z.string().optional(),
  paymentOption: z.enum(["CLIENT", "SHARED", "SYSTEM"]),
  logisticService: z.string(),
  price: z.number().optional(),
});

type FormData = z.infer<typeof logisticsSchema>;

export function LogisticsForm() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [logisticServices, setLogisticServices] = useState<Array<{ id: string; name: string }>>([]);
  const [logisticDetails, setLogisticDetails] = useState<LogisticData | null>(null);
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
  const [isLinkButtonEnabled, setIsLinkButtonEnabled] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    // Obtener servicios de logística
    const fetchLogisticServices = async () => {
      try {
        const response = await api.get("/logistics/settings");
        setLogisticServices(response.data.data);
      } catch (error) {
      }
    };

    fetchLogisticServices();
  }, []);

  useEffect(() => {
    const { address, destinationAddress, logisticService } = form.getValues();
    setIsPriceButtonEnabled(!!address && !!destinationAddress && !!logisticService);
  }, [form.watch("address"), form.watch("destinationAddress"), form.watch("logisticService")]);

  useEffect(() => {
    if (id && user) {
      // Obtener la transacción por ID
      const fetchTransaction = async () => {
        try {
          const transaction = await transactionsService.getOne(id);
          form.setValue("destinationAddress", transaction.client.address || ""); // Rellenar Dirección de Destino

          // Obtener la dirección del usuario
          // const userData = await usersService.getById(user.id);
          // form.setValue("address", userData.address || ""); // Rellenar Dirección de Origen
        } catch (error) {
        }
      };

      fetchTransaction();
    }
  }, [id, user]);

  useEffect(() => {
    if (id) {
      // Verificar si ya existe logística
      checkLogistic();
    }
  }, [id]);


  const checkLogistic = async () => {
    try {
      const logisticData = await transactionsService.getLogistic(id!);
      setLogisticDetails(logisticData.data);
    } catch (error) {
      setLogisticDetails(null); // Si no existe, continuar con el formulario
    }
  };

  const calculatePrice = async () => {
    setIsCalculating(true);
    try {
      const data: CalculateLogisticDto = {
        originAddress: form.getValues("address"),
        destinationAddress: form.getValues("destinationAddress"),
        settingsId: form.getValues("logisticService"),
      };

      const response = await api.post('/logistics/calculate', data);
      setPrice(response.data.data.totalPrice);
      setIsPriceButtonEnabled(false);
      setIsLinkButtonEnabled(true);
    } catch (error) {
      console.log(error);
      setIsLinkButtonEnabled(false);
    } finally {
      setIsCalculating(false);
    }
  };

  const downloadLogisticsTxt = () => {
    if (!logisticDetails) return;

    const content = `
      Dirección de Origen: ${logisticDetails.originAddress}
      Dirección de Destino: ${logisticDetails.destinationAddress}
      Fecha de Entrega: ${logisticDetails.deliveryDate ? format(new Date(logisticDetails.deliveryDate), "PPP", { locale: es }) : "No especificada"}
      Nota: ${logisticDetails.note || "Ninguna"}
      Método de Pago: ${logisticDetails.paymentResponsibility === "CLIENT" ? "Cliente" : logisticDetails.paymentResponsibility === "SHARED" ? "Compartido" : "Sistema"}
      Precio: $${logisticDetails.price} ARS
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

  const linkLogisticsToTransaction = async () => {
    if (!id) return;

    const formData = form.getValues();
    const logisticData = {
      transactionId: id,
      originAddress: formData.address,
      destinationAddress: formData.destinationAddress,
      deliveryDate: formData.deliveryDate ? formData.deliveryDate.toISOString() : new Date().toISOString(),
      note: formData.specialInstructions || "",
      paymentResponsibility: formData.paymentOption,
      status: "PENDING",
    };

    try {
      await transactionsService.createLogistic(logisticData);
      toast.success("Logística vinculada a la transacción correctamente");
    } catch (error) {
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/logistics", data);
      toast.success("Información logística guardada correctamente");
    } catch (error) {
    }
  };

  const updateLogisticStatus = async (newStatus: string) => {
    try {
      await transactionsService.updateLogisticStatus(logisticDetails!.id!, newStatus);
      toast.success("Estado actualizado correctamente");
      checkLogistic();
    } catch (error) {
    }
  };


  if (!id) {
    return <div>No se encontró la transacción</div>;
  }

  if (logisticDetails) {
    // Mostrar detalles de logística si ya existe
    return (
      <div className="p-6 ">
        <h2 className="text-2xl font-bold mb-4">Detalles de Logística</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="pb-2 flex justify-between"><strong className="font-semibold">Dirección de Origen:</strong> <span>{logisticDetails.originAddress}</span></div>
          <div className="pb-2 flex justify-between"><strong className="font-semibold">Dirección de Destino:</strong> <span>{logisticDetails.destinationAddress}</span></div>
          <div className="pb-2 flex justify-between"><strong className="font-semibold">Distancia:</strong> <span>{logisticDetails.distance} km</span></div>
          <div className="pb-2 flex justify-between"><strong className="font-semibold text-lg">Precio:</strong> <span className="text-lg text-green-600 font-bold">$ {logisticDetails.price} ARS</span></div>
          <div className="pb-2 flex justify-between"><strong className="font-semibold">Precio por Km:</strong> <span>{logisticDetails.pricePerKm} ARS</span></div>
          <div className="pb-2 flex justify-between"><strong className="font-semibold">Fecha de Entrega:</strong> <span>{format(new Date(logisticDetails.deliveryDate), "PPP", { locale: es })}</span></div>
          <div className="pb-2 flex justify-between"><strong className="font-semibold">Nota:</strong> <span>{logisticDetails.note}</span></div>
          <div className="pb-2 flex justify-between"><strong className="font-semibold">Responsabilidad de Pago:</strong> 
            <span>{logisticDetails.paymentResponsibility === "CLIENT" ? "Cliente" : logisticDetails.paymentResponsibility === "SHARED" ? "Compartido" : "Sistema"}</span>
          </div>
          <div className="pb-2 flex justify-between items-center"><strong className="font-semibold">Estado:</strong> 
            <Badge variant={logisticDetails.status === "PENDING" ? "default" : logisticDetails.status === "IN_PROGRESS" ? "secondary" : logisticDetails.status === "COMPLETED" ? "success" : "destructive"}>
              {logisticDetails.status === "PENDING" ? "Pendiente" : logisticDetails.status === "IN_PROGRESS" ? "En Progreso" : logisticDetails.status === "COMPLETED" ? "Completado" : "Cancelado"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-4 flex-row justify-between mt-5">
          <div className="flex items-center gap-2">
            Estado: 
          <Select
            defaultValue={logisticDetails.status}
            onValueChange={(newStatus) => updateLogisticStatus(newStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
              <SelectItem value="COMPLETED">Completado</SelectItem>
              <SelectItem value="CANCELED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          </div>
          <Button variant="default" onClick={downloadLogisticsTxt}><Printer className="w-4 h-4 mr-2" />Imprimir resumen</Button>
        </div>
      </div>
    );
  }

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
                      date < new Date(new Date().setHours(0, 0, 0, 0)) || date > new Date(new Date().setMonth(new Date().getMonth() + 3))
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
                  <SelectItem value="CLIENT">Cliente</SelectItem>
                  <SelectItem value="SHARED">Compartido</SelectItem>
                  <SelectItem value="SYSTEM">Sistema</SelectItem>
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
            {isCalculating ? "Calculando..." : "Calcular Precio"}
          </Button>
          {isCalculating && <Spinner />}
          <div className="flex items-center">
            <span className="mr-2">ARS$</span>
            <Input value={price || ""} readOnly placeholder="Precio calculado" className="w-2/3" />
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
          <Button type="button" onClick={linkLogisticsToTransaction} disabled={!isLinkButtonEnabled}>
            Vincular Logística a Transacción
          </Button>
        </div>
      </form>
    </Form>
  );
} 