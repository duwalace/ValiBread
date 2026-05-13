import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Users as UsersIcon, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsuarios, createUsuario } from "@/lib/adminService";
import { Badge } from "@/components/ui/badge";

export function UsersPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    id_perfil: "2" // Default to Logistica
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: fetchUsuarios,
  });

  const createMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setFormData({ nome: "", email: "", senha: "", confirmarSenha: "", id_perfil: "2" });
      toast.success("Usuário cadastrado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.erro || "Erro ao cadastrar usuário");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.senha !== formData.confirmarSenha) {
      toast.error("As senhas não coincidem!");
      return;
    }
    
    createMutation.mutate({
      nome: formData.nome,
      email: formData.email,
      senha: formData.senha,
      id_perfil: Number(formData.id_perfil)
    });
  };

  const getRoleBadge = (id_perfil: number) => {
    if (id_perfil === 1) {
      return <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50">Admin</Badge>;
    }
    return <Badge variant="outline" className="bg-muted text-muted-foreground">Logística</Badge>;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Gestão de Usuários</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie a equipe e defina suas permissões no sistema.
        </p>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="font-medium">ID</TableHead>
              <TableHead className="font-medium">Nome</TableHead>
              <TableHead className="font-medium">E-mail</TableHead>
              <TableHead className="font-medium">Função</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : !users || users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id_usuario} className="border-border hover:bg-secondary/30 transition-colors">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  USR-{user.id_usuario}
                </TableCell>
                <TableCell className="font-medium">{user.nome}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {getRoleBadge(user.id_perfil)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-secondary rounded-md">
              <UsersIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Novo Usuário</CardTitle>
              <CardDescription className="text-xs">
                Cadastre um novo funcionário e defina sua senha de acesso inicial.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: João da Silva" 
                  required 
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="bg-input border-border focus-visible:ring-ring"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="joao@valibread.com.br" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-input border-border focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input 
                  id="senha" 
                  type="password" 
                  placeholder="******" 
                  required 
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="bg-input border-border focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
                <Input 
                  id="confirmarSenha" 
                  type="password" 
                  placeholder="******" 
                  required 
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                  className="bg-input border-border focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função (Role)</Label>
              <Select 
                required 
                value={formData.id_perfil}
                onValueChange={(val) => setFormData({ ...formData, id_perfil: val })}
              >
                <SelectTrigger id="role" className="bg-input border-border focus:ring-ring">
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="1">Administrador (Acesso Total)</SelectItem>
                  <SelectItem value="2">Logística (Apenas Leitura)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Administradores podem gerenciar estoque e usuários. Logística apenas visualiza relatórios e dashboards.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Cadastrando..." : "Cadastrar Usuário"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
