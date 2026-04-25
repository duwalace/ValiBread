import { useState, useMemo, useRef, useEffect } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Loader2, AlertCircle, ArrowUpDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { ItemInventario } from "@/hooks/useDashboard";

const POR_PAGINA = 10;

type OrdemKey =
  | "validade_asc"
  | "validade_desc"
  | "fabricacao_asc"
  | "fabricacao_desc"
  | "nome_asc"
  | "nome_desc";

const OPCOES_ORDEM: { key: OrdemKey; label: string }[] = [
  { key: "validade_asc",    label: "Validade: mais próxima primeiro" },
  { key: "validade_desc",   label: "Validade: mais distante primeiro" },
  { key: "fabricacao_asc",  label: "Fabricação: mais antiga primeiro" },
  { key: "fabricacao_desc", label: "Fabricação: mais recente primeiro" },
  { key: "nome_asc",        label: "Produto: A → Z" },
  { key: "nome_desc",       label: "Produto: Z → A" },
];

/** Ordena o inventário conforme a chave selecionada */
const ordenar = (lista: ItemInventario[], key: OrdemKey): ItemInventario[] => {
  return [...lista].sort((a, b) => {
    switch (key) {
      case "validade_asc":
        return (a.diasRestantes ?? 99999) - (b.diasRestantes ?? 99999);
      case "validade_desc":
        return (b.diasRestantes ?? -1) - (a.diasRestantes ?? -1);
      case "fabricacao_asc":
        return (a.dataFabricacao ?? "").localeCompare(b.dataFabricacao ?? "");
      case "fabricacao_desc":
        return (b.dataFabricacao ?? "").localeCompare(a.dataFabricacao ?? "");
      case "nome_asc":
        return (a.nome ?? "").localeCompare(b.nome ?? "");
      case "nome_desc":
        return (b.nome ?? "").localeCompare(a.nome ?? "");
      default:
        return 0;
    }
  });
};

/** Retorna classes de highlight e cor do status baseado nos dias restantes */
const getRowStyle = (dias: number | null) => {
  if (dias === null) return { row: "", status: "text-muted-foreground" };
  if (dias <= 3)
    return { row: "bg-[rgba(255,60,60,0.15)]", status: "text-[hsl(0,80%,62%)] font-semibold" };
  if (dias <= 9)
    return { row: "bg-[rgba(255,200,0,0.13)]", status: "text-[hsl(45,100%,58%)] font-semibold" };
  if (dias > 30)
    return { row: "", status: "text-[hsl(142,55%,50%)]" };
  return { row: "", status: "text-muted-foreground" };
};

const InventoryTableCard = () => {
  const { filtros } = useDashboardContext();
  const { data, isLoading, isError } = useDashboard(filtros);

  const [ordemAtual, setOrdemAtual] = useState<OrdemKey>("validade_asc");
  const [pagina, setPagina] = useState(1);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const inventario = data?.inventarioAtivoFEFO ?? [];

  const inventarioOrdenado = useMemo(
    () => ordenar(inventario, ordemAtual),
    [inventario, ordemAtual]
  );

  const totalPaginas = Math.max(1, Math.ceil(inventarioOrdenado.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const itensPagina = inventarioOrdenado.slice(inicio, inicio + POR_PAGINA);

  const selecionarOrdem = (key: OrdemKey) => {
    setOrdemAtual(key);
    setPagina(1); // Volta para página 1 ao trocar ordenação
    setDropdownAberto(false);
  };

  return (
    <div className="h-full border border-border/50 shadow-sm rounded-xl p-6 bg-card flex flex-col">
      {/* Cabeçalho do card com botão de ordenação */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Inventário Ativo (FEFO)
        </h3>

        {/* Dropdown de ordenação */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="btn-ordenar-inventario"
            onClick={() => setDropdownAberto((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors bg-secondary/60 hover:bg-secondary"
          >
            <ArrowUpDown className="w-3 h-3" />
            Ordenar
          </button>

          {dropdownAberto && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-[240px] border border-border rounded-lg bg-card shadow-xl overflow-hidden">
              {OPCOES_ORDEM.map((op) => (
                <button
                  key={op.key}
                  onClick={() => selecionarOrdem(op.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[11px] text-left transition-colors
                    ${ordemAtual === op.key
                      ? "bg-primary/15 text-primary"
                      : "text-foreground/80 hover:bg-secondary"
                    }`}
                >
                  <span>{op.label}</span>
                  {ordemAtual === op.key && <Check className="w-3 h-3 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando inventário...</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          Erro ao carregar inventário.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col flex-1">
          {inventarioOrdenado.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item no inventário.</p>
          ) : (
            <>
              {/* Tabela */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Tag RFID (Hex)", "Nome de Produto", "Lote", "Data Fabricação", "Data Validade", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left py-2 px-2 text-muted-foreground font-medium whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {itensPagina.map((item, index) => {
                      const { row, status: statusClass } = getRowStyle(item.diasRestantes);
                      const epcDisplay =
                        item.tagRfid && item.tagRfid !== "Desconhecida"
                          ? `${item.tagRfid.substring(0, 7)}...`
                          : "—";

                      return (
                        <tr
                          key={`${inicio + index}-${item.lote}`}
                          className={`border-b border-border/50 transition-colors ${row}`}
                        >
                          <td className="py-1.5 px-2 font-mono text-[10px] text-foreground/80">
                            {epcDisplay}
                          </td>
                          <td className="py-1.5 px-2 text-foreground font-medium">{item.nome}</td>
                          <td className="py-1.5 px-2 text-foreground/80">{item.lote || "—"}</td>
                          <td className="py-1.5 px-2 text-foreground/70">{item.dataFabricacao || "—"}</td>
                          <td className="py-1.5 px-2 text-foreground/70">{item.dataValidade || "—"}</td>
                          <td className={`py-1.5 px-2 ${statusClass}`}>
                            {item.diasRestantes !== null ? `${item.diasRestantes} dias` : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                  <button
                    id="btn-pagina-anterior"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-secondary"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Anterior
                  </button>

                  <span className="text-[11px] text-muted-foreground">
                    Página{" "}
                    <span className="text-foreground font-medium">{paginaAtual}</span>
                    {" "}de{" "}
                    <span className="text-foreground font-medium">{totalPaginas}</span>
                    {" "}
                    <span className="text-muted-foreground/60">
                      ({inventarioOrdenado.length} itens)
                    </span>
                  </span>

                  <button
                    id="btn-proxima-pagina"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-secondary"
                  >
                    Próximo
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryTableCard;
