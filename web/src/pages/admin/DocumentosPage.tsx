import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Calendar, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";

interface ChatbotExport {
  id_export: number;
  nome_arquivo: string;
  url_arquivo: string;
  data_geracao: string;
  usuario_nome: string;
  usuario_email: string;
}

const fetchDocumentos = async (): Promise<ChatbotExport[]> => {
  const response = await api.get('/api/chatbot/exports');
  return response.data;
};

export function DocumentosPage() {
  const { data: exportsList, isLoading, isError } = useQuery({
    queryKey: ['documentosList'],
    queryFn: fetchDocumentos,
  });

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Documentos Gerados
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe todos os relatórios e planilhas gerados pelos usuários do sistema.
        </p>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border">
              <TableHead className="font-medium">Data de Geração</TableHead>
              <TableHead className="font-medium">Arquivo</TableHead>
              <TableHead className="font-medium">Usuário Responsável</TableHead>
              <TableHead className="font-medium text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-destructive">
                  Erro ao carregar os documentos.
                </TableCell>
              </TableRow>
            ) : !exportsList || exportsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum documento foi gerado ainda.
                </TableCell>
              </TableRow>
            ) : (
              exportsList.map((item) => (
                <TableRow key={item.id_export} className="border-border hover:bg-secondary/30 transition-colors">
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(item.data_geracao).toLocaleString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      {item.nome_arquivo}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.usuario_nome}</span>
                      <span className="text-xs text-muted-foreground">{item.usuario_email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => handleDownload(item.url_arquivo)}
                    >
                      <Download className="w-4 h-4" />
                      Baixar Novamente
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
