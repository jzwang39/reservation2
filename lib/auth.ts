import NextAuth from "next-auth";
import Credentials from "@auth/core/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByUsername } from "@/db";

export const {
  auth,
  handlers: { GET, POST }
} = (NextAuth as any)({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials: any) {
        if (!credentials) {
          return null;
        }
        const user = findUserByUsername(credentials.username);
        if (!user) {
          return null;
        }
        const ok = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );
        if (!ok) {
          return null;
        }
        return {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.display_name
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      session.user = {
        id: token.id as number,
        username: token.username as string,
        role: token.role as "admin" | "client" | "operator",
        name: token.name as string
      };
      return session;
    }
  },
  pages: {
    signIn: "/"
  },
  session: {
    strategy: "jwt"
  }
});
