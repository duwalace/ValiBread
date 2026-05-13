import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Loader2, AlertCircle } from "lucide-react";

// ─── Paleta Warm Industrial (tokens de index.css) ───────────────────────────
const COR_3_DIAS  = "hsl(0, 72%, 51%)";    // Crítico
const COR_5_DIAS  = "hsl(45, 100%, 51%)";  // Alerta
const COR_7_DIAS  = "hsl(30, 10%, 38%)";   // Normal
const COR_VENCIDO = "hsl(0, 55%, 28%)";    // Vencido
const COR_EIXO    = "hsl(30, 10%, 52%)";
const COR_BG_BAR  = "hsl(30, 10%, 14%)";   // Fundo da barra (track)

// ─── Tooltip Customizado (Craft) ───────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border/60 shadow-xl rounded-md px-3 py-2 text-xs">
        <p className="font-semibold text-foreground mb-1">{data.nomeCompleto}</p>
        <p className="text-muted-foreground flex items-center gap-2">
          <span 
            className="w-2 h-2 rounded-full inline-block" 
            style={{ backgroundColor: data.cor }}
          />
          <span className="font-bold text-foreground">{data.quantidade}</span> itens
        </p>
      </div>
    );
  }
  return null;
};

// ─── Card ────────────────────────────────────────────────────────────────────
const ExpiryAlertCard = () => {
  const { filtros } = useDashboardContext();
  const { data, isLoading, isError } = useDashboard(filtros);

  const totalCriticos  = data?.alertaValidade?.totalCriticos ?? 0;
  const totalVencidos  = data?.itensVencidos?.totalVencidos   ?? 0;
  const gruposValidade = data?.alertaValidade?.grupos         ?? [];

  const getQtd = (label: string) =>
    gruposValidade.find((g) => g.nome === label)?.quantidade ?? 0;

  // Simplificamos os nomes no Eixo X (removendo redundâncias para design mais limpo)
  const validadeData = [
    { nome: "3 dias", nomeCompleto: "3 dias restantes", quantidade: getQtd("3 dias restantes"), cor: COR_3_DIAS  },
    { nome: "5 dias", nomeCompleto: "5 dias restantes", quantidade: getQtd("5 dias restantes"), cor: COR_5_DIAS  },
    { nome: "7 dias", nomeCompleto: "7 dias restantes", quantidade: getQtd("7 dias restantes"), cor: COR_7_DIAS  },
  ];

  const vencidosData = [
    { nome: "Vencidos", nomeCompleto: "Itens Vencidos", quantidade: totalVencidos, cor: COR_VENCIDO },
  ];

  // Escalas responsivas e dinâmicas
  const maxValValidade = Math.max(...validadeData.map((d) => d.quantidade), 0);
  const maxValVencidos = Math.max(...vencidosData.map((d) => d.quantidade), 0);

  const getResponsiveTicks = (maxValue: number) => {
    if (maxValue === 0) return [0, 5];
    
    let step;
    let maxTick;

    if (maxValue <= 10) {
      step = 2;
      // Garante que o limite seja pelo menos 10, com respiro se o valor for 9 ou 10
      maxTick = maxValue > 8 ? 12 : 10;
    } else if (maxValue <= 30) {
      step = 5;
      maxTick = Math.ceil(maxValue / step) * step + step;
    } else if (maxValue < 100) {
      step = 10;
      maxTick = Math.ceil(maxValue / step) * step + step;
    } else if (maxValue < 500) {
      step = 50;
      maxTick = Math.ceil(maxValue / step) * step + step;
    } else if (maxValue < 1000) {
      step = 100;
      maxTick = Math.ceil(maxValue / step) * step + step;
    } else {
      step = 200;
      maxTick = Math.ceil(maxValue / step) * step + step;
    }
    
    return Array.from({ length: Math.floor(maxTick / step) + 1 }, (_, i) => i * step);
  };

  const ticksValidade = getResponsiveTicks(maxValValidade);
  const ticksVencidos = getResponsiveTicks(maxValVencidos);

  return (
    <div className="h-full border border-border/50 shadow-sm rounded-xl p-6 bg-card flex flex-col relative overflow-hidden">
      
      {/* Subtle glow effect behind the card header to give depth without harsh shadows */}
      <div className="absolute top-0 left-1/4 right-1/4 h-12 bg-primary/5 blur-3xl pointer-events-none rounded-full" />

      {/* ── Cabeçalho Principal ── */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Painel de Alertas
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-0.5">
            Alerta de Validade — Próximos 7 Dias
          </h3>
        </div>

        <div className="flex items-center gap-4 pt-0.5">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="w-2 h-2 rounded-full inline-block ring-2 ring-background"
              style={{ background: COR_5_DIAS, boxShadow: `0 0 8px ${COR_5_DIAS}40` }}
            />
            <span className="font-bold text-foreground tabular-nums">{totalCriticos}</span>
            &nbsp;críticos
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="w-2 h-2 rounded-full inline-block ring-2 ring-background"
              style={{ background: COR_VENCIDO }}
            />
            <span className="font-bold text-foreground tabular-nums">{totalVencidos}</span>
            &nbsp;vencidos
          </span>
        </div>
      </div>

      {/* ── Estados ── */}
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          Erro ao carregar alertas.
        </div>
      )}

      {/* ── Container Duplo: Validade e Vencidos ── */}
      {!isLoading && !isError && (
        <div className="flex-1 flex gap-4 min-h-[120px] relative z-10">

          {/* Card Interno 1: Próximos 7 Dias */}
          <div className="flex-1 bg-secondary/30 border border-border/40 rounded-lg pt-3 pb-2 px-1 flex flex-col group transition-colors hover:border-border/60">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground px-4 mb-2">
              Validade Próxima <span className="opacity-50">— Janela de 7 Dias</span>
            </p>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={validadeData}
                  margin={{ top: 16, right: 30, bottom: 4, left: 0 }}
                  barCategoryGap="15%"
                >
                  <YAxis
                    ticks={ticksValidade}
                    tick={{ fill: COR_EIXO, fontSize: 10, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={26}
                  />
                  <XAxis
                    dataKey="nome"
                    tick={{ fill: COR_EIXO, fontSize: 10, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: COR_BG_BAR, opacity: 0.5 }} />
                  <Bar 
                    dataKey="quantidade" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={48}
                  >
                    <LabelList
                      dataKey="quantidade"
                      position="top"
                      style={{ fill: "hsl(30, 15%, 90%)", fontSize: 11, fontWeight: 700 }}
                      formatter={(v: number) => (v > 0 ? v : "")}
                      offset={6}
                    />
                    {validadeData.map((entry, i) => (
                      <Cell key={i} fill={entry.cor} className="transition-all duration-300 hover:brightness-110" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card Interno 2: Vencidos */}
          <div className="flex-1 bg-secondary/30 border border-border/40 rounded-lg pt-3 pb-2 px-1 flex flex-col group transition-colors hover:border-border/60">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground px-4 mb-2">
              Visão Geral <span className="opacity-50">— Itens Vencidos</span>
            </p>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vencidosData}
                  margin={{ top: 16, right: 60, bottom: 4, left: 0 }}
                >
                  <YAxis
                    ticks={ticksVencidos}
                    tick={{ fill: COR_EIXO, fontSize: 10, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={26}
                  />
                  <XAxis
                    dataKey="nome"
                    tick={{ fill: COR_EIXO, fontSize: 10, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: COR_BG_BAR, opacity: 0.5 }} />
                  <Bar 
                    dataKey="quantidade" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={56} 
                    fill={COR_VENCIDO}
                    className="transition-all duration-300 hover:brightness-110"
                  >
                    <LabelList
                      dataKey="quantidade"
                      position="top"
                      style={{ fill: "hsl(30, 15%, 90%)", fontSize: 11, fontWeight: 700 }}
                      formatter={(v: number) => (v > 0 ? v : "")}
                      offset={6}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ExpiryAlertCard;
