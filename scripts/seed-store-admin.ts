import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '@/models/SystemUser';
import Store from '@/models/Store';
import dotenv from 'dotenv';

dotenv.config();

async function seedStoreAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    // Check if store admin already exists
    const existingStoreAdmin = await User.findOne({ email: 'storeadmin@lewisloyalty.com' });
    if (existingStoreAdmin) {
      console.log('Store admin already exists');
      return;
    }

    // Find a store to assign the admin to (create one if none exists)
    let store = await Store.findOne();
    if (!store) {
      console.log('No stores found. Creating a sample store first...');
      store = new Store({
        name: 'Sample Store',
        address: '123 Main Street, Addis Ababa',
        isActive: true,
      });
      await store.save();
      console.log('Sample store created');
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);

    const storeAdmin = new User({
      name: 'Store Manager',
      email: 'storeadmin@lewisloyalty.com',
      passwordHash: hashedPassword,
      role: 'admin',
      storeId: store._id,
      isActive: true,
    });

    await storeAdmin.save();

    // Update the store to reference the admin
    await Store.findByIdAndUpdate(store._id, { adminId: storeAdmin._id });

    console.log('Store admin created successfully');
    console.log('Email: storeadmin@lewisloyalty.com');
    console.log('Password: admin123');
    console.log(`Assigned to store: ${store.name}`);
  } catch (error) {
    console.error('Error seeding store admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedStoreAdmin();
}

export default seedStoreAdmin;