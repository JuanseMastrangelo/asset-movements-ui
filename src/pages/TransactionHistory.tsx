import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, formatISO, parseISO, setHours, setMinutes, setSeconds } from "date-fns";
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
import { Eye, FileText, Link2 } from "lucide-react";
import { PaginationControl } from "@/components/ui/PaginationControl";


export function TransactionHistory() {
  const today = new Date();
  // Establecer la hora a 00:00:00 para el inicio del día
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Establecer la hora a 23:59:59 para el fin del día
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const [clientId, setClientId] = useState<string | undefined>(useParams().clientId);
  const [state, setState] = useState<string | undefined>(useParams().state);
  const [startDate, setStartDate] = useState<string>(useParams().startDate || startOfDay.toISOString());
  const [endDate, setEndDate] = useState<string>(useParams().endDate || endOfDay.toISOString());
  const [parentTransactionId, setParentTransactionId] = useState<string | undefined>(useParams().parentTransactionId);
  const [page, setPage] = useState<string>('1');

  const [clientSearch, setClientSearch] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);

  const formatDate = (dateString: string) => formatISO(parseISO(dateString), { representation: 'date' });

  
  // Función para formatear la fecha con hora mínima o máxima
  const formatDateWithTime = (dateString: string, isStartDate: boolean) => {
    const date = parseISO(dateString);
    if (isStartDate) {
      // Establecer la hora mínima (00:00:00) para startDate
      const startDate = setHours(setMinutes(setSeconds(date, 0), 0), 0);
      console.log(startDate);
      return formatISO(startDate);
    } else {
      // Establecer la hora máxima (23:59:59) para endDate
      const endDate = setHours(setMinutes(setSeconds(date, 59), 59), 23);
      return formatISO(endDate);
    }
  };

  const { data, isLoading, error } = useQuery<TransactionSearchResponse>({
    queryKey: ['transactions', clientId, state, formatDate(startDate), formatDate(endDate), parentTransactionId, page],
    queryFn: () => transactionsService.search({ clientId, state, startDate: formatDateWithTime(startDate, true), endDate: formatDateWithTime(endDate, false), parentTransactionId, page: parseInt(page) }),
    enabled: !!startDate && !!endDate,
  });

  const handlePageChange = (newPage: number) => {
    if (currentPage !== newPage) {
      setCurrentPage(newPage);
      setPage(newPage.toString());
    }
  };

  // Search de clientes
  const { data: clientData, isFetching: isFetchingClientData } = useQuery<{ data: Client[] }>({
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
          locale="es-AR"
          showCompare={false}
        />

        <Select
          onValueChange={handleStateChange}
          value={state}
        >
          <SelectTrigger className="w-[180px] py-[1.3125rem]">{state || 'Estado'}</SelectTrigger>
          <SelectContent>
            <SelectItem value="CLEAR">Limpiar selección</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="CURRENT_ACCOUNT">Cuenta Corriente</SelectItem>
            <SelectItem value="COMPLETED">Completado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <div ref={autocompleteRef} className="relative w-full sm:w-[300px]">
          <div className="relative">
            <Input
              type="text"
              value={clientSearch}
              onChange={(e) => {
                const newClientSearch = e.target.value;
                if (clientSearch !== newClientSearch) {
                  setClientSearch(newClientSearch);
                }
              }}
              className="py-[1.3125rem] pr-10"
              onFocus={() => setAutocompleteOpen(true)}
              placeholder="Filtrar por cliente..."
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a6 6 0 100 12 6 6 0 000-12zM8 10a2 2 0 114 0 2 2 0 01-4 0zm8 8a8 8 0 10-16 0h16z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          {autocompleteOpen && clientSearch.trim() !== '' && (
            <ul className="absolute bg-white border rounded-md mt-1 w-full z-10">
              {
                isFetchingClientData ? (
                  <div className="flex my-4 justify-center items-center">
                    <Spinner size="sm" />
                  </div>
                ) :
                  !clientData || clientData?.data.length === 0 ? (
                    <div className="flex my-4 justify-center items-center text-gray-500">No se encontraron resultados</div>
                  ) :
                  clientData?.data.map((client) => (
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
            <Badge variant="default" className="flex items-center py-2 px-4">
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
              <TableHead>Ingreso</TableHead>
              <TableHead>Egreso</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="w-40">
                    {transaction.parentTransactionId ? (
                      <div className="flex gap-2">
                        <button
                          className="hover:underline hover:text-blue-500"
                          onClick={() => transaction.parentTransactionId && handleFilterByParentTransaction(transaction.parentTransactionId)}
                        >
                          Ver hilo
                        </button>
                        <Link to={`/transactions/${transaction.parentTransactionId}`} className=" hover:text-blue-500" title="Ver transacción padre">
                          <Link2 className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : ''}
                  </TableCell>
                  <TableCell>{format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })}</TableCell>
                  <TableCell><Link className="hover:underline hover:text-blue-500" to={`/clients/${transaction.client.name}`}>{transaction.client.name}</Link></TableCell>
                  <TableCell><span className={`badge badge-${transaction.state.toLowerCase()}`}>
                    <Badge variant={transaction.state === "PENDING" ? "warning" : transaction.state === "COMPLETED" ? "success" : transaction.state === "CANCELLED" ? "destructive" : "default"}>
                      {transaction.state === "PENDING" ? "Pendiente" : transaction.state === "COMPLETED" ? "Completado" : transaction.state === "CANCELLED" ? "Cancelado" : "Cuenta Corriente"}
                    </Badge>
                  </span></TableCell>
                  <TableCell>{transaction.details.find(detail => detail.movementType === 'INCOME')?.asset.name || '-'}</TableCell>
                  <TableCell>{transaction.details.find(detail => detail.movementType === 'EXPENSE')?.asset.name || '-'}</TableCell>
                  <TableCell>
                    <div className="text-center" title={transaction.notes}><FileText className="w-4 h-4" /></div>
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
