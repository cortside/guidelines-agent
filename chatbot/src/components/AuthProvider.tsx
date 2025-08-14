import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext<{ token: string | null }>({ token: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // TODO: Implement OIDC login and store JWT in memory
  const [token] = useState<string | null>(null);
  return <AuthContext.Provider value={{ token }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
