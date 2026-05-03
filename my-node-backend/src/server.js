const app = require('./app');
const { connectDB } = require('./config/db');
const { seedRoles } = require('./seeds/roles.seed');

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB();
    await seedRoles();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();