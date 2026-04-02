import { FileDown, FileSpreadsheet, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CustomReportsCard = () => {
  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">
        Painel de Relatórios Personalizados
      </h3>

      <div className="space-y-4">
        {/* Tipo de Relatório */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tipo de Relatório</label>
          <select className="w-full h-9 rounded-md border border-border bg-secondary text-foreground text-sm px-3">
            <option>(Entradas, Saídas, Perdas)</option>
          </select>
        </div>

        {/* Período */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Período</label>
          <div className="relative">
            <Input
              placeholder="[DD/MM/AAAA]"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm pr-8"
            />
            <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Botão Gerar */}
        <Button className="w-full bg-success text-success-foreground hover:bg-success/90">
          Gerar Pré-visualização
        </Button>

        {/* Exportar */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <FileDown className="w-3.5 h-3.5" /> Exportar PDF
          </button>
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomReportsCard;
