import { useState } from 'react';
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
import { Badge } from '../components/ui/badge';
import { transactionRulesService, assetService } from '@/services/api';
import { TransactionRule } from '@/models/transactionRule';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Asset } from '@/models';
import { Trash2 } from 'lucide-react';

export function TransactionRules() {
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({ sourceAssetId: '', targetAssetId: '', isEnabled: true });
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetService.getAll(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction-rules', page],
    queryFn: () => transactionRulesService.getAll(page),
    retry: 1,
  });

  // Asegúrate de que `data` incluya `meta` con `totalPages` o similar
  const totalPages = 1;

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? transactionRulesService.enable(id) : transactionRulesService.disable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionRulesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: transactionRulesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
      setIsCreateDialogOpen(false);
      setNewRule({ sourceAssetId: '', targetAssetId: '', isEnabled: true });
    },
  });

  const handleToggleActive = (rule: TransactionRule) => {
    toggleActiveMutation.mutate({ id: rule.id, active: !rule.isEnabled });
  };

  const handleDelete = (id: string) => {
    setRuleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (ruleToDelete) {
      deleteMutation.mutate(ruleToDelete);
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newRule);
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
        <p className="text-red-500">Error al cargar las reglas de transacciones. Por favor, intente nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reglas de Transacciones</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Crear Regla</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Regla</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex flex-col gap-5 mt-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="asset1">Activo Ingresa</Label>
                  <Select
                    value={newRule.sourceAssetId}
                    onValueChange={(value) => setNewRule({ ...newRule, sourceAssetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar Asset 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetsData?.data.map((asset: Asset) => (
                        <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2 mb-3">
                  <Label htmlFor="asset2">Activo Egresa</Label>
                  <Select
                    value={newRule.targetAssetId}
                    onValueChange={(value) => setNewRule({ ...newRule, targetAssetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar Asset 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetsData?.data.map((asset: Asset) => (
                        <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Crear Regla
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p>¿Está seguro de que desea eliminar esta regla?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border rounded-md overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Asset 1</TableHead>
              <TableHead>Asset 2</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((rule: TransactionRule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.sourceAsset.name}</TableCell>
                <TableCell>{rule.targetAsset.name}</TableCell>
                <TableCell>
                  <Badge variant={rule.isEnabled ? "success" : "destructive"}>
                    {rule.isEnabled ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(rule)}
                    >
                      {rule.isEnabled ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
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