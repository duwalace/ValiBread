import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Loader2, AlertCircle } from "lucide-react";

// Paleta do design system: --success para entradas, --destructive para saídas
const COR_ENTRADA = "hsl(142, 60%, 45%)";
const COR_SAIDA   = "hsl(0, 70%, 50%)";
const COR_LABEL   = "hsl(30, 10%, 58%)";
const COR_EIXO    = "hsl(30, 10%, 52%)";

const MovementReportCard = () => {
  const { filtros } = useDashboardContext();
  const { data, isLoading, isError } = useDashboard(filtros);

  const movimentacaoMes = data?.movimentacaoMes ?? [];

  const maxVal = Math.max(
    ...movimentacaoMes.flatMap((s) => [s.entradas, s.saidas]),
    5
  );
  const tickStep = maxVal <= 10 ? 2 : maxVal <= 30 ? 5 : maxVal <= 60 ? 10 : 20;
  const ticks = Array.from(
    { length: Math.ceil(maxVal / tickStep) + 1 },
    (_, i) => i * tickStep
  );

  return (
    <div className="h-full border border-border/50 shadow-sm rounded-xl p-6 bg-card flex flex-col">
      {/* Cabeçalho + legenda inline */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Relatório de Fluxo
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-0.5">
            Movimentação — Mês Atual
          </h3>
        </div>
        <div className="flex items-center gap-4 pt-0.5">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: COR_ENTRADA }}
            />
            Entradas
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: COR_SAIDA }}
            />
            Saídas
          </span>
        </div>
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
          Erro ao carregar movimentações.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex-1 min-h-[180px]">
          {movimentacaoMes.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              Nenhuma movimentação registrada este mês.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movimentacaoMes}
                barGap={4}
                barCategoryGap="30%"
                margin={{ top: 22, right: 8, bottom: 4, left: 0 }}
              >
                <YAxis
                  ticks={ticks}
                  tick={{ fill: COR_EIXO, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                />
                <XAxis
                  dataKey="nome"
                  tick={{ fill: COR_EIXO, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />

                {/* Barras de Entradas com Data Label */}
                <Bar
                  dataKey="entradas"
                  name="Entradas"
                  fill={COR_ENTRADA}
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                >
                  <LabelList
                    dataKey="entradas"
                    position="top"
                    style={{ fill: COR_LABEL, fontSize: 10, fontWeight: 700 }}
                    formatter={(v: number) => (v > 0 ? v : "")}
                  />
                </Bar>

                {/* Barras de Saídas com Data Label */}
                <Bar
                  dataKey="saidas"
                  name="Saídas"
                  fill={COR_SAIDA}
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                >
                  <LabelList
                    dataKey="saidas"
                    position="top"
                    style={{ fill: COR_LABEL, fontSize: 10, fontWeight: 700 }}
                    formatter={(v: number) => (v > 0 ? v : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
};

export default MovementReportCard;
