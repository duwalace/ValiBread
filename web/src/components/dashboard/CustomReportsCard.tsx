import { useState } from "react";
import {
  FileDown,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

// ── Tipos ──────────────────────────────────────────────────────────
type TipoRelatorio = "TODOS" | "Entrada" | "Saída" | "Transferência" | "Perda";

interface Movimentacao {
  id_movimentacao: number;
  tipo_movimentacao: string;
  data_hora: string;
  // movimentacao_estoque → pacote → { rfid_etiqueta, lote → produto }
  pacote?: {
    id_pacote: number;
    rfid_etiqueta?: { epc: string; status: string };
    lote?: {
      codigo_lote: string;
      produto?: { nome: string };
    };
  };
  leitor_rfid?: {
    codigo_equipamento: string;
    localizacao: string;
  };
}

interface PreviewData {
  total: number;
  resumo: Record<string, number>;
  movimentacoes: Movimentacao[];
}

const formatarDataHora = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const corPorTipo = (tipo: string) => {
  switch (tipo) {
    case "Entrada":      return "text-emerald-400";
    case "Saída":        return "text-rose-400";
    case "Transferência": return "text-sky-400";
    case "Perda":        return "text-amber-400";
    default:             return "text-muted-foreground";
  }
};

const IconePorTipo = ({ tipo }: { tipo: string }) => {
  switch (tipo) {
    case "Entrada":       return <TrendingUp className="w-3 h-3 text-emerald-400" />;
    case "Saída":         return <TrendingDown className="w-3 h-3 text-rose-400" />;
    case "Transferência": return <ArrowLeftRight className="w-3 h-3 text-sky-400" />;
    case "Perda":         return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    default:              return null;
  }
};

// ── Componente principal ───────────────────────────────────────────
const CustomReportsCard = () => {
  const [tipo, setTipo]           = useState<TipoRelatorio>("TODOS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim]       = useState("");
  const [erroData, setErroData]     = useState<string | null>(null);

  const [preview, setPreview]       = useState<PreviewData | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroApi, setErroApi]       = useState<string | null>(null);

  // ── Validação de período ───────────────────────────────────────
  const validarPeriodo = (): boolean => {
    if (!dataInicio || !dataFim) {
      setErroData("Preencha as duas datas do período.");
      return false;
    }
    // Compara como objetos Date reais — sem risco de comparação de string
    if (new Date(dataFim) < new Date(dataInicio)) {
      setErroData("Data Fim não pode ser anterior à Data Início.");
      return false;
    }
    setErroData(null);
    return true;
  };

  // ── Gerar pré-visualização ──────────────────────────────
  /**
   * Busca o preview do relatório.
   * Aceita `tipoOverride` para evitar closure stale quando chamada
   * logo após `setTipo()` (antes do React reconciliar o estado).
   */
  const gerarPreview = async (tipoOverride?: TipoRelatorio) => {
    setErroApi(null);
    if (!validarPeriodo()) return;

    const tipoAtual = tipoOverride ?? tipo;

    setCarregando(true);
    try {
      const params: Record<string, string> = {
        dataInicio,
        dataFim,
      };
      if (tipoAtual !== "TODOS") params.tipo = tipoAtual;

      const { data } = await api.get<PreviewData>("/api/relatorio/preview", { params });
      setPreview(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        "Erro ao gerar pré-visualização.";
      setErroApi(msg);
      setPreview(null);
    } finally {
      setCarregando(false);
    }
  };

  /**
   * Atualiza o tipo selecionado e, se já houver datas preenchidas,
   * recarrega o preview automaticamente (sem precisar clicar no botão).
   */
  const handleTipoChange = (novoTipo: TipoRelatorio) => {
    setTipo(novoTipo);
    if (dataInicio && dataFim) {
      // Passa novoTipo diretamente para evitar closure stale
      gerarPreview(novoTipo);
    } else {
      // Sem datas, limpa o preview anterior
      setPreview(null);
    }
  };

  // ── Exportação ───────────────────────────────────────────────────
  const [exportando, setExportando] = useState<"PDF" | "EXCEL" | null>(null);

  const handleExport = async (formato: "PDF" | "EXCEL") => {
    if (!validarPeriodo()) return;

    try {
      setExportando(formato);
      const token = localStorage.getItem("token");

      const params: Record<string, string> = {
        formato,
        dataInicio: dataInicio,   // já em YYYY-MM-DD
        dataFim: dataFim,
      };
      if (tipo !== "TODOS") params.tipo = tipo;

      const queryParams = new URLSearchParams(params);

      // Usamos fetch pois o retorno é um blob (arquivo físico) e não JSON
      const response = await fetch(`http://localhost:3000/api/export/inventario?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao exportar o relatório');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_movimentacao.${formato === 'EXCEL' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error(error);
      setErroApi(`Erro ao exportar relatório em ${formato}.`);
    } finally {
      setExportando(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  const inputCls =
    "bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm pr-8 h-9";

  return (
    <div className="h-full border border-border/50 shadow-sm rounded-xl p-6 bg-card flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Painel de Relatórios Personalizados
      </h3>

      {/* Tipo de Relatório */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Tipo de Relatório</label>
        <select
          id="relatorio-tipo"
          value={tipo}
          onChange={(e) => handleTipoChange(e.target.value as TipoRelatorio)}
          className="w-full h-9 rounded-md border border-border bg-secondary text-foreground text-sm px-3"
        >
          <option value="TODOS">Todos os tipos</option>
          <option value="Entrada">Entradas</option>
          <option value="Saída">Saídas</option>
          <option value="Transferência">Transferências</option>
          <option value="Perda">Perdas</option>
        </select>
      </div>

      {/* Período — dois campos lado a lado com labels acima */}
      <div>
        <span className="text-xs text-muted-foreground mb-1.5 block">Período</span>
        <div className="grid grid-cols-2 gap-3">
          {/* Data Início */}
          <div>
            <label htmlFor="relatorio-data-inicio" className="text-[10px] text-muted-foreground mb-1 block pl-0.5">
              Data Início
            </label>
            <Input
              id="relatorio-data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setErroData(null); setPreview(null); }}
              className={inputCls + " dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-70"}
            />
          </div>

          {/* Data Fim */}
          <div>
            <label htmlFor="relatorio-data-fim" className="text-[10px] text-muted-foreground mb-1 block pl-0.5">
              Data Fim
            </label>
            <Input
              id="relatorio-data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setErroData(null); setPreview(null); }}
              className={inputCls + " dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-70"}
            />
          </div>
        </div>

        {/* Erro de validação de período */}
        {erroData && (
          <p className="flex items-center gap-1 text-[11px] text-destructive mt-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {erroData}
          </p>
        )}
      </div>

      {/* Botão Gerar */}
      <Button
        id="btn-gerar-relatorio"
        onClick={() => gerarPreview()}
        disabled={carregando}
        className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold"
      >
        {carregando ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
        ) : (
          "Gerar Pré-visualização"
        )}
      </Button>

      {/* Erro da API */}
      {erroApi && (
        <div className="flex items-start gap-1.5 text-[11px] text-destructive bg-destructive/10 rounded p-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {erroApi}
        </div>
      )}

      {/* Área de pré-visualização */}
      {preview && !carregando && (
        <div className="border border-border rounded-md overflow-hidden text-[11px]">
          {/* Cabeçalho do preview */}
          <div className="bg-secondary/70 px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-1.5 mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-foreground">
                {tipo === "TODOS" ? "Todas as Movimentações" : tipo}
              </span>
            </div>
            <p className="text-muted-foreground">
              Período:{" "}
              <span className="text-foreground">
                {dataInicio ? new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
              </span>
              {" → "}
              <span className="text-foreground">
                {dataFim ? new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
              </span>
            </p>
          </div>

          {/* Cards de resumo — grid de 4 colunas */}
          <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
            <div className="px-1.5 py-2.5 text-center">
              <p className="text-base font-bold text-emerald-400 leading-tight">{preview.resumo["Entrada"] ?? 0}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Entradas</p>
            </div>
            <div className="px-1.5 py-2.5 text-center">
              <p className="text-base font-bold text-rose-400 leading-tight">{preview.resumo["Saída"] ?? 0}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Saídas</p>
            </div>
            <div className="px-1.5 py-2.5 text-center">
              <p className="text-base font-bold text-sky-400 leading-tight">{preview.resumo["Transferência"] ?? 0}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Transf.</p>
            </div>
            <div className="px-1.5 py-2.5 text-center">
              <p className="text-base font-bold text-amber-400 leading-tight">{preview.resumo["Perda"] ?? 0}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Perdas</p>
            </div>
          </div>

          {/* Lista de movimentações */}
          {preview.movimentacoes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma movimentação no período selecionado.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-1.5 text-muted-foreground font-medium w-5"></th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Tipo</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Produto / Lote</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.movimentacoes.map((m) => {
                    const nomeProduto = m.pacote?.lote?.produto?.nome ?? "—";
                    const codigoLote  = m.pacote?.lote?.codigo_lote ?? "—";
                    return (
                      <tr
                        key={m.id_movimentacao}
                        className="border-b border-border/40 hover:bg-secondary/40 transition-colors"
                      >
                        <td className="px-3 py-1.5">
                          <IconePorTipo tipo={m.tipo_movimentacao} />
                        </td>
                        <td className={`px-2 py-1.5 font-medium ${corPorTipo(m.tipo_movimentacao)}`}>
                          {m.tipo_movimentacao}
                        </td>
                        <td className="px-2 py-1.5 text-foreground/80">
                          <span className="font-medium text-foreground">{nomeProduto}</span>
                          {codigoLote !== "—" && (
                            <span className="text-muted-foreground ml-1">({codigoLote})</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                          {formatarDataHora(m.data_hora)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {preview.total === 100 && (
                <p className="text-center text-muted-foreground py-2 text-[10px]">
                  Exibindo os 100 registros mais recentes. Exporte para ver todos.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Exportar */}
      <div className="flex justify-center gap-5 text-xs text-muted-foreground pt-1 border-t border-border/50 mt-auto">
        <button 
          onClick={() => handleExport("PDF")}
          disabled={exportando !== null}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors py-0.5 disabled:opacity-50"
        >
          {exportando === "PDF" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} 
          Exportar PDF
        </button>
        <button 
          onClick={() => handleExport("EXCEL")}
          disabled={exportando !== null}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors py-0.5 disabled:opacity-50"
        >
          {exportando === "EXCEL" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} 
          Exportar Excel
        </button>
      </div>
    </div>
  );
};

export default CustomReportsCard;
