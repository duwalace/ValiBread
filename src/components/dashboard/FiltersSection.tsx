import { Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FiltersSection = () => {
  return (
    <div className="border border-border rounded-lg p-4 mx-6 mt-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 italic">Filtros de Produtos</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Data de Fabricação */}
        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" /> De Fabricação (DD/MM/AAAA)
          </label>
          <Input
            placeholder="[DD/MM/AAAA] - [DD/MM/AAAA]"
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>

        {/* Data de Validade */}
        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" /> De Validade
          </label>
          <Input
            placeholder="[DD/MM/AAAA] - [DD/MM/AAAA]"
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>

        {/* Categoria */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
          <select className="w-full h-9 rounded-md border border-border bg-secondary text-foreground text-sm px-3">
            <option>Categoria (ex: Pão de Forma)</option>
          </select>
        </div>

        {/* Lote/RFID */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Lote/RFID</label>
            <Input
              placeholder="Digite Lote/RFID... R"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap">
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FiltersSection;
