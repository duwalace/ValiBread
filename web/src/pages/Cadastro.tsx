import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePerfis } from "@/hooks/usePerfis";
import axios from "axios";

interface FormData {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  id_perfil: string;
}

interface FormErros {
  nome?: string;
  email?: string;
  senha?: string;
  confirmarSenha?: string;
  id_perfil?: string;
}

const Cadastro = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: perfis = [], isLoading: carregandoPerfis } = usePerfis();

  const [form, setForm] = useState<FormData>({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    id_perfil: "",
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<FormErros>({});

  const handleChange = (campo: keyof FormData, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (erros[campo]) {
      setErros((prev) => ({ ...prev, [campo]: undefined }));
    }
  };

  const validar = (): boolean => {
    const novosErros: FormErros = {};

    if (!form.nome.trim()) {
      novosErros.nome = "Nome completo é obrigatório.";
    } else if (form.nome.trim().length < 3) {
      novosErros.nome = "O nome deve ter pelo menos 3 caracteres.";
    }

    if (!form.email.trim()) {
      novosErros.email = "E-mail é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      novosErros.email = "Formato de e-mail inválido.";
    }

    if (!form.senha) {
      novosErros.senha = "Senha é obrigatória.";
    } else if (form.senha.length < 6) {
      novosErros.senha = "A senha deve ter pelo menos 6 caracteres.";
    }

    if (!form.confirmarSenha) {
      novosErros.confirmarSenha = "Confirme sua senha.";
    } else if (form.senha !== form.confirmarSenha) {
      novosErros.confirmarSenha = "As senhas não coincidem.";
    }

    if (!form.id_perfil) {
      novosErros.id_perfil = "Selecione um perfil de acesso.";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const getForcaSenha = (): { nivel: number; rotulo: string; cor: string } => {
    const s = form.senha;
    if (!s) return { nivel: 0, rotulo: "", cor: "" };
    let pontos = 0;
    if (s.length >= 6) pontos++;
    if (s.length >= 10) pontos++;
    if (/[A-Z]/.test(s)) pontos++;
    if (/[0-9]/.test(s)) pontos++;
    if (/[^A-Za-z0-9]/.test(s)) pontos++;
    if (pontos <= 1) return { nivel: 1, rotulo: "Fraca", cor: "hsl(var(--destructive))" };
    if (pontos <= 2) return { nivel: 2, rotulo: "Razoável", cor: "hsl(var(--warning))" };
    if (pontos <= 3) return { nivel: 3, rotulo: "Boa", cor: "hsl(var(--warning))" };
    return { nivel: 4, rotulo: "Forte", cor: "hsl(var(--success))" };
  };

  const forca = getForcaSenha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    setCarregando(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api/auth/cadastro`,
        {
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
          id_perfil: Number(form.id_perfil),
        }
      );
      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode fazer login com suas credenciais.",
      });
      navigate("/login");
    } catch (error: unknown) {
      const mensagem =
        axios.isAxiosError(error) && error.response?.data?.erro
          ? error.response.data.erro
          : "Não foi possível criar a conta. Tente novamente.";
      toast({
        title: "Erro no cadastro",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decoração de fundo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(210 100% 50% / 0.15), transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(210 100% 50% / 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-lg relative z-10">
        {/* Card */}
        <div
          className="rounded-2xl border border-border p-8 shadow-2xl"
          style={{ background: "hsl(var(--card))" }}
        >
          {/* Logo / Marca */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold italic tracking-tight text-foreground leading-none">
              3IRMÃOS
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium tracking-wide uppercase">
              Sistema de Gestão de Estoque
            </p>
            <div
              className="mt-4 h-0.5 w-16 mx-auto rounded-full"
              style={{ background: "hsl(var(--primary))" }}
            />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-1">
            Criar nova conta
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Preencha os dados abaixo para se registrar no sistema.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Nome completo */}
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-sm font-medium text-foreground">
                Nome completo
              </Label>
              <Input
                id="nome"
                type="text"
                autoComplete="name"
                placeholder="Ex.: Maria da Silva"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                disabled={carregando}
                className={`bg-secondary border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary transition-all ${
                  erros.nome ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
                aria-describedby={erros.nome ? "nome-error" : undefined}
                aria-invalid={!!erros.nome}
              />
              {erros.nome && (
                <p id="nome-error" className="text-xs text-destructive">
                  {erros.nome}
                </p>
              )}
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="email-cad" className="text-sm font-medium text-foreground">
                E-mail
              </Label>
              <Input
                id="email-cad"
                type="email"
                autoComplete="email"
                placeholder="seuemail@empresa.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={carregando}
                className={`bg-secondary border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary transition-all ${
                  erros.email ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
                aria-describedby={erros.email ? "email-cad-error" : undefined}
                aria-invalid={!!erros.email}
              />
              {erros.email && (
                <p id="email-cad-error" className="text-xs text-destructive">
                  {erros.email}
                </p>
              )}
            </div>

            {/* Senha + Confirmar — grid de 2 colunas em telas maiores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="senha-cad" className="text-sm font-medium text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="senha-cad"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.senha}
                    onChange={(e) => handleChange("senha", e.target.value)}
                    disabled={carregando}
                    className={`bg-secondary border-border text-foreground placeholder:text-muted-foreground pr-10 focus-visible:ring-primary transition-all ${
                      erros.senha ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                    aria-describedby={erros.senha ? "senha-cad-error" : "forca-senha-desc"}
                    aria-invalid={!!erros.senha}
                  />
                  <button
                    type="button"
                    id="toggle-senha-cad"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {/* Indicador de força */}
                {form.senha && (
                  <div className="space-y-1" id="forca-senha-desc" aria-live="polite">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            background:
                              n <= forca.nivel
                                ? forca.cor
                                : "hsl(var(--border))",
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: forca.cor }}>
                      {forca.rotulo}
                    </p>
                  </div>
                )}
                {erros.senha && (
                  <p id="senha-cad-error" className="text-xs text-destructive">
                    {erros.senha}
                  </p>
                )}
              </div>

              {/* Confirmar senha */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmar-senha" className="text-sm font-medium text-foreground">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmar-senha"
                    type={mostrarConfirmar ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.confirmarSenha}
                    onChange={(e) => handleChange("confirmarSenha", e.target.value)}
                    disabled={carregando}
                    className={`bg-secondary border-border text-foreground placeholder:text-muted-foreground pr-10 focus-visible:ring-primary transition-all ${
                      erros.confirmarSenha
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    aria-describedby={erros.confirmarSenha ? "confirmar-error" : undefined}
                    aria-invalid={!!erros.confirmarSenha}
                  />
                  <button
                    type="button"
                    id="toggle-confirmar-senha"
                    onClick={() => setMostrarConfirmar((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={mostrarConfirmar ? "Ocultar confirmação" : "Mostrar confirmação"}
                    tabIndex={-1}
                  >
                    {mostrarConfirmar ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {erros.confirmarSenha && (
                  <p id="confirmar-error" className="text-xs text-destructive">
                    {erros.confirmarSenha}
                  </p>
                )}
              </div>
            </div>

            {/* Perfil de acesso */}
            <div className="space-y-1.5">
              <Label htmlFor="perfil" className="text-sm font-medium text-foreground">
                Perfil de acesso
              </Label>
              <select
                id="perfil"
                value={form.id_perfil}
                onChange={(e) => handleChange("id_perfil", e.target.value)}
                disabled={carregando || carregandoPerfis}
                className={`w-full h-9 rounded-md border px-3 text-sm bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                  erros.id_perfil
                    ? "border-destructive focus:ring-destructive"
                    : "border-border"
                }`}
                aria-describedby={erros.id_perfil ? "perfil-error" : undefined}
                aria-invalid={!!erros.id_perfil}
              >
                <option value="" disabled>
                  {carregandoPerfis ? "Carregando perfis..." : "Selecione um perfil…"}
                </option>
                {perfis.map((p) => (
                  <option key={p.id_perfil} value={String(p.id_perfil)}>
                    {p.nome}
                  </option>
                ))}
              </select>
              {erros.id_perfil && (
                <p id="perfil-error" className="text-xs text-destructive">
                  {erros.id_perfil}
                </p>
              )}
            </div>

            {/* Botão de cadastrar */}
            <Button
              id="btn-cadastrar"
              type="submit"
              disabled={carregando}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 text-sm transition-all duration-200 mt-2"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar conta
                </>
              )}
            </Button>
          </form>

          {/* Link para login */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem uma conta?{" "}
            <Link
              to="/login"
              id="link-login"
              className="text-primary font-medium hover:underline transition-all"
            >
              Entrar
            </Link>
          </p>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2025 3IRMÃOS — TRES IRMÃOS IND. E COM. DE PÃES LTDA
        </p>
      </div>
    </div>
  );
};

export default Cadastro;
