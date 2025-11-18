import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google,
    ...(process.env.NODE_ENV === "development" ? [
      Credentials({
        name: "Dev Login",
        credentials: {
          email: { label: "Email", type: "text", defaultValue: "dev@genoox.com" },
        },
        async authorize(credentials) {
          const email = (credentials?.email as string) || "dev@genoox.com"
          
          // Create or get the dev user
          const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
              email,
              name: "Dev User",
              image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
              role: "ADMIN", // Give dev admin access by default
            },
          })
          
          return user
        },
      })
    ] : [])
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        
        // For dev mode, ensure user exists in DB
        if (process.env.NODE_ENV === "development" && session.user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email }
          })
          if (dbUser) {
            session.user.id = dbUser.id
          }
        }
      }
      return session
    }
  }
})
