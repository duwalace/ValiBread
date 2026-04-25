import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { Loader2, AlertCircle } from "lucide-react";

const ExpiryAlertCard = () => {
  const { filtros } = useDashboardContext();
  const { data, isLoading, isError } = useDashboard(filtros);

  const totalCriticos = data?.alertaValidade?.totalCriticos ?? 0;
  const gruposApi     = data?.alertaValidade?.grupos ?? [];

  // Busca quantidade pelo nome exato que o backend retorna
  const getQtd = (label: string) =>
    gruposApi.find((ga) => ga.nome === label)?.quantidade ?? 0;

  const chartData = [
    { nome: "3 dias\nrestantes",    quantidade: getQtd("3 dias restantes"),  cor: "hsl(0, 80%, 55%)" },
    { nome: "5 dias\nrestantes",    quantidade: getQtd("5 dias restantes"),  cor: "hsl(45, 100%, 52%)" },
    { nome: "Uma semana\nrestante", quantidade: getQtd("7 dias restantes"),  cor: "hsl(220, 10%, 50%)" },
  ];

  const maxVal   = Math.max(...chartData.map((d) => d.quantidade), 10);
  const tickStep = maxVal <= 10 ? 2 : maxVal <= 30 ? 5 : 10;
  const ticks    = Array.from({ length: Math.ceil(maxVal / tickStep) + 1 }, (_, i) => i * tickStep);

  return (
    // Correção 3: card com altura mínima aumentada para acomodar gráfico maior
    <div className="h-full border border-border/50 shadow-sm rounded-xl p-6 bg-card flex flex-col min-h-[220px]">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
        Alerta de Validade (Próximos 7 Dias)
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
          Erro ao carregar alertas de validade.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex items-center gap-4 flex-1">
          {/* Lado esquerdo — número total */}
          <div className="min-w-[90px]">
            <p className="text-5xl font-extrabold text-foreground leading-none">{totalCriticos}</p>
            <p className="text-xs text-muted-foreground mt-2">Itens Críticos</p>
            {totalCriticos === 0 && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                Nenhum item próximo ao vencimento.
              </p>
            )}
          </div>

          {/* Lado direito — gráfico de barras (Correção 3: altura 160px, barras mais largas) */}
          <div className="flex-1" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                barSize={52}           /* Correção 3: aumentado de 40 → 52 */
                barCategoryGap="15%"
                margin={{ top: 4, right: 8, bottom: 28, left: 0 }}
              >
                <YAxis
                  ticks={ticks}
                  tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <XAxis
                  dataKey="nome"
                  tick={({ x, y, payload }) => {
                    const lines: string[] = payload.value.split("\n");
                    return (
                      <g transform={`translate(${x},${y + 5})`}>
                        {lines.map((line, i) => (
                          <text
                            key={i}
                            x={0}
                            y={i * 13}
                            textAnchor="middle"
                            fill="hsl(220, 10%, 55%)"
                            fontSize={10}
                          >
                            {line}
                          </text>
                        ))}
                      </g>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  height={44}         /* Espaço extra para labels duplas */
                />
                <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpiryAlertCard;
