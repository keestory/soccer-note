import { Placeholder } from '@/components/Placeholder'
import { useI18n } from '@/lib/i18n/context'
export default function Team() { const { t } = useI18n(); return <Placeholder title={t.teamManagement} /> }
