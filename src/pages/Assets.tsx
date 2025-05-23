import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '../services/api';
import { Asset, CreateAssetDto } from '../models';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';

export default function Assets() {
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<CreateAssetDto>({
    name: '',
    description: '',
    type: 'PHYSICAL',
    isPercentage: false,
    isMtherAccount: false,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', page],
    queryFn: () => assetService.getAll(page),
    retry: 1,
  });

  const totalPages = 1;

  const createMutation = useMutation({
    mutationFn: assetService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsCreateDialogOpen(false);
      setNewAsset({
        name: '',
        description: '',
        type: 'PHYSICAL',
        isPercentage: false,
        isMtherAccount: false,
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? assetService.enable(id) : assetService.disable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newAsset);
  };

  const handleToggleActive = (asset: Asset) => {
    toggleActiveMutation.mutate({ id: asset.id, active: !asset.isActive });
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
        <p className="text-red-500">Error al cargar los activos. Por favor, intente nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Activos</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Nuevo Activo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Activo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newAsset.name}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={newAsset.description}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={newAsset.type}
                  onValueChange={(value: 'PHYSICAL' | 'DIGITAL') =>
                    setNewAsset({ ...newAsset, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHYSICAL">Físico</SelectItem>
                    <SelectItem value="DIGITAL">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPercentage"
                  checked={newAsset.isPercentage}
                  onCheckedChange={(checked: boolean) =>
                    setNewAsset({ ...newAsset, isPercentage: checked })
                  }
                />
                <Label htmlFor="isPercentage">Es Porcentaje</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isMtherAccount"
                  checked={newAsset.isMtherAccount}
                  onCheckedChange={(checked: boolean) =>
                    setNewAsset({ ...newAsset, isMtherAccount: checked })
                  }
                />
                <Label htmlFor="isMtherAccount">Es Cuenta Madre</Label>
              </div>
              <Button type="submit" className="w-full">
                Crear
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Porcentaje</TableHead>
              <TableHead>Cuenta Madre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className='text-right'>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((asset: Asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.description}</TableCell>
                <TableCell>{asset.type === 'PHYSICAL' ? 'Físico' : 'Digital'}</TableCell>
                <TableCell>{asset.isPercentage ? 'Sí' : 'No'}</TableCell>
                <TableCell>{asset.isMtherAccount ? 'Sí' : 'No'}</TableCell>
                <TableCell>
                  <Badge variant={asset.isActive ? "success" : "destructive"}>
                    {asset.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className='text-right'>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(asset)}
                  >
                    {asset.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!isLoading && totalPages > 1 && (
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
            disabled={page >= totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
} 