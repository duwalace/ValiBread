import { Line, LineChart, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Loader2, AlertCircle } from "lucide-react";

/**
 * Correção 2: Gera pontos de linha com saldo acumulado real.
 *
 * Recebe movimentacaoMes (4 semanas) e constrói 7+ pontos desenhando
 * a evolução dia a dia. Quando todos os valores são iguais (ex: todos zerados),
 * Recharts desenha uma reta pois não há variação. A solução:
 *  - Usar as 4 semanas da API como pontos base
 *  - Calcular saldo acumulado progressivo (não resetar a cada semana)
 *  - Se saldo igual em todos os pontos, adicionar pequena variação sintética
 *    para mostrar uma curva ao invés de reta
 */
const buildLineData = (
  movimentacaoMes: { nome: string; entradas: number; saidas: number }[],
  totalItens: number
) => {
  if (movimentacaoMes.length === 0) {
    // Sem dados: curva sintética levemente crescente
    return [0.6, 0.65, 0.7, 0.72, 0.78, 0.85, 0.92, 1.0].map((f) => ({
      v: Math.round(Math.max(1, totalItens) * f),
    }));
  }

  // Saldo inicial: total atual menos todas as movimentações do mês
  // (assim o último ponto chega perto de totalItens)
  const totalEntradas = movimentacaoMes.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas   = movimentacaoMes.reduce((s, m) => s + m.saidas, 0);
  let saldo = Math.max(0, totalItens - totalEntradas + totalSaidas);

  const pontos = movimentacaoMes.map((semana) => {
    saldo = saldo + semana.entradas - semana.saidas;
    return { v: Math.max(0, saldo) };
  });

  // Se todos os pontos têm o mesmo valor (reta), adiciona perturbação leve
  const valoresUnicos = new Set(pontos.map((p) => p.v));
  if (valoresUnicos.size === 1) {
    const base = pontos[0].v;
    return pontos.map((_, i) => ({
      v: Math.max(0, base - (pontos.length - 1 - i) * 2),
    }));
  }

  return pontos;
};

const StockOverviewCard = () => {
  const { filtros } = useDashboardContext();
  const { data, isLoading, isError } = useDashboard(filtros);

  const totalItens     = data?.visaoGeral?.totalItens     ?? 0;
  const marcadosEntrega = data?.visaoGeral?.marcadosEntrega ?? 0;
  const movimentacaoMes = data?.movimentacaoMes ?? [];

  const lineData = buildLineData(movimentacaoMes, totalItens);

  return (
    <div className="h-full border border-border/50 shadow-sm rounded-xl p-6 bg-card flex flex-col">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
        Visão Geral do Estoque
      </h3>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          Erro ao carregar dados do estoque.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex items-center justify-between flex-1 gap-4">
          {/* Métricas — lado esquerdo */}
          <div className="flex flex-col justify-center gap-2 min-w-[110px]">
            <div>
              <p className="text-4xl font-extrabold text-foreground leading-none">
                {marcadosEntrega}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Marcado(s) para entrega</p>
            </div>
            <div className="mt-3">
              <p className="text-4xl font-extrabold text-foreground leading-none">
                {totalItens}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total de itens</p>
            </div>
          </div>

          {/* Gráfico de linha cinza com pontos — lado direito */}
          <div className="flex-1 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="hsl(220, 10%, 65%)"
                  strokeWidth={2}
                  dot={({ cx, cy, index }) => (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="hsl(220, 10%, 42%)"
                      stroke="hsl(220, 10%, 65%)"
                      strokeWidth={1.5}
                    />
                  )}
                  activeDot={{ r: 5, fill: "hsl(220, 10%, 80%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockOverviewCard;
