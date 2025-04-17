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

  const { data: transactionDetails, isLoading: isLoadingTransaction, refetch: refetchTransactionDetails } = useQuery({
    queryKey: ["transaction", params.id],
    queryFn: async () => {
      if (!params.id) throw new Error("No transaction ID provided");
      return transactionsService.getOne(params.id);
    },
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: !!params.id,
  });

  const { data: denominations, isLoading: isLoadingDenominations } = useQuery({
    queryKey: ["denominations"],
    queryFn: denominationsService.getAll,
    refetchOnWindowFocus: false,
    refetchInterval: false,
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

  const filteredIngressDenominations = denominations?.filter(d => d.assetId === ingressAssetId) || [];
  const filteredEgressDenominations = denominations?.filter(d => d.assetId === egressAssetId) || [];

  const billDetailsIncome = transactionDetails?.details.find((detail) => detail.movementType === "INCOME")?.billDetails || [];
  const billDetailsEgress = transactionDetails?.details.find((detail) => detail.movementType === "EXPENSE")?.billDetails || [];

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
    
    
    try {
      const body = {
        state: "CURRENT_ACCOUNT",
        notes: transactionDetails?.notes || "",
        details: [
          {
            assetId: transactionDetails?.details?.find((detail) => detail.movementType === "INCOME")?.assetId || "",
            amount: transactionDetails?.details?.find((detail) => detail.movementType === "INCOME")?.amount,
            movementType: "INCOME",
            billDetails: [
              ...billDetailsIncome.map(row => ({
                denominationId: row.denominationId,
                quantity: row.quantity
              })),
              ...ingressNewBillDetails
            ]
          },
          {
            assetId: transactionDetails?.details?.find((detail) => detail.movementType === "EXPENSE")?.assetId || "",
            amount: transactionDetails?.details?.find((detail) => detail.movementType === "EXPENSE")?.amount,
            movementType: "EXPENSE",
            billDetails: [
              ...billDetailsEgress.map(row => ({
                denominationId: row.denominationId,
                quantity: row.quantity
              })),
              ...egressNewBillDetails
            ]
          },
        ],
      };

      await api.patch(`transactions/${params.id}`, body);
      onComplete(redirectToLogistics);
      if (!redirectToLogistics) {
        refetchTransactionDetails();
      }
      setIngressRows([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
      setEgressRows([{ count: "", billValue: "", denominationId: "", receivedDate: "", movementType: "", quantity: 0 }]);
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
            Restante: {allowedIngressTotal - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(ingressRows)}
          </div>
          {(allowedIngressTotal - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(ingressRows) < 0) && (
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
            Restante: {allowedEgressTotal - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(egressRows)}
          </div>
          {(allowedEgressTotal - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(egressRows) < 0) && (
            <div className="text-red-500 text-sm">El total de egreso supera lo permitido.</div>
          )}
        </div>
      </div>

          <hr />
      {error && <div className="text-red-500">{error}</div>}
      
      <div className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Resumen General</h2>
        <Table className="min-w-full bg-white">
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
              <TableCell className="text-left py-2">{allowedIngressTotal}</TableCell>
              <TableCell className="text-left py-2">{billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0)}</TableCell>
              <TableCell className="text-left py-2">{allowedIngressTotal - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0)}</TableCell>
            </TableRow>
            <TableRow>
            <TableCell className="text-left py-2">Egreso ({EgressData?.asset.name})</TableCell>
              <TableCell className="text-left py-2">{allowedEgressTotal}</TableCell>
              <TableCell className="text-left py-2">{billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0)}</TableCell>
              <TableCell className="text-left py-2">{allowedEgressTotal - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <h2 className="text-lg font-semibold mb-2 mt-4">Resumen de Movimientos</h2>
        {billDetailsIncome.length > 0 || billDetailsEgress.length > 0 ? (
          <Table className="min-w-full bg-white">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Denominación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionDetails?.details.map((detail) =>
                detail.billDetails.map((billDetail, index) => (
                  <TableRow key={index} className="border-t">
                    <TableCell className="text-left py-2">{new Date(detail.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
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
                    <TableCell className="text-left py-2">{billDetail.quantity}</TableCell>
                    <TableCell className="text-left py-2">{billDetail.denomination.value}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <div>No hay movimientos previos</div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
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
              (allowedIngressTotal - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(ingressRows) < 0) ||
              (allowedEgressTotal - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(egressRows) < 0)
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
              (allowedIngressTotal - billDetailsIncome.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(ingressRows) < 0) ||
              (allowedEgressTotal - billDetailsEgress.reduce((total, detail) => total + (detail.quantity * detail.denomination.value), 0) - calculateTotal(egressRows) < 0)
            )
          }
          onClick={() => handleSubmit(true)}
        >
          Guardar Carga de valores con logística
        </Button>
      </div>
    </form>
  );
};

export default ValuesForm;
