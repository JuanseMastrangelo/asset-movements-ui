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
import { CalendarIcon, Printer, Route, MapPin, DollarSign, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect } from "react";
import { CalculateLogisticDto, LogisticData } from "@/models/logistic";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { toast } from 'sonner';
import { Separator } from "@/components/ui/separator";

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
    // Vista de detalles con el nuevo diseño
    return (
      <div className="mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalles de Logística</h1>
            <p className="text-sm text-gray-600 mt-1">Resumen completo del envío y costos asociados</p>
          </div>
          
          <div className="flex-1 max-w-xs">
            <p className="text-sm font-medium text-gray-700 mb-2">Estado del Envío</p>
            <Select defaultValue={logisticDetails.status} onValueChange={updateLogisticStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="IN_PROGRESS">En Proceso</SelectItem>
                <SelectItem value="COMPLETED">Completado</SelectItem>
                <SelectItem value="CANCELED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información de Ruta */}
          <div className="border rounded-lg bg-white">
            <div className="p-4 border-b flex items-center gap-2 text-lg font-semibold">
              <Route className="h-5 w-5 text-blue-600" /> Información de Ruta
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Dirección de Origen</p>
                  <p className="text-sm text-gray-600">{logisticDetails.originAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Dirección de Destino</p>
                  <p className="text-sm text-gray-600">{logisticDetails.destinationAddress}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Distancia Total</p>
                  <p className="text-lg font-semibold text-gray-900">{logisticDetails.distance} km</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Precio por Km</p>
                  <p className="text-lg font-semibold text-gray-900">{logisticDetails.pricePerKm} ARS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Información Financiera */}
          <div className="border rounded-lg bg-white">
            <div className="p-4 border-b flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 text-green-600" /> Información Financiera
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-700">Precio Total</p>
                <p className="text-2xl font-bold text-green-800">${logisticDetails.price} ARS</p>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Responsabilidad de Pago</p>
                  <p className="text-sm text-gray-600">{
                    logisticDetails.paymentResponsibility === "CLIENT"
                      ? "Cliente"
                      : logisticDetails.paymentResponsibility === "SHARED"
                      ? "Compartido"
                      : "Sistema"
                  }</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Fecha de Entrega</p>
                  <p className="text-sm text-gray-600">{format(new Date(logisticDetails.deliveryDate), "PPP", { locale: es })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notas y Estado */}
        <div className="border rounded-lg bg-white">
          <div className="p-4 border-b flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-gray-600" /> Notas y Estado
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Notas Adicionales</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-[60px]">
                <p className="text-sm text-gray-500 italic">{logisticDetails.note || "No hay notas adicionales para este envío"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div></div>
              <div className="flex gap-2">
                <Button className="flex items-center gap-2" variant="outline" onClick={downloadLogisticsTxt}>
                  <Printer className="h-4 w-4" />
                  Imprimir Resumen
                </Button>
                {/* <Button className="flex items-center gap-2" variant="default" onClick={() => setEditMode(true)}>
                  Actualizar
                </Button> */}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Costos */}
        <div className="border-2 border-blue-100 bg-blue-50/30 rounded-lg">
          <div className="p-4 border-b text-lg text-blue-900 font-semibold">Resumen de Costos</div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Distancia</p>
                <p className="text-xl font-bold text-gray-900">{logisticDetails.distance} km</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Tarifa por Km</p>
                <p className="text-xl font-bold text-gray-900">{logisticDetails.pricePerKm} ARS</p>
              </div>
              <div className="text-center p-3 bg-green-100 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">Total a Pagar</p>
                <p className="text-xl font-bold text-green-800">${logisticDetails.price} ARS</p>
              </div>
            </div>
          </div>
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