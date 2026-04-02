import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const data = [
  { name: "3 dias\nrestantes", value: 55, fill: "hsl(0, 72%, 51%)" },
  { name: "5 dias\nrestantes", value: 30, fill: "hsl(45, 100%, 51%)" },
  { name: "Uma semana\nrestante", value: 4, fill: "hsl(220, 15%, 40%)" },
];

const ExpiryAlertCard = () => {
  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">
        Alerta de Validade (Próximos 7 Dias)
      </h3>

      <div className="flex justify-between items-start">
        <div>
          <p className="text-4xl font-bold text-foreground">89</p>
          <p className="text-sm text-muted-foreground">Itens Críticos</p>
        </div>

        <div className="w-1/2 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={40}>
              <YAxis
                tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 60]}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ExpiryAlertCard;
