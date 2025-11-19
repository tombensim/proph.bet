import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
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
      console.log("JWT Callback", { token: token?.sub, user: user?.id, account: account?.provider })
      if (user) {
        token.id = user.id
        token.role = user.role

        // Auto-assign admin role to tombensim@gmail.com
        if (user.email === "tombensim@gmail.com") {
          try {
             await prisma.user.update({
               where: { email: "tombensim@gmail.com" },
               data: { role: "ADMIN" }
             })
          } catch (e) {
             console.error("Failed to auto-assign admin role", e)
          }
          token.role = "ADMIN"
        }
      }
      
      // Ensure admin role in token even if not re-logged in
      if (token.email === "tombensim@gmail.com") {
        token.role = "ADMIN"
      }

      return token
    },
    async session({ session, token }) {
      console.log("Session Callback", { sessionUser: session?.user?.email, tokenId: token?.id })
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.role = token.role as "USER" | "ADMIN"
        
        // For dev mode, ensure user exists in DB
        if (process.env.NODE_ENV === "development" && session.user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email }
          })
          if (dbUser) {
            session.user.id = dbUser.id
            session.user.role = dbUser.role
          }
        }
      }
      return session
    }
  }
})
