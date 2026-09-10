import { version } from '../../package.json'

export const APP_VERSION = `v${version}`

export default function AppVersion() {
  return (
    <span
      className="pointer-events-none fixed bottom-2.5 left-4 z-40 select-none text-[10px] font-medium tabular-nums tracking-wide text-slate-400/80"
      aria-label={`Sürüm ${APP_VERSION}`}
    >
      {APP_VERSION}
    </span>
  )
}
