import PlaceholderPage from '@/components/common/PlaceholderPage';
import { navigation } from '@/config/navigation';

const nav = navigation.find((n) => n.key === 'support')!;

export default function SupportPage() {
  return <PlaceholderPage title={nav.label} description={nav.description} moduleId={nav.moduleId} />;
}
