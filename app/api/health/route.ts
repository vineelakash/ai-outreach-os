import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { redisConnection } from '@/lib/queue/redis';

export async function GET() {
  const status: {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    services: {
      database: string;
      redis: string;
      app: string;
    };
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      app: 'healthy',
    },
  };

  // 1. Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.services.database = 'connected';
  } catch (err) {
    status.services.database = 'disconnected';
    status.status = 'degraded';
  }

  // 2. Check Redis
  try {
    const redisPing = await redisConnection.ping();
    status.services.redis = redisPing === 'PONG' ? 'connected' : 'degraded';
  } catch {
    status.services.redis = 'disconnected';
    status.status = 'degraded';
  }

  return NextResponse.json(status, {
    status: status.status === 'ok' ? 200 : 207,
  });
}
