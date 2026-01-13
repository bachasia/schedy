const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createTestProfiles() {
    try {
        console.log("🔍 Looking for admin user...");

        // Find admin user
        const admin = await prisma.user.findFirst({
            where: { role: "ADMIN" },
        });

        if (!admin) {
            console.error("❌ No admin user found. Please run create-admin.js first.");
            process.exit(1);
        }

        console.log(`✅ Found admin: ${admin.email}`);

        // Create test profiles using raw SQL to avoid validation issues
        const profiles = [
            ["Demo Facebook Page", "FACEBOOK", "fb_demo_123456", "demo_facebook_page"],
            ["Demo Instagram Account", "INSTAGRAM", "ig_demo_789012", "demo_instagram"],
            ["Demo TikTok Channel", "TIKTOK", "tt_demo_345678", "demo_tiktok"],
            ["Demo Twitter Account", "TWITTER", "tw_demo_901234", "demo_twitter"],
            ["Demo YouTube Channel", "YOUTUBE", "yt_demo_567890", "demo_youtube"],
        ];

        console.log("\n📝 Creating test profiles...");

        for (const [name, platform, platformUserId, platformUsername] of profiles) {
            try {
                // Use raw SQL to insert
                await prisma.$executeRaw`
          INSERT OR IGNORE INTO Profile (
            id, userId, name, platform, platformUserId, platformUsername,
            accessToken, isActive, createdAt, updatedAt
          ) VALUES (
            lower(hex(randomblob(16))),
            ${admin.id},
            ${name},
            ${platform},
            ${platformUserId},
            ${platformUsername},
            ${"fake_token_" + Date.now()},
            1,
            datetime('now'),
            datetime('now')
          )
        `;
                console.log(`✅ Created: ${name} (${platform})`);
            } catch (err) {
                console.log(`⚠️  Profile may already exist: ${name}`);
            }
        }

        // Get all profiles
        const allProfiles = await prisma.profile.findMany({
            where: { userId: admin.id },
            select: {
                id: true,
                name: true,
                platform: true,
                platformUsername: true,
            },
        });

        console.log(`\n✨ Total profiles in database: ${allProfiles.length}`);
        console.log("\n📋 Profile Summary:");
        allProfiles.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name} - @${p.platformUsername} (${p.platform})`);
        });

        console.log("\n🎯 Next steps:");
        console.log("   1. Go to http://localhost:3100/admin/users");
        console.log("   2. Click 'Assign Profiles' button for a user");
        console.log("   3. Select profiles to assign");

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

createTestProfiles();
