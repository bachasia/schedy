import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
        console.log('✅ Admin user already exists:', existingAdmin.email);
        return;
    }

    // Create default admin account
    const adminEmail = 'admin@schedy.local';
    const adminPassword = 'Admin@123'; // Should be changed after first login
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
        data: {
            email: adminEmail,
            name: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true,
            emailVerified: new Date(),
        },
    });

    console.log('✅ Created admin user:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('   ⚠️  IMPORTANT: Change this password after first login!');

    // Update existing users to MANAGER role (if any)
    const updatedUsers = await prisma.user.updateMany({
        where: {
            id: { not: admin.id },
            role: 'EMPLOYEE', // Default role
        },
        data: {
            role: 'MANAGER',
        },
    });

    if (updatedUsers.count > 0) {
        console.log(`✅ Updated ${updatedUsers.count} existing user(s) to MANAGER role`);
    }

    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
