import React, { useState, useEffect } from "react";
import { Settings, UserCircle, KeyRound, Bell, Rss, Info } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { changePassword } from "@/lib/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SettingsPage() {
  const { user } = useAuth();
  
  const [email, setEmail] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");

  const [alertasEmail, setAlertasEmail] = useState(false);
  const [painelRfid, setPainelRfid] = useState(true);

  // Load user data and preferences
  useEffect(() => {
    const rawUser = localStorage.getItem("usuario");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        setEmail(parsed.email || "");
      } catch (e) {
        console.error("Erro ao ler usuário do localStorage");
      }
    }

    const prefAlertas = localStorage.getItem("pref_alertas_email");
    if (prefAlertas !== null) setAlertasEmail(prefAlertas === "true");

    const prefRfid = localStorage.getItem("pref_painel_rfid");
    if (prefRfid !== null) setPainelRfid(prefRfid === "true");
  }, []);

  const handleToggleAlertas = (checked: boolean) => {
    setAlertasEmail(checked);
    localStorage.setItem("pref_alertas_email", String(checked));
    toast.success("Preferência de alertas atualizada");
  };

  const handleToggleRfid = (checked: boolean) => {
    setPainelRfid(checked);
    localStorage.setItem("pref_painel_rfid", String(checked));
    toast.success("Preferência do painel RFID atualizada");
  };

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não identificado.");
      if (novaSenha !== confirmarNovaSenha) throw new Error("As novas senhas não coincidem.");
      if (novaSenha.length < 6) throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
      
      await changePassword({
        id: Number(user.id),
        senhaAtual,
        novaSenha
      });
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setIsPasswordDialogOpen(false);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.erro || err.message || "Erro ao alterar a senha.";
      toast.error(msg);
    }
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    passwordMutation.mutate();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Configurações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu perfil e as preferências do sistema.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Perfil do Usuário */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-emerald-500" />
              Perfil do Usuário
            </CardTitle>
            <CardDescription>Suas informações de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Nome Completo</Label>
              <div className="font-medium">{user?.name}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">E-mail</Label>
              <div className="font-medium">{email || "—"}</div>
            </div>
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                <KeyRound className="w-4 h-4" />
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferências do Sistema */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-sky-500" />
              Preferências do Sistema
            </CardTitle>
            <CardDescription>Ajustes locais da sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label className="flex items-center gap-2 font-medium">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Alertas por E-mail
                </Label>
                <span className="text-xs text-muted-foreground">
                  Receber resumo diário de produtos próximos ao vencimento.
                </span>
              </div>
              <Switch 
                checked={alertasEmail}
                onCheckedChange={handleToggleAlertas}
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label className="flex items-center gap-2 font-medium">
                  <Rss className="w-4 h-4 text-emerald-500" />
                  Painel RFID no Dashboard
                </Label>
                <span className="text-xs text-muted-foreground">
                  Exibir card de monitoramento de antenas na tela inicial.
                </span>
              </div>
              <Switch 
                checked={painelRfid}
                onCheckedChange={handleToggleRfid}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sobre o Sistema */}
        <Card className="border-border md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-500" />
              Sobre o Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-secondary/50 rounded-lg border border-border">
              <div>
                <h3 className="font-bold text-primary text-lg tracking-tight">ValiBread</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sistema Integrado de Gestão de Lotes, Validades e Rastreabilidade.
                </p>
              </div>
              <div className="text-right flex flex-col items-start sm:items-end">
                <span className="text-sm font-medium">Versão 1.0.0</span>
                <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Todos os direitos reservados.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Alterar Senha */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e a nova senha que deseja utilizar.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleChangePassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">Senha Atual</Label>
              <Input 
                id="senhaAtual" 
                type="password" 
                required
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <Input 
                id="novaSenha" 
                type="password" 
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmarNovaSenha">Confirmar Nova Senha</Label>
              <Input 
                id="confirmarNovaSenha" 
                type="password" 
                required
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? "Salvando..." : "Salvar Senha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
