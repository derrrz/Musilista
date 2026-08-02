export type Role = { id: string; roleName: string; userId: string | null; userName: string | null };
export type RepertoryLink = { repertoireId: string; name: string | null };

export type GroupEvent = {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  eventType: string;
  notice: string | null;
  location: string | null;
  publicToken: string | null;
  roles: Role[];
  acknowledgedCount: number;
  userAcknowledged: boolean;
  repertoireLinks: RepertoryLink[];
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  image: string | null;
  myRole: string;
  memberCount: number;
};

export type Member = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
};

// Uma capacidade agregada do grupo (derivada dos perfis dos membros, das
// sugestões de música da votação, ou do gênero/estilo das músicas dos
// setlists): count = quantos membros declararam (perfil), quantos votos
// recebeu (sugestão), ou quantas músicas do repertório têm aquele
// gênero/estilo. href só existe pra sugestões que bateram no acervo — linka
// pra cifra.
export type Capability = {
  label: string;
  category: 'function' | 'instrument' | 'competency' | 'suggestion' | 'genero' | 'estilo';
  count: number;
  href?: string;
};
