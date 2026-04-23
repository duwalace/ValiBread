import { useState } from "react";
import { Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useProdutos } from "@/hooks/useProdutos";
import type { FiltrosDashboard } from "@/hooks/useDashboard";

/** Converte "DD/MM/AAAA" → "AAAA-MM-DD" (ISO 8601 aceito pelo backend) */
const parseDateBR = (v: string): string => {
  const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
};

/** Extrai [inicio, fim] de uma string "DD/MM/AAAA - DD/MM/AAAA" */
const parseRangeField = (raw: string): [string, string] => {
  const parts = raw.split(" - ").map((s) => s.trim());
  return [parseDateBR(parts[0] ?? ""), parseDateBR(parts[1] ?? "")];
};

/** Formata string ISO para exibição BR — usado como placeholder computed */
const hoje = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const FiltersSection = () => {
  const { setFiltros } = useDashboardContext();
  const { data: produtos = [] } = useProdutos();

  const [fabricacao, setFabricacao] = useState("");
  const [validade, setValidade] = useState("");
  const [categoria, setCategoria] = useState("");
  const [loteRfid, setLoteRfid] = useState("");

  const aplicarFiltros = () => {
    const filtros: FiltrosDashboard = {};
    const [fabInicio, fabFim] = parseRangeField(fabricacao);
    const [valInicio, valFim] = parseRangeField(validade);
    if (fabInicio) filtros.dataFabricacaoInicio = fabInicio;
    if (fabFim) filtros.dataFabricacaoFim = fabFim;
    if (valInicio) filtros.dataValidadeInicio = valInicio;
    if (valFim) filtros.dataValidadeFim = valFim;
    if (categoria) filtros.categoria = categoria;
    // Campo unificado: filtra por lote E por epc simultaneamente
    if (loteRfid.trim()) {
      filtros.lote = loteRfid.trim();
      filtros.tagRfid = loteRfid.trim();
    }
    setFiltros(filtros);
  };

  const fieldClass =
    "bg-[hsl(220,15%,18%)] border border-[hsl(220,15%,28%)] rounded-md text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all h-9 px-3 w-full";

  return (
    <div className="border border-border rounded-lg px-5 py-4 mx-6 mt-4">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3 italic">Filtros de Produtos</h3>

      {/* LINHA 1 — Dois date-range pickers ocupando 50% cada */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* De Fabricação */}
        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" /> De Fabricação (DD/MM/AAAA)
          </label>
          <div className="relative">
            <Input
              id="filtro-fabricacao"
              placeholder={`[DD/MM/AAAA] - [DD/MM/AAAA]`}
              value={fabricacao}
              onChange={(e) => setFabricacao(e.target.value)}
              className={fieldClass}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* De Validade */}
        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" /> De Validade
          </label>
          <div className="relative">
            <Input
              id="filtro-validade"
              placeholder={`[DD/MM/AAAA] - [DD/MM/AAAA]`}
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              className={fieldClass}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* LINHA 2 — Categoria (40%) + Lote/RFID (40%) + Botão (20%) */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 2fr 1fr" }}>
        {/* Categoria — dropdown com produtos reais do banco */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
          <select
            id="filtro-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className={fieldClass}
            style={{ appearance: "none" }}
          >
            <option value="">Categoria (ex: Pão de Forma)</option>
            {produtos.map((p: { id_produto: number; nome: string }) => (
              <option key={p.id_produto} value={p.nome}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Lote/RFID — campo unificado que filtra por codigo_lote E epc */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Lote/RFID</label>
          <Input
            id="filtro-lote-rfid"
            placeholder="Digite Lote/RFID... R"
            value={loteRfid}
            onChange={(e) => setLoteRfid(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
            className={fieldClass}
          />
        </div>

        {/* Botão Aplicar */}
        <div className="flex items-end">
          <Button
            id="btn-aplicar-filtros"
            onClick={aplicarFiltros}
            className="w-full h-9 bg-[hsl(210,100%,50%)] hover:bg-[hsl(210,100%,44%)] text-white font-semibold text-sm rounded-md transition-colors"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FiltersSection;
