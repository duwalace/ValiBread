import { Bar, BarChart, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";

const data = [
  { name: "Sem 1", entradas: 65, saidas: 40 },
  { name: "Sem 2", entradas: 85, saidas: 55 },
  { name: "Sem 3", entradas: 70, saidas: 45 },
];

const MovementReportCard = () => {
  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">
        Relatório de Movimentação <span className="normal-case font-normal">(Mês Atual)</span>
      </h3>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: "hsl(0, 0%, 80%)" }}
            />
            <Bar dataKey="entradas" name="Entradas" fill="hsl(210, 100%, 50%)" radius={[2, 2, 0, 0]} barSize={30} />
            <Bar dataKey="saidas" name="Saídas" fill="hsl(30, 100%, 55%)" radius={[2, 2, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MovementReportCard;
