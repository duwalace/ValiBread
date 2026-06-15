import React, { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchProdutos,
  fetchLotesPorProduto,
  cadastrarEtiquetaRfid,
  type RfidScan,
  type Produto,
  type Lote,
} from "@/lib/adminService";
import {
  Wifi,
  WifiOff,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PackagePlus,
  Loader2,
  Tag,
  CalendarClock,
  RefreshCw,
  History,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────

const calcularDiasRestantes = (data?: string): number | null => {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(data + "T00:00:00");
  return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
};

const formatarData = (data?: string) => {
  if (!data) return "Sem validade";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
};

const getBadgeValidade = (dias: number | null) => {
  if (dias === null) return { label: "Sem validade", cls: "bg-muted text-muted-foreground border-border" };
  if (dias < 0) return { label: `Vencido há ${Math.abs(dias)}d`, cls: "bg-red-500/15 text-red-500 border-red-500/30" };
  if (dias <= 3) return { label: `${dias}d restantes ⚠️`, cls: "bg-red-500/15 text-red-500 border-red-500/30" };
  if (dias <= 7) return { label: `${dias}d restantes`, cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
  return { label: `${dias}d restantes`, cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
};

interface HistoricoItem {
  id: string;
  epc: string;
  produto: string;
  lote: string;
  data_validade?: string;
  ts: string;
}

// ── Componente principal ─────────────────────────────────────────

export function CadastroEtiquetaPage() {
  const queryClient = useQueryClient();

  // Estado da conexão WebSocket
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const socketRef = useRef<Socket | null>(null);

  // Leitura atual recebida via WebSocket
  const [leituraAtual, setLeituraAtual] = useState<RfidScan | null>(null);
  const [scanPulse, setScanPulse] = useState(false);

  // Formulário
  const [produtoId, setProdutoId] = useState<string>("");
  const [loteId, setLoteId] = useState<string>("");

  // Histórico da sessão
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  // ── Produtos
  const { data: produtos = [] } = useQuery<Produto[]>({
    queryKey: ["produtos"],
    queryFn: fetchProdutos,
  });

  // ── Lotes do produto selecionado (FEFO: mais próximo do vencimento primeiro)
  const { data: lotes = [], isLoading: isLoadingLotes } = useQuery<Lote[]>({
    queryKey: ["lotes-produto", produtoId],
    queryFn: () => fetchLotesPorProduto(Number(produtoId)),
    enabled: !!produtoId,
  });

  // Reset lote ao trocar produto
  useEffect(() => {
    setLoteId("");
  }, [produtoId]);

  // ── Lote selecionado (para exibir informações)
  const loteSelecionado = lotes.find((l) => String(l.id_lote) === loteId);
  const diasRestantes = calcularDiasRestantes(loteSelecionado?.data_validade);
  const badgeValidade = getBadgeValidade(diasRestantes);

  // ── WebSocket — conecta ao backend (porta 3000)
  useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;
    setSocketStatus("connecting");

    socket.on("connect", () => {
      setSocketStatus("connected");
      console.log("[CadastroRFID] Socket conectado:", socket.id);
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setSocketStatus("disconnected");
    });

    // Evento principal: novo EPC lido pelo ESP32
    socket.on("rfid:scan", (payload: RfidScan) => {
      console.log("[CadastroRFID] rfid:scan recebido:", payload);
      setLeituraAtual(payload);
      // Efeito de pulso na UI
      setScanPulse(true);
      setTimeout(() => setScanPulse(false), 800);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Mutação de cadastro
  const mutation = useMutation({
    mutationFn: cadastrarEtiquetaRfid,
    onSuccess: (resultado) => {
      // Adiciona ao histórico da sessão
      const produto = produtos.find((p) => String(p.id_produto) === produtoId);
      const item: HistoricoItem = {
        id: String(resultado.pacote.id_pacote),
        epc: leituraAtual!.epc,
        produto: produto?.nome ?? "—",
        lote: loteSelecionado?.codigo_lote ?? "—",
        data_validade: loteSelecionado?.data_validade,
        ts: new Date().toLocaleTimeString("pt-BR"),
      };
      setHistorico((prev) => [item, ...prev].slice(0, 20));

      // Reseta formulário
      setLeituraAtual(null);
      setProdutoId("");
      setLoteId("");

      // Invalida caches relacionados para atualizar o Dashboard
      queryClient.invalidateQueries({ queryKey: ["pacotes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });

      toast.success(`✅ Tag ${resultado.etiqueta.epc} cadastrada! Pacote #${resultado.pacote.id_pacote} criado.`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.erro || err?.message || "Erro ao cadastrar etiqueta";
      toast.error(msg);
    },
  });

  const handleConfirmar = useCallback(() => {
    if (!leituraAtual || !loteId) return;
    mutation.mutate({ epc: leituraAtual.epc, id_lote: Number(loteId) });
  }, [leituraAtual, loteId, mutation]);

  const podeConfirmar =
    !!leituraAtual && !leituraAtual.ja_cadastrado && !!loteId && !mutation.isPending;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-primary" />
          Cadastro de Etiquetas RFID
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aproxime a tag ao leitor. Selecione produto e lote para confirmar o cadastro.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Col 1-2: Painel de scan + formulário ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Status da conexão WebSocket */}
          <div className="flex items-center gap-2">
            {socketStatus === "connected" ? (
              <><Wifi className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">Conectado ao servidor — aguardando leitura</span></>
            ) : socketStatus === "connecting" ? (
              <><Loader2 className="w-4 h-4 text-amber-500 animate-spin" /><span className="text-xs text-amber-500 font-medium">Conectando ao servidor...</span></>
            ) : (
              <><WifiOff className="w-4 h-4 text-destructive" /><span className="text-xs text-destructive font-medium">Desconectado — verifique o backend</span></>
            )}
          </div>

          {/* Painel de leitura */}
          <div
            className={`
              relative border rounded-xl p-6 transition-all duration-300 bg-card
              ${scanPulse ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10" : "border-border"}
              ${leituraAtual && !leituraAtual.ja_cadastrado ? "border-primary/50" : ""}
              ${leituraAtual?.ja_cadastrado ? "border-amber-500/50" : ""}
            `}
          >
            {/* Indicador animado de "aguardando" */}
            {!leituraAtual && (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-primary/20 flex items-center justify-center">
                    <ScanLine className="w-9 h-9 text-primary/40" />
                  </div>
                  <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Aproxime a tag RFID ao leitor para iniciar o cadastro
                </p>
              </div>
            )}

            {/* Leitura recebida */}
            {leituraAtual && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground uppercase tracking-widest">EPC Lido</span>
                    </div>
                    <p className="font-mono text-xl font-bold text-foreground tracking-wider">
                      {leituraAtual.epc}
                    </p>
                  </div>
                  {leituraAtual.ja_cadastrado ? (
                    <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 shrink-0">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Já cadastrada
                    </Badge>
                  ) : (
                    <Badge className="bg-primary/15 text-primary border-primary/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Nova tag
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span><Clock className="w-3 h-3 inline mr-1" />{new Date(leituraAtual.data_hora).toLocaleString("pt-BR")}</span>
                  {leituraAtual.rssi !== null && <span>RSSI: {leituraAtual.rssi} dBm</span>}
                  <span>Leitor #{leituraAtual.id_leitor}</span>
                </div>

                {/* Aviso se já cadastrada */}
                {leituraAtual.ja_cadastrado && leituraAtual.pacote && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-600 dark:text-amber-400">
                    Esta tag já está vinculada ao <strong>Pacote #{leituraAtual.pacote.id_pacote}</strong>
                    {leituraAtual.pacote.lote?.produto?.nome && (
                      <> — {leituraAtual.pacote.lote.produto.nome} / {leituraAtual.pacote.lote.codigo_lote}</>
                    )}
                  </div>
                )}

                {/* Botão limpar */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-7 px-2 text-xs"
                  onClick={() => { setLeituraAtual(null); setProdutoId(""); setLoteId(""); }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Aguardar nova leitura
                </Button>
              </div>
            )}
          </div>

          {/* Formulário de associação — visível apenas com tag nova */}
          {leituraAtual && !leituraAtual.ja_cadastrado && (
            <div className="border border-border rounded-xl bg-card p-6 space-y-5">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-primary" />
                Associar ao Estoque
              </h3>

              {/* Select Produto */}
              <div className="space-y-2">
                <Label htmlFor="select-produto">Produto</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger id="select-produto" className="bg-input border-border">
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id_produto} value={String(p.id_produto)}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Lote (FEFO) */}
              <div className="space-y-2">
                <Label htmlFor="select-lote">
                  Lote{" "}
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    (ordenado por validade — FEFO)
                  </span>
                </Label>
                <Select value={loteId} onValueChange={setLoteId} disabled={!produtoId || isLoadingLotes}>
                  <SelectTrigger id="select-lote" className="bg-input border-border">
                    {isLoadingLotes
                      ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Carregando lotes...</span>
                      : <SelectValue placeholder={produtoId ? "Selecione o lote..." : "Selecione um produto primeiro"} />
                    }
                  </SelectTrigger>
                  <SelectContent>
                    {lotes.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        Nenhum lote encontrado para este produto.
                      </div>
                    )}
                    {lotes.map((l) => {
                      const dias = calcularDiasRestantes(l.data_validade);
                      const badge = getBadgeValidade(dias);
                      return (
                        <SelectItem key={l.id_lote} value={String(l.id_lote)}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <span className="font-mono text-xs">{l.codigo_lote}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Preview do lote selecionado */}
                {loteSelecionado && (
                  <div className="rounded-lg bg-secondary/50 border border-border p-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      Fabricação: <strong className="text-foreground ml-1">{formatarData(loteSelecionado.data_fabricacao)}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      Validade: <strong className="text-foreground ml-1">{formatarData(loteSelecionado.data_validade)}</strong>
                    </span>
                    <Badge variant="outline" className={badgeValidade.cls}>
                      {badgeValidade.label}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Botão confirmar */}
              <Button
                className="w-full gap-2 h-11 text-base font-semibold"
                onClick={handleConfirmar}
                disabled={!podeConfirmar}
                id="btn-confirmar-cadastro"
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Cadastrando...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" />Confirmar Cadastro</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ── Col 3: Histórico da sessão ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <History className="w-4 h-4" />
            Cadastros desta sessão
          </h3>

          {historico.length === 0 ? (
            <div className="border border-border rounded-xl bg-card p-6 flex flex-col items-center gap-3 text-center text-muted-foreground text-xs">
              <PackagePlus className="w-8 h-8 opacity-30" />
              <p>Nenhum cadastro realizado ainda.</p>
              <p className="opacity-70">Os registros confirmados aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {historico.map((item, i) => {
                const dias = calcularDiasRestantes(item.data_validade);
                const badge = getBadgeValidade(dias);
                return (
                  <div
                    key={item.id + i}
                    className="border border-border rounded-lg bg-card p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground truncate">
                        {item.epc}
                      </span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                        OK
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-tight">{item.produto}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">{item.lote}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">{item.ts}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
