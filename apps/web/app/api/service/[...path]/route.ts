import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { SESSION_COOKIE } from '@/auth';
import { verificarSegredoServico, resolverUsuarioServico } from '@/app/_lib/serviceAuth';

// Proxy de serviço: encaminha chamadas autenticadas por segredo compartilhado
// (a Clarice, secretária de WhatsApp do Eder) para as rotas humanas de
// /api/groups/** e /api/mobile/groups/**, se passando pelo Eder. Reaproveita
// 100% da lógica/validação/autorização já escrita nessas rotas — nenhuma
// rota nova precisa ser criada quando o Musilista ganhar uma feature de
// grupo nova, ela já fica disponível aqui automaticamente.

type Ctx = { params: Promise<{ path: string[] }> };

const SEGMENTO_VALIDO = /^[a-zA-Z0-9_-]+$/;

function caminhoPermitido(segmentos: string[]): boolean {
  if (!segmentos.length) return false;
  if (!segmentos.every((s) => SEGMENTO_VALIDO.test(s))) return false;
  if (segmentos[0] === 'groups') return true;
  if (segmentos[0] === 'mobile' && segmentos[1] === 'groups') return true;
  // Leitura do conteúdo de uma música do acervo importado (só GET existe
  // nessa rota hoje — sem risco de escrita mesmo liberando o prefixo inteiro).
  if (segmentos[0] === 'imported-songs') return true;
  return false;
}

async function encaminhar(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const { path: segmentos } = await params;

  if (!verificarSegredoServico(req.headers.get('x-clarice-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!caminhoPermitido(segmentos)) {
    return NextResponse.json({ error: 'Caminho não permitido' }, { status: 400 });
  }

  let userId: string;
  let email: string;
  try {
    userId = await resolverUsuarioServico();
    email = process.env.CLARICE_USER_EMAIL!;
  } catch (err) {
    console.error('[service proxy] falha ao resolver usuário de serviço:', (err as Error).message);
    return NextResponse.json({ error: 'Falha ao autenticar usuário de serviço' }, { status: 500 });
  }

  const token = await encode({
    token: { sub: userId, email },
    secret: process.env.AUTH_SECRET!,
    maxAge: 5 * 60,
    salt: SESSION_COOKIE,
  });

  const destino = new URL(`/api/${segmentos.join('/')}${req.nextUrl.search}`, req.nextUrl);
  const corpo = req.method === 'GET' || req.method === 'DELETE' ? undefined : await req.text();

  console.log(`[service proxy] ${req.method} /${segmentos.join('/')}`);

  const res = await fetch(destino, {
    method: req.method,
    headers: {
      cookie: `${SESSION_COOKIE}=${token}`,
      ...(corpo ? { 'content-type': 'application/json' } : {}),
    },
    body: corpo,
  });

  const texto = await res.text();
  return new NextResponse(texto, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export const GET = encaminhar;
export const POST = encaminhar;
export const PATCH = encaminhar;
export const PUT = encaminhar;
export const DELETE = encaminhar;
