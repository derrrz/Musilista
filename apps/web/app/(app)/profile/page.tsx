import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import type { UserProfile } from '@/app/_lib/profileOptions';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = { title: 'Meu Perfil · Musilista' };

export default async function ProfilePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const [row] = await db.select().from(userProfiles)
    .where(eq(userProfiles.userId, user.id)).limit(1);

  const profile: UserProfile = row
    ? {
        bio: row.bio, location: row.location,
        availability: row.availability as UserProfile['availability'],
        functions: row.functions, instruments: row.instruments,
        competencies: row.competencies, rider: row.rider,
      }
    : { bio: null, location: null, availability: 'available', functions: [], instruments: [], competencies: [], rider: null };

  return (
    <div className="p-8">
      <div className="mb-7 flex flex-col gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
          Seu cartão de visita profissional
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Meu Perfil</h1>
      </div>
      <ProfileForm
        initialData={profile}
        userName={user.name}
        userEmail={user.email}
        userImage={user.image}
      />
    </div>
  );
}
