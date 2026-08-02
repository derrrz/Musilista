import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { put, del } from '@vercel/blob';
import { z } from 'zod';
import { db } from '@/db';
import { feedback } from '@/db/schema';
import { and, eq, gte, or, sql } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';

// Feedback da fase beta. Aceita envio anônimo (só texto + e-mail opcional);
// imagem exige login — checada de novo aqui, não só escondida no cliente.
// multipart/form-data (não JSON) por causa do arquivo, então não usa parseBody.

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const RATE_LIMIT_PER_HOUR = 5;

const fieldsSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  email: z.union([z.literal(''), z.email().max(200)]).optional(),
  pageUrl: z.string().trim().max(500).optional(),
  website: z.string().optional(), // honeypot — humano não vê nem preenche
});

// Extensão pelo conteúdo real do arquivo, não pelo nome/mime declarados.
function sniffImageExt(bytes: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  const ascii = (i: number, s: string) =>
    s.split('').every((ch, k) => bytes[i + k] === ch.charCodeAt(0));
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'webp';
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formulário inválido' }, { status: 400 });
  }

  const parsed = fieldsSchema.safeParse({
    message: form.get('message') ?? '',
    email: typeof form.get('email') === 'string' ? form.get('email') : undefined,
    pageUrl: typeof form.get('pageUrl') === 'string' ? form.get('pageUrl') : undefined,
    website: typeof form.get('website') === 'string' ? form.get('website') : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 });
  }
  const { message, email, pageUrl, website } = parsed.data;

  // Bot caiu no honeypot: finge sucesso e descarta.
  if (website) return NextResponse.json({ ok: true }, { status: 201 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const ipHash = createHash('sha256').update(`${ip}|${process.env.AUTH_SECRET}`).digest('hex').slice(0, 32);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentBy = user
    ? or(eq(feedback.ipHash, ipHash), eq(feedback.userId, user.id))
    : eq(feedback.ipHash, ipHash);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedback)
    .where(and(gte(feedback.createdAt, oneHourAgo), recentBy));
  if (count >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json({ error: 'Muitos envios. Tente novamente mais tarde.' }, { status: 429 });
  }

  let imageUrl: string | null = null;
  const image = form.get('image');
  if (image instanceof File && image.size > 0) {
    if (!user) {
      return NextResponse.json({ error: 'Faça login para enviar imagens' }, { status: 401 });
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Imagem muito grande (máx. 3 MB)' }, { status: 400 });
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    const ext = sniffImageExt(bytes);
    if (!ext) {
      return NextResponse.json({ error: 'Arquivo não é uma imagem válida (JPEG, PNG ou WebP)' }, { status: 400 });
    }
    const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    try {
      const { url } = await put(`feedback/${crypto.randomUUID()}.${ext}`, Buffer.from(bytes), {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      });
      imageUrl = url;
    } catch {
      // Blob fora do ar ou suspenso por cota — não perde o texto por causa disso.
      return NextResponse.json(
        { error: 'Não foi possível anexar a imagem agora. Envie só o texto, ou tente mais tarde.' },
        { status: 503 },
      );
    }
  }

  try {
    const [row] = await db.insert(feedback).values({
      userId: user?.id ?? null,
      email: user ? null : email || null,
      message,
      imageUrl,
      pageUrl: pageUrl || null,
      userAgent: (req.headers.get('user-agent') ?? '').slice(0, 500) || null,
      ipHash,
    }).returning({ id: feedback.id });
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (err) {
    // Não deixa blob órfão se o insert falhar depois do upload.
    if (imageUrl) await del(imageUrl).catch(() => {});
    throw err;
  }
}
