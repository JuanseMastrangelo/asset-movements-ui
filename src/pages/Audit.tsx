import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '../components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { auditService } from '@/services/api';
import { Audit } from '@/models/audit';
import { PaginationControl } from '@/components/ui/PaginationControl';

export function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => auditService.getAll(page),
    retry: 1,
  });

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-red-500">
          Error al cargar la auditoría. Por favor, intente nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Auditoría</h1>
      {
        isLoading ? (
          <div className="flex items-center justify-center gap-3 py-7 border">
            <Spinner size='sm' /> Cargando auditoría...
          </div>
        )
        :
        <>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo de Entidad</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((audit: Audit) => (
                  <TableRow key={audit.id}>
                    <TableCell>{audit.id}</TableCell>
                    <TableCell>{audit.entityType}</TableCell>
                    <TableCell>{audit.action}</TableCell>
                    <TableCell>{audit.changedByUser.username}</TableCell>
                    <TableCell>{new Date(audit.changedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControl
            currentPage={page}
            totalPages={data?.meta.pagination.totalPages || 1}
            onPageChange={setPage}
          />
        </>
      }
    </div>
  );
}