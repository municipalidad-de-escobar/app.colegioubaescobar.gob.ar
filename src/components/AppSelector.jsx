import { ExternalLink, ChevronRight, BookOpen, GraduationCap, Clock } from 'lucide-react'
import Button from './ui/Button'
import { Card, CardContent } from './ui/Card'
import './AppSelector.css'

const AppSelector = ({ onSelectApp }) => {
  const apps = [
    {
      id: 'boletines',
      title: 'Boletines Cereijo',
      description: 'Plataforma para profesores y personal del colegio. Gestioná calificaciones, inasistencias, sanciones y emití boletines oficiales.',
      icon: BookOpen,
      action: () => {
        window.location.href = 'https://boletines.colegioubaescobar.gob.ar/'
      },
      buttonText: 'Abrir Boletines',
      accentColor: '#1e3a5f',
      accentLight: '#e8eff8',
      external: true,
    },
    {
      id: 'curso-ingreso',
      title: 'Curso de Ingreso',
      description: 'Inscripciones, calificaciones del curso de ingreso, listados de mérito y reportes para aspirantes.',
      icon: GraduationCap,
      action: () => onSelectApp('curso-ingreso'),
      buttonText: 'Ir al Curso de Ingreso',
      accentColor: '#ff8c42',
      accentLight: '#fff5f0',
      external: false,
    },
    {
      id: 'horarios',
      title: 'Horarios',
      description: 'Consulta los horarios de clases y actividades del colegio.',
      icon: Clock,
      action: () => {
        window.location.href = 'https://horarioscereijo.web.app/'
      },
      buttonText: 'Ver Horarios',
      accentColor: '#38b6a8',
      accentLight: '#f0faf9',
      external: true,
    },
  ]

  return (
    <div className="app-selector min-h-screen">
      {/* Decorative background elements */}
      <div className="app-selector-bg-pattern" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 header-animation">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="logo-container">
              <img
                src="/logo2.png"
                alt="Colegio UBA Escobar"
                className="h-10 w-10 rounded logo-pulse"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Colegio Cereijo</p>
              <p className="text-xs text-muted-foreground">UBA Escobar</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 py-16">
        {/* Hero Section */}
        <div className="mb-16 text-center hero-content">
          <h1 className="text-5xl font-bold text-foreground mb-4 hero-title">
            Sistema Institucional Digital
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto hero-subtitle">
            Accedé a todas nuestras plataformas educativas desde un único portal. Elige la herramienta que necesitás:
          </p>

          {/* Decorative line */}
          <div className="flex justify-center mt-8 mb-8">
            <div className="h-1 w-20 bg-gradient-to-r from-transparent via-accent to-transparent rounded-full" />
          </div>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 apps-grid">
          {apps.map((app, index) => {
            const IconComponent = app.icon
            return (
              <div key={app.id} className="app-card-wrapper" style={{ '--index': index }}>
                <Card className="flex flex-col h-full app-card hover-lift">
                  <CardContent className="pt-8 flex-1 flex flex-col">
                    {/* Icon Badge */}
                    <div className="mb-6 icon-badge-container">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center icon-badge"
                        style={{
                          backgroundColor: app.accentLight,
                          color: app.accentColor,
                        }}
                      >
                        <IconComponent size={32} strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Card Content */}
                    <h3 className="text-2xl font-bold text-foreground mb-3 card-title">
                      {app.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-8 flex-1 card-description">
                      {app.description}
                    </p>

                    {/* Button */}
                    <Button
                      onClick={app.action}
                      className="w-full group card-button"
                      style={{
                        backgroundColor: app.accentColor,
                        borderColor: app.accentColor,
                      }}
                    >
                      <span className="flex items-center justify-center gap-2 w-full">
                        {app.buttonText}
                        {app.external ? (
                          <ExternalLink size={16} className="group-hover:translate-x-1 transition-transform" />
                        ) : (
                          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        )}
                      </span>
                    </Button>
                  </CardContent>

                  {/* Card accent border */}
                  <div
                    className="h-1 w-full rounded-b-lg"
                    style={{ backgroundColor: app.accentColor }}
                  />
                </Card>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground footer-content">
          <p>
            ¿Necesitás ayuda? Escribí a{' '}
            <a
              href="mailto:friaspaulina@colegioubaescobar.gob.ar"
              className="font-medium text-accent hover:underline transition-all"
            >
              friaspaulina@colegioubaescobar.gob.ar
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AppSelector
