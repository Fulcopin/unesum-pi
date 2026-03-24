module.exports = {
  directory: './src/models',
  language: 'es6',
  dialect: 'postgres',
  host: 'ep-rapid-mud-ae623rtp-pooler.c-2.us-east-2.aws.neon.tech',
  database: 'neondb',
  username: 'neondb_owner',
  password: 'npg_F4IVyrtCQqh7',
  port: 5432,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};
