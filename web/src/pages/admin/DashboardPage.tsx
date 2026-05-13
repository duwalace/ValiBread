import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardData } from "@/lib/adminService";

export function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: fetchDashboardData,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard Admin</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bem-vindo de volta, {user?.name}. Aqui está o resumo de hoje.
          </p>
        </div>
        
        <Link to="/">
          <Button variant="outline" className="gap-2 bg-secondary border-border hover:bg-secondary/80">
            <Globe className="w-4 h-4" />
            Dashboard Global
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20 text-sm">
          Erro ao carregar os dados do dashboard. Verifique sua conexão.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens em Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.visaoGeral?.totalItens ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Pacotes/Lotes cadastrados</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.visaoGeral?.marcadosEntrega ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Pacotes aguardando saída</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{data?.totalAlertasAtivos ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Verifique as notificações no chatbot</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
