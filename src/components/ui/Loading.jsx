const Loading = ({ message = 'Cargando...' }) => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex items-center justify-center w-20 h-20">
        <div
          className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping"
          style={{ animationDuration: '1.5s' }}
        />
        <img
          src="/logo2.png"
          alt="Colegio Cereijo"
          className="h-14 w-14 rounded-xl relative z-10 object-contain"
        />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">Colegio Cereijo · UBA Escobar</p>
      </div>
    </div>
  </div>
)

export default Loading
