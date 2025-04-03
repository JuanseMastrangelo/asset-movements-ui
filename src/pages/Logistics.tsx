import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { logisticsService } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CreateLogisticConfigDto, LogisticConfig, LogisticConfigResponse, CalculateLogisticResponse } from '@/models/logistic';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';

interface CalculateLogisticForm {
  originAddress: string;
  destinationAddress: string;
  settingsId: string;
}

export function Logistics() {
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeoDialogOpen, setIsGeoDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<CalculateLogisticResponse | null>(null);
  const { register, handleSubmit, reset } = useForm<CreateLogisticConfigDto>();
  const { register: registerGeo, handleSubmit: handleGeoFormSubmit } = useForm<CalculateLogisticForm>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<LogisticConfig | null>(null);
  const { register: registerEdit, handleSubmit: handleEditFormSubmit, reset: resetEditForm, setValue } = useForm<Partial<CreateLogisticConfigDto>>();

  const { data, isLoading, error, refetch } = useQuery<LogisticConfigResponse>({
    queryKey: ['logistics', page],
    queryFn: async () => {
      const response = await logisticsService.getAll(page);
      return response;
    },
    retry: 1,
  });

  const onSubmit = async (formData: CreateLogisticConfigDto) => {
    try {
      await logisticsService.create(formData);
      toast.success('Configuración creada exitosamente');
      refetch();
      setIsDialogOpen(false);
      reset();
    } catch (error) {
        console.log(error);
    }
  };

  const onGeoSubmit = async (formData: CalculateLogisticForm) => {
    try {
      const result: CalculateLogisticResponse = await logisticsService.calculateLogistic(formData);
      setIsGeoDialogOpen(false);
      setDialogContent(result);
      setIsResultDialogOpen(true);
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = (config: LogisticConfig) => {
    setEditConfig(config);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (formData: Partial<CreateLogisticConfigDto>) => {
    if (editConfig) {
      try {
        const updateData = {
          basePrice: Number(formData.basePrice),
          pricePerKm: Number(formData.pricePerKm),
          isActive: formData.isActive ?? false,
        };

        await logisticsService.updateLogisticConfig(editConfig.id, updateData);
        toast.success('Configuración actualizada exitosamente');
        refetch();
        setEditDialogOpen(false);
        resetEditForm();
      } catch (error) {
        console.log(error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-red-500">Error al cargar las configuraciones de logística. Por favor, intente nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Configuraciones de Logística</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setIsDialogOpen(true)}>Crear Configuración</Button>
          <Button variant="secondary" onClick={() => setIsGeoDialogOpen(true)}>
            <span role="img" aria-label="geolocalización">📍 Calcular Precio</span>
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Configuración de Logística</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="basePrice">Precio Base</Label>
              <Input id="basePrice" type="number" {...register('basePrice', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerKm">Precio por Km</Label>
              <Input id="pricePerKm" type="number" {...register('pricePerKm', { required: true })} />
            </div>
            <div className="flex space-x-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="minDistance">Distancia Mínima</Label>
                <Input id="minDistance" type="number" {...register('minDistance', { required: true })} />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="maxDistance">Distancia Máxima</Label>
                <Input id="maxDistance" type="number" {...register('maxDistance', { required: true })} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isActive" {...register('isActive')} />
              <Label htmlFor="isActive">Activo</Label>
            </div>
            <Button type="submit" className="w-full">Crear</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isGeoDialogOpen} onOpenChange={setIsGeoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calcular Logística</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGeoFormSubmit(onGeoSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="originAddress">Dirección de Origen</label>
              <Input id="originAddress" {...registerGeo('originAddress', { required: true })} />
            </div>
            <div className="space-y-2">
              <label htmlFor="destinationAddress">Dirección de Destino</label>
              <Input id="destinationAddress" {...registerGeo('destinationAddress', { required: true })} />
            </div>
            <div className="space-y-2">
              <label htmlFor="settingsId">Configuración de Logística</label>
              <Select onValueChange={(value) => registerGeo('settingsId').onChange({ target: { value } })}>
                <SelectTrigger id="settingsId" aria-label="Configuración de Logística">
                  <SelectValue placeholder="Selecciona una configuración" />
                </SelectTrigger>
                <SelectContent>
                  {data?.data.map((config: LogisticConfig) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Calcular</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumen del Cálculo de Logística</DialogTitle>
          </DialogHeader>
          {dialogContent && (
            <div className="space-y-2">
              <p><strong>Dirección de Origen:</strong> {dialogContent.data.originAddress}</p>
              <p><strong>Dirección de Destino:</strong> {dialogContent.data.destinationAddress}</p>
              <p><strong>Distancia:</strong> {dialogContent.data.distance} km</p>
              <p><strong>Precio Base:</strong> {dialogContent.data.basePrice}</p>
              <p><strong>Precio por Km:</strong> {dialogContent.data.pricePerKm}</p>
              <p><strong>Precio Total:</strong> {dialogContent.data.totalPrice}</p>
              <p><strong>Configuración Usada:</strong> {dialogContent.data.settingsUsed.name}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración de Logística</DialogTitle>
          </DialogHeader>
          {editConfig && (
            <form onSubmit={handleEditFormSubmit(handleEditSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Precio Base</Label>
                <Input
                  id="basePrice"
                  type="number"
                  defaultValue={editConfig.basePrice}
                  {...registerEdit('basePrice', { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerKm">Precio por Km</Label>
                <Input
                  id="pricePerKm"
                  type="number"
                  defaultValue={editConfig.pricePerKm}
                  {...registerEdit('pricePerKm', { required: true })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  defaultChecked={editConfig.isActive}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
                <Label htmlFor="isActive">Activo</Label>
              </div>
              <Button type="submit" className="w-full">Guardar Cambios</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="border rounded-md overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio Base</TableHead>
              <TableHead>Precio por Km</TableHead>
              <TableHead>Distancia Mínima</TableHead>
              <TableHead>Distancia Máxima</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((config: LogisticConfig) => (
              <TableRow key={config.id}>
                <TableCell>{config.name}</TableCell>
                <TableCell>{config.basePrice}</TableCell>
                <TableCell>{config.pricePerKm}</TableCell>
                <TableCell>{config.minDistance}</TableCell>
                <TableCell>{config.maxDistance}</TableCell>
                <TableCell>{config.isActive ? 'Activo' : 'Inactivo'}</TableCell>
                <TableCell>
                  <Button variant="outline" onClick={() => handleEdit(config)}>Editar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.data.length}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
} 