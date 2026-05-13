import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "Admin" | "Logistica";

export interface User {
  id: string;
  name: string;
  role: Role;
}

const mockAdmin: User = { id: "1", name: "Eduardo (Admin)", role: "Admin" };
const mockLogistica: User = { id: "2", name: "João (Logística)", role: "Logistica" };

interface AuthContextType {
  user: User | null;
  role: Role | null;
  toggleMockUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserFromStorage = (): User | null => {
  const usuarioRaw = localStorage.getItem("usuario");
  if (!usuarioRaw) return null;
  
  try {
    const parsed = JSON.parse(usuarioRaw);
    
    // Extraindo a role correta baseada no id_perfil do db.sql
    // 1 = Admin, 2 = Logistica
    let normalizedRole: Role = "Logistica";
    if (Number(parsed.id_perfil) === 1) {
      normalizedRole = "Admin";
    }

    return {
      id: String(parsed.id_usuario || parsed.id || ""),
      name: parsed.nome || parsed.name || "Usuário",
      role: normalizedRole
    };
  } catch (e) {
    console.error("Erro ao parsear usuário do localStorage", e);
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getUserFromStorage() || mockAdmin);

  const toggleMockUser = () => {
    setUser((prev) => (prev?.role === "Admin" ? mockLogistica : mockAdmin));
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, toggleMockUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
