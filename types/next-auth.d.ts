import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: number;
      username: string;
      role: "admin" | "client" | "operator";
      name: string;
    };
  }

  interface User {
    id: number;
    username: string;
    role: "admin" | "client" | "operator";
    name: string;
  }
}

