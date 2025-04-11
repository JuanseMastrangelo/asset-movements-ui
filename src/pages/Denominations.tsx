import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '../components/ui/badge';
import { denominationsService, assetService } from '@/services/api';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function Denominations() {
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDenomination, setNewDenomination] = useState({
    assetId: '',
    value: 0,
    isActive: true,
  });
  const [editingDenomination, setEditingDenomination] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [denominationToDelete, setDenominationToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  const { data: assetsData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetService.getAll(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['denominations', page],
    queryFn: () => denominationsService.getAll(),
    retry: 1,
  });

  const filteredDenominations = useMemo(() => {
    if (!data) return [];
    return data.filter((denomination) =>
      denomination.asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const createMutation = useMutation({
    mutationFn: denominationsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['denominations'] });
      setIsCreateDialogOpen(false);
      setNewDenomination({
        assetId: '',
        value: 0,
        isActive: true,
      });
      toast.success('Denominación creada correctamente');
    },
  });

  const editMutation = useMutation({
    mutationFn: (data) =>
      denominationsService.update(data.id, {
        assetId: data.assetId,
        value: data.value,
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['denominations'] });
      setIsEditDialogOpen(false);
      setEditingDenomination(null);
      toast.success('Denominación actualizada correctamente');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (denominationId) => denominationsService.delete(denominationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['denominations'] });
      setIsDeleteDialogOpen(false);
      setDenominationToDelete(null);
      toast.success('Denominación eliminada correctamente');
    },
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    createMutation.mutate(newDenomination);
  };

  const handleEdit = (denomination) => {
    setEditingDenomination(denomination);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editingDenomination) {
      editMutation.mutate(editingDenomination);
    }
  };

  const handleDelete = (denomination) => {
    setDenominationToDelete(denomination);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (denominationToDelete) {
      deleteMutation.mutate(denominationToDelete.id);
    }
  };

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-red-500">
          Error al cargar las denominaciones. Por favor, intente nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Denominaciones</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Nueva Denominación</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Denominación</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assetId">Activo</Label>
                <Select
                  value={newDenomination.assetId}
                  onValueChange={(value) => setNewDenomination({ ...newDenomination, assetId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Activo" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetsData?.data.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor</Label>
                <Input
                  id="value"
                  type="number"
                  value={newDenomination.value}
                  onChange={(e) =>
                    setNewDenomination({ ...newDenomination, value: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Crear
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center">
        <Input
          type="text"
          placeholder="Buscar denominación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>

      {isLoading || isLoadingAssets ? (
        <div className="flex items-center justify-center gap-3 py-7 border">
          <Spinner size='sm' /> Cargando denominaciones...
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Activo</TableHead>
                <TableHead>Tipo del Activo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className='text-right'>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDenominations.map((denomination) => (
                <TableRow key={denomination.id}>
                  <TableCell>{denomination.asset.name}</TableCell>
                  <TableCell>{denomination.asset.type === 'PHYSICAL' ? 'Físico' : 'Virtual'}</TableCell>
                  <TableCell>{denomination.value}</TableCell>
                  <TableCell className='flex gap-2 justify-end'>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(denomination)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(denomination)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Denominación</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-assetId">Activo</Label>
              <Select
                value={editingDenomination?.assetId || ''}
                onValueChange={(value) =>
                  setEditingDenomination((prev) =>
                    prev ? { ...prev, assetId: value } : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Activo" />
                </SelectTrigger>
                <SelectContent>
                  {assetsData?.data.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">Valor</Label>
              <Input
                id="edit-value"
                type="number"
                value={editingDenomination?.value || ''}
                onChange={(e) =>
                  setEditingDenomination((prev) =>
                    prev ? { ...prev, value: parseFloat(e.target.value) } : null
                  )
                }
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p>
            ¿Está seguro de que desea eliminar la denominación de {denominationToDelete?.asset.name}?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={confirmDelete}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}