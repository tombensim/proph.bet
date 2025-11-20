
import { Role, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Roles:", Role)
  // Check if GLOBAL_ADMIN is in Role
  if ('GLOBAL_ADMIN' in Role) {
      console.log("GLOBAL_ADMIN exists")
  } else {
      console.log("GLOBAL_ADMIN MISSING")
  }

  // Check ArenaMembership fields (by creating a dummy one in memory types?)
  // We can't easily check types at runtime without reflection or trying a query.
  
  try {
      // Just check if we can access the property on the delegate
      // @ts-ignore
      console.log("ArenaMembership delegate:", !!prisma.arenaMembership)
      // @ts-ignore
      console.log("Invitation delegate:", !!prisma.invitation)
  } catch(e) {
      console.error(e)
  }
}

main()

