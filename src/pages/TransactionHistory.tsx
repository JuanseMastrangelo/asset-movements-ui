import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, formatISO, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Spinner } from "../components/ui/spinner";
import { Input } from "../components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "../components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { transactionsService, clientService } from "@/services/api";
import { TransactionSearchResponse, Transaction, TransactionDetail } from "@/models/transaction";
import { Client } from "@/models/client";
import { DateRangePicker } from "@/components/ui/DatePickerWithRange";
import { Eye, Link2 } from "lucide-react";
import { PaginationControl } from "@/components/ui/PaginationControl";

export function TransactionHistory() {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  const [clientId, setClientId] = useState<string | undefined>(useParams().clientId);
  const [state, setState] = useState<string | undefined>(useParams().state);
  const [startDate, setStartDate] = useState<string>(useParams().startDate || lastMonth.toISOString());
  const [endDate, setEndDate] = useState<string>(useParams().endDate || today.toISOString());
  const [parentTransactionId, setParentTransactionId] = useState<string | undefined>(useParams().parentTransactionId);
  const [page, setPage] = useState<string>('1');

  const [clientSearch, setClientSearch] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);

  const formatDate = (dateString: string) => formatISO(parseISO(dateString), { representation: 'date' });

  const { data, isLoading, error } = useQuery<TransactionSearchResponse>({
    queryKey: ['transactions', clientId, state, formatDate(startDate), formatDate(endDate), parentTransactionId, page],
    queryFn: () => transactionsService.search({ clientId, state, startDate, endDate, parentTransactionId, page: parseInt(page) }),
    enabled: !!startDate && !!endDate,
  });

  const handlePageChange = (newPage: number) => {
    if (currentPage !== newPage) {
      setCurrentPage(newPage);
      setPage(newPage.toString());
    }
  };

  // Search de clientes
  const { data: clientData } = useQuery<{ data: Client[] }>({
    queryKey: ["clients", clientSearch],
    queryFn: () => clientService.searchClients(clientSearch),
    enabled: !!clientSearch,
  });

  const transactions = data?.data || [];
  const totalTransactions = data?.meta?.pagination?.total || 0;
  const transactionsPerPage = data?.meta?.pagination?.limit || 25;
  const totalPages = data?.meta?.pagination?.totalPages || 1;

  const [currentPage, setCurrentPage] = useState(1);

  const autocompleteRef = useRef<HTMLDivElement | null>(null);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (autocompleteRef.current && !autocompleteRef.current.contains(target)) {
        setAutocompleteOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClientSelect = (client: Client) => {
    if (clientId !== client.id) {
      setClientId(client.id);
    }
    if (clientSearch !== client.name) {
      setClientSearch(client.name);
    }
    setAutocompleteOpen(false);
    setPage('1');
  };

  const handleStateChange = (value: string) => {
    if (value === "CLEAR") {
      setState(undefined);
    } else if (state !== value) {
      setState(value);
    }
    setPage('1');
  };

  const clearClientSelection = () => {
    setClientId(undefined);
    setClientSearch('');
    setPage('1');
  };

  const handleViewTransaction = (transactionId: string) => {
    setDialogOpen(true);
    // Llamar al endpoint para obtener los detalles de la transacción
    transactionsService.getOne(transactionId).then((transaction: Transaction) => {
      setSelectedTransaction(transaction);
    });
  };

  const handleCreateChildTransaction = () => {
    if (selectedTransaction) {
      navigate(`/transactions/${selectedTransaction.id}?step=values`);
    }
  };

  const handleFilterByParentTransaction = (parentTransactionId: string) => {
    setParentTransactionId(parentTransactionId);
    setPage('1');
  };

  if (isLoading) return <Spinner size="lg" />;
  if (error) return <div>Error al cargar el historial de transacciones.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Historial de Transacciones</h1>

      <div className="flex flex-wrap gap-4">
        <DateRangePicker
          onUpdate={(values) => {
            const { from, to } = values.range;
            const start = from ? formatDate(from.toISOString()) : '';
            const end = to ? formatDate(to.toISOString()) : '';
            setStartDate(start);
            setEndDate(end);
            setPage('1');
          }}
          initialDateFrom={startDate}
          initialDateTo={endDate}
          align="start"
          locale="en-GB"
          showCompare={false}
        />

        <Select
          onValueChange={handleStateChange}
          value={state}
        >
          <SelectTrigger className="w-[180px]">{state || 'Estado'}</SelectTrigger>
          <SelectContent>
            <SelectItem value="CLEAR">Limpiar selección</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="CURRENT_ACCOUNT">Cuenta Corriente</SelectItem>
            <SelectItem value="COMPLETED">Completado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <div ref={autocompleteRef} className="relative w-full sm:w-[300px]">
          <Input
            type="text"
            value={clientSearch}
            onChange={(e) => {
              const newClientSearch = e.target.value;
              if (clientSearch !== newClientSearch) {
                setClientSearch(newClientSearch);
              }
            }}
            onFocus={() => setAutocompleteOpen(true)}
            placeholder="Filtrar por cliente..."
          />
          {autocompleteOpen && (
            <ul className="absolute bg-white border rounded-md mt-1 w-full z-10">
              {clientData?.data.map((client) => (
                <li
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="cursor-pointer hover:bg-gray-100 p-2"
                >
                  {client.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-row gap-3">
        {clientId && (
            <Badge variant="default" className="flex items-center">
              {clientSearch}
              <button onClick={clearClientSelection} className="ml-2">
                &times;
              </button>
            </Badge>
        )}

        {parentTransactionId && (
          <Badge variant="default" className="flex items-center">
            Transacción padre: {parentTransactionId}
            <button onClick={() => setParentTransactionId(undefined)} className="ml-2">
              &times;
            </button>
          </Badge>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Padre</TableHead>
              <TableHead>Fecha y Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="w-44">
                    {transaction.parentTransactionId ? (
                      <div className="flex gap-2">
                        <button
                          className="hover:underline hover:text-blue-500"
                          onClick={() => transaction.parentTransactionId && handleFilterByParentTransaction(transaction.parentTransactionId)}
                        >
                          {transaction.parentTransactionId.slice(0, 10) + '...'}
                        </button>
                        <Link to={`/transactions/${transaction.parentTransactionId}`} className=" hover:text-blue-500" title="Ver transacción padre">
                          <Link2 className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : ''}
                  </TableCell>
                  <TableCell>{format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })}</TableCell>
                  <TableCell><Link className="hover:underline hover:text-blue-500" to={`/clients/${transaction.client.id}`}>{transaction.client.name}</Link></TableCell>
                  <TableCell><span className={`badge badge-${transaction.state.toLowerCase()}`}>
                    <Badge variant={transaction.state === "PENDING" ? "warning" : transaction.state === "COMPLETED" ? "success" : transaction.state === "CANCELLED" ? "destructive" : "default"}>
                      {transaction.state === "PENDING" ? "Pendiente" : transaction.state === "COMPLETED" ? "Completado" : transaction.state === "CANCELLED" ? "Cancelado" : "Cuenta Corriente"}
                    </Badge>
                  </span></TableCell>
                  <TableCell title={transaction.notes}>
                    {transaction.notes.length > 30 ? `${transaction.notes.slice(0, 30)}...` : transaction.notes}
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => handleViewTransaction(transaction.id)} variant="outline" size="icon">
                      <Eye />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalTransactions > transactionsPerPage && (
        <div className="mt-4 flex justify-center">
          <PaginationControl
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {setDialogOpen(open);!open && setSelectedTransaction(null)}}>
        <DialogContent style={{ width: '60vw', maxWidth: '60vw' }}>
          <DialogHeader>
            <DialogTitle>Historial de transacciones de {selectedTransaction?.client.name}</DialogTitle>
          </DialogHeader>
          {selectedTransaction ? (
            <>
              <Table className="mx-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead>Egreso</TableHead>
                    <TableHead>Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTransaction.details.map((detail: TransactionDetail, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(detail.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                      <TableCell>{detail.movementType === "INCOME" ? `$ ${detail.amount} ${detail.asset.name}` : ''}</TableCell>
                      <TableCell>{detail.movementType === "EXPENSE" ? `$ ${detail.amount} ${detail.asset.name}` : ''}</TableCell>
                      <TableCell>{detail.notes}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-600 hover:bg-gray-600 text-white">
                    <TableCell>Total:</TableCell>
                    <TableCell>
                      $ {(selectedTransaction.details.find((detail) => detail.movementType === "INCOME")?.amount || 0)}
                    </TableCell>
                    <TableCell>
                      $ {(selectedTransaction.details.find((detail) => detail.movementType === "EXPENSE")?.amount || 0)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow className="bg-gray-800 hover:bg-gray-800 text-white">
                    <TableCell>Restan:</TableCell>
                    <TableCell>
                      $ {
                        (selectedTransaction?.details?.find((detail) => detail.movementType === "INCOME")?.amount || 0) - selectedTransaction.childTransactions
                        .flatMap(transaction => transaction.details)
                        .filter(detail => detail.movementType === "INCOME")
                        .reduce((total, detail) => total + detail.amount, 0)
                      }
                    </TableCell>
                    <TableCell>
                      $ {
                        (selectedTransaction?.details?.find((detail) => detail.movementType === "EXPENSE")?.amount || 0) - selectedTransaction.childTransactions
                        .flatMap(transaction => transaction.details)
                        .filter(detail => detail.movementType === "EXPENSE")
                        .reduce((total, detail) => total + detail.amount, 0)
                      }
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Button variant="outline" onClick={handleCreateChildTransaction}>
                Crear transacción hija
              </Button>
            </>
          ) : (
            <Spinner />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
