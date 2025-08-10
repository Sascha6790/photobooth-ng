const session = require('express-session');
const RedisStore = require('connect-redis').default;
import { createClient } from 'redis';

export interface SessionConfig {
  secret: string;
  store?: any;
  resave?: boolean;
  saveUninitialized?: boolean;
  cookie?: {
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
  };
  name?: string;
}

export const createSessionConfig = async (useRedis = false): Promise<SessionConfig> => {
  const baseConfig: SessionConfig = {
    secret: process.env.SESSION_SECRET || 'photobooth-session-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    name: 'photobooth.sid'
  };

  if (useRedis && process.env.REDIS_URL) {
    try {
      const redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await redisClient.connect();
      
      const Store = RedisStore(session);
      baseConfig.store = new Store({
        client: redisClient,
        prefix: 'photobooth:sess:',
        ttl: 86400 // 24 hours
      });

      console.log('✅ Redis session store configured');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, falling back to memory store:', error.message);
    }
  }

  return baseConfig;
};

export const sessionMiddleware = async () => {
  const config = await createSessionConfig(process.env.USE_REDIS === 'true');
  return session(config);
};