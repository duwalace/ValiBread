import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Loader2, AlertCircle } from "lucide-react";

// Mudança 4: barras mais largas, legenda com pontos coloridos, eixo Y dinâmico
const renderLegend = () => (
  <div className="flex items-center justify-start gap-5 mt-2 pl-1">
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="w-2.5 h-2.5 rounded-full bg-[hsl(210,100%,54%)] inline-block" />
      Entradas
    </span>
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="w-2.5 h-2.5 rounded-full bg-[hsl(30,95%,52%)] inline-block" />
      Saídas
    </span>
  </div>
);

const MovementReportCard = () => {
  const { filtros } = useDashboardContext();
  const { data, isLoading, isError } = useDashboard(filtros);

  const movimentacaoMes = data?.movimentacaoMes ?? [];

  const maxVal = Math.max(
    ...movimentacaoMes.flatMap((s) => [s.entradas, s.saidas]),
    10
  );
  const tickStep = maxVal <= 20 ? 5 : maxVal <= 60 ? 20 : maxVal <= 120 ? 20 : 25;
  const ticks = Array.from(
    { length: Math.ceil(maxVal / tickStep) + 1 },
    (_, i) => i * tickStep
  );

  return (
    <div className="border border-border rounded-lg p-5 bg-card flex flex-col">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
        Relatório de Movimentação{" "}
        <span className="normal-case font-normal">(Mês Atual)</span>
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
          Erro ao carregar movimentações.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col flex-1">
          {movimentacaoMes.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              Nenhuma movimentação no mês atual.
            </p>
          ) : (
            <>
              <div className="flex-1 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={movimentacaoMes}
                    barGap={8}
                    barCategoryGap="25%"
                    margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
                  >
                    <YAxis
                      ticks={ticks}
                      tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <XAxis
                      dataKey="nome"
                      tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* Sem borda externa */}
                    <Bar
                      dataKey="entradas"
                      name="Entradas"
                      fill="hsl(210, 100%, 54%)"
                      radius={[4, 4, 0, 0]}
                      barSize={36}
                    />
                    <Bar
                      dataKey="saidas"
                      name="Saídas"
                      fill="hsl(30, 95%, 52%)"
                      radius={[4, 4, 0, 0]}
                      barSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {renderLegend()}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MovementReportCard;
