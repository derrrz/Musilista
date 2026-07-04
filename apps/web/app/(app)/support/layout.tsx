import { MobileGate } from '@/app/_components/MobileGate';

// Cobre /support e /support/[id] numa vez só — não existe no app mobile.
export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <MobileGate featureName="O suporte por tickets">{children}</MobileGate>;
}
