const inventoryData = [
  {
    tagRfid: "000000...",
    nome: "Pão de Forma Integral 400g",
    lote: "50000A",
    fabricacao: "16/01/2026",
    validade: "19/03/2026",
    status: "9 dias",
    highlight: true,
  },
  {
    tagRfid: "000000...",
    nome: "Panetone 400g",
    lote: "50000A",
    fabricacao: "15/01/2026",
    validade: "19/03/2026",
    status: "9 dias",
    highlight: false,
  },
  {
    tagRfid: "000000...",
    nome: "Pão de Forma Tradicional 400g",
    lote: "50000A",
    fabricacao: "15/01/2026",
    validade: "19/03/2026",
    status: "9 dias",
    highlight: false,
  },
];

const InventoryTableCard = () => {
  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">
        Inventário Ativo (FEFO)
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Tag RFID (Hex)</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Nome de Produto</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Lote</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Data Fabricação</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Data Validade</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventoryData.map((item, index) => (
              <tr
                key={index}
                className={`border-b border-border ${
                  item.highlight ? "bg-warning/20" : ""
                }`}
              >
                <td className="py-2 px-2 text-foreground">{item.tagRfid}</td>
                <td className="py-2 px-2 text-foreground font-medium">{item.nome}</td>
                <td className="py-2 px-2 text-foreground">{item.lote}</td>
                <td className="py-2 px-2 text-foreground">{item.fabricacao}</td>
                <td className="py-2 px-2 text-foreground">{item.validade}</td>
                <td className="py-2 px-2 text-warning font-medium">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTableCard;
