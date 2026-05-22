import PlaceholderPage from '@/components/common/PlaceholderPage';
import { navigation } from '@/config/navigation';

const nav = navigation.find((n) => n.key === 'products')!;

export default function ProductsPage() {
  return <PlaceholderPage title={nav.label} description={nav.description} moduleId={nav.moduleId} />;
}
