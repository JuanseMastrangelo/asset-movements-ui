import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export function Conciliations() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Conciliaciones</h1>
      </div>
      <Table className="border-t border-b">
        <TableBody>
          <TableRow>
            <TableCell className="border-r">
              <h2 className="text-xl font-semibold">Cable Traer</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Nombre de Cliente</TableHead>
                    <TableHead>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><input type="checkbox" /></TableCell>
                    <TableCell>Cliente 1</TableCell>
                    <TableCell>$100</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><input type="checkbox" /></TableCell>
                    <TableCell>Cliente 2</TableCell>
                    <TableCell>$200</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableCell>
            <TableCell className="border-r">
              <h2 className="text-xl font-semibold">Cuenta Madre</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Nombre de Cliente</TableHead>
                    <TableHead>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><input type="checkbox" /></TableCell>
                    <TableCell>Cliente 3</TableCell>
                    <TableCell>$300</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><input type="checkbox" /></TableCell>
                    <TableCell>Cliente 4</TableCell>
                    <TableCell>$400</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableCell>
            <TableCell>
              <h2 className="text-xl font-semibold">Cable Llevar</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Nombre de Cliente</TableHead>
                    <TableHead>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><input type="checkbox" /></TableCell>
                    <TableCell>Cliente 5</TableCell>
                    <TableCell>$500</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><input type="checkbox" /></TableCell>
                    <TableCell>Cliente 6</TableCell>
                    <TableCell>$600</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="mt-4">
        <button className="px-4 py-2 bg-blue-500 text-white rounded">Conciliar</button>
      </div>
    </div>
  );
}
