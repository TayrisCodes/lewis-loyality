const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://admin:CHANGE_THIS_PASSWORD@mongodb:27017/lewis-loyalty?authSource=admin');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lewis-loyalty');
    
    // Check if super admin exists
    const existing = await db.collection('users').findOne({ email: 'superadmin@lewisloyalty.com' });
    if (existing) {
      console.log('✅ Super admin already exists');
      return;
    }
    
    // Create super admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await db.collection('users').insertOne({
      email: 'superadmin@lewisloyalty.com',
      password: hashedPassword,
      role: 'superadmin',
      name: 'Super Admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Super admin created successfully');
    console.log('📧 Email: superadmin@lewisloyalty.com');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

createAdmin();
