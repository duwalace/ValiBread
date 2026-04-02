import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});

  const validar = () => {
    const novosErros: { email?: string; senha?: string } = {};
    if (!email.trim()) {
      novosErros.email = "E-mail é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      novosErros.email = "Formato de e-mail inválido.";
    }
    if (!senha.trim()) {
      novosErros.senha = "Senha é obrigatória.";
    } else if (senha.length < 6) {
      novosErros.senha = "A senha deve ter pelo menos 6 caracteres.";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    setCarregando(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api/auth/login`,
        { email, senha }
      );
      localStorage.setItem("token", data.token ?? "");
      localStorage.setItem("usuario", JSON.stringify(data.usuario ?? {}));
      toast({
        title: "Login realizado!",
        description: `Bem-vindo(a) de volta, ${data.usuario?.nome ?? "usuário"}!`,
      });
      navigate("/");
    } catch (error: unknown) {
      const mensagem =
        axios.isAxiosError(error) && error.response?.data?.erro
          ? error.response.data.erro
          : "Não foi possível realizar o login. Tente novamente.";
      toast({
        title: "Erro no login",
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
        className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(210 100% 50% / 0.08) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
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
            Entrar na plataforma
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Acesse com seu e-mail e senha cadastrados.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seuemail@empresa.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (erros.email) setErros((prev) => ({ ...prev, email: undefined }));
                }}
                disabled={carregando}
                className={`bg-secondary border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary transition-all ${
                  erros.email ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
                aria-describedby={erros.email ? "email-error" : undefined}
                aria-invalid={!!erros.email}
              />
              {erros.email && (
                <p id="email-error" className="text-xs text-destructive mt-1">
                  {erros.email}
                </p>
              )}
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (erros.senha) setErros((prev) => ({ ...prev, senha: undefined }));
                  }}
                  disabled={carregando}
                  className={`bg-secondary border-border text-foreground placeholder:text-muted-foreground pr-10 focus-visible:ring-primary transition-all ${
                    erros.senha ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  aria-describedby={erros.senha ? "senha-error" : undefined}
                  aria-invalid={!!erros.senha}
                />
                <button
                  type="button"
                  id="toggle-senha"
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
              {erros.senha && (
                <p id="senha-error" className="text-xs text-destructive mt-1">
                  {erros.senha}
                </p>
              )}
            </div>

            {/* Botão de entrar */}
            <Button
              id="btn-login"
              type="submit"
              disabled={carregando}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 text-sm transition-all duration-200 mt-2"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          {/* Link para cadastro */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Não tem uma conta?{" "}
            <Link
              to="/cadastro"
              id="link-cadastro"
              className="text-primary font-medium hover:underline transition-all"
            >
              Criar conta
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

export default Login;
