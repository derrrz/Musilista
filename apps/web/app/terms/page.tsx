import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = {
  title: 'Termos de Uso · Musilista',
  description: 'Termos de Uso e Política de Privacidade do Musilista.',
};

const LAST_UPDATED = '2 de julho de 2026';

const sections = [
  {
    id: 'sobre',
    title: '1. Sobre o Musilista',
    content: `O Musilista é uma plataforma de criação, edição e compartilhamento de cifras musicais. O serviço permite que músicos individuais, bandas e corais criem cifras técnicas, organizem repertórios e agendas de shows e ensaios, e colaborem com outros usuários.

O Musilista está atualmente em fase Beta — uma versão de testes com acesso limitado por convite. Funcionalidades, interfaces e políticas podem mudar com frequência durante este período.`,
  },
  {
    id: 'aceite',
    title: '2. Aceitação dos Termos',
    content: `Ao criar uma conta ou utilizar qualquer funcionalidade do Musilista, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. Se você não concordar com algum ponto, não utilize o serviço.

Estes termos se aplicam a todos os usuários da plataforma, incluindo visitantes, usuários registrados, membros de grupos e administradores.`,
  },
  {
    id: 'conta',
    title: '3. Cadastro e Conta',
    content: `O acesso ao Musilista é feito via autenticação OAuth com Google. Ao realizar o login, você autoriza o Musilista a acessar informações básicas do seu perfil (nome, e-mail e foto) fornecidas pelo provedor.

Você é responsável por manter a segurança da sua conta e por todas as atividades realizadas a partir dela. O Musilista não armazena senhas — a autenticação é gerenciada integralmente pelo provedor (Google).

Contas que violarem estes termos podem ser suspensas ou encerradas sem aviso prévio.`,
  },
  {
    id: 'uso',
    title: '4. Uso Aceitável',
    content: `Você concorda em utilizar o Musilista exclusivamente para fins legítimos relacionados à criação e gestão de cifras musicais. É proibido:

• Publicar conteúdo que viole direitos autorais de terceiros sem a devida autorização;
• Usar o serviço para fins comerciais não autorizados pelo Musilista;
• Tentar acessar sistemas, contas ou dados de outros usuários sem permissão;
• Enviar conteúdo ofensivo, discriminatório ou que viole a legislação brasileira;
• Realizar engenharia reversa, scraping automatizado ou sobrecarregar deliberadamente a infraestrutura;
• Criar contas automatizadas ou usar bots para interagir com a plataforma.

O descumprimento pode resultar na suspensão imediata da conta.`,
  },
  {
    id: 'conteudo',
    title: '5. Conteúdo Criado pelo Usuário',
    content: `Você mantém os direitos sobre o conteúdo que cria no Musilista (cifras, arranjos, repertórios e demais materiais). Ao publicar conteúdo na plataforma, você concede ao Musilista uma licença não exclusiva, gratuita e mundial para armazenar, exibir e distribuir esse conteúdo dentro do serviço.

Você declara ser o titular ou ter autorização para publicar o conteúdo enviado. O Musilista não se responsabiliza por conteúdo que viole direitos autorais de terceiros — a responsabilidade é exclusivamente do usuário que o publicou.

Conteúdo denunciado como infração de direitos autorais pode ser removido a critério do Musilista.`,
  },
  {
    id: 'privacidade',
    title: '6. Privacidade e Dados Pessoais',
    content: `O Musilista coleta e armazena os seguintes dados pessoais:

• Nome, e-mail e foto de perfil fornecidos pelo provedor de autenticação (Google);
• Cifras, arranjos e repertórios criados pelo usuário;
• Metadados de uso para análise de produto, como páginas visitadas e funcionalidades utilizadas — sem armazenamento de conteúdo das cifras ou dados sensíveis.

Seus dados são armazenados em servidores localizados nos Estados Unidos (Neon PostgreSQL / Vercel). O Musilista adota medidas técnicas adequadas para proteger as informações armazenadas.

Você pode solicitar a exclusão da sua conta e de todos os dados associados enviando uma mensagem pelo Suporte. Os dados serão removidos em até 30 dias após a solicitação.

O Musilista não vende, aluga ou compartilha seus dados pessoais com terceiros para fins comerciais.`,
  },
  {
    id: 'analitica',
    title: '7. Análise de Uso (Analytics)',
    content: `O Musilista pode utilizar ferramentas de análise de comportamento de uso. Isso inclui o registro de eventos como: páginas visitadas, funcionalidades utilizadas e sessões de navegação.

Não são coletados dados sensíveis como senhas, conteúdo de cifras ou informações financeiras.

Os dados de análise são utilizados exclusivamente para melhorar o produto e identificar problemas técnicos.`,
  },
  {
    id: 'grupos',
    title: '8. Grupos, Bandas e Corais',
    content: `O Musilista permite a criação de grupos colaborativos para bandas, corais e conjuntos musicais. Ao criar ou participar de um grupo, você concorda que:

• O administrador do grupo tem controle sobre membros, repertórios e eventos;
• Conteúdo compartilhado dentro de um grupo é visível para todos os membros;
• Você é responsável pelo conteúdo que compartilha dentro dos grupos que participa;
• O Musilista pode remover grupos que violem estes termos.`,
  },
  {
    id: 'disponibilidade',
    title: '9. Disponibilidade do Serviço',
    content: `O Musilista é oferecido "como está", especialmente durante o período Beta. Não há garantia de disponibilidade contínua, ausência de bugs ou funcionamento ininterrupto.

O serviço pode ser interrompido para manutenção, atualizações ou por decisão da equipe sem aviso prévio. O Musilista não se responsabiliza por perda de dados decorrente de falhas técnicas — recomendamos exportar conteúdo importante regularmente.`,
  },
  {
    id: 'responsabilidade',
    title: '10. Limitação de Responsabilidade',
    content: `Na extensão máxima permitida pela legislação brasileira, o Musilista não se responsabiliza por:

• Perda de dados, receitas ou oportunidades decorrentes do uso ou indisponibilidade do serviço;
• Conteúdo publicado por usuários que viole direitos de terceiros;
• Decisões tomadas com base em informações obtidas na plataforma;
• Falhas em serviços de terceiros integrados (Google, Vercel).

A responsabilidade total do Musilista, em qualquer circunstância, fica limitada ao valor eventualmente pago pelo usuário pela assinatura do serviço nos últimos 12 meses.`,
  },
  {
    id: 'alteracoes',
    title: '11. Alterações nestes Termos',
    content: `O Musilista pode atualizar estes Termos de Uso a qualquer momento. Alterações significativas serão comunicadas via e-mail cadastrado ou notificação dentro do app com antecedência mínima de 7 dias.

O uso continuado do serviço após a data de vigência das alterações implica aceitação dos novos termos. Se você não concordar com as mudanças, pode solicitar o encerramento da sua conta pelo Suporte.`,
  },
  {
    id: 'lei',
    title: '12. Lei Aplicável e Foro',
    content: `Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Quaisquer disputas decorrentes do uso do Musilista serão submetidas ao foro da Comarca de São Paulo, SP, com exclusão de qualquer outro, por mais privilegiado que seja.`,
  },
  {
    id: 'contato',
    title: '13. Contato e Suporte',
    content: `Para dúvidas, solicitações de exclusão de dados, denúncias de conteúdo ou qualquer assunto relacionado a estes termos, utilize o canal de Suporte dentro do app (disponível após login) ou entre em contato pelo e-mail lopesedersouza@gmail.com.

Respondemos todas as solicitações em até 5 dias úteis.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <nav className="flex items-center justify-between border-b border-line px-6 py-4 sm:px-8">
        <Link href="/">
          <Logo />
        </Link>
      </nav>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
          Legal
        </span>
        <h1 className="mb-2 mt-1.5 text-3xl font-bold tracking-tight">Termos de Uso e Privacidade</h1>
        <p className="mb-10 font-mono text-xs text-faint">Última atualização: {LAST_UPDATED}</p>

        {/* Índice */}
        <div className="mb-10 rounded-xl border border-line bg-surface p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Índice</p>
          <ol className="flex flex-col gap-1.5">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-muted transition-colors hover:text-accent">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mb-8 scroll-mt-6">
            <h2 className="mb-3 text-lg font-semibold text-ink">{s.title}</h2>
            {s.content.split('\n\n').map((p, i) => (
              <p key={i} className="mb-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>

      <footer className="flex items-center justify-center gap-4 border-t border-line py-6 font-mono text-[11px] text-faint">
        <span>Musilista · Cifras e repertórios</span>
        <span>·</span>
        <Link href="/" className="underline underline-offset-2 transition-colors hover:text-muted">
          Voltar ao início
        </Link>
      </footer>
    </div>
  );
}
