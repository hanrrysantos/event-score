// O Prisma CLI não carrega o .env sozinho a partir da v7.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // process.env em vez de env(): env() falha sem a variável, o que quebraria
    // o `prisma generate` do postinstall antes de o .env existir.
    url: process.env.DATABASE_URL,
  },
});
