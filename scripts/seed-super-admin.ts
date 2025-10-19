import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '@/models/SystemUser';
import dotenv from 'dotenv';

dotenv.config();

async function seedSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);

    const superAdmin = new User({
      name: 'Super Admin',
      email: 'admin@lewisloyalty.com',
      passwordHash: hashedPassword,
      role: 'superadmin',
      isActive: true,
    });

    await superAdmin.save();

    console.log('Super admin created successfully');
    console.log('Email: admin@lewisloyalty.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error seeding super admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedSuperAdmin();
}

export default seedSuperAdmin;