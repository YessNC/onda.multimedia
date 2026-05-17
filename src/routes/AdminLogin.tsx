import { useI18n } from '../hooks/useI18n'
import AdminLoginForm from '../components/admin/AdminLoginForm'
import SectionTitle from '../components/shared/SectionTitle'

export default function AdminLogin() {
  const { t } = useI18n()

  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          align="center"
          eyebrow={t('admin.eyebrow')}
          title={t('admin.login-title')}
          subtitle={t('admin.login-description')}
        />
        <div className="mt-10">
          <AdminLoginForm />
        </div>
      </div>
    </section>
  )
}
