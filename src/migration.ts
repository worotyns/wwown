import 'dotenv/config';
import { Repository } from './repository';

const repository = new Repository(process.env.SQLITE_DB_PATH || null);
Repository.runMigrations(repository);