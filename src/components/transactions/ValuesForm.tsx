import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { api, transactionsService, denominationsService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Denomination } from "@/models/denomination";

interface BillRow {
  count: string;
  billValue: string; // Valor de la denominación
  denominationId: string; // ID de la denominación
  receivedDate: string;
  movementType: string;
  quantity: number;
}

interface ValuesFormProps {
  onComplete: (redirectToLogistics: boolean) => void;
}

const ValuesForm: React.FC<ValuesFormProps> = ({ onComplete }) => {
  const params = useParams();
  const [ingressRows, setIngressRows] = useState<BillRow[]>([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
  const [egressRows, setEgressRows] = useState<BillRow[]>([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");

  const { data: transactionDetails, isLoading: isLoadingTransaction, error: transactionError, refetch: refetchTransactionDetails } = useQuery({
    queryKey: ["transaction", params.id],
    queryFn: async () => {
      if (!params.id) throw new Error("No transaction ID provided");
      return transactionsService.getOne(params.id);
    },
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: !!params.id,
  });

  if (transactionError) {
    toast.error("Error al cargar los detalles de la transacción");
    window.location.href = "/transactions";
  }

  const { data: denominations, isLoading: isLoadingDenominations } = useQuery<Denomination[], Error>({
    queryKey: ["denominations"],
    queryFn: async () => {
      return denominationsService.getAll();
    },
  });

  if (isLoadingTransaction || isLoadingDenominations) {
    return <Spinner />;
  }

  const IngressData = transactionDetails?.details?.find(
    (detail) => detail.movementType === "INCOME"
  );
  const EgressData = transactionDetails?.details?.find(
    (detail) => detail.movementType === "EXPENSE"
  );
  const allowedIngressTotal = IngressData?.amount || 0;
  const allowedEgressTotal = EgressData?.amount || 0;

  const ingressAssetId = IngressData?.assetId || "";
  const egressAssetId = EgressData?.assetId || "";

  const filteredIngressDenominations = denominations?.filter((d: Denomination) => d.assetId === ingressAssetId) || [];
  const filteredEgressDenominations = denominations?.filter((d: Denomination) => d.assetId === egressAssetId) || [];

  const billDetailsIncome = transactionDetails?.details.find((detail) => detail.movementType === "INCOME")?.billDetails || [];
  const billDetailsEgress = transactionDetails?.details.find((detail) => detail.movementType === "EXPENSE")?.billDetails || [];
  
  const childTransactions = transactionDetails?.childTransactions || [];

  const pendingIngress = allowedIngressTotal - childTransactions
    .flatMap(transaction => transaction.details)
    .filter(detail => detail.movementType === "INCOME")
    .reduce((total, detail) => total + detail.amount, 0);

  const pendingEgress = allowedEgressTotal - childTransactions
    .flatMap(transaction => transaction.details)
    .filter(detail => detail.movementType === "EXPENSE")
    .reduce((total, detail) => total + detail.amount, 0);

  const isCompleted = transactionDetails?.state === "COMPLETED";
  
  const hasImmutableAsset = transactionDetails?.details.some(detail => detail.asset.isImmutable);

  if (hasImmutableAsset) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="px-4 py-2 rounded-md w-1/2 text-center">
          No se permite en este tipo de transacciones, cambia de activo para continuar ó dirigete a conciliaciones para realizar la carga de valores <a href="/conciliations" className="text-blue-500 hover:text-blue-700">aquí</a>.
        </div>
      </div>
    );
  }

  // Calculate total amount for a set of rows
  const calculateTotal = (rows: BillRow[]): number =>
    rows.reduce((total, row) => {
      const count = parseFloat(row.count);
      const value = parseFloat(row.billValue);
      return !isNaN(count) && !isNaN(value) ? total + count * value : total;
    }, 0);

  // Check if last row is complete (both inputs filled)
  const canAddRow = (rows: BillRow[]): boolean => {
    const lastRow = rows[rows.length - 1];
    return lastRow.count !== "" && lastRow.billValue !== "";
  };

  // Add new row if last row is complete
  const addIngressRow = () => {
    if (canAddRow(ingressRows)) {
      setIngressRows([...ingressRows, { count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
    }
  };

  const addEgressRow = () => {
    if (canAddRow(egressRows)) {
      setEgressRows([...egressRows, { count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
    }
  };

  const handleIngressChange = (index: number, values: { count: string; billValue: string; denominationId: string }) => {
    const updatedRows = [...ingressRows];
    updatedRows[index] = { ...updatedRows[index], ...values };
    setIngressRows(updatedRows);
  };

  const handleEgressChange = (index: number, values: { count: string; billValue: string; denominationId: string }) => {
    const updatedRows = [...egressRows];
    updatedRows[index] = { ...updatedRows[index], ...values };
    setEgressRows(updatedRows);
  };

  const handleRemoveIngressRow = (index: number) => {
    const updatedRows = [...ingressRows];
    if (ingressRows.length === 1) {
      updatedRows[index] = { count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 };
    } else {
      updatedRows.splice(index, 1);
    }
    setIngressRows(updatedRows);
  };

  const handleRemoveEgressRow = (index: number) => {
    const updatedRows = [...egressRows];
    if (egressRows.length === 1) {
      updatedRows[index] = { count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 };
    } else {
      updatedRows.splice(index, 1);
    }
    setEgressRows(updatedRows);
  };

  const allRowsComplete = (rows: BillRow[]): boolean =>
    rows.every((row) => row.count !== "" && row.billValue !== "");

  // Handle submission (PATCH transaction state to CURRENT_ACCOUNT)
  const handleSubmit = async (redirectToLogistics: boolean) => {

    const ingressTotal = calculateTotal(ingressRows);
    const egressTotal = calculateTotal(egressRows);

    if (ingressTotal > allowedIngressTotal) {
      setError(`El total de ingresos (${ingressTotal}) supera lo permitido (${allowedIngressTotal}).`);
      return;
    }
    if (egressTotal > allowedEgressTotal) {
      setError(`El total de egresos (${egressTotal}) supera lo permitido (${allowedEgressTotal}).`);
      return;
    }

    setError("");
    setIsSubmitting(true);

    const ingressNewBillDetails = ingressRows.length > 0 && ingressRows.every(row => row.count !== "" && row.billValue !== "") ? ingressRows.map(row => ({
      denominationId: row.denominationId,
      quantity: parseInt(row.count, 10),
      receivedDate: new Date().toISOString(),
    })) : [];

    const egressNewBillDetails = egressRows.length > 0 && egressRows.every(row => row.count !== "" && row.billValue !== "") ? egressRows.map(row => ({
      denominationId: row.denominationId,
      quantity: parseInt(row.count, 10),
      receivedDate: new Date().toISOString(),
    })) : [];

    const ingressBody = {
      assetId: ingressAssetId,
      amount: ingressRows.reduce((total, row) => total + (+row.count * +row.billValue), 0),
      movementType: "INCOME",
      billDetails: ingressNewBillDetails
    }

    const egressBody = {
      assetId: egressAssetId,
      amount:  egressRows.reduce((total, row) => total + (+row.count * +row.billValue), 0),
      movementType: "EXPENSE",
      billDetails: egressNewBillDetails
    }

    const details = [];
    if (ingressRows.length > 0 && ingressRows.every(row => row.count !== "" && row.billValue !== "")) details.push(ingressBody);
    if (egressRows.length > 0 && egressRows.every(row => row.count !== "" && row.billValue !== "")) details.push(egressBody);

    try {
      const body = {
        clientId: transactionDetails?.clientId,
        state: "CURRENT_ACCOUNT",
        notes: note,
        details: details,
      };
      await api.post(`transactions/${params.id}/child`, body);
      onComplete(redirectToLogistics);
      if (!redirectToLogistics) {
        refetchTransactionDetails();
      }
      setIngressRows([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
      setEgressRows([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
      setNote("");
      toast.success("Ingresos y egresos agregados correctamente.");
    } catch (err) {
      console.log(err);
      setError("Error al cerrar la operación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {
        !isCompleted ?
        <>
      <div className="flex rounded">
        {/* Ingreso Section */}
        <div className="flex-1 p-4 border-r">
          <div className="mb-2 font-semibold">Ingreso ({IngressData?.asset.name})</div>
          {/* Header for columns */}
          <div className="flex text-sm font-medium">
            <div className="w-1/2">Cantidad</div>
            <div className="w-1/2">Denominación</div>
          </div>
          {ingressRows.map((row, index) => (
            <div key={`ingress-${index}`} className="flex items-center my-2">
              <div className="w-1/2">
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={row.count}
                  onChange={(e) => handleIngressChange(index, { count: e.target.value, billValue: row.billValue, denominationId: row.denominationId })}
                />
              </div>
              <div className="px-2">x</div>
              <div className="w-1/2">
                <Select onValueChange={(value) => {
                  const [denominationId, billValue] = value.split("|");
                  handleIngressChange(index, { count: row.count, denominationId, billValue });
                }} value={`${row.denominationId}|${row.billValue}`}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar denominación" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredIngressDenominations.map((denomination) => (
                      <SelectItem key={denomination.id} value={`${denomination.id}|${denomination.value.toString()}`}>
                        {denomination.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button type="button" onClick={() => handleRemoveIngressRow(index)} className="ml-2 text-red-500">x</button>
              <div className="ml-2 text-sm">
                {row.count && row.billValue && (
                  <>
                    {row.count} x {row.billValue} ={" "}
                    {parseFloat(row.count) * parseFloat(row.billValue)}
                  </>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addIngressRow}
            disabled={!canAddRow(ingressRows)}
            className="mt-2"
          >
            Agregar fila
          </Button>
          <div className="mt-2 text-sm">
            Total Nuevo Ingreso: {calculateTotal(ingressRows)} <br />
            Restante: {pendingIngress - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(ingressRows)}
          </div>
          {(pendingIngress - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(ingressRows) < 0) && (
            <div className="text-red-500 text-sm">El total de ingresos supera lo permitido.</div>
          )}
        </div>

        {/* Egreso Section */}
        <div className="flex-1 p-4">
          <div className="mb-2 font-semibold">Egreso ({EgressData?.asset.name})</div>
          {/* Header for columns */}
          <div className="flex text-sm font-medium">
            <div className="w-1/2">Cantidad</div>
            <div className="w-1/2">Denominación</div>
          </div>
          {egressRows.map((row, index) => (
            <div key={`egress-${index}`} className="flex items-center my-2">
              <div className="w-1/2">
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={row.count}
                  onChange={(e) => handleEgressChange(index, { count: e.target.value, billValue: row.billValue, denominationId: row.denominationId })}
                />
              </div>
              <div className="px-2">x</div>
              <div className="w-1/2">
                <Select onValueChange={(value) => {
                  const [denominationId, billValue] = value.split("|");
                  handleEgressChange(index, { count: row.count, denominationId, billValue });
                }} value={`${row.denominationId}|${row.billValue}`}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar denominación" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEgressDenominations.map((denomination) => (
                      <SelectItem key={denomination.id} value={`${denomination.id}|${denomination.value.toString()}`}>
                        {denomination.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button type="button" onClick={() => handleRemoveEgressRow(index)} className="ml-2 text-red-500">x</button>
              <div className="ml-2 text-sm">
                {row.count && row.billValue && (
                  <>
                    {row.count} x {row.billValue} ={" "}
                    {parseFloat(row.count) * parseFloat(row.billValue)}
                  </>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addEgressRow}
            disabled={!canAddRow(egressRows)}
            className="mt-2"
          >
            Agregar fila
          </Button>
          <div className="mt-2 text-sm">
            Total Nuevo Egreso: {calculateTotal(egressRows)} <br />
            Restante: {pendingEgress - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(egressRows)}
          </div>
          {(pendingEgress - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(egressRows) < 0) && (
            <div className="text-red-500 text-sm">El total de egreso supera lo permitido.</div>
          )}
        </div>
        <hr />
        {error && <div className="text-red-500">{error}</div>}
      </div>

      <div className="px-4">
        <label htmlFor="transaction-note" className="block text-sm font-medium text-gray-700 dark:text-white">
          Nota de la Transacción
        </label>
        <textarea
          id="transaction-note"
          name="transaction-note"
          rows={3}
          placeholder="Agregar una nota..."
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      </>
       :
       <div className="flex justify-end space-x-4">
          <div className="bg-green-500 text-white px-4 py-2 rounded-md">Transacción Completada</div>
        </div>
      }

      
      
      <div className="mt-6 px-4">
      <h2 className="text-lg font-semibold mb-2">Resumen General</h2>
        <Table className="min-w-full ">
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor esperado</TableHead>
              <TableHead>Completado</TableHead>
              <TableHead>Pendiente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-left py-2">Ingreso ({IngressData?.asset.name})</TableCell>
              <TableCell className="text-left py-2">$ {allowedIngressTotal}</TableCell>
              <TableCell className="text-left py-2">$ {childTransactions.flatMap(transaction => transaction.details).filter(detail => detail.movementType === "INCOME").reduce((total, detail) => total + detail.amount, 0)}</TableCell>
              <TableCell className="text-left py-2">$ {pendingIngress}</TableCell>
            </TableRow>
            <TableRow>
            <TableCell className="text-left py-2">Egreso ({EgressData?.asset.name})</TableCell>
              <TableCell className="text-left py-2">$ {allowedEgressTotal}</TableCell>
              <TableCell className="text-left py-2">$ {childTransactions.flatMap(transaction => transaction.details).filter(detail => detail.movementType === "EXPENSE").reduce((total, detail) => total + detail.amount, 0)}</TableCell>
              <TableCell className="text-left py-2">$ {pendingEgress}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <h2 className="text-lg font-semibold mb-2 mt-4">Resumen de Movimientos</h2>
        {childTransactions.length > 0 ? (
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {childTransactions
                .flatMap((transaction) => transaction.details.map((detail) => ({
                  ...detail,
                  date: transaction.date,
                })))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((detail, index) => (
                  <TableRow key={index} className="border-t">
                    <TableCell className="text-left py-2">{new Date(detail.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="text-left py-2">
                      <Badge
                        variant={detail.movementType === "INCOME" ? "success" : "destructive"}
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderColor: detail.movementType === "INCOME" ? "#28a745" : "#dc3545",
                          color: detail.movementType === "INCOME" ? "#28a745" : "#dc3545",
                          borderWidth: "1px",
                          borderStyle: "solid"
                        }}
                      >
                        {detail.movementType === "INCOME" ? "Ingreso" : "Egreso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left py-2">$ {detail.amount} {transactionDetails?.details.find((d) => d.assetId === detail.assetId)?.asset.name}</TableCell>
                    <TableCell className="text-left py-2">{detail.notes}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        ) : (
          <div>No hay movimientos previos</div>
        )}
      </div>

      {
        !isCompleted &&
        <>
        <div className="flex justify-end space-x-4 px-4">
        <Button
          type="button"
          variant="outline"
          disabled={
            isSubmitting ||
            (
              !allRowsComplete(ingressRows) &&
              !allRowsComplete(egressRows)
            ) ||
            (
              (pendingIngress - calculateTotal(ingressRows) < 0) ||
              (pendingEgress - calculateTotal(egressRows) < 0)
            )
          }
          onClick={() => handleSubmit(false)}
        >
          Guardar Carga de valores
        </Button>
        <Button
          type="button"
          disabled={
            isSubmitting ||
            (
              !allRowsComplete(ingressRows) &&
              !allRowsComplete(egressRows)
            ) ||
            (
              (pendingIngress - calculateTotal(ingressRows) < 0) ||
              (pendingEgress - calculateTotal(egressRows) < 0)
            )
          }
          onClick={() => handleSubmit(true)}
        >
          Guardar Carga de valores con logística
        </Button>
      </div>
      </>
      }
    </form>
  );
};

export default ValuesForm;
