import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { dataSourceOptions } from './config/typeorm.config';
import { AuthUser, UserRole } from './entities/auth-user.entity';

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const authUserRepository = dataSource.getRepository(AuthUser);

  // Check if super admin already exists
  const existingSuperAdmin = await authUserRepository.findOne({
    where: { role: UserRole.SUPER_ADMIN },
  });

  if (existingSuperAdmin) {
    console.log('✅ Super admin already exists:', existingSuperAdmin.username);
    await dataSource.destroy();
    return;
  }

  // Create super admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const superAdmin = authUserRepository.create({
    username: 'superadmin',
    password: hashedPassword,
    role: UserRole.SUPER_ADMIN,
  });

  await authUserRepository.save(superAdmin);

  console.log('✅ Super admin created successfully!');
  console.log('   Username: superadmin');
  console.log('   Password: admin123');
  console.log('   ⚠️  Please change the password after first login!');

  await dataSource.destroy();
}

seed()
  .then(() => {
    console.log('🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
