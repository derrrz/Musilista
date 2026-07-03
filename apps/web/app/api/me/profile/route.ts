import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { parseBody } from '@/app/_lib/validate';
import { INSTRUMENT_OPTIONS, AVAILABILITY_OPTIONS } from '@/app/_lib/profileOptions';

const EMPTY_PROFILE = {
  bio: null, location: null, availability: 'available',
  functions: [], instruments: [], competencies: [], rider: null,
};

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [row] = await db.select().from(userProfiles)
    .where(eq(userProfiles.userId, user.id)).limit(1);

  if (!row) return NextResponse.json(EMPTY_PROFILE);
  return NextResponse.json({
    bio: row.bio, location: row.location, availability: row.availability,
    functions: row.functions, instruments: row.instruments,
    competencies: row.competencies, rider: row.rider,
  });
}

const availabilityValues = AVAILABILITY_OPTIONS.map(o => o.value) as [string, ...string[]];

const patchSchema = z.object({
  bio: z.string().max(280).nullish(),
  location: z.string().max(100).nullish(),
  availability: z.enum(availabilityValues).optional(),
  // funções aceitam qualquer string (perfil adaptável); instrumentos validam contra a lista fixa
  functions: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  instruments: z.array(z.enum(INSTRUMENT_OPTIONS as [string, ...string[]])).optional(),
  competencies: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  rider: z.string().max(1000).nullish(),
});

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { bio, location, availability, functions: fns, instruments, competencies, rider } = parsed.data;

  await db.insert(userProfiles)
    .values({
      userId: user.id,
      bio: bio ?? null,
      location: location ?? null,
      availability: availability ?? 'available',
      functions: fns ?? [],
      instruments: instruments ?? [],
      competencies: competencies ?? [],
      rider: rider ?? null,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(availability !== undefined && { availability }),
        ...(fns !== undefined && { functions: fns }),
        ...(instruments !== undefined && { instruments }),
        ...(competencies !== undefined && { competencies }),
        ...(rider !== undefined && { rider }),
        updatedAt: new Date().toISOString(),
      },
    });

  return NextResponse.json({ ok: true });
}
