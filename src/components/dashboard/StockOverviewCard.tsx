import { Area, AreaChart, ResponsiveContainer } from "recharts";

const data = [
  { value: 30 }, { value: 35 }, { value: 28 }, { value: 40 },
  { value: 38 }, { value: 45 }, { value: 50 }, { value: 55 },
];

const StockOverviewCard = () => {
  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">
        Visão Geral do Estoque
      </h3>

      <div className="flex justify-between items-start">
        <div>
          <p className="text-4xl font-bold text-foreground">155</p>
          <p className="text-sm text-muted-foreground">Marcado(s) para entrega</p>
          <p className="text-4xl font-bold text-foreground mt-4">623</p>
          <p className="text-sm text-muted-foreground">Total de itens</p>
        </div>

        <div className="w-1/2 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(142, 71%, 45%)"
                fill="url(#stockGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StockOverviewCard;
