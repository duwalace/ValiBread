import { Line, LineChart, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

const StockOverviewCard = () => {
  const { filtros } = useDashboardContext();
  const { data, isLoading, isError } = useDashboard(filtros);

  const totalItens       = data?.visaoGeral?.totalItens      ?? 0;
  const marcadosEntrega  = data?.visaoGeral?.marcadosEntrega  ?? 0;
  const movimentacaoMes  = data?.movimentacaoMes              ?? [];

  // Sparkline: saldo líquido semanal real (entradas − saídas), sem reconstrução artificial
  const sparkData =
    movimentacaoMes.length > 0
      ? movimentacaoMes.map((s) => ({ v: s.entradas - s.saidas }))
      : [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];

  // Tendência mensal agregada
  const saldoMes = movimentacaoMes.reduce(
    (acc, s) => acc + (s.entradas - s.saidas),
    0
  );
  const isPositive = saldoMes > 0;
  const isNegative = saldoMes < 0;
  const TrendIcon   = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColor  = isPositive
    ? "hsl(142, 60%, 45%)"
    : isNegative
    ? "hsl(0, 70%, 50%)"
    : "hsl(30, 10%, 55%)";
  const trendLabel  = saldoMes > 0 ? `+${saldoMes}` : `${saldoMes}`;

  return (
    <div className="h-full border border-border/50 shadow-sm rounded-xl p-6 bg-card flex flex-col">
      {/* Título */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          Resumo de Estoque
        </p>
        <h3 className="text-sm font-semibold text-foreground mt-0.5">
          Visão Geral do Estoque
        </h3>
      </div>

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
          {/* Métricas — esquerda */}
          <div className="flex flex-col justify-center gap-5 min-w-[110px]">
            <div>
              <p className="text-4xl font-extrabold text-foreground leading-none tabular-nums">
                {totalItens}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Total de itens</p>
            </div>

            <div>
              <p className="text-4xl font-extrabold text-foreground leading-none tabular-nums">
                {marcadosEntrega}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Para entrega</p>
            </div>

            {/* Indicador de tendência mensal */}
            {movimentacaoMes.some((s) => s.entradas + s.saidas > 0) && (
              <div className="flex items-center gap-1.5">
                <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: trendColor }}
                >
                  {trendLabel}
                </span>
                <span className="text-[10px] text-muted-foreground/70">no mês</span>
              </div>
            )}
          </div>

          {/* Sparkline de saldo líquido semanal — direita */}
          <div className="flex-1 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sparkData}
                margin={{ top: 8, right: 4, bottom: 4, left: 4 }}
              >
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="hsl(30, 10%, 50%)"
                  strokeWidth={2}
                  dot={({ cx, cy, index }: { cx: number; cy: number; index: number }) => (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={3.5}
                      fill="hsl(30, 10%, 18%)"
                      stroke="hsl(30, 10%, 50%)"
                      strokeWidth={1.5}
                    />
                  )}
                  activeDot={{ r: 5, fill: "hsl(28, 90%, 55%)" }}
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
