import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, RefreshCw, Filter, X, Search, ArrowRightLeft, TrendingUp, TrendingDown, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBasedRender } from "@/components/RoleBasedRender";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPacotes,
  fetchProdutos,
  createLote,
  createPacote,
  deletePacote,
  updatePacoteStatus,
  fetchMovimentacoes,
  type Movimentacao,
  type TipoMovimentacao,
  type Pacote,
  type PacoteStatus,
} from "@/lib/adminService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mapeamento de status do banco → rótulo legível + cor
const STATUS_CONFIG: Record<PacoteStatus, { label: string; color: string }> = {
  EM_ESTOQUE:  { label: "Em Estoque",  color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20" },
  SEPARADO:    { label: "Separado",    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20" },
  EXPEDIDO:    { label: "Expedido",    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20" },
};

const ALL_STATUSES = Object.entries(STATUS_CONFIG) as [PacoteStatus, { label: string; color: string }][];

export function InventoryPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoLote, setNovoLote] = useState({ codigo_lote: "", id_produto: "", data_validade: "" });
  const [currentPage, setCurrentPage] = useState(1);
  // Mapa de status local para feedback otimista imediato por linha
  const [localStatus, setLocalStatus] = useState<Record<number, PacoteStatus>>({});

  // Estados dos Filtros
  const [searchId, setSearchId] = useState("");
  const [filterProduto, setFilterProduto] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterValidade, setFilterValidade] = useState<string>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Contador de filtros ativos
  const activeFiltersCount = 
    (filterProduto !== "ALL" ? 1 : 0) + 
    (filterStatus !== "ALL" ? 1 : 0) + 
    (filterValidade !== "ALL" ? 1 : 0);

  const clearFilters = () => {
    setSearchId("");
    setFilterProduto("ALL");
    setFilterStatus("ALL");
    setFilterValidade("ALL");
  };

  // Fonte de dados: /api/pacote (pacote → lote → produto), com refetch automático na montagem
  const { data: pacotes, isLoading, refetch } = useQuery({
    queryKey: ['pacotes'],
    queryFn: fetchPacotes,
    staleTime: 0,          // sempre buscar dados frescos ao montar
    refetchOnMount: true,  // busca ao montar a tela
  });

  const { data: produtos } = useQuery({
    queryKey: ['produtos'],
    queryFn: fetchProdutos,
  });

  // Estados para filtros do histórico de movimentações
  const [histTipo, setHistTipo] = useState<string>("ALL");
  const [histDataInicio, setHistDataInicio] = useState("");
  const [histDataFim, setHistDataFim] = useState("");

  const { data: movimentacoes, isLoading: isLoadingMovs, refetch: refetchMovs } = useQuery({
    queryKey: ['movimentacoes', histTipo, histDataInicio, histDataFim],
    queryFn: () => fetchMovimentacoes({
      tipo: histTipo !== "ALL" ? histTipo as TipoMovimentacao : undefined,
      data_inicio: histDataInicio || undefined,
      data_fim: histDataFim || undefined,
    }),
    staleTime: 0,
  });

  // Mutação: atualiza pacote.status via PATCH /api/pacote/:id/status
  const updateStatusMutation = useMutation({
    mutationFn: updatePacoteStatus,
    onSuccess: (updatedPacote) => {
      // Atualiza o cache cirurgicamente sem re-fetch
      queryClient.setQueryData(['pacotes'], (old: Pacote[] | undefined) =>
        old
          ? old.map((p) => (p.id_pacote === updatedPacote.id_pacote ? updatedPacote : p))
          : old
      );
      // Limpa o override local — o cache já tem o valor correto do servidor
      setLocalStatus((prev) => {
        const next = { ...prev };
        delete next[updatedPacote.id_pacote];
        return next;
      });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (err: any, variables) => {
      // Reverte o optimistic update em caso de erro
      setLocalStatus((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      const msg = err?.response?.data?.erro || err?.message || "Erro ao atualizar status";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePacote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes'] });
      toast.success("Pacote excluído com sucesso");
    },
    onError: (err: any) => toast.error(err.response?.data?.erro || "Erro ao excluir pacote"),
  });

  const createMutation = useMutation({
    mutationFn: async (dados: any) => {
      const loteCriado = await createLote(dados);
      // Cria automaticamente um pacote para este lote para que apareça na tabela de estoque
      await createPacote({ id_lote: loteCriado.id_lote });
      return loteCriado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes'] });
      setIsDialogOpen(false);
      setNovoLote({ codigo_lote: "", id_produto: "", data_validade: "" });
      toast.success("Novo lote criado com sucesso");
    },
    onError: (err: any) => toast.error(err.response?.data?.erro || "Erro ao criar novo lote"),
  });

  const handleStatusChange = (pacoteId: number, newStatus: PacoteStatus) => {
    // Feedback otimista imediato — interface responde antes da rede
    setLocalStatus((prev) => ({ ...prev, [pacoteId]: newStatus }));
    updateStatusMutation.mutate({ id: pacoteId, status: newStatus });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este pacote?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoLote.id_produto) {
      toast.error("Por favor, selecione um produto.");
      return;
    }
    createMutation.mutate({
      codigo_lote: novoLote.codigo_lote,
      id_produto: Number(novoLote.id_produto),
      data_validade: novoLote.data_validade ? novoLote.data_validade : undefined,
    });
  };

  // --- Filtragem Frontend ---
  const filteredPacotes = React.useMemo(() => {
    if (!pacotes) return [];
    
    return pacotes.filter((item) => {
      // Filtro de ID Pacote, Lote ou Produto
      if (searchId) {
        const query = searchId.toLowerCase();
        const matchId = item.id_pacote.toString().includes(query);
        const matchLote = item.lote?.codigo_lote?.toLowerCase().includes(query);
        const matchProduto = item.lote?.produto?.nome?.toLowerCase().includes(query);
        
        if (!matchId && !matchLote && !matchProduto) {
          return false;
        }
      }
      
      // Filtro de Produto — compara pelo nome do produto (que é o que o select usa como valor)
      if (filterProduto !== "ALL") {
        const nomeProdutoFiltrado = produtos?.find(p => p.id_produto.toString() === filterProduto)?.nome;
        if (item.lote?.produto?.nome !== nomeProdutoFiltrado) return false;
      }

      // Filtro de Status
      const currentStatus = localStatus[item.id_pacote] ?? item.status;
      if (filterStatus !== "ALL" && currentStatus !== filterStatus) {
        return false;
      }

      // Filtro de Validade
      if (filterValidade !== "ALL") {
        if (!item.lote?.data_validade) return false;
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const validade = new Date(item.lote.data_validade + "T00:00:00");
        const diffDias = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
        
        if (filterValidade === "VENCIDOS" && diffDias >= 0) return false;
        if (filterValidade === "VENCENDO_7_DIAS" && (diffDias < 0 || diffDias > 7)) return false;
      }

      return true;
    });
  }, [pacotes, searchId, filterProduto, filterStatus, filterValidade, localStatus]);

  // --- Paginação ---
  const ITEMS_PER_PAGE = 10;
  const totalItems = filteredPacotes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredPacotes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header fixo acima das abas */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Gestão de Estoque</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os pacotes do inventário e acompanhe o histórico de movimentações.
        </p>
      </div>

      <Tabs defaultValue="estoque" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="estoque" className="gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estoque">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Busca por ID do Pacote */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar ID, Lote ou Produto..."
              className="w-full sm:w-[280px] pl-8 h-9"
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value);
                setCurrentPage(1); // Reseta página ao buscar
              }}
            />
          </div>

          {/* Dropdown de Filtros Avançados */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 relative">
                <Filter className="w-4 h-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-primary text-primary-foreground absolute -top-2 -right-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 bg-card border-border shadow-xl" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filtros de Estoque</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground">
                      Limpar
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Produto</Label>
                  <Select value={filterProduto} onValueChange={(v) => { setFilterProduto(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos os Produtos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os Produtos</SelectItem>
                      {produtos?.map((p) => (
                        <SelectItem key={p.id_produto} value={p.id_produto.toString()}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Status do Pacote</Label>
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos os Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os Status</SelectItem>
                      <SelectItem value="EM_ESTOQUE">Em Estoque</SelectItem>
                      <SelectItem value="SEPARADO">Separado</SelectItem>
                      <SelectItem value="EXPEDIDO">Expedido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Validade (FEFO)</Label>
                  <Select value={filterValidade} onValueChange={(v) => { setFilterValidade(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Qualquer Validade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Qualquer Validade</SelectItem>
                      <SelectItem value="VENCENDO_7_DIAS">Vencendo em até 7 dias</SelectItem>
                      <SelectItem value="VENCIDOS">Vencidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {(activeFiltersCount > 0 || searchId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-2 text-muted-foreground hover:text-foreground px-2"
              title="Limpar todos os filtros"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <RoleBasedRender allowedRoles={["Admin"]}>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Lote
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Criar Novo Lote</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código do Lote</Label>
                    <Input
                      id="codigo"
                      required
                      value={novoLote.codigo_lote}
                      onChange={(e) => setNovoLote({ ...novoLote, codigo_lote: e.target.value })}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produto">Produto</Label>
                    <Select
                      required
                      value={novoLote.id_produto}
                      onValueChange={(val) => setNovoLote({ ...novoLote, id_produto: val })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos?.map((p) => (
                          <SelectItem key={p.id_produto} value={p.id_produto.toString()}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_validade">Data de Validade (Opcional)</Label>
                    <Input
                      id="data_validade"
                      type="date"
                      value={novoLote.data_validade}
                      onChange={(e) => setNovoLote({ ...novoLote, data_validade: e.target.value })}
                      className="bg-input border-border dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-70"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Criando..." : "Criar Lote"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </RoleBasedRender>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="font-medium">Código do Lote</TableHead>
              <TableHead className="font-medium">Produto</TableHead>
              <TableHead className="font-medium">ID Pacote</TableHead>
              <TableHead className="font-medium">Data Validade</TableHead>
              <TableHead className="font-medium w-[180px]">Status</TableHead>
              {role === "Admin" && (
                <TableHead className="font-medium text-right">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : !filteredPacotes || filteredPacotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {(searchId || activeFiltersCount > 0) 
                    ? "Nenhum pacote encontrado com os filtros fornecidos." 
                    : "Nenhum pacote encontrado no sistema."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => {
                // Usa o status local (otimista) se existir, senão usa o dado do servidor
                const currentStatus = (localStatus[item.id_pacote] ?? item.status) as PacoteStatus;
                const statusConfig = STATUS_CONFIG[currentStatus];
                const lote = item.lote;

                return (
                  <TableRow key={item.id_pacote} className="border-border hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {lote?.codigo_lote ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lote?.produto?.nome ?? "Desconhecido"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      #{item.id_pacote}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lote?.data_validade
                        ? new Date(lote.data_validade + "T00:00:00").toLocaleDateString("pt-BR")
                        : <span className="italic text-muted-foreground/50">Não definida</span>}
                    </TableCell>
                    <TableCell>
                      {role === "Admin" ? (
                        <Select
                          value={currentStatus}
                          onValueChange={(val) => handleStatusChange(item.id_pacote, val as PacoteStatus)}
                          disabled={updateStatusMutation.isPending && localStatus[item.id_pacote] !== undefined}
                        >
                          <SelectTrigger className={`h-8 border text-xs font-medium w-[150px] ${statusConfig?.color ?? "bg-muted text-muted-foreground border-border"}`}>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_STATUSES.map(([value, { label }]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className={statusConfig?.color ?? "bg-muted text-muted-foreground border-border"}
                        >
                          {statusConfig?.label ?? currentStatus ?? "Indefinido"}
                        </Badge>
                      )}
                    </TableCell>

                    {role === "Admin" && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id_pacote)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Rodapé da Tabela: Paginação */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border bg-secondary/10 gap-4">
            <div className="text-xs text-muted-foreground">
              Mostrando{" "}
              <span className="font-medium text-foreground">{startIndex + 1}</span> a{" "}
              <span className="font-medium text-foreground">
                {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}
              </span>{" "}
              de <span className="font-medium text-foreground">{totalItems}</span> pacotes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border/50 bg-background hover:bg-secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
              >
                Anterior
              </Button>
              <div className="text-xs font-medium text-muted-foreground px-2">
                Página <span className="text-foreground">{safeCurrentPage}</span> de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border/50 bg-background hover:bg-secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>
      </TabsContent>

      {/* ── ABA: HISTÓRICO DE MOVIMENTAÇÕES ───────────────────────────── */}
      <TabsContent value="historico">
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select value={histTipo} onValueChange={setHistTipo}>
                <SelectTrigger className="h-9 w-[160px] text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Saída">Saída</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Data Início</label>
              <Input type="date" className="h-9 w-[160px]" value={histDataInicio} onChange={(e) => setHistDataInicio(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Data Fim</label>
              <Input type="date" className="h-9 w-[160px]" value={histDataFim} onChange={(e) => setHistDataFim(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => refetchMovs()} disabled={isLoadingMovs}>
              <RefreshCw className={`w-4 h-4 ${isLoadingMovs ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {(histTipo !== "ALL" || histDataInicio || histDataFim) && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setHistTipo("ALL"); setHistDataInicio(""); setHistDataFim(""); }}>
                <X className="w-3.5 h-3.5 mr-1" />Limpar filtros
              </Button>
            )}
          </div>

          {/* Tabela de Movimentações */}
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border">
                  <TableHead className="font-medium">Tipo</TableHead>
                  <TableHead className="font-medium">Pacote</TableHead>
                  <TableHead className="font-medium">Produto / Lote</TableHead>
                  <TableHead className="font-medium">Data / Hora</TableHead>
                  <TableHead className="font-medium">Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMovs ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : !movimentacoes || movimentacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhuma movimentação encontrada para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  movimentacoes.map((mov) => {
                    const tipo = mov.tipo_movimentacao;
                    const tipoColor = tipo === 'Entrada' ? 'text-emerald-500' : tipo === 'Saída' ? 'text-rose-500' : 'text-sky-500';
                    const TipoIcon = tipo === 'Entrada' ? TrendingUp : tipo === 'Saída' ? TrendingDown : ArrowRightLeft;
                    return (
                      <TableRow key={mov.id_movimentacao} className="border-border hover:bg-secondary/30 transition-colors">
                        <TableCell>
                          <span className={`flex items-center gap-1.5 font-medium text-sm ${tipoColor}`}>
                            <TipoIcon className="w-3.5 h-3.5" />
                            {tipo}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">#{mov.id_pacote}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{mov.pacote?.lote?.produto?.nome ?? '—'}</span>
                            <span className="text-xs text-muted-foreground">{mov.pacote?.lote?.codigo_lote ?? ''}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(mov.data_hora).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{mov.usuario?.nome ?? <span className="italic text-muted-foreground/50">Sistema</span>}</span>
                            {mov.usuario?.email && <span className="text-xs text-muted-foreground">{mov.usuario.email}</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>
      </Tabs>
    </div>
  );
}
