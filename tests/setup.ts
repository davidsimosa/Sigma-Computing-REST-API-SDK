import { server } from './helpers/server';

server.listen({ onUnhandledRequest: 'error' });
