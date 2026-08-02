import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { estimateCostMicros, isBrakeTripped, recordUsage } from './aiUsage';

const here = dirname(fileURLToPath(import.meta.url));
const TAXONOMY_PATH = join(here, '..', '..', '..', '..', 'discovery', 'taxonomia-generos-estilos-musicais-2026-07-26.md');

let taxonomyMd: string | null = null;
function loadTaxonomy(): string {
	if (taxonomyMd === null) taxonomyMd = readFileSync(TAXONOMY_PATH, 'utf-8');
	return taxonomyMd;
}

const classificationSchema = z.object({
	genero: z.string().nullable(),
	estilos: z.array(z.string()),
});

// Chamada direta à API da OpenAI (chave própria em OPENAI_API_KEY), sem
// passar pelo AI Gateway da Vercel — o tier grátis do Gateway não inclui
// nenhum modelo pago (nem Gemini) e exige top-up real, o que o dono
// preferiu evitar por enquanto.
const MODEL = openai('gpt-5-nano');

// Classifica uma música (caso a caso, nunca por regra de artista) contra a
// taxonomia de gênero/estilo já pesquisada — nunca lança exceção, pra não
// travar o fluxo de adicionar música no setlist.
export async function classifySongGenre(input: { title: string; artist: string }): Promise<{ genero: string | null; estilos: string[] }> {
	try {
		if (await isBrakeTripped()) return { genero: null, estilos: [] };

		const taxonomy = loadTaxonomy();
		const { object, usage } = await generateObject({
			model: MODEL,
			schema: classificationSchema,
			abortSignal: AbortSignal.timeout(20000),
			// gpt-5-nano é um modelo de raciocínio — sem isso ele gasta milhares
			// de tokens de "pensamento" numa tarefa simples de escolher entre
			// opções fixas, o que estourava nosso timeout e custava muito mais.
			providerOptions: { openai: { reasoningEffort: 'low', textVerbosity: 'low' } },
			prompt: `Você classifica músicas de repertório musical por gênero e estilo, usando exclusivamente a taxonomia de referência abaixo — nunca invente rótulos fora dela.

${taxonomy}

Tarefa: dada a música "${input.title}" do artista "${input.artist}", escolha:
- genero: o nome de UMA entrada marcada [gênero] na taxonomia acima que melhor descreve essa música específica (não o artista em geral — músicas diferentes do mesmo artista podem ter gêneros diferentes). Se nenhuma entrada se aplicar com confiança, retorne null.
- estilos: 0 a 3 nomes de entradas marcadas [estilo] na taxonomia que descrevem o tratamento sonoro dessa música específica. Pode ser lista vazia se nenhuma se aplicar com confiança.

Use exatamente os nomes como aparecem na taxonomia (antes do " \`[gênero]\`"/" \`[estilo]\`").`,
		});

		recordUsage(estimateCostMicros(usage)).catch(() => {});
		return object;
	} catch {
		return { genero: null, estilos: [] };
	}
}
