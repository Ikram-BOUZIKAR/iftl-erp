import admin from 'firebase-admin';

// Initialize Firebase Admin SDK for emulator
const db = admin.firestore();
const auth = admin.auth();

async function seedEmulatorData() {
  try {
    console.log('🚀 Initializing Firebase Emulator with test data...');

    // Create test user
    let testUser;
    try {
      testUser = await auth.getUserByEmail('test@iftl.ma');
      console.log('✅ Test user already exists');
    } catch (error) {
      testUser = await auth.createUser({
        email: 'test@iftl.ma',
        password: 'Test123456!',
        displayName: 'Test User',
        emailVerified: true
      });
      console.log('✅ Test user created:', testUser.uid);
    }

    // Create user profile in Firestore
    const usersRef = db.collection('users');
    const existingUser = await usersRef.doc(testUser.uid).get();
    
    if (!existingUser.exists) {
      await usersRef.doc(testUser.uid).set({
        email: 'test@iftl.ma',
        displayName: 'Test User',
        role: 'admin',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ User profile created in Firestore');
    }

    // Create sample students
    const studentsRef = db.collection('students');
    const students = [
      { nom: 'Dupont', prenom: 'Alice', email: 'alice@example.com', filiere: 'Informatique' },
      { nom: 'Martin', prenom: 'Bob', email: 'bob@example.com', filiere: 'Gestion' },
      { nom: 'Bernard', prenom: 'Charlie', email: 'charlie@example.com', filiere: 'Informatique' },
      { nom: 'Thomas', prenom: 'Diana', email: 'diana@example.com', filiere: 'Ressources Humaines' },
      { nom: 'Rodriguez', prenom: 'Eve', email: 'eve@example.com', filiere: 'Marketing' }
    ];

    for (const student of students) {
      const studentRef = studentsRef.doc();
      await studentRef.set({
        ...student,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    console.log(`✅ ${students.length} sample students created`);

    // Create sample intervenants
    const intervenantsRef = db.collection('intervenants');
    const intervenants = [
      { nom: 'Leclerc', prenom: 'François', email: 'francois@example.com', specialite: 'Développement Web' },
      { nom: 'Fontaine', prenom: 'Marie', email: 'marie@example.com', specialite: 'Gestion de Projet' }
    ];

    for (const intervenant of intervenants) {
      const intervenantRef = intervenantsRef.doc();
      await intervenantRef.set({
        ...intervenant,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    console.log(`✅ ${intervenants.length} sample intervenants created`);

    console.log('\n✅ Emulator data seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedEmulatorData();
