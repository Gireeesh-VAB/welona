import PlaceholderPage from '@/components/common/PlaceholderPage';
import { navigation } from '@/config/navigation';

const nav = navigation.find((n) => n.key === 'finance')!;

export default function FinancePage() {
  return <PlaceholderPage title={nav.label} description={nav.description} moduleId={nav.moduleId} />;
}
