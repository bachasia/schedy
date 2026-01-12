const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log("🔍 Checking existing users...");

    // Check if any users exist
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users in database`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });
      console.log("\nExisting users:");
      console.table(users);
    }

    // Check if admin@schedy.local exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@schedy.local" },
    });

    if (existingAdmin) {
      console.log("\n⚠️  Admin user already exists!");
      console.log("Updating password to: Admin@123");

      const hashedPassword = await bcrypt.hash("Admin@123", 10);

      await prisma.user.update({
        where: { email: "admin@schedy.local" },
        data: {
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
        },
      });

      console.log("✅ Admin password has been reset to: Admin@123");
    } else {
      console.log("\n📝 Creating new admin user...");

      const hashedPassword = await bcrypt.hash("Admin@123", 10);

      const admin = await prisma.user.create({
        data: {
          email: "admin@schedy.local",
          name: "System Administrator",
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
        },
      });

      console.log("✅ Admin user created successfully!");
      console.log("\nLogin credentials:");
      console.log("  Email: admin@schedy.local");
      console.log("  Password: Admin@123");
      console.log("\n⚠️  IMPORTANT: Change this password after first login!");
    }

    // Also create me@bach.asia as backup admin
    const existingBach = await prisma.user.findUnique({
      where: { email: "me@bach.asia" },
    });

    if (!existingBach) {
      console.log("\n📝 Creating backup admin user (me@bach.asia)...");

      const hashedPassword = await bcrypt.hash("Admin@123", 10);

      await prisma.user.create({
        data: {
          email: "me@bach.asia",
          name: "Bach",
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
        },
      });

      console.log("✅ Backup admin created!");
      console.log("\nBackup login:");
      console.log("  Email: me@bach.asia");
      console.log("  Password: Admin@123");
    }

    console.log("\n✅ Setup completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
